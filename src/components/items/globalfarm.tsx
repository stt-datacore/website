import React from "react"
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { FarmSources, FarmTable } from "./farmtable";
import { mergeItems } from "../../utils/itemutils";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentWorkerResults } from "../../model/worker";
import { OptionsPanelFlexRow } from "../stats/utils";


interface GlobalFarmProps {
    coreItems: EquipmentItem[];
    noRender?: boolean;
    noWorker?: boolean;
}

export const GlobalFarm = (props: GlobalFarmProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { coreItems } = props;
    const { t } = globalContext.localized;

    const { playerData, calculatedDemands, setCalculatedDemands } = globalContext.player;
    const [displayData, setDisplayData] = React.useState<(EquipmentItem | EquipmentCommon)[]>(calculatedDemands ?? []);

    const { cancel, runWorker, running } = workerContext;

    React.useEffect(() => {
        if (calculatedDemands) {
            setDisplayData(calculatedDemands);
            return;
        }
        if (!playerData || !!props.noWorker) return;
        if (running) cancel();

        setTimeout(() => {
            runWorker(
                "equipmentWorker", {
                    playerData,
                    items: coreItems,
                    addNeeded: true
                },
                (data: { data: { result: EquipmentWorkerResults } }) => {
                    if (playerData) setCalculatedDemands(data.data.result.items as EquipmentItem[]);
                    setDisplayData(data.data.result.items);
                }
            )
        }, 500);
    }, [playerData, coreItems]);

    const easternTime = new Date((new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' }));

    let phaseChk = 0;

    if ((easternTime.getDay() === 6 && easternTime.getHours() >= 12) || easternTime.getDay() < 2) {
        phaseChk = 1;
    }

    const [allDemands, setAllDemands] = React.useState<EquipmentItem[]>([]);
    const [sources, setSources] = React.useState<FarmSources[]>([]);

    React.useEffect(() => {
        const newDemands = (displayData as EquipmentItem[]); //.map(me => me.demands?.map(de => ({...de.equipment!, needed: de.count, quantity: de.have }) as EquipmentItem) ?? []).flat();
        const newsources = [] as FarmSources[];

        newDemands.forEach((demand) => {
            if (demand.item_sources?.length) {
                demand.item_sources.forEach((source) => {
                    if (source.type === 1) return;
                    let csource = newsources.find(f => f.source.name === source.name && f.source.mastery === source.mastery);
                    if (csource) {
                        const fitem = csource.items.find(f => f.symbol === demand.symbol);
                        if (fitem) {
                            fitem.needed ??= 0;
                            fitem.needed += demand.needed ?? 0;
                        }
                        else {
                            csource.items.push(JSON.parse(JSON.stringify(demand)));
                        }
                    }
                    else {
                        newsources.push({
                            source,
                            items: [JSON.parse(JSON.stringify(demand))]
                        });
                    }
                });
            }
        })
        setAllDemands(newDemands);
        setSources(newsources);
    }, [displayData]);

    const flexRow = OptionsPanelFlexRow;
    if (props.noRender) {
        return <></>;
    }
    else if (!props.noWorker && running) {
        return <div style={{...flexRow, justifyContent: 'center', marginTop: '4em', minHeight: '50vh', alignItems: 'flex-start'}}>{globalContext.core.spin(t('spinners.demands'))}</div>;
    }
    else {
        return <React.Fragment>
        <FarmTable
            pageId='global_farm'
            sources={sources}
            />
        </React.Fragment>
    }

}