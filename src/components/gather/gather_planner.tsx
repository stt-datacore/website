import React from "react"
import { GlobalContext } from '../../context/globalcontext';
import { Adventure, GatherPool } from "../../model/player";
import ItemDisplay from '../itemdisplay';
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { Table } from "semantic-ui-react";
import { EquipmentIngredient, EquipmentItem } from "../../model/equipment";
import { calcItemDemands } from "../../utils/equipment";

export const GatherPlanner = () => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData, ephemeral } = globalContext.player;
    
    const { t } = globalContext.localized;
    
    if (!ephemeral?.events?.length || !ephemeral?.events[0].content.gather_pools) return (<></>);

    const pools = ephemeral.events[0].content.gather_pools

    return (<>
    
        <GatherTable pool={pools[0]} />
    </>)
}

interface GatherTableProps {
    pool: GatherPool;
}

const GatherTable = (props: GatherTableProps) => {

    const { pool } = props;
    
    const globalContext = React.useContext(GlobalContext);
    const playerData = globalContext.player.playerData!;
    const ephemeral = globalContext.player.ephemeral!;
    const { t } = globalContext.localized;
    const { items } = globalContext.core;
    
    const hover_target = "gather_planner";

    return (<div>

        <Table striped>
            <Table.Header>
                {renderRowHeaders()}
            </Table.Header>
            <Table.Body>
                {pool.adventures.map((adv) => renderTableRow(adv))}
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
                    return <div 
                            key={item.symbol + "_event_demand"}
                            style={{display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '0.5em', 
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

}