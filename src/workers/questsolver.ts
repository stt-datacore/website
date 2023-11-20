import { PlayerSkill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo } from "../utils/itemutils";
import { applyCrewBuffs } from "./betatachyon";

interface SkillCrit {
    skill: PlayerSkill | string;
    crit: number;    
}

const QuestSolver = {        

    solveQuest: (config: QuestSolverConfig) => {        

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

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, traits?: MissionTraitBonus[]) {

            const useTraits = traits ?? challenge.trait_bonuses ?? [];
            const quipment = config.context.core.items.filter(i => {
                if ((!i.max_rarity_requirement && !i.traits_requirement?.length)) return false;
                if (!i.kwipment_id || !Object.keys(getItemBonuses(i).bonuses).includes(challenge.skill)) return false;                
                return true;
            });

            let questcrew = [] as IQuestCrew[];
            
            questcrew = roster.filter(c => 
                    (challenge.skill in c.skills) && (!config.qpOnly || c.q_bits >= 100))
                    .sort((a, b) => {
                        let maxa = a[challenge.skill].core + ((a[challenge.skill].max + a[challenge.skill].min) / 2);
                        let maxb = b[challenge.skill].core + ((b[challenge.skill].max + b[challenge.skill].min) / 2);

                        for (let trait of useTraits) {
                            if (a.traits.includes(trait.trait) || a.traits_hidden.includes(trait.trait)) {
                                maxa += trait.bonuses[mastery];
                            }
                            if (b.traits.includes(trait.trait) || b.traits_hidden.includes(trait.trait)) {
                                maxb += trait.bonuses[mastery];
                            }
                        }
                        return maxb - maxa;
                    })
                    .map(c => c as IQuestCrew);
           
            let qpass = questcrew.filter((crew) => {
                const nslots = (!!config.ignoreQpConstraint || crew.immortal > 0) ? 4 : qbitsToSlots(crew.q_bits);

                crew.challenges ??= [];                

                let n = crew[challenge.skill].core + ((crew[challenge.skill].max + crew[challenge.skill].min) / 2);                
                // n -= (0.20 * (crew.challenges?.length ?? 0) * n);
                
                crew.metasort ??= 0;
                crew.added_kwipment ??= [];                
                added[crew.symbol] ??= [];
                
                const currslots = added[crew.symbol];
                const slots = [] as string[];
                const quips = {} as { [key: string]: ItemBonusInfo };
                
                while (n < challenge.difficulty_by_mastery[mastery]) {
                    if (!nslots) return false;
                    if (1 + slots.length + currslots.length > nslots) return false;
                    if (crew.symbol === 'nancy_hedford_crew') {
                        console.log("nancy");
                    }

                    let qps = getPossibleQuipment(crew, quipment)
                        .filter((item) => !slots.includes(item.symbol) && !currslots?.includes(item.symbol))
                        .map((qp) => { 
                            return { item: qp, bonusInfo: getItemBonuses(qp) }
                        })
                        .filter((qp) => challenge.skill in qp.bonusInfo.bonuses)
                        .sort((a, b) => {
                            let r = 0;
                            let an = Object.values(a.bonusInfo.bonuses).map(v => v.core + v.range_max + v.range_min).reduce((p, n) => p + n, 0);
                            let bn = Object.values(b.bonusInfo.bonuses).map(v => v.core + v.range_max + v.range_min).reduce((p, n) => p + n, 0);
                            let ac = Object.keys(a.bonusInfo.bonuses) ?? [];
                            let bc = Object.keys(b.bonusInfo.bonuses) ?? [];
                            r = bn - an;
                            if (!r) r = bc.length - ac.length;
                            return r;
                        });
                                        
                    if (qps?.length) {
                        let qpower = qps[0].bonusInfo.bonuses[challenge.skill].core + ((qps[0].bonusInfo.bonuses[challenge.skill].range_min + qps[0].bonusInfo.bonuses[challenge.skill].range_max) / 2);
                        // qpower -= (0.20 * (crew.challenges?.length ?? 0) * qpower);
                        n += qpower;

                        quips[qps[0].item.symbol] = qps[0].bonusInfo;
                        slots.push(qps[0].item.symbol);
                    }
                    else {
                        return false;
                    }
                }

                if (!crew.challenges.includes(challenge.id)) crew.challenges.push(challenge.id);

                crew.metasort += n;

                if (slots.length) {
                    Object.entries(quips).forEach(([symbol, qp]) => {
                        
                        crew[challenge.skill].core += qp.bonuses[challenge.skill].core;
                        crew[challenge.skill].min += qp.bonuses[challenge.skill].range_min;
                        crew[challenge.skill].max += qp.bonuses[challenge.skill].range_max;

                    });

                    added[crew.symbol] = added[crew.symbol].concat(slots);
                }
                
                return true;
            });

            // const crews = {} as { [key: string]: SkillCrit[] };

            // for (let crew of questcrew) {
            //     crews[crew.symbol] ??= [];
            // }
            
            return qpass;
        }

        return new Promise<QuestSolverResult>((resolve, reject) => {            
            const { items } = config.context.core;
			const { playerData } = config.context.player;
            const { considerFrozen, idleOnly } = config;
            if (!playerData?.player?.character?.crew?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No player crew roster"
                });
                return;
            }
            
            const roster = playerData.player.character.crew
                    .filter(f => !!f.immortal && ((f.immortal === -1) || considerFrozen) && (!f.active_status || !idleOnly))
                    .map((crew) => {
                        crew = JSON.parse(JSON.stringify(crew));                         
                        crew.date_added = new Date(crew.date_added); 
                        applyCrewBuffs(crew, config.buffs);
                        return crew;
                    });

            if (!config.challenges?.length && !config.quest?.challenges?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No quest or challenges provided"
                });
                return;
            }
            
            const challenges = config.challenges?.length ? config.challenges : (config.quest?.challenges ?? []);
            let crew = [] as IQuestCrew[];

            for (let ch of challenges) {
                let chcrew = solveChallenge(roster, ch, config.mastery);
                if (chcrew?.length) crew = crew.concat(chcrew);
            }

            crew = crew.sort((a, b) => {
                let r = 0;
                let ca = a.challenges?.length ?? 0;
                let cb = b.challenges?.length ?? 0;
                r = cb - ca;
                if (!r) {
                    ca = a.added_kwipment?.length ?? 0;
                    cb = b.added_kwipment?.length ?? 0;
                    r = ca - cb;
                }
                return r;
            });

            crew = crew.filter((c, i) => crew.findIndex(c2 => c2.symbol === c.symbol) === i);

            crew.forEach((c) => {
                const slots = added[c.symbol];
                if (slots?.length) {
                    c.added_kwipment = slots.map((symbol, idx) => {
                        let item = config.context.core.items.find(f => f.symbol === symbol);
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
                }

                Object.keys(c.skills).forEach((skill) => {
                    c.skills[skill].core = c[skill].core;
                    c.skills[skill].range_max = c[skill].max;
                    c.skills[skill].range_min = c[skill].min;
                })
            });
            resolve({
                status: true,
                crew
            });
        });
    },
    
}

export default QuestSolver;