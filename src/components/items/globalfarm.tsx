import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { EquipmentWorkerResults } from "../../model/worker";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { OptionsPanelFlexRow } from "../stats/utils";
import { FarmSources, FarmTable } from "./farmtable";
import { ItemsFilterContext } from "./filters";
import { CrewMultiPicker } from "../base/crewmultiselect";
import { useStateWithStorage } from "../../utils/storage";
import { CompletionState, PlayerCrew } from "../../model/player";


interface GlobalFarmProps {
    items: EquipmentItem[];
    noRender?: boolean;
    noWorker?: boolean;
}

export const GlobalFarm = (props: GlobalFarmProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { t } = globalContext.localized;
    const { items: coreItems } = props;
    const { playerData, calculatedDemands, setCalculatedDemands } = globalContext.player;
    const [prefiteredData, setPrefilteredData] = React.useState<(EquipmentItem | EquipmentCommon)[]>(calculatedDemands ?? []);

    const [crewFilter, setCrewFilter] = useStateWithStorage<number[]>(`global_farm/crewFilter`, []);

    const { cancel, runWorker, running } = workerContext;
    const filterContext = React.useContext(ItemsFilterContext);
    const { available, filterItems, rarityFilter, itemTypeFilter, showUnownedNeeded, configureFilters } = filterContext;

    const rosterCrew = React.useMemo(() => {
        if (playerData) {
            return playerData.player.character.crew.filter(f => f.level !== 100 || f.equipment.length !== 4);
        }
        else {
            return globalContext.core.crew.map(c => ({...c, id: c.archetype_id, immortal: CompletionState.DisplayAsImmortalStatic }) as PlayerCrew)
        }
    }, [playerData]);

    React.useEffect(() => {
        function filterDemands(items: EquipmentItem[]) {
            return items.filter(f => f.needed && f.needed > 0 && f?.item_sources?.length)
        }
        if (calculatedDemands && !crewFilter?.length) {
            setPrefilteredData(filterDemands(calculatedDemands as EquipmentItem[]));
            return;
        }
        if (!playerData || !!props.noWorker) return;
        if (running) cancel();

        setTimeout(() => {
            runWorker(
                "equipmentWorker", {
                    playerData,
                    items: coreItems,
                    addNeeded: true,
                    crewFilter
                },
                (data: { data: { result: EquipmentWorkerResults } }) => {
                    if (playerData && !crewFilter?.length) setCalculatedDemands(data.data.result.items as EquipmentItem[]);
                    setPrefilteredData(filterDemands(data.data.result.items as EquipmentItem[]));
                }
            )
        }, 500);
    }, [playerData, coreItems, crewFilter]);

    React.useEffect(() => {
        if (available && !props.noRender) {
            configureFilters(prefiteredData);
        }
    }, [prefiteredData, available, props.noRender]);

    const displayData = React.useMemo(() => {
        if (available) {
            return filterItems(prefiteredData ?? props.items ?? globalContext.core.items);
        }
        else {
            return prefiteredData ?? props.items ?? globalContext.core.items;
        }
    }, [coreItems, prefiteredData, available, rarityFilter, itemTypeFilter, showUnownedNeeded]);

    const sources = React.useMemo(() => {
        const demands = (displayData as EquipmentItem[]); //.map(me => me.demands?.map(de => ({...de.equipment!, needed: de.count, quantity: de.have }) as EquipmentItem) ?? []).flat();
        const newsources = [] as FarmSources[];
        demands.forEach((demand) => {
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
        });
        return newsources;
    }, [displayData]);

    const flexRow = OptionsPanelFlexRow;

    if (props.noRender) {
        return <></>;
    }
    else if (!props.noWorker && running) {
        return (
            <>
                <CrewMultiPicker
                    pageId='items/global_farm'
                    selectedCrew={crewFilter}
                    updateSelected={setCrewFilter}
                    rosterCrew={rosterCrew}
                    />

                <div style={{...flexRow, justifyContent: 'center', marginTop: '4em', minHeight: '50vh', alignItems: 'flex-start'}}>
                    {globalContext.core.spin(t('spinners.demands'))}

                </div>
            </>
        );
    }
    else {
        return <React.Fragment>
            <CrewMultiPicker
                pageId='items/global_farm'
                selectedCrew={crewFilter}
                updateSelected={setCrewFilter}
                rosterCrew={rosterCrew}
                />
            <ItemHoverStat targetGroup="global_farm" />
            <FarmTable
                showOwned={true}
                showFarmable={true}
                hoverTarget="global_farm"
                pageId='global_farm'
                sources={sources}
                textStyle={{fontStyle: 'normal', fontSize: '1em'}}
                />
            </React.Fragment>
    }

}