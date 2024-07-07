import { CrewMember } from "../model/crew";
import { ShipAction, Ship, AttackInstant } from "../model/ship";
import { setupShip } from "../utils/shiputils";

export interface PowerStat {    
    attack: number;
    evasion: number;
    accuracy: number;
    
}

export interface InstantPowerInfo {
    condensed: {
        base: PowerStat;
        ability: PowerStat;        
        active: PowerStat;
        penalty: PowerStat;
        crit_bonus: number;
        crit_chance: number;
    }
    computed: {
        active: PowerStat;
        crit_bonus: number;
        crit_chance: number;
        hit_chance: number;
        attack: {
            base: number;
            with_bonus: number;
            with_bonus_and_chance: number;
        }
    }
    grants: number[]
}


export interface ChargeAction extends ShipAction {
    orig_bonus?: number;
    orig_ability_amount?: number;
    orig_cooldown?: number;
    current_phase?: number;
    comes_from: 'ship' | 'crew';
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

export const CritTiers = Object.keys(CritTable).map(m => Number.parseInt(m));

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

export function getShipNumber(raw_value: number) {
    let final = 0;
    Object.entries(PowerTable).forEach(([condensed, power]) => {
        if (raw_value >= power) final = Number.parseInt(condensed);
    });
    return final;
}

export function immediateDamage(base: number, current: number, damage_number: number) {
    let f = PowerTable[current] - PowerTable[base];
    return f * damage_number;
}

export function getCritChance(n: number) {
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

export function hitChance(acc: number, opp_eva: number) {
    return 1 / (1 + Math.exp(-1.9 * (acc / opp_eva - 0.55)));
}

export function getInstantPowerInfo(rate: number, ship: Ship, actions: (ShipAction | false)[], opponent?: Ship, offense?: number): InstantPowerInfo {
    offense ??= 0;     

    let o_attack = ship.attack * (1 + offense);
    let o_evasion = ship.evasion;
    let o_accuracy = ship.accuracy;

    let c_crit_chance = ship.crit_chance;
    let c_crit_bonus = ship.crit_bonus;
    let c_b_attack = getShipNumber(o_attack);
    let c_b_evasion = getShipNumber(o_evasion);
    let c_b_accuracy = getShipNumber(o_accuracy);
    let c_a_attack = 0;
    let c_a_evasion = 0;
    let c_a_accuracy = 0;
    let c_p_attack = 0;
    let c_p_evasion = 0;
    let c_p_accuracy = 0;

    let base = {
        attack: c_b_attack,
        evasion: c_b_evasion,
        accuracy: c_b_accuracy
    };
    
    let c = actions.length;
    let action: ShipAction;
    for (let i = 0; i < c; i++) {
        if (actions[i] === false) continue;
        else action = actions[i] as ShipAction;
        if (action.ability?.type === 4) {
            c_crit_chance += action.ability.amount;
        }
        else if (action.ability?.type === 5) {
            c_crit_bonus += action.ability.amount;
        }
        if (action.bonus_type === 0) {
            if (action.ability?.type === 0) {
                if (c_a_attack < action.bonus_amount + action.ability.amount) {
                    c_a_attack = action.bonus_amount + action.ability.amount;
                }
            }
            else if (c_a_attack < action.bonus_amount) {
                c_a_attack = action.bonus_amount;
            }
        }
        else if (action.bonus_type === 1) {
            if (c_a_evasion < action.bonus_amount) {
                c_a_evasion = action.bonus_amount;
            }
        }
        else if (action.bonus_type === 2) {
            if (c_a_accuracy < action.bonus_amount) {
                c_a_accuracy = action.bonus_amount;
            }
        }
        if (action.penalty) {
            if (action.penalty.type === 0) {
                if (c_p_attack < action.bonus_amount) {
                    c_p_attack = action.penalty.amount;
                }
            }
            else if (action.penalty.type === 1) {
                if (c_p_evasion < action.penalty.amount) {
                    c_p_evasion = action.penalty.amount;
                }
            }
            else if (action.penalty.type === 2) {
                if (c_p_accuracy < action.penalty.amount) {
                    c_p_accuracy = action.penalty.amount;
                }
            }
        }
    }

    
    // record these seperately in case needed
    let ability = {
        attack: c_a_attack,
        evasion: c_a_evasion,
        accuracy: c_a_accuracy
    }

    let penalty = {
        attack: c_p_attack,
        evasion: c_p_evasion,
        accuracy: c_p_accuracy
    }
    
    let grants = actions.filter(f => f && f.status).map(m => (m as ShipAction).status!);

    // position
    if (grants.includes(1)) {
        c_crit_chance += 1000;
    }

    c_a_attack -= c_p_attack;
    c_a_evasion -= c_p_evasion;
    c_a_accuracy -= c_p_accuracy;

    // add the condensed boosts to the base condensed boosts to get the active condensed boosts:
    c_a_attack += c_b_attack;
    c_a_evasion += c_b_evasion;
    c_a_accuracy += c_b_accuracy;

    let active = {
        attack: c_a_attack,
        evasion: c_a_evasion,
        accuracy: c_a_accuracy
    }

    // use the ship's base numbers as reported by the game, and add the power table reference for the active boosts.
    o_attack += (PowerTable[c_a_attack] - PowerTable[c_b_attack]);
    o_evasion += (PowerTable[c_a_evasion] - PowerTable[c_b_evasion]);
    o_accuracy += (PowerTable[c_a_accuracy] - PowerTable[c_b_accuracy]);

    let o_crit_chance = getCritChance(c_crit_chance) / 100;
    c_crit_bonus = Math.floor(c_crit_bonus / 100) * 100;
    let o_crit_bonus = c_crit_bonus /= 10000;

    // boarding
    if (grants.includes(4)) {
        o_attack += (o_attack * 0.50);
    }

    let o_hit_chance = hitChance(o_accuracy, opponent?.evasion ?? o_evasion);
    let ship_mul = (ship.attacks_per_second / rate);

    let o_o_attack = {
        base: o_attack * o_hit_chance * ship_mul,
        with_bonus: (o_attack + (o_attack * o_crit_bonus)) * ship_mul,
        with_bonus_and_chance: (o_attack + (o_attack * o_crit_bonus * o_crit_chance)) * ship_mul * o_hit_chance
    }

    return {
        condensed: {
            base,
            ability,
            penalty,
            active,
            crit_bonus: c_crit_bonus,
            crit_chance: c_crit_chance,
        },
        computed: {
            active: {
                attack: o_attack,
                accuracy: o_accuracy,
                evasion: o_evasion
            },
            attack: o_o_attack,
            hit_chance: o_hit_chance,
            crit_bonus: o_crit_bonus,
            crit_chance: o_crit_chance,
        },
        grants
    };   
}

export interface IterateBattleConfig {
    rate: number, 
    fbb_mode: boolean, 
    input_ship: Ship, 
    crew: CrewMember[], 
    opponent?: Ship, 
    defense?: number, 
    offense?: number, 
    time?: number, 
    activation_offsets?: number[], 
    fixed_delay?: number, 
    simulate?: boolean;
}

export function iterateBattle(rate: number, fbb_mode: boolean, input_ship: Ship, crew: CrewMember[], opponent?: Ship, defense?: number, offense?: number, time = 180, activation_offsets?: number[], fixed_delay = 0.4, simulate = false) {
    let ship = setupShip(input_ship, crew, false) || undefined;
    defense ??= 0;
    offense ??= 0;
    time *= rate;
    if (!ship) return [];

    let hull = ship.hull;
    let orighull = ship.hull;

    const attacks = [] as AttackInstant[];
    crew.forEach(c => c.action.crew = c.id!);

    let allactions = JSON.parse(JSON.stringify([...ship.actions ?? [], ...crew.map(c => c.action)])) as ChargeAction[];

    const delay = () => {
        if (simulate) {
            return 0.2 + (Math.random() * 0.4);
        }
        else {
            return fixed_delay;
        }
    }

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
        if (action.comes_from === 'crew' && activation_offsets?.length && activation_offsets.length === input_ship.battle_stations?.length) {
            let x = i - (ship!.actions?.length ?? 0);
            if (activation_offsets[x] && activation_offsets[x] > action.initial_cooldown) {
                action.initial_cooldown = activation_offsets[x];
            }            
        }
    });

    let alen = allactions.length;
    let uses = allactions.map(a => 0);
    let state_time = allactions.map(a => 0);
    let inited = allactions.map(a => false);
    let active = allactions.map(a => false);

    const currents = allactions.map(m => false as false | ShipAction)

    let cloaked = false;
    let oppoattack = 0;

    const resetAction = (action: ChargeAction) => {
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

    const bumpAction = (action: ChargeAction, phase: number) => {
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

    const processChargePhases = (action: ChargeAction, actidx: number) => {
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

    const activate = (action: ChargeAction, actidx: number) => {
        let immediate = false as boolean | number;
        if (!action.ability?.condition || currents.some(act => typeof act !== 'boolean' && act.status === action.ability?.condition)) {
            if (action.ability?.type === 1) {
                immediate = (action.ability.amount / 100);
            }
            else if (action.ability?.type === 2) {
                let pctneed = 1 - (hull / orighull);
                let pctfix = action.ability.amount / 100;
                if (pctneed >= pctfix || pctneed >= 0.3) {
                    hull += (orighull * pctfix);
                    if (action.charge_phases) {
                        resetAction(action);
                    }
                }
                else {
                    processChargePhases(action, actidx);
                    return false;
                }
            }
            else if (action.ability?.type === 10) {
                let time = action.ability.amount;
                for (let idx = 0; idx < alen; idx++) {
                    if (!active[idx] && inited[idx]) {
                        if (!allactions[idx].current_phase || allactions[idx].comes_from === 'ship') {
                            state_time[idx] += time;
                        }
                    }
                }
            }

            if (immediate === false) immediate = true;
            currents[actidx] = action;
            cloaked = action.status === 2;
            uses[actidx]++;
            state_time[actidx] = 1;
            inited[actidx] = true;
            active[actidx] = true;
        }
        else {
            processChargePhases(action, actidx);
            return false;
        }
        return immediate;
    }

    const deactivate = (action: ShipAction, actidx: number) => {
        state_time[actidx] = 1;
        active[actidx] = false;
        currents[actidx] = false;
    }
    
    let immediates = [] as { base: number, max: number, standard: number }[];
    let activation = 0 as number | boolean;    
    let ca = 0;
    let powerInfo: InstantPowerInfo | null = null;
    let r_inc = 1 / rate;
    let actidx = 0;
    let act_cnt = currents.length;
    let activated = false;
    let sec = 0;
    let action = null as null | ChargeAction;

    for (let inc = 1; inc <= time; inc++) {
        sec = Math.round((inc / rate) * 10) / 10;
        
        ca = 0;
        powerInfo = null;
        activated = false;

        for (actidx = 0; actidx < act_cnt; actidx++) {
            action = allactions[actidx];

            if (!inited[actidx]) {
                state_time[actidx] += r_inc;
                if (!activated && state_time[actidx] > action.initial_cooldown + (delay())) {
                    activation = activate(action, actidx);
                }
            }
            else if (inited[actidx] && currents[actidx]) {
                state_time[actidx] += r_inc;
                if (state_time[actidx] > action.duration) {
                    deactivate(action, actidx);
                }
            }
            else if (inited[actidx] && !currents[actidx] && (!action.limit || uses[actidx] < action.limit)) {
                state_time[actidx] += r_inc;
                if (!activated && state_time[actidx] > action.cooldown + (delay())) {
                    activation = activate(action, actidx);
                }
            }

            if (activation) {

                // hold back other activations since one was activated
                // for (let idx = 0; idx < act_cnt; idx++) {
                //     if (!currents[idx] && idx !== actidx) state_time[idx] -= r_inc;
                // }
                
                powerInfo = getInstantPowerInfo(rate, ship, currents, opponent, offense);
                
                if (typeof activation === 'number') {
                    immediates.push({
                        base: powerInfo.computed.attack.base * activation,
                        max: powerInfo.computed.attack.with_bonus * activation,
                        standard: powerInfo.computed.attack.with_bonus_and_chance * activation
                    });
                }

                activation = false;
                activated = true;
            }
        }
        
        if (!powerInfo) {            
            powerInfo = getInstantPowerInfo(rate, ship, currents, opponent, offense);
        }
        
        let base_attack = powerInfo.computed.attack.base;
        let standard_attack = powerInfo.computed.attack.with_bonus_and_chance;
        let max_attack = powerInfo.computed.attack.with_bonus;

        if (immediates.length) {
            for (let imm of immediates) {
                // just the immediate
                base_attack += imm.base;
                
                // immediate with big crit
                max_attack += imm.max;

                // immediate with crit and chance
                standard_attack += imm.standard;
            }

            immediates.length = 0;
        }
        
        let lasthull = hull;

        if (fbb_mode || !cloaked) {
            let mul = currents.filter(f => f && f.ability?.type === 11).map(m => (m as ShipAction).ability?.amount).reduce((p, n) => p! + n!, 0) || 0;
            mul = 1 - (mul / 100);

            if (opponent) {
                oppoattack = (opponent.attack * (opponent.attacks_per_second / rate) * hitChance(opponent.accuracy, powerInfo.computed.active.evasion));
            }
    
            if (!oppoattack) {
                hull -= (((standard_attack - (standard_attack * (fbb_mode ? defense : 1))) * mul) / rate);
            }
            else {
                hull -= (((oppoattack - (oppoattack * (fbb_mode ? defense : 1))) * mul));
            }

            if (hull <= 0) break;
        }
        
        attacks.push({
            actions: currents.filter(f => f !== false),
            damage: lasthull - hull,
            second: sec,
            attack: standard_attack,
            min_attack: base_attack,
            max_attack: max_attack,
            ship
        });
    }

    ship = undefined;
    return attacks;
}

// export function iterateBattleBatch(config: IterateBattleConfig, sets: CrewMember[][]): Promise<AttackInstant[][]> {
//     return new Promise<AttackInstant[][]>((resolve, reject) => {
//         const workerset = [] as Worker[];
//         const results = [] as AttackInstant[][];

//         const c = sets.length;
//         let replyCount = 0;

//         const workerReply = (response) => {
//             replyCount++;
//             results.push(response.data as AttackInstant[]);

//             if (replyCount >= c) {
//                 workerset.forEach((worker) => worker.removeEventListener('message', workerReply));
//                 resolve(results);
//             }
//         }

//         for (let i = 0; i < c; i++) {
//             let newwork = new Worker(new URL('./battleworker.js', import.meta.url));
//             newwork.addEventListener('message', workerReply);
//             workerset.push(newwork);
//             newwork.postMessage({ data: { ...config, set: sets[i] } });
//         }

//         while (replyCount < c) {
//             let z = 0;
//         }
//         workerset.forEach((worker) => worker.removeEventListener('message', workerReply));
//     });
// }


export function canSeatAll(ship: Ship, crew: CrewMember[], ignore_skill: boolean): CrewMember[] | false {
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
            let tt = {} as { [key: string]: CrewMember };
            while (true) {
                if (ignore_skill || (crew[p].skill_order.some(so => ship.battle_stations![j].skill === so) && !tt[j])) {
                    tt[j] = crew[p];
                }
                p++;
                if (p >= crew.length) break;
                j++;
                if (j >= bl) j = 0;
                if (j === i) break;
            }

            if (Object.keys(tt).length === crew.length) {
                let sorted = Object.values(tt);
                const swapgood = (a: number, b: number) => {
                    if (ignore_skill || (sorted[a].skill_order.includes(bat[b]) && sorted[b].skill_order.includes(bat[a]))) {
                        let c = sorted[a];
                        sorted[a] = sorted[b];
                        sorted[b] = c;
                    }
                }
                for (let i = 0; i < bl; i++) {
                    for (let j = 0; j < bl; j++) {
                        if (i === j) continue;
                        let a = i < j ? i : j;
                        let b = j > i ? j : i;
                        if (sorted[a].action.ability?.type === 1 && sorted[b].action.ability?.type === 5) {
                            swapgood(a, b);
                        }
                    }
                }
                return sorted;
            }
        }
    }

    return false;
}
