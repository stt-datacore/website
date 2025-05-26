import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuippedPower, QuipmentScores, QuipSkill } from "../../../model/crew";
import { qbProgressToNext, skillToShort } from "../../../utils/crewutils";
import { CrewItemsView } from "../../item_presenters/crew_items";
import CrewStat from "../../item_presenters/crewstat";
import { QuipmentScoreCells } from "./quipmentscores";
import { ItemWithBonus } from "../../../utils/itemutils";
import { BuffStatTable } from "../../../utils/voyageutils";
import { TranslateMethod } from "../../../model/player";
import { skoComp, multiComp, qpComp } from "../../../utils/quipment_tools";

export interface TopQuipmentScoreProps {
    crew: IRosterCrew;
    allslots?: boolean;
    slots?: number;
    top: QuipmentScores;
    targetGroup: string;
    quipment: ItemWithBonus[];
    excludeQBits?: boolean;
    pstMode: boolean | 2 | 3;
    buffConfig?: BuffStatTable;
}

export const getTopQuipmentTableConfig = (t: TranslateMethod, pstMode: boolean | 2 | 3, excludeQBits: boolean) => {
    const config = [] as ITableConfigRow[];

    if (!excludeQBits) {
        config.push({ width: 1, column: 'q_bits', title: t('base.qp'), reverse: true });
        config.push({
            width: 1, column: 'to_next', title: t('collections.panes.progress.title'), reverse: false,
            customCompare: (a: IRosterCrew, b: IRosterCrew) => {
                let an = qbProgressToNext(a.q_bits)[0];
                let bn = qbProgressToNext(b.q_bits)[0];
                return an - bn;
            }
        });
    }

    if (pstMode === true) {
        ['primary', 'secondary', 'tertiary'].forEach((skill, idx) => {
            config.push({
                width: 1,
                column: 'skill_' + skill,
                title: <div style={{display: 'inline-block'}}>
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <span>
                    {t(`quipment_ranks.${skill}`)}
                    </span>
                </div>
                </div>,
                reverse: true,
                customCompare: (a: IRosterCrew, b: IRosterCrew) => skoComp(a, b, idx)
            });
        });
    }
    else if (pstMode === 2) {
        ['first_pair', 'second_pair', 'third_pair', 'three_skills', 'top_quipment'].forEach((skill, idx) => {
            config.push({
                width: 1,
                column: 'pairs_' + skill,
                title: <div style={{display: 'inline-block'}}>
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <span>
                        {t(`quipment_ranks.${skill}`)}
                    </span>
                </div>
                </div>,
                reverse: true,
                customCompare: (a: IRosterCrew, b: IRosterCrew) => multiComp(a, b, idx)
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
    const { pstMode, excludeQBits, targetGroup, top, allslots, crew } = props;
    const q_bits = allslots ? 1300 : crew.q_bits;
    const skills = Object.keys(CONFIG.SKILLS);

    let q_lots = crew.best_quipment ?? {} as QuippedPower;

    const printCell = (skill: string | number) => {
        let lot: QuippedPower | undefined = q_lots;
        if (typeof skill === 'number') {
            if (pstMode === 2) {
                if (skill === 0 && crew.best_quipment_1_2) {
                    lot = crew.best_quipment_1_2;
                }
                else if (skill === 1 && crew.best_quipment_1_3) {
                    lot = crew.best_quipment_1_3;
                }
                else if (skill === 2 && crew.best_quipment_2_3) {
                    lot = crew.best_quipment_2_3;
                }
                else if (skill === 3 && crew.best_quipment_3) {
                    lot = crew.best_quipment_3;
                }
                else if (skill === 4 && crew.best_quipment_top) {
                    lot = crew.best_quipment_top;
                }
                else {
                    return <></>;
                }
            }
            else {
                if (skill >= crew.skill_order.length) return <></>;
                skill = crew.skill_order[skill];
            }
        }

        if (!crew.best_quipment) return <></>;

        if (typeof skill === 'string') {
            lot = { ... lot };
            lot.skill_quipment = {};
            lot.skill_quipment[skill] = crew.best_quipment.skill_quipment[skill];
        }

        return !!lot?.skill_quipment && <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:"0.5em",
            justifyContent: 'normal'
        }}>
            <CrewItemsView
                vertical={!pstMode}
                crew={{ ...crew, q_bits, kwipment_expiration: [], kwipment: Object.values(lot.skill_quipment).flat().map(q => Number(q.kwipment_id) as number) }}
                targetGroup={targetGroup}
                itemSize={32}
                locked
                quipment={true} />
            {typeof skill === 'string' &&
            <CrewStat
                vertical={!pstMode}
                quipmentMode={true}
                style={{fontSize: "0.8em"}}
                skill_name={skill}
                data={lot.skills_hash[skill]} />
            ||
            !!lot.skills_hash && Object.values(lot.skills_hash).sort((a, b) => lot.aggregate_by_skill[b] - lot.aggregate_by_skill[a]).map((ps: QuipSkill) =>
                <CrewStat
                    key={`power_skill-${ps.skill}_${crew.id}`}
                    quipmentMode={true}
                    style={{fontSize: "0.8em", opacity: ps.reference ? '0.5' : undefined}}
                    skill_name={ps.skill as string}
                    data={ps} />
            )}
        </div>
    }

    return <React.Fragment>
        <QuipmentScoreCells excludeGrade={true} excludeSpecialty={!pstMode} top={top} crew={crew} excludeSkills={true} excludeQBits={excludeQBits} />
        {!pstMode && skills.map((skill, idx) => {
            if (!(skill in crew.base_skills)) {
                return <Table.Cell key={`qpbest_${idx}_${skill}_${crew.id}`}></Table.Cell>
            }
            return (
                <Table.Cell key={`qpbest_${idx}_${skill}_${crew.id}`}>
                    {printCell(skill)}
                </Table.Cell>)
        })}
        {pstMode === true && ['primary', 'secondary', 'tertiary'].map((skill, idx) => {

            return (
                <Table.Cell key={`qpbest_${idx}_${skill}_${crew.id}`}>
                    {printCell(idx)}
                </Table.Cell>)
        })}
        {pstMode === 2 && ['first_pair', 'second_pair', 'third_pair', 'three_skills', 'top_quipment'].map((skill, idx) => {
            return (
                <Table.Cell key={`qpbest_${idx}_${skill}_${crew.id}`}>
                    {printCell(idx)}
                </Table.Cell>)
        })}
    </React.Fragment>
}



