import { CrewMember } from "../model/crew";
import { AttackInstant, MultiShipWorkerConfig, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship";
import { compareShipResults } from "../utils/shiputils";
import { canSeatAll, iterateBattle } from "./battleworkerutils";


function factorial(number: bigint) {
    let result = 1n;

    for (let i = 1n; i <= number; i++) {
        result *= i;
    }
    return result;
}

function getPermutations<T, U>(array: T[], size: number, count?: bigint, count_only?: boolean, start_idx?: bigint, check?: (set: T[]) => U[] | false) {
    var current_iter = 0n;
    const mmin = start_idx ?? 0n;
    const mmax = (count ?? 0n) + mmin;
    function p(t: T[], i: number) {
        if (t.length === size) {
            if (current_iter >= mmin && (!mmax || current_iter < mmax)) {
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
            }
            current_iter++;
            return;
        }
        if (i + 1 > array.length) {
            return;
        }

        if (mmax !== 0n && current_iter >= mmax) return;
        p([ ...t, array[i] ], i + 1);
        p(t, i + 1);
    }

    var result = [] as U[][];

    p([], 0);
    return result;
}

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig, reportProgress: (data: { percent?: number, progress?: bigint, count?: bigint, accepted?: bigint, format?: string, options?: any, result?: ShipWorkerItem }) => boolean = () => true) => {
        return new Promise<ShipWorkerResults>(async (resolve, reject) => {
            const {
                event_crew,
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
                ranking_method,
                status_data_only,
                fixed_activation_delay } = options;

            const opponent = opponents?.length ? opponents[0] : undefined;
            const opponent_variance = options.opponent_variance ?? 5;

            const starttime = new Date();

            let max_results = options.max_results ?? 100;
            let current_id = 1;

            const workCrew = options.crew;

            let seats = ship.battle_stations?.length;

            if (!seats) {
                reject("No battlestations");
                return;
            }

            const get_attacks = options.get_attacks && workCrew.length === seats;

            let wcn = BigInt(workCrew.length);
            let bsn = BigInt(seats);
            let total_combos = factorial(wcn) / (factorial(wcn - bsn) * factorial(bsn));

            let count = max_iterations || total_combos; //crew_combos.length;
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
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
                let weighted_attack = 0;
                if (battle_mode === 'skirmish') {
                    weighted_attack = attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / (n.second * 2)))), 0);
                }
                else {
                    weighted_attack = attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / n.second))), 0);
                }

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

                if (fbb_mode) {
                    if (ranking_method === 'min') fbb_metric = min_attack;
                    else if (ranking_method === 'max') fbb_metric = max_attack;
                    else if (ranking_method === 'delta_t') fbb_metric = arena_metric;
                    else if (ranking_method === 'early_boom') fbb_metric = weighted_attack;
                    else if (ranking_method === 'lean_in') fbb_metric = (max_attack + attack) / 2;
                    else if (ranking_method === 'lean_over') fbb_metric = (max_attack + min_attack) / 2;
                    else if (ranking_method === 'lean_out') fbb_metric = (attack + min_attack) / 2;
                }
                else {
                    if (ranking_method === 'min') arena_metric = min_attack;
                    else if (ranking_method === 'max') arena_metric = max_attack;
                    else if (ranking_method === 'standard') arena_metric = attack;
                    else if (ranking_method === 'early_boom') arena_metric = weighted_attack;
                    else if (ranking_method === 'lean_in') arena_metric = (max_attack + attack) / 2;
                    else if (ranking_method === 'lean_over') arena_metric = (max_attack + min_attack) / 2;
                    else if (ranking_method === 'lean_out') arena_metric = (attack + min_attack) / 2;
                }

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
                    skirmish_metric,
                    arena_metric,
                    fbb_metric,
                    attacks: get_attacks ? attacks : undefined
                } as ShipWorkerItem;
            }

            const time = options.max_duration || (battle_mode.startsWith('fbb') ? 180 : 30);

            var last_high: ShipWorkerItem | null = null;
            var errors = false;

            const fbb_mode = battle_mode.startsWith('fbb');

            let c = ship.battle_stations!.length;
            let cbs = [] as number[][];
            for (let i = 0; i < c; i++) {
                for (let j = 0; j < c; j++) {
                    cbs.push([i, j]);
                }
            }

            const allseat = getPermutations<number[], number[]>(cbs, c).filter((f) => {
                let xseen = ship.battle_stations!.map(x => false);
                let yseen = ship.battle_stations!.map(x => false);
                for (let [x, y] of f) {
                    xseen[x] = true;
                    yseen[y] = true;
                }
                return (xseen.every(x => x) && yseen.every(y => y));
            });

            // let cbs = [] as string[];
            // for (let i = 0; i < c; i++) {
            //     for (let j = 0; j < c; j++) {
            //         cbs.push(`${i}_${j}`);
            //     }
            // }


            getPermutations(workCrew, seats, count, true, start_index, (set) => {
                i++;
                if (errors) return false;
                // let test = ['torres_caretaker_crew', 'kirk_chances_crew', 'crusher_j_vox_crew', 'tucker_desert_crew'];
                // if (set.every(s => test.includes(s.symbol))) {
                //     console.log("Inspect");
                // }
                if (!(i % 100n)) {
                    let p = ((i * 100n) / count);

                    if (p !== progress) {
                        progress = p;

                        if (status_data_only) {
                            reportProgress({
                                    percent: Number(p.toString()),
                                    progress: i,
                                    count,
                                    accepted: BigInt(results.length)
                                });
                        }
                        else {
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
                }

                if (event_crew && !set.find(f => f.id === event_crew.id)) return false;

                let newseats = canSeatAll(allseat, ship, set, !!ignore_skill);
                if (!newseats) {
                    return false;
                }

                let res = newseats.map((set) => {
                    let battle_data = iterateBattle(rate, fbb_mode, ship, set, opponent, defense, offense, time, activation_offsets, fixed_activation_delay, simulate, opponent_variance);
                    let attack = processBattleRun(battle_data, set);

                    if (!get_attacks) {
                        battle_data.length = 0;
                    }

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

                return res;
            });

            if (!status_data_only) {
                reportProgress({ format: 'ship.calc.sorting_finalizing_ellipses' });
            }

            results.sort((a, b) => compareShipResults(a, b, fbb_mode));
            results.splice(max_results);
            results.forEach((result) => {
                if (fbb_mode) {
                    let max = results[0].fbb_metric;
                    result.percentile = (result.fbb_metric / max) * 100;
                }
                else {
                    let max = results[0].arena_metric;
                    result.percentile = (result.arena_metric / max) * 100;
                }
            });

            const endtime = new Date();
            const run_time = Math.round((endtime.getTime() - starttime.getTime()) / 1000);

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