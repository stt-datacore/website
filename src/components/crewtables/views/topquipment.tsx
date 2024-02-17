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

export interface TopQuipmentScoreProps {
    crew: IRosterCrew;
    allslots?: boolean;
    top: QuipmentScores;
    targetGroup: string;
}

export const getTopQuipmentTableConfig = (top: QuipmentScores[]) => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipmentScore', title: "Overall", reverse: true });
    config.push({ width: 1, column: 'quipmentScores.trait_limited', title: "Specialty", reverse: true });
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

    const qpComp = (a: IRosterCrew, b: IRosterCrew, skill: string) => {
        if ((a.qpower && skill in a.qpower) && (b.qpower && skill in b.qpower)) {
            let askill = a.qpower[skill];
            let bskill = b.qpower[skill];

            let at = (askill.core + (0.5 * (askill.range_max + askill.range_min)));
            let bt = (bskill.core + (0.5 * (bskill.range_max + bskill.range_min)));

            return at - bt;
        }
        else if (a.qpower && skill in a.qpower) {
            return 1;
        }
        else if (b.qpower && skill in b.qpower) {
            return -1;
        }
        else {
            return 0;
        }
    };
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
    
    })

    return config;
}

export const TopQuipmentScoreCells = (props: TopQuipmentScoreProps) => {
    const { targetGroup, top, allslots, crew } = props;

    const q_bits = allslots ? 1300 : crew.q_bits;
    
    const qlots = crew.qlots ?? {}
    const qpower = crew.qpower ?? {}
    const skills = Object.keys(CONFIG.SKILLS);

    const printCell = (skill: string) => {        
        return <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:"0.5em",
            justifyContent: 'center'
        }}>
            <CrewItemsView 
                crew={{ ...crew, q_bits, kwipment_expiration: [], kwipment: qlots[skill].map(q => Number(q.kwipment_id) as number) }} 
                targetGroup={targetGroup}
                itemSize={32}
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
        <QuipmentScoreCells top={top} crew={crew} excludeSkills={true} />
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
        {skills.map((skill) => {
            
            if (!(skill in crew.base_skills)) {
                return <Table.Cell></Table.Cell>
            }
            return (
                <Table.Cell key={skill + "_vqntqp"}>
                    {skills.length >= 1 && printCell(skill)}
                </Table.Cell>)
        })}
    </React.Fragment>
}



