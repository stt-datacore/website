import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedSkill, CrewMember, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Jackpot, MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { IQuestCrew, PathGroup, QuestSolverConfig, QuestSolverResult, ThreeSolveResult } from "../model/worker";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, calcQLots, canBuildItem, deductDemands, reverseDeduction, sortCrewByQuipment } from "../utils/equipment";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo, addItemBonus, checkReward, ItemWithBonus, sortItemsWithBonus, getItemWithBonus, mergeItems } from "../utils/itemutils";
import { createQuipmentInventoryPool } from "../utils/quipment_tools";
import { applyCrewBuffs } from "./betatachyon";

function qbitsToSlots(q_bits: number | undefined) {
    // 100/200/500/1300
    q_bits ??= 0;
    if (q_bits < 100) return 0;
    else if (q_bits < 200) return 1;
    else if (q_bits < 500) return 2;
    else if (q_bits < 1300) return 3;
    return 4;
}

const QuestSolver = {
    solveQuest: (config: QuestSolverConfig) => {
        return new Promise<QuestSolverResult>((resolve, reject) => {
            const quest = config.quest;
            const mastery = config.mastery;
            const { items } = config.context.core;
            const { playerData, ephemeral } = config.context.player;
            const { considerFrozen, idleOnly } = config;
            const crewSlots = {} as { [key: string]: number };

            if (!playerData?.player?.character?.crew?.length) {
                resolve({
                    status: false,
                    fulfilled: false,
                    crew: [],
                    error: "No player crew roster",
                    paths: [],
                    pathspartial: false
                });
                return;
            }

            const challenges = config.challenges?.length ? config.challenges : (config.quest?.challenges ?? []);
            const ignoreChallenges = config.ignoreChallenges ?? [];

            const map = makeNavMap(challenges);
            const paths = getNodePaths(map[0], map).map(p => p.ids.map(id => challenges.find(f => f.id === id))) as MissionChallenge[][];

            challenges.sort((a, b) => a.id - b.id);

            const mergedItems = mergeItems(playerData.player.character.items, config.context.core.items, true) as EquipmentItem[];
            const quipment = mergedItems.filter(f => f.type === 14).map(item => getItemWithBonus(item));

            const crew = (() => {
                let crew = playerData.player.character.crew
                    .filter(c => {
                        if (!c.immortal) return false;
                        if (idleOnly && ephemeral) {
                            if (ephemeral.activeCrew.some(ac => ac.id === c.id)) return false;
                        }
                        if (!considerFrozen && c.immortal > 0) return false;
                        if (config.qpOnly && c.q_bits < 100) return false;
                        if (c.immortal > 0) c.q_bits = 1300;
                        crewSlots[c.id] = qbitsToSlots(c.q_bits);
                        return true;
                    });
                if (config.considerUnowned) {
                    crew = crew.concat(
                        (playerData.player.character.unOwnedCrew ?? [])
                            .map(uc =>{
                                crewSlots[uc.id] = 4;
                                return ({...uc, q_bits: 1300, kwipment: [0, 0, 0, 0], kwipment_expiration: [0, 0, 0, 0] })
                            })
                    );
                }
                return crew.map(c => {
                    c = calcQLots(c, quipment, config.buffs, config.ignoreQpConstraint);
                    return c as IQuestCrew;
                });
            })();

            const pathCrew = {} as {[key: string]: IQuestCrew[][]};
            const doubleDuty = {} as {[key: string]: string[]};

            let idx = 0;

            for (let path of paths) {
                pathCrew[idx] = [];
                let chidx = 0;
                for (let challenge of path) {
                    pathCrew[idx].push([]);
                    if (config.ignoreChallenges?.includes(challenge.id)) {
                        chidx++;
                        continue;
                    }
                    let chcrew = crew.filter(f => f.skill_order.includes(challenge.skill));
                    const solvePower = getSolvePower(challenge, mastery);

                    sortCrewByQuipment(chcrew, false, challenge.skill, true);

                    chcrew = chcrew.filter(c => {
                        let single = true;
                        if (c.best_quipment!.aggregate_by_skill[challenge.skill] < solvePower) single = false;
                        else if (config.buildableOnly) {
                            let cq = quipment.filter(fq => {
                                if (c.kwipment?.length && c.kwipment.some(kw => typeof kw === 'number' ? kw === Number(fq.item.id!) : kw[1] === Number(fq.item.id!))) return false;
                                return c.best_quipment!.skill_quipment[challenge.skill].some(cqc => cqc.symbol === fq.item.symbol)
                            });
                            const pool = createQuipmentInventoryPool(mergedItems, cq, true);
                            if (pool.length) single = false;
                        }
                        let double = false;
                        if (c.skill_order.length > 1) {
                            double = true;
                            if (c.best_quipment_1_2!.aggregate_by_skill[challenge.skill] < solvePower) double = false;
                            else if (config.buildableOnly) {
                                let cq = quipment.filter(fq => {
                                    if (c.kwipment?.length && c.kwipment.some(kw => typeof kw === 'number' ? kw === Number(fq.item.id!) : kw[1] === Number(fq.item.id!))) return false;
                                    if (!c.best_quipment_1_2!.skill_quipment[challenge.skill]) {
                                        return false;
                                    }
                                    return c.best_quipment_1_2!.skill_quipment[challenge.skill].some(cqc => cqc.symbol === fq.item.symbol)
                                });
                                const pool = createQuipmentInventoryPool(mergedItems, cq, true);
                                if (pool.length) double = false;
                            }
                        }
                        if (double) {
                            doubleDuty[c.id] ??= [];
                            if (!doubleDuty[c.id].includes(challenge.name)) {
                                doubleDuty[c.id].push(challenge.name);
                            }
                        }
                        return single || double;
                    });
                    pathCrew[idx][chidx] = chcrew;
                    chidx++;
                }
                idx++;
            }

            const doubleCrew = Object.keys(doubleDuty).map(dd => crew.find(c => c.id == Number(dd))!);
            sortCrewByQuipment(doubleCrew, true, 0, true);
            const pathGroups = [] as PathGroup[];
            idx = 0;

            for (let path of paths) {
                let skills = path.map(c => c.skill);
                let unique_skills = [...new Set(skills)];
                let crews = path.map((c, i) => pathCrew[idx][i]);
                let chmap = path.map(c => 0);

                let pmcrew = [] as IQuestCrew[];
                let completeness: ThreeSolveResult = 'full';
                let chidx = 0;

                let skillmap = {} as {[key:string]: IQuestCrew};
                for (chidx = 0; chidx < path.length; chidx++) {
                    let i = 0;
                    let test = crews[chidx];
                    let c = test.length;

                    while (i < c && pmcrew.includes(test[i])) {
                        i++;
                    }
                    if (i >= c) {
                        completeness = 'partial';
                    }
                    else {
                        let skill = path[chidx].skill;
                        if (skillmap[skill]) {
                            const solvePower = getSolvePower(path[chidx], mastery);
                            if (chidx && path[chidx-1].skill === skill) {
                                if ((skillmap[skill].best_quipment!.aggregate_by_skill[skill] * 0.8) < solvePower) {
                                    skillmap[skill] = test[i];
                                    chmap[chidx] = test[i].id;
                                }
                            }
                            else if (skillmap[skill].best_quipment!.aggregate_by_skill[skill] < solvePower) {
                                skillmap[skill] = test[i];
                                chmap[chidx] = test[i].id;
                            }
                        }
                        else {
                            skillmap[skill] = test[i];
                            pmcrew.push(test[i]);
                            chmap[chidx] = test[i].id;
                        }
                    }
                }

                let crewsyms = [... new Set(Object.values(skillmap).map(m => m.id))];
                let touched = [] as string[];

                while (crewsyms.length > 3) {
                    let q1 = path[path.length-1].skill;
                    let q2 = '';
                    let lastname = path[path.length-1].name;
                    let lastskill = path[path.length-1].skill;
                    let crew2 = undefined as IQuestCrew | undefined;
                    let i = 0;
                    for (i = 0; i < path.length - 1; i++) {
                        for (let [key, value] of Object.entries(doubleDuty)) {
                            if (value.includes(lastname) && value.includes(path[i].name)) {
                                let id = Number(key);
                                let c = crew.find(f => f.id === id)!;
                                if (i === path.length - 2) {
                                    const solvePower = getSolvePower(path[i], mastery);
                                    if (c.best_quipment_1_2!.aggregate_by_skill[lastskill] * 0.8 >= solvePower) {
                                        crew2 = c;
                                        q2 = path[i].skill;
                                        break;
                                    }
                                }
                                else {
                                    crew2 = c;
                                    q2 = path[i].skill;
                                    break;
                                }
                            }
                        }
                        if (crew2) break;
                    }
                    if (!crew2 || !q2 || i >= path.length) {
                        completeness = 'partial';
                        let skimp = Object.keys(skillmap);
                        if (skimp.length > 1 && skimp[skimp.length-1] !== skimp[skimp.length-2]) {
                            delete skillmap[skimp[skimp.length-2]];
                        }
                    }
                    else if (!touched.includes(q2)) {
                        skillmap[q1] = crew2;
                        skillmap[q2] = crew2;
                        chmap[i] = crew2.id;
                        chmap[path.length-1] = crew2.id;
                        touched.push(q2);
                    }
                    else {
                        if (skillmap[q2]) delete skillmap[q2];
                        else delete skillmap[q1];
                    }
                    crewsyms = [... new Set(Object.values(skillmap).map(m => m.id))];
                }
                chmap.forEach((id, idx) => {
                    let c = crew.find(f => f.id === id);
                    if (!c) return;
                    c.challenges ??= [];
                    if (chmap.filter(f => f === id).length === 2) {
                        c.challenges.push({
                            challenge: path[idx],
                            path: path.map(m => m.id).join("_"),
                            skills: {},
                            kwipment: Object.values(c.best_quipment_1_2!.skill_quipment).flat().map(q => Number(q.kwipment_id!)),
                            kwipment_expiration: [0,0,0,0]
                        });
                        c.added_kwipment = c.challenges[c.challenges.length-1].kwipment;
                    }
                    else {
                        c.challenges.push({
                            challenge: path[idx],
                            path: path.map(m => m.id).join("_"),
                            skills: {},
                            kwipment: Object.values(c.best_quipment!.skill_quipment[path[idx].skill]).flat().map(q => Number(q.kwipment_id!)),
                            kwipment_expiration: [0,0,0,0]
                        });
                        c.added_kwipment = c.challenges[c.challenges.length-1].kwipment;
                    }
                });
                pmcrew = Object.values(skillmap);
                // pmcrew.forEach((pc) => {
                //     pc.associated_paths ??= [];
                //     pc.associated_paths.push()
                // })
                pathGroups.push({
                    path: path.map(p => p.id).join("_"),
                    crew: pmcrew,
                    mastery,
                    completeness: 'full',
                    path_expanded: path
                });

                idx++;
            }
            // resolve({
            //     status: true,
            //     fulfilled: !failed.length && finalpss.length >= paths.length,
            //     paths: finalpss,
            //     crew,
            //     failed: failed,
            //     pathspartial: partial
            // });

            resolve({
                status: true,
                fulfilled: true,
                crew: [...new Set(pathGroups.map(m => m.crew).flat())],
                error: "No player crew roster",
                paths: pathGroups,
                pathspartial: false
            });

            function getSolvePower(challenge: MissionChallenge, mastery: number) {
                let critmult = 1;
                if (!config.alwaysCrit && quest && quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
                    critmult = (!!(quest.mastery_levels[mastery].jackpots as Jackpot[]).find(f => f.id === challenge.id && (f.claimed && f.can_reclaim))) ? 0 : 1;
                }
                const crit = challenge.critical?.threshold ?? 150;
                // if (challenge.critical?.threshold && challenge.critical.threshold !== 150) {
                //     console.log("here");
                // }
                return (challenge.difficulty_by_mastery[mastery] + (critmult * [crit, crit+125, crit+150][mastery]));
            }

        });
    },
}

export default QuestSolver;