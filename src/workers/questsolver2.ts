import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedSkill, CrewMember, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Jackpot, MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { IQuestCrew, PathGroup, QuestSolverConfig, QuestSolverResult, ThreeSolveResult } from "../model/worker";
import { applyCrewBuffs, crewCopy, skillSum } from "../utils/crewutils";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, calcQLots, canBuildItem, deductDemands, reverseDeduction, sortCrewByQuipment } from "../utils/equipment";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo, addItemBonus, checkReward, ItemWithBonus, sortItemsWithBonus, getItemWithBonus, mergeItems } from "../utils/itemutils";
import { checkIsProspect, createQuipmentInventoryPool, fillInQuipment } from "../utils/quipment_tools";

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

            const pool = (() => {
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
                })
                .sort((a, b) => {
                    let r = qbitsToSlots(b.q_bits) - qbitsToSlots(a.q_bits);
                    if (!r) r = skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills));
                    return r;
                });
            })();

            const pathGroups = [] as PathGroup[];

            let cnx = -1;
            let crew = pool;

            while (cnx < pool.length - 3) {
                let idx = 0;
                const doubleDuty = {} as {[key: string]: string[]};
                const pathCrew = {} as {[key: string]: IQuestCrew[][]};

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
                            if (c.best_quipment && c.best_quipment.aggregate_by_skill[challenge.skill] < solvePower) single = false;
                            else if (c.best_quipment && config.buildableOnly) {
                                let cq = quipment.filter(fq => {
                                    if (c.kwipment?.length && c.kwipment.some(kw => typeof kw === 'number' ? kw === Number(fq.item.id!) : kw[1] === Number(fq.item.id!))) return false;
                                    return c.best_quipment!.skill_quipment[challenge.skill].some(cqc => cqc.symbol === fq.item.symbol)
                                });
                                const pool = createQuipmentInventoryPool(mergedItems, cq, true);
                                if (pool.length) single = false;
                            }
                            let double = false;
                            if (c.skill_order.length > 1 && c.best_quipment_1_2 && c.best_quipment_1_2.aggregate_by_skill[challenge.skill]) {
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

                for (let key of Object.keys(doubleDuty)) {
                    if (doubleDuty[key]?.length && doubleDuty[key].length < 2) delete doubleDuty[key];
                }

                const doubleCrew = Object.keys(doubleDuty).map(dd => crew.find(c => c.id == Number(dd))!);
                sortCrewByQuipment(doubleCrew, true, 0, true);
                idx = 0;

                for (let path of paths) {
                    const pathkey = path.map(p => p.id).join("_");
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
                                    else {
                                        chmap[chidx] = skillmap[skill].id;
                                    }
                                }
                                else if (skillmap[skill].best_quipment!.aggregate_by_skill[skill] < solvePower) {
                                    skillmap[skill] = test[i];
                                    chmap[chidx] = test[i].id;
                                }
                                else {
                                    chmap[chidx] = skillmap[skill].id;
                                }
                            }
                            else {
                                skillmap[skill] = test[i];
                                pmcrew.push(test[i]);
                                chmap[chidx] = test[i].id;
                            }
                        }
                    }

                    let crewids = [... new Set(Object.values(skillmap).map(m => m.id))];
                    let touched = [] as string[];

                    while (crewids.length > 3) {
                        let q1 = path[path.length-1].skill;
                        let q2 = '';
                        let prevchal = path[path.length-1].name;
                        let prevskill = path[path.length-1].skill;
                        let crew2 = undefined as IQuestCrew | undefined;
                        let i = 0;
                        for (i = 0; i < path.length - 1; i++) {
                            for (let [key, value] of Object.entries(doubleDuty)) {
                                if (value.includes(prevchal) && value.includes(path[i].name)) {
                                    let id = Number(key);
                                    let c = crew.find(f => f.id === id)!;
                                    if (i === path.length - 2) {
                                        const solvePower = getSolvePower(path[i], mastery);
                                        if (c.best_quipment_1_2!.aggregate_by_skill[prevskill] * 0.8 >= solvePower) {
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
                        crewids = [... new Set(Object.values(skillmap).map(m => m.id))];
                    }

                    pmcrew = crewids.map(c => crew.find(f => f.id === c)!);

                    if (crewids.length > 3) {
                        completeness = 'none';
                    }
                    else {
                        while (crewids.length < 3) {
                            for (let c of crew) {
                                if (!crewids.some(pc => pc === c.id)) {
                                    crewids.push(c.id);
                                }
                            }
                        }
                        if (crewids.length < 3) {
                            completeness = 'none';
                        }
                    }

                    if (completeness !== 'none') {
                        chmap.forEach((id, idx) => {
                            let c = pmcrew.find(f => f.id === id);
                            if (!c) return;
                            c.challenges ??= [];
                            let skills = chmap.map((id, idx) => {
                                if (id === c.id) {
                                    return path[idx].skill;
                                }
                                else return undefined;
                            }).filter(s => !!s);
                            skills = [...new Set(skills)];
                            if (skills.length === 2) {
                                if (!c.challenges.some(ch => ch.challenge.id == path[idx].id && ch.path == pathkey)) {
                                    c.challenges.push({
                                        challenge: path[idx],
                                        path: pathkey,
                                        skills: {},
                                        kwipment: Object.values(c.best_quipment_1_2!.skill_quipment).flat().map(q => Number(q.kwipment_id!)),
                                        kwipment_expiration: [0,0,0,0]
                                    });
                                    c.added_kwipment = c.challenges[c.challenges.length-1].kwipment;
                                }
                                else {
                                    let ch = c.challenges.find(ch => ch.challenge.id == path[idx].id && ch.path == pathkey)!
                                    c.added_kwipment = ch.kwipment;
                                }
                            }
                            else {
                                if (!c.challenges.some(ch => ch.challenge.id == path[idx].id && ch.path == pathkey)) {
                                    c.challenges.push({
                                        challenge: path[idx],
                                        path: pathkey,
                                        skills: {},
                                        kwipment: Object.values(c.best_quipment!.skill_quipment[path[idx].skill]).flat().map(q => Number(q.kwipment_id!)),
                                        kwipment_expiration: [0,0,0,0]
                                    });
                                    c.added_kwipment = c.challenges[c.challenges.length-1].kwipment;
                                }
                                else {
                                    let ch = c.challenges.find(ch => ch.challenge.id == path[idx].id && ch.path == pathkey)!
                                    c.added_kwipment = ch.kwipment;
                                }
                            }
                        });

                        pmcrew.forEach(c => {
                            if (!c.challenges?.length) return;
                            const quipbonus = quipment.filter(qf => c.added_kwipment?.some(aq => typeof aq === 'number' ? aq == qf.item.id : aq[1] == qf.item.id));
                            const quipitems = quipbonus.map(qb => qb.item);
                            if (config.includeCurrentQp) {
                                const result = fillInQuipment(c, quipitems, qbitsToSlots(c.q_bits));
                                c.added_kwipment = result.kwipment;
                                c.added_kwipment_expiration = result.kwipment_expiration;
                            }
                            else {
                                c.added_kwipment = c.added_kwipment!;
                                c.added_kwipment_expiration = [0, 0, 0, 0];
                            }
                            applyCrewBuffs(c, config.buffs, false, quipbonus.map(bi => bi.bonusInfo));
                            // c.challenges[c.challenges.length - 1].kwipment = c.added_kwipment as number[];
                            // c.challenges[c.challenges.length - 1].kwipment_expiration = c.added_kwipment_expiration as number[];
                            // c.kwipment_prospects = c.added_kwipment_expiration.some(i => !i);
                        });

                        pmcrew.forEach((pc) => {
                            pc.associated_paths ??= [];
                            if (pc.associated_paths.some(ap => ap.path === pathkey) || !pc.challenges) return;
                            let matchskills = [...new Set(pc.challenges.map(ch => ch.challenge.skill))];
                            const skills = {} as BaseSkills;
                            Object.keys(CONFIG.SKILLS).map(skill => {
                                //if (!matchskills.includes(skill)) return;
                                if (!pc[skill].core) return;
                                skills[skill] = {
                                    core: pc[skill].core,
                                    range_min: pc[skill].min,
                                    range_max: pc[skill].max,
                                    skill
                                }
                            });
                            pc.associated_paths.push({
                                path: pathkey,
                                needed_kwipment: pc.added_kwipment! as number[],
                                needed_kwipment_expiration: pc.added_kwipment_expiration as number[],
                                skills
                            });
                            delete pc.added_kwipment;
                            delete pc.added_kwipment_expiration;
                        });

                        if (!hasCombo(pmcrew, pathkey)) {
                            if (!path.every(challenge => pmcrew.some(pmc => pmc.challenges?.some(ch2 => ch2.challenge.id === challenge.id)))) {
                                completeness = 'partial';
                            }
                            pathGroups.push({
                                path: pathkey,
                                crew: pmcrew,
                                mastery,
                                completeness,
                                path_expanded: path
                            });
                        }
                    }
                    idx++;
                }
                cnx++;
                crew = [...pool];
                crew.splice(cnx, 1);
                //crew.length = 0;
            }

            const finalPaths = pathGroups.filter(pg => {
                if (!config.includePartials && pg.completeness !== 'full') {
                    return false;
                }
                if (pg.completeness === 'none') return false;
                return true;
            }).sort((a, b) => {
                let ar = 0;
                let br = 0;
                let r = 0;

                let pa = pathPrice(a.path, a.crew);
                let pb = pathPrice(b.path, b.crew);
                r = pa - pb;
                if (r) return r;

                // make sure we get a variety of every sort floated to the top
                let asp = a.path.split("_") ?? [];
                let bsp = b.path.split("_") ?? [];

                ar = asp.map(p => a.crew.map(c => gradeCrew(c, Number.parseInt(p))))?.flat().reduce((p, n) => p + n, 0) ?? 10;
                br = bsp.map(p => b.crew.map(c => gradeCrew(c, Number.parseInt(p))))?.flat().reduce((p, n) => p + n, 0) ?? 10;
                r = ar - br;

                if (!r) {
                    ar = a.crew.map(c => c.score ?? 0).reduce((p, n) => p + n, 0);
                    br = b.crew.map(c => c.score ?? 0).reduce((p, n) => p + n, 0);
                }
                return ar - br;
            });

            resolve({
                status: true,
                fulfilled: true,
                crew: [...new Set(finalPaths.map(m => m.crew).flat())],
                error: "No player crew roster",
                paths: finalPaths,
                pathspartial: false
            });

            function newQuip(crew: IQuestCrew) {
                let e = 0;
                if (crew.added_kwipment && crew.added_kwipment_expiration) {
                    for (let i = 0; i < crew.added_kwipment.length; i++) {
                        if (crew.added_kwipment[i] && !crew.added_kwipment_expiration[i]) {
                            e++;
                        }
                    }

                }
                return e;
            }

            function pathPrice(path: string, crew: IQuestCrew[]) {
                let qp = [] as number[];

                crew.forEach((crew) => {
                    let ap = crew.associated_paths?.find(f => f.path === path);
                    if (ap) {
                        if (ap.needed_kwipment?.length) {
                            let nc = newQuip({ ...crew, added_kwipment: ap.needed_kwipment });
                            qp.push(nc);
                        }
                    }
                });
                return qp.reduce((p, n) => p + n, 0);
            }

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

            function hasCombo(crew: IQuestCrew[], path: string) {
                return pathGroups.some((pg) => {
                    return pg.crew.every(c => crew.some(c2 => c.id === c2.id)) &&
                        pg.path === path
                });
            }

            function gradeCrew(crew: IQuestCrew, ch: number) {
                let f = crew.challenges?.find(f => f.challenge.id === ch);
                let cc = crew.challenges?.length ?? 1;
                let z = 0;

                if (f) {
                    z -= Object.values(f.skills)
                                .map(sk => Object.values(sk))
                                .flat()
                                .filter(n => typeof n === 'number')
                                .map(n => n as number)
                                .reduce((p, n) => p + n, 0);

                    if (f.max_solve) z++;
                    if (crew.challenges?.some(f => f.challenge.children.includes(ch))) z++;
                    if (cc > 1 && crew.challenges?.every(f => f.challenge.id === ch || f.challenge.children.includes(ch))) z++;
                }
                let nk = newQuip(crew);
                z += (nk * 0.5);
                return z;
            }

        });
    },
}

export default QuestSolver;