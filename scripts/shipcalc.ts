import fs from 'fs';
import os from 'os';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';

import { CrewMember, RankScoring, ShipScores } from "../src/model/crew";
import { Ship, Schematics } from "../src/model/ship";
import { highestLevel, mergeShips } from "../src/utils/shiputils";
import { exit } from 'process';
import { processShips } from './ships/processing';
import { Score, getShipDivision, createScore, getScore, characterizeCrew, shipnum, getStaffedShip, BattleRunBase, scoreToShipScore, createBlankShipScore, processScores, ScoreDataConfig, createScoreData, AllBosses, normalizeScores } from './ships/scoring';
import { getCleanShipCopy, nextOpponent, runBattles } from './ships/battle';
import { battleRunsToCache, cacheToBattleRuns, readBattleCache } from './ships/cache';
import { makeBuckets } from './ships/util';
import { CalcRes, ShipCalcConfig } from './ships/paracalc';
import { score } from './scoring';

const STATIC_PATH = `${__dirname}/../../static/structured/`;

async function processCrewShipStats(rate = 10, arena_variance = 0, fbb_variance = 0) {
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

    let newcrew = [] as CrewMember[];
    let newships = [] as Ship[];

    // const boompool = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
    // const critpool = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
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
        console.log("Checking for new crew...");
        let c_crew = [ ... new Set(cached.map(m => m.crew)) ];
        let g_crew = crew.map(m => m.symbol);

        g_crew = g_crew.filter((c, i) => g_crew.findIndex(cc => cc === c) === i && !c_crew.includes(c));

        if (g_crew.length) {
            newcrew = g_crew.map(s => crew.find(c => c.symbol === s)!);
            if (newcrew.length) {
                console.log(`Updating cache with ${newcrew.length} new crew...`);
            }
        }
        console.log("Checking for new ships...");

        let c_ships = [ ... new Set(cached.map(m => m.ship)) ];
        let g_ships = ships.map(m => m.symbol);

        g_ships = g_ships.filter((c, i) => g_ships.findIndex(cc => cc === c) === i && !c_ships.includes(c));

        if (g_ships.length) {
            newships = g_ships.map(s => ships.find(c => c.symbol === s)!);
            if (newships.length) {
                console.log(`Updating cache with ${newships.length} new ships...`);
            }
        }
    }

    let allruns = [] as BattleRunBase[];
    let runidx = 0;
    let current_id = 1;
    let count = 1;
    let cship = ships.length;

    if (!cached?.length || newcrew.length || newships.length) {
        const workcrew = newcrew.length ? newcrew : crew;

        if (cached.length) {
            allruns = cacheToBattleRuns(ships, crew, cached);
            runidx = allruns.length;
        }
        else {
            runidx = 0;
        }

        console.log("Calculate crew and ship battle scores...");
        console.log(`Frame Rate: ${rate} per second.`)

        allruns.length = (ships.length * crew.length * 18);
        console.log(`Alloc ${allruns.length} items.`);

        const bucketsize = Math.floor(os.cpus().length / 2) || 1;
        const shipBuckets = makeBuckets(ships, bucketsize);

        cship = ships.length;
        let startidx = 0;
        for (let x = 0; x < cship; x += bucketsize) {
            const bidx = Math.floor(x / bucketsize);
            let buckets = shipBuckets[bidx];
            let promises = buckets.map((ship, idx2) => new Promise<CalcRes>((resolve, reject) => {
                const ws = newships.length && newships.some(ws => ws.symbol === ship.symbol);
                if (newships.length && !ws && !newcrew.length) return;
                const shipcrew = ws ? crew : workcrew;
                const config: ShipCalcConfig = {
                    ships,
                    ship_idx: startidx + idx2,
                    crew,
                    ship_crew: shipcrew,
                    runidx,
                    current_id,
                    rate,
                    hrpool,
                    arena_variance,
                    fbb_variance
                }
                const worker = new Worker(__dirname + '/ships/paracalc.js', {
                    workerData: config,
                });
                worker.on('message', (data) => {
                    worker.terminate();
                    resolve(data);
                });
                worker.on('error', reject);
                worker.on('exit', (code) => {
                if (code !== 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
                });
            }));

            startidx += buckets.length;

            await Promise.all(promises).then((done) => {
                done.forEach((d) => {
                    if (d) {
                        for (let dboom of d.allruns) {
                            if (dboom.crew) {
                                let sym = dboom.crew.symbol;
                                delete dboom.crew;
                                dboom.crew = crew.find(f => f.symbol === sym)!;
                            }
                            if (dboom.ship) {
                                let sym = dboom.ship.symbol;
                                delete (dboom as any).ship;
                                dboom.ship = ships.find(f => f.symbol === sym)!;
                            }
                            if (dboom.boss) {
                                let id = dboom.boss.id;
                                delete (dboom as any).boss;
                                dboom.boss = AllBosses.find(f => f.id === id)!;
                            }
                            if (dboom.opponent) {
                                let sym = dboom.opponent.symbol;
                                delete (dboom as any).opponent;
                                dboom.opponent = ships.find(f => f.symbol === sym)!;
                            }
                            if (dboom) {
                                allruns[runidx++] = dboom;
                            }
                        }
                        d.allruns.length = 0;
                    }
                });
            });
            promises.length = 0;
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

    allruns.length = 0;

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    const scoreConfig: ScoreDataConfig = {
        arenaruns,
        fbbruns,
        shipscores,
        crewscores,
        ships,
        crew,
        trigger_compat: true,
        seat_compat: true,
        bypass_crew: false
    }


    console.log("\nTabulating Results ...");
    scoreConfig.bypass_crew = false;
    scoreConfig.trigger_compat = false;
    scoreConfig.seat_compat = false;
    createScoreData(scoreConfig);

    const offs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');
    const ship_2 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    console.log("Scoring Offense ...");
    processScores(crew, ships, offs_2, 'offense', arenaruns.length);
    console.log("Scoring Defense ...");
    processScores(crew, ships,defs_2, 'defense', arenaruns.length);
    console.log("Scoring Ships ...");
    processScores(crew, ships,ship_2, 'ship', arenaruns.length);

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
                    let runres = runBattles(current_id, rate, testship, testcrew, allruns, runidx, hrpool, false, true, ship2, false, arena_variance, fbb_variance);

                    runidx = runres.runidx;
                    current_id = runres.current_id;
                }
            }
        }
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
    scoreConfig.bypass_crew = true;
    scoreConfig.trigger_compat = true;
    scoreConfig.seat_compat = true;

    createScoreData(scoreConfig);

    const ship_3 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    processScores(crew, ships, ship_3, 'ship', arenaruns.length);

    console.log("Factoring ship grades into final crew grades.");

    // ship_3.forEach((shipScore) => {
    //     const arenarefs = arenaruns_reference.filter(f => f.ship.symbol === shipScore.symbol);
    //     const fbbrefs = fbbruns_reference.filter(f => f.ship.symbol === shipScore.symbol);
    //     [offs_2, defs_2].forEach((scores) => {
    //         scores.forEach((score) => {
    //             const arenas = arenaruns.filter(f => f.crew?.symbol === score.symbol && f.ship.symbol === shipScore.symbol);
    //             const fbbs = fbbruns.filter(f => f.crew?.symbol === score.symbol && f.ship.symbol === shipScore.symbol);

    //             let fbb = score.fbb_data.sort((a, b) => b.group - a.group)[0];
    //             let arena = score.arena_data.sort((a, b) => b.group - a.group)[0];

    //             let ref1 = fbbrefs.find(f => f.boss?.id === fbb.group);
    //             let my1 = fbbs.find(f => f.boss?.id === fbb.group);
    //             if (ref1 && my1) {
    //                 score.fbb_final += (((ref1.damage / ref1.duration) / (my1.damage / my1.duration)) / shipScore.fbb_final);
    //             }

    //             ref1 = arenarefs.find(f => f.division === arena.group);
    //             my1 = arenas.find(f => f.division === arena.group);
    //             if (ref1 && my1) {
    //                 score.arena_final += (((ref1.damage / ref1.duration) / (my1.damage / my1.duration)) / shipScore.arena_final);
    //             }
    //         });
    //     });
    // });
    // normalizeScores(offs_2);
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

    const crewRanksOut = {} as {[key: string]: ShipScores }
    const shipRanksOut = {} as {[key: string]: ShipScores }

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
            item.fbb_data.sort((a, b) => b.group - a.group);
            item.arena_data.sort((a, b) => b.group - a.group);

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
            c.ranks.scores ??= {} as RankScoring;
            c.ranks.scores.ship = ranks;
        }
    });

    Object.entries(shipRanksOut).forEach(([symbol, ranks]) => {
        const c = shipFresh.find(f => f.ship.symbol === symbol);
        if (c) {
            c.ship.ranks = ranks;
        }
    });

    for (let c of crewFresh) {
        c.ranks.scores ??= {} as RankScoring;
        if (!c.ranks.scores.ship) {
            const t = characterizeCrew(c);
            c.ranks.scores.ship = createBlankShipScore(t < 0 ? 'defense' : 'offense');
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

(async () => {
    processShips();
    await processCrewShipStats(10, 0, 0);
    score();
})();

