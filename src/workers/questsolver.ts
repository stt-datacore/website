import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedBuff, CrewMember, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Jackpot, Mission, MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { AssociatedPath, IQuestCrew, PathGroup, QuestSolverConfig, QuestSolverResult, ThreeSolveResult } from "../model/worker";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, canBuildItem, deductDemands, reverseDeduction } from "../utils/equipment";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo, addItemBonus, checkReward } from "../utils/itemutils";
import { arrayIntersect, makeAllCombos } from "../utils/misc";
import { applyCrewBuffs } from "./betatachyon";

export function getSkillOrder<T extends CrewMember>(crew: T) {
    const sk = [] as ComputedBuff[];

    for (let skill of Object.keys(CONFIG.SKILLS)) {
        if (skill in crew.base_skills && !!crew.base_skills[skill].core) {
            sk.push({ ...crew.base_skills[skill], skill: skill });
        }
    }

    sk.sort((a, b) => b.core - a.core);
    const output = [] as string[];

    if (sk.length > 0 && sk[0].skill) {
        output.push(sk[0].skill);
    }
    if (sk.length > 1 && sk[1].skill) {
        output.push(sk[1].skill);
    }
    if (sk.length > 2 && sk[2].skill) {
        output.push(sk[2].skill);
    }

    return output;
}

export function findAllCombos(crew: IQuestCrew[], path: MissionChallenge[]) {

    let collects = [] as IQuestCrew[][];
    let unseen = [] as IQuestCrew[][];
    let seen = [] as IQuestCrew[][];

    for (let p of path) {
        let filtered = crew.filter(f => f.challenges?.some(ch => ch.challenge.id === p.id));

        let funseen = filtered.filter(f => !collects.some(c => c.some(d => d.id === f.id)));
        unseen.push(funseen);

        let fseen = filtered.filter(f => collects.some(c => c.some(d => d.id === f.id)));
        seen.push(fseen);

        collects.push(filtered);
    }

    // the last node must be hit so let's get crew for that.
    // let lasts = seen[path.length - 1];
    // if (!lasts.length) lasts = unseen[path.length - 1];
    // if (!lasts.length) lasts = collects[path.length - 1];
    
    let lasts = collects[path.length - 1];

    for (let i = 0; i < path.length - 1; i++) {
        collects[i] = collects[i].filter(f => !lasts.some(l => l.id === f.id));
    }
    let stinct = [ ... new Set(collects.map(col => col.map(c => c.id)).flat()) ].map(cid => crew.find(cf => cf.id === cid));
    stinct = stinct.filter(st => !st?.challenges?.every(ch => lasts.some(lch => lch.challenges?.some (lchc => lchc.challenge.id === ch.challenge.id))));
    console.log("break here to study data");

    let ids = [ ... new Set(stinct.concat(lasts).map(l => l?.id ?? 0).filter(l => l)) ];
    let combos = makeAllCombos(ids, Number.POSITIVE_INFINITY, undefined, undefined, 3).filter(c => c.length === 3);
    return combos;
}

export function getTraits<T extends CrewMember>(crew: T, traits: MissionTraitBonus[]) {
    return traits.filter(f => crew.traits.includes(f.trait) || crew.traits_hidden.includes(f.trait));
}

export function gradeCrew(crew: IQuestCrew, ch: number) {
    let f = crew.challenges?.find(f => f.challenge.id === ch);
    let cc = crew.challenges?.length ?? 1;    
    let z = 0;

    if (f) {
        if (f.max_solve) z++;
        if (crew.challenges?.some(f => f.challenge.children.includes(ch))) z++;
        if (cc > 1 && crew.challenges?.every(f => f.challenge.id === ch || f.challenge.children.includes(ch))) z++;        
    }

    return z;
}

const QuestSolver = {

    solveQuest: (config: QuestSolverConfig) => {

        const quest = config.quest;

        function qbitsToSlots(q_bits: number | undefined) {
            // 100/200/500/1300
            q_bits ??= 0;
            if (q_bits < 100) return 0;
            else if (q_bits < 200) return 1;
            else if (q_bits < 500) return 2;
            else if (q_bits < 1300) return 3;
            return 4;
        }

        const playerItems = JSON.parse(JSON.stringify(config.context.player.playerData.player.character.items)) as PlayerEquipmentItem[];
        const allQuipment = JSON.parse(JSON.stringify(config.context.core.items.filter(f => f.type === 14))) as EquipmentItem[];

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

        function deductItem(item: EquipmentItem, history: { [key: string]: boolean[]} ) {
            history[item.symbol] ??= [];
            let r = deductDemands(item, playerItems);
            history[item.symbol].push(r);
            return r;
        }

        function reverseItem(item: EquipmentItem, history: { [key: string]: boolean[]}) {
            history[item.symbol] ??= [];
            if (!history[item.symbol].length) return;
            let b = history[item.symbol].splice(history[item.symbol].length - 1, 1);
            if (!b) {
                item.quantity ??= 0;
                item.quantity++;
            }
            else {
                reverseDeduction(item, playerItems);
            }
        }

        function standardSort(roster: IQuestCrew[], challenge?: MissionChallenge, mastery?: number, traits?: MissionTraitBonus[], testPostProcess?: boolean): IQuestCrew[] {
            mastery ??= config.mastery;
            const useTraits = config.noTraitBonus ? [] : (traits ?? challenge?.trait_bonuses ?? []);
            return roster.sort((a, b) => {
                let ba = a.q_bits;
                let bb = b.q_bits;

                if (testPostProcess) {
                    if (a.have !== b.have) {
                        if (a.have) return -1;
                        return 1;
                    }
                    if (a.immortal !== b.immortal) {
                        if (a.immortal === -1) return -1;
                        return 1;
                    }

                    let na = 0;

                    na = newQuip(a) - newQuip(b);
                    if (na) return na;

                    na = bb - ba;
                    if (na) return na;
                    
                    // if (a.challenges?.length && b.challenges?.length) {
                    //     return b.challenges.length - a.challenges.length;
                    // }
                }
                
                if (challenge) {
                    ba += a[challenge.skill].core + a[challenge.skill].min + a[challenge.skill].max;
                    bb += b[challenge.skill].core + b[challenge.skill].min + b[challenge.skill].max;
                    
                    for (let trait of useTraits) {
                        if (a.traits.includes(trait.trait) || a.traits_hidden.includes(trait.trait)) {
                            ba += trait.bonuses[mastery ?? config.mastery];
                        }
                        if (b.traits.includes(trait.trait) || b.traits_hidden.includes(trait.trait)) {
                            bb += trait.bonuses[mastery ?? config.mastery];
                        }
                    }
                    
                    return bb - ba;
                }

                return ba - bb;
            });
        }

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, path: string, traits?: MissionTraitBonus[], maxIsGood?: boolean) {
            const useTraits = config.noTraitBonus ? [] : (traits ?? challenge.trait_bonuses ?? []);
            let questcrew = [] as IQuestCrew[];
            let critmult = 1;
            
            if (config.ignoreChallenges?.includes(challenge.id)) return [];

            if (!config.alwaysCrit && quest && quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
                critmult = (!!(quest.mastery_levels[mastery].jackpots as Jackpot[]).find(f => f.id === challenge.id && (f.claimed && f.can_reclaim)) ?? false) ? 0 : 1;
            }

            questcrew = roster.filter(c =>
                (challenge.skill in c.skills) && (!config.qpOnly || c.q_bits >= 100))
                .map(c => c as IQuestCrew);
            
            questcrew = standardSort(questcrew, challenge, mastery, traits);

            let qpass = questcrew.filter((crew) => {
                if (crew.symbol === 'crusher_riker_brain_drain_crew') {
                    console.log("break");
                }
                const nslots = (!!config.ignoreQpConstraint || crew.immortal > 0) ? 4 : qbitsToSlots(crew.q_bits);

                crew.challenges ??= [];
                let cpmin = crew[challenge.skill].core + crew[challenge.skill].min;
                let cpmax = crew[challenge.skill].core + crew[challenge.skill].max;

                let ttraits = getTraits(crew, useTraits);

                let tpower = ttraits
                    .map((t => t.bonuses[mastery]))
                    .reduce((p, n) => p + n, 0);

                cpmin += tpower;
                cpmax += tpower;

                crew.metasort ??= 0;

                if (config.includeCurrentQp) {
                    if (!crew.added_kwipment || !crew.added_kwipment_expiration) {
                        crew.added_kwipment = crew.kwipment.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                        crew.added_kwipment_expiration = crew.kwipment_expiration.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                    }
                }
                else {
                    crew.added_kwipment ??= [0, 0, 0, 0];
                    crew.added_kwipment_expiration ??= [0, 0, 0, 0];
                }

                const usedSlots = crew.added_kwipment.filter(aq => !!aq)?.length ?? 0;
                const slots = [] as string[];
                const quips = {} as { [key: string]: ItemBonusInfo };
                const solvePower = (challenge.difficulty_by_mastery[mastery] + (critmult * [250, 275, 300][mastery]));

                while (cpmin < solvePower && (!maxIsGood || cpmax < solvePower)) {
                    if (!nslots || (1 + usedSlots + slots.length > nslots)) {
                        if (cpmax >= solvePower) {
                            break;
                        }
                        return false;
                    }

                    const quipment = allQuipment
                        .filter((i: EquipmentItem) => {
                            if ((!i.max_rarity_requirement && !i.traits_requirement?.length)) return false;
                            if (!i.kwipment_id || !Object.keys(getItemBonuses(i).bonuses).includes(challenge.skill)) return false;
                            return true;
                        }) as EquipmentItem[];

                    let qps = getPossibleQuipment(crew, quipment)
                        .filter((item) => !slots.includes(item.symbol))
                        .filter((item) => !(crew.added_kwipment as number[])?.includes(Number.parseInt(item.kwipment_id as string)))
                        .map((qp) => {
                            return { item: qp, bonusInfo: getItemBonuses(qp) }
                        })
                        .filter((qp) => challenge.skill in qp.bonusInfo.bonuses)
                        .sort((a, b) => {
                            let r = 0;

                            if (config.cheapestFirst) {
                                if (!a.item.demands) {
                                    a.item.demands = calcItemDemands(a.item, config.context.core.items, playerItems);
                                }
                                if (!b.item.demands) {
                                    b.item.demands = calcItemDemands(b.item, config.context.core.items, playerItems);
                                }
                                let ac = a.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
                                let bc = b.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
                                r = ac - bc;                                
                                if (r) return r;
                            }

                            let an = [a.bonusInfo.bonuses[challenge.skill]].map(v => v.core + v.range_max).reduce((p, n) => p + n, 0);
                            let bn = [b.bonusInfo.bonuses[challenge.skill]].map(v => v.core + v.range_max).reduce((p, n) => p + n, 0);
                            r = bn - an;
                            if (!r) {
                                let ac = Object.keys(a.bonusInfo.bonuses) ?? [];
                                let bc = Object.keys(b.bonusInfo.bonuses) ?? [];
                                r = bc.length - ac.length;
                            }
                            return r;
                        });

                    if (qps?.length) {
                        let qpower = qps[0].bonusInfo.bonuses[challenge.skill].core + qps[0].bonusInfo.bonuses[challenge.skill].range_min;
                        let mpower = qps[0].bonusInfo.bonuses[challenge.skill].core + qps[0].bonusInfo.bonuses[challenge.skill].range_max;

                        cpmin += qpower;
                        cpmax += mpower;

                        quips[qps[0].item.symbol] = qps[0].bonusInfo;
                        slots.push(qps[0].item.symbol);
                    }
                    else {
                        return false;
                    }
                }

                crew.metasort += cpmin;

                if (slots.length) {
                    Object.entries(quips).forEach(([symbol, qp]) => {
                        addItemBonus(crew, qp, challenge.skill);
                    });

                    let j = 0;
                    for (let i = 0; i < 4; i++) {
                        if (crew.added_kwipment[i] === 0) {
                            let qf = allQuipment.find(f => f.symbol === slots[j]);
                            if (qf) {
                                if (typeof qf.kwipment_id === 'string') {
                                    crew.added_kwipment[i] = Number.parseInt(qf.kwipment_id);
                                }
                                else if (typeof qf.kwipment_id === 'number') {
                                    crew.added_kwipment[i] = qf.kwipment_id;
                                }
                                else {
                                    break;
                                }
                            }

                            j++;
                            if (j >= slots.length) break;
                        }
                    }
                }

                if (!crew.challenges.some(ch => ch.challenge.id === challenge.id)) {
                    crew.challenges.push({
                        challenge,
                        skills: {},
                        trait_bonuses: ttraits,
                        max_solve: cpmin < solvePower,
                        path: path,
                        kwipment: (crew.added_kwipment ?? []) as number[],
                        kwipment_expiration: (crew.added_kwipment_expiration ?? []) as number[]
                    });
                }

                return true;
            });

            return qpass.filter(c => !!c.challenges?.length);
        }

        return new Promise<QuestSolverResult>((resolve, reject) => {
            const { items } = config.context.core;
            const { playerData, ephemeral } = config.context.player;
            const { considerFrozen, idleOnly } = config;
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

            const resetCrew = (crew: IQuestCrew, path?: string) => {
                delete crew.metasort;
                delete crew.added_kwipment;
                delete crew.added_kwipment_expiration;
                delete crew.challenges;
                
                if (!config.includeCurrentQp || (!("skills" in crew) || !Object.keys(crew.skills).length || crew.immortal !== -1)) {
                    if (!crew.skills) {
                        crew.skills = { ...JSON.parse(JSON.stringify(crew.base_skills)) };
                    }
                    applyCrewBuffs(crew, config.buffs);
                }
                else {
                    for (let skill of getSkillOrder(crew)) {
                        if ("skills" in crew && skill in crew.skills) {
                            crew[skill].core = crew.skills[skill].core;
                            crew[skill].min = crew.skills[skill].range_min;
                            crew[skill].max = crew.skills[skill].range_max;
                        }
                    }
                }
            }

            const roster = playerData.player.character.crew
                .filter(f => !ephemeral?.activeCrew?.some(c => c.id === f.id) || !idleOnly)
                .filter(f => !!f.immortal && ((f.immortal === -1) || considerFrozen))
                .concat(!!config.considerUnowned ? (playerData.player.character.unOwnedCrew ?? []) : [])
                .map((crew) => {
                    crew = JSON.parse(JSON.stringify(crew));

                    if (crew.immortal === -1) {
                        let ac = ephemeral?.activeCrew?.find(c => c.id === crew.id);
                        if (ac?.active_status) {
                            crew.active_status = ac.active_status;
                        }
                    }
                    if (crew.immortal === undefined || crew.immortal < -1) {
                        // unowned crew
                        crew.rarity = 0;
                        crew.kwipment = [0, 0, 0, 0];
                        crew.kwipment_expiration = [0, 0, 0, 0];
                        crew.q_bits = 1300;
                        crew.skills = JSON.parse(JSON.stringify(crew.base_skills));
                        Object.keys(crew.skills).forEach((skill) => {
                            crew.skills[skill].skill = skill;
                            crew[skill] = {
                                core: crew.skills[skill].core,
                                min: crew.skills[skill].range_min,
                                max: crew.skills[skill].range_max,
                            }
                        });
                    }
                    crew.date_added = new Date(crew.date_added);
                    resetCrew(crew);

                    return crew;
                });
            
            if (!config.challenges?.length && !config.quest?.challenges?.length) {
                resolve({
                    status: false,
                    fulfilled: false,
                    crew: [],
                    error: "No quest or challenges provided",
                    paths: [],
                    pathspartial: false
                });
                return;
            }

            const challenges = config.challenges?.length ? config.challenges : (config.quest?.challenges ?? []);
            const ignoreChallenges = config.ignoreChallenges ?? [];

            const map = makeNavMap(challenges);
            const paths = getNodePaths(map[0], map).map(p => p.ids.map(id => challenges.find(f => f.id === id))) as MissionChallenge[][];

            let crew = [] as IQuestCrew[];

            challenges.sort((a, b) => a.id - b.id);

            const processChallenge = (ch: MissionChallenge, roster: PlayerCrew[], crew: IQuestCrew[], path: string, maxIsGood?: boolean) => {                
                let chcrew = solveChallenge(roster, ch, config.mastery, path, undefined, maxIsGood);
                
                if (chcrew?.length) {
                    // dupes are a thing, so identical symbols are okay, identical object references are not.

                    crew = crew.filter(c => !chcrew.includes(c));
                    crew = crew.concat(chcrew);
                    crew = [... new Set(crew)];
                }

                return standardSort(crew, ch, config.mastery, undefined, true);
            }

            const pathCrew = {} as { [key: string]: IQuestCrew[] }
            const maxPathCrew = {} as { [key: string]: IQuestCrew[] }
            
            const pathMap = {} as { [key: string]: MissionChallenge[] }
            const solveChains = {} as { [key: string]: number[][] };

            for (let path of paths) {
                let tempRoster = [] as IQuestCrew[];
                const key = path.map(p => p.id).join("_");

                pathCrew[key] = [];
                maxPathCrew[key] = [];
                pathMap[key] = path;

                tempRoster = JSON.parse(JSON.stringify(roster));

                for (let ch of path) {
                    let myroster = tempRoster.filter(fc => {
                        let sko = getSkillOrder(fc);
                        if (!sko?.length) return false;
                        if (sko[0] === ch.skill) return true;
                        //if (sko.length > 1 && sko[1] === ch.skill) return true;
                    });
                    
                    //let myroster = tempRoster;
                    pathCrew[key] = processChallenge(ch, myroster, pathCrew[key], key);
                    
                    if (!pathCrew[key].some(pc => pc.challenges?.some(chc => chc.challenge.id === ch.id))) {
                        pathCrew[key] = processChallenge(ch, tempRoster, pathCrew[key], key);
                        if (!pathCrew[key].some(pc => pc.challenges?.some(chc => chc.challenge.id === ch.id))) {
                            pathCrew[key] = processChallenge(ch, tempRoster, pathCrew[key], key, true);
                        }
                    }
                }

                pathCrew[key].sort((a, b) => (a.added_kwipment?.filter(f => !!f)?.length ?? 0) - (b.added_kwipment?.filter(f => !!f)?.length ?? 0));
            }

            Object.keys(pathCrew).forEach((path) => {
                let crew = pathCrew[path];
                crew = crew.filter(c => !!c.challenges?.length)
                crew.forEach((c, idx) => {
                    c.score = idx + 1;                    
                    c.challenges?.forEach((ch, idx) => {
                        Object.keys(c.skills).forEach((skill) => {
                            let core = c[skill].core;
                            let max = c[skill].max;
                            let min = c[skill].min;
                                
                            ch.skills[skill] = {
                                core,
                                range_min: min,
                                range_max: max,
                                skill
                            };
                        });
                    });
                });
    
                pathCrew[path] = crew;
            });

            const buildQuipment = (c: IQuestCrew, allQuipment: EquipmentItem[], deductHistory: { [key: string]: boolean[] }, altItems?: number[]) => {
                altItems ??= c.added_kwipment as number[] ?? [];
                if (!altItems?.length) return true;
                if (altItems.filter(c => !!c).length === c.added_kwipment_expiration?.filter(c => !!c)?.length) return true;

                let buildcount = 0;
                let total = 0;
                let slot = 0;
                let failbuff = [] as EquipmentItem[];
                if (c.symbol === 'winn_kai_crew') {
                    console.log("Break");
                }
                for (let id of altItems) {
                    if (c.added_kwipment_expiration && c.added_kwipment_expiration[slot]) {
                        slot++;
                        continue;
                    }
                    
                    slot++;
                    if (!id) continue;
                    total++;

                    let quip = allQuipment.find(q => q.kwipment_id?.toString() === id.toString());
                    if (quip && !quip.demands) {
                        quip.demands = calcItemDemands(quip, config.context.core.items, playerItems);
                    }

                    if (quip && canBuildItem(quip)) {
                        deductItem(quip, deductHistory);
                        failbuff.push(quip);
                        buildcount++;
                    }
                    else {
                        return false;
                    }
                }
                if (total !== buildcount) {
                    for (let quip of failbuff) {
                        reverseItem(quip, deductHistory);
                    }
                }
                return total === buildcount;
            }

            const threegroups = [] as IQuestCrew[][];
            const threekeys = [] as string[];
            const seenPaths = [] as MissionChallenge[][];
            const pathSolutions = [] as PathGroup[];            

            for (let path of paths) {
                let path_key = path.map(p => p.id).join("_");
                const wpCrew = pathCrew[path_key];
                let nx = pathCrew[path_key].length;
                let unique = [ ... new Set(pathCrew[path_key].map(c => c.id)) ];
                let combos = [] as number[][];
                
                combos = findAllCombos(wpCrew, path);

                let cbs = combos;
                combos = cbs
                    .filter(f => f.length === 3)
                    .filter((num) => {
                        let cr = pathCrew[path_key].find(c => c.id === num[0]);
                        if (cr) {
                            return cr.challenges?.some(ch => ch.challenge.id === path[0].id)
                        }
                        return false;
                    });
                
                combos = combos.concat(cbs
                    .filter(f => f.length === 3)
                    .filter((num) => {
                        let cr = pathCrew[path_key].find(c => c.id === num[0]);
                        if (cr) {
                            return cr.challenges?.some(ch => ch.challenge.id === path[path.length - 1].id)
                        }
                        return false;
                    }));
                
                let complete = 'full' as ThreeSolveResult;
                let numbers = combos.filter ((num) => {
                    return path.every((ch) => {
                        return ignoreChallenges.includes(ch.id) || pathCrew[path_key].filter(pc => num.includes(pc.id)).some(c => c.challenges?.some(chc => chc.challenge.id === ch.id));                        
                    });
                });

                if (!numbers.length || config.includePartials) {
                    if (!numbers?.length) {
                        complete = 'partial';
                    }

                    numbers = numbers.concat(combos.filter ((num) => {
                        let d = 0;
                        
                        path.forEach((ch) => {
                            let b = ignoreChallenges.includes(ch.id) || pathCrew[path_key].filter(pc => num.includes(pc.id)).some(c => c.challenges?.some(chc => chc.challenge.id === ch.id));
                            if (b) d++;
                            return b;
                        });
                        
                        let ps = d >= path.length - 1;
                        ps &&= pathCrew[path_key].filter(pc => num.includes(pc.id)).some(c => c.challenges?.some(chc => chc.challenge.id === path[path.length - 1].id))
                        
                        return ps;
                    }));

                    if (!numbers?.length) numbers = numbers.concat(combos.filter ((num) => {
                        let d = 0;
                        
                        path.forEach((ch) => {
                            let b = ignoreChallenges.includes(ch.id) || pathCrew[path_key].filter(pc => num.includes(pc.id)).some(c => c.challenges?.some(chc => chc.challenge.id === ch.id));
                            if (b) d++;
                            return b;
                        });
                        
                        let ps = d > 0;
                        ps &&= pathCrew[path_key].filter(pc => num.includes(pc.id)).some(c => c.challenges?.some(chc => chc.challenge.id === path[path.length - 1].id))
                        
                        return ps;
                    }));

                    if (!numbers?.length) {
                        complete = 'none';
                    }
                    else {

                    }
                }

                solveChains[path_key] = numbers;    
                nx = numbers.length;

                for (let i = 0; i < nx; i++) {
                    let threeCrew = wpCrew.filter(cf => numbers[i].includes(cf.id));
                    let testcrew = threeCrew;

                    if (testcrew) {
                        const tg = testcrew;
                        tg.sort((a, b) => a.id - b.id);
                        let crews_key = tg.map(c => c.id.toString()).join("_") + path_key;
                        if (!threekeys.includes(crews_key)) {
                            threegroups.push(tg);
                            threekeys.push(crews_key);                            
                            
                            tg.forEach((c) => {
                                let nc = JSON.parse(JSON.stringify(c)) as IQuestCrew;
                                // let added_key = makeAddedKey(c, path_key);
                                c.associated_paths ??= [];
                                // let adquip = added[added_key].filter(f => true).map(sym => Number.parseInt(allQuipment.find(q => q.symbol === sym)?.kwipment_id as string)) as number[];

                                if (!c.associated_paths.find(ap => ap.path === path_key)) {
                                    let sk = {} as BaseSkills;
                                    Object.keys(nc.skills).forEach((skill) => {
                                        sk[skill] = {
                                            core: nc[skill].core,
                                            range_min: nc[skill].min,
                                            range_max: nc[skill].max,
                                            skill
                                        }
                                    });

                                    c.associated_paths.push({
                                        path: path_key,
                                        needed_kwipment: c.challenges ? c.challenges[0].kwipment : [],
                                        skills: sk                                        
                                    });
                                }
                            });

                            let pass = true;

                            if (config.buildableOnly && typeof tg !== 'boolean') {
                                pass = false;
                                const tghist = {} as { [key: string]: boolean[] };
                                const pretendItems = allQuipment
                                    .filter((quip) => {
                                        return tg.some(c => c.associated_paths?.some(pt => pt.path === path_key && quip.kwipment_id && pt.needed_kwipment?.includes(Number.parseInt(quip.kwipment_id as string))))
                                    })
                                    .map((quip) => {
                                        return { ... quip, demands: calcItemDemands(quip, config.context.core.items, playerItems) }
                                    });    
                                
                                let tc = tg.filter((c) => buildQuipment(c, pretendItems, tghist, c.associated_paths?.find(fp => fp.path === path_key)?.needed_kwipment));
                                pass = tc.length === tg.filter(c => c.challenges?.some(gch => path.includes(gch.challenge)))?.length;
                            }
                            
                            if (pass) {
                                if (!seenPaths.includes(path)) {
                                    seenPaths.push(path);
                                }
                                
                                pathSolutions.push({
                                    path: path_key,
                                    crew: tg,
                                    mastery: config.mastery,
                                    completeness: complete
                                });
                            }
                        }
                    }
                }

                if (pathSolutions.some(p => p.path === path_key && p.completeness === 'full')) {
                    if (!config.includePartials) break;
                }
            }
        
            const flatCrew = pathSolutions.map(p => p.crew).flat();

            crew = roster.map((c, idx) => {
                let crew = c as IQuestCrew;
                let finds = flatCrew.filter(f => f.id === c.id);

                if (!finds.length) {
                    delete c["challenges"];
                    delete c["associated_paths"];
                    return c as IQuestCrew;
                }

                crew.associated_paths = [];
                crew.challenges = [];
                
                for (let found of finds) {
                    for (let assoc of found.associated_paths ?? []) {
                        if (!crew.associated_paths.some(p => p.path === assoc.path)) {
                            crew.associated_paths.push(assoc);                            
                        }                                                
                    }
                    
                    if (found.challenges?.length) {
                        for (let ch of found.challenges) {                            
                            if (!crew.challenges.some(chc => JSON.stringify(ch) === JSON.stringify(chc))) {
                                crew.challenges.push(ch);
                            }
                        }
                    }
                }

                return crew;
            })
            .filter(c => !!c.associated_paths?.length || !!c.challenges?.length)
            .sort((a, b) => {
                let r = 0;

                if (!r && a.associated_paths && b.associated_paths) {
                    r = b.associated_paths.length - a.associated_paths.length;                    
                }
                if (!r && a.challenges && b.challenges) {
                    r = b.challenges.length - a.challenges.length;
                }
                if (!r) {
                    let aidx = flatCrew.findIndex(c => c.id === a.id);
                    let bidx = flatCrew.findIndex(c => c.id === b.id);
                    r = aidx - bidx;
                }
                return r;

            });

            crew.forEach((c, idx) => {
                c.score = idx + 1;
                Object.keys(c.skills).forEach((skill) => {
                    c.skills[skill].core = c[skill].core;
                    c.skills[skill].range_max = c[skill].max;
                    c.skills[skill].range_min = c[skill].min;
                });
            });

            let finalpss = [ ... pathSolutions ];

            if (!config.includePartials) {
                for (let p of paths) {
                    let key = p.map(ch => ch.id).join("_");
                    let pss = finalpss.filter(pf => pf.completeness === 'full' && pf.path === key);
                    if (pss.length) {
                        finalpss = finalpss.filter(pf => pf.path !== key).concat(pss);
                    }
                }
            }
            
            let brokenPathSeen = {} as { [key: string]: boolean };
            
            finalpss.forEach((a, idx) => {
                let asp = a.path.split("_") ?? [];
                let apath = asp.map(p => a.crew.filter(pf => pf.challenges?.some(cf => cf.challenge.id.toString() === p)).length).join("_");
                asp = apath.split("_");
                if (asp.includes("0")) {
                    brokenPathSeen[apath] = false;
                }
            });

            finalpss?.sort((a, b) => {                                
                let ar = 0;
                let br = 0;                
                let r = 0; 

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

            if (Object.keys(brokenPathSeen)?.length) {
                let tpss = [] as PathGroup[];
                finalpss.forEach((a, idx) => {
                    let asp = a.path.split("_") ?? [];
                    let apath = asp.map(p => a.crew.filter(pf => pf.challenges?.some(cf => cf.challenge.id.toString() === p)).length).join("_");
                    if (!brokenPathSeen[apath]) {
                        tpss.push(a);
                        brokenPathSeen[apath] = true;
                    }
                });
                finalpss = tpss.concat(finalpss.filter(f => !tpss.includes(f)));
            }

            let seen = [ ...new Set(finalpss.map(ps => ps.crew.map(cr => cr.challenges?.map(crc => crc.challenge.id)?.flat() ?? [])?.flat()).flat()) ];
            let failed = challenges.filter(ch => !seen.includes(ch.id) && !ignoreChallenges.includes(ch.id)).map(ch => ch.id);
            let partial = finalpss.every(p => p.completeness !== 'full');

            resolve({
                status: true,
                fulfilled: !failed.length && finalpss.length >= paths.length,
                paths: finalpss,
                crew,
                failed: failed,
                pathspartial: partial
            });
        });
    },

}

export default QuestSolver;