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
                    let critmult = 1;
                    if (config.ignoreChallenges?.includes(challenge.id)) {
                        chidx++;
                        continue;
                    }
                    if (!config.alwaysCrit && quest && quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
                        critmult = (!!(quest.mastery_levels[mastery].jackpots as Jackpot[]).find(f => f.id === challenge.id && (f.claimed && f.can_reclaim))) ? 0 : 1;
                    }
                    const crit = challenge.critical?.threshold ?? 150;
                    if (challenge.critical?.threshold && challenge.critical.threshold !== 150) {
                        console.log("here");
                    }
                    const solvePower = (challenge.difficulty_by_mastery[mastery] + (critmult * [crit, crit+125, crit+150][mastery]));
                    let chcrew = crew.filter(f => f.skill_order.includes(challenge.skill));

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

            // resolve({
            //     status: true,
            //     fulfilled: !failed.length && finalpss.length >= paths.length,
            //     paths: finalpss,
            //     crew,
            //     failed: failed,
            //     pathspartial: partial
            // });

            resolve({
                status: false,
                fulfilled: false,
                crew: [],
                error: "No player crew roster",
                paths: [],
                pathspartial: false
            });
        });
    },
}

export default QuestSolver;