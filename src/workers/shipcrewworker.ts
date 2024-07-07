import { CrewMember } from "../model/crew";
import { AttackInstant, MultiShipWorkerConfig, ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship";
import { crewCopy } from "../utils/crewutils";
import { compareShipResults } from "../utils/shiputils";
import { canSeatAll, iterateBattle } from "./battleworkerutils";

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

            // const worksets = [] as CrewMember[][];
            
            // await processPermutationsAsync(workCrew, seats, 10, async (sets) => {
            //     i+=sets.length;
            //     if (errors) return;
            //     if (!(i % 100)) {
            //         let p = Math.round((i / count) * 100);

            //         if (p !== progress) {
            //             progress = p;
            //             if (!verbose) {
            //                 reportProgress({ format: 'ship.calc.calculating_pct_ellipses', options: { percent: `${p}` } });
            //             }
            //             else {
            //                 reportProgress({ format: 'ship.calc.calculating_pct_ellipses_verbose', 
            //                     options: { 
            //                         percent: `${p}`,
            //                         progress: `${i.toLocaleString()}`,
            //                         count: `${count.toLocaleString()}`,
            //                         accepted: `${results.length.toLocaleString()}`
            //                     } 
            //                 });
            //             }
            //         }
            //     }

            //     sets.forEach((set) => {
            //         let newseats = canSeatAll(ship, set, !!ignore_skill);
            //         if (!newseats) {
            //             return false;
            //         }
                    
            //         set = newseats;
            //         worksets.push(set);
            //     });

            //     let battle_results = [] as ShipWorkerItem[];
              
            //     const battleConfig = { rate, fbb_mode, input_ship: ship, crew: [], opponent, defense, offense, time, activation_offsets, fixed_delay: fixed_activation_delay, simulate } as IterateBattleConfig;

            //     let battle_res = await iterateBattleBatch(battleConfig, worksets);
            //     let x = 0;
            //     for (let battle_data of battle_res) {
            //         let set = worksets[x++];
            //         let attack = processBattleRun(battle_data, set);

            //         if (!get_attacks) battle_data.length = 0;
            //         let accepted = false;
            //         if (last_high === null) {
            //             last_high = attack;
            //             accepted = true;
            //             results.push(attack);
            //             battle_results.push(attack);
            //         }
            //         else {
            //             let d = compareShipResults(attack, last_high, fbb_mode);
            //             if (d < 0) {
            //                 accepted = true;
            //                 results.push(attack);
            //                 battle_results.push(attack);
            //                 last_high = attack;
            //             }
            //         }
    
            //         if (accepted) {
            //             reportProgress({ result: attack });
            //             accepted = false;
            //         }        
            //     }
            //     worksets.length = 0;                
            // }, max_iterations);


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