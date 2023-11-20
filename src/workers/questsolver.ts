import { PlayerSkill } from "../model/crew";
import { MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";
import { getPossibleQuipment, getItemBonuses } from "../utils/itemutils";

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
                        let maxa = a.skills[challenge.skill].core + ((a.skills[challenge.skill].range_max + a.skills[challenge.skill].range_min) / 2);
                        let maxb = b.skills[challenge.skill].core + ((b.skills[challenge.skill].range_max + b.skills[challenge.skill].range_min) / 2);

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
                let n = crew.skills[challenge.skill].core + ((crew.skills[challenge.skill].range_max + crew.skills[challenge.skill].range_min) / 2);
                let slots = [] as string[];                
                const nslots = config.ignoreQpConstraint ? 4 : qbitsToSlots(crew.q_bits);

                while (n < challenge.difficulty_by_mastery[mastery]) {
                    if (!nslots) return false;
                    if (slots.length > nslots) return false;

                    crew.added_kwipment ??= [];
                    let qps = getPossibleQuipment(crew, quipment)
                        .filter((item) => !slots.includes(item.symbol))
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
                        n += qps[0].bonusInfo.bonuses[challenge.skill].core + ((qps[0].bonusInfo.bonuses[challenge.skill].range_min + qps[0].bonusInfo.bonuses[challenge.skill].range_max) / 2);
                        slots.push(qps[0].item.symbol);
                    }
                    else {
                        return false;
                    }
                }

                if (slots?.length) {
                    crew.added_kwipment = slots.map((symbol, idx) => {
                        let item = quipment.find(f => f.symbol === symbol);
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
            
            const roster = playerData.player.character.crew.filter(f => !!f.immortal && ((f.immortal === -1) || considerFrozen) && (!f.active_status || !idleOnly));

            if (!config.challenges?.length && !config.quest?.challenges?.length) {
                resolve({
                    status: false,
                    crew: [],
                    error: "No quest or challenges provided"
                });
                return;
            }
            
            const challenges = config.challenges ?? config.quest?.challenges ?? [];
            let crew = [] as IQuestCrew[];

            for (let ch of challenges) {
                let chcrew = solveChallenge(roster, ch, config.mastery);
                if (chcrew?.length) crew = crew.concat(chcrew);
            }

            crew = crew.filter((c, i) => crew.findIndex(c2 => c2.symbol === c.symbol) === i);

            resolve({
                status: true,
                crew
            });
        });
    },
    
}

export default QuestSolver;