import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentWorkerResults } from "../../model/worker";
import { OptionsPanelFlexRow } from "../stats/utils";
import { EquipmentTable, EquipmentTableProps } from "./equipment_table";
import { useStateWithStorage } from "../../utils/storage";

interface DemandsTableProps extends EquipmentTableProps {
    showUnownedNeeded?: boolean;
    noWorker?: boolean;
}

export const DemandsTable = (props: DemandsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { t } = globalContext.localized;
    const { playerData, calculatedDemands, setCalculatedDemands } = globalContext.player;

    const [triggerWorker, setTriggerWorker] = React.useState(false);
    const [displayData, setDisplayData] = React.useState<(EquipmentItem | EquipmentCommon)[]>(calculatedDemands ?? []);

    const { cancel, runWorker, running } = workerContext;

    React.useEffect(() => {
        if (calculatedDemands) {
            setDisplayData(calculatedDemands);
            return;
        }
        if (!props.noWorker && triggerWorker) return;
        if (!!runWorker && !props.noWorker && !!playerData) {
            setTriggerWorker(true);
        }
    }, [props.noWorker, playerData]);

    React.useEffect(() => {
        if (triggerWorker) {
            if (running) cancel();
            setTimeout(() => {
                if (triggerWorker && !props.noWorker) {
                    setTriggerWorker(false);
                    runWorker(
                        "equipmentWorker", {
                            playerData,
                            items: props.items,
                            addNeeded: true
                        },
                        (data: { data: { result: EquipmentWorkerResults } }) => {
                            if (playerData) setCalculatedDemands(data.data.result.items as EquipmentItem[]);
                            setDisplayData(data.data.result.items);
                        }
                    )
                }
            }, 500);
        }
    }, [triggerWorker]);

    const flexRow = OptionsPanelFlexRow;

    if (!props.noWorker && running) {
        return <div style={{...flexRow, justifyContent: 'center', marginTop: '4em', minHeight: '50vh', alignItems: 'flex-start'}}>{globalContext.core.spin(t('spinners.demands'))}</div>;
    }
    else {
        return <EquipmentTable
            {...{...props, items: displayData}}
            />
    }
}