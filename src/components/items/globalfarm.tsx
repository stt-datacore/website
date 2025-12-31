import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentItem } from "../../model/equipment";
import { EquipmentWorkerResults } from "../../model/worker";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { FarmSources, FarmTable } from "./farmtable";
import { ItemsFilterContext } from "./filters";
import { CrewMultiPicker } from "../base/crewmultiselect";
import { useStateWithStorage } from "../../utils/storage";
import { CompletionState, PlayerCrew } from "../../model/player";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { getEventData } from "../../utils/events";
import { Button } from "semantic-ui-react";

interface GlobalFarmProps {
    pageId?: string;
    items: EquipmentItem[];
    noRender?: boolean;
    noWorker?: boolean;
}

export const GlobalFarm = (props: GlobalFarmProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { t } = globalContext.localized;
    const { items: coreItems, pageId } = props;
    const { ephemeral, playerData, calculatedDemands, setCalculatedDemands } = globalContext.player;
    const [prefiteredData, setPrefilteredData] = React.useState<(EquipmentItem | EquipmentItem)[]>(calculatedDemands ?? []);

    const [crewFilter, setCrewFilter] = useStateWithStorage<number[]>(`global_farm/crewFilter`, []);

    const { cancel, runWorker, running } = workerContext;
    const filterContext = React.useContext(ItemsFilterContext);
    const { available, filterItems, rarityFilter, itemTypeFilter, hideUnneeded, showUnownedNeeded, configureFilters, itemSourceFilter, masteryFilter } = filterContext;

    const rosterCrew = React.useMemo(() => {
        if (playerData) {
            return playerData.player.character.crew.filter(f => {
                if (calculatedDemands) {
                    return calculatedDemands.some(cd => cd.demandCrew?.includes(f.symbol));
                }
                return f.level !== 100 || f.equipment.length !== 4;
            });
        }
        else {
            return globalCrewToPlayerCrew();
        }
    }, [playerData]);

    const eventData = React.useMemo(() => {
        let gameEvent = ephemeral?.events?.find(e => e.seconds_to_start === 0 && e.seconds_to_end > 0)
        if (gameEvent) {
            return getEventData(gameEvent, globalContext.core.crew);
        }
        return undefined;
    }, [ephemeral]);

    React.useEffect(() => {
        function filterDemands(items: EquipmentItem[]) {
            return items
                .map(item => {
                    item.demands = item.demands?.filter(d => !d.primary);
                    return item;
                })
                .filter(f => f.needed && f.needed > 0 && f?.item_sources?.length)
        }
        if (calculatedDemands?.length && !crewFilter?.length) {
            setPrefilteredData(filterDemands(calculatedDemands as EquipmentItem[]));
            return;
        }
        if (!playerData || !!props.noWorker) return;
        //if (running) cancel();
        if (props.noRender) return;
        setTimeout(() => {
            runWorker(
                "equipmentWorker", {
                playerData,
                addNeeded: true,
                crewFilter
            },
                (data: { data: { result: EquipmentWorkerResults } }) => {
                    if (playerData && !crewFilter?.length) setCalculatedDemands(data.data.result.items as EquipmentItem[]);
                    setPrefilteredData(filterDemands(data.data.result.items as EquipmentItem[]));
                },
                true
            )
        }, 500);
    }, [playerData, coreItems, crewFilter, props.noRender]);

    React.useEffect(() => {
        if (crewFilter?.length && rosterCrew?.length) {
            let cfnew = rosterCrew.filter(f => crewFilter.includes(f.id)).map(c => c.id);
            if (cfnew.length === crewFilter.length) return;
            setCrewFilter(cfnew);
        }
    }, [rosterCrew, crewFilter]);

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
    }, [coreItems, prefiteredData, available, rarityFilter, itemTypeFilter, showUnownedNeeded, itemSourceFilter, masteryFilter, hideUnneeded]);

    const sources = React.useMemo(() => {
        const demands = (displayData as EquipmentItem[]); //.map(me => me.demands?.map(de => ({...de.equipment!, needed: de.count, quantity: de.have }) as EquipmentItem) ?? []).flat();
        const newsources = [] as FarmSources[];
        demands.forEach((demand) => {
            if (demand.item_sources?.length) {
                demand.item_sources.forEach((source) => {
                    let csource = newsources.find(f => f.source.name === source.name && f.source.mastery === source.mastery);
                    if (csource) {
                        const fitem = csource.items.find(f => f.symbol === demand.symbol);
                        if (fitem) {
                            return;
                        }
                        else {
                            csource.items.push(structuredClone(demand));
                        }
                    }
                    else {
                        newsources.push({
                            source,
                            items: [structuredClone(demand)]
                        });
                    }
                });
            }
        });
        return newsources;
    }, [displayData]);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    if (props.noRender) {
        return <></>;
    }
    else if (!props.noWorker && running) {
        return (
            <>
                <CrewMultiPicker
                    renderExtraContent={drawExtraContent}
                    selectionPosition="after"
                    pageId={pageId || 'items/global_farm'}
                    selectedCrew={crewFilter}
                    updateSelected={setCrewFilter}
                    rosterCrew={rosterCrew}
                />

                <div style={{ ...flexRow, justifyContent: 'center', marginTop: '4em', minHeight: '50vh', alignItems: 'flex-start' }}>
                    {globalContext.core.spin(t('spinners.demands'))}

                </div>
            </>
        );
    }
    else {
        return <React.Fragment>
            <CrewHoverStat targetGroup="global_farm_crew" />
            <CrewMultiPicker
                renderExtraContent={drawExtraContent}
                selectionPosition="after"
                pageId='items/global_farm'
                selectedCrew={crewFilter}
                updateSelected={setCrewFilter}
                rosterCrew={rosterCrew}
            />
            <ItemHoverStat targetGroup="global_farm" />
            <FarmTable
                eventData={eventData}
                renderExpanded={crewFilter?.length ? undefined : renderExpanded}
                showOwned={true}
                showFarmable={true}
                hoverTarget="global_farm"
                pageId='global_farm'
                sources={sources}
                textStyle={{ fontStyle: 'normal', fontSize: '1em' }}
            />
        </React.Fragment>
    }

    function drawExtraContent() {
        const selFav = () => {
            let favs = rosterCrew.filter(f => f.favorite && !f.immortal).map(m => m.id) ?? [];
            let cf = [... new Set(crewFilter.concat(favs))];
            setCrewFilter(cf);
        }
        return (
            <div style={{margin:'0 0 1em 0'}}>
                <Button onClick={selFav}>{t('items.quick_select.favorites')}</Button>
            </div>
        )
    }

    function renderExpanded(item: FarmSources) {
        const crewSymbols = [... new Set(item.items.map(i => i.demandCrew ?? []).flat())]
        const workCrew = rosterCrew
            .filter(rc => crewSymbols.includes(rc.symbol))
            .sort((a, b) => b.max_rarity - a.max_rarity || b.rarity - a.rarity || b.level - a.level || b.equipment.length - a.equipment.length || a.name.localeCompare(b.name));

        return (
            <div className="ui segment">
                <div style={{ ...flexRow, flexWrap: 'wrap', overflowY: 'auto', maxHeight: '30em' }}>
                    {workCrew.map((crew) => {
                        return <div
                            style={{ ...flexCol, width: '8em', height: '8em', cursor: 'pointer', textAlign: 'center', justifyContent: 'flex-start' }}
                            onClick={() => {
                                if (!crewFilter.includes(crew.id)) {
                                    setCrewFilter([...crewFilter, crew.id]);
                                }
                                else {
                                    setCrewFilter(crewFilter.filter(cf => cf != crew.id));
                                }
                            }}
                        >
                            <AvatarView
                                mode='crew'
                                item={crew}
                                id={crew.id}
                                size={64}
                                targetGroup="global_farm_crew"
                            />
                            {crew.name}
                        </div>
                    })}
                </div>
            </div>)
    }

    function globalCrewToPlayerCrew() {
        return globalContext.core.crew.map(c => ({ ...c, id: c.archetype_id, immortal: CompletionState.DisplayAsImmortalStatic }) as PlayerCrew);
    }

}