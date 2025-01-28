import { v4 } from "uuid";
import { ShipWorkerConfig, ShipWorkerItem, ShipWorkerResults } from "../../model/ship";
import React from "react";
import { compareShipResults } from "../../utils/shiputils";

export interface ShipMultiWorkerProps {
    children: JSX.Element;
}

export interface ShipMultiWorkerStatus {
    data: {
        result: {
            ships?: ShipWorkerItem[],
            run_time?: number,
            total_iterations?: bigint,
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

export interface IMultiWorkerContext {
    runWorker: (options: ShipMultiWorkerConfig) => void;
    cancel: () => void;
    workers: number;
    count: bigint;
    progress: bigint;
    percent: number;
    cancelled: boolean;
    running: boolean;
    startTime: Date,
    endTime?: Date
    run_time: number;
}

const DefaultMultiWorkerContextData = {
    runWorker: () => false,
    cancel: () => false,
    workers: 0,
    count: 0n,
    progress: 0n,
    percent: 0,
    cancelled: false,
    running: false,
    startTime: new Date(),
    run_time: 0
} as IMultiWorkerContext;


export interface ShipMultiWorkerState {
    context: IMultiWorkerContext;
    fbb_mode: boolean;
}


export interface ShipMultiWorkerConfig {
    fbb_mode: boolean;
    config: ShipWorkerConfig;
    max_workers?: number;
    callback: (progress: ShipMultiWorkerStatus) => void;
}

export const MultiWorkerContext = React.createContext(DefaultMultiWorkerContextData);

export class ShipMultiWorker extends React.Component<ShipMultiWorkerProps, ShipMultiWorkerState> {
    callback: (progress: ShipMultiWorkerStatus) => void;
    config: ShipWorkerConfig;

    private workers: Worker[] = [];
    private ids: string[] = [];
    private running: boolean[] = [];
    private percent: number = 0;
    private count: bigint = 0n;
    private progress: bigint = 0n;
    private accepted: bigint = 0n;
    private lastResult: ShipWorkerItem | null = null;
    private progresses = {} as { [key: string]: { count: bigint, time: number, progress: bigint, accepted: bigint }};
    private allResults: ShipWorkerItem[] = [];

    constructor(props: ShipMultiWorkerProps) {
        super(props);

        this.state = {
            fbb_mode: false,
            context: {
                ...DefaultMultiWorkerContextData,
                cancel: () => this.reset(true),
                runWorker: (options) => this.runWorker(options)
            }
        }
    }

    private readonly initialize = (max_workers?: number) => {
        let cores = navigator?.hardwareConcurrency ?? 1;
        if (max_workers && max_workers < cores) cores = max_workers;

        const newworkers = [] as Worker[];
        this.ids=[];
        this.running=[];
        for (let i = 0; i < cores; i++) {
            let worker = new Worker(new URL('../../workers/battle-worker.js', import.meta.url));
            worker.addEventListener('message', this.workerMessage);
            newworkers.push(worker);
            this.ids.push(v4());
            this.running.push(false);
        }
        this.workers = newworkers;
        this.progresses = {};
        this.allResults = [];
    }

    private readonly reset = (set_canceled: boolean, max_workers?: number, no_init?: boolean) => {
        this.workers.forEach((worker) => {
            worker.removeEventListener('message', this.workerMessage);
            worker.terminate();
        });

        this.workers = [];
        this.ids = [];
        this.running = [];
        this.progresses = {};
        this.allResults = [];
        this.lastResult = null;

        if (set_canceled) {
            this.setState({
                context: {
                    ...this.state.context,
                    cancelled: true,
                    running: false
                }
            })
        }
        else if (!no_init) {
            this.initialize(max_workers);
        }
    }

    private readonly runWorker = (options: ShipMultiWorkerConfig) => {
        this.callback = options.callback;
        this.config = options.config;
        let fbb_mode = options.fbb_mode;
        this.reset(false, options.max_workers);

        let wcn = BigInt(options.config.crew.length);
        let bsn = BigInt(options.config.ship.battle_stations!.length);
        let total = (this.factorial(wcn) / (this.factorial(wcn - bsn) * this.factorial(bsn)));
        if (options.config.max_iterations && options.config.max_iterations < total) {
            total = options.config.max_iterations;
        }
        let wl = BigInt(this.workers.length);

        let perworker = total / wl;
        let leftover = total - (perworker * wl);

        if (leftover < 0n) leftover = 0n;

        let use_workers = [ ... this.workers ];

        if (total <= 100n) {
            perworker = total;
            leftover = 0n;
            use_workers = [ use_workers[0] ];
        }

        this.running = use_workers.map(m => false);

        use_workers.forEach((worker, idx) => {
            let start = BigInt(idx) * perworker;
            let length = perworker;
            if (idx === this.workers.length - 1 || (start + length > total)) {
                length += leftover;
            }
            this.running[idx] = true;
            worker.postMessage({
                id: this.ids[idx],
                config: {
                    ...options.config,
                    // ship: JSON.parse(JSON.stringify(options.config.ship)),
                    // crew: JSON.parse(JSON.stringify(options.config.crew)),
                    start_index: start,
                    max_iterations: total <= 100n ? undefined : length,
                    status_data_only: true
                } as ShipWorkerConfig
            });
        });

        this.setState({
            fbb_mode,
            context: {
                ...this.state.context,
                cancelled: false,
                running: true,
                workers: use_workers.length,
                startTime: new Date()
            }
        });
    }

    private factorial(number: bigint) {
        let result = 1n;

        for (let i = 1n; i <= number; i++) {
            result *= i;
        }
        return result;
    }

    private readonly updateBigCounts = () => {
        let bigcount = Object.values(this.progresses).map(m => m.count).reduce((p, n) => p + n, 0n);
        let bigprogress = Object.values(this.progresses).map(m => BigInt(m.progress ?? 0n)).reduce((p, n) => p + n, 0n);
        let bigaccepted = Object.values(this.progresses).map(m => BigInt(m.accepted)).reduce((p, n) => p + n, 0n);
        this.count = bigcount;
        this.progress = bigprogress;
        this.accepted = bigaccepted;
        this.percent = Number(((bigprogress * 100n) / bigcount).toString());
    }

    private readonly workerMessage = (message: any): void => {
        const { fbb_mode, context } = this.state;
        let msg = message as ShipMultiWorkerStatus;
        let idx = this.ids.findIndex(fi => fi === msg.data.id);
        if (idx === -1) return;
        if (msg?.data?.inProgress && msg?.data?.id && msg?.data?.result?.progress !== undefined && msg.data?.result?.count) {
            this.progresses[msg.data.id] = {
                progress: msg.data.result.progress,
                count: msg.data.result.count,
                accepted: msg.data.result.accepted ?? 0n,
                time: 0
            }
            this.updateBigCounts();
            this.callback({
                data: {
                    id: msg.data.id,
                    inProgress: msg.data.inProgress,
                    result: {
                        count: this.count,
                        progress: this.progress,
                        percent: this.percent,
                        accepted: this.accepted
                    }
                }
            });

            this.setState({ context: {
                ...this.state.context,
                count: this.count,
                progress: this.progress,
                percent: this.percent
            }});
        }
        else if (msg?.data?.inProgress && msg?.data?.id && msg?.data?.result?.result) {
            if (!this.lastResult) {
                this.lastResult = msg.data.result.result;
            }
            else {
                if (compareShipResults(msg.data.result.result, this.lastResult, fbb_mode) > 0) return;
            }
            this.callback({
                data: {
                    id: msg.data.id,
                    inProgress: msg.data.inProgress,
                    result: {
                        result: msg.data.result.result
                    }
                }
            });
        }
        else if (msg?.data?.inProgress === false) {
            this.running[idx] = false;
            this.progresses[msg.data.id] = {
                ...this.progresses[msg.data.id],
                count: msg.data.result.total_iterations!,
                time: msg.data.result.run_time!,
                accepted: msg.data.result.accepted ?? 0n
            }
            try {
                this.updateBigCounts();
            }
            catch (e) {
                console.log(e);
            }

            if (msg.data.result.ships) {
                this.allResults = this.allResults.concat(msg.data.result.ships);
            }

            if (this.running.every(e => !e)) {
                this.allResults.sort((a, b) => compareShipResults(a, b, fbb_mode));
                let top = 0;

                if (fbb_mode) top = this.allResults[0].fbb_metric;
                else top = this.allResults[0].arena_metric;

                this.allResults.forEach((result) => {
                    if (fbb_mode) {
                        result.percentile = Math.round(1000 * (result.fbb_metric / top)) / 10;
                    }
                    else {
                        result.percentile = Math.round(1000 * (result.arena_metric / top)) / 10;
                    }
                });

                const endTime = new Date();
                const run_time = (endTime.getTime() - context.startTime.getTime()) / 1000;
                this.callback({
                    data: {
                        id: msg.data.id,
                        inProgress: false,
                        result: {
                            total_iterations: this.count,
                            run_time,
                            accepted: this.accepted!,
                            ships: this.allResults
                        }
                    }
                });
                this.setState({
                    context: {
                        ...context,
                        running: false,
                        run_time,
                        count: this.count,
                        progress: this.count,
                        percent: 100
                    }
                });
                this.reset(false, undefined, true);
            }
        }
    }

    render() {
        const { context } = this.state;
        const { children } = this.props;

        return <MultiWorkerContext.Provider value={context}>
            {children}
        </MultiWorkerContext.Provider>

    }
}