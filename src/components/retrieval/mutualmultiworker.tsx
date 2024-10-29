import { v4 } from "uuid";
import React from "react";
import { IMultiWorkerContext, IMultiWorkerConfig, IMultiWorkerState, IMultiWorkerStatus, IMutualPolestarWorkerItem, IMutualPolestarWorkerConfig, IWorkerResults, IMutualPolestarInternalWorkerConfig, IPolestarCrew } from "../../model/worker";
import { GlobalContext } from "../../context/globalcontext";
import { PlayerCrew, PlayerData } from "../../model/player";
import { makeCompact } from "../../utils/crewutils";
import { getComboCountBig } from "../../utils/misc";

export interface MutualPolestarMultiWorkerProps {
    children: JSX.Element;
    playerData: PlayerData;
}

export interface MutualPolestarMultiWorkerStatus extends IMultiWorkerStatus<IMutualPolestarWorkerItem> {
}

export interface IMutualPolestarMultiWorkerContext extends IMultiWorkerContext<MutualPolestarMultiWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem> {
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
} as IMutualPolestarMultiWorkerContext;

export interface MutualPolestarMultiWorkerState extends IMultiWorkerState<MutualPolestarMultiWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem> {
}


export interface MutualPolestarMultiWorkerConfig extends IMultiWorkerConfig<IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem> {
}

export interface MutualPolestarResults extends IWorkerResults<IMutualPolestarWorkerItem> {

}

export const MutualMultiWorkerContext = React.createContext(DefaultMultiWorkerContextData);

// export const MutualPolestarMultiWorker = (props: MutualPolestarMultiWorkerProps) => {
//     const globalContext = React.useContext(GlobalContext);
//     const { children } = props;
//     const [worker, setWorker] = React.useState<PolestarMultiWorker>();
//     const [options, setOptions] = React.useState<MutualPolestarMultiWorkerConfig>();
//     const [workerMessage, setWorkerMessage] = React.useState<(msg: any) => void>(() => false);
//     const [startTime, setStartTime] = React.useState(new Date());

//     React.useEffect(() => {
//         if (worker) {
//             worker.cancel();
//         }
//         if (options) {
//             setWorker(new PolestarMultiWorker(globalContext, options.callback));
//         }
//     }, [options]);

//     React.useEffect(() => {
//         if (worker && options) {
//             worker.runWorker(options);
//         }
//     }, [worker]);

//     function runWorker(options: MutualPolestarMultiWorkerConfig) {
//         setOptions(options);
//     }

//     function cancel() {
//         worker?.cancel();
//     }

//     const context = {
//         ...DefaultMultiWorkerContextData,
//         runWorker,
//         cancel,
//         running: !!worker?.running,

//     } as IMutualPolestarMultiWorkerContext;

//     return <MutualMultiWorkerContext.Provider value={context}>
//         {children}
//     </MutualMultiWorkerContext.Provider>
// }

export class MutualPolestarMultiWorker extends React.Component<MutualPolestarMultiWorkerProps, MutualPolestarMultiWorkerState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    callback: (progress: MutualPolestarMultiWorkerStatus) => void;
    config: IMutualPolestarWorkerConfig;
    private last = new Date();
    private workers: Worker[] = [];
    private ids: string[] = [];
    private running: boolean[] = [];
    private percent: number = 0;
    private count: bigint = 0n;
    private progress: bigint = 0n;
    private accepted: bigint = 0n;
    private lastResult: IMutualPolestarWorkerItem | null = null;
    private progresses = {} as { [key: string]: { count: bigint, time: number, progress: bigint, accepted: bigint }};
    private allResults: IMutualPolestarWorkerItem[] = [];

    constructor(props: MutualPolestarMultiWorkerProps) {
        super(props);

        this.state = {
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
            let worker = new Worker(new URL('../../workers/polestar-worker.js', import.meta.url));
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

    private readonly runWorker = (options: MutualPolestarMultiWorkerConfig) => {
        this.callback = options.callback;
        this.config = options.config;
        const allCrew = this.context.core.crew;
        const ownedCrew = this.props.playerData?.player.character.crew;
        const { polestars, comboSize, batch, allowUnowned, no100 } = options.config;

        if (!ownedCrew) return false;

        this.reset(false, options.max_workers);

		let eligibleCrew = ownedCrew.filter(f =>
            f.rarity < f.max_rarity && f.in_portal
            && f.rarity === f.highest_owned_rarity
            && (!no100 || !f.unique_polestar_combos?.length)).map(c => makeCompact(c, ['ship_battle', 'base_skills', 'skills', 'equipment']) as IPolestarCrew);

        eligibleCrew = eligibleCrew.filter((f, idx) => eligibleCrew.findIndex(f2 => f2.symbol === f.symbol) === idx);

		let exclude = allCrew.filter(f => !eligibleCrew.some(c => c.symbol === f.symbol)).map(m => m.symbol);
		let include = allCrew.filter(f => !exclude.some(c => c === f.symbol)).map(m => m.symbol);
        let unowned = exclude.filter(f => {
            let acf = allCrew.find(acf => acf.symbol === f);
            if (no100 && acf?.unique_polestar_combos?.length) return false;
            return !ownedCrew.some(oc => oc.symbol === f) && acf?.in_portal;
        });

        const copycrew = this.context.core.crew.map(crew => makeCompact(crew as PlayerCrew, ['ship_battle', 'base_skills', 'skills', 'equipment']) as IPolestarCrew)
        let c = copycrew.length;
        for (let i = 0; i < c; i++) {
            let crew = copycrew[i];
            if (unowned.includes(crew.symbol)) {
                crew.disposition = 'unowned';
            }
            else if (include.includes(crew.symbol)) {
                crew.disposition = 'include';
                let fcrew = eligibleCrew.find(f => f.symbol === crew.symbol);
                if (fcrew) {
                    crew = { ...crew, ...fcrew };
                }
            }
            else {
                crew.disposition = 'exclude';
            }
            copycrew[i] = crew;
        }

		const rarityBucket = {} as { [key: string]: string[] };
		const skillBucket = {} as { [key: string]: string[] };
		const traitBucket = {} as { [key: string]: string[] };

		copycrew.forEach((crew) => {
			crew.traits?.forEach((trait) => {
				if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `${trait}_keystone`)) {
					traitBucket[trait] ??= [];
					traitBucket[trait].push(crew.symbol);
				}
			});

            if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `rarity_${crew.max_rarity}_keystone`)) {
                rarityBucket[crew.max_rarity] ??= [];
                rarityBucket[crew.max_rarity].push(crew.symbol);
            }

            crew.skill_order.forEach((skill) => {
                if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `${skill}_keystone`)) {
                    skillBucket[`${skill}`] ??= [];
                    skillBucket[`${skill}`].push(crew.symbol);
                }
            });
		});

		const allTraits = Object.keys(skillBucket).concat(Object.keys(rarityBucket)).concat(Object.keys(traitBucket));

        let wcn = BigInt(allTraits.length);
        let bsn = BigInt(options.config.comboSize);
        let total = getComboCountBig(wcn, bsn);
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
                    include,
                    exclude,
                    allTraits,
                    polestars,
                    comboSize,
                    batch,
                    crew: copycrew,
                    start_index: start,
                    max_iterations: total <= 100n ? undefined : length,
                    allowUnowned,
                    unowned
                } as IMutualPolestarInternalWorkerConfig
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
        this.percent = Number(((bigprogress * 100n) / bigcount).toString());
    }

    private workerMessage = (message: any): void => {
        const { context } = this.state;
        let msg = message as MutualPolestarMultiWorkerStatus;
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
            this.running[idx] = false;
            this.progresses[msg.data.id] = {
                ...this.progresses[msg.data.id],
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
                this.allResults = this.allResults.concat(msg.data.result.items);
            }

            if (this.running.every(e => !e)) {
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

        return <MutualMultiWorkerContext.Provider value={context}>
            {children}
        </MutualMultiWorkerContext.Provider>

    }
}