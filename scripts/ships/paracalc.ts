import { isMainThread, workerData, parentPort } from 'node:worker_threads';

import { CrewMember } from "../../src/model/crew";
import { Ship } from "../../src/model/ship";
import { nextOpponent, runBattles, getCleanShipCopy, RunRes } from "./battle";
import { BattleRunBase, getShipDivision } from "./scoring";


export interface ShipCalcConfig {
    ships: Ship[];
    ship_idx: number;
    crew: CrewMember[],
    ship_crew: CrewMember[],
    runidx: number;
    current_id: number;
    rate: number;
    hrpool: CrewMember[];
    arena_variance: number,
    fbb_variance: number
}

export interface CalcRes extends RunRes {
    allruns: BattleRunBase[];
}

async function calculateShip(config: ShipCalcConfig) {
    return new Promise<CalcRes>((resolve, reject) => {
        const { rate, ship_crew, ships, hrpool, crew, ship_idx, arena_variance, fbb_variance } = config;
        let { runidx, current_id } = config;
        let i = ship_idx;

        const allruns = [] as BattleRunBase[];
        allruns.length = 9 * ship_crew.length;
        const ship = ships[i];

        const shipcrew = ship_crew;
        const opponent = nextOpponent(ships, getShipDivision(ship.rarity), i);

        let runres = runBattles(current_id, rate, getCleanShipCopy(ship), [], allruns, runidx, hrpool, false, false, undefined, false, arena_variance, fbb_variance, true);

        runidx = 0;
        current_id = runres.current_id;

        let work_oppo = undefined as Ship | undefined;
        let work_ship = undefined as Ship | undefined

        console.log(`Run all crew on ${ship.name} (FBB Only)...`);

        work_ship = getCleanShipCopy(ship);
        runres = runBattles(current_id, rate, work_ship, [], allruns, runidx, hrpool, false, false, undefined, false, arena_variance, fbb_variance, true);

        runidx = runres.runidx;
        current_id = runres.current_id;

        for (let c of shipcrew) {
            work_ship = getCleanShipCopy(ship);
            let runres = runBattles(current_id, rate, work_ship, c, allruns, runidx, hrpool, true, false, undefined, false, arena_variance, fbb_variance);

            runidx = runres.runidx;
            current_id = runres.current_id;
        }

        console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: SELF) ...`);

        for (let c of shipcrew) {
            work_ship = getCleanShipCopy(ship);
            let runres = runBattles(current_id, rate, work_ship, c, allruns, runidx, hrpool, false, true, undefined, false, arena_variance, fbb_variance);

            runidx = runres.runidx;
            current_id = runres.current_id;
        }

        console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: ${opponent?.name ?? 'NONE'}) ...`);
        if (opponent) {
            runres = runBattles(current_id, rate, getCleanShipCopy(ship), [], allruns, runidx, hrpool, false, true, getCleanShipCopy(opponent), false, arena_variance, fbb_variance, true);
            runidx = runres.runidx;
            current_id = runres.current_id;
            runres = runBattles(current_id, rate, getCleanShipCopy(opponent), [], allruns, runidx, hrpool, false, true, getCleanShipCopy(ship), false, arena_variance, fbb_variance, true);
            runidx = runres.runidx;
            current_id = runres.current_id;
        }

        for (let c of shipcrew) {
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
            console.log(`Run all crew on ${opponent.name} (Arena Only; Opponent: ${work_ship?.name}) ...`);
            for (let c of shipcrew) {
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

        allruns.length = runidx;
        resolve({ runidx, current_id, allruns });
    });
}

if (!isMainThread) {
    (async () => {
        const config = workerData as ShipCalcConfig;
        const response = await calculateShip(config);
        parentPort?.postMessage(response);
    })();
}