import fs from 'fs';
import { CrewMember, ShipRanks } from "../src/model/crew";
import { Ship, Schematics, BattleMode } from "../src/model/ship";
import { highestLevel, mergeShips } from "../src/utils/shiputils";
import { exit } from 'process';
import { processShips } from './ships/processing';
import { Score, getShipDivision, BattleRun, createScore, getScore, Scoreable, SymbolScore, characterizeCrew, shipnum, getStaffedShip, BattleRunBase, scoreToShipScore, createBlankShipScore } from './ships/scoring';
import { getCleanShipCopy, runBattles } from './ships/battle';
import { battleRunsToCache, cacheToBattleRuns, readBattleCache } from './ships/cache';

const STATIC_PATH = `${__dirname}/../../static/structured/`;

function processCrewShipStats(rate = 10, arena_variance = 0, fbb_variance = 0) {

    const Triggers = {
        0: 'None',
        1: 'Position',
        2: 'Cloak',
        4: 'Boarding',
    }
    const printTrigger = (c: CrewMember) => {
        if (!c.action.ability?.condition && !c.action.limit) return '';
        else if (c.action.ability?.condition && c.action.limit) {
            return ` (${Triggers[c.action.ability.condition]}, ${c.action.limit})`;
        }
        else if (c.action.ability?.condition) {
            return ` (${Triggers[c.action.ability.condition]})`;
        }
        else if (c.action?.limit) {
            return ` (${c.action.limit})`;
        }
        return "";
    }

    const runStart = new Date();

    const ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
    const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

    let runqueue = [] as CrewMember[];

    const boompool = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
    const critpool = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
    const hrpool = crew.filter(f => f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);

    const crewcategories = {} as { [key: string]: 'defense' | 'offense' }
    const crewcooldowns = {} as { [cooldown: string]: string[] }

    crew.forEach((c) => {
        crewcategories[c.symbol] = characterizeCrew(c) < 0 ? 'defense' : 'offense';
        crewcooldowns[c.action.initial_cooldown] ??= [];
        crewcooldowns[c.action.initial_cooldown].push(c.symbol);
    });

    const typical_cd = (() => {
        let typicalcd = 0;
        let symlen = 0;
        for (let [cooldown, symbols] of Object.entries(crewcooldowns)) {
            let n = Number(cooldown);
            if (!symlen || symlen < symbols.length) {
                symlen = symbols.length;
                typicalcd = n;
            }
        }
        return typicalcd;
    })();

    const ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), [], true);
    ships.sort((a, b) => shipnum(b) - shipnum(a));

    const origShips = JSON.parse(JSON.stringify(ships)) as Ship[];

    const cacheFile = "./battle_run_cache.json";
    let cached = readBattleCache(cacheFile, process.argv.includes("--fresh"))

    if (cached?.length) {
        let m = cached.map(m => m.crew)
        let n = crew.map(m => m.symbol);
        m = m.filter((c, i) => m.findIndex(cc => cc === c) === i);
        n = n.filter((c, i) => n.findIndex(cc => cc === c) === i && !m.includes(c));
        if (n.length) {
            runqueue = n.map(s => crew.find(c => c.symbol === s)!);
            if (runqueue.length) {
                console.log(`Updating cache with ${runqueue.length} new crew...`);
            }
        }
    }

    let allruns = [] as BattleRunBase[];

    let runidx = 0;
    let current_id = 1;

    let count = 1;
    let cship = ships.length;

    const nextOpponent = (division: number, i: number) => {
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

    if (!cached?.length || runqueue.length) {
        const workcrew = runqueue.length ? runqueue : crew;

        if (cached.length) {
            allruns = cacheToBattleRuns(ships, crew, cached);
            runidx = allruns.length;
        }

        console.log("Calculate crew and ship battle scores...");
        console.log(`Frame Rate: ${rate} per second.`)

        allruns.length = (ships.length * crew.length * 18);
        console.log(`Alloc ${allruns.length} items.`);

        let calclen = ships.length * 4;

        for (let i = 0; i < cship; i++) {
            const ship = ships[i];
            const opponent = nextOpponent(getShipDivision(ship.rarity), i);

            let runres = runBattles(current_id, rate, getCleanShipCopy(ship), [], allruns, runidx, hrpool, false, false, undefined, false, arena_variance, fbb_variance, true);

            runidx = runres.runidx;
            current_id = runres.current_id;

            let work_oppo = undefined as Ship | undefined;
            let work_ship = undefined as Ship | undefined

            console.log(`Run all crew on ${ship.name} (FBB Only) (${count++} / ${calclen})...`);

            for (let c of workcrew) {
                work_ship = getCleanShipCopy(ship);
                let runres = runBattles(current_id, rate, work_ship, c, allruns, runidx, hrpool, true, false, undefined, false, arena_variance, fbb_variance);

                runidx = runres.runidx;
                current_id = runres.current_id;
            }

            console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: SELF) (${count++} / ${calclen})...`);

            for (let c of workcrew) {
                work_ship = getCleanShipCopy(ship);
                let runres = runBattles(current_id, rate, work_ship, c, allruns, runidx, hrpool, false, true, undefined, false, arena_variance, fbb_variance);

                runidx = runres.runidx;
                current_id = runres.current_id;
            }

            console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: ${opponent?.name ?? 'NONE'}) (${count++} / ${calclen})...`);
            if (opponent) {
                runres = runBattles(current_id, rate, getCleanShipCopy(ship), [], allruns, runidx, hrpool, false, true, getCleanShipCopy(opponent), false, arena_variance, fbb_variance, true);
                runidx = runres.runidx;
                current_id = runres.current_id;
                runres = runBattles(current_id, rate, getCleanShipCopy(opponent), [], allruns, runidx, hrpool, false, true, getCleanShipCopy(ship), false, arena_variance, fbb_variance, true);
                runidx = runres.runidx;
                current_id = runres.current_id;
            }

            for (let c of workcrew) {
                work_ship = getCleanShipCopy(ship);
                if (opponent) work_oppo = getCleanShipCopy(opponent);
                if (work_oppo?.battle_stations?.length) {
                    work_oppo.battle_stations[0].crew = c;
                }
                let runres = runBattles(current_id, rate, work_ship, c, allruns, runidx, hrpool, false, true, work_oppo, false, arena_variance, fbb_variance);

                runidx = runres.runidx;
                current_id = runres.current_id;
            }

            if (opponent) {
                console.log(`Run all crew on ${opponent.name} (Arena Only; Opponent: ${work_ship?.name}) (${count++} / ${calclen})...`);
                for (let c of workcrew) {
                    work_ship = getCleanShipCopy(ship);
                    work_oppo = getCleanShipCopy(opponent);
                    if (work_ship?.battle_stations?.length) {
                        work_ship.battle_stations[0].crew = c;
                    }
                    let runres = runBattles(current_id, rate, work_oppo, c, allruns, runidx, hrpool, false, true, work_ship, false, arena_variance, fbb_variance);

                    runidx = runres.runidx;
                    current_id = runres.current_id;
                }
            }
        }

        console.log("Saving battle run cache...");
        allruns.splice(runidx);

        battleRunsToCache(allruns, cacheFile);
    }
    else {
        allruns = cacheToBattleRuns(ships, crew, cached);
        runidx = allruns.length;
    }

    console.log("Filtering runs into arena and fbb buckets ...");

    const origruns = allruns.slice();

    const fbbruns: BattleRunBase[] = [];
    fbbruns.length = runidx;
    const arenaruns: BattleRunBase[] = [];
    arenaruns.length = runidx;

    const fbbruns_reference: BattleRunBase[] = [];
    fbbruns.length = runidx;
    const arenaruns_reference: BattleRunBase[] = [];
    arenaruns.length = runidx;

    let fc = 0;
    let ac = 0;
    let rfc = 0;
    let rac = 0;

    for (let run of allruns) {
        if (run.reference_battle) {
            if (run.battle === 'fbb') {
                fbbruns_reference[rfc++] = run;
            }
            else if (run.battle === 'arena') {
                arenaruns_reference[rac++] = run;
            }
        }
        else {
            if (run.battle === 'fbb') {
                fbbruns[fc++] = run;
            }
            else if (run.battle === 'arena') {
                arenaruns[ac++] = run;
            }
        }
    }

    fbbruns.splice(fc);
    arenaruns.splice(ac);
    fbbruns_reference.splice(rfc);
    arenaruns_reference.splice(rac);

    // console.log("Subtracting reference scores...");

    // for (let arena of arenaruns) {
    //     let ref = arenaruns_reference.find(ff => ff.ship.symbol === arena.ship.symbol && ff.opponent?.symbol === arena.opponent?.symbol);
    //     if (ref) {
    //         arena.damage -= ref.damage;
    //         //arena.duration -= ref.duration;
    //     }
    // }

    // for (let fbb of fbbruns) {
    //     let ref = fbbruns_reference.find(ff => ff.ship.symbol === fbb.ship.symbol && ff.boss?.id === fbb.boss?.id);
    //     if (ref) {
    //         fbb.damage -= ref.damage;
    //         //fbb.duration -= ref.duration;
    //     }
    // }

    allruns.length = 0;

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    const createScoreData = (trigger_compat: boolean, seat_compat: boolean, bypass_crew = false) => {
        shipscores.length = 0;
        if (!bypass_crew) crewscores.length = 0;

        const scoreRun = (runs: BattleRunBase[], is_fbb: boolean, scores: Score[], score_type: 'crew' | 'ship') => {
            if (!is_fbb && score_type === 'crew') {
                runs.sort((a, b) => {
                    if (a.type !== b.type) {
                        if (a.type === 'defense') return 1;
                        else return -1;
                    }
                    if (a.type === 'defense') {
                        return (b.compatibility.score - a.compatibility.score || b.duration - a.duration || b.damage - a.damage);
                    }
                    else {
                        return (a.win != b.win) ? (a.win ? -1 : 1) : (b.compatibility.score - a.compatibility.score || ((b.damage / b.duration) - (a.damage / a.duration)));
                    }
                });
            }
            else if (!is_fbb && score_type === 'ship') {
                runs.sort((a, b) => {
                    //return (b.compatibility.score - a.compatibility.score || b.damage - a.damage || a.duration - b.duration);
                    return (a.win != b.win) ? (a.win ? -1 : 1) : (b.compatibility.score - a.compatibility.score || b.damage - a.damage || a.duration - b.duration);
                });
            }
            else if (is_fbb) {
                runs.sort((a, b) => b.compatibility.score - a.compatibility.score || b.damage - a.damage || b.duration - a.duration);
            }

            let z = -1;
            let score: Score | undefined = undefined;
            const indexes = {} as { [symbol: string]: { [div: string]: number[] } };

            for (let run of runs) {
                z++;
                if (trigger_compat && (run.compatibility.trigger === true && run.compatibility.score !== 1)) continue;
                if (seat_compat && !run.compatibility.seat) continue;

                let item: CrewMember | Ship;
                if (score_type === 'crew') {
                    item = crew.find(f => f.symbol === run.crew.symbol)!;
                }
                else {
                    item = ships.find(f => f.symbol === run.ship.symbol)!;
                }

                score = scores.find(cs => cs.symbol === item.symbol);

                if (!score) {
                    score = createScore(score_type, item.symbol);
                    scores.push(score);
                }

                const div_id = is_fbb ? (run.boss?.id ?? 0) : run.division ?? 0;

                indexes[item.symbol] ??= {}
                indexes[item.symbol][div_id] ??= [];
                indexes[item.symbol][div_id].push(z);

                const scoreset = getScore(score, is_fbb ? 'fbb' : 'arena', div_id);
                scoreset.original_indices.push(z);

                if (run.compatibility.score === 1) {
                    if (score_type === 'crew') {
                        scoreset.compat = [...new Set([...scoreset.compat, run.ship.symbol])]
                    }
                }
                else {
                    if (score_type === 'crew') {
                        scoreset.incompat = [...new Set([...scoreset.incompat, run.ship.symbol])]
                    }
                }

                if (run.damage > scoreset.max_damage) {
                    scoreset.max_damage = run.damage;
                    scoreset.max_ship = run.ship.symbol;
                    if (run.seated?.length) {
                        scoreset.max_staff = [...run.seated]
                    }
                    else {
                        scoreset.max_staff = [run.crew.symbol]
                    }
                    scoreset.max_compat = run.compatibility.score;
                }
                if (run.duration >= scoreset.max_duration) {
                    let process = true;
                    if (run.duration === scoreset.max_duration) {
                        process = run.damage > scoreset.max_damage;
                    }
                    if (process) {
                        scoreset.max_duration = run.duration;
                        scoreset.max_duration_ship = run.ship.symbol;
                        if (run.seated?.length) {
                            scoreset.max_duration_staff = [...run.seated]
                        }
                        else {
                            scoreset.max_duration_staff = [run.crew.symbol]
                        }
                    }
                }
                if (!scoreset.min_damage || run.damage < scoreset.min_damage) {
                    scoreset.min_damage = run.damage;
                    scoreset.min_ship = run.ship.symbol;
                    if (run.seated?.length) {
                        scoreset.min_staff = [...run.seated]
                    }
                    else {
                        scoreset.min_staff = [run.crew.symbol]
                    }
                    scoreset.min_compat = run.compatibility.score;
                }

                scoreset.total_compat += run.compatibility.score;
                scoreset.duration += run.duration;
                scoreset.total_damage += run.damage;
                scoreset.count++;

                if (run.win) scoreset.win_count++;
            }

            Object.entries(indexes).forEach(([symbol, groups]) => {
                Object.entries(groups).forEach(([group, values]) => {
                    if (!values.length) return;
                    score = scores.find(cs => cs.symbol === symbol);
                    if (score) {
                        const scoreset = getScore(score, is_fbb ? 'fbb' : 'arena', Number(group));
                        if (values.length > 2) {
                            scoreset.median_index = values[Math.floor(values.length / 2)];
                        }
                        scoreset.average_index = values.reduce((p, n) => p + n, 0) / values.length;
                    }
                });
            });
        }

        [arenaruns, fbbruns].forEach((runs, idx) => {
            if (!bypass_crew) {
                if (!idx) console.log("Creating arena crew score sets...");
                if (idx) console.log("Creating FBB crew score sets...");
                scoreRun(runs, !!idx, crewscores, 'crew');
            }
            if (!idx) console.log("Creating arena ship score sets...");
            if (idx) console.log("Creating FBB ship score sets...");
            scoreRun(runs, !!idx, shipscores, 'ship');
        });
    }

    const normalizeScores = (scores: Score[]) => {
        let max = 0;
        let z = 0;
        if (!scores.length) return;
        let changes = true;

        const _calc = (key: string) => {
            scores.sort((a, b) => b[key] - a[key]);
            max = scores[0][key];
            for (let score of scores) {
                score[key] = Math.round((score[key] / max) * 1000) / 100;
            }
        }

        _calc("arena_final");
        _calc("fbb_final");

        const arena_max = {} as { [key: string]: number };
        const fbb_max = {} as { [key: string]: number };
        // Compute overall from normalized component scores
        scores.forEach((score) => {
            score.overall_final = (score.fbb_final + score.arena_final);

            [score.arena_data, score.fbb_data].forEach((data, idx) => {
                data.forEach((unit) => {
                    if (idx == 0) {
                        arena_max[unit.group] ??= 0;
                        if (arena_max[unit.group] < unit.final) {
                            arena_max[unit.group] = unit.final;
                        }
                    }
                    else {
                        fbb_max[unit.group] ??= 0;
                        if (fbb_max[unit.group] < unit.final) {
                            fbb_max[unit.group] = unit.final;
                        }
                    }
                });
            });
        });

        scores.forEach((score) => {
            [score.arena_data, score.fbb_data].forEach((data, idx) => {
                data.forEach((unit) => {
                    if (idx === 0) {
                        unit.final = Math.round((unit.final / arena_max[unit.group]) * 1000) / 100;
                    }
                    else {
                        unit.final = Math.round((unit.final / fbb_max[unit.group]) * 1000) / 100;
                    }

                });
            });
        });

        // Normalize overall score
        _calc("overall_final");
    }

    const processScores = (scores: Score[], score_mode: 'defense' | 'offense' | 'ship') => {
        scores.forEach((score) => {
            score.arena_data.sort((a, b) => a.group - b.group);
            score.fbb_data.sort((a, b) => b.group - a.group);
            score.arena_data.forEach((data) => {
                data.average_damage = data.total_damage / data.count;
                data.average_compat = data.total_compat / data.count;
            });

            score.fbb_data.forEach((data) => {
                data.average_damage = data.total_damage / data.count;
                data.average_compat = data.total_compat / data.count;
            });
        });

        const getLikeScores = (score: Score, mode: 'arena' | 'fbb', group: number) => {
            let results = scores.filter(s => {
                if (score.kind != s.kind) return false;
                if (mode === 'arena') {
                    return s.arena_data.some(a => a.group === group);
                }
                else {
                    return s.fbb_data.some(a => a.group === group);
                }
            });
            return results.map(s => {
                if (mode === 'arena') {
                    return s.arena_data.find(f => f.group === group)!
                }
                else {
                    return s.fbb_data.find(f => f.group === group)!
                }
            });
        }

        const getTopScore = (scores: Scoreable[], mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                if (score_mode === 'defense') {
                    return scores.map(ss => ss.duration * ss.total_damage).reduce((p, n) => p > n ? p : n, 0);
                }
                else {
                    return scores.map(ss => ss.total_damage).reduce((p, n) => p > n ? p : n, 0);
                }
            }
            else {
                return arenaruns.length;
            }
        }

        const getWinScore = (scores: Scoreable[], mode: 'arena' | 'fbb') => {
            let result = scores.map(ss => ss.win_count).reduce((p, n) => p > n ? p : n, 0);
            if (result) return result;
            if (mode === 'fbb') {
                return scores.map(ss => ss.total_damage).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return scores.map(ss => ss.duration).reduce((p, n) => p > n ? p : n, 0);
            }
        }

        const getMyScore = (top: number, score: Scoreable, mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                if (score_mode === 'defense') {
                    //return arenaruns.length - score.average_index;
                    return score.duration * score.total_damage;
                }
                else {
                    return score.total_damage;
                }
            }
            else {
                return arenaruns.length - Math.floor((score.median_index + score.average_index) * 0.5);
            }
        }

        const getMyWinScore = (top: number, score: Scoreable, mode: 'arena' | 'fbb') => {
            let result = score.win_count;
            if (top) return result;

            if (mode === 'fbb') {
                return score.total_damage;
            }
            else {
                return score.duration;
            }
        }

        const computeScore = <T extends Ship | CrewMember>(score: Score, c: T) => {
            let scorearena = score.arena_data.sort((a, b) => a.group - b.group);
            let scorefbb = score.fbb_data.sort((a, b) => b.group - a.group);

            let a_groups = scorearena.map(m => m.group);
            let b_groups = scorefbb.map(m => m.group);

            for (let ag of a_groups) {
                const raw_score = score.arena_data.find(f => f.group === ag)!;
                const ls_arena = getLikeScores(score, 'arena', ag);
                const topscore_arena = getTopScore(ls_arena, 'arena');

                score.name = c.name!;

                let my_arena_score = getMyScore(topscore_arena, raw_score, 'arena');

                let my_arena = (my_arena_score / topscore_arena) * 100;
                raw_score.final = my_arena * raw_score.average_compat;
                if ("action" in c) {
                    if (!c.action.ability) {
                        raw_score.final *= 0.25;
                    }
                }

                // const maxwins_arena = getWinScore(ls_arena, 'arena');
                // let mywins_arena = getMyWinScore(maxwins_arena, raw_score, 'arena');

                // if (score_mode === 'offense' && maxwins_arena && mywins_arena) {
                //     let my_arenawin = (mywins_arena / maxwins_arena);
                //     raw_score.final = my_arena * my_arenawin;
                // }
                // else {
                //     raw_score.final = my_arena;
                // }
            }

            for (let bg of b_groups) {
                const raw_score = score.fbb_data.find(f => f.group === bg)!;
                const ls_fbb = getLikeScores(score, 'fbb', bg);
                const topscore_fbb = getTopScore(ls_fbb, 'fbb');

                score.name = c.name!;

                let my_fbb_score = getMyScore(topscore_fbb, raw_score, 'fbb');
                let my_fbb = (my_fbb_score / topscore_fbb) * 100;

                raw_score.final = my_fbb * raw_score.average_compat;
                if ("action" in c) {
                    if (!c.action.ability) {
                        raw_score.final *= 0.25;
                    }
                }
            }

            if (score_mode === 'ship') {
                scorearena = scorearena.sort((a, b) => b.group - a.group).slice(0, 1);
                scorefbb = scorefbb.sort((a, b) => b.group - a.group).slice(0, 1);
                // score.arena_data = scorearena;
                // score.fbb_data = scorefbb;
            }
            else {
                scorearena.sort((a, b) => a.group - b.group);
                scorefbb.sort((a, b) => a.group - b.group);
            }
            score.arena_final = scorearena.map(m => m.final + (m.final / (4 - m.group))).reduce((p, n) => p + n, 0) / scorearena.length;
            score.fbb_final = scorefbb.map(m => m.final + (m.final / (7 - m.group))).reduce((p, n) => p + n, 0) / scorefbb.length;
        }

        const overallMap = {} as {[key: string]: string[]};
        const arenaMap = {} as {[key: string]: string[]};
        const fbbMap = {} as {[key: string]: string[]};

        scores.forEach((score) => {
            let c = (crew.find(f => f.symbol === score.symbol) || ships.find(f => f.symbol === score.symbol))!;
            computeScore(score, c);
        });
        normalizeScores(scores);

        scores.forEach((score) => {
            overallMap[score.overall_final] ??= [];
            overallMap[score.overall_final].push(score.symbol);
            arenaMap[score.arena_final] ??= [];
            arenaMap[score.arena_final].push(score.symbol);
            fbbMap[score.fbb_final] ??= [];
            fbbMap[score.fbb_final].push(score.symbol);
        });
    }

    // const getShips = (crew: string | Score, scores: Score[], battle: 'arena' | 'fbb', group: number) => {
    //     const score = typeof crew === 'string' ? scores.find(cs => cs.symbol === crew) : crew;
    //     if (!score) {
    //         return undefined;
    //     }
    //     const totals = getScore(score, battle, group);
    //     if (!totals?.original_indices?.length) return undefined;

    //     const runs = [...new Set(totals.original_indices.map(i => origruns[i]))];
    //     runs.sort((a, b) => battle === 'arena' && a.win != b.win ? (a.win ? -1 : 1) : a.duration - b.duration || b.damage - a.damage)
    //     const shipscore = {} as { [key: string]: number };
    //     const shipcount = {} as { [key: string]: number };
    //     const shipdmg = {} as { [key: string]: number };
    //     const shipcrew = {} as { [key: string]: string[] };
    //     runs.forEach((run, idx) => {
    //         let key = run.ship.symbol;
    //         shipscore[key] ??= 0;
    //         shipcount[key] ??= 0;
    //         shipdmg[key] ??= 0;
    //         shipdmg[key] += run.damage;
    //         shipcrew[key] ??= [];
    //         shipcrew[key] = shipcrew[key].concat(run.seated);
    //         shipscore[key] += idx + 1;
    //         shipcount[key]++;
    //     });
    //     const results: SymbolScore[] = Object.keys(shipscore).map((ship) => {
    //         return ({
    //             symbol: ship,
    //             score: (shipscore[ship] / shipcount[ship]),
    //             count: shipcount[ship],
    //             division: group,
    //             crew: shipcrew[ship],
    //             damage: shipdmg[ship]
    //         });
    //     });
    //     results.sort((a, b) => b.score - a.score || b.count - a.count);
    //     const max = results[0].score;
    //     results.forEach((r) => {
    //         r.score = Math.round((r.score / max) * 1000) / 100;
    //     });
    //     return results;
    // }

    console.log("\nTabulating Results ...");
    createScoreData(false, false);

    const offs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');
    const ship_2 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    console.log("Scoring Offense ...");
    processScores(offs_2, 'offense');
    console.log("Scoring Defense ...");
    processScores(defs_2, 'defense');
    console.log("Scoring Ships ...");
    processScores(ship_2, 'ship');

    console.log("Mapping best crew to ships...");

    let arena_p2 = ships.map(sh => getStaffedShip(origShips, crew, sh, false, offs_2, defs_2, undefined, false, undefined, false, typical_cd)).filter(f => !!f);
    arena_p2 = arena_p2.concat(ships.map(sh => getStaffedShip(origShips, crew, sh, false, offs_2, defs_2, undefined, true, undefined, false, typical_cd)).filter(f => !!f));
    let fbb_p2 = ships.map(sh => getStaffedShip(origShips, crew, sh, true, offs_2, defs_2, undefined, false, undefined, false, typical_cd)).filter(f => !!f);
    fbb_p2 = fbb_p2.concat(ships.map(sh => getStaffedShip(origShips, crew, sh, true, offs_2, defs_2, undefined, true, undefined, false, typical_cd)).filter(f => !!f));

    allruns.length = ((arena_p2.length * arena_p2.length) * 4) + (fbb_p2.length * 6);

    runidx = 0;

    count = 1;
    for (let ship of arena_p2) {
        let crew = ship.battle_stations?.map(m => m.crew).filter(f => !!f);
        if (!crew?.length || crew?.length !== ship.battle_stations?.length) {
            console.log(`Missing crew!!!`, ship, count);
            exit(-1);
        }
        console.log(`Playing arena on ${ship.name} against all compatible ships (${count++} / ${arena_p2.length})...`);
        // if (ship.name === "IKS Negh'Var") {
        //     console.log("IKS Negh'Var Here");
        // }
        // else continue;
        let division = getShipDivision(ship.rarity);
        for (let ship2 of arena_p2) {
            if (ship == ship2) continue;
            if (getShipDivision(ship2.rarity) !== division) continue;
            let runres = runBattles(current_id, rate, ship, crew, allruns, runidx, hrpool, false, true, ship2, false, arena_variance, fbb_variance);

            runidx = runres.runidx;
            current_id = runres.current_id;

            let testship = getStaffedShip(origShips, crew, ship, false, offs_2, defs_2, undefined, false, ship2, false, typical_cd)
            let testcrew = testship?.battle_stations!.map(m => m.crew).filter(f => !!f);
            if (!testcrew?.length || testcrew?.length !== ship.battle_stations?.length) {
                console.log(`Missing crew #2!!!`, ship, count);
                exit(-1);
            }
            if (testship && testcrew?.length) {
                //console.log(`Customized battle against ${ship2.name}`)
                let runres = runBattles(current_id, rate, testship, testcrew, allruns, runidx, hrpool, false, true, ship2, false, arena_variance, fbb_variance);

                runidx = runres.runidx;
                current_id = runres.current_id;
            }

            if (ship.actions?.some(a => a.status === 2)) {
                testship = getStaffedShip(origShips, crew, ship, false, offs_2, defs_2, undefined, false, ship2, true, typical_cd)
                testcrew = testship?.battle_stations!.map(m => m.crew).filter(f => !!f);
                if (!testcrew?.length || testcrew?.length !== ship.battle_stations?.length) {
                    console.log(`Missing crew #3!!!`, ship, count);
                    exit(-1);
                }
                if (testship && testcrew?.length) {
                    //console.log(`Customized battle against ${ship2.name}`)
                    let runres = runBattles(current_id, rate, testship, testcrew, allruns, runidx, hrpool, false, true, ship2, false, arena_variance, fbb_variance);

                    runidx = runres.runidx;
                    current_id = runres.current_id;
                }
            }
        }
        // let examine = allruns.slice(0, runidx);
        // let wins = examine.filter(f => f.win);
        // let notwins = examine.filter(f => !f.win);
        // notwins.sort((a, b) => a.duration - b.duration || a.damage - b.damage);
        // let worst = notwins[0];
        // let winratio = wins.length / runidx;
        // let dmg = examine.map(m => m.damage).reduce((p, n) => p + n, 0);
        // let avgdmg = dmg / runidx;
        // console.log(winratio, dmg, avgdmg);
    }

    count = 1;
    for (let ship of fbb_p2) {
        console.log(`Running FBB on ${ship.name} (${count++} / ${fbb_p2.length})...`);
        let crew = ship.battle_stations!.map(m => m.crew!);
        let runres = runBattles(current_id, rate, ship, crew, allruns, runidx, hrpool, true, false, undefined, false, arena_variance, fbb_variance);

        runidx = runres.runidx;
        current_id = runres.current_id;
    }

    console.log("Score Ships, Pass 2...");
    allruns.splice(runidx);

    const orig_arena_len = arenaruns.length;
    arenaruns.length = 0;
    arenaruns.length = runidx;
    fbbruns.length = 0;
    fbbruns.length = runidx;

    fc = 0;
    ac = 0;

    for (let run of allruns) {
        if (run.battle === 'fbb') {
            fbbruns[fc++] = run;
        }
        else if (run.battle === 'arena') {
            arenaruns[ac++] = run;
        }
    }

    fbbruns.splice(fc);
    arenaruns.splice(ac);

    allruns.length = 0;

    createScoreData(true, true, true);

    const ship_3 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    processScores(ship_3, 'ship');

    console.log("Factoring ship grades into final crew grades.");

    const shipidx = 2;

    console.log("Name", "Overall", "Arena", "FBB");
    console.log("".padEnd(40, ""), "Arena Ship/Crew");
    console.log("".padEnd(40, ""), "FBB Ship/Crew");
    console.log("-------------------------------------------------------------------");

    const tc = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);

    const buffer = [] as string[];

    function printAndLog(...params: any[]) {
        let text = params.join(" ");
        buffer.push(text);
        console.log(...params);
    }

    const crewRanksOut = {} as {[key: string]: ShipRanks }
    const shipRanksOut = {} as {[key: string]: ShipRanks }

    [offs_2, defs_2, ship_3].forEach((scores, idx) => {
        printAndLog(" ");
        printAndLog(`${idx == 0 ? 'Offense' : idx == 1 ? 'Defense' : 'Ship'}`);
        printAndLog(" ");

        for (let score of scores) {
            if (idx === shipidx) {
                shipRanksOut[score.symbol] = scoreToShipScore(score, 'ship');
            }
            else {
                crewRanksOut[score.symbol] = scoreToShipScore(score, idx ? 'defense' : 'offense');
            }
        }
        let working = scores.slice(0, 100);
        let arena_high = scores.find(f => f.arena_final === 10);
        if (arena_high) {
            printAndLog(`Highest Arena: ${arena_high.name}, Average Index: ${Math.round(arena_high.arena_data[0].average_index)} / ${orig_arena_len}`);
            if (!working.includes(arena_high)) {
                working.push(arena_high);
            }
        }
        let fbb_high = scores.find(f => f.fbb_final === 10);
        if (fbb_high) {
            printAndLog(`Highest FBB: ${fbb_high.name}, Max Damage: ${fbb_high.fbb_data[0].max_damage}`);
            if (!working.includes(fbb_high)) {
                working.push(fbb_high);
            }
        }
        printAndLog(" ");

        for (let item of working) {
            let triggered = false;
            let c = crew.find(f => f.symbol === item.symbol);
            if (c && c.action.ability?.condition) triggered = true;

            let arena_crew = crew.filter(f => item.arena_data?.length && item.arena_data[0].max_staff.includes(f.symbol));
            let fbb_crew = crew.filter(f => item.fbb_data?.length && item.fbb_data[0].max_staff.includes(f.symbol));
            let arena_ship = ships.find(f => item.arena_data?.length && f.symbol === item.arena_data[0].max_ship);
            let fbb_ship = ships.find(f => item.fbb_data?.length && f.symbol === item.fbb_data[0].max_ship);
            let fbb_ship2 = ships.find(f => item.fbb_data?.length && f.symbol === item.fbb_data[0].max_duration_ship);
            if (!arena_crew || !fbb_crew || !arena_ship || !fbb_ship) return;

            printAndLog(
                item.name.padEnd(40, " "),
                `${item.overall_final}`.padEnd(5, ' '),
                `${item.arena_final}`.padEnd(5, ' '),
                `${item.fbb_final}`.padEnd(5, ' '),
                idx == shipidx ? 'Ship' : 'Crew',
                idx == shipidx ? 'Ship' : tc(crewcategories[item.symbol]).padEnd(7, " "),
                `${c ? printTrigger(c) : ''}`
            );

            if (item.kind === 'ship') {
                printAndLog(" ".padEnd(40, " "), arena_crew.map(c => c.name + `${printTrigger(c)}`).join(", "));
                printAndLog(" ".padEnd(40, " "), fbb_crew.map(c => c.name + `${printTrigger(c)}`).join(", "));
            }
            else {
                printAndLog(" ".padEnd(40, " "), arena_ship?.name?.padEnd(20, " "), " - Max Damage Arena Ship");
                printAndLog(" ".padEnd(40, " "), fbb_ship?.name?.padEnd(20, " "), " - Max Damage FBB Ship");
                printAndLog(" ".padEnd(40, " "), fbb_ship2?.name?.padEnd(20, " "), " - Max Duration FBB Ship", `(Max Dur: ${Math.ceil(item.fbb_data[0].max_duration)}s)`);
            }
            item.arena_data.forEach((group) => {
                printAndLog(" ".padEnd(40, " "), `A${group.group}: ${group.final} (Max Dmg: ${Math.ceil(group.max_damage).toLocaleString()}, Avg Dmg: ${Math.ceil(group.average_damage).toLocaleString()}, ${group.count} Runs, Win Rate: ${Math.ceil((group.win_count / group.count) * 100)}%)`);
            });
            item.fbb_data.forEach((group) => {
                if (idx === 1) {
                    printAndLog(" ".padEnd(40, " "), `B${group.group}: ${group.final} (Max Dmg: ${Math.ceil(group.max_damage).toLocaleString()}, Avg Dmg: ${Math.ceil(group.average_damage).toLocaleString()}, ${group.count} Runs, Avg Dur: ${Math.ceil(group.duration / group.count)}s )`);
                }
                else {
                    printAndLog(" ".padEnd(40, " "), `B${group.group}: ${group.final} (Max Dmg: ${Math.ceil(group.max_damage).toLocaleString()}, Avg Dmg: ${Math.ceil(group.average_damage).toLocaleString()}, ${group.count} Runs)`);

                }
            });
        }
    });

    console.log("Writing report and raw scores...");

    fs.writeFileSync("./battle_run_report.txt", buffer.join("\n"));
    fs.writeFileSync("./battle_run_report.json", JSON.stringify(offs_2.concat(defs_2).concat(ship_3)));

    console.log("Writing rankings to crew.json and ship_schematics.json ...");

    const crewFresh = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];
    const shipFresh = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];

    Object.entries(crewRanksOut).forEach(([symbol, ranks]) => {
        const c = crewFresh.find(f => f.symbol === symbol);
        if (c) {
            c.ranks.ship = ranks;
        }
    });

    Object.entries(shipRanksOut).forEach(([symbol, ranks]) => {
        const c = shipFresh.find(f => f.ship.symbol === symbol);
        if (c) {
            c.ship.ranks = ranks;
        }
    });

    for (let c of crewFresh) {
        if (!c.ranks.ship) {
            const t = characterizeCrew(c);
            c.ranks.ship = createBlankShipScore(t < 0 ? 'defense' : 'offense');
        }
    }

    for (let s of shipFresh) {
        if (!s.ship.ranks) {
            s.ship.ranks = createBlankShipScore('ship');
        }
    }

    fs.writeFileSync(STATIC_PATH + 'crew.json', JSON.stringify(crewFresh));
    fs.writeFileSync(STATIC_PATH + 'ship_schematics.json', JSON.stringify(shipFresh));

    const runEnd = new Date();

    const diff = (runEnd.getTime() - runStart.getTime()) / (1000 * 60);

    console.log("Run Time", `${diff.toFixed(2)} minutes.`);

}

processShips();
processCrewShipStats(10, 0, 0);
