import CONFIG from "../components/CONFIG";
import { ComputedBuff, CrewMember } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { Jackpot, MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { IQuestCrew, PathGroup, QuestSolverConfig, QuestSolverResult } from "../model/worker";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, canBuildItem, deductDemands, reverseDeduction } from "../utils/equipment";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo, addItemBonus } from "../utils/itemutils";
import { arrayIntersect } from "../utils/misc";
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

export function getTraits<T extends CrewMember>(crew: T, traits: MissionTraitBonus[]) {
    if (!traits.length) return [];

    let intersect = arrayIntersect(crew.traits.concat(crew.traits_hidden), (traits as MissionTraitBonus[]).map(t => t.trait));
    return traits.filter(f => intersect.includes(f.trait));
}

const QuestSolver = {

    solveQuest: (config: QuestSolverConfig) => {

        const quest = config.quest;

        function qbitsToSlots(q_bits: number | undefined) {
            // 100/250/500/1300
            q_bits ??= 0;
            if (q_bits < 100) return 0;
            else if (q_bits < 200) return 1;
            else if (q_bits < 500) return 2;
            else if (q_bits < 1300) return 3;
            return 4;
        }

        const added = {} as { [key: string]: string[] };

        const playerItems = JSON.parse(JSON.stringify(config.context.player.playerData.player.character.items)) as PlayerEquipmentItem[];
        const allQuipment = JSON.parse(JSON.stringify(config.context.core.items.filter(f => f.type === 14))) as EquipmentItem[];

        const deductHistory = {} as { [key: string]: boolean[] };

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

        function anyThree(crew: IQuestCrew[], path: MissionChallenge[], startIndex?: number) {
            startIndex ??= 0;
            if (startIndex > (crew.length - 3)) return false;

            const solved = [] as MissionChallenge[];
            const solveCrew = [] as IQuestCrew[];

            let wcrew = crew.slice(startIndex);

            for (let ch of path) {
                for (let c of wcrew) {
                    if (c.challenges?.some(chc => chc.challenge.id == ch.id)) {
                        if (!solved.includes(ch)) solved.push(ch);
                        if (!solveCrew.includes(c)) {
                            solveCrew.push(c);
                        }
                        break;
                    }
                }
            }

            if (path.every(p => solved.includes(p)) && solveCrew.length < 3) {
                for (let c of crew) {
                    if (!solveCrew.includes(c)) {
                        solveCrew.push(c);
                        break;
                    }
                }
            }
            if (path.every(p => solved.includes(p)) && solveCrew.length <= 3) return solveCrew;
            return false;
        }

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, traits?: MissionTraitBonus[]) {

            const useTraits = traits ?? challenge.trait_bonuses ?? [];
            let questcrew = [] as IQuestCrew[];
            let claimf = 1;

            if (!config.alwaysCrit && quest && quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
                claimf = ((quest.mastery_levels[mastery].jackpots as Jackpot[]).find(f => f.id === challenge.id)?.claimed ?? false) ? 0 : 1;
            }

            questcrew = roster.filter(c =>
                (challenge.skill in c.skills) && (!config.qpOnly || c.q_bits >= 100))
                .sort((a, b) => {
                    let ba = a[challenge.skill].core + a[challenge.skill].min;
                    let bb = b[challenge.skill].core + b[challenge.skill].min;

                    for (let trait of useTraits) {
                        if (a.traits.includes(trait.trait) || a.traits_hidden.includes(trait.trait)) {
                            ba += trait.bonuses[mastery];
                        }
                        if (b.traits.includes(trait.trait) || b.traits_hidden.includes(trait.trait)) {
                            bb += trait.bonuses[mastery];
                        }
                    }

                    return bb - ba;
                })
                .map(c => c as IQuestCrew);

            let qpass = questcrew.filter((crew) => {
                if (crew.symbol === 'dsc_jvini_crew') {
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

                let cfactor = 0;
                if (crew.challenges?.length && crew.challenges[crew.challenges.length - 1].challenge.children.includes(challenge.id)) {
                    cfactor = 0.20;
                }

                cpmin -= (cfactor * cpmin);
                cpmax -= (cfactor * cpmax);

                cpmin += tpower;
                cpmax += tpower;

                crew.metasort ??= 0;
                if (config.includeCurrentQp && (!crew.added_kwipment || !(crew.symbol in added))) {
                    crew.added_kwipment = crew.kwipment.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                    crew.added_kwipment_expiration = crew.kwipment_expiration.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                    added[crew.symbol] = crew.added_kwipment.map(n => {
                        if (!n) return "";
                        let item = allQuipment.find(f => f.kwipment_id?.toString() === n.toString());
                        if (item) return item.symbol;
                        return "";
                    });
                }
                else {
                    crew.added_kwipment ??= [0, 0, 0, 0];
                    crew.added_kwipment_expiration ??= [0, 0, 0, 0];
                    added[crew.symbol] ??= ['', '', '', ''];
                }

                const currslots = added[crew.symbol].filter(a => !!a && a != '');
                const slots = [] as string[];
                const quips = {} as { [key: string]: ItemBonusInfo };
                const solvePower = (challenge.difficulty_by_mastery[mastery] + (claimf * [250, 275, 300][mastery]));
                let maxsolve = false;

                while (cpmin <= solvePower) {
                    if (!nslots || (1 + slots.length + currslots.length > nslots)) {
                        if (cpmax >= solvePower) {
                            maxsolve = true;
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
                        .filter((item) => !slots.includes(item.symbol) && !currslots?.includes(item.symbol))
                        .map((qp) => {
                            return { item: qp, bonusInfo: getItemBonuses(qp) }
                        })
                        .filter((qp) => challenge.skill in qp.bonusInfo.bonuses)
                        .sort((a, b) => {
                            let r = 0;

                            if (config.cheapestFirst) {
                                let ac = a.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
                                let bc = b.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
                                r = ac - bc;
                                if (r) return r;
                            }

                            let an = Object.values(a.bonusInfo.bonuses).map(v => v.core + v.range_max + v.range_min).reduce((p, n) => p + n, 0);
                            let bn = Object.values(b.bonusInfo.bonuses).map(v => v.core + v.range_max + v.range_min).reduce((p, n) => p + n, 0);
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
                        qpower -= (cfactor * qpower);
                        mpower -= (cfactor * mpower);

                        cpmin += qpower;
                        cpmax += qpower;

                        quips[qps[0].item.symbol] = qps[0].bonusInfo;
                        slots.push(qps[0].item.symbol);
                    }
                    else {
                        return false;
                    }
                }

                if (!crew.challenges.some(ch => ch.challenge.id === challenge.id)) {
                    crew.challenges.push({
                        challenge,
                        skills: {},
                        trait_bonuses: ttraits,
                        power_decrease: cfactor,
                        max_solve: maxsolve
                    });
                }

                crew.metasort += cpmin;

                if (slots.length) {
                    
                    Object.entries(quips).forEach(([symbol, qp]) => {
                        addItemBonus(crew, qp, challenge.skill);
                    });

                    let j = 0;
                    for (let i = 0; i < 4; i++) {
                        if (added[crew.symbol][i] === '' || added[crew.symbol][i] === undefined) {
                            added[crew.symbol][i] = slots[j++];
                        }
                    }
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
                    paths: []
                });
                return;
            }

            const resetCrew = (crew: IQuestCrew) => {
                delete crew.metasort;
                delete crew.added_kwipment;
                delete crew.added_kwipment_expiration;
                delete crew.challenges;
                delete added[crew.symbol];
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
                .filter(f => !ephemeral?.activeCrew?.some(c => c.symbol === f.symbol) || !idleOnly)
                .filter(f => !!f.immortal && ((f.immortal === -1) || considerFrozen))
                .map((crew) => {

                    crew = JSON.parse(JSON.stringify(crew));
                    let ac = ephemeral?.activeCrew?.find(c => c.symbol === crew.symbol);
                    if (ac?.active_status) {
                        crew.active_status = ac.active_status;
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
                    paths: []
                });
                return;
            }

            const challenges = config.challenges?.length ? config.challenges : (config.quest?.challenges ?? []);

            const map = makeNavMap(challenges);
            const paths = getNodePaths(map[0], map).map(p => p.ids.map(id => challenges.find(f => f.id === id))) as MissionChallenge[][];

            let crew = [] as IQuestCrew[];

            challenges.sort((a, b) => a.id - b.id);

            const processChallenge = (ch: MissionChallenge, roster: PlayerCrew[], crew: IQuestCrew[]) => {
                roster.sort((a, b) => {
                    let ask = ch.skill in a.skills;
                    let bsk = ch.skill in b.skills;
                    if (ask != bsk) {
                        if (ask) return -1;
                        else return 1;
                    }

                    let ac = ch.trait_bonuses?.filter(t => a.traits.concat(a.traits_hidden).includes(t.trait))?.length ?? 0;
                    let bc = ch.trait_bonuses?.filter(t => b.traits.concat(b.traits_hidden).includes(t.trait))?.length ?? 0;

                    return bc - ac;
                });

                let chcrew = solveChallenge(roster, ch, config.mastery);

                if (chcrew?.length) {
                    // dupes are a thing, so identical symbols are okay, identical object references are not.

                    crew = crew.filter(c => !chcrew.includes(c));
                    crew = crew.concat(chcrew);
                    crew = [... new Set(crew)];
                }

                return crew.sort((a, b) => {
                    let r = 0;

                    let lax = newQuip(a);
                    let lbx = newQuip(b);
                    r = lax - lbx;
                    if (r) return r;

                    r = b.q_bits - a.q_bits;
                    return r;

                });
            }

            for (let ch of challenges) {
                crew = processChallenge(ch, roster, crew);
            }

            if (!challenges.every(ch => crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)))) {
                let retest = challenges.filter(ch => !crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)));

                for (let fch of retest) {
                    let eligCrew = crew.filter(f => fch.skill in f.base_skills && f.challenges && f.challenges.some(ft => ft.challenge.skill === fch.skill));
                    if (!eligCrew?.length) {
                        eligCrew = crew.filter(f => fch.skill in f.base_skills);
                    }
                    if (!eligCrew?.length) {
                        eligCrew = roster.filter(f => fch.skill in f.base_skills);
                        eligCrew?.forEach((c) => {
                            if (!crew.some(c2 => c2.symbol === c.symbol)) {
                                crew.push(c);
                            }
                        });
                    }
                    if (!eligCrew?.length) continue;
                    let ci = 0;

                    while (ci < eligCrew.length && !crew.some(c => c.challenges?.some(chc => chc.challenge.id === fch.id))) {
                        let mfind = crew.findIndex(c => c.symbol === eligCrew[ci].symbol);
                        if (mfind !== -1) {
                            eligCrew[ci] = JSON.parse(JSON.stringify(eligCrew[ci]));
                            eligCrew[ci].date_added = new Date(eligCrew[ci].date_added);
                            let oldAdded = added[eligCrew[ci].symbol];
                            crew = processChallenge(fch, eligCrew, crew);
                            if (!eligCrew[ci].challenges?.length) {
                                resetCrew(eligCrew[ci]);
                                crew = processChallenge(fch, eligCrew, crew);
                            }
                            if (!eligCrew[ci].challenges?.some(chc => chc.challenge.id === fch.id)) {
                                eligCrew[ci] = crew[mfind];
                                added[eligCrew[ci].symbol] = oldAdded;
                            }
                            else {
                                crew[mfind] = eligCrew[ci];
                            }
                        }
                        ci++;
                    }
                }
            }

            crew = crew
                .filter(c => !!c.challenges?.length)
                .sort((a, b) => {
                    let r = 0;

                    let ca = 0;
                    let cb = 0;

                    ca = a.challenges?.length ?? 0;
                    cb = b.challenges?.length ?? 0;
                    r = cb - ca;
                    if (r) return r;

                    ca = newQuip(a);
                    cb = newQuip(b);
                    r = ca - cb;
                    return r;
                });

            let chfill = [] as IQuestCrew[];
            challenges.forEach((challenge) => {
                for (let c of crew) {
                    if (c.challenges?.some(ch => ch.challenge.id === challenge.id)) {
                        if (chfill.findIndex(tc => tc.symbol === c.symbol) === -1) {
                            chfill.push(c);
                        }
                        break;
                    }
                }
            });

            crew = chfill.concat(crew.filter(f => !chfill.some(chf => chf.symbol === f.symbol)));

        

            crew.forEach((c, idx) => {
                c.score = idx + 1;
                const slots = added[c.symbol];
                if (slots?.length) {
                    c.added_kwipment = slots.map((symbol, idx) => {
                        let item = allQuipment.find(f => f.symbol === symbol);
                        if (typeof item?.kwipment_id === 'string') {
                            return Number.parseInt(item.kwipment_id);
                        }
                        else if (typeof item?.kwipment_id === 'number') {
                            return item.kwipment_id;
                        }
                        else {
                            return 0;
                        }
                    });

                    c.added_kwipment_key = c.added_kwipment?.map((quip) => {
                        let f = allQuipment.find(i => i.kwipment_id?.toString() === quip.toString());
                        if (f) {
                            let bonuses = getItemBonuses(f);
                            return Object.values(bonuses.bonuses).map((b) => {
                                return `${b.core + b.range_max + b.range_min}_${b.skill}`
                            }).join("_");
                        }
                        return '';
                    }).join("_");
                    c.challenge_key = c.challenges?.map(ch => `${ch.challenge.id.toString()}_${ch.challenge.skill}`).join("_");
                }

                Object.keys(c.skills).forEach((skill) => {
                    c.skills[skill].core = c[skill].core;
                    c.skills[skill].range_max = c[skill].max;
                    c.skills[skill].range_min = c[skill].min;
                });
                // if (c.symbol === 'winn_kai_crew') {
                //     console.log("break");
                // }
                c.challenges?.forEach((ch, idx) => {
                    Object.keys(c.skills).forEach((skill) => {
                        let core = c.skills[skill].core;
                        let max = c.skills[skill].range_max;
                        let min = c.skills[skill].range_min;

                        core -= Math.round(core * (ch.power_decrease ?? 0));
                        max -= Math.round(max * (ch.power_decrease ?? 0));
                        min -= Math.round(min * (ch.power_decrease ?? 0));
                        ch.skills[skill] = {
                            core,
                            range_min: min,
                            range_max: max,
                            skill
                        };
                    });
                });
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

            for (let i = 0; i < crew.length; i++) {
                for (let path of paths) {
                    let testcrew = anyThree(crew, path, i);

                    if (testcrew) {
                        const tg = testcrew;
                        tg.sort((a, b) => a.symbol.localeCompare(b.symbol));
                        let key = tg.map(c => c.symbol).join("_");
                        if (!threekeys.includes(key)) {
                            threegroups.push(tg);
                            threekeys.push(key);
                            
                            let pathstr = path.map(p => p.id).join("_");

                            tg.forEach((c) => {

                                c.associated_paths ??= [];
                                let added = c.added_kwipment?.filter((q, idx) => c.added_kwipment_expiration && !c.added_kwipment_expiration[idx]) as number[];

                                if (c.added_kwipment?.some(q => !!q) && c.added_kwipment_expiration?.some(q => !!q)) {
                                    let nc = JSON.parse(JSON.stringify(c)) as IQuestCrew;
                                    resetCrew(nc);

                                    for (let ch of path) {
                                        if (c.challenges?.some(cc => cc.challenge.id === ch.id)) {
                                            let ca = [nc];
                                            ca = processChallenge(ch, ca, ca);
                                        }
                                    }

                                    added = nc.added_kwipment as number[];
                                }

                                if (!c.associated_paths.find(ap => ap.path === pathstr)) {
                                    c.associated_paths.push({
                                        path: pathstr,
                                        needed_kwipment: added
                                    });
                                }
                            });

                            let pass = true;

                            if (config.buildableOnly && typeof tg !== 'boolean') {
                                pass = false;
                                const tghist = {} as { [key: string]: boolean[] };
                                const pretendItems = allQuipment
                                    .filter((quip) => {
                                        return tg.some(c => c.associated_paths?.some(pt => pt.path === pathstr && quip.kwipment_id && pt.needed_kwipment?.includes(Number.parseInt(quip.kwipment_id as string))))
                                    })
                                    .map((quip) => {
                                        return { ... quip, demands: calcItemDemands(quip, config.context.core.items, playerItems) }
                                    });    
                                
                                let tc = tg.filter((c) => buildQuipment(c, pretendItems, tghist, c.associated_paths?.find(fp => fp.path === pathstr)?.needed_kwipment));
                                pass = tc.length === tg.filter(c => c.challenges?.some(gch => path.includes(gch.challenge)))?.length;
                            }

                            if (pass) {
                                if (!seenPaths.includes(path)) {
                                    seenPaths.push(path);
                                }
                                
                                pathSolutions.push({
                                    path: pathstr,
                                    crew: tg,
                                    mastery: config.mastery
                                });
                            }
                        }
                    }
                }
            }

            if (config.buildableOnly) {
                crew = crew.filter((c) => buildQuipment(c, allQuipment, deductHistory));
            }

            if (!pathSolutions.length && challenges.every(ch => crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)))) {
                let rpaths = [ ... new Set(crew.map(c => c.associated_paths ?? []).flat()) ];
                let rchallenges = [ ... new Set(crew.map(c => c.challenges ?? []).flat()) ];

                for (let path of rpaths) {
                    let ci = path.path.split("_").map(d => rchallenges.find(e => e.challenge.id.toString() === d)?.challenge) as MissionChallenge[];
                    let rcrew = anyThree(crew, ci)
                    if (rcrew) {
                        if (!pathSolutions.some(ps => ps.path === path.path)) {
                            pathSolutions.push({
                                path: path.path,
                                crew: rcrew,
                                mastery: config.mastery
                            })
                        }
                    }
                }
            }
            else {
                crew = [ ... new Set(crew.concat([...pathSolutions.map(ps => ps.crew).flat()])) ];
            }
         
            crew.forEach((c, idx) => c.score = idx + 1);
            pathSolutions?.sort((a, b) => {
                let ar = a.crew.map(c => c.score ?? 0).reduce((p, n) => p + n, 0);
                let br = b.crew.map(c => c.score ?? 0).reduce((p, n) => p + n, 0);
                return ar - br;
            });

            let seen = [ ...new Set(pathSolutions.map(ps => ps.path.split("_")).flat().map(s => Number.parseInt(s))) ];
            let failed = challenges.filter(ch => !seen.includes(ch.id)).map(ch => ch.id);

            resolve({
                status: true,
                fulfilled: !failed.length,
                paths: pathSolutions,
                crew,
                failed: failed
            });
        });
    },

}

export default QuestSolver;