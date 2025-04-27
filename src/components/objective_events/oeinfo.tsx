import React from "react";
import { ObjectiveArchetype, ObjectiveEvent } from "../../model/player";
import { GlobalContext } from "../../context/globalcontext";
import { getIconPath } from "../../utils/assets";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ShipHoverStat } from "../hovering/shiphoverstat";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { Table } from "semantic-ui-react";
import { ItemHoverStat } from "../hovering/itemhoverstat";



export interface OEInfoProps {
    data: ObjectiveEvent;
    objective_archetype: ObjectiveArchetype;
    showTitle?: boolean
}


export const OEInfo = (props: OEInfoProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { data, objective_archetype: oearch, showTitle } = props;
    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    return <div style={{ ...flexCol, width: '100%', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        {!!showTitle && <h2>{data.name}</h2>}
        <CrewHoverStat targetGroup={'oe_hover_crew'} modalPositioning={true} />
        <ShipHoverStat targetGroup={'oe_hover_ship'} modalPositioning={true} />
        <ItemHoverStat targetGroup={'oe_hover_item'} modalPositioning={true} />
        {[oearch].map(oearch => {
            const type = typeof oearch.target === 'object' && 'symbol' in oearch.target ? (oearch.target.symbol.includes("_crew") ? 'crew' : (oearch.target.symbol.includes("_ship") ? "ship" : "")) : "";
            const targetGroup = `oe_hover_${type}`;

            let img = '';
            if (oearch.target && !type) {
                img = `${process.env.GATSBY_ASSETS_URL}`;
                if ('symbol' in oearch.target && oearch.target.symbol.endsWith('_series')) {
                    img = `/media/series/${oearch.target.symbol.replace("_series", "")}.png`;
                }
                else if ('max_rarity' in oearch.target) {
                    img += oearch.target.imageUrlPortrait;
                }
                else if ("icon" in oearch.target && oearch.target.icon) {
                    if (typeof oearch.target.icon === 'string') {
                        img += oearch.target.icon.replace(/\//g, '_');
                    }
                    else if ("file" in oearch.target.icon) {
                        img += getIconPath(oearch.target.icon, true);
                    }
                }
            }

            return (
                <div key={`oe_stage_${oearch.id}`} className="ui segment" style={{ ...flexCol, alignItems: 'flex-start' }}>
                    <div style={{ ...flexRow }}>
                        {!!img && <img style={{ height: '48px' }} src={`${img}`} />}
                        {!!type && !!oearch.target && (
                            <AvatarView
                                mode={type}
                                item={oearch.target as any}
                                size={48}
                                targetGroup={targetGroup}
                            />
                        )}
                        <b>{oearch.target?.name}</b>
                    </div>
                    <Table striped>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell width={2}>
                                    {t('collections.milestone')}
                                </Table.HeaderCell>
                                <Table.HeaderCell width={1}>
                                    {t('ship.amount')}
                                </Table.HeaderCell>
                                <Table.HeaderCell width={5}>
                                    {t('base.rewards')}
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {oearch.milestones.map(mi => {
                                return (
                                    <Table.Row key={`mi_req_${oearch.id}_${mi.target_value}`}>
                                        <Table.Cell>
                                            <div style={{...flexRow, minHeight: '3em', fontWeight: 'bold'}}>
                                                {mi.requirement}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {mi.target_value}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div style={{ ...flexRow, flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '1em' }}>
                                                {mi.rewards.map((reward, idx) => {
                                                    let type = '';
                                                    if (reward.type === 1) type = 'crew';
                                                    else if (reward.type === 8) type = 'ship';
                                                    else type = 'item';
                                                    let src = `${process.env.GATSBY_ASSETS_URL}${getIconPath(reward.icon!, true)}`
                                                    if (!(reward as any).imageUrl) {
                                                        (reward as any).imageUrl = getIconPath(reward.icon!, true);
                                                    }
                                                    return (
                                                        <div
                                                            key={`oe_reward_${oearch.id}_${mi.target_value}+${reward.symbol}_${idx}`}
                                                            style={{
                                                                ...(mi.rewards.length === 1 ? flexRow : flexCol),
                                                                justifyContent: 'flex-start',
                                                                width: mi.rewards.length === 1 ? undefined : '10em',
                                                                //height: 'calc(48px + 0.5em + 3em)',
                                                                gap: '0.5em',
                                                                textAlign: 'center'
                                                            }}>
                                                            <AvatarView
                                                                src={src}
                                                                mode={type as any}
                                                                item={reward as any}
                                                                size={48}
                                                                partialItem={type === 'item'}
                                                                targetGroup={`oe_hover_${type}`}
                                                            />
                                                            <span>
                                                                {reward.name}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )
                            })}
                        </Table.Body>

                    </Table>
                </div>
            )
        })}
    </div>
}