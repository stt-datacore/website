import React from "react";
import { UnifiedWorker } from "../typings/worker";

export interface IWorkerContext {
    cancel: () => void;
    runWorker: (workerName: string, config: any, callback: (data: any) => void) => void,
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
    data: any;
    workerName: string | null;
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
            data: {},
            workerName: null
        }
    }

    private readonly cancel = (clear?: boolean) => {
        const { worker } = this.state;
        worker?.terminate();
        worker?.removeEventListener('message', this.afterWorker);
        if (clear) {
            this.setState({ ... this.state, workerName: null, data: {}, callback: null, worker: null, context: { ... this.state.context, running: false, runningWorker: null }});
        }
    }

    private readonly afterWorker = (data: any) => {
        if (this.state.callback) {
            this.state.callback(data);
        }
        this.setState({ ... this.state, workerName: null, data: {}, callback: null, worker: null, context: { ... this.state.context, running: false, runningWorker: null }});
    }

    private readonly createWorker = () => {
        this.cancel();
        const worker = new UnifiedWorker();
        worker.addEventListener('message', this.afterWorker);
        return worker;
    }

    private readonly runWorker = (workerName: string, config: any, callback: (data: any) => void): void => {
        const worker = this.createWorker();
        this.setState({ ... this.state, worker, workerName, data: config, callback, context: { ... this.state.context, running: true, runningWorker: workerName }});
    }

    componentDidUpdate(prevProps: Readonly<WorkerProviderProps>, prevState: Readonly<WorkerProviderState>, snapshot?: any): void {
        if (this.state.worker && Object.keys(this.state.data).length) {
            this.state.worker?.postMessage({
                worker: this.state.workerName,
                config: this.state.data
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