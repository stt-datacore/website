
import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleMode } from "../src/model/ship";
import { highestLevel, mergeShips } from "../src/utils/shiputils";
import { exit } from 'process';
import { processShips } from './ships/processing';
import { Score, getShipDivision, BattleRun, createScore, getScore, Scoreable, SymbolScore, characterizeCrew, shipnum, getStaffedShip, BattleRunBase, getMaxTime, UNMBos, getBosses, ShipCompat, shipCompatibility } from './ships/scoring';
import { getCleanShipCopy, processBattleRun, runBattles } from './ships/battle';
import { battleRunsToCache, cacheToBattleRuns, readBattleCache } from './ships/cache';
import { iterateBattle } from '../src/workers/battleworkerutils';
import { ComesFrom } from '../src/model/worker';

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
processShips();
expo();