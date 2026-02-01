import { BossShip } from "../model/boss";
import { CrewMember } from "../model/crew";
import { Ship } from "../model/ship";
import { CustomMeta, LineUpMeta, LineUpMetaConfig } from "../model/worker";
import { getBosses, getCrewDivisions, getShipDivision } from "../utils/shiputils";

export function passesMeta(ship: Ship, crew: CrewMember[], meta: LineUpMetaConfig, boss?: BossShip, arena_division?: number, ignore_cloak?: boolean): boolean;
export function passesMeta(ship: Ship, crew: CrewMember[], meta: CustomMeta, boss?: BossShip, arena_division?: number, ignore_cloak?: boolean): boolean;
export function passesMeta(ship: Ship, crew: CrewMember[], meta: LineUpMetaConfig, boss?: BossShip, arena_division?: number, ignore_cloak?: boolean): boolean;
export function passesMeta(ship: Ship, crew: CrewMember[], meta: LineUpMeta | CustomMeta | LineUpMetaConfig, boss?: BossShip, arena_division?: number, ignore_cloak?: boolean): boolean {
    if (typeof meta !== 'string') {
        if (Array.isArray(meta)) {
            return meta.every(m => crew.filter(c => c.action.ability?.type === m.type).length >= m.count);
        }
        else if (meta.custom) {
            return meta.custom.every(m => crew.filter(c => c.action.ability?.type === m.type).length >= m.count);
        }
        else {
            meta = meta.meta;
        }
    }
    let ables = crew.map(m => m.action.ability?.type ?? -1);
    let types = crew.map(m => m.action.bonus_type);
    let grants = ship.actions!.map(a => a.status).filter(f => f !== undefined);
    if (crew.some(c => c.action.ability?.condition && !grants.includes(c.action.ability?.condition))) return false;
    if (arena_division) {
        let ship_division = getShipDivision(ship.rarity);
        let crew_divisions = crew.map(c => getCrewDivisions(c.max_rarity).filter(cd => cd === ship_division)).flat();
        if (crew_divisions.length !== crew.length) return false;
    }
    if (boss) {
        if (!getBosses(ship).some(boss2 => boss.id === boss2.id)) return false;
        if (!crew.every(c => getBosses(undefined, c).some(boss2 => boss.id === boss2.id))) return false;
    }
    if (ship.battle_stations!.length === 1) {
        if (meta.startsWith('arena_boom')) return crew.some(c => c.action?.ability?.type === 1);
        if (meta.startsWith('arena_crit')) return crew.some(c => c.action?.ability?.type === 5);
        return crew.some(c => c.action?.ability?.type === 2);
    }
    if (!ignore_cloak && meta.startsWith('arena')) {
        let cloaks = ship.actions!.filter(f => f.status === 2);
        if (cloaks.length) {
            if (!cloaks.every(cloak => crew.every(c => c.action.initial_cooldown >= cloak.initial_cooldown + cloak.duration))) return false;
        }
    }
    if (meta === 'arena_boom_all') return crew.every(c => c.action?.ability?.type === 1);
    if (meta === 'arena_crit_all') return crew.every(c => c.action?.ability?.type === 5);
    if (ship.battle_stations!.length === 2) {
        if (meta === 'arena_boom_wildcard') return crew.some(c => c.action?.ability?.type === 1);
        if (meta.startsWith('arena')) return crew.some(c => c.action?.ability?.type === 1) && crew.some(c => c.action?.ability?.type === 5);
        return crew.some(c => c.action?.ability?.type === 1) && crew.some(c => c.action?.ability?.type === 2);
    }
    else if (ship.battle_stations!.length === 3) {
        if (meta === 'arena_boom' || meta === 'fbb_0_healer' || meta === 'arena_even') {
            return ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 5).length === 1;
        }
        if (meta === 'arena_crit') {
            return ables.filter(f => f === 5).length === 2 && ables.filter(f => f === 1).length === 1;
        }
        if (meta === 'arena_boom_wildcard' || meta === 'fbb_0_healer_wildcard') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 5).length === 1;
        }
        if (meta === 'arena_crit_wildcard') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 1;
        }
        if (meta === 'fbb_0_healer_evasion') {
            return ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 5).length === 1 && types.filter(f => f === 1).length >= 1;
        }
        if (meta === 'fbb_1_healer') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1;
        }
        if (meta === 'fbb_1_healer_wildcard') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1;
        }
        if (meta === 'fbb_1_healer_evasion') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1 && types.filter(f => f === 1).length >= 1;
        }
        if (meta === 'fbb_1_healer_evasion_wildcard') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1 && types.filter(f => f === 1).length >= 1;
        }
        if (meta === 'fbb_2_healer') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 2;
        }
        if (meta === 'fbb_2_healer_evasion') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 2 && types.filter(f => f === 1).length >= 1;
        }
    }
    else if (ship.battle_stations!.length >= 4) {
        if (meta === 'arena_boom' || meta === 'fbb_0_healer') {
            return ables.filter(f => f === 1).length === 3 && ables.filter(f => f === 5).length === 1;
        }
        if (meta === 'arena_crit') {
            return ables.filter(f => f === 5).length === 3 && ables.filter(f => f === 1).length === 1;
        }
        if (meta === 'arena_crit_wildcard') {
            return ables.filter(f => f === 5).length === 2 && ables.filter(f => f === 1).length === 1;
        }
        if (meta === 'arena_even') {
            return ables.filter(f => f === 5).length === 2 && ables.filter(f => f === 1).length === 2;
        }
        if (meta === 'arena_boom_wildcard' || meta === 'fbb_0_healer_wildcard') {
            return ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 5).length === 1;
        }
        if (meta === 'fbb_0_healer_evasion') {
            return ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 5).length === 2 && types.filter(f => f === 1).length >= 2;
        }
        if (meta === 'fbb_1_healer') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 2).length === 1
        }
        if (meta === 'fbb_1_healer_wildcard') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1;
        }
        if (meta === 'fbb_1_healer_evasion') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 2 && ables.filter(f => f === 2).length === 1 && types.filter(f => f === 1).length >= 2;
        }
        if (meta === 'fbb_1_healer_evasion_wildcard') {
            return ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 2).length === 1 && types.filter(f => f === 1).length >= 2;
        }
        if (meta === 'fbb_2_healer') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 2).length === 2;
        }
        if (meta === 'fbb_2_healer_evasion') {
            return ables.filter(f => f === 1).length === 1 && ables.filter(f => f === 5).length === 1 && ables.filter(f => f === 2).length === 2 && types.filter(f => f === 1).length >= 2;
        }
    }
    return false;
}
