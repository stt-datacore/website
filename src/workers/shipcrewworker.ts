import { MultiShipWorkerConfig, ShipWorkerConfig, ShipWorkerResults } from "../model/ship"

const ShipCrewWorker = {

    calc: (options: ShipWorkerConfig) => {
        return new Promise<ShipWorkerResults>((resolve, reject) => {



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