import React from "react";
import { UnifiedWorker } from "../typings/worker";

export interface IWorkerContext {
    cancel: () => void;
    runWorker: (workerName: string, config: any, callback: (data: any) => void, subscribeIfRunning?: boolean) => void,
    running: boolean;
    runningWorker: string | null
}

export interface WorkerProviderProps {
    children: JSX.Element;
}

export interface WorkerProviderState {
    worker: UnifiedWorker | null,
    callback: null | ((data: any) => void),
    context: IWorkerContext;
    config: any;
    workerName: string | null;
    extraCallbacks: ((data: any) => void)[]
}

const DefaultContextData = {
    cancel: () => false,
    runWorker: () => false,
    running: false,
    runningWorker: null
}

export const WorkerContext = React.createContext<IWorkerContext>(DefaultContextData);

export class WorkerProvider extends React.Component<WorkerProviderProps, WorkerProviderState> {

    constructor(props: WorkerProviderProps) {
        super(props);

        this.state = {
            callback: null,
            worker: null,
            context: {
                ... DefaultContextData,
                cancel: () => this.cancel(true),
                runWorker: this.runWorker
            },
            config: null,
            workerName: null,
            extraCallbacks: []
        }
    }

    private readonly clearState = () => {
        this.setState({
            ... this.state,
            extraCallbacks: [].slice(),
            workerName: null,
            config: null,
            callback: null,
            worker: null,
            context: {
                ... this.state.context,
                running: false,
                runningWorker: null
            }});
    }

    private readonly cancel = (clear?: boolean) => {
        const { worker } = this.state;
        worker?.terminate();
        worker?.removeEventListener('message', this.workerMessage);
        if (clear) {
            this.clearState();
        }
    }

    private readonly workerMessage = (data: any) => {
        if (this.state.callback) {
            this.state.callback(data);
            if (this.state.extraCallbacks?.length) {
                for (const cb of this.state.extraCallbacks) {
                    setTimeout(() => {
                        cb(data);
                    });
                }
            }
        }
        if (data.data.inProgress) return;
        this.cancel(true);
    }

    private readonly createWorker = () => {
        this.cancel();
        const worker = new UnifiedWorker();
        worker.addEventListener('message', this.workerMessage);
        return worker;
    }

    private readonly runWorker = (workerName: string, config: any, callback: (data: any) => void, subscribeIfRunning?: boolean): void => {
        if (subscribeIfRunning && this.state.context.running) {
            let ecb = [...this.state.extraCallbacks];
            if (!ecb.includes(callback)) {
                ecb.push(callback);
                this.setState({ ...this.state, extraCallbacks: ecb });
            }
            return;
        }

        const worker = this.createWorker();
        this.setState({
            ... this.state,
            worker,
            workerName,
            config,
            callback,
            context: {
                ... this.state.context,
                running: true,
                runningWorker: workerName
            }});
    }

    componentDidUpdate(prevProps: Readonly<WorkerProviderProps>, prevState: Readonly<WorkerProviderState>, snapshot?: any): void {
        const { workerName: name, config, worker } = this.state;
        if (worker && config) {
            worker.postMessage({
                worker: name,
                config
            });
        }
    }

    render(): React.ReactNode {
        const { children } = this.props;

        return <WorkerContext.Provider value={this.state.context}>
            {children}
        </WorkerContext.Provider>
    }
}