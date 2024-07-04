import { CrewMember } from "../model/crew";
import { AttackInstant, MultiShipWorkerConfig, Ship, ShipAction, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship"
import { crewCopy } from "../utils/crewutils";
import { compareShipResults, setupShip } from "../utils/shiputils";

interface PowerStat {    
    attack: number;
    evasion: number;
    accuracy: number;
    
}

interface InstantPowerInfo {
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


interface ChargeAction extends ShipAction {
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

function getShipNumber(raw_value: number) {
    let final = 0;
    Object.entries(PowerTable).forEach(([condensed, power]) => {
        if (raw_value >= power) final = Number.parseInt(condensed);
    });
    return final;
}

function immediateDamage(base: number, current: number, damage_number: number) {
    let f = PowerTable[current] - PowerTable[base];
    return f * damage_number;
}

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

function hitChance(acc: number, opp_eva: number) {
    return 1 / (1 + Math.exp(-1.9 * (acc / opp_eva - 0.55)));
}

function getInstantPowerInfo(rate: number, ship: Ship, actions: ShipAction[], opponent?: Ship, offense?: number): InstantPowerInfo {
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
    
    actions.forEach((action) => {
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
    });
    
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
    
    let grants = actions.filter(f => f.status).map(m => m.status!);

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
        with_bonus_and_chance: (o_attack + (o_attack * o_crit_bonus * o_crit_chance)) * ship_mul
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

    const current = [] as ShipAction[];

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
        let immediate = 0;
        if (!action.ability?.condition || current.some(act => act.status === action.ability?.condition)) {
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
                    return 0;
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
            current.push(action);
            cloaked = action.status === 2;
            uses[actidx]++;
            state_time[actidx] = 1;
            inited[actidx] = true;
            active[actidx] = true;
        }
        else {
            processChargePhases(action, actidx);
            return 0;
        }
        return immediate;
    }

    const deactivate = (action: ShipAction, actidx: number) => {
        let idx = current.findIndex(f => f === action);
        if (idx != -1) current.splice(idx, 1)
        state_time[actidx] = 1;
        active[actidx] = false;
    }
    
    let immediates = [] as { base: number, max: number, standard: number }[];
    let immediate = 0;
    let max = allactions.length;
    let ca = 0;
    let powerInfo: InstantPowerInfo | undefined = undefined;

    for (let inc = 1; inc <= time; inc++) {
        let sec = Math.round((inc / rate) * 10) / 10;
        ca = 0;
        powerInfo = undefined;
        for (let action of allactions) {
            let actidx = allactions.findIndex(f => f === action);
            if (!inited[actidx] && sec >= action.initial_cooldown + delay() && !current.includes(action)) {
                immediate = activate(action, actidx);
            }
            else if (inited[actidx] && current.includes(action)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.duration) {
                    deactivate(action, actidx);
                }
            }
            else if (inited[actidx] && !current.includes(action) && (!action.limit || uses[actidx] < action.limit)) {
                state_time[actidx]++;
                if (state_time[actidx] > action.cooldown + delay()) {
                    immediate = activate(action, actidx);
                }
            }

            ca++;
            if (immediate) { 
                powerInfo = getInstantPowerInfo(rate, ship, current, opponent, offense);
                let imm = immediateDamage(powerInfo.condensed.base.attack, powerInfo.condensed.active.attack, immediate);
                let imm_norm = imm * hitChance(powerInfo.computed.active.accuracy, opponent?.evasion ?? powerInfo.computed.active.evasion);
                
                immediates.push({
                    base: imm_norm,
                    max: imm * (1 + powerInfo.computed.crit_bonus),
                    standard: imm * (1 + (powerInfo.computed.crit_bonus)) * powerInfo.computed.crit_chance
                });
                immediate = 0;
            }
            else if (ca >= max) {
                powerInfo = getInstantPowerInfo(rate, ship, current, opponent, offense);
            }
        }
        
        if (!powerInfo) {
            powerInfo = getInstantPowerInfo(rate, ship, current, opponent, offense);
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
            let mul = current.filter(f => f.ability?.type === 11).map(m => m.ability?.amount).reduce((p, n) => p! + n!, 0) || 0;
            mul = 1 - (mul / 100);

            if (opponent) {
                oppoattack = (opponent.attack * opponent.attacks_per_second * hitChance(opponent.accuracy, powerInfo.computed.active.evasion));
            }
    
            if (!oppoattack) {
                hull -= (((standard_attack - (standard_attack * defense)) * mul) / rate);
            }
            else {
                hull -= (((oppoattack - (oppoattack * defense)) * mul) / rate);
            }

            if (hull <= 0) break;
        }
        
        attacks.push({
            actions: [...current],
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


function factorial(number: number) {
    let result = 1;
    for (let i = 1; i <= number; i++) {
        result *= i;
    }
    return result;
}

function getPermutations<T, U>(array: T[], size: number, max?: number, count_only?: boolean, check?: (set: T[]) => U[] | false) {
    var current_iter = 0;

    function p(t: T[], i: number) {
        if (t.length === size) {
            if (!check) {
                result.push(t as any);
            }
            else {
                let response = check(t);
                if (response) {
                    if (!count_only) {
                        result.push(response);
                    }
                }
            }
            current_iter++;
            return;
        }
        if (i + 1 > array.length) {
            return;
        }

        if (max && current_iter >= max) return;
        p(t.concat(array[i]), i + 1);
        p(t, i + 1);
    }

    var result = [] as U[][];

    p([], 0);
    return result;
}

function canSeatAll(ship: Ship, crew: CrewMember[], ignore_skill: boolean): CrewMember[] | false {
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

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig, reportProgress: (data: { format?: string, options?: any, result?: ShipWorkerItem }) => boolean = () => true) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {
            const { 
                rate,
                activation_offsets,
                ship,
                battle_mode,
                opponents,
                action_types,
                ability_types, 
                defense, 
                offense, 
                ignore_skill, 
                verbose, 
                max_iterations,
                simulate,
                fixed_activation_delay } = options;

            const opponent = opponents?.length ? opponents[0] : undefined;
            const starttime = new Date();

            let max_results = options.max_results ?? 100;
            let max_rarity = options.max_rarity ?? 5;
            let min_rarity = options.min_rarity ?? 1;
            let maxvalues = [0, 0, 0, 0, 0].map(o => [0, 0, 0, 0]);
            let power_depth = options.power_depth ?? 2;
            let current_id = 1;

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
                });

            let seats = ship.battle_stations?.length;

            if (!seats) {
                reject("No battlestations");
                return;
            }

            const get_attacks = options.get_attacks && workCrew.length === seats;

            reportProgress({ format: 'ship.calc.generating_permutations_ellipses' });

            let wcn = workCrew.length;
            let bsn = seats;
            let total_combos = factorial(wcn) / (factorial(wcn - bsn) * factorial(bsn));

            let count = max_iterations || Math.ceil(total_combos); //crew_combos.length;
            let i = 0;
            let progress = -1;
            const results = [] as ShipWorkerItem[];

            const processBattleRun = (attacks: AttackInstant[], crew_set: CrewMember[]) => {
                let result_crew = [] as CrewMember[];
                const ship = attacks[0].ship;

                ship.battle_stations?.forEach((bs) => {
                    for (let c of crew_set) {
                        if (!result_crew.includes(c)) {
                            if (c.skill_order.includes(bs.skill) || ignore_skill) {
                                result_crew.push(c);
                                break;
                            }
                        }
                    }
                });
                
                const attack = attacks.reduce((p, n) => p + n.attack, 0);
                const min_attack = attacks.reduce((p, n) => p + n.min_attack, 0);
                const max_attack = attacks.reduce((p, n) => p + n.max_attack, 0);
                const battle_time = attacks.reduce((p, n) => p > n.second ? p : n.second, 0);
                const weighted_attack = attacks.reduce((p, n) => p + (!n.second ? 0 : (n.attack / (n.second))), 0);
                let highest_attack = 0;
                let high_attack_second = 0;

                attacks.forEach((attack) => {
                    if (attack.max_attack > highest_attack) {
                        highest_attack = attack.max_attack;
                        high_attack_second = attack.second;
                    }
                });

                const arena_metric = (highest_attack / high_attack_second);
                const fbb_metric = (min_attack + max_attack) / 2;

                return {
                    id: current_id++,
                    rate,
                    battle_mode,
                    attack,
                    min_attack,
                    max_attack,
                    battle_time,
                    crew: result_crew,
                    percentile: 0,
                    ship: attacks[0].ship,
                    weighted_attack,
                    arena_metric,
                    fbb_metric,
                    attacks: get_attacks ? attacks : undefined
                } as ShipWorkerItem;
            }

            const time = options.max_duration || (battle_mode.startsWith('fbb') ? 180 : 30);

            var last_high: ShipWorkerItem | null = null;
            var errors = false;

            const fbb_mode = battle_mode.startsWith('fbb');

            getPermutations(workCrew, seats, max_iterations, true, (set) => {
                i++;
                if (errors) return false;
                if (!(i % 100)) {
                    let p = Math.round((i / count) * 100);

                    if (p !== progress) {
                        progress = p;
                        if (!verbose) {
                            reportProgress({ format: 'ship.calc.calculating_pct_ellipses', options: { percent: `${p}` } });
                        }
                        else {
                            reportProgress({ format: 'ship.calc.calculating_pct_ellipses_verbose', 
                                options: { 
                                    percent: `${p}`,
                                    progress: `${i.toLocaleString()}`,
                                    count: `${count.toLocaleString()}`,
                                    accepted: `${results.length.toLocaleString()}`
                                } 
                            });
                        }
                    }
                }

                let newseats = canSeatAll(ship, set, !!ignore_skill);
                if (!newseats) {
                    return false;
                }
                
                set = newseats;

                let battle_data = iterateBattle(rate, fbb_mode, ship, set, opponent, defense, offense, time, activation_offsets, fixed_activation_delay, simulate);
                let attack = processBattleRun(battle_data, set);

                if (!get_attacks) battle_data.length = 0;
                let accepted = false;
                if (last_high === null) {
                    last_high = attack;
                    accepted = true;
                    results.push(attack);
                }
                else {
                    let d = compareShipResults(attack, last_high, fbb_mode);
                    if (d < 0) {
                        accepted = true;
                        results.push(attack);
                        last_high = attack;
                    }
                }

                if (accepted) {
                    reportProgress({ result: attack });
                    accepted = false;
                }

                return battle_data;
            });

            reportProgress({ format: 'ship.calc.sorting_finalizing_ellipses' });

            results.sort((a, b) => compareShipResults(a, b, fbb_mode));
            results.splice(max_results);
            results.forEach((result) => {
                if (battle_mode.startsWith('fbb')) {
                    let max = results[0].fbb_metric;
                    result.percentile = (result.fbb_metric / max) * 100;
                }
                else {
                    let max = results[0].arena_metric;
                    result.percentile = (result.arena_metric / max) * 100;
                }
            });

            const endtime = new Date();

            const run_time = (endtime.getTime() - starttime.getTime()) / 1000;

            resolve({
                ships: results,
                total_iterations: i,
                run_time
            });

        });
    },
    bestFinder: (options: MultiShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {

            // resolve({
            //     ships: [],
            //     total_iterations: i,
            //     run_time
            // })

        });
    }

}

export default ShipCrewWorker;