import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuipmentScores } from "../../../model/crew";
import { qbitsToSlots, skillToShort } from "../../../utils/crewutils";
import { CrewItemsView } from "../../item_presenters/crew_items";
import CrewStat from "../../crewstat";
import { QuipmentScoreCells } from "./quipmentscores";
import { BuffStatTable } from "../../../utils/voyageutils";
import { ItemWithBonus } from "../../../utils/itemutils";
import { calcQLots } from "../../../utils/equipment";
import { appelate } from "../../../utils/misc";

export interface TopQuipmentScoreProps {
    crew: IRosterCrew;
    allslots?: boolean;
    slots?: number;
    top: QuipmentScores;
    targetGroup: string;
    buffConfig: BuffStatTable;
    quipment: ItemWithBonus[];
    excludeQBits?: boolean;
    pstMode: boolean;
}

export const getTopQuipmentTableConfig = (top: QuipmentScores[], pstMode: boolean, excludeQBits: boolean) => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipmentScore', title: "Overall", reverse: true });
    config.push({ width: 1, column: 'quipmentScores.trait_limited', title: "Specialty", reverse: true });
    if (!excludeQBits) config.push({ width: 1, column: 'q_bits', title: 'Q-Bits', reverse: true });

    // config.push({ 
    //     width: 1, 
    //     column: 'vqx', 
    //     title: <span>Exclusion Score</span>, 
    //     reverse: true,
    //     customCompare: (a: IRosterCrew, b: IRosterCrew) => {
    //         let r = 0;
    //         r = a.max_rarity - b.max_rarity;
    //         if (r) return r;
    //         const va = a.voyageQuotient ?? 1;
    //         const ta = (top[a.max_rarity - 1].voyageQuotient ? top[a.max_rarity - 1].voyageQuotient : 1) ?? 0;
    //         const ga = 1 - (ta / va);

    //         const vb = b.voyageQuotient ?? 1;
    //         const tb = (top[b.max_rarity - 1].voyageQuotient ? top[b.max_rarity - 1].voyageQuotient : 1) ?? 0;
    //         const gb = 1 - (tb / vb);

    //         r = ga - gb;
    //         return r;
    //     }
    // });

    const qpComp = (a: IRosterCrew, b: IRosterCrew, skill: string | number) => {
        let askname = undefined as string | undefined;
        let bskname = undefined as string | undefined;
        
        if (typeof skill === 'number') {
            if (skill < a.skill_order.length) {
                askname = a.skill_order[skill];
            }
            if (skill < b.skill_order.length) {
                bskname = b.skill_order[skill];
            }
        }
        else {
            askname = bskname = skill;
        }

        if ((askname && a.qpower && askname in a.qpower) && (bskname && b.qpower && bskname in b.qpower)) {
            let askill = a.qpower[askname];
            let bskill = b.qpower[bskname];

            let at = (askill.core + (0.5 * (askill.range_max + askill.range_min)));
            let bt = (bskill.core + (0.5 * (bskill.range_max + bskill.range_min)));

            return at - bt;
        }
        else if (askname && a.qpower && skill in a.qpower) {
            return 1;
        }
        else if (bskname && b.qpower && skill in b.qpower) {
            return -1;
        }
        else {
            return 0;
        }
    };

    if (pstMode) {
        ['primary', 'secondary', 'tertiary'].forEach((skill, idx) => {
            config.push({ 
                width: 1, 
                column: 'skill_' + skill, 
                title: <div style={{display: 'inline-block'}}>
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <span>
                    {appelate(skill)}
                    </span>                
                </div>
                </div>, 
                reverse: true,
                customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, idx)
            });
        
        });
    }
    else {
        Object.keys(CONFIG.SKILLS).forEach((skill) => {
            config.push({ 
                width: 1, 
                column: 'skill_' + skill, 
                title: <div style={{display: 'inline-block'}}>
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <img
                        style={{ height: '16px'}}
                        src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
                        />
                    <span>
                    &nbsp;{skillToShort(skill)}
                    </span>                
                </div>
                </div>, 
                reverse: true,
                customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, skill)
            });
        
        });
    }
    
    return config;
}

export const TopQuipmentScoreCells = (props: TopQuipmentScoreProps) => {
    const { pstMode, quipment, excludeQBits, targetGroup, top, allslots, crew, buffConfig, slots } = props;

    const q_bits = allslots ? 1300 : crew.q_bits;
    const qlots = crew.qlots ?? {}
    const qpower = crew.qpower ?? {}
    const skills = Object.keys(CONFIG.SKILLS);
    
    // calcQLots(crew, quipment, buffConfig, allslots, slots);

    const printCell = (skill: string | number) => {

        if (typeof skill === 'number') {
            if (skill >= crew.skill_order.length) return <></>;
            skill = crew.skill_order[skill];
        }

        return <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:"0.5em",
            justifyContent: 'center'
        }}>
            <CrewItemsView 
                vertical={!pstMode}
                crew={{ ...crew, q_bits, kwipment_expiration: [], kwipment: qlots[skill].map(q => Number(q.kwipment_id) as number) }} 
                targetGroup={targetGroup}
                itemSize={32}
                locked
                quipment={true} />
            <CrewStat
                quipmentMode={true}
                style={{fontSize: "0.55em"}}
            skill_name={skill} data={qpower[skill]} />
        </div>
    }

    const voyQ = crew.voyageQuotient ?? 1;
    const topQ = top.voyageQuotient ? top.voyageQuotient : 0;
    const printQ = voyQ;
    const qGrade = 1 - (topQ / voyQ);
    return <React.Fragment>
        <QuipmentScoreCells top={top} crew={crew} excludeSkills={true} excludeQBits={excludeQBits} />
        {/* <Table.Cell>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <div style={{color: gradeToColor(qGrade) ?? undefined}} >
                    {numberToGrade(qGrade)}          
                </div>             
                <div style={{fontStyle: 'italic', fontSize: "0.85em", textAlign: 'center', fontStretch: 'condensed'}}>
                    (#{crew.ranks.voyRank} in Voyages)
                </div>
            </div>
        </Table.Cell> */}
        {!pstMode && skills.map((skill) => {
            
            if (!(skill in crew.base_skills)) {
                return <Table.Cell></Table.Cell>
            }
            return (
                <Table.Cell key={skill + "_vqntqp"}>
                    {printCell(skill)}
                </Table.Cell>)
        })}
        {pstMode && ['primary', 'secondary', 'tertiary'].map((skill, idx) => {
                        
            return (
                <Table.Cell key={skill + "_vqntqp"}>
                    {printCell(idx)}
                </Table.Cell>)
        })}
    </React.Fragment>
}



