import { ShipWorkerConfig, ShipWorkerItem, ShipWorkerTransportItem } from "../../model/worker";
import React from "react";
import { compareShipResults } from "../../utils/shiputils";
import { IMultiWorkerContext, IMultiWorkerConfig, IMultiWorkerState, IMultiWorkerStatus } from "../../model/worker";
import { getComboCountBig } from "../../utils/misc";
import { MultiWorkerBase } from "../base/multiworkerbase";

export interface ShipMultiWorkerProps {
    children: JSX.Element;
}

export interface ShipMultiWorkerStatus extends IMultiWorkerStatus<ShipWorkerTransportItem> {
}

export interface IShipMultiWorkerContext extends IMultiWorkerContext {
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
} as IShipMultiWorkerContext;

export interface ShipMultiWorkerState extends IMultiWorkerState {
    fbb_mode: boolean;
}

export interface ShipMultiWorkerConfig extends IMultiWorkerConfig<ShipWorkerConfig, ShipWorkerTransportItem> {
    fbb_mode: boolean;
}

export const ShipMultiWorkerContext = React.createContext(DefaultMultiWorkerContextData);

export class ShipMultiWorker extends MultiWorkerBase<ShipMultiWorkerProps,  ShipMultiWorkerState, ShipMultiWorkerConfig, ShipWorkerConfig, ShipWorkerTransportItem> {
    protected itemPassAccepted: boolean = true;
    constructor(props: ShipMultiWorkerProps) {
        super(props);
    }

    protected createWorker(): Worker {
        return new Worker(new URL('../../workers/battle-worker.js', import.meta.url));
    }
    protected getRunConfig(options: ShipMultiWorkerConfig): ShipWorkerConfig {
        let fbb_mode = options.fbb_mode;

        let wcn = BigInt(options.config.crew.length);
        let bsn = BigInt(options.config.ship.battle_stations!.length);
        let total = getComboCountBig(wcn, bsn);

        options.config.max_iterations = total;
        this.setState({...this.state, fbb_mode });

        return {
            ...options.config
        } as any;
    }

    protected onComplete(msg: any): void {
        let fbb_mode = this.options.fbb_mode;
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
    }

    protected onProgress(msg: any): boolean {
        return true;
    }

    protected onItem(msg: any): boolean {
        if (this.lastResult) {
            if (compareShipResults(msg.data.result.result, this.lastResult, this.options.fbb_mode) > 0) return false;
        }

        return true;
    }

    render() {
        const { context } = this.state;
        const { children } = this.props;

        return <ShipMultiWorkerContext.Provider value={context}>
            {children}
        </ShipMultiWorkerContext.Provider>
    }
}

