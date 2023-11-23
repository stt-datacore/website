import CONFIG from "../components/CONFIG";
import { ComputedBuff, CrewMember, PlayerSkill } from "../model/crew";
import { MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";

import { getPossibleQuipment, getItemBonuses, ItemBonusInfo } from "../utils/itemutils";
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

            let prefilter = roster.filter(c => {
                let ski = getSkillOrder(c);
                let b = (ski[0] === challenge.skill);
                if (!b) {
                    b = !!getTraits(c, useTraits)?.length;
                }
                return b;
            });

            if (prefilter.length >= 3) questcrew = prefilter;

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
                if (crew[challenge.skill].core < challenge.difficulty_by_mastery[mastery]) return false;

                let n = crew[challenge.skill].core + crew[challenge.skill].min;
                let ttraits = getTraits(crew, useTraits);
                n += ttraits
                        .map((t => Object.values(t.bonuses)))
                        .flat()
                        .reduce((p, n) => p + n, 0);

                n -= (0.20 * (crew.challenges?.length ?? 0) * n);
                
                crew.metasort ??= 0;
                if (config.includeCurrentQp && (!crew.added_kwipment || !(crew.symbol in added))) {
                    crew.added_kwipment = crew.kwipment.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                    crew.added_kwipment_expiration = crew.kwipment_expiration.map((qp: number | number[]) => typeof qp === 'number' ? qp : qp[1]);
                    added[crew.symbol] = crew.added_kwipment.map(n => {
                        if (!n) return "";
                        let item = config.context.core.items.find(f => f.kwipment_id?.toString() === n.toString());
                        if (item) return item.symbol;
                        return "";
                    });
                }
                else {
                    crew.added_kwipment ??= [0, 0, 0, 0];
                    crew.added_kwipment_expiration ??= [0, 0, 0, 0];
                    added[crew.symbol] ??= ['', '', '', ''];
                }
                
                const currslots = added[crew.symbol].filter(a=> a != '');
                const slots = [] as string[];
                const quips = {} as { [key: string]: ItemBonusInfo };
                
                while (n <= (challenge.difficulty_by_mastery[mastery] + [250, 275, 300][mastery])) {
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
                        let qpower = qps[0].bonusInfo.bonuses[challenge.skill].core + qps[0].bonusInfo.bonuses[challenge.skill].range_min;
                        qpower -= (0.20 * (crew.challenges?.length ?? 0) * qpower);
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
                if (crew.symbol.includes("jvini")) {
                    console.log("Break");
                }
                if (slots.length) {
                    Object.entries(quips).forEach(([symbol, qp]) => {
                        
                        crew[challenge.skill].core += qp.bonuses[challenge.skill].core;
                        crew[challenge.skill].min += qp.bonuses[challenge.skill].range_min;
                        crew[challenge.skill].max += qp.bonuses[challenge.skill].range_max;

                    });
                    
                    let j = 0;
                    for (let i = 0; i < 4; i++) {
                        if (added[crew.symbol][i] === '') {
                            added[crew.symbol][i] = slots[j++];
                        }
                    }                    
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
			const { playerData, ephemeral } = config.context.player;
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
                    .filter(f => !ephemeral?.activeCrew?.some(c => c.symbol === f.symbol) || !idleOnly)
                    .filter(f => !!f.immortal && ((f.immortal === -1) || considerFrozen))
                    .map((crew) => {
                        if (crew.symbol.includes("jvini")) {
                            console.log("Break");
                        }
                        crew = JSON.parse(JSON.stringify(crew));                         
                        crew.date_added = new Date(crew.date_added); 
                        if (!config.includeCurrentQp) {
                            applyCrewBuffs(crew, config.buffs);
                        }
                        else {
                            for(let skill of getSkillOrder(crew)) {
                                crew[skill].core = crew.skills[skill].core;
                                crew[skill].min = crew.skills[skill].range_max;
                                crew[skill].max = crew.skills[skill].range_min;
                            }
                        }
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
                
                let ca = 0;
                let cb = 0;

                ca = a.challenges?.length ?? 0;
                cb = b.challenges?.length ?? 0;
                r = cb - ca;
                if (r) return r;

                ca = a.added_kwipment?.length ?? 0;
                cb = b.added_kwipment?.length ?? 0;
                r = ca - cb;
                return r;
            });

            crew = crew.filter((c, i) => crew.findIndex(c2 => c2.symbol === c.symbol) === i);

            let chfill = [] as IQuestCrew[];
            let ach = {} as { [key: number]: boolean };
            challenges.forEach((challenge) => {
                ach[challenge.id] = false;
                for (let c of crew) {
                    if (c.challenges?.includes(challenge.id)) {
                        if (chfill.findIndex(tc => tc.symbol === c.symbol) === -1) {
                            chfill.push(c);
                        }                 
                        ach[challenge.id] = true;       
                        break;
                    }
                }
            });

            let allchallenges = Object.values(ach).every(t => t);

            crew = chfill.concat(crew.filter(f => !chfill.some(chf => chf.symbol === f.symbol)));

            crew.forEach((c, idx) => {                
                c.score = idx + 1;
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