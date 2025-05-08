import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentItem } from "../../model/equipment";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentWorkerResults } from "../../model/worker";
import { OptionsPanelFlexRow } from "../stats/utils";
import { EquipmentTable, EquipmentTableProps } from "./equipment_table";
import { ItemsFilterContext } from "./filters";

interface DemandsTableProps extends EquipmentTableProps {
    showUnownedNeeded?: boolean;
    noWorker?: boolean;
}

export const DemandsTable = (props: DemandsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);
    const filterContext = React.useContext(ItemsFilterContext);
    const { configureFilters } = filterContext;

    const { t } = globalContext.localized;

    const { playerData, calculatedDemands, setCalculatedDemands } = globalContext.player;
    const [displayData, setDisplayData] = React.useState<(EquipmentItem | EquipmentItem)[]>(calculatedDemands ?? []);

    const { cancel, runWorker, running } = workerContext;

    React.useEffect(() => {
        if (calculatedDemands?.length) {
            setDisplayData(calculatedDemands);
            return;
        }
        if (!playerData || !!props.noWorker) return;
        if (running) cancel();
        if (props.noRender) return;
        setTimeout(() => {
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
        }, 500);
    }, [playerData, props.noRender]);

    React.useEffect(() => {
        if (!props.noRender && displayData.length) configureFilters(undefined);
    }, [displayData, props.noRender]);

    const flexRow = OptionsPanelFlexRow;

    if (props.noRender) {
        return <></>;
    }
    else if (!props.noWorker && running) {
        return <div style={{...flexRow, justifyContent: 'center', marginTop: '4em', minHeight: '50vh', alignItems: 'flex-start'}}>{globalContext.core.spin(t('spinners.demands'))}</div>;
    }
    else {
        return <EquipmentTable
            {...{...props, items: displayData}}
            />
    }
}