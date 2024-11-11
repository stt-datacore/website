import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuippedPower, QuipmentScores, Skill } from "../../../model/crew";
import { applySkillBuff, powerSum, skillSum, skillToShort } from "../../../utils/crewutils";
import { CrewItemsView } from "../../item_presenters/crew_items";
import CrewStat from "../../crewstat";
import { QuipmentScoreCells } from "./quipmentscores";
import { ItemWithBonus } from "../../../utils/itemutils";
import { BuffStatTable } from "../../../utils/voyageutils";
import { TranslateMethod } from "../../../model/player";

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

export const getTopQuipmentTableConfig = (t: TranslateMethod, pstMode: boolean | 2 | 3, excludeQBits: boolean, powerMode: 'all' | 'core' | 'proficiency', buffConfig?: BuffStatTable) => {
    const config = [] as ITableConfigRow[];
    if (!excludeQBits) config.push({ width: 1, column: 'q_bits', title: t('base.qp'), reverse: true });

    const qpComp = (a: IRosterCrew, b: IRosterCrew, skill: string) => {
        if (!a.best_quipment!.aggregate_by_skill[skill]) return -1;
        else if (!b.best_quipment!.aggregate_by_skill[skill]) return 1;
        else return a.best_quipment!.aggregate_by_skill[skill] - b.best_quipment!.aggregate_by_skill[skill];
    };

    const skoComp = (a: IRosterCrew, b: IRosterCrew, skill_idx: number) => {
        if (skill_idx >= a.skill_order.length) {
            return -1;
        }
        else if (skill_idx >= b.skill_order.length) {
            return 1;
        }
        else {
            return a.best_quipment!.aggregate_by_skill[a.skill_order[skill_idx]] - b.best_quipment!.aggregate_by_skill[b.skill_order[skill_idx]];
        }
    };

    const multiComp = (a: IRosterCrew, b: IRosterCrew, combo_id: number) => {
        if (combo_id === 0) {
            if (a.best_quipment_1_2 && b.best_quipment_1_2) {
                return a.best_quipment_1_2.aggregate_power - b.best_quipment_1_2.aggregate_power;
            }
            else if (a.best_quipment_1_2) {
                return 1;
            }
            else if (b.best_quipment_1_2) {
                return -1;
            }
        }
        else if (combo_id === 1) {
            if (a.best_quipment_1_3 && b.best_quipment_1_3) {
                return a.best_quipment_1_3.aggregate_power - b.best_quipment_1_3.aggregate_power;
            }
            else if (a.best_quipment_1_3) {
                return 1;
            }
            else if (b.best_quipment_1_3) {
                return -1;
            }
        }
        else if (combo_id === 2) {
            if (a.best_quipment_2_3 && b.best_quipment_2_3) {
                return a.best_quipment_2_3.aggregate_power - b.best_quipment_2_3.aggregate_power;
            }
            else if (a.best_quipment_2_3) {
                return 1;
            }
            else if (b.best_quipment_2_3) {
                return -1;
            }
        }
        else if (combo_id === 3) {
            if (a.best_quipment_3 && b.best_quipment_3) {
                return a.best_quipment_3.aggregate_power - b.best_quipment_3.aggregate_power;
            }
            else if (a.best_quipment_3) {
                return 1;
            }
            else if (b.best_quipment_3) {
                return -1;
            }
        }

        return 0;
    };

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
        ['first_pair', 'second_pair', 'third_pair', 'three_skills'].forEach((skill, idx) => {
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
    const { pstMode, excludeQBits, targetGroup, top, allslots, crew, buffConfig } = props;

    const q_bits = allslots ? 1300 : crew.q_bits;

    let q_lots = crew.best_quipment ?? {} as QuippedPower;

    const skills = Object.keys(CONFIG.SKILLS);

    const printCell = (skill: string | number, multi_mode?: boolean) => {
        let power_sum = undefined as { [key: string]: Skill } | undefined;
        let lot: QuippedPower | undefined = q_lots ?? { skill_quipment: {} };

        if (typeof skill === 'number') {
            if (multi_mode) {
                lot = undefined;
                if (skill === 0 && crew.best_quipment_1_2) {
                    power_sum = powerSum(Object.values(crew.best_quipment_1_2.skills_hash));
                    lot = crew.best_quipment_1_2;
                }
                else if (skill === 1 && crew.best_quipment_1_3) {
                    power_sum = powerSum(Object.values(crew.best_quipment_1_3.skills_hash));
                    lot = crew.best_quipment_1_3;
                }
                else if (skill === 2 && crew.best_quipment_2_3) {
                    power_sum = powerSum(Object.values(crew.best_quipment_2_3.skills_hash));
                    lot = crew.best_quipment_2_3;
                }
                else if (skill === 3 && crew.best_quipment_3) {
                    power_sum = powerSum(Object.values(crew.best_quipment_3.skills_hash));
                    lot = crew.best_quipment_3;
                }

                if (!lot && typeof skill !== 'string') {
                    return <></>;
                }
                else if (power_sum) {
                    Object.keys(power_sum).forEach((skill) => {
                        if (!(skill in crew.base_skills) && !!power_sum) {
                            delete power_sum[skill];
                        }
                    });

                    Object.values(power_sum).forEach((skill) => {
                        if (skill.skill && skill.skill in crew.base_skills) {
                            if (buffConfig) {
                                let buffed = applySkillBuff(buffConfig, skill.skill, crew.base_skills[skill.skill]);
                                skill.core += buffed.core;
                                skill.range_max += buffed.max;
                                skill.range_min += buffed.min;
                            }
                            else {
                                skill.core += crew.base_skills[skill.skill].core;
                                skill.range_max += crew.base_skills[skill.skill].range_max;
                                skill.range_min += crew.base_skills[skill.skill].range_min;
                            }
                        }
                    });

                }
            }
            else {
                if (skill >= crew.skill_order.length) return <></>;
                skill = crew.skill_order[skill];
            }
        }

        if (typeof skill === 'string' && crew.best_quipment?.skills_hash) {
            lot = { ...crew.best_quipment };
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
            !!power_sum && Object.values(power_sum).sort((a, b) => skillSum(b) - skillSum(a)).map((ps) =>
                <CrewStat
                    key={`power_skill-${ps.skill}_${crew.id}`}
                    quipmentMode={true}
                    style={{fontSize: "0.8em"}}
                    skill_name={ps.skill as string}
                    data={ps} />
            )}
        </div>
    }

return <React.Fragment>
        <QuipmentScoreCells excludeGrade={true} excludeSpecialty={!pstMode} top={top} crew={crew} excludeSkills={true} excludeQBits={excludeQBits} />
        {!pstMode && skills.map((skill) => {
            if (!(skill in crew.base_skills)) {
                return <Table.Cell key={skill + "_vqntqp" + crew.id.toString()}></Table.Cell>
            }
            return (
                <Table.Cell key={skill + "_vqntqp" + crew.id.toString()}>
                    {printCell(skill)}
                </Table.Cell>)
        })}
        {pstMode === true && ['primary', 'secondary', 'tertiary'].map((skill, idx) => {

            return (
                <Table.Cell key={skill + "_vqntqp" + crew.id.toString()}>
                    {printCell(idx)}
                </Table.Cell>)
        })}
        {pstMode === 2 && ['first_pair', 'second_pair', 'third_pair', 'three_skills'].map((skill, idx) => {
            return (
                <Table.Cell key={skill + "_vqntqp" + crew.id.toString()}>
                    {printCell(idx, true)}
                </Table.Cell>)
        })}
    </React.Fragment>
}



