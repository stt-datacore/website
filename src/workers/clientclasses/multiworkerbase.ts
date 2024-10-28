import { v4 } from "uuid";
import { IMultiWorkerConfig, IMultiWorkerStatus, WorkerConfigBase } from "../../model/worker";

export abstract class MultiWorkerBase<TConfig extends WorkerConfigBase<TItem>, TItem> {
    private readonly workerUrl: string;

    private _canceled = false;
    private _workers: Worker[] = [];
    private _ids: string[] = [];
    private _runningWorker: boolean[] = [];
    private _percent: number = 0;
    private _count: bigint = 0n;
    private _progress: bigint = 0n;
    private _accepted: bigint = 0n;
    private _lastResult: TItem | null = null;
    private _progresses = {} as { [key: string]: { count: bigint, time: number, progress: bigint, accepted: bigint }};
    private _results: TItem[] = [];
    private _isRunning = false;
    private _startTime = new Date();

    private callback: (progress: IMultiWorkerStatus<TItem>) => void;
    private onCancel?: () => void;

    public get accepted(): bigint {
        return this._accepted;
    }

    public get progress(): bigint {
        return this._progress;
    }

    public get count(): bigint {
        return this._count;
    }

    public get results(): TItem[] {
        return this._results;
    }

    public get running(): boolean {
        return this._isRunning;
    }

    public get canceled(): boolean {
        return this._canceled;
    }

    public clear() {
        this.reset(false);
    }

    public cancel() {
        this.reset(true);
        if (this.onCancel) this.onCancel();
    }

    constructor(workerUrl: string, callback: (progress: IMultiWorkerStatus<TItem>) => void, onCancel?: () => void) {
        this.workerUrl = workerUrl;
        this.callback = callback;
        this.onCancel = onCancel;
    }

    protected abstract createWorker(): Worker;

    private initialize = (max_workers?: number) => {
        let cores = navigator?.hardwareConcurrency ?? 1;
        if (max_workers && max_workers < cores) cores = max_workers;

        const newworkers = [] as Worker[];

        this._ids=[];
        this._runningWorker=[];

        for (let i = 0; i < cores; i++) {
            let worker = this.createWorker();
            worker.onmessage = (data) => this.workerMessage(data);
            newworkers.push(worker);
            this._ids.push(v4());
            this._runningWorker.push(false);
        }
        this._workers = newworkers;
        this._progresses = {};
        this._results = [];
    }

    private reset = (set_canceled: boolean, max_workers?: number, no_init?: boolean) => {
        this._workers.forEach((worker) => {
            worker.terminate();
        });

        this._workers = [];
        this._ids = [];
        this._runningWorker = [];
        this._progresses = {};
        this._results = [];
        this._lastResult = null;

        if (set_canceled) {
            this._canceled = true;
        }
        else if (!no_init) {
            this.initialize(max_workers);
        }
    }

    protected abstract getRunConfig(options: IMultiWorkerConfig<TConfig, TItem>): TConfig;

    public runWorker = (options: IMultiWorkerConfig<TConfig, TItem>) => {
        this.callback = options.callback;
        this.reset(false, options.max_workers);

        const config = this.getRunConfig(options);

        if (!config.max_iterations) return false;
        let total = BigInt(config.max_iterations);

        if (options.config.max_iterations && options.config.max_iterations < total) {
            total = options.config.max_iterations;
        }

        let wl = BigInt(this._workers.length);

        let perworker = total / wl;
        let leftover = total - (perworker * wl);

        if (leftover < 0n) leftover = 0n;

        let use_workers = [ ... this._workers ];

        if (total <= 100n) {
            perworker = total;
            leftover = 0n;
            use_workers = [ use_workers[0] ];
        }

        this._runningWorker = use_workers.map(m => false);
        this._startTime = new Date();

        use_workers.forEach((worker, idx) => {
            let start = BigInt(idx) * perworker;
            let length = perworker;
            if (idx === this._workers.length - 1 || (start + length > total)) {
                length += leftover;
            }
            this._runningWorker[idx] = true;
            worker.postMessage({
                id: this._ids[idx],
                config: {
                    ...config,
                    start_index: start,
                    max_iterations: total <= 100n ? undefined : length
                } as TConfig
            });
        });
    }

    protected factorial(number: bigint) {
        let result = 1n;

        for (let i = 1n; i <= number; i++) {
            result *= i;
        }
        return result;
    }

    private updateBigCounts = () => {
        let bigcount = Object.values(this._progresses).map(m => m.count).reduce((p, n) => p + n, 0n);
        let bigprogress = Object.values(this._progresses).map(m => BigInt(m.progress ?? 0n)).reduce((p, n) => p + n, 0n);
        let bigaccepted = Object.values(this._progresses).map(m => BigInt(m.accepted)).reduce((p, n) => p + n, 0n);
        this._count = bigcount;
        this._progress = bigprogress;
        this._accepted = bigaccepted;
        this._percent = Number(((bigprogress * 100n) / bigcount).toString());
    }

    private workerMessage = (message: any): void => {
        let msg = message as IMultiWorkerStatus<TItem>;
        let idx = this._ids.findIndex(fi => fi === msg.data.id);
        if (idx === -1) return;
        if (msg?.data?.inProgress && msg?.data?.id && msg?.data?.result?.progress !== undefined && msg.data?.result?.count) {
            this._progresses[msg.data.id] = {
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
                        count: this._count,
                        progress: this._progress,
                        percent: this._percent,
                        accepted: this._accepted
                    }
                }
            });

        }
        else if (msg?.data?.inProgress && msg?.data?.id && msg?.data?.result?.result) {
            if (!this._lastResult) {
                this._lastResult = msg.data.result.result;
            }
            else {
                //if (compareMutualPolestarResults(msg.data.result.result, this.lastResult, fbb_mode) > 0) return;
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
            this._runningWorker[idx] = false;
            this._progresses[msg.data.id] = {
                ...this._progresses[msg.data.id],
                count: msg.data.result.total_iterations!,
                time: msg.data.result.run_time!,
                accepted: msg.data.result.accepted ?? 0n
            }
            console.log(`Worker ${idx} is finished.`);

            try {
                this.updateBigCounts();
            }
            catch (e) {
                console.log(e);
            }

            if (msg.data.result.items) {
                this._results = this._results.concat(msg.data.result.items);
            }

            if (this._runningWorker.every(e => !e)) {
                const endTime = new Date();
                const run_time = (endTime.getTime() - this._startTime.getTime()) / 1000;
                this.callback({
                    data: {
                        id: msg.data.id,
                        inProgress: false,
                        result: {
                            total_iterations: this._count,
                            run_time,
                            accepted: this._accepted!,
                            items: this._results
                        }
                    }
                });
                this.reset(false, undefined, true);
            }
        }
    }
}