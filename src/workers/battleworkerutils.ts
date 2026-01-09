import { AttackInstant } from "../model/worker";
import { CrewMember } from "../model/crew";
import { ShipAction, Ship } from "../model/ship";
import { setupShip } from "../utils/shiputils";
import { getPermutations } from "../utils/misc";
import { ComesFrom } from "../model/worker";
import { BossEffect } from "../model/boss";

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
        attacks_per_second: number;
        attack: {
            base: number;
            with_bonus: number;
            with_bonus_and_chance: number;
        },
        boarding_damage_per_sec: number;
        baked_in_boarding: boolean;
        comes_from: ComesFrom[];
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

export function getInstantPowerInfo(ship: Ship, actions: (ShipAction | false)[], opponent?: Ship, offense?: number, baked_in_boarding?: boolean): InstantPowerInfo {
    offense ??= 0;

    let o_attack = ship.attack * (1 + offense);
    let o_b_attack = o_attack;
    let o_evasion = ship.evasion;
    let o_accuracy = ship.accuracy;
    let board_damage = 0;

    let o_speed = ship.attacks_per_second;
    let c_speed = o_speed;

    let c_crit_chance = ship.crit_chance;
    let c_crit_bonus = ship.crit_bonus;
    let s_crit_chance = ship.crit_chance;
    let s_crit_bonus = ship.crit_bonus;

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
    let comes_from = ['', '', ''];
    let boost = [0, 0, 0];
    let all_from = [] as ComesFrom[];
    let c = actions.length;
    let action: ShipAction;
    for (let i = 0; i < c; i++) {
        if (actions[i] === false) continue;
        else action = actions[i] as ShipAction;
        if (action.ability?.type === 4) {
            c_crit_chance += action.ability.amount;
            all_from.push({
                type: 4,
                action: action.symbol,
                bonus: action.ability.amount,
                aspect: 'ability'
            });
        }
        else if (action.ability?.type === 5) {
            c_crit_bonus += action.ability.amount;
            all_from.push({
                type: 5,
                action: action.symbol,
                bonus: action.ability.amount,
                aspect: 'ability'
            });
        }
        else if (action.ability?.type === 1) {
            all_from.push({
                type: 1,
                action: action.symbol,
                bonus: action.ability.amount,
                aspect: 'ability'
            });
        }

        if (action.bonus_type === 0) {
            if (action.ability?.type === 0) {
                if (c_a_attack < action.bonus_amount + action.ability.amount) {
                    c_a_attack = action.bonus_amount + action.ability.amount;
                    comes_from[0] = action.symbol;
                }
            }
            else if (c_a_attack < action.bonus_amount) {
                c_a_attack = action.bonus_amount;
                comes_from[0] = action.symbol;
            }
        }
        else if (action.bonus_type === 1) {
            if (action.ability?.type === 0) {
                if (c_a_evasion < action.bonus_amount + action.ability.amount) {
                    c_a_evasion = action.bonus_amount + action.ability.amount;
                    comes_from[0] = action.symbol;
                }
            }
            else if (c_a_evasion < action.bonus_amount) {
                c_a_evasion = action.bonus_amount;
                comes_from[1] = action.symbol;
            }
        }
        else if (action.bonus_type === 2) {
            if (action.ability?.type === 0) {
                if (c_a_accuracy < action.bonus_amount + action.ability.amount) {
                    c_a_accuracy = action.bonus_amount + action.ability.amount;
                    comes_from[0] = action.symbol;
                }
            }
            else if (c_a_accuracy < action.bonus_amount) {
                c_a_accuracy = action.bonus_amount;
                comes_from[2] = action.symbol;
            }
        }

        if (action.ability?.type === 7) {
            c_speed += (o_speed * (action.ability.amount / 100));
        }

        if (action.ability?.type === 8) {
            board_damage += (action.ability.amount / 100);
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
    boost[0] = (PowerTable[c_a_attack] - PowerTable[c_b_attack]);
    o_attack += boost[0];

    boost[1] = (PowerTable[c_a_evasion] - PowerTable[c_b_evasion]);
    o_evasion += boost[1];

    boost[2] = (PowerTable[c_a_accuracy] - PowerTable[c_b_accuracy])
    o_accuracy += boost[2];

    for (let i = 0; i < 3; i++) {
        if (!comes_from[i]) continue;
        all_from.push({
            type: i,
            bonus: boost[i],
            action: comes_from[i],
            aspect: 'power'
        });
    }

    let o_crit_chance = getCritChance(c_crit_chance) / 100;
    c_crit_bonus = Math.floor(c_crit_bonus / 100) * 100;

    let o_crit_bonus = c_crit_bonus /= 10000;
    let c_board = 0;

    // boarding
    if (grants.includes(4)) {
        c_board = (o_b_attack * 0.50) + (o_b_attack * 0.50 * board_damage);
        if (baked_in_boarding) o_attack += c_board;
    }

    let o_hit_chance = hitChance(o_accuracy, opponent?.evasion ?? o_evasion);
    let ship_mul = 1; // c_speed;

    let o_o_attack = {
        base: o_attack * o_hit_chance * ship_mul,
        with_bonus: (o_attack + (o_attack * o_crit_bonus)) * ship_mul,
        with_bonus_and_chance: ((o_attack + (o_attack * o_crit_bonus * (o_crit_chance))) * ship_mul * o_hit_chance)
    }

    all_from.forEach((info) => {
        if (info.aspect === 'power') return;
        if (info.type === 4) {
            let a = getCritChance(s_crit_chance) / 100;
            let n = getCritChance(s_crit_chance + info.bonus) / 100;
            info.bonus = (n - a) * o_attack;
        }
        else if (info.type === 5) {
            let a = Math.floor(s_crit_bonus / 100) * 100;
            let n = Math.floor((s_crit_bonus + info.bonus) / 100) * 100;
            info.bonus = (n - a) * o_attack;
        }
    });

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
            attacks_per_second: c_speed,
            boarding_damage_per_sec: c_board,
            baked_in_boarding: !!baked_in_boarding,
            comes_from: all_from
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

export type EffectMode = 'all' | 'actions' | 'non-actions';

export interface EffectData {
    ship: Ship;
    boss: Ship;
    reflect: number;
    effects: BossEffect[];
    cooldown: number;
}

export function applyEffects(ship: Ship, boss: Ship, effects: BossEffect[], copy = false): EffectData {
    if (copy) {
        ship = structuredClone(ship);
        boss = structuredClone(boss);
        effects = structuredClone(effects);
    }

    let reflect = 0;
    let cooldown = 0;
    let ba = boss.attack;

    effects.forEach((effect) => {
        const name = effect.description;
        switch (name) {
            case "Actions cooldown":
                cooldown += (effect.value * effect.multiplier);
                break;
            case "Boss ship attack":
                boss.attack += (ba * (effect.value / 100) * effect.multiplier);
                break;
            case "Reflection bonus":
                reflect += (effect.value / 100) * effect.multiplier;
                break;
            case "Ship attack speed":
                ship.attacks_per_second += ship.attacks_per_second * (effect.value / 100) * effect.multiplier;
                break;
            case "Ship attack":
                ship.attack += (ship.attack)
                break;
            case "Ship crit chance":
                ship.crit_chance += effect.value * effect.multiplier;
                break;
            case "Ship crit damage":
                ship.crit_bonus += effect.value * effect.multiplier;
                break;
            default:
                break;
        }
    });

    return { ship, boss, effects, reflect, cooldown };
}

export function iterateBattle(
    rate: number,
    fbb_mode: boolean,
    input_ship: Ship,
    crew: CrewMember[],
    opponent?: Ship,
    defense?: number,
    offense?: number,
    time = 180,
    activation_offsets?: number[],
    fixed_delay = 0.4,
    simulate = false,
    opponent_variance?: number,
    ignoreSeats = false,
    ignoreDefeat = false,
    ignorePassives = false,
    effects?: BossEffect[]
) {
    try {
        let reflect = 0;
        let econf: EffectData | undefined = undefined;
        if (input_ship && opponent && fbb_mode && effects?.length) {
            input_ship = structuredClone(input_ship);
            opponent = structuredClone(opponent);
            econf = applyEffects(input_ship, opponent!, effects);
            reflect = econf.reflect;
        }
        let ship = setupShip(input_ship, crew, false, ignoreSeats, false, ignorePassives) || undefined;
        let work_opponent = opponent ? setupShip(opponent, [], false, ignoreSeats, true, ignorePassives) as Ship : setupShip(input_ship, [...crew], false, ignoreSeats, true, ignorePassives, !!econf) as Ship;
        let oppo_crew = work_opponent?.battle_stations?.map(m => m.crew).filter(f => !!f) as CrewMember[];

        opponent_variance ??= 0.2;

        defense ??= 0;
        offense ??= 0;

        time *= rate;
        let battle_second = 0;

        if (!ship) return [];

        let hull = ship.hull;
        let orighull = hull;

        let shields = ship.shields;
        let origshield = shields;
        let shield_regen = ship.shield_regen / rate;

        let oppo_hull = work_opponent?.hull ?? ship.hull;
        let oppo_orighull = work_opponent?.hull ?? oppo_hull;

        let oppo_shields = work_opponent?.shields ?? ship.shields;
        let oppo_origshield = oppo_shields;
        let oppo_shield_regen = (work_opponent?.shield_regen ?? ship.shield_regen) / rate;

        const attacks = [] as AttackInstant[];
        crew.forEach(c => c?.action && c.id ? c.action.crew = c.id! : null);
        if (work_opponent) oppo_crew?.forEach(c => c.action.crew = c.id!);

        let allactions = structuredClone([...ship.actions ?? [], ...crew.filter(f => f).map(c => c.action)]) as ChargeAction[];
        let oppo_actions = (work_opponent?.actions?.length || oppo_crew?.length) ? structuredClone([...(work_opponent?.actions ?? []), ...(oppo_crew?.map(c => c.action) ?? [])]) as ChargeAction[] : undefined;

        if (allactions && econf) {
            allactions.forEach((action) => {
                action.cooldown += econf.cooldown;
            });
        }

        const delay = () => {
            if (simulate) {
                return 0.2 + (Math.random() * 0.4);
            }
            else {
                return fixed_delay;
            }
        }

        let static_sim_hitter = 0;
        let o_static_sim_hitter = 0;

        const doesHit = (chance: number, oppo?: boolean) => {
            if (simulate) {
                return Math.random() <= chance;
            }
            else {
                if (oppo) {
                    o_static_sim_hitter += chance;
                    if (o_static_sim_hitter >= 1) {
                        o_static_sim_hitter = 0;
                        return true;
                    }
                }
                else {
                    static_sim_hitter += chance;
                    if (static_sim_hitter >= 1) {
                        static_sim_hitter = 0;
                        return true;
                    }
                }
            }
            return false;
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
                if (activation_offsets[x]) {
                    action.initial_cooldown += activation_offsets[x];
                }
            }
        });

        oppo_actions?.forEach((action, i) => {
            action.comes_from = i >= (work_opponent!.actions?.length ?? 0) ? 'crew' : 'ship';
            if (action.charge_phases?.length) {
                if (action.ability) {
                    action.orig_ability_amount = action.ability?.amount;
                    action.orig_bonus = action.bonus_amount;
                    action.orig_cooldown = action.cooldown;
                    action.current_phase = 0;
                }
            }
            // if (action.comes_from === 'crew' && activation_offsets?.length && activation_offsets.length === input_ship.battle_stations?.length) {
            //     let x = i - (ship!.actions?.length ?? 0);
            //     if (activation_offsets[x]) {
            //         action.initial_cooldown += activation_offsets[x];
            //     }
            // }
        });


        let alen = allactions.length;
        let uses = allactions.map(a => 0);
        let max_uses = allactions.map(a => a.limit ?? 0);
        let state_time = allactions.map(a => 0);
        let reset_relief = allactions.map(a => 1);
        let inited = allactions.map(a => false);
        let active = allactions.map(a => false);
        let now_chance = 0;

        let o_alen = oppo_actions?.length ?? 0;
        let o_uses = oppo_actions?.map(a => 0);
        //let o_max_uses = oppo_actions?.map(a => a.limit ?? 0);
        let o_state_time = oppo_actions?.map(a => 0);
        let o_reset_relief = oppo_actions?.map(a => 1);
        let o_inited = oppo_actions?.map(a => false);
        let o_active = oppo_actions?.map(a => false);
        let o_now_chance = 0;

        const currents = allactions.map(m => false as false | ShipAction);
        const oppos = oppo_actions?.map(m => false as false | ShipAction);

        const native_grants = allactions.map(m => m.status).filter(f => f !== undefined) ?? [];
        const o_native_grants = oppo_actions?.map(m => m.status).filter(f => f !== undefined) ?? [];

        allactions.forEach((action) => {
            if (action.ability?.condition && !native_grants.includes(action.ability.condition)) delete action.ability;
        });

        oppo_actions?.forEach((action) => {
            if (action.ability?.condition && !o_native_grants.includes(action.ability.condition)) delete action.ability;
        });

        let cloaked = false;
        let oppo_cloaked = false;

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

        const processChargePhases = (action: ChargeAction, actidx: number, oppo = false) => {
            if (action.charge_phases) {
                if (!action.current_phase) {
                    action.current_phase = 1;
                    if (oppo) {
                        o_state_time![actidx] = 0;
                        o_inited![actidx] = true;
                    }
                    else {
                        state_time[actidx] = 0;
                        inited[actidx] = true;
                    }
                }
                else if (action.current_phase < action.charge_phases.length) {
                    bumpAction(action, action.current_phase);
                    action.current_phase++;
                    if (oppo) {
                        o_state_time![actidx] = 0;
                        o_inited![actidx] = true;
                    }
                    else {
                        state_time[actidx] = 0;
                        inited[actidx] = true;
                    }
                }
                else if (action.current_phase === action.charge_phases.length) {
                    bumpAction(action, action.current_phase);
                    action.current_phase++;
                    if (oppo) {
                        o_inited![actidx] = true;
                    }
                    else {
                        inited[actidx] = true;
                    }
                }
            }
        }

        const activate = (action: ChargeAction, actidx: number, oppo = false) => {
            let immediate = false as boolean | number;

            if (action.status === 4) {
                if ((oppo && cloaked) || (!oppo && oppo_cloaked)) {
                    processChargePhases(action, actidx, oppo);
                    return false;
                }
            }

            if (!action.ability?.condition || currents.some(act => typeof act !== 'boolean' && act.status === action.ability?.condition)) {
                if (action.comes_from === 'crew' && powerInfo && (!action.ability || action.ability?.type === 0)) {
                    let proposed_boost = 0;
                    let current_base = 0;
                    let current_total = 0;
                    let notype = true;
                    if (action.bonus_type === 0 && (!action.ability || action.ability.type === 0)) {
                        current_base = powerInfo?.condensed.base.attack;
                        current_total = powerInfo?.condensed.active.attack;
                        if (action.ability?.type === 0) {
                            proposed_boost = action.bonus_amount + action.ability.amount;
                            notype = false;
                        }
                        else {
                            proposed_boost = action.bonus_amount;
                        }
                    }
                    else if (!action.ability) {
                        if (action.bonus_type === 1) {
                            current_base = powerInfo?.condensed.base.evasion;
                            current_total = powerInfo?.condensed.active.evasion;
                            proposed_boost = action.bonus_amount;
                        }
                        else if (action.bonus_type === 2) {
                            current_base = powerInfo?.condensed.base.accuracy;
                            current_total = powerInfo?.condensed.active.accuracy;
                            proposed_boost = action.bonus_amount;
                        }
                    }
                    if (notype) {
                        if (oppo && oppos?.some(s => s && s.bonus_type === action.bonus_type)) {
                            proposed_boost = 0;
                        }
                        else if (!oppo && currents?.some(s => s && s.bonus_type === action.bonus_type)) {
                            proposed_boost = 0;
                        }
                    }
                    let current_boost = current_total - current_base;

                    if (proposed_boost <= current_boost) {
                        processChargePhases(action, actidx, oppo);
                        return false;
                    }
                }

                if (action.ability?.type === 1) {
                    immediate = (action.ability.amount / 100);
                }
                else if (action.ability?.type === 2) {
                    if (oppo) {
                        let pctneed = 1 - (oppo_hull / oppo_orighull);
                        let pctfix = action.ability.amount / 100;
                        if (pctneed >= pctfix || pctneed >= 0.3) {
                            oppo_hull += (oppo_orighull * pctfix);
                            if (action.charge_phases) {
                                resetAction(action);
                            }
                        }
                        else {
                            processChargePhases(action, actidx, oppo);
                            return false;
                        }
                    }
                    else {
                        let pctneed = 1 - (hull / orighull);
                        let pctfix = action.ability.amount / 100;
                        if (pctneed >= pctfix || pctneed >= 0.3) {
                            hull += (orighull * pctfix);
                            if (action.charge_phases) {
                                resetAction(action);
                            }
                        }
                        else {
                            processChargePhases(action, actidx, oppo);
                            return false;
                        }
                    }
                }
                else if (action.ability?.type === 3) {
                    if (oppo) {
                        let pctneed = 1 - (oppo_shields / oppo_origshield);
                        let pctfix = action.ability.amount / 100;
                        if (pctneed >= pctfix || pctneed >= 0.3) {
                            oppo_shields += (oppo_origshield * pctfix);
                            if (action.charge_phases) {
                                resetAction(action);
                            }
                        }
                        else {
                            processChargePhases(action, actidx, oppo);
                            return false;
                        }
                    }
                    else {
                        let pctneed = 1 - (shields / origshield);
                        let pctfix = action.ability.amount / 100;
                        if (pctneed >= pctfix || pctneed >= 0.3) {
                            shields += (origshield * pctfix);
                            if (action.charge_phases) {
                                resetAction(action);
                            }
                        }
                        else {
                            processChargePhases(action, actidx, oppo);
                            return false;
                        }
                    }
                }
                else if (action.ability?.type === 9) {
                    if (oppo && !cloaked) {
                        if (doesHit(o_now_chance, true)) {
                            state_time = state_time.map((a, i) => active[i] ? a : 0);
                            if (fbb_mode) {
                                reset_relief = reset_relief.map((r, i) => active[i] ? r : r * 2);
                            }
                        }
                    }
                    else if (!oppo && !oppo_cloaked) {
                        if (doesHit(now_chance)) {
                            o_state_time = o_state_time?.map((a, i) => o_active![i] ? a : 0);
                            if (fbb_mode) {
                                o_reset_relief = o_reset_relief?.map((r, i) => o_active![i] ? r : r * 2);
                            }
                        }
                    }
                }
                else if (action.ability?.type === 10) {
                    let time = action.ability.amount;
                    if (oppo) {
                        for (let idx = 0; idx < o_alen; idx++) {
                            if (!o_active![idx]) {
                                if (!oppo_actions![idx].current_phase) {
                                    o_state_time![idx] += time;
                                }
                            }
                        }
                    }
                    else {
                        for (let idx = 0; idx < alen; idx++) {
                            if (!active[idx]) {
                                if (!allactions[idx].current_phase) {
                                    state_time[idx] += time;
                                }
                            }
                        }
                    }
                }
                else if (action.ability?.type === 6) {
                    if (oppo) {
                        oppo_shield_regen += (action.ability.amount / rate);
                    }
                    else {
                        shield_regen += (action.ability.amount / rate);
                    }
                }

                if (immediate === false) immediate = true;
                if (oppo) {
                    oppos![actidx] = action;
                    oppo_cloaked = action.status === 2;
                    o_uses![actidx]++;
                    o_state_time![actidx] = 0;
                    o_reset_relief![actidx] = 1;
                    o_inited![actidx] = true;
                    o_active![actidx] = true;
                }
                else {
                    currents[actidx] = action;
                    cloaked = action.status === 2;
                    uses[actidx]++;
                    state_time[actidx] = 0;
                    reset_relief[actidx] = 1;
                    inited[actidx] = true;
                    active[actidx] = true;
                }
            }
            else {
                processChargePhases(action, actidx, oppo);
                return false;
            }

            return immediate;
        }

        const deactivate = (action: ShipAction, actidx: number, oppo = false) => {
            if (oppo) {
                if (action.ability?.type === 6) {
                    oppo_shield_regen -= (action.ability.amount / rate);
                }
                if (action.status === 2) {
                    oppo_cloaked = false;
                }
                o_state_time![actidx] = 0;
                o_active![actidx] = false;
                oppos![actidx] = false;
            }
            else {
                if (action.ability?.type === 6) {
                    shield_regen -= (action.ability.amount / rate);
                }
                if (action.status === 2) {
                    cloaked = false;
                }
                state_time[actidx] = 0;
                active[actidx] = false;
                currents[actidx] = false;
            }
        }

        let immediates = [] as { base: number, max: number, standard: number, action: string }[];
        let oppo_immediates = [] as { base: number, max: number, standard: number, action: string }[];
        let activation = 0 as number | boolean;
        let oppo_activation = 0 as number | boolean;
        let ca = 0;
        let powerInfo: InstantPowerInfo | null = null;
        let oppo_powerInfo: InstantPowerInfo | null = null;
        let r_inc = 1 / rate;
        let actidx = 0;
        let act_cnt = currents.length;
        let activated = false;
        let action = null as null | ChargeAction;
        let o_action = null as null | ChargeAction;

        let instant_now = 0;
        let instant_now_min = 0;
        let instant_now_max = 0;

        let o_instant_now = 0;
        let o_instant_now_min = 0;
        let o_instant_now_max = 0;

        let o_actidx = 0;
        let oppo_cnt = oppos?.length ?? 0;
        let oppo_activated = false;

        // let attack_inc = 0;
        // let my_attack_inc = 0;
        let at_second = 0;
        let o_at_second = 0;
        // let attack_time_check = 100 - (opponent_variance ?? 0);

        let attack_counter = 0;
        let oppo_counter = 0;

        let c_boarding = 0;
        let o_c_boarding = 0;

        let boarding_sec = 0;
        let o_boarding_sec = 0;

        let aps_num = 0;
        let oppo_aps_num = 0;

        let oppvar = (work_opponent?.attacks_per_second ?? 1) + ((work_opponent?.attacks_per_second ?? 1) * opponent_variance);
        oppo_aps_num = work_opponent ? 1 / oppvar : 0;

        const hitoppo = (damage: number) => {
            if ((hull <= 0 || oppo_hull <= 0) && !ignoreDefeat) return 0;
            if (oppo_shields > 0) {
                oppo_shields -= damage;
                if (oppo_shields < 0) {
                    oppo_hull += oppo_shields;
                    oppo_shields = 0;
                }
            }
            else {
                oppo_hull -= damage;
            }
            return damage;
        }

        const hitme = (damage: number) => {
            if ((hull <= 0 || oppo_hull <= 0) && !ignoreDefeat) return 0;
            if (reflect) hitoppo(reflect * damage);
            if (shields > 0) {
                shields -= damage;
                if (shields < 0) {
                    hull += shields;
                    shields = 0;
                }
            }
            else {
                hull -= damage;
            }
            return damage;
        }

        powerInfo = getInstantPowerInfo(ship, currents, work_opponent, offense);
        oppo_powerInfo = getInstantPowerInfo(work_opponent, currents, ship, offense);
        now_chance = hitChance(powerInfo.computed.active.accuracy, oppo_powerInfo.computed.active.evasion);
        o_now_chance = hitChance(oppo_powerInfo.computed.active.accuracy, powerInfo.computed.active.evasion)

        for (let inc = 1; inc <= time; inc++) {
            battle_second = Math.round((inc / rate) * 100) / 100;
            o_instant_now_min = o_instant_now_max = o_instant_now = 0;
            instant_now_min = instant_now_max = instant_now = 0;

            ca = 0;
            activated = false;

            for (actidx = 0; actidx < act_cnt; actidx++) {
                action = allactions[actidx];
                state_time[actidx] += (r_inc * reset_relief[actidx]);

                if (!inited[actidx]) {
                    if (!activated && state_time[actidx] >= (action.initial_cooldown - 0.01) + delay()) {
                        if (battle_second - at_second >= delay()) {
                            activation = activate(action, actidx);
                        }
                    }
                }
                else if (inited[actidx] && currents[actidx]) {
                    if (state_time[actidx] >= action.duration - 0.01) {
                        deactivate(action, actidx);
                        powerInfo = null;
                    }
                }
                else if (inited[actidx] && !currents[actidx] && (!action.limit || uses[actidx] < action.limit)) {
                    if (!activated && state_time[actidx] >= action.cooldown - 0.01) {
                        if (battle_second - at_second >= delay()) {
                            activation = activate(action, actidx);
                        }
                    }
                }

                if (activation) {
                    at_second = battle_second;
                    powerInfo = getInstantPowerInfo(ship, currents, work_opponent, offense);
                    c_boarding = powerInfo.computed.boarding_damage_per_sec / rate;
                    boarding_sec = powerInfo.computed.boarding_damage_per_sec;
                    aps_num = 1 / powerInfo.computed.attacks_per_second;

                    if (activation !== true) {
                        immediates.push({
                            base: (powerInfo.computed.attack.base * activation),
                            max: (powerInfo.computed.attack.with_bonus * activation),
                            standard: (powerInfo.computed.attack.with_bonus_and_chance * activation),
                            action: action.symbol
                        });
                    }

                    activation = false;
                    activated = true;
                }
            }

            if (!powerInfo) {
                powerInfo = getInstantPowerInfo(ship, currents, work_opponent, offense);
                c_boarding = powerInfo.computed.boarding_damage_per_sec / rate;
                boarding_sec = powerInfo.computed.boarding_damage_per_sec;
                aps_num = 1 / powerInfo.computed.attacks_per_second;
            }

            if (oppos) {
                oppo_activated = false;

                for (o_actidx = 0; o_actidx < oppo_cnt; o_actidx++) {
                    o_action = oppo_actions![o_actidx];
                    o_state_time![o_actidx] += (r_inc * o_reset_relief![o_actidx]);

                    if (!o_inited![o_actidx]) {
                        if (!oppo_activated && o_state_time![o_actidx] >= (o_action.initial_cooldown - 0.01) + delay()) {
                            if (battle_second - o_at_second >= delay()) {
                                oppo_activation = activate(o_action, o_actidx, true);
                            }
                        }
                    }
                    else if (o_inited![o_actidx] && oppos![o_actidx]) {
                        if (o_state_time![o_actidx] >= o_action.duration - 0.01) {
                            deactivate(o_action, o_actidx, true);
                            oppo_powerInfo = null;
                        }
                    }
                    else if (o_inited![o_actidx] && !oppos![o_actidx] && (!o_action.limit || o_uses![o_actidx] < o_action.limit)) {
                        if (!oppo_activated && o_state_time![o_actidx] >= o_action.cooldown - 0.01) {
                            if (battle_second - o_at_second >= delay()) {
                                oppo_activation = activate(o_action, o_actidx, true);
                            }
                        }
                    }

                    if (oppo_activation) {
                        o_at_second = battle_second;
                        oppo_powerInfo = getInstantPowerInfo(work_opponent!, oppos ?? [], ship, 0);
                        o_now_chance = hitChance(oppo_powerInfo.computed.active.accuracy, powerInfo.computed.active.evasion)
                        o_c_boarding = oppo_powerInfo.computed.boarding_damage_per_sec / rate;
                        o_boarding_sec = oppo_powerInfo.computed.boarding_damage_per_sec;
                        let oppvar = (oppo_powerInfo.computed.attacks_per_second ?? 1) + ((oppo_powerInfo.computed.attacks_per_second ?? 1) * opponent_variance);
                        oppo_aps_num = work_opponent ? 1 / oppvar : 0;

                        if (oppo_activation !== true) {
                            oppo_immediates.push({
                                base: (oppo_powerInfo.computed.attack.base * oppo_activation),
                                max: (oppo_powerInfo.computed.attack.with_bonus * oppo_activation),
                                standard: (oppo_powerInfo.computed.attack.with_bonus_and_chance * oppo_activation),
                                action: o_action.symbol
                            });
                        }

                        oppo_activation = false;
                        oppo_activated = true;
                    }
                }
            }

            if (work_opponent && !oppo_powerInfo && oppos) {
                oppo_powerInfo = getInstantPowerInfo(work_opponent!, oppos ?? [], ship, 0);
                let oppvar = (oppo_powerInfo.computed.attacks_per_second ?? 1) + ((oppo_powerInfo.computed.attacks_per_second ?? 1) * opponent_variance);
                oppo_aps_num = work_opponent ? 1 / oppvar : 0;
                o_c_boarding = oppo_powerInfo.computed.boarding_damage_per_sec / rate;
                o_boarding_sec = oppo_powerInfo.computed.boarding_damage_per_sec;
            }

            if (powerInfo && oppo_powerInfo) {
                now_chance = hitChance(powerInfo.computed.active.accuracy, oppo_powerInfo.computed.active.evasion);
                o_now_chance = hitChance(oppo_powerInfo.computed.active.accuracy, powerInfo.computed.active.evasion)
            }

            let base_attack = powerInfo.computed.attack.base;
            let standard_attack = powerInfo.computed.attack.with_bonus_and_chance;
            let max_attack = powerInfo.computed.attack.with_bonus;

            let oppo_base_attack = oppo_powerInfo?.computed.attack.base ?? work_opponent.attack;
            let oppo_standard_attack = oppo_powerInfo?.computed.attack.with_bonus_and_chance ?? work_opponent.attack;
            let oppo_max_attack = oppo_powerInfo?.computed.attack.with_bonus ?? work_opponent.attack;

            if (immediates.length) {
                if (!cloaked && !oppo_cloaked) {
                    for (let imm of immediates) {
                        if (powerInfo?.computed.comes_from?.length) {
                            powerInfo.computed.comes_from = powerInfo.computed.comes_from.map((cf => {
                                if (cf.action === imm.action && cf.aspect === 'ability') {
                                    return { ...cf, bonus: imm.standard };
                                }
                                return cf;
                            }));
                        }
                        instant_now += imm.standard;
                        instant_now_min += imm.base;
                        instant_now_max += imm.max;
                        instant_now = hitoppo(instant_now);
                        if (!instant_now) {
                            instant_now_max = 0;
                            instant_now_min = 0;
                        }
                    }
                }
                immediates.length = 0;
            }

            if (oppo_immediates.length) {
                if (!cloaked && !oppo_cloaked) {
                    for (let imm of oppo_immediates) {
                        if (oppo_powerInfo?.computed.comes_from?.length) {
                            oppo_powerInfo.computed.comes_from = oppo_powerInfo.computed.comes_from.map((cf => {
                                if (cf.action === imm.action && cf.aspect === 'ability') {
                                    return { ...cf, bonus: imm.standard };
                                }
                                return cf;
                            }));
                        }
                        o_instant_now += imm.standard;
                        o_instant_now_min += imm.base;
                        o_instant_now_max += imm.max;
                        o_instant_now = hitme(o_instant_now);
                        if (!o_instant_now) {
                            o_instant_now_max = 0;
                            o_instant_now_min = 0;
                        }
                    }
                }
                oppo_immediates.length = 0;
            }

            if (attack_counter >= aps_num) {
                let number = attack_counter / aps_num;

                standard_attack = Math.ceil(standard_attack * number);
                base_attack = Math.ceil(base_attack * number);
                max_attack = Math.ceil(max_attack * number);

                attack_counter = 0;

                if (((fbb_mode || !oppo_cloaked) && !cloaked)) {
                    let mul = oppos?.filter(f => f && f.ability?.type === 11).map(m => (m as ShipAction).ability?.amount).reduce((p, n) => p! + n!, 0) || 0;
                    mul = 1 - (mul / 100);

                    let actual_attack = (standard_attack * (!oppo_powerInfo ? 1 : hitChance(powerInfo.computed.active.accuracy, oppo_powerInfo.computed.active.evasion)));
                    let outgoing_damage = Math.ceil(actual_attack * mul);

                    outgoing_damage = hitoppo(outgoing_damage);
                    if (!outgoing_damage) {
                        standard_attack = base_attack = max_attack = 0;
                    }
                }
                else {
                    standard_attack = base_attack = max_attack = 0;
                }
            }
            else {
                standard_attack = base_attack = max_attack = 0;
            }

            if (work_opponent && oppo_counter >= oppo_aps_num) {
                let number = oppo_counter / oppo_aps_num;
                oppo_counter = 0;

                oppo_standard_attack = Math.ceil(oppo_standard_attack * number);
                oppo_base_attack = Math.ceil(oppo_base_attack * number);
                oppo_max_attack = Math.ceil(oppo_max_attack * number);

                if (fbb_mode || (!oppo_cloaked && !cloaked)) {
                    let mul = currents.filter(f => f && f.ability?.type === 11).map(m => (m as ShipAction).ability?.amount).reduce((p, n) => p! + n!, 0) || 0;
                    mul = 1 - (mul / 100);
                    let oppoattack = 0;
                    if (!oppo_powerInfo) {
                        oppoattack = (oppo_standard_attack * hitChance(work_opponent.accuracy, powerInfo.computed.active.evasion));
                    }
                    else {
                        oppoattack = (oppo_standard_attack * hitChance(oppo_powerInfo.computed.active.accuracy, powerInfo.computed.active.evasion));
                    }

                    let incoming_damage = Math.ceil((oppoattack - (oppoattack * (fbb_mode ? defense : 0))) * mul);
                    incoming_damage = hitme(incoming_damage);
                    if (!incoming_damage) {
                        oppo_standard_attack = oppo_base_attack = oppo_max_attack = 0;
                    }
                }
                else {
                    oppo_standard_attack = oppo_base_attack = oppo_max_attack = 0;
                }
            }
            else {
                oppo_standard_attack = oppo_base_attack = oppo_max_attack = 0;
            }

            // Apply boarding damage
            if (c_boarding && !powerInfo.computed.baked_in_boarding) {
                c_boarding = hitoppo(c_boarding);
                if (c_boarding) {
                    standard_attack += c_boarding;
                    base_attack += c_boarding;
                    max_attack += c_boarding;
                }
            }

            if (o_c_boarding && !oppo_powerInfo?.computed.baked_in_boarding) {
                o_c_boarding = hitme(o_c_boarding);
                if (o_c_boarding) {
                    oppo_standard_attack += o_c_boarding;
                    oppo_base_attack += o_c_boarding;
                    oppo_max_attack += o_c_boarding;
                }
            }

            // Apply shield regeneration
            if (shields < origshield && shields > 0) {
                shields += shield_regen;
                if (shields > origshield) shields = origshield;
            }

            if (oppo_shields < oppo_origshield && oppo_shields > 0) {
                oppo_shields += oppo_shield_regen;
                if (oppo_shields > oppo_origshield) oppo_shields = oppo_origshield;
            }


            attacks.push({
                actions: currents.filter(f => f !== false) as ShipAction[],
                hull,
                shields,
                second: battle_second,
                attack: (standard_attack + instant_now),
                min_attack: (base_attack + instant_now_min),
                max_attack: (max_attack + instant_now_max),
                ship,
                opponent_hull: oppo_hull,
                opponent_shields: oppo_shields,
                opponent_attack: (oppo_standard_attack + o_instant_now),
                opponent_min_attack: (oppo_base_attack + o_instant_now_min),
                opponent_max_attack: (oppo_max_attack + o_instant_now_max),
                boarding_damage_per_second: boarding_sec,
                opponent_boarding_damage_per_second: o_boarding_sec,
                cloaked,
                opponent_cloaked: oppo_cloaked,
                comes_from: powerInfo?.computed.comes_from ?? []
            });

            if (oppo_hull <= 0 || hull <= 0) {
                attacks[attacks.length - 1].win = hull > 0; // oppo_hull;
                if (oppo_hull <= 0) {
                    break;
                }

                // Check for end of battle
                if (hull <= 0) {
                    if (ignoreDefeat) {
                        let br = false;
                        let cu = uses.length;

                        for (let i = 0; i < cu; i++) {
                            if (allactions[i].comes_from === 'ship') continue;
                            if (max_uses[i] && max_uses[i] <= uses[i]) {
                                br = true;
                                break;
                            }
                        }
                        if (br) break;
                    }
                    else {
                        break;
                    }
                }
            }

            attack_counter += r_inc;
            attack_counter = Math.round(attack_counter * 100) / 100;
            oppo_counter += r_inc;
            oppo_counter = Math.round(oppo_counter * 100) / 100;
        }

        ship = undefined;
        return attacks;
    }
    catch (e) {
        console.log(e);
        return [];
    }
}

export function generateSeatCombos(count: number) {
    let c = count;
    let cbs = [] as number[][];
    for (let i = 0; i < c; i++) {
        for (let j = 0; j < c; j++) {
            cbs.push([i, j]);
        }
    }

    const allseat = getPermutations<number[], number[]>(cbs, c).filter((f) => {
        let xseen = [] as boolean[];
        let yseen = [] as boolean[];
        for (let i = 0; i < count; i++) {
            xseen.push(false);
            yseen.push(false);
        }
        for (let [x, y] of f) {
            xseen[x] = true;
            yseen[y] = true;
        }
        return (xseen.every(x => x) && yseen.every(y => y));
    });

    return allseat;
}

export function canSeatAll(precombined: number[][][], ship: Ship, crew: CrewMember[], ignore_skill: boolean): CrewMember[][] | false {
    if (!ship.battle_stations?.length || ship.battle_stations.length !== crew.length) return false;
    if (!crew.every(c => c.skill_order.some(so => ship.battle_stations?.some(bs => bs.skill === so)))) return false;

    let c = crew.length;
    let possibles = precombined.map((set) => {
        let mpn = {} as { [key: string]: CrewMember | undefined };
        for (let [x, y] of set) {
            if ((ignore_skill || crew[y].skill_order.includes(ship.battle_stations![x].skill))) {
                mpn[x] = crew[y];
            }
            else {
                mpn[x] = undefined;
            }
        }
        let result = Object.values(mpn);
        if (result.every(v => !!v)) return result;
        return false;
    }).filter(f => !!f) as CrewMember[][];

    if (possibles?.length) {
        return possibles;
    }

    return false;
}
