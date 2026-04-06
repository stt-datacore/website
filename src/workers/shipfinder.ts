import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { MetaCacheEntry, Ship } from "../model/ship";
import { AttackInstant } from "../model/worker";
import { AllBosses, getBosses, getCrewDivisions, getShipDivision } from "../utils/shiputils";
import { iterateBattle } from "./battleworkerutils";


export interface ShipFinderConfig {
    ships: Ship[];
    crew: PlayerCrew[];
    metas: MetaCacheEntry[];
    battle_mode: string;
}

export interface ShipFinderResult {
    ships: Ship[];
}

const ShipFinder = {
    findShips: (config: ShipFinderConfig) => {
        return new Promise<ShipFinderResult>((resolve, reject) => {
            const { ships, crew, metas, battle_mode } = config;
            const results = [] as Ship[];

            for (let ship of ships) {
                if (battle_mode === 'pvp') {
                    let div = getShipDivision(ship.rarity);
                    let pmetas = metas.filter(f => f.division === div);
                    for (let meta of pmetas) {
                        let mcrew = meta.crew.map(c => crew.find(fc => fc.symbol === c)!);
                        let battleres = iterateBattle(10, false, ship, mcrew, undefined, undefined, undefined, undefined, undefined, undefined, false, 0, true);
                        let run = processBattleRun(1, battle_mode, battleres, crew, 10);
                        if (run) {
                            let sht = ((run.attack * run.battle_time) / run.opponent_attack);
                            if (ship.tier) ship.tier = (ship.tier + sht) / 2;
                            else ship.tier = sht;
                            if (!results.includes(ship))
                                results.push(ship);
                        }
                    }
                }
                else {
                    let sp = battle_mode.split('_');
                    let div = Number(sp[1]);
                    let boss = AllBosses.find(f => f.id === div)!;
                    let pmetas = metas.filter(f => f.division === div);
                    for (let meta of pmetas) {
                        let mcrew = meta.crew.map(c => crew.find(fc => fc.symbol === c)!);
                        let battleres = iterateBattle(10, true, ship, mcrew, boss, undefined, undefined, undefined, undefined, undefined, false, 0, true);
                        let run = processBattleRun(1, battle_mode, battleres, crew, 10);
                        if (run) {
                            let sht = ((run.attack * run.battle_time) / run.opponent_attack);
                            if (ship.tier) ship.tier = (ship.tier + sht) / 2;
                            else ship.tier = sht;
                            if (!results.includes(ship))
                                results.push(ship);
                        }
                    }
                }
            }

            if (results.length > 1) {
                results.sort((a, b) => b.tier! - a.tier!);
                let max = results[0].tier!;
                for (let ship of results) {
                    ship.tier = Number(((ship.tier! / max) * 100).toFixed(2));
                }
            }
            resolve({
                ships: results
            });
        });
    }
}


 function processBattleRun(id: number, battle_mode: string, attacks: AttackInstant[], crew_set: CrewMember[], rate: number, opponent?: Ship, ignore_skill = false, reference_battle?: boolean) {
    if (!attacks?.length) return null;
    // let lastIdx = attacks.findLastIndex(a => a.actions.some(act => (act as any).comes_from === 'crew'));
    // attacks = attacks.slice(0, lastIdx + 1);
    // if (!attacks?.length) return null;
    let win = attacks.some(a => a.win);
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

    const attack = Math.ceil(attacks.reduce((p, n) => p + n.attack, 0));
    const min_attack = Math.ceil(attacks.reduce((p, n) => p + n.min_attack, 0));
    const max_attack = Math.ceil(attacks.reduce((p, n) => p + n.max_attack, 0));
    const oppo_attack = Math.ceil(attacks.reduce((p, n) => p + n.opponent_attack, 0));
    const oppo_min_attack = Math.ceil(attacks.reduce((p, n) => p + n.opponent_max_attack, 0));
    const oppo_max_attack = Math.ceil(attacks.reduce((p, n) => p + n.opponent_min_attack, 0));

    const battle_time = Math.ceil(attacks.reduce((p, n) => p > n.second ? p : n.second, 0));

    let weighted_attack = 0;

    weighted_attack = Math.ceil(attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / n.second))), 0));

    let highest_attack = 0;
    let high_attack_second = 0;
    let oppo_highest_attack = 0;
    let oppo_high_attack_second = 0;

    const actionIdx = {} as {[key:string]: number}

    const actionPower = {} as {[key:string]: any[] }

    attacks.forEach((attack) => {
        if (attack.comes_from.length) {
            for (let from of attack.comes_from) {
                actionPower[from.action] ??= [];
                actionPower[from.action].push(from);
            }
        }
        if (attack.actions?.length) {
            for (let act of attack.actions) {
                actionIdx[act.symbol] ??= 0;
                actionIdx[act.symbol]++;
            }
        }
        if (attack.max_attack > highest_attack) {
            highest_attack = attack.max_attack;
            high_attack_second = attack.second;
        }
        if (attack.opponent_max_attack > oppo_highest_attack) {
            oppo_highest_attack = attack.opponent_max_attack;
            oppo_high_attack_second = attack.second;
        }
    });
    const uptimes = [] as any[];
    Object.entries(actionIdx).forEach(([action, uptime]) => {
        uptimes.push({
            action,
            uptime: uptime / rate
        });
    });

    let arena_metric = Math.ceil(highest_attack / high_attack_second);
    let skirmish_metric = weighted_attack;
    let fbb_metric = attack;

    const result = {
        id,
        rate,
        battle_mode,
        attack,
        min_attack,
        max_attack,
        opponent_attack: oppo_attack,
        opponent_max_attack: oppo_max_attack,
        opponent_min_attack: oppo_min_attack,
        battle_time,
        crew: result_crew,
        percentile: 0,
        ship: attacks[0].ship,
        weighted_attack,
        skirmish_metric,
        arena_metric,
        fbb_metric,
        opponent: opponent ?? attacks[0].ship,
        win,
        reference_battle,
        uptimes,
        action_powers: actionPower
        //attacks: get_attacks ? attacks : undefined
    };

    return result;
}

export default ShipFinder;