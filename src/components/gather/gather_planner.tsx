import React from "react"
import { GlobalContext } from '../../context/globalcontext';
import { Adventure, GatherPool } from "../../model/player";
import ItemDisplay from '../itemdisplay';
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { Table } from "semantic-ui-react";

export const GatherPlanner = () => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;

    if (!playerData?.player.character.events?.length || !playerData.player.character.events[0].content.gather_pools) return (<></>);

    const pools = playerData.player.character.events[0].content.gather_pools

    return (<>
    
        <GatherTable pool={pools[0]} />
    </>)
}

interface GatherTableProps {
    pool: GatherPool;
}

export const GatherTable = (props: GatherTableProps) => {

    const { pool } = props;
    
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { items } = globalContext.core;
    
    const hover_target = "gather_planner";

    return (<div>

        <Table>
            <Table.Header>
                {renderRowHeaders()}
            </Table.Header>
            <Table.Body>
                {pool.adventures.map((adv) => renderTableRow(adv))}
            </Table.Body>


        </Table>
        <ItemHoverStat targetGroup={hover_target} />
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
                <h4>{row.name}</h4>
                <div style={{fontSize:'0.8em'}}>
                    <i>{row.description}</i>
                </div>
            </Table.Cell>
            <Table.Cell>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                    gap: '1em',

                }}>
                {row.demands.map((demand) => {
                    const item = items.find(f => f.archetype_id === demand.archetype_id);

                    return <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5em', fontSize: '0.8em', fontStyle: 'italic'}}>
                                <ItemDisplay
                                    src={`${process.env.GATSBY_ASSETS_URL}${item?.imageUrl}`}
                                    size={24}
                                    targetGroup={hover_target}
                                    allItems={items}
                                    itemSymbol={item!.symbol}
                                    rarity={item!.rarity}
                                    maxRarity={item!.rarity}
                                />
                        </div>
                })}
                </div>

            </Table.Cell>
        </Table.Row>

    }


}