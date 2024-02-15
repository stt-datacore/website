import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuipmentScores, Skill } from "../../../model/crew";
import { getSkillOrder, gradeToColor, numberToGrade, qbitsToSlots, skillToRank } from "../../../utils/crewutils";
import { ItemWithBonus, isQuipmentMatch } from "../../../utils/itemutils";
import { EquipmentItem } from "../../../model/equipment";
import { CrewItemsView } from "../../item_presenters/crew_items";
import CrewStat from "../../crewstat";
import { QuipmentScoreCells } from "./quipmentscores";

export interface TopQuipmentScoreProps {
    crew: IRosterCrew;
    allslots?: boolean;
    top: QuipmentScores;
    targetGroup: string;
}

export const getTopQuipmentTableConfig = () => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipmentScore', title: "Overall", reverse: true });
    config.push({ width: 1, column: 'quipmentScores.trait_limited', title: "Specialty", reverse: true });

    const qpComp = (a: IRosterCrew, b: IRosterCrew, index: number) => {
        if (a.qpower && b.qpower) {
            const apower = Object.values(a.qpower);
            const bpower = Object.values(b.qpower);

            if (index < apower.length && index < bpower.length) {
                const askill = apower[index];
                const bskill = bpower[index];
                let at = (askill.core + askill.range_max + askill.range_min);
                let bt = (bskill.core + bskill.range_max + bskill.range_min);
                return at - bt;
            }
            else if (index < apower.length) {
                const askill = apower[index];
                let at = (askill.core + askill.range_max + askill.range_min);
                let bt = 0;
                return at - bt;
            }
            else if (index < bpower.length) {
                const bskill = bpower[index];
                let at = 0;
                let bt = (bskill.core + bskill.range_max + bskill.range_min);
                return at - bt;
            }
            else {
                return 0;
            }
        }
        else if (a.qpower) {
            return 1;
        }
        else if (b.qpower) {
            return -1;
        }
        else {
            return 0;
        }
    };

    config.push({ 
        width: 1, 
        column: 'primary', 
        title: "Primary", 
        reverse: true,
        customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, 0)
    });
    config.push({ 
        width: 1, 
        column: 'secondary', 
        title: "Secondary", 
        reverse: true,
        customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, 1)
    });
    config.push({ 
        width: 1, 
        column: 'tertiary', 
        title: "Tertiary", 
        reverse: true,
        customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, 2) 
    });
    // config.push({ width: 1, column: 'prisec', title: "Primary/Secondary", reverse: true });

    return config;
}

export const TopQuipmentScoreCells = (props: TopQuipmentScoreProps) => {
    const { targetGroup, top, allslots, crew } = props;

    const q_bits = allslots ? 1300 : crew.q_bits;
    
    const qlots = crew.qlots ?? {}
    const qpower = crew.qpower ?? {}
    const skills = getSkillOrder(crew);

    const printCell = (index: number) => {
        if (index >= skills.length) return <></>
        return <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:"0.5em",
            justifyContent: 'center'
        }}>
            <CrewItemsView 
                crew={{ ...crew, q_bits, kwipment_expiration: [], kwipment: qlots[skills[index]].map(q => Number(q.kwipment_id) as number) }} 
                targetGroup={targetGroup}
                quipment={true} />
            <CrewStat
                quipmentMode={true}
                style={{fontSize: "0.85em"}}
            skill_name={skills[index]} data={qpower[skills[index]]} />
        </div>
    }

    return <React.Fragment>
        <QuipmentScoreCells top={top} crew={crew} excludeSkills={true} />
        <Table.Cell>
            {skills.length >= 1 && printCell(0)}
        </Table.Cell>
        <Table.Cell>
            {skills.length >= 1 && printCell(1)}
        </Table.Cell>
        <Table.Cell>
            {skills.length >= 1 && printCell(2)}
        </Table.Cell>
        {/* <Table.Cell>

        </Table.Cell> */}
    </React.Fragment>
}



