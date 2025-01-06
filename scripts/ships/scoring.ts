import { CrewMember, ShipRanks } from "../../src/model/crew";
import { BattleStation, Ship } from "../../src/model/ship";


export const OFFENSE_ABILITIES = [0, 1, 4, 5, 7, 8, 10, 12];
export const DEFENSE_ABILITIES = [2, 3, 6, 9, 10, 11];

export const OFFENSE_ACTIONS = [0, 2];
export const DEFENSE_ACTIONS = [1];

export const MaxOffense = 0.528;
export const MaxDefense = 0.528;

export const UNMBos: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":5200000000,"evasion":0,"attack":700000,"accuracy":120000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 6, antimatter: 0, level: 10};
export const NMBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":3700000000,"evasion":0,"attack":570000,"accuracy":105000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 5, antimatter: 0, level: 10};
export const BrutalBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":1150000000,"evasion":0,"attack":225000,"accuracy":80000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 4, antimatter: 0, level: 10}
export const HardBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":220000000,"evasion":0,"attack":206000,"accuracy":70000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 3, antimatter: 0, level: 10};
export const NormalBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":160000000,"evasion":0,"attack":92000,"accuracy":35000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 2, antimatter: 0, level: 10};
export const EasyBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":20000000,"evasion":0,"attack":45000,"accuracy":15000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 1, antimatter: 0, level: 10};
export const AllBosses = [EasyBoss, NormalBoss, HardBoss, BrutalBoss, NMBoss, UNMBos];

export function getShipDivision(rarity: number) {
    return rarity === 5 ? 3 : rarity >= 3 && rarity <= 4 ? 2 : 1;
}

export function getCrewDivisions(rarity: number) {
    if (rarity === 5) return [3];
    if (rarity === 4) return [2, 3];
    else return [1, 2, 3];
}

export function getMaxTime(crew: CrewMember) {
    if (!crew.action.limit) return 180;
    let t = crew.action.initial_cooldown;
    t += (crew.action.limit * crew.action.duration);
    if (crew.action.limit > 1) {
        t += ((crew.action.limit - 1) * crew.action.cooldown);
    }
    return t;
}

export interface SymbolScore {
    symbol: string,
    score: number,
    count: number,
    division: number
    damage: number,
    crew: string[]
}

export type ShipCompat = {
    score: number,
    trigger: boolean,
    seat: boolean
};

export interface Scoreable {
    group: number,
    average_index: number,
    count: number,
    final: number;
    max_damage: number,
    min_damage: number,
    max_compat: number,
    min_compat: number,
    average_compat: number
    average_damage: number,
    median_index: number,
    min_index: number,
    win_count: number,
    total_damage: number;
    duration: number;
    max_duration: number;
    total_compat: number;
}

export interface ScoreTotal extends Scoreable {
    max_ship: string,
    max_staff: string[],
    min_ship: string,
    min_staff: string[],
    max_duration_ship: string,
    max_duration_staff: string[],
    original_indices: number[];
    compat: string[];
    incompat: string[]
}

export interface Score {
    fbb_data: ScoreTotal[];
    arena_data: ScoreTotal[];

    kind: 'crew' | 'ship';

    name: string;
    symbol: string;

    arena: number;
    arena_final: number;
    fbb: number;
    fbb_final: number;
    overall_final: number;
    overall: number;
}

export interface BattleRunBase {
    crew: any;
    ship: Ship;
    boss?: Ship;
    division?: number;
    opponent?: Ship;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean,
    reference_battle?: boolean;
}

export interface BattleRun extends BattleRunBase {
    crew: CrewMember;
    ship: Ship;
    boss?: Ship;
    division?: number;
    opponent?: Ship;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean,
    reference_battle: false;
}

export interface BattleRunRef extends BattleRunBase {
    crew: undefined,
    reference_battle: true;
}

export interface BattleRunCache {
    crew: string;
    ship: string;
    boss?: number;
    opponent?: string;
    division?: number;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean,
    version: number,
    reference_battle: boolean;
}

export function createScore(kind: 'crew' | 'ship', symbol: string) {
    return {
        kind,
        symbol,
        name: '',
        arena: 0,
        arena_final: 0,
        fbb: 0,
        fbb_final: 0,
        overall: 0,
        overall_final: 0,
        fbb_data: [],
        arena_data: []
    } as Score;
}

export function getScore(score: Score, type: 'fbb' | 'arena', group: number) {
    if (type === 'fbb') {
        let s = score.fbb_data.find(f => f.group === group);
        if (s) return s;
    }
    else {
        let s = score.arena_data.find(f => f.group === group);
        if (s) return s;
    }
    return addScore(score, type, group);
}

export function addScore(score: Score, type: 'fbb' | 'arena', group: number) {
    const newobj = {
        group,
        average_index: 0,
        count: 0,
        final: 0,
        max_ship: '',
        max_staff: [],
        max_damage: 0,
        median_index: 0,
        win_count: 0,
        total_damage: 0,
        total_compat: 0,
        duration: 0,
        min_ship: '',
        min_staff: [],
        min_damage: 0,
        average_damage: 0,
        original_indices: [],
        min_compat: 0,
        max_compat: 0,
        average_compat: 0,
        compat: [],
        incompat: [],
        max_duration: 0,
        max_duration_ship: '',
        max_duration_staff: [],
        min_index: 0
    } as ScoreTotal;

    if (type === 'fbb') {
        score.fbb_data.push(newobj);
    }
    else {
        score.arena_data.push(newobj);
    }

    return newobj
}


export const shipnum = (ship: Ship) => (ship.hull - (ship.attack * ship.attacks_per_second)) / (ship.hull + (ship.attack * ship.attacks_per_second));

export const characterizeCrew = (crew: CrewMember) => {
    let ability = crew.action.ability?.type;
    let action = crew.action.bonus_type;
    const result = {
        offense: 0,
        defense: 0
    }
    if (ability) {
        if (OFFENSE_ABILITIES.includes(ability)) result.offense++;
        if (DEFENSE_ABILITIES.includes(ability)) result.defense++;
    }
    if (result.defense > result.offense) return -1;

    if (OFFENSE_ACTIONS.includes(action)) result.offense++;
    if (DEFENSE_ACTIONS.includes(action)) result.defense++;

    if (result.defense > result.offense) return -1;
    else return 1;
}

export const shipCompatibility = (ship: Ship, crew: CrewMember) => {
    let compat = 0;
    let trigger = false;
    let seat = false;
    if (ship.battle_stations?.some(bs => crew.skill_order.includes(bs.skill))) {
        seat = true;
        if (crew.action.ability?.condition) {
            compat += 0.25;
        }
        else {
            compat += 1;
        }
    }
    if (crew.action.ability?.condition) {
        if (ship.actions?.some(a => a.status == crew.action.ability?.condition)) {
            compat += 0.75;
            trigger = true;
        }
    }
    return { score: compat, trigger, seat } as ShipCompat;
}

export const getBosses = (ship?: Ship, crew?: CrewMember) => {
    const bosses = [] as Ship[];
    AllBosses.forEach((boss, idx) => {
        let rarity = boss.id - 1;
        if (ship) {
            if (rarity === 5 && ship.rarity !== 5) return;
            if (rarity === 4 && ship.rarity < 4) return;
            if (rarity === 3 && (ship.rarity < 3 || ship.rarity > 4)) return;
            if (rarity === 2 && (ship.rarity < 2 || ship.rarity > 4)) return;
            if (rarity === 1 && ship.rarity > 3) return;
            if (rarity === 0 && ship.rarity > 2) return;
        }
        if (crew) {
            if (boss.id === 1 && ![1, 2].includes(crew.max_rarity)) return;
            if (boss.id === 2 && ![1, 2, 3].includes(crew.max_rarity)) return;
            if (boss.id === 3 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
            if (boss.id === 4 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
            if (boss.id === 5 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
            if (boss.id === 6 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
        }
        bosses.push(boss);
    });

    return bosses;
}

export const getStaffedShip = (ships: Ship[], crew: CrewMember[], ship: string | Ship, fbb: boolean, offs?: Score[], defs?: Score[], c?: CrewMember, no_sort = false, opponent?: Ship, prefer_oppo_time = false, typical_cd = 8) => {
    let data = typeof ship === 'string' ? ships.find(f => f.symbol === ship) : ships.find(f => f.symbol === ship.symbol);
    if (!data?.battle_stations?.length) return undefined;
    data = { ...data } as Ship;

    // if (data.name === 'IKS Bortas') {
    //     console.log("break");
    // }
    let division = getShipDivision(data.rarity);
    let boss = fbb ? getBosses(data).sort((a, b) => b.id - a.id)[0] : undefined;

    data.battle_stations = JSON.parse(JSON.stringify(data.battle_stations)) as BattleStation[];
    let dataskills = data.battle_stations.map(m => m.skill).filter(f => !!f);
    let cloak_time = 0;
    let oppo_time = 0;

    let cloak = data.actions?.find(act => act.status === 2);

    if (cloak && !fbb && cloak.initial_cooldown <= 4) {
        let others = data.actions!.filter(f => f.status !== 2).map(mp => mp.initial_cooldown).filter(c => c > cloak.initial_cooldown).sort((a, b) => a - b);
        let ot = -1;
        if (others.length) ot = others[0];
        cloak_time = (cloak.initial_cooldown + cloak.duration);
        if (ot !== -1 && ot < cloak_time) cloak_time = ot;
    }

    if (opponent) {
        let others = opponent.actions?.filter(f => f.initial_cooldown <= typical_cd && f.bonus_type === 0 || f?.ability?.type === 1 || f?.ability?.type === 5).sort((a, b) => a.initial_cooldown - b.initial_cooldown);
        if (others?.length) {
            oppo_time = others[0].initial_cooldown;
            if (others[0].ability?.type === 10) oppo_time = Math.min(typical_cd - others[0].ability.amount, oppo_time);
        }
    }

    let conds = data?.actions?.map(mp => mp.status).filter(f => f) as number[];
    let skills = data.battle_stations?.map(b => b.skill);

    let cs = [] as CrewMember[];
    let filt = 0;
    while (cs.length < skills.length) {
        if (filt && prefer_oppo_time) prefer_oppo_time = false;
        else if (filt && cloak_time) cloak_time = 0;
        else if (filt) {
            cs = crew;
            break;
        }
        filt++;

        cs = crew.filter(cc =>
            (c && c.symbol === cc.symbol) ||
            ((
                ((!prefer_oppo_time && (!cloak_time || cc.action.initial_cooldown >= cloak_time)) ||
                (prefer_oppo_time && (!oppo_time || cc.action.initial_cooldown <= oppo_time))) &&
            (
                (fbb && cc.max_rarity <= boss!.id) ||
                (!fbb && getCrewDivisions(cc.max_rarity).includes(division))
            ) &&
            (!cc.action.ability?.condition || conds.includes(cc.action.ability.condition)) &&
            cc.skill_order.some(sko => skills.includes(sko))))
        );
    }

    let filtered: CrewMember[] = [];

    if (offs && defs) {
        let dmg = offs.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];
        let repair = defs.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];

        filtered = dmg.concat(repair);
    }
    else {
        filtered = [...cs];
    }

    if (!no_sort) {
        filtered.sort((a, b) => {
            if (c && c.symbol === a.symbol) return -1;
            if (c && c.symbol === b.symbol) return 1;

            if (a.action?.ability?.type === 1 && b.action?.ability?.type === 1) {
                let amet = (a.action.ability.amount / a.action.initial_cooldown) * a.action.bonus_amount;
                let bmet = (b.action.ability.amount / b.action.initial_cooldown) * b.action.bonus_amount;
                return bmet - amet;
            }
            else if (a.action?.ability?.type === 1) {
                return -1;
            }
            else if (b.action?.ability?.type === 1) {
                return 1;
            }

            let r = 0;
            r = b.max_rarity - a.max_rarity;
            if (r) return r;
            if (a.action.ability?.type === b.action.ability?.type && a.action.ability?.type === 2 && a.action.ability?.amount === b.action.ability?.amount) {
                r = ((a.action.cooldown + a.action.duration) - (b.action.cooldown + b.action.duration));
            }
            if (opponent) {
                if (a.action.ability && a.action.ability?.type === b.action?.ability?.type) {
                    let amet = (a.action.ability.amount / a.action.initial_cooldown) * a.action.bonus_amount;
                    let bmet = (b.action.ability.amount / b.action.initial_cooldown) * b.action.bonus_amount;
                    r =  bmet - amet;
                }

                if (!r) r = a.action.initial_cooldown - b.action.initial_cooldown ||
                    (a.action.ability?.type ?? 99) - (b.action.ability?.type ?? 99) ||
                    (b.action.ability?.amount ?? 0) - (a.action.ability?.amount ?? 0) ||
                    a.action.bonus_type - b.action.bonus_type ||
                    b.action.bonus_amount - a.action.bonus_amount;
            }
            else {
                if (!r) r = (a.action.ability?.type ?? 99) - (b.action.ability?.type ?? 99) ||
                    (b.action.ability?.amount ?? 0) - (a.action.ability?.amount ?? 0) ||
                    a.action.bonus_type - b.action.bonus_type ||
                    b.action.bonus_amount - a.action.bonus_amount ||
                    a.action.initial_cooldown - b.action.initial_cooldown;
            }

            return r;
        });
    }

    let used = [] as string[];
    let ct = 0;
    let full = data.battle_stations.length;
    let filled = 0;
    let need_crit = 0;
    let need_boom = 0;
    let need_hr = 0;
    let crit = 0;
    let boom = 0;
    let hr = 0;

    let bonus_power = 99;
    let bonus_check = -1;

    if (full === 1) {
        if (fbb) {
            need_hr = 1;
        }
        else {
            need_boom = 1;
        }
    }
    else if (full === 2) {
        if (fbb) {
            need_hr = 2;
        }
        else {
            need_boom = 1;
            need_crit = 1;
        }
    }
    else if (full === 3) {
        if (fbb) {
            need_hr = 2;
            need_boom = 1;
        }
        else {
            need_boom = 2;
            need_crit = 1;
        }
    }
    else if (full === 4) {
        if (fbb) {
            need_boom = 1;
            need_crit = 1;
            need_hr = 2;
        }
        else {
            need_boom = 3;
            need_crit = 1;
        }
    }

    if (c) {
        if (c.action.ability?.type === 2) {
            need_hr -= 1;
        }
        else if (c.action.ability?.type === 1) {
            need_boom -= 1;
        }
        else if (c.action.ability?.type === 5) {
            need_crit -= 1;
        }
        if (c.action.bonus_type === 0) {
            bonus_power = c.action.bonus_amount;
            bonus_check = c.action.bonus_type;
        }
    }

    let ignore_skill = false;

    for (let pass = 0; pass < 4; pass++) {
        if (pass == 1 || pass == 3) {
            if (filled === full) break;
            ignore_skill = true;
        }
        else {
            if (filled === full) break;
            ignore_skill = false;
        }

        ct = 0;
        for (let bs of data.battle_stations) {
            if (bs.crew) continue;

            let d1 = filtered.find(f => {
                if (f.action.ability?.condition && !pass) return false;
                if (((!ignore_skill && !f.skill_order.some(s => dataskills.includes(s))) || used.includes(f.symbol))) return false;
                if (c && c.symbol === f.symbol) return true;
                if (c && pass === 0) {
                    if (f.action.bonus_type === bonus_check) {
                        if (f.action.bonus_amount > bonus_power) return false;
                    }
                }
                if (f.action.ability?.type === 1 && (boom < need_boom || pass > 1)) {
                    boom++;
                    return true;
                }
                else if (f.action.ability?.type === 5 && (crit < need_crit || pass > 1)) {
                    crit++;
                    return true;
                }
                else if (f.action.ability?.type === 2 && (hr < need_hr || pass > 1)) {
                    hr++;
                    return true;
                }
                else if (pass === 3) {
                    return true;
                }
                return false;
            });
            if (d1) {
                filled++;
                bs.crew = d1;
                used.push(d1.symbol);
            }

            ct++;
        }
    }

    return data;
}

export function createBlankShipScore(kind: 'offense' | 'defense' | 'ship' = 'offense') {
    return {
        kind,
        overall: 0,
        arena: 0,
        fbb: 0,
        divisions: {
            fbb: {},
            arena: {}
        }
    } as ShipRanks;
}

export function scoreToShipScore(score: Score, kind: 'offense' | 'defense' | 'ship'): ShipRanks {

    if (Number.isNaN(score.overall_final) || score.fbb_final == Infinity) {
        score.overall_final = 0;
    }
    if (Number.isNaN(score.arena_final) || score.fbb_final == Infinity) {
        score.arena_final = 0;
    }
    if (Number.isNaN(score.fbb_final) || score.fbb_final == Infinity) {
        score.fbb_final = 0;
    }
    const result = {
        kind,
        overall: score.overall_final,
        arena: score.arena_final,
        fbb: score.fbb_final,
        divisions: {
            fbb: {},
            arena: {}
        }
    }

    score.arena_data.forEach((obj, idx) => {
        if (Number.isNaN(obj.final) || obj.final == Infinity) obj.final = 0;
        result.divisions.arena[obj.group] = obj.final;
    });

    score.fbb_data.forEach((obj, idx) => {
        result.divisions.fbb[obj.group] = obj.final;
        if (Number.isNaN(obj.final) || obj.final == Infinity) obj.final = 0;
    });

    return result;
}

