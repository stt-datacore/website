import React from "react";
import { UnifiedWorker } from "../typings/worker";

export interface IWorkerContext {
    workerName: string,
    cancel: () => void;
    runWorker: (config: any, callback: (data: any) => void) => void,
    running: boolean;
}

export interface WorkerProviderProps {
    children: JSX.Element;
    workerName: string;
}

export interface WorkerProviderState {
    worker: UnifiedWorker | null,
    callback: null | ((data: any) => void),
    context: IWorkerContext;
    data: any;
}

const DefaultContextData = {
    cancel: () => false,
    runWorker: () => false,
    running: false,
    workerName: ''
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
                runWorker: this.runWorker,
                workerName: this.props.workerName
            },
            data: {}
        }
    }

    private readonly cancel = (clear?: boolean) => {
        const { worker } = this.state;
        worker?.terminate();
        worker?.removeEventListener('message', this.afterWorker);
        if (clear) {
            this.setState({ ... this.state, data: {}, callback: null, worker: null, context: { ... this.state.context, running: false }});    
        }
    }

    private readonly afterWorker = (data: any) => {
        if (this.state.callback) {
            this.state.callback(data);
        }
        this.setState({ ... this.state, data: {}, callback: null, worker: null, context: { ... this.state.context, running: false }});
    }

    private readonly createWorker = () => {
        this.cancel();
        const worker = new UnifiedWorker();
        worker.addEventListener('message', this.afterWorker);
        return worker;
    }

    private readonly runWorker = (config: any, callback: (data: any) => void): void => {
        const worker = this.createWorker();
        this.setState({ ... this.state, worker, data: config, callback, context: { ... this.state.context, running: true }});
    }

    componentDidUpdate(prevProps: Readonly<WorkerProviderProps>, prevState: Readonly<WorkerProviderState>, snapshot?: any): void {
        if (this.state.worker && Object.keys(this.state.data).length) {
            this.state.worker?.postMessage({
                worker: this.props.workerName,
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