import { CrewMember } from "../model/crew";
import { MultiShipWorkerConfig, Ship, ShipAction, ShipWorkerConfig, ShipWorkerResults } from "../model/ship"
import { makeAllCombos } from "../utils/misc";

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

function getCritChance(n: number) {
    if (n in CritTable) return CritTable[n];    
    let steps = Object.keys(CritTable).map(m => Number.parseInt(m));

    let c = steps.length;
    for (let i = 0; i < c - 1; i++) {
        if (n >= steps[i] && n <= steps[i + 1]) {
            let detail = DetailCritTable[steps[i]];
            if (detail && detail.slope) {
                let mm = n - steps[i];
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

export function sumAttack(ship: Ship, actions: ShipAction[]) {
    let base_attack = ship.attack;
    let bonus = ship.crit_bonus / (100 * 100);
    let chance = getCritChance(ship.crit_chance) / 100;
    let sum_attack = base_attack;
    let highest = 0;
    actions.forEach((action) => {
        if (action.ability?.type === 4) {
            chance += (getCritChance(action.ability.amount) / 100);
        }
        else if (action.ability?.type === 5) {
            bonus += (action.ability.amount / (100 * 100));
        }
        if (action.bonus_type === 0) {
            if (highest < action.bonus_amount) {
                highest = action.bonus_amount;
            }            
        }
    });

    if (highest) {
        sum_attack += PowerTable[highest];
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
}

export function getOverlaps(ship: Ship, crew: CrewMember[]) {
    ship = { ...ship };
    crew.forEach((c) => {
        ship.accuracy += c.ship_battle.accuracy ?? 0;
        ship.evasion += c.ship_battle.evasion ?? 0;
        ship.crit_bonus += c.ship_battle.crit_bonus ?? 0;
        ship.crit_chance += c.ship_battle.crit_chance ?? 0;
    });
    
    let hull = ship.hull;
    let orighull = ship.hull;

    let attacks = [] as Attacks[];
    let allactions = [...ship.actions ?? [], ... crew.map(c => c.action) ];
    let uses = allactions.map(a => 0);
    let state_time = allactions.map(a => 0);
    let inited = allactions.map(a => false);
    let current = [] as ShipAction[];
    
    for (let sec = 0; sec < 300; sec++) {
        let atm = 1;

        for (let action of allactions) {
            let actidx = allactions.findIndex(f => f === action);
            if (!inited[actidx] && action.initial_cooldown <= sec && !current.includes(action)) {
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
            else if (inited[actidx] && current.includes(action)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.duration) {
                    current = current.filter(f => f !== action);
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
        let sumattack = sumAttack(ship, current);
        let atk = sumattack * ship.attacks_per_second;
        if (atm > 1) {
            atk += sumattack * (atm - 1);
        }

        hull -= atk;
        if (hull <= 0) break;

        attacks.push({
            actions: [...current],
            second: sec,
            attack: atk
        });
    }

    return attacks;
}

function canSeatAll(ship: Ship, crew: CrewMember[]) {
    if (!ship.battle_stations?.length || ship.battle_stations.length !== crew.length) return false;
    if (!crew.every(c => c.skill_order.some(so => ship.battle_stations?.some(bs => bs.skill === so)))) return false;

    let bl = ship.battle_stations.length;
    for (let i = 0; i < bl; i++) {
        let j = i;
        let p = 0;
        let tt = {};
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
        if (Object.keys(tt).length === crew.length) return true;
    }    

    return false;
}

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {
            const { ship, crew, battle_mode, opponents, action_types, ability_types } = options;
            const max_rarity = options.max_rarity ?? 5;
            const min_rarity = options.min_rarity ?? 1;

            const workCrew = crew.filter((crew) => {
                if (action_types?.length) {
                    if (!action_types.some(at => crew.action.bonus_type === at)) return false;
                }
                if (ability_types?.length) {
                    if (!ability_types.some(at => crew.action.ability?.type === at)) return false;
                }
                if (crew.action.ability?.condition && !ship.actions?.some(act => act.status === crew.action.ability?.condition)) return false;
                
                if (crew.action.bonus_type === 0 || [4, 5, 1].includes(crew.action.ability?.type ?? -1)) {
                    return crew.max_rarity <= max_rarity && crew.max_rarity >= min_rarity;
                }
                else {
                    return false;
                }                
            });

            let seats = ship.battle_stations?.length
            if (!seats) {
                reject("No battlestations");
                return;
            }
            
            const crew_combos = makeAllCombos(workCrew.map(c => c.id), 50000, undefined, undefined, seats)?.filter(f => f.length === seats) as any as number[][];

            let attacks = [] as { crew: number[], attacks: Attacks[] }[];

            for (let combo of crew_combos) {
                let crew = combo.map(cb => workCrew.find(f => f.id === cb)!);
                if (!canSeatAll(ship, crew)) continue;

                attacks.push({
                    crew: combo,
                    attacks: getOverlaps(ship, crew)
                });
            }

            if (battle_mode !== 'fbb') {
                attacks.forEach((attack) => {
                    attack.attacks.splice(9)
                })
            }

            attacks.sort((a, b) => {
                let aa = a.attacks.map(a => a.attack).reduce((p, n) => p + n, 0);
                let ba = b.attacks.map(b => b.attack).reduce((p, n) => p + n, 0);
                return ba - aa;
            });

            let result = {
                ship,
                crew: attacks[0].crew.map(c => workCrew.find(f => f.id === c)!)
            };

            resolve({
                ships: [result]
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