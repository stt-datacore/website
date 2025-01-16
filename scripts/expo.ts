import os from 'os';
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import fs from 'fs';
import { CrewMember, CrossFuseTarget } from "../src/model/crew";
import { Ship, Schematics } from "../src/model/ship";
import { highestLevel, mergeShips } from "../src/utils/shiputils";
import { BattleRun, shipnum, getMaxTime, getBosses, shipCompatibility, MaxDefense, MaxOffense } from './ships/scoring';
import { processBattleRun } from './ships/battle';
import { iterateBattle } from '../src/workers/battleworkerutils';
import { ComesFrom } from '../src/model/worker';
import { getVariantTraits } from '../src/utils/crewutils';
import { makeBuckets } from './ships/util';

const STATIC_PATH = `${__dirname}/../../static/structured/`;

type TScore = {
    crew: string,
    ability: number,
    activation: number,
    score: number,
    uptime: number,
    trigger: number,
    limit: number,
    avg_power: number,
    ships?: {
        ship: string
        uptime: number,
        comes_from: ComesFrom[],
        damage: number,
        compat: number
    }[]
};


export function expo() {

    const ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
    const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

    const ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), [], true);
    ships.sort((a, b) => shipnum(b) - shipnum(a));

    const origShips = JSON.parse(JSON.stringify(ships)) as Ship[];

    const buckets = {} as { [key: string]: TScore[] };

    crew.forEach((c) => {
        let uptime = getMaxTime(c);
        if (uptime < 180 && c.action.limit) {
            uptime = c.action.duration * c.action.limit;
        }
        else if (!c.action.limit) {
            let u = 180 - c.action.initial_cooldown;
            uptime = Math.floor(u / c.action.cycle_time) * c.action.duration;
        }

        if (!c.action.ability) {
            buckets[-1] ??= [];
            buckets[-1].push({
                crew: c.symbol,
                ability: -1,
                activation: c.action.bonus_amount / (c.action.initial_cooldown + 1),
                uptime,
                score: uptime * c.action.bonus_amount,
                trigger: -1,
                limit: c.action.limit ?? 0,
                avg_power: 0
            });
        }
        else {
            buckets[c.action.ability.type] ??= [];
            buckets[c.action.ability.type].push({
                crew: c.symbol,
                ability: c.action.ability.type,
                activation: c.action.ability.amount / (c.action.initial_cooldown + 1),
                uptime,
                score: c.action.bonus_amount,
                trigger: c.action.ability.condition,
                limit: c.action.limit ?? 0,
                avg_power: 0
            });
        }
    });

    Object.values(buckets).forEach((bucket) => {
        bucket.sort((a, b) => {
            return ((b.activation * b.score) - (a.activation * a.score))
        });
    });

    const boom = buckets[5];
    let id = 1;
    for (let score of boom) {
        score.ships = [];
        let c = crew.find(f => f.symbol === score.crew)!;
        for (let s of ships) {
            let bosses = getBosses(s, c).sort((a, b) => b.id - a.id);
            if (!bosses?.length) continue;
            const boss = bosses[0];
            const attacks = iterateBattle(10, true, s, [c], boss, undefined, undefined, 180, undefined, undefined, false, 0, true, true, false);
            const battle = processBattleRun(id++, 'fbb_5', attacks, [c], 10, undefined, true, true);

            if (!battle) continue;

            let asym = c.action.symbol;
            let uptime = battle.uptimes.find(f => f.action === asym);
            let power = battle.action_powers[asym] || [];

            if (uptime) {
                score.ships ??= [];
                score.ships.push({
                    ship: s.symbol,
                    uptime: uptime.uptime,
                    damage: battle.attack,
                    comes_from: power,
                    compat: shipCompatibility(s, c).score
                });
            }
        }

        //score.avg_power = score.ships.map(m => m.damage).reduce((p, n) => p + n) / score.ships.length;
        score.uptime = score.ships.map(m => m.uptime).reduce((p, n) => p + n, 0) / score.ships.length;

        let a_compat = score.ships.map(m => m.compat).reduce((p, n) => p + n, 0) / score.ships.length;
        let from_power = score.ships.map(m => m.comes_from.filter(f => f.type === score.ability && f.action === c.action.symbol).map(f => f.bonus).reduce((p, n) => p + n, 0)).reduce((p, n) => p + n, 0) / score.ships.length;
        score.avg_power = from_power;
        score.score *= score.uptime * a_compat * from_power;
    }

    boom.sort((a, b) => (b.activation * b.score) - (a.activation * a.score));

    boom.slice(0, 10).forEach((b) => {
        console.log(b);
    })
}

export function fuseExperiment() {
    const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

    let filtered = crew.filter(f => (f.cross_fuse_targets as CrossFuseTarget)?.symbol);
    const seen = {} as any;
    filtered.forEach((f) => {
        let cf = f.cross_fuse_targets as CrossFuseTarget;
        let vta = getVariantTraits(f);
        let cfc = crew.find (f => f.symbol === cf.symbol);
        if (cfc) {
            let vtb = getVariantTraits(cfc);

            let potential = crew.find(c => c.traits_hidden.some(tr => vta.includes(tr) && c.traits_hidden.some(tr => vtb.includes(tr))));
            if (potential) {
                if (seen[potential.symbol]) return;
                seen[potential.symbol] = true;
                console.log(`${f.name} + ${cfc.name} => ${potential.name}`);
            }
            else {
                potential = crew.find(c => c.obtained.toLowerCase().includes("fus") && c.traits_hidden.some(tr => vta.includes(tr) || c.traits_hidden.some(tr => vtb.includes(tr))));
                if (potential) {
                    if (seen[potential.symbol]) return;
                    seen[potential.symbol] = true;
                    console.log(`${f.name} + ${cfc.name} => ${potential.name}`);
                }
            }
        }
    });

    console.log(crew.filter(f => f.obtained.toLowerCase().includes('fus')).map(m => m.name));
    // console.log(filtered.map(m => `${m.symbol} -> ${(m.cross_fuse_targets as any).symbol}`))

}

export type CritBoom = { crit: string, boom: string, bosses: number[] };

export function getCritBooms(roster: CrewMember[]): CritBoom[] {
    const output = [] as { crit: string, boom: string, bosses: number[] }[];

    let critters = roster.filter(f => f.action.ability?.type === 5 && !f.action.limit);
    let boomers = roster.filter(f => f.action.ability?.type === 1 && !f.action.limit);

    for (let crit of critters) {
        let critbosses = getBosses(undefined, crit);
        for (let boom of boomers) {
            let boombosses = getBosses(undefined, boom);
            if (critbosses.length != boombosses.length || !critbosses.every(c1 => boombosses.some(c2 => c1.id === c2.id))) {
                continue;
            }
            output.push({
                crit: crit.symbol,
                boom: boom.symbol,
                bosses: boombosses.map(b => b.id)
            });
        }
    }

    return output;
}

type BestBoom = { ship: string, crew: string[], damage: number };

async function processShip(ship: Ship, crew: CrewMember[], critbooms: CritBoom[]) {
    return new Promise<BestBoom[] | null>((resolve, reject) => {
        setTimeout(() => {
            const __boomdir = './build/crit-boom-cache';
            if (!ship.battle_stations?.length) {
                resolve(null);
                return;
            };

            const bestbooms = [] as { ship: string, crew: string[], damage: number }[];
            const tempbooms = [] as { ship: string, crew: string[], damage: number }[];

            const battles = [] as BattleRun[];

            const bs = ship.battle_stations;
            battles.length = 0;
            battles.length = (critbooms.length) * 12;
            let runidx = 0;
            let shipbosses = getBosses(ship).sort((a, b) => b.id - a.id).slice(0, 1);

            console.log(`Process Crit-Booms for ${ship.name} ...`)

            let id = 1;
            let success = 0;

            for (let cb of critbooms) {
                let crit = crew.find(f => f.symbol === cb.crit)!;
                let boom = crew.find(f => f.symbol === cb.boom)!;
                let bosses = shipbosses.filter(f => cb.bosses.some(g => f.id === g));
                let play1 = true;
                let play2 = true;

                if (!bosses.length) continue;
                let i = 0;
                let b_compat = shipCompatibility(ship, boom);
                let c_compat = shipCompatibility(ship, crit);
                if (c_compat.score !== 1 || b_compat.score !== 1) continue;
                for (i = 0; i < bs.length; i++) {
                    if (crit.skill_order.includes(bs[i].skill)) break;
                }
                if (i >= bs.length) play1 = false;
                else b_compat = shipCompatibility(ship, boom, [bs[i].skill]);
                if (c_compat.score !== 1 || b_compat.score !== 1) play1 = false;
                b_compat = shipCompatibility(ship, boom);
                for (i = 0; i < bs.length; i++) {
                    if (boom.skill_order.includes(bs[i].skill)) break;
                }
                if (i >= bs.length) play2 = false;
                else c_compat = shipCompatibility(ship, crit, [bs[i].skill]);
                if (c_compat.score !== 1 || b_compat.score !== 1) play2 = false;

                for (let boss of bosses) {
                    let newstaff = [] as CrewMember[];
                    let hrstaff = [] as CrewMember[];

                    if (play1) {
                        newstaff = [crit, boom].concat(hrstaff);

                        let battle = iterateBattle(10, true, ship, newstaff, boss, MaxDefense, MaxOffense, 180, undefined, undefined, false, 0, true, true, false);
                        let attack = processBattleRun(id++, `fbb_${boss.id-1}` as any, battle, newstaff, 10, boss, true, false);

                        if (attack) {
                            battles[runidx++] = ({
                                crew: crit,
                                ship: ship,
                                boss,
                                damage: attack.attack,
                                duration: attack.battle_time,
                                type: 'offense',
                                battle: 'fbb',
                                seated: newstaff.map(m => m.symbol),
                                win: !!attack.win,
                                compatibility: c_compat,
                                limit: 0,
                                reference_battle: false
                            });
                            success++;
                        }
                    }

                    if (play2) {
                        newstaff = [boom, crit].concat(hrstaff);

                        let battle = iterateBattle(10, true, ship, newstaff, boss, MaxDefense, MaxOffense, 180, undefined, undefined, false, 0, true, true, false);
                        let attack = processBattleRun(id++, `fbb_${boss.id-1}` as any, battle, newstaff, 10, boss, true, false);

                        if (attack) {
                            battles[runidx++] = ({
                                crew: boom,
                                ship: ship,
                                boss,
                                damage: attack.attack,
                                duration: attack.battle_time,
                                type: 'offense',
                                battle: 'fbb',
                                seated: newstaff.map(m => m.symbol),
                                win: !!attack.win,
                                compatibility: c_compat,
                                limit: 0,
                                reference_battle: false
                            });
                            success++;
                        }
                    }
                }
            }
            let shipbooms = [] as BattleRun[];

            for (let i = runidx - 1; i >= 0; i--) {
                if (battles[i].ship !== ship) break;
                shipbooms.push(battles[i]);
            }

            let bestboom = shipbooms.sort((a, b) => b.damage - a.damage || b.duration - a.duration)[0];
            let bestcrew = bestboom.seated.map(s => crew.find(f => f.symbol === s)!).slice(0, 2)

            let bestboom2 = shipbooms[1];
            let bestcrew2 = bestboom2.seated.map(s => crew.find(f => f.symbol === s)!).slice(0, 2)

            for (let i = 1; i < shipbooms.length; i++) {
                if (shipbooms[i].damage !== bestboom.damage) {
                    bestboom2 = shipbooms[i];
                    bestcrew2 = bestboom2.seated.map(s => crew.find(f => f.symbol === s)!).slice(0, 2)
                    break;
                }
            }

            console.log(`${success} Crit-Booms processed for ${ship.name}`)
            console.log(`Best Crew: ${bestcrew.map(m => m.name).join(", ")}, Damage: ${bestboom.damage.toLocaleString()}`);
            console.log(`Runner Up: ${bestcrew2.map(m => m.name).join(", ")}, Damage: ${bestboom2.damage.toLocaleString()}`);
            console.log(" ");

            // Just do top 100 for each ship?
            // const topmax = 100;
            // shipbooms.splice(topmax);
            let z = 0;
            for (let bestboom of shipbooms) {
                tempbooms.push({
                    ship: ship.symbol,
                    crew: [ ...bestboom.seated ],
                    damage: bestboom.damage
                });
                if (z < 5) {
                    bestbooms.push({
                        ship: ship.symbol,
                        crew: [ ...bestboom.seated ],
                        damage: bestboom.damage
                    });
                }
                z++;
            }

            console.log(`Saving ${__boomdir}/${ship.symbol}.json ....`);

            fs.writeFileSync(`${__boomdir}/${ship.symbol}.json`, JSON.stringify(tempbooms));

            tempbooms.length = 0;
            shipbooms.length = 0;

            resolve(bestbooms);
        });
    });

}




async function critBoomThing() {

    const start = new Date();

    const ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
    const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];
    const ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), [], true);
    ships.sort((a, b) => shipnum(b) - shipnum(a));
    const hrpool = crew.filter(f => f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);

    console.log(`Finding crit-boom combos...`);
    const critbooms = getCritBooms(crew);

    const bestbooms = [] as { ship: string, crew: string[], damage: number }[];
    const tempbooms = [] as { ship: string, crew: string[], damage: number }[];
    const battles = [] as BattleRun[];
    let id = 1;

    const __boomdir = './build/crit-boom-cache';

    if (!fs.existsSync(__boomdir)) {
        fs.mkdirSync(__boomdir);
    }

    let runidx = 0;
    let shipbuckets = makeBuckets(ships, os.cpus().length / 2);

    for (let buckets of shipbuckets) {
        let promises = buckets.map((ship) => new Promise<BestBoom[]>((resolve, reject) => {
            const worker = new Worker(__filename, {
              workerData: { ship, crew, critbooms },
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
            if (code !== 0)
                reject(new Error(`Worker stopped with exit code ${code}`));
            });
        }));

        await Promise.all(promises).then((done) => {
            done.forEach((d) => {
                if (d) {
                    for (let dboom of d) {
                        bestbooms.push(dboom);
                    }
                }
            });
        });
    }

    setTimeout(() => {
        console.log("Writing best boom cache ...");
        //battles.splice(runidx);

        fs.writeFileSync('./crit-booms.jsom', JSON.stringify(bestbooms));

        bestbooms.sort((a, b) => b.damage - a.damage);

        let bestships = [...new Set(bestbooms.map(m => m.ship)) ].map(s => ships.find(f => f.symbol === s)!);

        let count = 1;
        console.log(" ");
        console.log("Report");
        console.log("---------------------------------------------------------");
        console.log(" ");
        for (let ship of bestships) {
            let bbs = bestbooms.filter(f => f.ship === ship.symbol).slice(0, 2);
            let bestboom = bbs[0];
            let bestcrew = bestboom.crew.map(m => crew.find(f => f.symbol === m)!);

            console.log(`#${count++}: ${ship.name}`);
            console.log(`Best Crew: ${bestcrew.slice(0, 2).map(m => m.name).join(", ")}, Damage: ${bestboom.damage.toLocaleString()}`);
            console.log(" ");
        }

        const end = new Date();
        const time = (end.getTime() - start.getTime()) / (60 * 1000);
        console.log(`Done in ${time.toFixed(2)} min`);
    });
}

if (isMainThread) {
    (async () => {
        await critBoomThing();
    })();
}
else {
    (async () => {
        const { ship, crew, critbooms } = workerData;
        const result = await processShip(ship, crew, critbooms);
        parentPort?.postMessage(result);
    })();
}