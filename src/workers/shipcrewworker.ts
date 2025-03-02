import { ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults, AttackInstant, MultiShipWorkerConfig, ShipWorkerTransportItem } from "../model/worker";
import { CrewMember } from "../model/crew";
import { getComboCountBig, getPermutations } from "../utils/misc";
import { compareShipResults } from "../utils/shiputils";
import { canSeatAll, iterateBattle } from "./battleworkerutils";

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig, reportProgress: (data: { percent?: number, progress?: bigint, count?: bigint, accepted?: bigint, format?: string, options?: any, result?: ShipWorkerTransportItem }) => boolean = () => true) => {
        return new Promise<ShipWorkerResults>(async (resolve, reject) => {
            const {
                event_crew,
                rate,
                activation_offsets,
                ship,
                battle_mode,
                opponents,
                defense,
                offense,
                ignore_skill,
                max_iterations,
                simulate,
                ranking_method,
                fixed_activation_delay } = options;

            const opponent = opponents?.length ? opponents[0] : undefined;
            const opponent_variance = options.opponent_variance;

            const starttime = new Date();

            let max_results = options.max_results ?? 100;
            let current_id = 1;

            const workCrew = options.crew;

            let seats = ship.battle_stations?.length ?? 0;

            if (!seats) {
                reject("No battlestations");
                return;
            }

            const get_attacks = options.get_attacks && workCrew.length === seats;

            let wcn = BigInt(workCrew.length);
            let bsn = BigInt(seats);
            let total_combos = getComboCountBig(wcn, bsn);

            let count = max_iterations || total_combos; //crew_combos.length;
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
            const results = [] as ShipWorkerTransportItem[];

            const processBattleRun = (attacks: AttackInstant[], crew_set: CrewMember[]) => {
                let result_crew = [] as CrewMember[];
                const ship = attacks[0].ship;
                let win = attacks.some(a => a.win);

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
                    crew: result_crew.map(c => c.id),
                    percentile: 0,
                    ship: attacks[0].ship.id,
                    weighted_attack,
                    skirmish_metric,
                    arena_metric,
                    fbb_metric,
                    attacks: get_attacks ? attacks : undefined,
                    win
                } as ShipWorkerTransportItem;
            }

            const time = options.max_duration || (battle_mode.startsWith('fbb') ? 180 : 30);

            var last_high: ShipWorkerTransportItem | null = null;
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

            results.length = 0;

            getPermutations(workCrew, seats, count, true, start_index, (set) => {
                i++;
                if (errors) return false;
                if ((i % 100n) == 0n) {
                    let p = ((i * 100n) / count);

                    if (p !== progress) {
                        progress = p;
                        reportProgress({
                            percent: Number(p.toString()),
                            progress: i,
                            count,
                            accepted: BigInt(results.length)
                        });
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
                    }
                    else {
                        let d = compareShipResults(attack, last_high, fbb_mode);
                        if (d < 0 || (attack.win && !fbb_mode)) {
                            accepted = true;
                            last_high = attack;
                        }
                    }

                    if (accepted) {
                        results.push(attack);
                        reportProgress({ result: attack });
                        accepted = false;
                    }

                    return battle_data;
                });

                return res;
            });

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

            reportProgress({
                percent: 100,
                progress: count,
                count,
                accepted: BigInt(results.length),
            });

            const endtime = new Date();
            const run_time = Math.round((endtime.getTime() - starttime.getTime()) / 1000);

            resolve({
                items: results,
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