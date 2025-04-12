import { IDefaultGlobal } from "../../context/globalcontext";
import { CrewMember } from "../../model/crew";
import { EquipmentItem } from "../../model/equipment";
import { CompletionState, PlayerBuffMode, PlayerCrew, PlayerData, PlayerImmortalMode } from "../../model/player";
import { applyCrewBuffs, getSkills, PREPARE_MAX_RARITY, prepareOne } from "../../utils/crewutils";
import { getItemBonuses, ItemBonusInfo } from "../../utils/itemutils";
import { BuffStatTable } from "../../utils/voyageutils";

export const BuffNames = {
    'none': "buffs.no_buffs",
    'player': "buffs.player_buffs",
    'max': "buffs.max_buffs",
    'quipment': "buffs.quipment_buffs",
    'max_quipment_2': "buffs.max_quipment_buffs_double",
    'max_quipment_3': "buffs.max_quipment_buffs_triple",
}

export const ImmortalNames = {
    "owned": "crew_state.owned_rarity",
    "min": "crew_state.unfused",
    "full": "crew_state.immortalized",
    "shown_full": "crew_state.shown_immortalized",
    2: "crew_state.stars",
    3: "crew_state.stars",
    4: "crew_state.stars",
    "frozen": "crew_state.frozen",
}

export const ProspectImmortalNames = {
    "owned": "crew_state.prospect_rarity",
    "min": "crew_state.unfused",
    "full": "crew_state.immortalized",
    "shown_full": "crew_state.shown_immortalized",
    2: "crew_state.stars",
    3: "crew_state.stars",
    4: "crew_state.stars",
    "frozen": "crew_state.frozen",
}


export function getAvailableBuffStates(playerData?: PlayerData, buffConfig?: BuffStatTable, crew?: PlayerCrew): PlayerBuffMode[] {
    const hasPlayer = !!playerData?.player?.character?.crew?.length;
    const hasBuff = (buffConfig && Object.keys(buffConfig)?.length) ? true : false;

    if (!hasPlayer && !hasBuff) return ['none'];
    else if (!hasPlayer) return ['none', 'max'];
    else if (crew && !!crew.immortal) return ['none', 'player', 'max', 'quipment'];
    else return ['none', 'player', 'max'];
}

export function getAvailableImmortalStates(crew: PlayerCrew | CrewMember): PlayerImmortalMode[] {
    let v: PlayerImmortalMode[];

    if (!("rarity" in crew) || crew.rarity === 0 || crew.have === false || crew.immortal === CompletionState.DisplayAsImmortalUnowned || crew.immortal === CompletionState.DisplayAsImmortalStatic) {
        if (crew.max_rarity === 5) v = ['min', 2, 3, 4, 'full'];
        else if (crew.max_rarity === 4) v = ['min', 2, 3, 'full'];
        else if (crew.max_rarity === 3) v = ['min', 2, 'full'];
        else if (crew.max_rarity === 2) v = ['min', 'full'];
        else v = ['full'];
    }
    else if (crew.immortal > 0) {
        return ['frozen'];
    }
    else if (crew.immortal <= -1) {
        return['full'];
    }
    else if (crew.rarity === crew.max_rarity && crew.immortal === 0) {
        v = ['owned', 'full'];
    }
    else {
        v ??= [];
        v.push('owned');

        for (let f = crew.rarity + 1; f < crew.max_rarity; f++) {
            if (f === 2 || f === 3 || f === 4) {
                v.push(f);
            }
        }

        v.push('full');
    }

    return v;
}

export function nextBuffState(current: PlayerBuffMode, playerData?: PlayerData, buffConfig?: BuffStatTable, backward?: boolean, crew?: PlayerCrew): PlayerBuffMode {
    const hasPlayer = !!playerData?.player?.character?.crew?.length;
    const hasBuff = (buffConfig && Object.keys(buffConfig)?.length) ? true : false;

    if (!hasPlayer && !hasBuff) return 'none';

    const allowed = getAvailableBuffStates(playerData, buffConfig, crew);
    let x = allowed.indexOf(current);

    if (x === -1) x = 0;

    if (backward) {
        x--;
    }
    else {
        x++;
    }

    if (x < 0) x = allowed.length - 1;
    else if (x >= allowed.length) x = 0;

    return allowed[x];
}

export function nextImmortalCrewState(current: PlayerImmortalMode, crew: PlayerCrew | CrewMember, backward?: boolean): PlayerImmortalMode {
    let v = getAvailableImmortalStates(crew);
    return nextImmortalState(current, v, backward);
}

export function nextImmortalState(current: PlayerImmortalMode, modes: PlayerImmortalMode[], backward?: boolean): PlayerImmortalMode {
    let z = modes.indexOf(current);

    if (z !== -1) {
        if (backward) z--;
        else z++;

        if (z < 0) z = modes.length - 1;
        else if (z >= modes.length) z = 0;

        return modes[z];
    }

    return current;
}



export function applyImmortalState(state: PlayerImmortalMode, reference: CrewMember, playerData?: PlayerData, buffConfig?: BuffStatTable) {
    let pres: PlayerCrew[];
    if (state === 'owned') {
        pres = prepareOne(reference, playerData, buffConfig);
    }
    else if (state === 'shown_full' || state === 'full' || state === 'frozen') {
        pres = prepareOne(reference, playerData, buffConfig, PREPARE_MAX_RARITY);
    }
    else if (state === 'min') {
        pres = prepareOne(reference, playerData, buffConfig, 1);
    }
    else {
        pres = prepareOne(reference, playerData, buffConfig, state);
        if (pres.length) {
            let ret = pres.find(f => "rarity" in f && f.rarity == state)
            if (ret) return ret;
        }
    }

    if ("id" in reference) {
        let ret = pres.find(f => "id" in f && f.id == reference.id);
        if (ret) return ret;
    }
    return pres[0];
}

export class CrewPreparer {

    public static prepareCrewMember(
        dataIn: PlayerCrew | CrewMember | undefined,
        buffMode: PlayerBuffMode,
        immortalMode: PlayerImmortalMode,
        context: IDefaultGlobal,
        useInputQuip?: boolean
    ): [PlayerCrew | CrewMember | undefined, PlayerImmortalMode[] | undefined] {

        const { buffConfig, maxBuffs, playerData } = context.player;
        const { items } = context.core;
        const hasPlayer = !!playerData?.player?.character?.crew?.length;
        let quips = [] as EquipmentItem[];
        let buffs = undefined as ItemBonusInfo[] | undefined;
        let immoMode: PlayerImmortalMode[] | undefined = undefined;
        let have = false;

        if (dataIn) {
            let item: PlayerCrew;

            if (hasPlayer) {
                if (useInputQuip) {
                    let imp = playerData.player.character.crew.find((xcrew) => {
                        if ("id" in dataIn) {
                            return xcrew.id === dataIn.id;
                        }
                        else {
                            return xcrew.symbol === dataIn.symbol;
                        }
                    });
                    if (!imp) imp = dataIn as PlayerCrew;
                    else have = true;
                    item = { ...dataIn, ...imp, kwipment: dataIn.kwipment, q_bits: dataIn.q_bits };
                }
                else {
                    let imp = playerData.player.character.crew.find((xcrew) => {
                        if ("id" in dataIn) {
                            return xcrew.id === dataIn.id;
                        }
                        else {
                            return xcrew.symbol === dataIn.symbol;
                        }
                    });
                    if (!imp) imp = dataIn as PlayerCrew;
                    else have = true;
                    item = { ...dataIn, ...imp };
                }
            }
            else {
                item = dataIn as PlayerCrew;
            }

            item = JSON.parse(JSON.stringify(item)) as PlayerCrew;

            if ((item.kwipment as number[])?.some((q: number) => !!q)) {
                quips = (item.kwipment as number[]).map(q => items.find(i => i.kwipment_id?.toString() === q.toString()) as EquipmentItem)?.filter(q => !!q) ?? [];
                buffs = quips.map(q => getItemBonuses(q));
                item.kwipment_slots = quips.map(q => {
                    return {
                        archetype: q.archetype_id,
                        level: 100,
                        symbol: q.symbol,
                        imageUrl: q.imageUrl
                    }
                });
            }

            immoMode = getAvailableImmortalStates(item);

            if (immortalMode !== 'owned' || (buffMode !== 'none')) {
                let cm: CrewMember | undefined = undefined;
                cm = context.core.crew.find(c => c.symbol === dataIn.symbol);
                if (cm) {
                    cm = { ... cm} as PlayerCrew;
                    cm.kwipment = dataIn.kwipment;
                    cm.kwipment_expiration = dataIn.kwipment_expiration;
                    cm.q_bits = dataIn.q_bits;

                    if (item.immortal === CompletionState.DisplayAsImmortalStatic) {
                        item = applyImmortalState(immortalMode, { ...item, ...cm, q_bits: item.q_bits }, undefined, buffConfig ?? maxBuffs);
                    }
                    else {
                        item = applyImmortalState(immortalMode, { ...item, ...cm, q_bits: item.q_bits }, context.player.playerData, buffConfig ?? maxBuffs);
                    }

                    if ((maxBuffs && Object.keys(maxBuffs)?.length) && ((!hasPlayer && buffMode != 'none') || (buffMode === 'max'))) {
                        if (buffMode === 'quipment' && buffs?.length) applyCrewBuffs(item, maxBuffs, undefined, buffs);
                        else applyCrewBuffs(item, maxBuffs);

                        getSkills(item).forEach(skill => {
                            let sb = item[skill] ?? { core: 0, min: 0, max: 0 };
                            item[skill] = sb;
                        })
                    }
                    else if (buffMode === 'player' && hasPlayer && immortalMode === 'owned' && item.skills && Object.keys(item.skills)?.length) {
                        getSkills(item).forEach(skill => {
                            let sb = item[skill] ?? { core: 0, min: 0, max: 0 };
                            item[skill] = {
                                core: item.skills[skill].core,
                                min: item.skills[skill].range_min,
                                max: item.skills[skill].range_max,
                            };
                            });
                    }
                    else if (hasPlayer && buffConfig && ['player', 'quipment'].includes(buffMode)) {
                        if (buffMode === 'quipment' && buffs?.length) applyCrewBuffs(item, buffConfig, undefined, buffs);
                        else applyCrewBuffs(item, buffConfig);

                        getSkills(item).forEach(skill => {
                            let sb = item[skill] ?? { core: 0, min: 0, max: 0 };
                            item[skill] = sb;
                        });
                    }
                    else {
                        getSkills(item).forEach(skill => {
                            let sb = item.base_skills[skill];
                            item[skill] = {
                                core: sb.core,
                                min: sb.range_min,
                                max: sb.range_max
                            }
                            })
                        }
                }
            }
            else {
                item = JSON.parse(JSON.stringify(item));
                getSkills(item).forEach(skill => {
                    let sb = item.base_skills[skill];
                    item[skill] = {
                        core: sb.core,
                        min: sb.range_min,
                        max: sb.range_max
                    }
                    })
            }
            if (have) {
                item.have = true;
                (item as any)['any_immortal'] = playerData?.player?.character?.crew?.some(c => c.symbol === item.symbol && c.immortal);
            }
            return [item, immoMode];
        }
        return [dataIn, []];
    }
}
