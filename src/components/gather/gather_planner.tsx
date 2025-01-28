import React from "react";
import { GlobalContext } from '../../context/globalcontext';
import { Adventure } from "../../model/player";
import ItemDisplay from '../itemdisplay';
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { Button, Dropdown, Form, Table } from "semantic-ui-react";
import { EquipmentItem } from "../../model/equipment";
import { makeRecipeFromArchetypeCache } from "../../utils/equipment";
import { useStateWithStorage } from "../../utils/storage";
import ItemsTable from "../items/itemstable";
import { FarmSources, FarmTable } from "../items/farmtable";

const hover_target = "gather_planner";

export interface GatherPlannerProps {
    eventSymbol: string;
}

interface GatherItemCache {
    eventSymbol: string,
    phase: number,
    items: string[],
    adventures: Adventure[]
}

export const GatherPlanner = (props: GatherPlannerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData, ephemeral } = globalContext.player;
    const { eventSymbol } = props;
    const { items } = globalContext.core;

    const easternTime = new Date((new Date()).toLocaleString('en-US', { timeZone: 'America/New_York' }));
    let phaseChk = 0;
    if ((easternTime.getDay() === 6 && easternTime.getHours() >= 12) || easternTime.getDay() < 2) {
        phaseChk = 1;
    }

    const phaseIndex = phaseChk;

    const { t } = globalContext.localized;
    const event = ephemeral?.events?.find(f => f.symbol === eventSymbol)

    const [adventures, setAdventures] = React.useState<Adventure[]>([]);
    const [cachedItems, setCachedItems] = useStateWithStorage<GatherItemCache[]>(`events/gather_planner/item_cache`, [], { rememberForever: true })
    const [eventItems, setEventItems] = React.useState<EquipmentItem[]>([]);
    const [reset, setReset] = React.useState(false);
    const [allDemands, setAllDemands] = React.useState<EquipmentItem[]>([]);
    const [sources, setSources] = React.useState<FarmSources[]>([]);

    React.useEffect(() => {
        if (!ephemeral?.events?.length || !event?.content.gather_pools) return;
        let adv = event.content.gather_pools.map(p => p.adventures).flat();
        let newadv = [...adventures];
        adv.forEach((adv) => {
            if (!newadv.some(ad => ad.id === adv.id)) newadv.push(adv);
        });
        newadv = newadv.filter((f, idx) => newadv.findIndex(fi => fi.id === f.id) === idx)
        setAdventures(newadv);
    }, [ephemeral, cachedItems]);

    React.useEffect(() => {
        if (reset) {
            setCachedItems([]);
            setReset(false);
        }
    }, [reset]);

    React.useEffect(() => {
        if (adventures?.length && ephemeral?.archetype_cache?.archetypes?.length && playerData && items?.length) {
            let obj = getEventCache(true);
            let newadv = adventures.concat();
            let changed = false;
            if (obj) {
                for (let adv of obj.adventures) {
                    let f = newadv.find(fa => fa.id === adv.id);
                    if (!f) {
                        newadv.push(adv);
                        changed = true;
                    }
                }
            }

            newadv.sort((a, b) => compareAdventure(a, b));

            if (obj && changed) {
                setAdventures(newadv);
                obj.adventures = newadv.concat();
                setCachedItems([...cachedItems]);
                return;
            }

            let foundItems = adventures.map(ad => ad.demands.map(demand => {
                let item = items.find(f => f.id?.toString() === demand.archetype_id.toString());
                item = JSON.parse(JSON.stringify(item)) as EquipmentItem;
                item = mergeCache(item);

                makeRecipeFromArchetypeCache(
                    item,
                    globalContext.core.items,
                    playerData!.player.character.items,
                    ephemeral.archetype_cache);
                return item;
            })).flat();
            setEventItems(foundItems);
        }
    }, [adventures, playerData, items]);

    React.useEffect(() => {
        const newDemands = eventItems.map(me => me.demands?.map(de => ({...de.equipment!, needed: de.count, quantity: de.have }) as EquipmentItem) ?? []).flat();
        const newsources = [] as FarmSources[];

        newDemands.forEach((demand) => {
            if (demand.item_sources?.length) {
                demand.item_sources.forEach((source) => {
                    if (source.type === 1) return;
                    let csource = newsources.find(f => f.source.name === source.name);
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
    }, [eventItems]);

    if (!ephemeral?.events?.length || !event?.content.gather_pools) return (<></>);

    return (<>
        <GatherTable phaseIndex={phaseIndex} setReset={() => performReset()} eventSymbol={eventSymbol} adventures={adventures} items={eventItems} />

        <ItemsTable noWorker={true} itemTargetGroup={hover_target} data={allDemands} />

        <FarmTable
            pageId="gather_planner"
            hover_target={hover_target} sources={sources} />
    </>)

    function performReset() {
        setReset(true);
    }

    function getEventCache(create = false) {
        let obj = cachedItems.find(f => f.eventSymbol === eventSymbol && f.phase === phaseIndex);
        if (!obj && create) {
            obj = {
                eventSymbol,
                items: [],
                adventures,
                phase: phaseIndex
            }
            setCachedItems([...cachedItems.filter(f => f.phase === phaseIndex), obj]);
        }
        return obj;
    }

    function addItemToCache(item: EquipmentItem) {
        let obj = getEventCache()?.items;
        if (obj) {

            obj.push(item.symbol);
            setCachedItems([...cachedItems]);
        }
    }

    function findEventItem(symbol: string) {
        return getEventCache()?.items.find(f => f === symbol);
    }

    function mergeCache(item: EquipmentItem) {
        let eitem = findEventItem(item.symbol);
        if (!eitem) addItemToCache(item);
        else item = items.find(i => i.symbol === eitem)!;

        return item;
    }

    function compareAdventure(a: Adventure, b: Adventure) {
        return a.id - b.id;
    }


}

interface GatherTableProps {
    adventures: Adventure[];
    items: EquipmentItem[];
    eventSymbol: string,
    phaseIndex: number;
    setReset: () => void
}

const GatherTable = (props: GatherTableProps) => {

    const { adventures, items, setReset, phaseIndex } = props;

    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;

    if (!playerData) return <></>

    return (<div style={{ marginTop: "1em" }}>

        <div className="ui segment">
            <Button onClick={() => setReset()}>{t('global.clear_cache')}</Button>
        </div>

        <Table striped>
            <Table.Header>
                {renderRowHeaders()}
            </Table.Header>
            <Table.Body>
                {adventures.map((adv) => renderTableRow(adv))}
            </Table.Body>


        </Table>
        <ItemHoverStat targetGroup={hover_target} compact={false} />
    </div>)

    function renderRowHeaders() {

        return <Table.Row>
            <Table.HeaderCell>
                {t('global.adventure')}
            </Table.HeaderCell>
            <Table.HeaderCell>
                {t('items.current_demands')}
            </Table.HeaderCell>
        </Table.Row>
    }

    function renderTableRow(row: Adventure) {

        return <Table.Row key={row.name + row.id.toString()}>
            <Table.Cell>
                <h3>{row.name}</h3>
                <div style={{ fontSize: '1em' }}>
                    <i>{row.description}</i>
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1em'
                }}>
                    {row.demands.map((demand, idx) => {
                        let item = items.find(f => f.id?.toString() === demand.archetype_id.toString());
                        if (!item) return <div key={`empty_${idx}_event_demand`}></div>

                        return <div
                            key={item.symbol + "_event_demand"}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5em',
                                textAlign: 'center',
                                width: '10em',
                                fontSize: '0.8em',
                                fontStyle: 'italic'
                            }}>
                            <ItemTarget inputItem={item} targetGroup={hover_target}>
                                <ItemDisplay
                                    src={`${process.env.GATSBY_ASSETS_URL}${item?.imageUrl}`}
                                    size={48}
                                    allItems={items}
                                    itemSymbol={item!.symbol}
                                    rarity={item!.rarity}
                                    maxRarity={item!.rarity}
                                />
                            </ItemTarget>
                            {item!.name}
                        </div>
                    })}
                </div>

            </Table.Cell>
        </Table.Row>

    }

}


type GatherItemFilterProps = {
	itemFilter?: string;
	setItemFilter: (value: string) => void;
	altTitle?: string;
};

export const GatherItemFilter = (props: GatherItemFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const gatherFitlerOptions = [
		{ key: 'all_items', value: '', text: t('gather.item_filter.all_items')},
		{ key: 'single_source_items', value: 'single_source_items', text: t('gather.item_filter.single_source_items')},
		{ key: 'multi_source_items', value: 'multi_source_items', text: t('gather.item_filter.multi_source_items')},
		{ key: 'needed', value: 'needed', text: t('gather.item_filter.needed')},
		{ key: 'needed_mission', value: 'needed_mission', text: t('gather.item_filter.needed_mission')},
		{ key: 'single_source_mission', value: 'single_source_mission', text: t('gather.item_filter.single_source_mission')},
	];

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('gather.item_filter.all_items')}
				clearable
				selection
				multiple={false}
				options={gatherFitlerOptions}
				value={props.itemFilter}
				onChange={(e, { value }) => props.setItemFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};

