import { v4 } from "uuid";
import { IMultiWorkerConfig, IMultiWorkerContext, IMultiWorkerState, IMultiWorkerStatus, WorkerConfigBase } from "../../model/worker";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";

const DEBUG_MODE = false;

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

export const MultiWorkerContext = React.createContext(DefaultMultiWorkerContextData);

export interface MultiWorkerProps {
    children: JSX.Element;
}

export abstract class MultiWorkerBase<TProps extends MultiWorkerProps, TState extends IMultiWorkerState, TRun extends IMultiWorkerConfig<TConfig, TItem>, TConfig extends WorkerConfigBase<TItem>, TItem> extends
    React.Component<TProps, TState> {
        static contextType = GlobalContext;
        declare context: React.ContextType<typeof GlobalContext>;

        callback: (progress: IMultiWorkerStatus<TItem>) => void = () => false;
        config: TConfig = {} as any;
        options: TRun = {} as any;
        protected workers: Worker[] = [];
        protected ids: string[] = [];
        protected running: boolean[] = [];
        protected percent: number = 0;
        protected count: bigint = 0n;
        protected progress: bigint = 0n;
        protected accepted: bigint = 0n;
        protected lastResult: TItem | null = null;
        protected progresses = {} as { [key: string]: { count: bigint, time: number, progress: bigint, accepted: bigint }};
        protected allResults: TItem[] = [];

        constructor(props: TProps) {
            super(props);

            this.state = {
                context: {
                    ...DefaultMultiWorkerContextData,
                    cancel: () => this.reset(true),
                    runWorker: (options) => this.runWorker(options)
                }
            } as TState;
        }

        protected abstract createWorker(): Worker;

        protected abstract getRunConfig(options: TRun): TConfig;

        protected abstract onProgress(msg: any): boolean;

        protected abstract onItem(msg: any): boolean;

        protected abstract onComplete(msg: any): void;

        private readonly initialize = (max_workers?: number) => {
            let cores = navigator?.hardwareConcurrency ?? 1;
            if (max_workers && max_workers < cores) cores = max_workers;

            const newworkers = [] as Worker[];
            this.ids=[];
            this.running=[];
            for (let i = 0; i < cores; i++) {
                let worker = this.createWorker();
                worker.onmessage = (data) => this.workerMessage(data);
                // worker.addEventListener('message', this.workerMessage);
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
                //worker.removeEventListener('message', this.workerMessage);
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

        private readonly runWorker = (options: TRun) => {
            this.callback = options.callback;
            const run_config = this.getRunConfig(options);
            this.config = run_config;
            this.options = options;
            this.reset(false, options.max_workers);
            let total = 0n;

            if (options.config.max_iterations) {
                total = options.config.max_iterations;
            }
            else {
                total = run_config.max_iterations ? run_config.max_iterations : 0n;
            }
            if (!total) throw new Error("Nothing to work on! Total is 0.");

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
                        ...run_config,
                        start_index: start,
                        max_iterations: total <= 100n ? undefined : length
                    }
                });
            });

            this.setState({
                context: {
                    ...this.state.context,
                    cancelled: false,
                    running: true,
                    workers: use_workers.length,
                    startTime: new Date()
                }
            });
        }

        private readonly updateBigCounts = () => {
            let bigcount = Object.values(this.progresses).map(m => m.count).reduce((p, n) => p + n, 0n);
            let bigprogress = Object.values(this.progresses).map(m => BigInt(m.progress ?? 0n)).reduce((p, n) => p + n, 0n);
            let bigaccepted = Object.values(this.progresses).map(m => BigInt(m.accepted)).reduce((p, n) => p + n, 0n);
            this.count = bigcount;
            this.progress = bigprogress;
            this.accepted = bigaccepted;
            this.percent = this.count ? Number(((bigprogress * 100n) / bigcount).toString()) : 0;
        }

        private workerMessage = (message: any): void => {
            const { context } = this.state;
            let msg = message as IMultiWorkerStatus<TItem>;
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
                if (!this.onProgress(msg)) return;

                this.setState({ context: {
                    ...this.state.context,
                    count: this.count,
                    progress: this.progress,
                    percent: this.percent
                }});

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

            }
            else if (msg?.data?.inProgress && msg?.data?.id && msg?.data?.result?.result) {
                if (!this.lastResult) {
                    this.lastResult = msg.data.result.result;
                }

                if (!this.onItem(msg)) return;
                this.updateBigCounts();

                this.lastResult = msg.data.result.result;

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

                if (DEBUG_MODE) console.log(`Worker ${idx} is finished.`);

                this.updateBigCounts();

                if (msg.data.result.items) {
                    this.allResults = this.allResults.concat(msg.data.result.items);
                }

                if (this.running.every(e => !e)) {
                    this.onComplete(msg);

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
                                items: this.allResults
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