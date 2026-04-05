import { PlayerCrew } from "../model/player";
import { MetaCacheEntry, Ship } from "../model/ship";


export interface ShipFinderConfig {
    ships: Ship[];
    crew: PlayerCrew[];
    metas: MetaCacheEntry[];
    battle_mode: string;
    opponent?: Ship;
}

export interface ShipFinderResult {
    ships: Ship[];
}

const ShipFinder = {
    findShips: (config: ShipFinderConfig) => {
        return new Promise<ShipFinderResult>((resolve, reject) => {
            const { ships, crew, metas, battle_mode, opponent } = config;
            const results = [] as Ship[];


            resolve({
                ships: results
            });
        });
    }
}

export default ShipFinder;