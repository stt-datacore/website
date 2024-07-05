import React from "react"
import { GlobalContext } from '../../context/globalcontext';
import { Adventure, GatherPool } from "../../model/player";
import ItemDisplay from '../itemdisplay';
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { Table } from "semantic-ui-react";
import { EquipmentIngredient, EquipmentItem } from "../../model/equipment";
import { calcItemDemands } from "../../utils/equipment";
import { useStateWithStorage } from "../../utils/storage";

export interface GatherPlannerProps {
    eventSymbol: string;
}

export const GatherPlanner = (props: GatherPlannerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData, ephemeral } = globalContext.player;
    const { eventSymbol: eventId } = props;
    
    const { t } = globalContext.localized;
    const event = ephemeral?.events?.find(f => f.symbol === eventId)

    if (!ephemeral?.events?.length || !event?.content.gather_pools) return (<></>);

    return (<>
    
        <GatherTable eventId={ephemeral.events[0].id} pool={event.content.gather_pools[0]} />
    </>)
}

interface GatherTableProps {
    pool: GatherPool;
    eventId: number;
}

interface GatherItemCache {
    eventId: number,
    items: EquipmentItem[],
    adventures: Adventure[]
}

const GatherTable = (props: GatherTableProps) => {

    const { pool, eventId } = props;
    
    const globalContext = React.useContext(GlobalContext);
    const playerData = globalContext.player.playerData!;
    const ephemeral = globalContext.player.ephemeral!;
    const { t } = globalContext.localized;
    const { items } = globalContext.core;

    const [adventures, setAdventures] = React.useState<Adventure[]>(pool.adventures);
    const [cachedItems, setCachedItems] = useStateWithStorage<GatherItemCache[]>(`events/gather_planner/item_cache`, [], { rememberForever: true })

    const hover_target = "gather_planner";

    React.useEffect(() => {
        if (pool && ephemeral?.archetype_cache && playerData && items?.length) {
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
            }
        }
    }, [pool, ephemeral, playerData, items, cachedItems])

    return (<div style={{marginTop: "1em"}}>

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
                <div style={{fontSize:'1em'}}>
                    <i>{row.description}</i>
                </div>
            </Table.Cell>
            <Table.Cell>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1em',

                }}>
                {row.demands.map((demand, idx) => {
                    let item = items.find(f => f.id?.toString() === demand.archetype_id.toString());
                    if (!item) return <div key={`empty_${idx}_event_demand`}></div>
                    item = JSON.parse(JSON.stringify(item)) as EquipmentItem;
                    makeRecipe(item);
                    item = mergeCache(item);       
                    return <div 
                            key={item.symbol + "_event_demand"}
                            style={{display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '0.5em', 
                            textAlign: 'center',
                            width: '10em',
                            fontSize: '0.8em', 
                            fontStyle: 'italic'}}>
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

    function makeRecipe(item: EquipmentItem) {
        let aitem = ephemeral.archetype_cache?.archetypes.find(f => f.id.toString() === item.id?.toString());
        if (!aitem?.recipe) return;
        item.recipe = { 
            incomplete: false,
            craftCost: 0,
            list: []
        }
        let recipe_items = globalContext.core.items.filter(f => aitem.recipe?.demands?.some(d => d.archetype_id?.toString() === f.id?.toString()))
        if (recipe_items?.length) {
            let newrecipe = recipe_items.map((m, idx) => ({
                count: aitem.recipe?.demands[idx].count,
                factionOnly: false,
                symbol: m.symbol
            } as EquipmentIngredient));
            item.recipe.list = item.recipe.list.concat(newrecipe);
        }
        item.demands = calcItemDemands(item, globalContext.core.items, playerData.player.character.items);
    } 

    function getEventCache(create = false) {
        let obj = cachedItems.find(f => f.eventId === eventId);
        if (!obj && create) {
            obj = {
                eventId,
                items: [],
                adventures: pool.adventures
            }
            setCachedItems([...cachedItems, obj]);            
        }        
        return obj;
    }

    function addItemToCache(item: EquipmentItem) {
        let obj = getEventCache()?.items;
        if (obj) {
            obj.push(item);
            setCachedItems([...cachedItems]);
        }
    }

    function findEventItem(symbol: string) {
        return getEventCache()?.items.find(f => f.symbol === symbol);
    }

    function mergeCache(item: EquipmentItem) {
        if (!item.demands) return item;
        let eitem = findEventItem(item.symbol);
        if (eitem) {
            if (eitem.demands?.every(d => item.demands?.some(d2 => d2.symbol === d.symbol))) {
                return { ...eitem, ... item }
            }
        }
        addItemToCache(item);
        return item;
    }

    function compareAdventure(a: Adventure, b: Adventure) {    
        return a.id - b.id;
    }

}