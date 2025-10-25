import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedSkill, CrewMember, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Jackpot, MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { IQuestCrew, PathGroup, QuestSolverConfig, QuestSolverResult, ThreeSolveResult } from "../model/worker";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, canBuildItem, deductDemands, reverseDeduction } from "../utils/equipment";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo, addItemBonus, checkReward, ItemWithBonus, sortItemsWithBonus, getItemWithBonus } from "../utils/itemutils";
import { applyCrewBuffs } from "./betatachyon";

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

function makeSmartCombos(source: IQuestCrew[], path: MissionChallenge[], maxSolves?: number, required?: number[]) {
    maxSolves ??= 10;
    let c = source.length;
    let counts = {} as { [key: string]: number };
    let combos = [] as IQuestCrew[][];
    let last = path[path.length - 1];
    for (let i = 0; i < c; i++) {
        for (let j = 0; j < c; j++) {
            for (let k = 0; k < c; k++) {
                if (j === i || j === k || k === i) continue;
                let newcombo = [source[i], source[j], source[k]];
                if (required?.length && !required.every(r => newcombo.some(c => c.id === r))) continue;

                if (newcombo.some(n => n.challenges?.some(c => c.challenge.id === last.id))) {
                    let cbs = [... new Set(newcombo.map(n => n.challenges?.map(c => c.challenge?.id ?? -1) ?? []).flat()) ].sort();
                    let key = cbs.join("_");
                    counts[key] ??= 0;
                    if (counts[key] < maxSolves || newcombo.every(nc => nc.challenges?.some(ncc => cbs.includes(ncc.challenge.id) && !ncc.max_solve))) {
                        combos.push(newcombo);
                        counts[key]++;
                    }
                    else if (newcombo.every(nc => nc.challenges?.some(ncc => cbs.includes(ncc.challenge.id) && !ncc.max_solve))) {
                        combos.unshift(newcombo);
                        counts[key]++;
                    }
                }
            }
        }
    }

    return combos.map(c => c.map(d => d.id));
}

const skillSum = (crew: IQuestCrew, skill?: string): number => {
    if (skill) {
        return crew[skill].core + crew[skill].max + crew[skill].min;
    }
    else {
        let sko = crew.skill_order;
        return sko.map(sk => crew[sk].core + crew[sk].min + crew[sk].max).reduce((p: number, n: number) => p + n, 0);
    }
}


export function findAllCombos(crew: IQuestCrew[], path: MissionChallenge[], required?: number[]) {

    crew = [...crew].sort((a, b) => {
        let askill = a.skill_order;
        let bskill = b.skill_order;
        if (askill[0] === bskill[0]) {
            return -1 * (skillSum(a, askill[0]) - skillSum(b, bskill[0]));
        }
        else {
            return -1 * (skillSum(a) - skillSum(b));
        }
    });

    let mk = makeSmartCombos(crew, path, 100, required);
    mk = mk.filter(m => m.length === 3);
    let c = crew.length;
    let d = path.length;
    let i = 0;
    let protosolves = [] as IQuestCrew[][];
    let q = 0;

    crew = crew.sort((a, b) => {
        return (b.challenges?.length ?? 0) - (a.challenges?.length ?? 0);
    });

    c = mk.length;
    for (i = 0; i < c; i++) {
        let mcrew = mk[i].map(num => crew.find(f => f.id === num) as IQuestCrew);
        let n = 0;

        for (n = 0; n < d; n++) {
            let ch = path[n];
            for (let j = 0; j < 3; j++) {
                let wc = mcrew[j];
                if (wc.challenges?.some(wch => wch.challenge.id === ch.id)) {
                    if (protosolves.length === q) {
                        protosolves.push([]);
                    }
                    if (!protosolves[q].some(pc => pc.challenges?.some(pch => pch.challenge.id === ch.id)) || (n > 0 && path[n - 1].skill === ch.skill)) {
                        if (!protosolves[q].includes(wc)) {
                            protosolves[q].push(wc);
                        }
                    }
                }
            }
        }
        q++;
    }

    return Object.values(protosolves).map(c => c.map(d => d.id));
}

export function getTraits<T extends CrewMember>(crew: T, traits: MissionTraitBonus[]) {
    return traits.filter(f => crew.traits.includes(f.trait) || crew.traits_hidden.includes(f.trait));
}

export function gradeCrew(crew: IQuestCrew, ch: number) {
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

        const playerItems = structuredClone(config.context.player.playerData.player.character.items) as PlayerEquipmentItem[];
        const allQuipment = structuredClone(config.context.core.items.filter(f => f.type === 14)) as EquipmentItem[];

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

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, path: string, traits?: MissionTraitBonus[], maxIsGood?: boolean, lastChallenge?: MissionChallenge) {
            const useTraits = config.noTraitBonus ? [] : (traits ?? challenge.trait_bonuses ?? []);
            let questcrew = [] as IQuestCrew[];
            let critmult = 1;

            if (config.ignoreChallenges?.includes(challenge.id)) return [];

            if (!config.alwaysCrit && quest && quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
                critmult = (!!(quest.mastery_levels[mastery].jackpots as Jackpot[]).find(f => f.id === challenge.id && (f.claimed && f.can_reclaim))) ? 0 : 1;
            }

            questcrew = roster.filter(c =>
                (challenge.skill in c.skills) && (!config.qpOnly || c.q_bits >= 100))
                .map(c => c as IQuestCrew);

            questcrew = standardSort(questcrew, challenge, mastery, traits);

            let qpass = questcrew.filter((crew) => {
                const nslots = (!!config.ignoreQpConstraint || crew.immortal > 0) ? 4 : qbitsToSlots(crew.q_bits);

                crew.challenges ??= [];
                let cpmin = crew[challenge.skill].core + crew[challenge.skill].min;
                let cpmax = crew[challenge.skill].core + crew[challenge.skill].max;

                let ttraits = getTraits(crew, useTraits);

                let tpower = ttraits
                    .map((t => t.bonuses[mastery]))
                    .reduce((p, n) => p + n, 0);

                const fatigue = lastChallenge && (lastChallenge.skill === challenge.skill) && crew.challenges?.some(ch => ch.challenge === lastChallenge);

                if (fatigue) {
                    cpmin -= (cpmin * 0.2);
                    cpmax -= (cpmax * 0.2);
                }

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
                const solvePower = (challenge.difficulty_by_mastery[mastery] + (critmult * [150, 275, 300][mastery]));

                while (cpmin < solvePower && (!maxIsGood || cpmax < solvePower)) {
                    if (!nslots || (1 + usedSlots + slots.length > nslots)) {

                        cpmax += tpower;
                        if (cpmin >= solvePower) {
                            break;
                        }
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
                            if (!qp.demands) {
                                qp.demands = calcItemDemands(qp, config.context.core.items, playerItems)
                            }
                            return getItemWithBonus(qp);
                        })
                        .filter((qp) => challenge.skill in qp.bonusInfo.bonuses);

                    if (config.cheapestFirst) {
                        qps = sortItemsWithBonus(qps, true, challenge.skill);
                    }
                    else {
                        qps = sortItemsWithBonus(qps, false, challenge.skill, -1);
                    }

                    if (qps?.length) {
                        let q_power = qps[0].bonusInfo.bonuses[challenge.skill].core + qps[0].bonusInfo.bonuses[challenge.skill].range_min;
                        let mpower = qps[0].bonusInfo.bonuses[challenge.skill].core + qps[0].bonusInfo.bonuses[challenge.skill].range_max;

                        if (fatigue) {
                            q_power -= (q_power * 0.2);
                            mpower -= (mpower * 0.2);
                        }

                        cpmin += q_power;
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
                        power_decrease: fatigue ? 0.20 : 0,
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
                        crew.skills = { ...structuredClone(crew.base_skills) };
                    }
                    applyCrewBuffs(crew, config.buffs);
                }
                else {
                    for (let skill of crew.skill_order) {
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
                    crew = structuredClone(crew);

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
                        crew.skills = structuredClone(crew.base_skills);
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

            const processChallenge = (ch: MissionChallenge, roster: PlayerCrew[], crew: IQuestCrew[], path: string, maxIsGood?: boolean, lastChallenge?: MissionChallenge) => {

                let chcrew = solveChallenge(roster, ch, config.mastery, path, undefined, maxIsGood, lastChallenge);

                if (chcrew?.length) {
                    crew = crew.filter(c => !chcrew.includes(c));
                    crew = crew.concat(chcrew);
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

                tempRoster = structuredClone(roster);

                let lastChallenge = undefined as MissionChallenge | undefined;
                let pcrew = [] as IQuestCrew[];

                for (let ch of path) {
                    pcrew = processChallenge(ch, tempRoster, pcrew, key, false, lastChallenge);
                    if (!pcrew.some(pc => pc.challenges?.some(chc => chc.challenge.id === ch.id))) {
                        pcrew = processChallenge(ch, tempRoster, pcrew, key, true);
                    }

                    lastChallenge = ch;
                }
                if (config.buildableOnly) {
                    pcrew = pcrew.filter((crew) => {
                        // if (crew.symbol === "winn_kai_crew") {
                        //     console.log("Break here.")
                        // }
                        let aq = crew.added_kwipment ?? [0,0,0,0];
                        let aqn = crew.added_kwipment_expiration ?? [0,0,0,0];
                        let n = aq.length;
                        let cb = true;
                        for (let i = 0; i < n; i++) {
                            if (aqn[i] !== 0 || !aq[i]) continue;
                            let qp = allQuipment.find((f) => f.kwipment_id === aq[i].toString());
                            if (qp) {
                                qp = { ...qp, demands: calcItemDemands(qp, config.context.core.items, config.context.player.playerData.player.character.items) };
                                if (!qp.demands) qp.demands = calcItemDemands(qp, config.context.core.items, config.context.player.playerData.player.character.items);
                                if (!canBuildItem(qp, true)) {
                                    cb = false;
                                    break;
                                }
                            }
                        }
                        return cb;
                    });
                }
                pathCrew[key] = pcrew;
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
                // if (c.symbol === "winn_kai_crew") {
                //     console.log("Break here");
                // }
                if (!altItems?.length) return true;
                if (altItems.filter(c => !!c).length === c.added_kwipment_expiration?.filter(c => !!c)?.length) return true;

                let buildcount = 0;
                let total = 0;
                let slot = 0;
                let failbuff = [] as EquipmentItem[];

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

                    if (quip && canBuildItem(quip, true)) {
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
                let combos = [] as number[][];

                combos = findAllCombos(wpCrew, path, config.requiredCrew).filter(f => f.length === 3);
                //let debug_symbols = combos.map(c => c.map(cid => wpCrew.find(f => f.id === cid)?.symbol));
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
                                let nc = structuredClone(c) as IQuestCrew;
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