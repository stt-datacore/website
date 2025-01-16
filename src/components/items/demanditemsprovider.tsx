import React from "react";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { EquipmentWorkerResults, EquipmentWorkerConfig } from "../../model/worker";
import { UnifiedWorker } from "../../typings/worker";
import { GlobalContext } from "../../context/globalcontext";

export interface DemandItemsProviderProps {
    addNeeded?: boolean;
    children: JSX.Element;
}

export interface IDemandProviderContext {
    items: (EquipmentItem | EquipmentCommon)[];
    refresh: () => void;
    ready: boolean;
}

const DefaultDemandProviderData = {
    items: [],
    refresh: () => false,
    ready: false
} as IDemandProviderContext;

export const DemandItemsContext = React.createContext(DefaultDemandProviderData);

export const DemandItemsProvider = (props: DemandItemsProviderProps) => {
    const worker = new UnifiedWorker();
    const globalContext = React.useContext(GlobalContext);
    const [contextReady, setContextReady] = React.useState(false);
    const [ready, setReady] = React.useState(false);
    const [running, setRunning] = React.useState(false);
    const [data, setData] = React.useState<(EquipmentItem | EquipmentCommon)[]>([]);
    const { playerData } = globalContext.player;
    const { items } = globalContext.core;
    const { addNeeded, children } = props;

    globalContext.core.ready(['items', 'crew', 'missionsfull', 'ship_schematics', 'cadet'], () => {
        setContextReady(true);
    });

    React.useEffect(() => {
        if (items?.length && !running && !ready && contextReady) runWorker();
    }, [ready, contextReady]);

    if (!contextReady || !ready || !playerData) return globalContext.core.spin();

    const context = {
        items: data,
        refresh,
        ready
    };

    return <DemandItemsContext.Provider value={context}>
        {children}
    </DemandItemsContext.Provider>

	function runWorker() {
		if (playerData?.calculatedDemands?.length) {
			let data = [...playerData.calculatedDemands];
			if (addNeeded) {
				data.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
			}
            setData(data);
			return;
		}

		worker.addEventListener("message", processResult);
        setRunning(true);

        worker.postMessage({
			worker: "equipmentWorker",
			config: {
				playerData,
				items,
				addNeeded,
			} as EquipmentWorkerConfig,
		});
	}

    function processResult(message: { data: { result: EquipmentWorkerResults } }) {
        if (playerData) playerData.calculatedDemands = message.data.result.items as EquipmentItem[];
        setData([...message.data.result.items]);
        setRunning(false);
        setReady(true);
    }

    function refresh() {
        setReady(false);
    }

}