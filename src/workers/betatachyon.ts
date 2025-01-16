import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedSkill, CrewMember, Skill } from "../model/crew";
import { Collection, PolestarCombo } from "../model/game-elements";
import { PlayerCrew } from "../model/player";
import { AntimatterSeatMap } from "../model/voyage";
import { BetaTachyonRunnerConfig, CiteData, SkillOrderRarity } from "../model/worker";
import { calcItemDemands } from "../utils/equipment";
import { ItemWithBonus, getItemWithBonus } from "../utils/itemutils";
import { findPolestars } from "../utils/retrieval";
import { BuffStatTable, getSkillOrderScore, getSkillOrderStats, lookupAMSeatsByTrait, SkillRarityReport } from "../utils/voyageutils";

export function applyCrewBuffs(crew: PlayerCrew | CrewMember, buffConfig: BuffStatTable, nowrite?: boolean) {
    const getMultiplier = (skill: string, stat: string) => {
        return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
    };

    for (let skill in CONFIG.SKILLS) {
        crew[skill] = { core: 0, min: 0, max: 0 };
    }
    let bs = {} as BaseSkills;
    // Apply buffs
    for (let skill in crew.base_skills) {
        let core = 0;
        let min = 0;
        let max = 0;

        core = Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core'));
        min = Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min'));
        max = Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'));

        if (nowrite !== true) {
            crew[skill] = {
                core: core,
                min: min,
                max: max,
                skill
            };
        }
        bs[skill] = {
            core: core,
            range_min: min,
            range_max: max,
            skill
        };
    }
    return bs;
}

export interface CrewSkill {
    crew: PlayerCrew | CrewMember;
    skills: ComputedSkill[];
}


const BetaTachyon = {

    scanCrew: (config: BetaTachyonRunnerConfig) => {

        const { collections, inputCrew, buffs, settings, immortalizedSymbols } = config;
        const magic = settings.magic;

        let { playerData } = config;

        return new Promise<CiteData>((resolve, reject) => {


            function isNever(crew: PlayerCrew | CrewMember) {
                let ob = crew?.obtained?.toLowerCase() ?? "Unknown";
                return (ob.includes("bossbattle") || ob.includes("honor") || ob.includes("gauntlet") || ob.includes("voyage") || ob.includes("collection"));
            }

            const skills = ["command_skill", "diplomacy_skill", "science_skill", "engineering_skill", "security_skill", "medicine_skill"];
            const voyskills = ["command", "diplomacy", "science", "engineering", "security", "medicine"];
            const skillPairs = [] as string[][];
            const skillTriplets = [] as string[][];

            const skill_reports = getSkillOrderStats({ roster: inputCrew, returnCrew: true });

            for (let s1 of skills) {
                for (let s2 of skills) {
                    if (s2 === s1) continue;
                    skillPairs.push([s1, s2]);
                }
            }

            for (let s1 of skills) {
                for (let s2 of skills) {
                    for (let s3 of skills) {
                        if (s3 === s2 || s3 === s1 || s2 === s1) continue;
                        skillTriplets.push([s1, s2, s3]);
                    }
                }
            }

            const skillScore = (skill: ComputedSkill | Skill) => {
                if (!skill?.core) return 0;
                if ("max" in skill) {
                    return skill.core + (((skill.max ?? 0) + (skill.min ?? 0)) * 0.5);
                }
                else {
                    return skill.core + (((skill.range_max ?? 0) + (skill.range_min ?? 0)) * 0.5);
                }
            }

            function getAMSeats(crew: PlayerCrew | CrewMember) {

                return crew.traits.filter(tn => lookupAMSeatsByTrait(tn).some((sk) => sk in crew && crew[sk].core));
            }

            function countSkills(crew: PlayerCrew) {
                let x = 0;
                for (let skill of skills) {
                    if (skill in crew && crew[skill].core) {
                        x++;
                    }
                }
                return x;
            }

            function getSkillOrder(crew: PlayerCrew | CrewMember, forceTwo?: boolean) {
                const sk = [] as Skill[];
                let x = 0;
                for (let skill of skills) {
                    if (skill in crew.base_skills) {
                        sk.push({ ...crew.base_skills[skill], skill: voyskills[x] });
                    }
                    x++;
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

                return forceTwo ? output.slice(0, 2) : output;
            }

            function printSkillOrder(crew: PlayerCrew | CrewMember, forceTwo?: boolean) {
                return getSkillOrder(crew, forceTwo).join("/");
            }

            function getSortedSkills(crew: PlayerCrew | CrewMember, forceTwo?: boolean) {
                const sk = [] as ComputedSkill[];
                let x = 0;
                for (let skill of skills) {
                    if (skill in crew) {
                        sk.push({ ...crew[skill], skill: voyskills[x] });
                    }
                    x++;
                }
                sk.sort((a, b) => skillScore(b) - skillScore(a));
                const output = {
                    crew: crew,
                    skills: [],
                } as CrewSkill;
                if (sk.length > 0 && sk[0].skill) {
                    output.skills.push({ ... sk[0] });
                }
                if (sk.length > 1 && sk[1].skill) {
                    output.skills.push({ ... sk[1] });
                }
                if (!forceTwo && (sk.length > 2 && sk[2].skill)) {
                    output.skills.push({ ... sk[2] });
                }

                return output;
            }

            function makeVoys(crew: PlayerCrew) {
                const ovoys = [] as string[];
                if (!crew.voyScores) return [];

                Object.keys(crew.voyScores).forEach((sk) => {
                    if (crew.voyScores && crew.voyScores[sk]) {
                        let b = sk.split("/");
                        let voy = `${b[0].replace("_skill", "")}/${b[1].replace("_skill", "")}`;
                        if (!ovoys.includes(voy)) ovoys.push(voy);
                    }
                });
                return ovoys;
            }

            const findBest = (crew: PlayerCrew[], skills: string[], top: number, forceTwo?: boolean) => {

                if (skills.length === 2 || forceTwo) {
                    const skillcrew = crew.filter(crew => skills[0] in crew && crew[skills[0]].core && skills[1] in crew && crew[skills[1]].core)
                        .sort((a, b) => {
                            return (skillScore(b[skills[0]]) + skillScore(b[skills[1]])) - (skillScore(a[skills[0]]) + skillScore(a[skills[1]]));
                        });
                    return skillcrew.slice(0, top);
                }
                else {
                    const skillcrew = crew.filter(crew => skills[0] in crew && crew[skills[0]].core && skills[1] in crew && crew[skills[1]].core && skills[2] in crew && crew[skills[2]].core)
                        .sort((a, b) => {
                            return (skillScore(b[skills[0]]) + skillScore(b[skills[1]]) + skillScore(b[skills[2]])) - (skillScore(a[skills[0]]) + skillScore(a[skills[1]]) + skillScore(a[skills[2]]));
                        });
                    return skillcrew.slice(0, top);
                }
            };

            const acc = {} as { [key: string]: CrewMember };

            const compareCrew = (crewSymbol: string, skills: string[], allCrew: CrewMember[], best: (PlayerCrew | CrewMember)[]) => {

                if (!(crewSymbol in acc)) {
                    let cfe = allCrew.find(c => c.symbol === crewSymbol);
                    if (!cfe) return -1;
                    acc[crewSymbol] = cfe;
                }

                let cf = acc[crewSymbol];
                if (!cf) return -1;
                const crew = cf;

                let core = skillScore(crew[skills[0]]) + skillScore(crew[skills[1]]) + ((skills.length > 2 && skills[2] in crew) ? skillScore(crew[skills[2]]) : 0) as number;
                if (skills.length > 2 && (!(skills[2] in crew) || !(crew[skills[2]].core))) {
                    let so = getSortedSkills(crew);
                    core += so.skills[2].core * 0.75;
                }

                let c = best.length;
                let v = -1;

                for (let i = 0; i < c; i++) {
                    let comp = skillScore(best[i][skills[0]]) + skillScore(best[i][skills[1]]) + ((skills.length > 2 && skills[2] in best[i]) ? skillScore(best[i][skills[2]]) : 0) as number;
                    if (core > comp) v = i;
                    else if (core < comp) v = i + 1;
                    else v = i;
                }

                return v;
            };

            const isImmortal = (c) => {
                return c.level === 100 && c.equipment?.length === 4 && c.rarity === c.max_rarity;
            }

            if (playerData.citeMode && playerData.citeMode.rarities?.length) {
                playerData = JSON.parse(JSON.stringify(playerData));
                playerData.player.character.crew = playerData.player.character.crew
                .filter((crew) => playerData.citeMode?.rarities?.includes(crew.max_rarity));
            }

            const getDistanceFromTop = (item: CrewMember, topCrew: { [key: string]: CrewMember | CrewMember[] }) => {
                let printedOrder = printSkillOrder(item);
                let ordered = getSortedSkills(item);
                let lvls = [] as number[]
                ordered.skills.forEach(skv => {
                    let skill = skv.skill + "_skill";
                    if (printedOrder in topCrew && "length" in topCrew[printedOrder]) {
                        lvls.push(skillScore(item[skill]) / skillScore(topCrew[printedOrder][0][skill]));
                    }
                    else {
                        lvls.push(skillScore(item[skill]) / skillScore(topCrew[skill][skill]));
                    }
                });
                return lvls.reduce((p, n) => p + n, 0) / 3;
            };

            const evalCrew = playerData?.player?.character?.crew?.filter((crew) => !isImmortal(crew) && countSkills(crew) === 3) ?? [];

            if (!evalCrew?.length) {
                resolve({
                    crewToCite: [],
                    crewToRetrieve: [],
                    crewToTrain: [],
                    skillOrderRarities: [],
                } as CiteData);
                return;
            }

            const skillbest = {} as { [key: string]: PlayerCrew[] };
            const besttrips = {} as { [key: string]: PlayerCrew[] };
            const skillout = {} as { [key: string]: PlayerCrew[] };

            let immo1 = playerData?.player?.character?.crew?.filter(c => c && isImmortal(c)) ?? [];

            const immoCrew = immo1?.length ? immo1 : playerData?.player?.character?.crew ?? [];

            skillPairs.forEach((sk) => {
                skillbest[`${sk[0]}/${sk[1]}`] = findBest(immoCrew, sk, magic);
            });

            skillTriplets.forEach((sk) => {
                besttrips[`${sk[0]}/${sk[1]}/${sk[2]}`] = findBest(immoCrew, sk, magic * 2);
            });

            const allCrew = JSON.parse(JSON.stringify(inputCrew)) as CrewMember[];
            const quipment = JSON.parse(JSON.stringify(config.coreItems.filter(f => f.type === 14).map(f => getItemWithBonus(f)))) as ItemWithBonus[];

            quipment.forEach(q => q.item.demands = calcItemDemands(q.item, config.coreItems, playerData.player.character.items));

            const topCrew = {} as { [key: string]: CrewMember };
            const skillOrderCrew = {} as { [key: string]: CrewMember[] };

            const uniqueSkillOrders = [] as string[];
            const uniqueTwoSkills = [] as string[];
            const tripleRare = [] as SkillOrderRarity[];
            const doubleRare = [] as SkillOrderRarity[];

            allCrew.forEach(ac => {
                if (!ac) return;
                ac.date_added = new Date(ac.date_added);
                applyCrewBuffs(ac, buffs);
                let csk = printSkillOrder(ac);
                let dsk = printSkillOrder(ac, true);
                if (!uniqueSkillOrders.includes(csk)) {
                    uniqueSkillOrders.push(csk);
                }
                if (!uniqueTwoSkills.includes(dsk)) {
                    uniqueTwoSkills.push(dsk);
                }

                let fo = tripleRare.find(sr => sr.skillorder === csk);
                if (!fo) {
                    tripleRare.push({
                        skillorder: csk,
                        skills: ac.skill_order,
                        rarity: 0,
                        count: 1
                    });
                }
                else {
                    fo.count++;
                }

                fo = doubleRare.find(sr => sr.skillorder === dsk);
                if (!fo) {
                    doubleRare.push({
                        skillorder: dsk,
                        skills: getSkillOrder(ac, true),
                        rarity: 0,
                        count: 1
                    });
                }
                else {
                    fo.count++;
                }
            });

            tripleRare.sort((a, b) => a.count - b.count);
            doubleRare.sort((a, b) => a.count - b.count);

            let max = tripleRare.reduce((p, n) => Math.max(p ?? 0, n?.count ?? 0), 0);
            let min = tripleRare.reduce((p, n) => Math.min(p ?? 0, n?.count ?? 0), allCrew.length);

            tripleRare.forEach((sr) => {
                sr.rarity = Math.ceil((1 - ((sr.count - min) / (max - min))) * 5);
            });

            max = doubleRare.reduce((p, n) => Math.max(p ?? 0, n?.count ?? 0), 0);
            min = doubleRare.reduce((p, n) => Math.min(p ?? 0, n?.count ?? 0), allCrew.length);

            doubleRare.forEach((sr) => {
                sr.rarity = Math.ceil((1 - ((sr.count - min) / (max - min))) * 5);
            });

            Object.keys(CONFIG.SKILLS).forEach((skill) => {
                const fcrew = allCrew.filter(fc => skill in fc && !!fc[skill].core).sort((a, b) => skillScore(b[skill]) - skillScore(a[skill]));
                if (fcrew?.length) {
                    topCrew[skill] = fcrew[0];
                }
            });

            uniqueSkillOrders.forEach((sko) => {
                const ccrew = allCrew.filter(fc => printSkillOrder(fc) === sko);
                const skills = sko.split("/").map(z => z + "_skill");
                ccrew.sort((a, b) => {
                    let askill1 = skillScore(a[skills[0]]);
                    let askill2 = skillScore(a[skills[1]]);
                    let askill3 = skillScore(a[skills[2]]);

                    let bskill1 = skillScore(b[skills[0]]);
                    let bskill2 = skillScore(b[skills[1]]);
                    let bskill3 = skillScore(b[skills[2]]);

                    return (bskill1 + bskill2 + bskill3) - (askill1 + askill2 + askill3);
                });
                skillOrderCrew[sko] = ccrew;
            });

            Object.keys(skillbest).forEach(skill => {
                const skp = skill.split("/");
                skillout[skill] ??= [];
                const triplets = [] as string[];
                Object.keys(besttrips).forEach(trip => {
                    if (trip.includes(skill)) {
                        triplets.push(trip);
                    }
                });

                evalCrew.forEach((crew) => {
                    let c = compareCrew(crew.symbol, skp, allCrew, skillbest[skill]);
                    if (c >= 0 && c < magic) {
                        skillout[skill].push(crew);
                        crew.voyScores ??= {};
                        crew.voyScores[skill] ??= 0;
                        crew.voyScores[skill]++;

                    }

                    for (let t of triplets) {
                        let d = compareCrew(crew.symbol, t.split("/"), allCrew, besttrips[t]);
                        if (d >= 0 && d < 1) {
                            crew.voyScores ??= {};
                            let vt = t.split("/").slice(0, 2).reduce((a, b) => a + "/" + b);
                            crew.voyScores[vt] ??= 0;
                            crew.voyScores[vt]++;
                        }
                    }

                });

                skillout[skill] = skillout[skill].filter(c => !isImmortal(c));
            });

            const rc1 = Object.values(skillout).reduce((p, c) => p ? p.concat(c) : c);
            const resultCrew = rc1.filter((fc, idx) => rc1.findIndex(g => g.id === fc.id) === idx);
            const allGroups = {} as { [key: string]: number };

            for (let crew of resultCrew) {
                let cf = allCrew.find(c => c.symbol === crew.symbol);
                if (!cf) return -1;

                let so = getSortedSkills(cf);
                crew.voyagesImproved = makeVoys(crew);

                let evibe = ((skillScore(so.skills[0]) * 0.35) + (skillScore(so.skills[1]) * 0.25) + (skillScore(so.skills[2]) * 0.15)) / 2.5;

                let icols = playerData.player.character.cryo_collections.filter(f => {
                    return !!f.claimable_milestone_index &&
                        crew.collection_ids.includes(`${f.type_id}`)
                });

                let mcols = icols.map(ic => collections.find(fc => fc.id?.toString() == ic.type_id?.toString())) as Collection[];
                if (immortalizedSymbols.includes(crew.symbol)) {
                    crew.collectionsIncreased = undefined;
                }
                else {
                    mcols = mcols.filter((col, idx) => {
                        if (icols[idx].claimable_milestone_index) {
                            return col?.milestones?.slice(icols[idx].claimable_milestone_index).some(m => !!m.buffs?.length);
                        }
                        else {
                            return false;
                        }
                    });

                    //calcQuipmentScore(crew, quipment, true);
                    crew.collectionsIncreased = mcols.map(mc => mc.name);
                }

                crew.totalEVContribution = evibe;
                crew.evPerCitation = evibe / crew.max_rarity;
                crew.totalEVRemaining = crew.evPerCitation * (crew.max_rarity - crew.rarity);
                crew.amTraits = getAMSeats(crew);
                crew.score = getDistanceFromTop(cf, topCrew);
                crew.scoreTrip = getDistanceFromTop(cf, skillOrderCrew);

                if (crew.voyagesImproved?.length) {
                    for (let vi of crew.voyagesImproved) {
                        allGroups[vi] ??= 0;
                        allGroups[vi]++;
                    }
                }
            }

            const polestars = {} as { [key: string]: PolestarCombo[] };

            resultCrew.forEach((crew) => {
                polestars[crew.symbol] = findPolestars(crew, allCrew);
                crew.groupSparsity = crew.voyagesImproved?.map(vi => allGroups[vi]).reduce((p, n) => p + n, 0) ?? 0;
                crew.groupSparsity /= crew.voyagesImproved?.length ?? 1;
            })

            const maxvoy = resultCrew.map(c => c.voyagesImproved?.length ?? 0).reduce((a, b) => a > b ? a : b);
            const maxev = resultCrew.map(c => c.totalEVContribution ?? 0).reduce((a, b) => a > b ? a : b);
            const maxsparse = resultCrew.map(c => c.groupSparsity ?? 0).reduce((a, b) => a > b ? a : b);
            const maxam = resultCrew.map(c => c.amTraits?.length ?? 0).reduce((a, b) => a > b ? a : b);
            const maxquip = resultCrew.map(c => c.quipment_score ?? 0).reduce((a, b) => a > b ? a : b);
            const maxcols = resultCrew.map(c => c.collectionsIncreased?.length ?? 0).reduce((a, b) => a > b ? a : b);
            const maxex = resultCrew.map(c => getSkillOrderScore(c, skill_reports)).reduce((a, b) => a > b ? a : b);

            resultCrew.forEach((crew) => {
                crew.groupSparsity ??= 0;
                crew.groupSparsity /= maxsparse;
                crew.groupSparsity = 1 - crew.groupSparsity;
            })

            const scoreCrew = (crew: PlayerCrew) => {

                let multConf = settings;

                let pss = polestars[crew.symbol];
                let max = 0;
                pss.forEach((ps) => {
                    let pcomp = (1/ps.count*100);
                    if (max < pcomp) max = pcomp;
                });

                // less gives weight
                let gs = multConf.groupSparsity * (crew.groupSparsity ?? 0);

                // more gives weight
                let quip = multConf.quipment * ((crew.quipment_score ?? 0) / (maxquip ? maxquip : 1));

                // less gives weight
                let retrieval = crew.in_portal ? multConf.retrieval * (1 - (max/100)) : 0;

                // more gives weight
                let improve = multConf.improved * ((crew.voyagesImproved?.length ?? 0) / (maxvoy ? maxvoy : 1));

                // more gives weight
                let totalp = multConf.power * ((crew.totalEVContribution ?? 0) / maxev);

                // less gives weight
                let effort = multConf.citeEffort * (1 - ((crew.max_rarity - crew.rarity) / crew.max_rarity));

                // more gives weight
                let amscore = multConf.antimatter * ((crew.amTraits?.length ?? 0) / maxam);

                // not in portal gives weight
                let pscore = (acc[crew.symbol].in_portal ? 0 : multConf.portal);

                // never gives weight
                let nscore = isNever(crew) ? multConf.never : 0;

                // more gives weight
                let ciscore = multConf.collections * ((crew.collectionsIncreased?.length ?? 0) / (maxcols ? maxcols : 1));

                let sko = printSkillOrder(crew);
                let skd = printSkillOrder(crew, true);

                let tr = tripleRare.find(f => f.skillorder === sko);
                let db = doubleRare.find(f => f.skillorder === skd);

                let skrare = 0;
                let trrare = 0;
                let dbrare = 0;

                let rare = (getSkillOrderScore(crew, skill_reports) / maxex) * multConf.rareness;

                if (tr && db) {
                    // less gives weight
                    trrare = multConf.skillRare * (1 / tr.count);

                    // less gives weight
                    dbrare = multConf.skillRare * (db.count / 100);
                    skrare = trrare - dbrare;
                }

                // more gives weight
                let adist = crew.score ? (crew.score * multConf.score) : 1;

                // more gives weight
                let adist2 = crew.scoreTrip ? (crew.scoreTrip * multConf.triplet) : 1;
                let fin = 0;
                if (!crew.in_portal) {
                    fin = (100 * (gs + rare + quip + amscore + adist + adist2 + skrare + improve + totalp + effort + pscore + nscore + ciscore)) / 13;
                }
                else {
                    fin = (100 * (gs + rare + retrieval + quip + amscore + adist + adist2 + skrare + improve + totalp + effort + pscore + nscore + ciscore)) / 14;
                }

                //fin *= ((adist + adist2) / 2);

                //fin += (amscore * fin);

                return fin;
            }

            resultCrew.sort((a, b) => {
                let r = 0; // (b.amTraits ?? 0) - (a.amTraits ?? 0);

                let fanum = scoreCrew(a);
                let fbnum = scoreCrew(b);

                r = fbnum - fanum;

                return r;
            });

            resolve({
                crewToCite: resultCrew.filter(f => f.rarity !== f.max_rarity).map(nc => JSON.parse(JSON.stringify(nc))),
                crewToRetrieve: resultCrew.filter(f => f.rarity !== f.max_rarity && f.unique_polestar_combos?.length).map(nc => JSON.parse(JSON.stringify(nc))),
                crewToTrain: resultCrew.filter(f => f.rarity === f.max_rarity || ((f.rarity >= f.max_rarity / 2 && f.level <= 70))).map(nc => JSON.parse(JSON.stringify(nc))),
                skillOrderRarities: tripleRare
            } as CiteData);
        });
    },

}

export default BetaTachyon;