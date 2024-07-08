import { CrewMember } from "../model/crew";
import { AttackInstant, MultiShipWorkerConfig, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship";
import { compareShipResults } from "../utils/shiputils";
import { canSeatAll, iterateBattle } from "./battleworkerutils";

function factorial(number: number) {
    let result = 1;
    for (let i = 1; i <= number; i++) {
        result *= i;
    }
    return result;
}

function getPermutations<T, U>(array: T[], size: number, count?: number, count_only?: boolean, start_idx?: number, check?: (set: T[]) => U[] | false) {
    var current_iter = 0;
    const mmin = start_idx ?? 0;
    function p(t: T[], i: number) {
        if (t.length === size) {
            if (current_iter >= mmin) {
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

        if (count && current_iter >= count) return;
        p(t.concat(array[i]), i + 1);
        p(t, i + 1);
    }

    var result = [] as U[][];

    p([], 0);
    return result;
}


async function processPermutationsAsync<T, U>(array: T[], size: number, batch_size: number, process: (set: T[][]) => Promise<void>, max?: number) {
    var current_iter = 0;
    var batch = [] as T[][];

    async function p(t: T[], i: number) {
        if (t.length === size) {
            batch.push(t);
            if (batch.length >= batch_size) {
                await process(batch);
                batch.length = 0;
                current_iter++;
            }                            
            return;
        }
        if (i + 1 > array.length) {
            return;
        }

        if (max && current_iter >= max) return;
        p(t.concat(array[i]), i + 1);
        p(t, i + 1);
    }
    await p([], 0);
}

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig, reportProgress: (data: { format?: string, options?: any, result?: ShipWorkerItem }) => boolean = () => true) => {
        return new Promise<ShipWorkerResults>(async (resolve, reject) => {
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
            let current_id = 1;

            const workCrew = options.crew;

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
            let start_index = max_iterations ? 0 : (options.start_index ?? 0);
            let i = start_index;
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
                const fbb_metric = attack; // (attack + max_attack + min_attack) / 3;

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

            getPermutations(workCrew, seats, count, true, start_index, (set) => {
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