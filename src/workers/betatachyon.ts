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
    primary: CoreSkill;
    secondary?: CoreSkill;
    tertiary?: CoreSkill;
}

const BetaTachyon = {        

    scanCrew: (playerData: PlayerData, allCrew: CrewMember[], buffs: BuffStatTable, magic: number = 10) => {
        
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
                return {
                    crew: crew,
                    primary: { core: sk[0].core, skill: sk[0].skill },
                    secondary: sk.length > 1 ? { core: sk[1].core, skill: sk[1].skill } : undefined,
                    tertiary: sk.length > 2 ? { core: sk[2].core, skill: sk[2].skill } : undefined
                } as CrewSkill;
            }

            function makeVoys(skills: CrewSkill) {
                const skillOrder = [skills.primary, skills.secondary, skills.tertiary].map((v) => v?.skill ?? "").reduce((p, n) => p ? `${p}/${n}` : n);
                
                let sp = skillOrder.split("/");
                if (sp.length === 2) return [`${sp[0]}/${sp[1]}`, `${sp[1]}/${sp[0]}`];
                return [`${sp[0]}/${sp[1]}`, `${sp[1]}/${sp[0]}`, `${sp[2]}/${sp[0]}`, `${sp[0]}/${sp[2]}`]
            }

            const findBest = (crew: PlayerCrew[], skill: string) => {
                const skillcrew = crew.filter(crew => skill in crew && crew[skill].core)
                                    .sort((a, b) => {
                                        return b[skill].core - a[skill].core;                                
                                    });
                return skillcrew.slice(0, magic);
            };
            
            const compareCrew = (crewSymbol: string, skill: string, allCrew: CrewMember[], best: (PlayerCrew | CrewMember)[], buffs: BuffStatTable) => {
                let cf = allCrew.find(c => c.symbol === crewSymbol);
                if (!cf) return -1;
                const crew = oneCrewCopy(cf as PlayerCrew);
                applyCrewBuffs(crew, buffs);
        
                const core = crew[skill].core as number;
        
                let c = best.length;
                let v = -1;
        
                for (let i = 0; i < c; i++) {
                    let comp = best[i][skill].core as number;
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

            const evalCrew = playerData.player.character.crew.filter((crew) => !isImmortal(crew));
            const skillbest = {} as { [key: string]: PlayerCrew[] };
            const skillout = {} as { [key: string]: PlayerCrew[] };
            const immoCrew = playerData.player.character.crew.filter(c => isImmortal(c));
            
            skills.forEach((sk) => {
                skillbest[sk] = findBest(immoCrew, sk);
            });

            Object.keys(skillbest).forEach(skill => {
                skillout[skill] ??= [];

                evalCrew.forEach((crew) => {
                    let c = compareCrew(crew.symbol, skill, allCrew, skillbest[skill], buffs);
                    if (c >= 0 && c < magic) {
                        
                        skillout[skill].push(crew);
                    }
                });

                skillout[skill] = skillout[skill].filter(c => !isImmortal(c));
            });

            const resultCrew = Object.values(skillout).reduce((p, c) => p ? p.concat(c) : c).slice(0, 100);

            for (let crew of resultCrew) {
                crew.voyagesImproved = makeVoys(skillOrder(crew));
            }

            resolve({
                crewToCite: resultCrew,
                crewToTrain: []
            });
        });
    },
    
}

export default BetaTachyon;