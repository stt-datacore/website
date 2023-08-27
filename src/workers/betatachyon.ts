import CONFIG from "../components/CONFIG";
import { BaseSkills, ComputedBuff, CrewMember, Skill } from "../model/crew";
import { PlayerCrew, PlayerData } from "../model/player";
import { BuffStatTable } from "../utils/voyageutils";

interface CoreSkill {
    core: number;
    skill: string;
}
interface CrewSkill {
    crew: PlayerCrew | CrewMember;
    skills: CoreSkill[];
}

const amSeats = ["Astrophysicist",
                "Bajoran",
                "Borg",
                "Brutal",
                "Cardassian",
                "Civilian",
                "Communicator",
                "Costumed",
                "Crafty",
                "Cultural Figure",
                "Cyberneticist",
                "Desperate",
                "Diplomat",
                "Duelist",
                "Exobiology",
                "Explorer",
                "Federation",
                "Ferengi",
                "Gambler",
                "Hero",
                "Hologram",
                "Human",
                "Hunter",
                "Innovator",
                "Inspiring",
                "Jury Rigger",
                "Klingon",
                "Marksman",
                "Maverick",
                "Physician",
                "Pilot",
                "Prodigy",
                "Resourceful",
                "Romantic",
                "Romulan",
                "Saboteur",
                "Scoundrel",
                "Starfleet",
                "Survivalist",
                "Tactician",
                "Telepath",
                "Undercover Operative",
                "Veteran",
                "Villain",
                "Vulcan"];

const BetaTachyon = {        

    scanCrew: (playerData: PlayerData, allCrew: CrewMember[], buffs: BuffStatTable, magic: number = 5) => {
        
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
            
            function oneCrewCopy<T extends CrewMember>(crew: T): T {
                let result = JSON.parse(JSON.stringify(crew)) as T;
                if (typeof crew.date_added === 'string') {
                    crew.date_added = new Date(crew.date_added);
                }
            
                return result;
            }
            
            
            const skills = ["command_skill", "diplomacy_skill", "science_skill", "engineering_skill", "security_skill", "medicine_skill"];
            const shortskills = ["CMD", "DIP", "SCI", "ENG", "SEC", "MED"];
            const voyskills = ["command", "diplomacy", "science", "engineering", "security", "medicine"];
            const skillPairs = [] as string[][];

            for (let s1 of skills) {
                for (let s2 of skills) {
                    if (s2 === s1) continue;
                    skillPairs.push([s1, s2]);
                }
            }            

            function getAMSeats(crew: PlayerCrew | CrewMember) {
                return crew.traits_named.filter(tn => amSeats.includes(tn)).length;
            }

            function skillOrder(crew: PlayerCrew) {
                const sk = [] as ComputedBuff[];
                let x = 0;
                for (let skill of skills) {
                    if (skill in crew) {
                        sk.push({ ...crew[skill], skill: voyskills[x] });
                    }
                    x++;
                }
                sk.sort((a, b) => b.core - a.core);
                let out = {
                    crew: crew,
                    skills: [],
                } as CrewSkill;
                if (sk.length > 0 && sk[0].skill) {
                    out.skills.push({ core: sk[0].core, skill: sk[0].skill });
                }
                if (sk.length > 1 && sk[1].skill) {
                    out.skills.push({ core: sk[1].core, skill: sk[1].skill });
                }
                if (sk.length > 2 && sk[2].skill) {
                    out.skills.push({ core: sk[2].core, skill: sk[2].skill });
                }

                return out;
            }

            function makeVoys(symbol: string, skilldata: { [key: string]: PlayerCrew[] }) {
                const ovoys = [] as string[];
                Object.keys(skilldata).forEach((sk) => {
                    if (skilldata[sk].findIndex(c => c.symbol === symbol) !== -1) {
                        let a = sk.split("/");
                        a[0] = a[0].replace("_skill", "");
                        a[1] = a[1].replace("_skill", "");
                        ovoys.push(`${a[0]}/${a[1]}`);
                    }
                });
                return ovoys;
            }

            const findBest = (crew: PlayerCrew[], skills: string[]) => {
                const skillcrew = crew.filter(crew => skills[0] in crew && crew[skills[0]].core &&  skills[1] in crew && crew[skills[1]].core)
                                    .sort((a, b) => {
                                        return (b[skills[0]].core + b[skills[1]].core) - (a[skills[0]].core + a[skills[1]].core);                                
                                    });
                return skillcrew.slice(0, magic);
            };
            
            const compareCrew = (crewSymbol: string, skills: string[], allCrew: CrewMember[], best: (PlayerCrew | CrewMember)[], buffs: BuffStatTable) => {
                let cf = allCrew.find(c => c.symbol === crewSymbol);
                if (!cf) return -1;
                const crew = oneCrewCopy(cf as PlayerCrew);
                applyCrewBuffs(crew, buffs);
        
                const core = crew[skills[0]].core + crew[skills[1]].core as number;
        
                let c = best.length;
                let v = -1;
        
                for (let i = 0; i < c; i++) {
                    let comp = best[i][skills[0]].core + best[i][skills[1]].core as number;
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

            const evalCrew = playerData.player.character.crew.filter((crew) => !isImmortal(crew) && skillOrder(crew).skills.length === 3);

            const skillbest = {} as { [key: string]: PlayerCrew[] };
            const skillout = {} as { [key: string]: PlayerCrew[] };
            let immo1 = playerData.player.character.crew.filter(c => isImmortal(c));
            
            const immoCrew = immo1?.length ? immo1 : playerData.player.character.crew;

            skillPairs.forEach((sk) => {
                skillbest[`${sk[0]}/${sk[1]}`] = findBest(immoCrew, sk);
            });

            Object.keys(skillbest).forEach(skill => {
                
                const skp = skill.split("/");
                skillout[skill] ??= [];
                
                evalCrew.forEach((crew) => {
                    let c = compareCrew(crew.symbol, skp, allCrew, skillbest[skill], buffs);
                    if (c >= 0 && c < magic) {                        
                        skillout[skill].push(crew);
                    }                    
                });

                skillout[skill] = skillout[skill].filter(c => !isImmortal(c));
            });

            const rc1 = Object.values(skillout).reduce((p, c) => p ? p.concat(c) : c).slice(0, 100);
            const resultCrew = rc1.filter((fc, idx) => rc1.findIndex(g => g.symbol === fc.symbol) === idx);

            for (let crew of resultCrew) {
                let cf = allCrew.find(c => c.symbol === crew.symbol);
                if (!cf) return -1;
                const copycrew = oneCrewCopy(cf as PlayerCrew);
                applyCrewBuffs(copycrew, buffs);
                let so = skillOrder(copycrew);

                crew.voyagesImproved = makeVoys(crew.symbol, skillout);   
                let evibe = ((so.skills[0].core * 0.35) + (so.skills[1].core * 0.25)) / 2;
                crew.totalEVContribution = evibe;
                crew.evPerCitation = evibe / crew.max_rarity;
                crew.totalEVRemaining = crew.evPerCitation * (crew.max_rarity - crew.rarity);
                crew.amTraits = getAMSeats(crew);
            }

            resultCrew.sort((a, b) => {
                let r = (b.amTraits ?? 0) - (a.amTraits ?? 0);
                if (!r) {
                    return (b.totalEVContribution ?? 0) - (a.totalEVContribution ?? 0);
                }
                return r;
            })

            resolve({
                crewToCite: resultCrew,
                crewToTrain: []
            });
        });
    },
    
}

export default BetaTachyon;