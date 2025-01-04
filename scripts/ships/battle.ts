import { CrewMember } from "../../src/model/crew";
import { BattleMode, Ship } from "../../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../../src/model/worker";
import { iterateBattle } from "../../src/workers/battleworkerutils";
import { BattleRun, characterizeCrew, shipCompatibility, getShipDivision, getCrewDivisions, getBosses, MaxDefense, MaxOffense } from "./scoring";

export const processBattleRun = (id: number, battle_mode: BattleMode, attacks: AttackInstant[], crew_set: CrewMember[], rate: number, opponent?: Ship, ignore_skill = false) => {
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

    const attack = attacks.reduce((p, n) => p + n.attack, 0);
    const min_attack = attacks.reduce((p, n) => p + n.min_attack, 0);
    const max_attack = attacks.reduce((p, n) => p + n.max_attack, 0);
    const battle_time = attacks.reduce((p, n) => p > n.second ? p : n.second, 0);

    let weighted_attack = 0;

    weighted_attack = attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / n.second))), 0);

    let highest_attack = 0;
    let high_attack_second = 0;

    attacks.forEach((attack) => {
        if (attack.max_attack > highest_attack) {
            highest_attack = attack.max_attack;
            high_attack_second = attack.second;
        }
    });

    let arena_metric = (highest_attack / high_attack_second);
    let skirmish_metric = weighted_attack;
    let fbb_metric = attack;

    return {
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
        win
        //attacks: get_attacks ? attacks : undefined
    } as ShipWorkerItem & { opponent: Ship };
}

export const runBattles = (
    current_id: number,
    rate: number,
    ship: Ship,
    testcrew: CrewMember | CrewMember[],
    allruns: BattleRun[],
    runidx: number,
    hrpool: CrewMember[],
    no_arena = false,
    no_fbb = false,
    opponent?: Ship,
    ignore_passives = false,
    arena_variance = 0.2,
    fbb_variance = 0.2) => {
    if (!Array.isArray(testcrew)) testcrew = [testcrew];

    const c = testcrew[0];

    const crewtype = characterizeCrew(c) < 0 ? 'defense' : 'offense';
    const compat = shipCompatibility(ship, c);
    const ship_division = getShipDivision(ship.rarity);
    const crew_divisions = getCrewDivisions(c.max_rarity);

    const ignore_defeat_arena = false;
    const ignore_defeat_fbb = false;

    let staff = testcrew;

    let battle_mode: BattleMode = 'pvp';
    let result: AttackInstant[] = [];

    // Test Arena
    if (!no_arena && crew_divisions.includes(ship_division)) {
        result = iterateBattle(rate, false, ship, staff, opponent ?? ship, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true, ignore_defeat_arena, ignore_passives);
        if (result.length) {
            result[0].ship = ship;
            let attack = processBattleRun(current_id, battle_mode, result, staff, rate, opponent);
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
                    limit: c.action?.limit ?? 0,
                    division: ship_division,
                    opponent
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

                battle_mode = `fbb_${boss.id - 1}` as BattleMode;

                if (newstaff.length === 1) {
                    if (c.action.ability?.type === 2) {
                        // newstaff.push(c);
                    }
                    else if (crewtype !== 'defense') {
                        let compathr = hrpool.filter(
                            ff => ff.max_rarity <= boss.id
                            &&
                            (
                                ff.action.bonus_type !== c.action.bonus_type ||
                                ff.action.bonus_amount < c.action.bonus_amount
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

                result = iterateBattle(rate, true, ship, newstaff, boss, MaxDefense, MaxOffense, undefined, undefined, undefined, undefined, fbb_variance, true, ignore_defeat_fbb, ignore_passives);
                if (result.length) {
                    let attack = processBattleRun(current_id++, battle_mode, result, newstaff, rate, boss);
                    if (attack) {
                        let time = attack.battle_time;
                        let dmg = attack.attack;

                        if (c.action.limit) {
                            let exp = (c.action.limit * c.action.duration) +
                                      ((c.action.limit - 1) * c.action.cooldown) +
                                      c.action.initial_cooldown;

                            dmg *= (exp / 180);
                        }

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
                            limit: c.action?.limit ?? 0
                        }
                    }
                }
            });
        }
    }

    return { runidx, current_id };
}

