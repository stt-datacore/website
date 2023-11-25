import CONFIG from "../components/CONFIG";
import { ComputedBuff, CrewMember, PlayerSkill, Skill } from "../model/crew";
import { EquipmentItem } from "../model/equipment";
import { MissionChallenge, MissionTraitBonus } from "../model/missions";
import { PlayerCrew, PlayerEquipmentItem } from "../model/player";
import { IQuestCrew, QuestSolverConfig, QuestSolverResult } from "../model/worker";
import { getNodePaths, makeNavMap } from "../utils/episodes";
import { calcItemDemands, canBuildItem, deductDemands, reverseDeduction } from "../utils/equipment";

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

        const playerItems = JSON.parse(JSON.stringify(config.context.player.playerData.player.character.items)) as PlayerEquipmentItem[];
        const allQuipment = JSON.parse(JSON.stringify(config.context.core.items.filter(f => f.type === 14))) as EquipmentItem[];

        const deductHistory = {} as { [key: string]: boolean[] };

        function deductItem(item: EquipmentItem) {
            deductHistory[item.symbol] ??= [];
            let r = deductDemands(item, playerItems);
            deductHistory[item.symbol].push(r);
        }

        function reverseItem(item: EquipmentItem) {
            deductHistory[item.symbol] ??= [];
            if (!deductHistory[item.symbol].length) return;
            let b = deductHistory[item.symbol].splice(deductHistory[item.symbol].length - 1, 1);
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
            if (startIndex >= (crew.length - 3)) return false;

            const solved = [] as MissionChallenge[];
            const solveCrew = [] as IQuestCrew[];

            let wcrew = crew.slice(startIndex);
            
            for(let ch of path) {
                for (let c of wcrew) {
                    if (c.challenges?.some(chc => chc.challenge.id == ch.id)) {
                        solved.push(ch);
                        if (!solveCrew.some(sc => sc.symbol === c.symbol)) {
                            solveCrew.push(c);                            
                        }
                        break;
                    }
                }
            }
            if (solved.length === path.length && solveCrew.length === 3) return solveCrew;
            return false;
        }

        function solveChallenge(roster: PlayerCrew[], challenge: MissionChallenge, mastery: number, traits?: MissionTraitBonus[]) {

            const useTraits = traits ?? challenge.trait_bonuses ?? [];
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
                if (crew.symbol === 'tribble_captain_crew') {
                    console.log("break");
                }
                const nslots = (!!config.ignoreQpConstraint || crew.immortal > 0) ? 4 : qbitsToSlots(crew.q_bits);
               
                crew.challenges ??= [];                
                let n = crew[challenge.skill].core + crew[challenge.skill].min;
                let ttraits = getTraits(crew, useTraits);
                n += ttraits                        
                        .map((t => t.bonuses[mastery]))                        
                        .reduce((p, n) => p + n, 0);

                n -= (0.20 * (crew.challenges?.length ?? 0) * n);
                
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
                
                const currslots = added[crew.symbol].filter(a=> !!a && a != '');
                const slots = [] as string[];
                const quips = {} as { [key: string]: ItemBonusInfo };
                
                while (n <= (challenge.difficulty_by_mastery[mastery] + [250, 275, 300][mastery])) {
                    if (!nslots) return false;
                    if (1 + slots.length + currslots.length > nslots) return false;

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
                        qpower -= (0.20 * (crew.challenges?.length ?? 0) * qpower);
                        n += qpower;

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
                        power_decrease: 0.20 * crew.challenges?.length ?? 0
                    });
                }

                crew.metasort += n;

                if (slots.length) {
                    Object.entries(quips).forEach(([symbol, qp]) => {
                        
                        crew[challenge.skill].core += qp.bonuses[challenge.skill].core;
                        crew[challenge.skill].min += qp.bonuses[challenge.skill].range_min;
                        crew[challenge.skill].max += qp.bonuses[challenge.skill].range_max;

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
                    error: "No player crew roster"
                });
                return;
            }
            
            const resetCrew = (crew: IQuestCrew) => {                
                delete crew.metasort;
                delete crew.added_kwipment;
                delete crew.added_kwipment_expiration;
                delete crew.challenges;
                delete added[crew.symbol];
                if (!config.includeCurrentQp) {
                    applyCrewBuffs(crew, config.buffs);
                }
                else {
                    for(let skill of getSkillOrder(crew)) {
                        crew[skill].core = crew.skills[skill].core;
                        crew[skill].min = crew.skills[skill].range_min;
                        crew[skill].max = crew.skills[skill].range_max;
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
                    error: "No quest or challenges provided"
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
                    crew = crew.filter(c => !chcrew.some(chc => chc.symbol === c.symbol));
                    crew = crew.concat(chcrew);
                    crew = crew.filter((c, i) => crew.findIndex(c2 => c2.symbol === c.symbol) === i);
                }
                return crew.sort((a, b) => {
                    let r = 0;

                    let lax = (a.added_kwipment_expiration as number[])?.filter(x => !!x)?.length ?? 0;
                    let lbx = (b.added_kwipment_expiration as number[])?.filter(x => !!x)?.length ?? 0;
                    r = lbx - lax;
                    if (r) return r;

                    r = b.q_bits - a.q_bits;
                    return r;
                    
                });
            }

            // solve the last one first!
            for (let ch of challenges) {                
                if (!ch.children.length) {
                    crew = processChallenge(ch, roster, crew);
                }            
            }

            for (let ch of challenges) {                
                if (!!ch.children.length) {
                    crew = processChallenge(ch, roster, crew);
                }            
            }

            if (!challenges.every(ch => crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)))) {                
                let retest = challenges.filter(ch => !crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)));

                for (let ch of retest) {
                    let eligCrew = crew.filter(f => ch.skill in f.base_skills && f.challenges && f.challenges.some(ft => ft.challenge.skill === ch.skill));
                    if (!eligCrew?.length) continue;
                    let ci = 0;

                    while (ci < eligCrew.length && !crew.some(c => c.challenges?.some(chc => chc.challenge.id === ch.id))) 
                    {   
                        let mfind = crew.findIndex(c => c.symbol === eligCrew[ci].symbol);
                        if (mfind !== -1) {
                            eligCrew[ci] = JSON.parse(JSON.stringify(eligCrew[ci]));
                            eligCrew[ci].date_added = new Date(eligCrew[ci].date_added);
                            let oldAdded = added[eligCrew[ci].symbol];
                            resetCrew(eligCrew[ci]);
                            crew = processChallenge(ch, eligCrew, crew);
                            if (!eligCrew[ci].challenges?.length) {
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

                        ca = a.added_kwipment_expiration?.filter(f => !!f)?.length ?? 0;
                        cb = b.added_kwipment_expiration?.filter(f => !!f)?.length ?? 0;
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

            const threegroups = [] as IQuestCrew[][];
            const threekeys = [] as string[];
            const sp = [] as MissionChallenge[][];
            for (let i = 0; i < crew.length; i++) {
                for (let path of paths) {
                    let tg = anyThree(crew, path, i);
                    if (tg) {
                        tg.sort((a, b) => a.symbol.localeCompare(b.symbol));
                        let key = tg.map(c => c.symbol).join("_");
                        if (!threekeys.includes(key)) {
                            threegroups.push(tg);
                            threekeys.push(key);
                            if (!sp.includes(path)) sp.push(path);
                        }
                    }
                }
            }

            if (sp.length === paths.length) {
                crew = [ ... new Set(threegroups.flat()) ];
            }

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
                                return `${b.core+b.range_max+b.range_min}_${b.skill}`
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

            if (config.buildableOnly) {
                crew = crew.filter((c) => {
                    if (!c.added_kwipment) return true;
                    if (c.added_kwipment.filter(c => !!c).length === c.added_kwipment_expiration?.filter(c => !!c)?.length) return true;

                    let buildcount = 0;
                    let total = 0;
                    let slot = 0;
                    let failbuff = [] as EquipmentItem[];

                    for (let id of c.added_kwipment) {
                        if (c.added_kwipment_expiration && c.added_kwipment_expiration[slot]) {
                            slot++;
                            buildcount++;
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
                            deductItem(quip);
                            failbuff.push(quip);
                            buildcount++;
                        }
                    }        
                    if (total !== buildcount) {
                        for (let quip of failbuff) {
                            reverseItem(quip);
                        }
                    }
                    return total === buildcount;                                                    
                });
                crew.forEach((c, idx) => c.score = idx + 1);
            }
            
            let allPass = !!threegroups.length && challenges.every(ch => crew.some(c => c.challenges?.some(cha => cha.challenge.id === ch.id)));
            
            resolve({
                status: true,
                fulfilled: allPass,
                crew,
                failed: allPass ? undefined : challenges.filter(ch => !crew.some(c => c.challenges?.some(ch2 => ch2.challenge.id === ch.id))).map(ch => ch.id)
            });
        });
    },
    
}

export default QuestSolver;