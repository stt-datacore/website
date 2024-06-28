import { CrewMember } from "../model/crew";
import { MultiShipWorkerConfig, Ship, ShipAction, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship"
import { crewCopy, oneCrewCopy } from "../utils/crewutils";
import { makeAllCombos } from "../utils/misc";

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

export interface SlopeDetail { chance: number, slope: number | undefined }

export const DetailCritTable = {
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

export const CritTable = {
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

function getCritChance(n: number) {
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

export const PowerTable = {
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

export function sumAttack(ship: Ship, actions: ShipAction[], opponent?: Ship) {
    let base_attack = ship.attack;
    let base_acc = ship.accuracy;
    let base_eva = ship.evasion;
    let bonus = ship.crit_bonus / (100 * 100);
    let chance = getCritChance(ship.crit_chance) / 100;
    let sum_attack = base_attack;
    let highest_dmg = 0;
    let highest_acc = 0;
    let sum_acc = base_acc;

    actions.forEach((action) => {
        if (action.ability?.type === 4) {
            chance += (getCritChance(action.ability.amount) / 100);
        }
        else if (action.ability?.type === 5) {
            bonus += (action.ability.amount / (100 * 100));
        }
        if (action.bonus_type === 0) {
            if (highest_dmg < action.bonus_amount) {
                highest_dmg = action.bonus_amount;
            }
        }
        if (action.bonus_type === 2) {
            if (highest_acc < action.bonus_amount) {
                highest_acc = action.bonus_amount;
            }
        }
    });

    if (highest_dmg) {
        sum_attack += PowerTable[highest_dmg];
    }
    if (highest_acc) {
        sum_acc += PowerTable[highest_acc];
    }

    if (opponent) {
        sum_attack *= hitChance(sum_acc, opponent.evasion);
    }
    else {
        sum_attack *= hitChance(sum_acc, base_eva);
    }

    sum_attack += ((sum_attack * bonus) * chance);
    return sum_attack;
}

export function hitChance(acc: number, opp_eva: number) {
    return 1 / (1 + Math.exp(-1.9 * (acc / opp_eva - 0.55)));
}

export function hitsPerSecond(ship: Ship) {
    return ship.attacks_per_second;
}

export interface Attacks {
    actions: ShipAction[];
    second: number;
    attack: number;
    ship: Ship;
}

export function getOverlaps(ship: Ship, crew: CrewMember[], opponent?: Ship) {
    ship = {...ship};
    if (crew) {        
        crew.forEach((c) => {
            ship.accuracy += c.ship_battle.accuracy ?? 0;
            ship.evasion += c.ship_battle.evasion ?? 0;
            ship.crit_bonus += c.ship_battle.crit_bonus ?? 0;
            ship.crit_chance += c.ship_battle.crit_chance ?? 0;
        });    
    }
    
    let hull = ship.hull;
    let orighull = ship.hull;

    const attacks = [] as Attacks[];
    let allactions = [...ship.actions ?? [], ... crew.map(c => c.action) ];
    let uses = allactions.map(a => 0);
    let state_time = allactions.map(a => 0);
    let inited = allactions.map(a => false);
    let atm = 1;
    const current = [] as ShipAction[];


    for (let sec = 0; sec < 300; sec++) {
        let highhr = allactions.filter((f, idx) => f.ability?.type === 2 && (!f.limit || uses[idx] < f.limit)).map(m => m.ability?.amount ?? 0).reduce((p, n) => p > n ? p : n, 0);
        atm = 1;
        
        for (let action of allactions) {
            let actidx = allactions.findIndex(f => f === action);
            if (!inited[actidx] && action.initial_cooldown <= sec && !current.includes(action)) {
                if (!action.ability?.condition || current.some(act => act.status === action.ability?.condition)) {
                    if (action.ability?.type === 1) {
                        atm += (action.ability.amount / 100);
                    }
                    else if (action.ability?.type === 2) {
                        if (current.some(c => c.ability?.type === 2)) continue;
                        if ((hull / orighull) > (action.ability.amount / 100)) continue;
                        hull += (orighull * (action.ability.amount / 100));
                    }
                    current.push(action);
                    uses[actidx]++;
                    state_time[actidx] = 1;
                    inited[actidx] = true;
                }
            }
            else if (inited[actidx] && current.includes(action)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.duration) {
                    let idx = current.findIndex(f => f === action);
                    if (idx != -1) current.splice(idx, 1)
                    state_time[actidx] = 1;
                }
            }
            else if (inited[actidx] && !current.includes(action) && (!action.limit || uses[actidx] < action.limit)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.cooldown) {
                    if (!action.ability?.condition || current.some(act => act.status === action.ability?.condition)) {
                        current.push(action);
                        uses[actidx]++;
                        state_time[actidx] = 1;
                        inited[actidx] = true;
                        if (action.ability?.type === 1) {
                            atm += (action.ability.amount / 100);
                        }
                        else if (action.ability?.type === 2) {
                            hull += (orighull * (action.ability.amount / 100));
                        }
                    }
                }
            }
        }

        let sumattack = sumAttack(ship, current, opponent);
        let atk = sumattack * ship.attacks_per_second;
        if (atm > 1) {
            atk += sumattack * (atm - 1);
        }

        if (opponent) {
            hull -= (opponent.attack * opponent.attacks_per_second * hitChance(opponent.accuracy, ship.evasion));
        }
        else {
            hull -= atk;
        }        

        if (hull <= 0) break;

        attacks.push({
            actions: [...current],
            second: sec,
            attack: atk,
            ship
        });
    }

    return attacks;
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
    calc: (options: ShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {
            const { ship, battle_mode, opponents, action_types, ability_types } = options;
            const opponent = opponents?.length ? opponents[0] : undefined;
            let max_results = options.max_results ?? 10;
            let max_rarity = options.max_rarity ?? 5;
            let min_rarity = options.min_rarity ?? 1;
            let maxvalues = [0, 0, 0, 0, 0].map(o => [0, 0, 0, 0]);
            let power_depth = options.power_depth ?? 2;

            const workCrew = crewCopy(options.crew).filter((crew) => {
                if (!crew.skill_order.some(skill => ship.battle_stations?.some(bs => bs.skill === skill))) return false;
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
            .sort((a, b) => {
                let r = 0;
                if (a.action.ability && !b.action.ability) return -1;
                if (!a.action.ability && b.action.ability) return 1;
                if (a.action.ability && b.action.ability) {
                    if (battle_mode.startsWith('fbb')) {
                        if ([1, 2].includes(a.action.ability.type) && ![1, 2].includes(b.action.ability.type)) return -1;
                        if ([1, 2].includes(b.action.ability.type) && ![1, 2].includes(a.action.ability.type)) return 1;
                        if ([4, 5].includes(a.action.ability.type) && ![4, 5].includes(b.action.ability.type)) return -1;
                        if ([4, 5].includes(b.action.ability.type) && ![4, 5].includes(a.action.ability.type)) return 1;    
                    }
                    r = a.action.ability.type - b.action.ability.type;
                    if (r) return r;
                    r = a.action.ability.amount - b.action.ability.amount;
                    if (r) return r;
                    r = a.action.ability.condition - b.action.ability.condition;
                    if (r) return r;
                }
                if (a.ship_battle.crit_bonus && b.ship_battle.crit_bonus) {
                    r = b.ship_battle.crit_bonus - a.ship_battle.crit_bonus;
                }
                if (a.ship_battle.crit_chance && b.ship_battle.crit_chance) {
                    r = b.ship_battle.crit_chance - a.ship_battle.crit_chance;
                }
                r = b.action.bonus_amount - a.action.bonus_amount;
                if (r) return r;
                r = a.action.bonus_type - b.action.bonus_type;
                if (r) return r;
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
                if (!r) {
                    // console.log(`completely identical stats! ${a.name}, ${b.name}`)
                    r = Object.values(a.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0) - Object.values(b.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0)
                    if (!r) {
                        console.log(`completely identical stats! ${a.name}, ${b.name}`);
                    }
                }
                return r;
            })
            .filter((crew) => {
                if (battle_mode.startsWith('fbb') && crew.action.limit) return false;
                if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - power_depth) && (!battle_mode.startsWith('fbb') || crew.action.ability?.type !== 2)) return false;
                return true;
            });

            let seats = ship.battle_stations?.length;

            if (!seats) {
                reject("No battlestations");
                return;
            }
            
            //const crew_combos = makeAllCombos(workCrew.map(c => c.id), 60000, undefined, undefined, seats)?.filter(f => f.length === seats) as any as number[][];
            const crew_combos = getPermutations(workCrew, seats, (set) => canSeatAll(ship, set), 250000);
            let attacks = [] as { crew: number[], attacks: Attacks[] }[];

            for (let combo of crew_combos) {
                attacks.push({
                    crew: combo.map(cb => cb.id!),
                    attacks: getOverlaps(ship, combo, opponent)
                });
            }

            if (!battle_mode.startsWith('fbb')) {
                attacks.forEach((attack) => {
                    attack.attacks.splice(9)
                });
            }      

            attacks.sort((a, b) => {
                let r = 0;
                let aa: number;
                let ba: number;
                if (battle_mode.startsWith('fbb')) {
                    aa = a.attacks.length;
                    ba = b.attacks.length;
                    r = ba - aa;
                    if (r) return r;
                }
                aa = a.attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0) / a.attacks.length;
                ba = b.attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0) / b.attacks.length;
                r = ba - aa;
                if (r) return r;
                aa = a.attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0);
                ba = b.attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0);
                r = ba - aa;
                if (r) return r;
                aa = a.attacks.length;
                ba = b.attacks.length;
                r = ba - aa;
                if (r) return r;
                aa = a.attacks.reduce((p, n) => p + n.actions.length, 0);
                ba = b.attacks.reduce((p, n) => p + n.actions.length, 0);                
                r = ba - aa;
                if (r) return r;
                return r;
            });

            let attack_crew = attacks.slice(0, max_results).map(a => a.crew.map(c => workCrew.find(f => f.id === c)!));
            let results = [] as ShipWorkerItem[];
            
            let attack_numbers = attack_crew.map(c => 0);

            attack_crew.forEach((crew_set, idx) => {
                attack_numbers[idx] = attacks[idx].attacks.reduce((p, n) => p + (n.attack / (n.second + 1)), 0) / attacks[idx].attacks.length;
                let result_crew = [] as CrewMember[];
                let ship = attacks[idx].attacks[0].ship;
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
                
                results.push({
                    ship,
                    crew: result_crew,
                    attack: attack_numbers[idx],
                    battle_time: attacks[idx].attacks.length
                });
            });

            let max = attack_numbers[0];

            results.forEach((result) => {
                result.attack = (result.attack / max) * 100;
            })
            
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