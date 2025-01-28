import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { PowerLot, QuipmentScores, Skill } from "../../../model/crew";
import { applySkillBuff, powerSum, skillSum, skillToShort } from "../../../utils/crewutils";
import { CrewItemsView } from "../../item_presenters/crew_items";
import CrewStat from "../../crewstat";
import { QuipmentScoreCells } from "./quipmentscores";
import { ItemWithBonus } from "../../../utils/itemutils";
import { appelate } from "../../../utils/misc";
import { GlobalContext } from "../../../context/globalcontext";
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
    //config.push({ width: 1, column: 'quipment_score', title: t('quipment_ranks.overall'), reverse: true });
    //if (pstMode) config.push({ width: 1, column: 'quipment_scores.trait_limited', title: t('quipment_ranks.specialty'), reverse: true });
    if (!excludeQBits) config.push({ width: 1, column: 'q_bits', title: t('base.qp'), reverse: true });

    // config.push({
    //     width: 1,
    //     column: 'vqx',
    //     title: <span>Exclusion Score</span>,
    //     reverse: true,
    //     customCompare: (a: IRosterCrew, b: IRosterCrew) => {
    //         let r = 0;
    //         r = a.max_rarity - b.max_rarity;
    //         if (r) return r;
    //         const va = a.voyage_quotient ?? 1;
    //         const ta = (top[a.max_rarity - 1].voyage_quotient ? top[a.max_rarity - 1].voyage_quotient : 1) ?? 0;
    //         const ga = 1 - (ta / va);

    //         const vb = b.voyage_quotient ?? 1;
    //         const tb = (top[b.max_rarity - 1].voyage_quotient ? top[b.max_rarity - 1].voyage_quotient : 1) ?? 0;
    //         const gb = 1 - (tb / vb);

    //         r = ga - gb;
    //         return r;
    //     }
    // });

    const qpComp = (a: IRosterCrew, b: IRosterCrew, skill: string | number, multi_mode?: boolean) => {
        if (!!multi_mode && typeof skill === 'number') {
            let m = skill;
            switch(m) {
                case 0:
                    if (a.q_best_one_two_lots && b.q_best_one_two_lots) {
                        return a.q_best_one_two_lots.crew_power - b.q_best_one_two_lots.crew_power;
                        //return skillSum(a.q_best_one_two_lots.power, powerMode) - skillSum(b.q_best_one_two_lots.power, powerMode);
                    }
                    else if (a.q_best_one_two_lots) {
                        return 1;
                    }
                    else if (b.q_best_one_two_lots) {
                        return -1;
                    }
                    return 0;
                case 1:
                    if (a.q_best_one_three_lots && b.q_best_one_three_lots) {
                        return a.q_best_one_three_lots.crew_power - b.q_best_one_three_lots.crew_power;
                        //return skillSum(a.q_best_one_three_lots.power, powerMode) - skillSum(b.q_best_one_three_lots.power, powerMode);
                    }
                    else if (a.q_best_one_three_lots) {
                        return 1;
                    }
                    else if (b.q_best_one_three_lots) {
                        return -1;
                    }
                    return 0;
                case 2:
                    if (a.q_best_two_three_lots && b.q_best_two_three_lots) {
                        return a.q_best_two_three_lots.crew_power - b.q_best_two_three_lots.crew_power;
                        //return skillSum(a.q_best_two_three_lots.power, powerMode) - skillSum(b.q_best_two_three_lots.power, powerMode);
                    }
                    else if (a.q_best_two_three_lots) {
                        return 1;
                    }
                    else if (b.q_best_two_three_lots) {
                        return -1;
                    }
                    return 0;
                case 3:
                    if (a.q_best_three_lots && b.q_best_three_lots) {
                        return a.q_best_three_lots.crew_power - b.q_best_three_lots.crew_power;
                        //return skillSum(a.q_best_three_lots.power, powerMode) - skillSum(b.q_best_three_lots.power, powerMode);
                    }
                    else if (a.q_best_three_lots) {
                        return 1;
                    }
                    else if (b.q_best_three_lots) {
                        return -1;
                    }
                    return 0;
                default:
                    return 0;
            }
        }
        else {
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

            if ((askname && a.q_lots?.power && a.q_lots.power.some(s => s.skill === askname))
                && (bskname && b.q_lots?.power && b.q_lots.power.some(s => s.skill === bskname))) {
                // let askill = a.q_lots.power.find(f => f.skill === askname) as Skill;
                // let bskill = b.q_lots.power.find(f => f.skill === bskname) as Skill;
                let askill = (a.q_lots.power_by_skill as object)[askname];
                let bskill = (b.q_lots.power_by_skill as object)[bskname];

                let at = skillSum(askill, powerMode);
                let bt = skillSum(bskill, powerMode);

                return at - bt;
            }
            else if (askname && a.q_lots?.power && a.q_lots.power.some(s => s.skill === askname)) {
                return 1;
            }
            else if (bskname && b.q_lots?.power && b.q_lots.power.some(s => s.skill === bskname)) {
                return -1;
            }
            else {
                return 0;
            }
        }
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
                customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, idx)
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
                customCompare: (a: IRosterCrew, b: IRosterCrew) => qpComp(a, b, idx, true)
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
    const { pstMode, quipment, excludeQBits, targetGroup, top, allslots, crew, slots, buffConfig } = props;

    const q_bits = allslots ? 1300 : crew.q_bits;

    let q_lots = crew.q_lots ?? {} as PowerLot;

    if (pstMode === 2) {

    }

    const q_power = crew.q_lots?.power ?? [];
    const skills = Object.keys(CONFIG.SKILLS);

    const printCell = (skill: string | number, multi_mode?: boolean) => {
        let power_sum = undefined as { [key: string]: Skill } | undefined;
        let lot: PowerLot | undefined = q_lots ?? { lot: {} };

        if (typeof skill === 'number') {
            if (multi_mode) {
                lot = undefined;
                if (skill === 0 && crew.q_best_one_two_lots) {
                    power_sum = powerSum(crew.q_best_one_two_lots.power);
                    lot = crew.q_best_one_two_lots;
                }
                // else if (skill === 0 && crew.q_lots) {
                //     skill = crew.skill_order[0];
                //     lot = crew.q_lots;
                // }
                else if (skill === 1 && crew.q_best_one_three_lots) {
                    power_sum = powerSum(crew.q_best_one_three_lots.power);
                    lot = crew.q_best_one_three_lots;
                }
                else if (skill === 2 && crew.q_best_two_three_lots) {
                    power_sum = powerSum(crew.q_best_two_three_lots.power);
                    lot = crew.q_best_two_three_lots;
                }
                else if (skill === 3 && crew.q_best_three_lots) {
                    power_sum = powerSum(crew.q_best_three_lots.power);
                    lot = crew.q_best_three_lots;
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

        if (typeof skill === 'string' && crew.q_lots?.power_by_skill) {
            lot = { ...crew.q_lots };
            lot.lot = {};
            lot.lot[skill] = crew.q_lots.lot[skill];
        }

        return !!lot?.lot && <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap:"0.5em",
            justifyContent: 'normal'
        }}>
            <CrewItemsView
                vertical={!pstMode}
                crew={{ ...crew, q_bits, kwipment_expiration: [], kwipment: Object.values(lot.lot).flat().map(q => Number(q.kwipment_id) as number) }}
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
                data={lot.power_by_skill ? lot.power_by_skill[skill] : lot.power.find(f => f.skill === skill)} />
            ||
            !!power_sum && Object.values(power_sum).sort((a, b) => skillSum(b) - skillSum(a)).map((ps) =>
                <CrewStat
                    key={'power_skill_' + ps.skill}
                    quipmentMode={true}
                    style={{fontSize: "0.8em"}}
                    skill_name={ps.skill as string}
                    data={ps} />
            )}
        </div>
    }

    const voyQ = crew.voyage_quotient ?? 1;
    const topQ = top.voyage_quotient ? top.voyage_quotient : 0;
    const printQ = voyQ;
    const qGrade = 1 - (topQ / voyQ);
    return <React.Fragment>
        <QuipmentScoreCells excludeGrade={true} excludeSpecialty={!pstMode} top={top} crew={crew} excludeSkills={true} excludeQBits={excludeQBits} />
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
        {pstMode === true && ['primary', 'secondary', 'tertiary'].map((skill, idx) => {

            return (
                <Table.Cell key={skill + "_vqntqp"}>
                    {printCell(idx)}
                </Table.Cell>)
        })}
        {pstMode === 2 && ['first_pair', 'second_pair', 'third_pair', 'three_skills'].map((skill, idx) => {
            return (
                <Table.Cell key={skill + "_vqntqp"}>
                    {printCell(idx, true)}
                </Table.Cell>)
        })}
    </React.Fragment>
}



