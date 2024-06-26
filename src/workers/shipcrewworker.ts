import { MultiShipWorkerConfig, ShipWorkerConfig, ShipWorkerResults } from "../model/ship"

function hitChance(acc: number, opp_eva: number) {
    return 1 / (1 + Math.exp(-1.9 * (acc / opp_eva - 0.55)));
}

const PowerTable = {
    0: 0,
    1: 1200,
    2: 1560,
    3: 2028,
    4: 2636,
    5: 3427,
    6: 4455,
    7: 5792,
    8: 7530,
    9: 9789,
    10: 12726,
    11: 15908,
    12: 19885,
    13: 24856,
    14: 30076,
    15: 36091,
    16: 43309,
    17: 51105,
    18: 60304,
    19: 71159,
    20: 83968,
    21: 97403,
    22: 111039,
    23: 125474,
    24: 140531,
    25: 155989,
    26: 165989,
    27: 175989,
    28: 185989,
    29: 195989,
    30: 205989,
    31: 215989,
    32: 225989,
    33: 235989,
    34: 245989,
    35: 255989,
    36: 265989,
    37: 275989,
    38: 285989,
    39: 295989,
    40: 305989
}

const ShipCrewWorker = {
    calc: (options: ShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {
            const { ship, crew, battle_mode, opponents } = options;
            const max_rarity = options.max_rarity ?? 5;

            const workCrew = crew.filter((crew) => {
                return crew.max_rarity <= max_rarity;
            });

            resolve({
                ships: []
            })

        });
    },
    bestFinder: (options: MultiShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {

            resolve({
                ships: []
            })

        });
    }

}

export default ShipCrewWorker;