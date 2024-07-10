import { v4 } from "uuid";
import { ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../model/ship";

export interface ShipMultiWorkerStatus { 
    data: { 
        result: { 
            ships?: ShipWorkerItem[], 
            run_time?: number, 
            total_iterations?: number, 
            format?: string, 
            options?: any, 
            result?: ShipWorkerItem,
            percent?: number;
            progress?: bigint;
            count?: bigint;
            accepted?: bigint;
        }, 
        id: string,
        inProgress: boolean 
    } 
}


export interface ShipMultiWorkerConfig {
    config: ShipWorkerConfig;
    callback: (progress: ShipMultiWorkerStatus) => void;
}

export class ShipMultiWorker {
    callback: (progress: ShipMultiWorkerStatus) => void;
    config: ShipWorkerConfig;

    private workers: Worker[];
    private ids: string[];

    constructor() {
        this.initialize();
    }

    cancel() {
        this.workers.forEach((worker) => {
            worker.removeEventListener('message', this.workerMessage);
            worker.terminate();
        });
        this.workers = [];
        this.ids = [];
        this.initialize();
    }

    start(options: ShipMultiWorkerConfig) {
        this.callback = options.callback;
        this.config = options.config;
        let wcn = BigInt(options.config.crew.length);
        let bsn = BigInt(options.config.ship.battle_stations!.length);
        let total = this.factorial(wcn) / (this.factorial(wcn - bsn) * this.factorial(bsn));
        let wl = BigInt(this.workers.length);
        let perworker = total / wl;
        let leftover = total - (perworker * wl);
        if (leftover < 0) leftover = 0n;
                
        this.workers.forEach((worker, idx) => {
            let start = BigInt(idx) * perworker;
            let length = perworker;
            if (idx === this.workers.length - 1 || (start + length > total)) {
                length += leftover;
            }
            worker.postMessage({
                id: this.ids[idx],
                config: {
                    ...options.config,                    
                    start_index: start,
                    max_iterations: length,
                    status_data_only: true
                } as ShipWorkerConfig
            });
        });
    }

    private factorial(number: bigint) {
        let result = 1n;
        
        for (let i = 1n; i <= number; i++) {
            result *= i;
        }
        return result;
    }

    private initialize() {
        let cores = navigator?.hardwareConcurrency ?? 1;
        const newworkers = [] as Worker[];
        for (let i = 0; i < cores; i++) {
            let worker = new Worker(new URL('../workers/battle-worker.js', import.meta.url));
            worker.addEventListener('message', this.workerMessage);
            newworkers.push(worker);
            this.ids.push(v4());
        }
        this.workers = newworkers;
    }

    private workerMessage(message: any): void {
        let msg = message as ShipMultiWorkerStatus;
        let idx = this.ids.findIndex(fi => fi === msg.data.id);
        if (idx === -1) return;
        this.callback(msg);
    }
}