import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedBuff, CrewMember, Skill } from "../model/crew";
import { Collection } from "../model/game-elements";
import { PlayerCrew, PlayerData } from "../model/player";
import { BuffStatTable } from "../utils/voyageutils";

interface CrewSkill {
    crew: PlayerCrew | CrewMember;
    skills: ComputedBuff[];
}
const amSkillOrder = ["command_skill", "science_skill", "security_skill", "engineering_skill", "diplomacy_skill", "medicine_skill"];
const amMap = [
    "Astrophysicist 	x 	x 		x 	x 	",
    "Bajoran 	x 		x 		x 	",
    "Borg 		x 	x 	x 		",
    "Brutal 	x 	x 	x 	x 	x 	",
    "Cardassian 	x 		x 		x 	",
    "Caregiver 					x  	x",
    "Civilian 	x 	x 	x 	x 	x 	x",
    "Communicator 	x 		x 		x 	",
    "Costumed 	x 	x 	x 	x 	x 	",
    "Crafty 	x 	x 	x 		x 	",
    "Cultural Figure 	x 		x 		x 	",
    "Cyberneticist 		x 		x 		",
    "Desperate 	x 	x 	x 	x 	x 	",
    "Diplomat 	x 		x 		x 	",
    "Duelist 	x 		x 		x 	",
    "Exobiology 		x 				",
    "Explorer 	x 		x 	x 		",
    "Federation 	x 	x 	x 	x 	x 	x",
    "Ferengi 					x 	",
    "Gambler 	x 		x 		x 	",
    "Hero 	x 		x 		x 	",
    "Hologram 	x 	x 			x 	x",
    "Human 	x 	x 	x 	x 	x 	x",
    "Hunter 	x 		x 			",
    "Innovator 	x 	x 		x 		",
    "Inspiring 	x 		x 		x 	",
    "Jury Rigger 	x 		x 	x 		",
    "Klingon 	x 		x 		x 	",
    "Marksman 			x 			",
    "Maverick 	x 		x 		x 	",
    "Mirror Universe 	x 	x	x 		x 	",
    "Nurse 					  	x",
    "Physician 		x 			x 	x",
    "Pilot 	x 		x 	x 		",
    "Prodigy 		x 		x 		",
    "Resourceful 	x 	x 	x 	x 	x 	",
    "Romantic 	x 	x 	x 	x 	x 	",
    "Romulan 			x 		x 	",
    "Saboteur 	x 		x 			",
    "Scoundrel 	x 		x 		x 	",
    "Starfleet 	x 	x 	x 	x 	x 	x",
    "Survivalist 	x 		x 		x 	",
    "Tactician 	x 	x 	x 	x 	x 	",
    "Telepath 	x 	x 	x 		x 	",
    "Undercover Operative 	x 	x 	x 		x 	",
    "Veteran 	x 		x 		x 	",
    "Villain 	x 		x 		x 	",
    "Vulcan 	x 	x 	x 		x 	"
];

const lookupTrait = (trait: string) => {
    const oma = [] as string[];
    for (let ln of amMap) {
        if (ln.startsWith(trait)) {
            let parts = ln.split("\t");
            let c = parts.length;
            for (let i = 1; i < c; i++) {
                if (parts[i].includes("x")) {
                    oma.push(amSkillOrder[i - 1]);
                }
            }
        }
    }
    return oma;
}

const BetaTachyon = {        

    scanCrew: (playerData: PlayerData, collections: Collection[], inputCrew: CrewMember[], buffs: BuffStatTable, magic: number = 10) => {
        
        return new Promise((resolve, reject) => {


            function applyCrewBuffs(crew: PlayerCrew | CrewMember, buffConfig: BuffStatTable, nowrite?: boolean) {
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
                            max: max
                        };	
                    }
                    bs[skill] = {
                        core: core,
                        range_min: min,
                        range_max: max
                    };
                }
                return bs;
            }
            
            function isNever(crew: PlayerCrew | CrewMember) {
                let ob = crew.obtained.toLowerCase();	
                return (ob.includes("bossbattle") || ob.includes("honor") || ob.includes("gauntlet") || ob.includes("voyage") || ob.includes("collection"));
            }
           
            const skills = ["command_skill", "diplomacy_skill", "science_skill", "engineering_skill", "security_skill", "medicine_skill"];
            const shortskills = ["CMD", "DIP", "SCI", "ENG", "SEC", "MED"];
            const voyskills = ["command", "diplomacy", "science", "engineering", "security", "medicine"];
            const skillPairs = [] as string[][];
            const skillTriplets = [] as string[][];

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
            
            const skillScore = (skill: ComputedBuff) => {
                if (!skill?.core) return 0;
                return skill.core;
            }

            function getAMSeats(crew: PlayerCrew | CrewMember) {
                
                return crew.traits_named.filter(tn => lookupTrait(tn).some((sk) => sk in crew && crew[sk].core));
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
            
            function getSkillOrder(crew: PlayerCrew | CrewMember) {
                const sk = [] as ComputedBuff[];
                let x = 0;
                for (let skill of skills) {
                    if (skill in crew) {
                        sk.push({ ...crew[skill], skill: voyskills[x] });
                    }
                    x++;
                }

                sk.sort((a, b) => skillScore(b) - skillScore(a));                
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
            
            function printSkillOrder(crew: PlayerCrew | CrewMember) {
                return getSkillOrder(crew).join("/");
            }

            function getSortedSkills(crew: PlayerCrew | CrewMember) {
                const sk = [] as ComputedBuff[];
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
                if (sk.length > 2 && sk[2].skill) {
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

            const findBest = (crew: PlayerCrew[], skills: string[], top: number) => {
                
                if (skills.length === 2) {                
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

            const compareCrew = (crewSymbol: string, skills: string[], allCrew: CrewMember[], best: (PlayerCrew | CrewMember)[], buffs: BuffStatTable) => {
            
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

            const evalCrew = playerData.player.character.crew.filter((crew) => !isImmortal(crew) && countSkills(crew) === 3);

            const skillbest = {} as { [key: string]: PlayerCrew[] };
            const besttrips = {} as { [key: string]: PlayerCrew[] };
            const skillout = {} as { [key: string]: PlayerCrew[] };

            let immo1 = playerData.player.character.crew.filter(c => isImmortal(c));
            
            const immoCrew = immo1?.length ? immo1 : playerData.player.character.crew;

            skillPairs.forEach((sk) => {
                skillbest[`${sk[0]}/${sk[1]}`] = findBest(immoCrew, sk, magic);
            });

            skillTriplets.forEach((sk) => {
                besttrips[`${sk[0]}/${sk[1]}/${sk[2]}`] = findBest(immoCrew, sk, magic * 2);
            });

            const allCrew = JSON.parse(JSON.stringify(inputCrew)) as CrewMember[];

            const topCrew = {} as { [key: string]: CrewMember };
            const skillOrderCrew = {} as { [key: string]: CrewMember[] };

            allCrew.forEach((f) => {
                f.date_added = new Date(f.date_added);
                applyCrewBuffs(f, buffs);
            });
            
            const uniqueSkillOrders = [] as string[];

            allCrew.forEach(ac => {
                let csk = printSkillOrder(ac);
                if (!uniqueSkillOrders.includes(csk)) {
                    uniqueSkillOrders.push(csk);
                }
            })

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
                    let c = compareCrew(crew.symbol, skp, allCrew, skillbest[skill], buffs);
                    if (c >= 0 && c < magic) {                        
                        skillout[skill].push(crew);
                        crew.voyScores ??= {};
                        crew.voyScores[skill] ??= 0;
                        crew.voyScores[skill]++;
        
                    }                    
        
                    for (let t of triplets) {
                        let d = compareCrew(crew.symbol, t.split("/"), allCrew, besttrips[t], buffs);
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
            const resultCrew = rc1.filter((fc, idx) => rc1.findIndex(g => g.symbol === fc.symbol) === idx);

            for (let crew of resultCrew) {
                let cf = allCrew.find(c => c.symbol === crew.symbol);
                if (!cf) return -1;                

                let so = getSortedSkills(cf);
                crew.voyagesImproved = makeVoys(crew);   

                let evibe = ((skillScore(so.skills[0]) * 0.35) + (skillScore(so.skills[1]) * 0.25) + (skillScore(so.skills[2]) * 0.15)) / 2.5;

                let icols = playerData.player.character.cryo_collections.filter(f => {
                    return !!f.claimable_milestone_index && 
                        crew.collections.includes(f.name)
                });
                
                let mcols = icols.map(ic => collections.find(fc => fc.name == ic.name)) as Collection[];
                mcols = mcols.filter((col, idx) => {
                    if (icols[idx].claimable_milestone_index) {
                        return col?.milestones?.slice(icols[idx].claimable_milestone_index).some(m => !!m.buffs?.length);
                    }
                    else {
                        return false;
                    }
                });
                crew.collectionsIncreased = mcols.map(mc => mc.name);
                crew.totalEVContribution = evibe;
                crew.evPerCitation = evibe / crew.max_rarity;
                crew.totalEVRemaining = crew.evPerCitation * (crew.max_rarity - crew.rarity);
                crew.amTraits = getAMSeats(crew);
                crew.score = getDistanceFromTop(cf, topCrew);
                crew.scoreTrip = getDistanceFromTop(cf, skillOrderCrew);                
            }

            const maxvoy = resultCrew.map(c => c.voyagesImproved?.length ?? 0).reduce((a, b) => a > b ? a : b);
            const maxev = resultCrew.map(c => c.totalEVContribution ?? 0).reduce((a, b) => a > b ? a : b);
            const maxremain = resultCrew.map(c => c.totalEVRemaining ?? 0).reduce((a, b) => a > b ? a : b);
            const maxam = resultCrew.map(c => c.amTraits?.length ?? 0).reduce((a, b) => a > b ? a : b);
            const maxcols = resultCrew.map(c => c.collectionsIncreased?.length ?? 0).reduce((a, b) => a > b ? a : b);
            
            const scoreCrew = (crew: PlayerCrew) => {

                let multConf = {
                    // Voyages Improved
                    improved: 1,
                    // Base Power Score
                    power: 2,
                    // Effort To Max
                    citeEffort: 0.75,
                    // Antimatter Traits
                    antimatter: 0.1,
                    // In Portal Now
                    portal: 1.5,
                    // In Portal Ever
                    never: 3,
                    // Stat-Boosting Collections Increased
                    collections: 2,
                    // Skill-Order Rarity
                    skillRare: 5,
                    // Overall Roster Power Rank
                    score: 1,
                    // Power Rank Within Skill Order
                    triplet: 3
                }

                let improve = multConf.improved * ((crew.voyagesImproved?.length ?? 0) / (maxvoy ? maxvoy : 1));
                let totalp = multConf.power * ((crew.totalEVContribution ?? 0) / maxev);
                let effort = multConf.citeEffort * ((crew.rarity / crew.max_rarity));
                let amscore = multConf.antimatter * ((crew.amTraits?.length ?? 0) / maxam);
                let pscore = (acc[crew.symbol].in_portal ? 0 : multConf.portal);
                let nscore = isNever(crew) ? multConf.never : 0;
                let ciscore = multConf.collections * ((crew.collectionsIncreased?.length ?? 0) / (maxcols ? maxcols : 1));
                let skrare = multConf.skillRare * (1 / skillOrderCrew[printSkillOrder(crew)].length);

                let fin = (100 * (skrare + improve + totalp + effort + pscore + nscore + ciscore)) / 7;
                
                let adist = crew.score ? (crew.score / multConf.score) : 1;
                let adist2 = crew.scoreTrip ? (crew.scoreTrip / multConf.triplet) : 1;

                fin += (amscore * fin);
                fin *= ((adist + adist2) / 2);

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
                crewToTrain: resultCrew.filter(f => f.rarity === f.max_rarity || ((f.rarity >= f.max_rarity / 2 && f.level <= 70))).map(nc => JSON.parse(JSON.stringify(nc)))
            });
        });
    },
    
}

export default BetaTachyon;