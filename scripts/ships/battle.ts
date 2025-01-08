import { CrewMember } from "../../src/model/crew";
import { BattleMode, Ship } from "../../src/model/ship";
import { AttackInstant, ComesFrom, ShipWorkerItem } from "../../src/model/worker";
import { iterateBattle } from "../../src/workers/battleworkerutils";
import { characterizeCrew, shipCompatibility, getShipDivision, getCrewDivisions, getBosses, MaxDefense, MaxOffense, BattleRunBase, getMaxTime } from "./scoring";

export interface UpTimeRecord {
    action: string;
    uptime: number;
}

export interface ScoringBattleRun extends ShipWorkerItem {
    opponent: Ship;
    uptimes: UpTimeRecord[];
    action_powers: {[key:string]: ComesFrom[] }
}

export function getCleanShipCopy(ship: Ship) {
    ship = JSON.parse(JSON.stringify(ship)) as Ship;
    if (ship.battle_stations?.length) {
        for (let bs of ship.battle_stations) {
            delete bs.crew;
        }
    }
    return ship;
}

export function nextOpponent(ships: Ship[], division: number, i: number) {
    let cship = ships.length;
    let j = i + 1;
    while (j < cship) {
        let oppo = ships[j];
        if (getShipDivision(oppo.rarity) === division) return oppo;
        j++;
    }
    j = i - 1;
    let x = 0;
    while (j > -1) {
        let oppo = ships[j];
        if (getShipDivision(oppo.rarity) === division) x++;
        if (x == 2) return oppo;
        j--;
    }
    return undefined;
}



export const processBattleRun = (id: number, battle_mode: BattleMode, attacks: AttackInstant[], crew_set: CrewMember[], rate: number, opponent?: Ship, ignore_skill = false, reference_battle?: boolean) => {
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
    const battle_time = Math.ceil(attacks.reduce((p, n) => p > n.second ? p : n.second, 0));

    let weighted_attack = 0;

    weighted_attack = Math.ceil(attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / n.second))), 0));

    let highest_attack = 0;
    let high_attack_second = 0;

    const actionIdx = {} as {[key:string]: number}

    const actionPower = {} as {[key:string]: ComesFrom[] }

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
    });
    const uptimes = [] as UpTimeRecord[];
    Object.entries(actionIdx).forEach(([action, uptime]) => {
        uptimes.push({
            action,
            uptime: uptime / rate
        });
    });

    let arena_metric = Math.ceil(highest_attack / high_attack_second);
    let skirmish_metric = weighted_attack;
    let fbb_metric = attack;

    const result: ScoringBattleRun = {
        id,
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

export interface RunRes {
    current_id: number,
    runidx: number
}

export const runBattles = (
    current_id: number,
    rate: number,
    ship: Ship,
    testcrew: CrewMember | CrewMember[],
    allruns: BattleRunBase[],
    runidx: number,
    hrpool: CrewMember[],
    no_arena = false,
    no_fbb = false,
    opponent?: Ship,
    ignore_passives = false,
    arena_variance = 0.2,
    fbb_variance = 0.2,
    reference_battle?: boolean): RunRes => {
    if (!Array.isArray(testcrew)) testcrew = [testcrew];

    const c = testcrew.length ? testcrew[0] : undefined;
    const crewtype = c ? characterizeCrew(c) < 0 ? 'defense' : 'offense' : 'offense';
    const compat = c ? shipCompatibility(ship, c) : { score: 1, trigger: false, seat: true };
    const ship_division = getShipDivision(ship.rarity);
    const crew_divisions = c ? getCrewDivisions(c.max_rarity) : [ship_division];

    const ignore_defeat_arena = false;

    let staff = testcrew;

    let battle_mode: BattleMode = 'pvp';
    let result: AttackInstant[] = [];

    // Test Arena
    if (!no_arena && crew_divisions.includes(ship_division)) {
        result = iterateBattle(rate, false, ship, staff, opponent ?? ship, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true, ignore_defeat_arena, ignore_passives);
        if (result.length) {
            result[0].ship = ship;
            let attack = processBattleRun(current_id, battle_mode, result, staff, rate, opponent, true, reference_battle);
            if (attack) {
                let time = attack.battle_time;
                let dmg = attack.attack; // - fa.attack;
                allruns[runidx++] = {
                    crew: c,
                    ship: ship,
                    damage: dmg,
                    duration: time,
                    type: crewtype,
                    battle: 'arena',
                    seated: staff.map(i => i.symbol),
                    win: !!attack.win,
                    compatibility: compat,
                    limit: c?.action?.limit ?? 0,
                    division: ship_division,
                    opponent,
                    reference_battle: !!reference_battle
                }
            }
        }
    }

    if (!no_fbb) {

        // Test FBB
        let bosses = getBosses(ship, c);
        if (bosses?.length) {
            bosses.sort((a, b) => b.id - a.id);
            bosses.forEach((boss) => {
                let newstaff = [...staff];
                const ignore_defeat_fbb = false; //crewtype === 'offense';

                battle_mode = `fbb_${boss.id - 1}` as BattleMode;
                if (newstaff.length === 1) {
                    if (c?.action.ability?.type === 2) {
                        // newstaff.push(c);
                    }
                    else if (crewtype !== 'defense') {
                        let compathr = hrpool.filter(
                            ff => ff.max_rarity <= boss.id
                            &&
                            (
                                ff.action.bonus_type !== c?.action.bonus_type ||
                                ff.action.bonus_amount < c?.action.bonus_amount
                            )
                        );
                        if (compathr?.length) {
                            let olen = newstaff.length;
                            for (let i = olen; i < ship.battle_stations!.length && i < olen + 2 && i < compathr.length; i++) {
                                newstaff.push(compathr[i-1]);
                            }
                        }
                    }
                }

                let maxtime = 180;

                if (c) {
                    maxtime = getMaxTime(c);
                    //if (maxtime !== 180) return;
                }

                result = iterateBattle(rate, true, ship, newstaff, boss, MaxDefense, MaxOffense, maxtime, undefined, undefined, undefined, fbb_variance, true, ignore_defeat_fbb, ignore_passives);

                if (result.length) {
                    let attack = processBattleRun(current_id++, battle_mode, result, newstaff, rate, boss, true, reference_battle);
                    if (attack) {
                        let time = attack.battle_time;
                        let dmg = attack.attack;

                        // if (c?.action.limit) {
                        //     let exp = getMaxTime(c);
                        //     dmg *= (exp / 180);
                        // }

                        allruns[runidx++] = {
                            crew: c,
                            ship: ship,
                            boss,
                            damage: dmg,
                            duration: time,
                            type: crewtype,
                            battle: 'fbb',
                            seated: newstaff.map(i => i.symbol),
                            win: !!attack.win,
                            compatibility: compat,
                            limit: c?.action?.limit ?? 0,
                            reference_battle: !!reference_battle
                        }
                    }
                }
            });
        }
    }

    return { runidx, current_id };
}

