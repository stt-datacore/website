import { CrewMember } from "../model/crew";
import { AttackInstant, MultiShipWorkerConfig, Ship, ShipAction, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship"
import { crewCopy } from "../utils/crewutils";
import { setupShip } from "../utils/shiputils";

interface BonusAction extends ShipAction {
    orig_bonus?: number;
    orig_ability_amount?: number;
    orig_cooldown?: number;
    current_phase?: number;
    comes_from: 'ship' | 'crew';
}

interface SlopeDetail { chance: number, slope: number | undefined }

const DetailCritTable = {
    400: { chance: 4, slope: 0.0125 as number | undefined },
    800: { chance: 9, slope: 0.0175 as number | undefined },
    1200: { chance: 16, slope: 0.01333 as number | undefined },
    1800: { chance: 24, slope: 0.01 as number | undefined },
    2400: { chance: 30, slope: 0.00708 as number | undefined },
    3000: { chance: 34.25, slope: 0.00625 as number | undefined },
    3600: { chance: 38, slope: 0.00333 as number | undefined },
    6000: { chance: 46, slope: 0.001 as number | undefined },
    10000: { chance: 50, slope: undefined as number | undefined }
} as { [key: string]: SlopeDetail }

const CritTable = {
    400: 4,
    800: 9,
    1200: 16,
    1800: 24,
    2400: 30,
    3000: 34.25,
    3600: 38,
    6000: 46,
    10000: 50
};

const CritTiers = Object.keys(CritTable).map(m => Number.parseInt(m));

const PowerTable = {
    0: 0,
    1: 1200,
    2: 1560,
    3: 2028,
    4: 2636,
    5: 3427,
    6: 4455,
    7: 5792,
    8: 7530,
    9: 9789,
    10: 12726,
    11: 15908,
    12: 19885,
    13: 24856,
    14: 30076,
    15: 36091,
    16: 43309,
    17: 51105,
    18: 60304,
    19: 71159,
    20: 83968,
    21: 97403,
    22: 111039,
    23: 125474,
    24: 140531,
    25: 155989,
    26: 165989,
    27: 175989,
    28: 185989,
    29: 195989,
    30: 205989,
    31: 215989,
    32: 225989,
    33: 235989,
    34: 245989,
    35: 255989,
    36: 265989,
    37: 275989,
    38: 285989,
    39: 295989,
    40: 305989
};

function getCritChance(n: number) {
    if (n >= 10000) return CritTable[10000];
    if (n in CritTable) return CritTable[n];
    let c = CritTiers.length;
    for (let i = 0; i < c - 1; i++) {
        if (n >= CritTiers[i] && n <= CritTiers[i + 1]) {
            let detail = DetailCritTable[CritTiers[i]];
            if (detail && detail.slope) {
                let mm = n - CritTiers[i];
                mm *= detail.slope;
                return detail.chance + mm;
            }
        }
    }    
    return 0;
}

function sumAttack(ship: Ship, actions: ShipAction[], opponent?: Ship, offense?: number) {
    let base_attack = ship.attack;
    let base_acc = ship.accuracy;
    let base_eva = ship.evasion;
    let bonus = ship.crit_bonus;
    let crit = ship.crit_chance;
    let sum_attack = base_attack;
    
    let highest_dmg = 0;
    let highest_acc = 0;
    let sum_acc = base_acc;

    actions.forEach((action) => {
        if (action.ability?.type === 4) {
            crit += action.ability.amount;
        }
        else if (action.ability?.type === 5) {
            bonus += action.ability.amount;
        }        
        if (action.bonus_type === 0) {
            if (action.ability?.type === 0) {
                if (highest_dmg < action.bonus_amount + action.ability.amount) {
                    highest_dmg = action.bonus_amount + action.ability.amount;
                }
            }
            else if (highest_dmg < action.bonus_amount) {
                highest_dmg = action.bonus_amount;
            }
        }
        if (action.bonus_type === 2) {
            if (highest_acc < action.bonus_amount) {
                highest_acc = action.bonus_amount;
            }
        }
    });
    
    if (actions.some(a => a.status === 1)) {
        crit += 1000;
    }
    
    if (actions.some(a => a.status === 3)) {
        sum_attack += (ship.attack / 2);
    }

    let chance = getCritChance(crit) / 100;

    if (highest_dmg) {
        sum_attack += PowerTable[highest_dmg];
    }

    if (highest_acc) {
        sum_acc += PowerTable[highest_acc];
    }

    bonus /= 10000;

    let min_attack = 0;
    let max_attack = 0;
    
    max_attack = sum_attack + ((sum_attack * bonus)); 
    sum_attack += ((sum_attack * bonus) * chance);
    min_attack = sum_attack;

    let hc = 0;
    
    if (opponent) {
        hc = hitChance(sum_acc, opponent.evasion);
    }
    else {
        hc = hitChance(sum_acc, base_eva);
    }

    min_attack *= hc;
    sum_attack *= hc;
    max_attack *= hc;

    offense ??= 0;
    
    let atk_off = sum_attack * offense;
    sum_attack += atk_off;
    
    atk_off = min_attack * offense;
    min_attack += atk_off;

    atk_off = max_attack * offense;
    max_attack += atk_off;

    return [max_attack, sum_attack, min_attack];
}

function hitChance(acc: number, opp_eva: number) {
    return 1 / (1 + Math.exp(-1.9 * (acc / opp_eva - 0.55)));
}

export function iterateBattle(input_ship: Ship, crew: CrewMember[], opponent?: Ship, defense?: number, offense?: number, time = 180) {
    let ship = setupShip(input_ship, crew, false) || undefined;
    defense ??= 0;
    offense ??= 0;
    if (!ship) return [];

    let hull = ship.hull;
    let orighull = ship.hull;

    const attacks = [] as AttackInstant[];
    crew.forEach(c => c.action.crew = c.id!);
    
    let allactions = JSON.parse(JSON.stringify([...ship.actions ?? [], ... crew.map(c => c.action) ])) as BonusAction[];
    allactions.forEach((action, i) => {
        action.comes_from = i >= (ship!.actions?.length ?? 0) ? 'crew' : 'ship';
        if (action.charge_phases?.length) {
            if (action.ability) {
                action.orig_ability_amount = action.ability?.amount;
                action.orig_bonus = action.bonus_amount;
                action.orig_cooldown = action.cooldown;
                action.current_phase = 0;
            }
        }
        
    });

    let alen = allactions.length;    
    let uses = allactions.map(a => 0);
    let state_time = allactions.map(a => 0);
    let inited = allactions.map(a => false);
    let active = allactions.map(a => false);
    
    let atm = 1;
    const current = [] as ShipAction[];

    let cloaked = false;
    let oppoattack = 0;

    if (opponent) {
        oppoattack = (opponent.attack * opponent.attacks_per_second * hitChance(opponent.accuracy, ship.evasion));
    }

    const resetAction = (action: BonusAction) => {
        if (action.orig_ability_amount && action.ability) {
            action.ability.amount = action.orig_ability_amount;
        }
        if (action.bonus_amount && action.orig_bonus) {
            action.bonus_amount = action.orig_bonus;
        }
        if (action.orig_cooldown) {
            action.cooldown = action.orig_cooldown;
        }
        action.current_phase = 0;
    }

    const bumpAction = (action: BonusAction, phase: number) => {
        if (action.charge_phases) {
            let cinfo = action.charge_phases[phase - 1];
            action.cooldown = cinfo.charge_time;
            if (cinfo.bonus_amount) {
                action.bonus_amount = cinfo.bonus_amount;
            }
            if (action.ability && cinfo.ability_amount) {
                action.ability.amount = cinfo.ability_amount!
            }
        }
    }

    const processChargePhases = (action: BonusAction, actidx: number) => {
        if (action.charge_phases) {
            if (!action.current_phase) {
                action.current_phase = 1;
                state_time[actidx] = 1;
                inited[actidx] = true;
            }
            else if (action.current_phase < action.charge_phases.length) {
                bumpAction(action, action.current_phase);
                action.current_phase++;
                state_time[actidx] = 1;
                inited[actidx] = true;
            }
            else if (action.current_phase === action.charge_phases.length) {
                bumpAction(action, action.current_phase);
                action.current_phase++;
                inited[actidx] = true;
            }
        }
    }

    const activate = (action: BonusAction, actidx: number) => {
        if (!action.ability?.condition || current.some(act => act.status === action.ability?.condition)) {
            if (action.ability?.type === 1) {
                atm += (action.ability.amount / 100);
            }
            else if (action.ability?.type === 2) {
                let pctneed = 1 - (hull / orighull);
                let pctfix = action.ability.amount / 100;
                if (pctneed >= pctfix) {
                    hull += (orighull * pctfix);
                    if (action.charge_phases) {
                        resetAction(action);
                    }
                }
                else {
                    processChargePhases(action, actidx);
                    return;
                }
            }
            else if (action.ability?.type === 10) {
                let time = action.ability.amount;
                for (let idx = 0; idx < alen; idx++) {
                    if (!active[idx] && inited[idx]) {
                        if (!allactions[idx].current_phase || allactions[idx].comes_from === 'ship') state_time[idx] += time;
                    }
                }       
            }
            current.push(action);
            cloaked = action.status === 2;
            uses[actidx]++;
            state_time[actidx] = 1;
            inited[actidx] = true;
            active[actidx] = true;
        }
        else {
            processChargePhases(action, actidx);
            return;
        }
    }

    const deactivate = (action: ShipAction, actidx: number) => {
        let idx = current.findIndex(f => f === action);
        if (idx != -1) current.splice(idx, 1)
        state_time[actidx] = 1;
        active[actidx] = false;
    }

    for (let sec = 1; sec <= time; sec++) {
        atm = 1;
       
        for (let action of allactions) {
            let actidx = allactions.findIndex(f => f === action);
            if (!inited[actidx] && sec >= action.initial_cooldown && !current.includes(action)) {
                activate(action, actidx);
            }
            else if (inited[actidx] && current.includes(action)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.duration) {
                    deactivate(action, actidx);
                }
            }
            else if (inited[actidx] && !current.includes(action) && (!action.limit || uses[actidx] < action.limit)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.cooldown) {
                    activate(action, actidx);
                }
            }
        }

        let [maxattack, sumattack, minattack] = sumAttack(ship, current, opponent, offense);
        
        let min = minattack * ship.attacks_per_second;
        let atk = sumattack * ship.attacks_per_second;
        let max = maxattack * ship.attacks_per_second;

        if (atm > 1) {
            min += minattack * atm;
            atk += sumattack * atm;
            max += maxattack * atm;
        }

        if (!cloaked) {
            let mul = current.filter(f => f.ability?.type === 11).map(m => m.ability?.amount).reduce((p, n) => p! + n!, 0) || 0;
            mul = 1 - (mul / 100);        
            
            if (!oppoattack) {
                hull -= (atk - (atk * defense)) * mul;
            }
            else {
                hull -= (oppoattack - (oppoattack * defense)) * mul;
            }
        }

        attacks.push({
            actions: [...current],
            second: sec,
            attack: max,
            min_attack: min,
            max_attack: max,
            ship
        });

        if (hull <= 0) break;
    }

    ship = undefined;
    return attacks;
}

function getPermutations<T>(array: T[], size: number, check?: (set: T[]) => T[] | false, max?: number) {
    function p(t: T[], i: number) {
        if (t.length === size) {
            if (!check) {
                result.push(t);
            }
            else {
                let response = check(t);
                if (response) result.push(response);
            }
            return;
        }
        if (i + 1 > array.length) {
            return;
        }
        if (max && result.length >= max) return;
        p(t.concat(array[i]), i + 1);
        p(t, i + 1);
    }

    var result = [] as T[][];
    p([], 0);
    return result;
}

function canSeatAll(ship: Ship, crew: CrewMember[]): CrewMember[] | false {
    if (!ship.battle_stations?.length || ship.battle_stations.length !== crew.length) return false;
    if (!crew.every(c => c.skill_order.some(so => ship.battle_stations?.some(bs => bs.skill === so)))) return false;

    let bl = ship.battle_stations.length;
    let bat = ship.battle_stations.map(sta => sta.skill);

    crew.sort((a, b) => {
        let ac = bat.filter(skill => a.skill_order.includes(skill)).length;
        let bc = bat.filter(skill => b.skill_order.includes(skill)).length;
        let r = ac - bc;
        if (r) return r;
        ac = bat.findIndex(skill => a.skill_order.includes(skill));
        bc = bat.findIndex(skill => b.skill_order.includes(skill));
        r = ac - bc;
        if (r) return r;
        return a.name.localeCompare(b.name);
    });

    for (let a = 0; a < 2; a++) {
        if (a) crew = [...crew].reverse();
        for (let i = 0; i < bl; i++) {
            let j = i;
            let p = 0;
            let tt = {} as {[key:string]: CrewMember};
            while(true) {
                if (crew[p].skill_order.some(so => ship.battle_stations![j].skill === so) && !tt[j]) {
                    tt[j] = crew[p];
                }
                p++;
                if (p >= crew.length) break;
                j++;
                if (j >= bl) j = 0;
                if (j === i) break;
            }
            if (Object.keys(tt).length === crew.length) return Object.values(tt);
        }        
    }

    return false;
}

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig, reportProgress: (data: { format: string, options?: any }) => boolean = () => true) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {
            const { ship, battle_mode, opponents, action_types, ability_types, defense, offense, ignore_skill } = options;
            const opponent = opponents?.length ? opponents[0] : undefined;
            
            let max_results = options.max_results ?? 100;
            let max_rarity = options.max_rarity ?? 5;
            let min_rarity = options.min_rarity ?? 1;
            let maxvalues = [0, 0, 0, 0, 0].map(o => [0, 0, 0, 0]);
            let power_depth = options.power_depth ?? 2;

            const workCrew = crewCopy(options.crew).filter((crew) => {
                if (!ignore_skill && !crew.skill_order.some(skill => ship.battle_stations?.some(bs => bs.skill === skill))) return false;
                if (crew.action.ability?.condition && !ship.actions?.some(act => act.status === crew.action.ability?.condition)) return false;
                
                if (action_types?.length) {
                    if (!action_types.some(at => crew.action.bonus_type === at)) return false;
                }
                if (ability_types?.length) {
                    if (!ability_types.some(at => crew.action.ability?.type === at)) return false;
                }

                if (crew.action.ability) {
                    let pass = crew.max_rarity <= max_rarity && crew.max_rarity >= min_rarity;
                    if (pass) {
                        if (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] < crew.action.bonus_amount) {
                            maxvalues[crew.max_rarity - 1][crew.action.bonus_type] = crew.action.bonus_amount;
                        }
                    }
                    return pass;
                }
                else {
                    return false;
                }                
            })
            .filter((crew) => {
                if (battle_mode.startsWith('fbb') && crew.action.limit) return false;
                if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - power_depth) && (!battle_mode.startsWith('fbb') || crew.action.ability?.type !== 2)) return false;
                return true;
            })
            .sort((a, b) => {
                let r = 0;

                // check for bonus abilities, first
                if (a.action.ability && b.action.ability) {
                    if (battle_mode.startsWith('fbb')) {
                        if ([1, 2, 5].includes(a.action.ability.type) && ![1, 2, 5].includes(b.action.ability.type)) return -1;
                        if ([1, 2, 5].includes(b.action.ability.type) && ![1, 2, 5].includes(a.action.ability.type)) return 1;
                    }
                    else {
                        if ([1, 5].includes(a.action.ability.type) && ![1, 5].includes(b.action.ability.type)) return -1;
                        if ([1, 5].includes(b.action.ability.type) && ![1, 5].includes(a.action.ability.type)) return 1;
                    }
                    if (a.action.ability.type === b.action.ability.type) {
                        r = a.action.ability.amount - b.action.ability.amount;
                        if (r) return r;
                        r = a.action.ability.condition - b.action.ability.condition;
                        if (r) return r;
                    }
                    else {
                        r = a.action.ability.type - b.action.ability.type;
                        if (r) return r;
                    }
                }
                else {
                    if (a.action.ability && !b.action.ability) return -1;
                    if (!a.action.ability && b.action.ability) return 1;
                }

                // check the bonus amount/type
                if (a.action.bonus_type === b.action.bonus_type) {
                    r = b.action.bonus_amount - a.action.bonus_amount;
                    if (r) return r;
                }
                else {
                    r = a.action.bonus_type - b.action.bonus_type;
                    if (r) return r;
                }

                // check durations
                r = a.action.initial_cooldown - b.action.initial_cooldown;
                if (r) return r;
                r = a.action.duration - b.action.duration;
                if (r) return r;
                r = a.action.cooldown - b.action.cooldown;
                if (r) return r;
                if (a.action.limit && !b.action.limit) return 1;
                if (!a.action.limit && b.action.limit) return -1;
                if (a.action.limit && b.action.limit) {
                    r = b.action.limit - a.action.limit;
                    if (r) return r;
                }

                // check passives
                if (a.ship_battle.crit_bonus && b.ship_battle.crit_bonus) {
                    r = b.ship_battle.crit_bonus - a.ship_battle.crit_bonus;
                }
                if (a.ship_battle.crit_chance && b.ship_battle.crit_chance) {
                    r = b.ship_battle.crit_chance - a.ship_battle.crit_chance;
                }
                if (a.ship_battle.accuracy && b.ship_battle.accuracy) {
                    r = b.ship_battle.accuracy - a.ship_battle.accuracy;
                }
                if (a.ship_battle.evasion && b.ship_battle.evasion) {
                    r = b.ship_battle.evasion - a.ship_battle.evasion;
                }

                // check other stats
                if (!r) {                    
                    r = Object.values(a.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0) - Object.values(b.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0)
                    if (!r) {
                        // !!
                        console.log(`completely identical stats! ${a.name}, ${b.name}`);
                    }
                }
                return r;
            })

            let seats = ship.battle_stations?.length;

            if (!seats) {
                reject("No battlestations");
                return;
            }

            const get_attacks = options.get_attacks && workCrew.length === seats;

            // let test_combo = ['tpring_spock_crew', 'torres_caretaker_crew', 'kirk_chances_crew', 'goodgey_crew'];
            // let find_crew = workCrew.filter(c => test_combo.includes(c.symbol) && c.max_rarity === (c as PlayerCrew).rarity);
            // find_crew.sort((a, b) => {
            //     return test_combo.findIndex(f => f === a.symbol) - test_combo.findIndex(f => f === b.symbol)
            // });

            // let test_run = getOverlaps(ship, find_crew, opponent, defense);

            //const crew_combos = makeAllCombos(workCrew.map(c => c.id), 60000, undefined, undefined, seats)?.filter(f => f.length === seats) as any as number[][];
            reportProgress({ format: 'ship.calc.generating_permutations_ellipses' });
            const crew_combos = getPermutations(workCrew, seats, (set) => canSeatAll(ship, set), 300000);

            let count = crew_combos.length;
            let i = 0;
            let progress = -1;
            let results = [] as ShipWorkerItem[];

            const processAttack = (attacks: AttackInstant[], crew_set: CrewMember[]) => {
                let result_crew = [] as CrewMember[];
                const ship = attacks[0].ship;

                ship.battle_stations?.forEach((bs) => {
                    for (let c of crew_set) {
                        if (!result_crew.includes(c)) {
                            if (c.skill_order.includes(bs.skill)) {
                                result_crew.push(c);
                                break;
                            }
                        }
                    }
                });

                const activations = attacks.reduce((p, n) => p + n.actions.length, 0);
                const attack = attacks.reduce((p, n) => p + n.attack, 0);
                const min_attack = attacks.reduce((p, n) => p + n.min_attack, 0);
                const max_attack = attacks.reduce((p, n) => p + n.max_attack, 0);
                const battle_time = attacks.length;            
                const weighted_attack = attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0);
                let highest_attack = 0;
                let high_attack_second = 0;
                
                attacks.forEach((attack) => {
                    if (attack.max_attack > highest_attack) {
                        highest_attack = attack.max_attack;
                        high_attack_second = attack.second + 1;
                    }
                });
                
                const arena_metric = (highest_attack / high_attack_second);

                results.push({
                    activations,
                    attack,
                    min_attack,
                    max_attack,
                    battle_time,
                    crew: result_crew,
                    percentile: 0,
                    ship: attacks[0].ship,
                    weighted_attack,
                    arena_metric,
                    attacks: get_attacks ? attacks : undefined
                });
            }

            const time = options.max_duration || (battle_mode.startsWith('fbb') ? 180 : 10);

            for (let combo of crew_combos) {
                if (!(i % 10)) {
                    let p = Math.round((i / count) * 100);

                    if (p !== progress) {
                        progress = p;
                        reportProgress({ format: 'ship.calc.calculating_pct_ellipses', options: { percent: `${p}` } });
                    }
                }
                
                let overlaps = iterateBattle(ship, combo, opponent, defense, offense, time);
                processAttack(overlaps, combo);
                if (!get_attacks) overlaps.length = 0;
                i++;
            }

            reportProgress({ format: 'ship.calc.sorting_finalizing_ellipses' });
            if (battle_mode.startsWith('fbb')) {
                results.sort((a, b) => {
                    let r = 0;
                    let aa: number;
                    let ba: number;
                    aa = a.attack;
                    ba = b.attack;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.battle_time;
                    ba = b.battle_time;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.weighted_attack;
                    ba = b.weighted_attack;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.activations;
                    ba = b.activations;
                    r = ba - aa;
                    if (r) return r;
                    return r;
                });
    
            }
            else {
                results.sort((a, b) => {
                    let r = 0;
                    let aa: number;
                    let ba: number;
                    aa = a.arena_metric;
                    ba = b.arena_metric;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.weighted_attack;
                    ba = b.weighted_attack;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.attack;
                    ba = b.attack;
                    r = ba - aa;
                    if (r) return r;
                    aa = a.activations;
                    ba = b.activations;
                    r = ba - aa;
                    if (r) return r;
                    return r;
                });
            }      

            results = results.slice(0, max_results);
            results.forEach((result) => {
                if (battle_mode.startsWith('fbb')) {
                    let max = results[0].attack;
                    result.percentile = (result.attack / max) * 100;
                }
                else {
                    let max = results[0].arena_metric;
                    result.percentile = (result.arena_metric / max) * 100;
                }
            });
            
            resolve({
                ships: results
            });

        });
    },
    bestFinder: (options: MultiShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {

            resolve({
                ships: []
            })

        });
    }

}

export default ShipCrewWorker;