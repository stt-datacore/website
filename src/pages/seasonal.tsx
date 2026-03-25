import React from 'react';
import { GlobalContext } from '../context/globalcontext';
import { Icon, Message } from 'semantic-ui-react';
import DataPageLayout from '../components/page/datapagelayout';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../components/stats/utils';
import { AvatarView } from '../components/item_presenters/avatarview';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { printConquest, printISM } from '../components/retrieval/context';
import { getIconPath } from '../utils/assets';
import { formatTime } from '../utils/itemutils';


export const SEASONAL_EVENT_ICON = 'items_consumables_seasonal_event_shop_icon.png';
export const CONQUEST_CURRENCY_ICON = 'currency_conquest_token_icon.png';


export interface SeasonalEventProps {

}

const SeasonalEvent = (props: SeasonalEventProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return (<DataPageLayout
        pageTitle={t('seasonal.seasonal_event_shop')}
        playerPromptType='recommend' demands={['seasonal_shop']}>
        <div>
            {/* <Message warning>
                <Message.Header>
                    {t('global.work_in_progress.title')}
                </Message.Header>
                <Message.Content>
                    {t('global.work_in_progress.heading')}
                </Message.Content>
            </Message> */}
            <SeasonalEventInfo />
        </div>
    </DataPageLayout>);
}

const SeasonalEventInfo = () => {
    const globalContext = React.useContext(GlobalContext);
    const { ephemeral } = globalContext.player;
    const { seasonal_shop } = globalContext.core;
    const { t } = globalContext.localized;

    const shop_items = React.useMemo(() => {
        if (ephemeral?.seasonalEventShop?.shop_items?.length) {
            return ephemeral.seasonalEventShop.shop_items;
        }
        return seasonal_shop?.shop_items || [];
    }, [ephemeral, seasonal_shop]);

    const shop_time = React.useMemo(() => {
        let edate = new Date(seasonal_shop.end_time);
        let ndate = new Date();
        let mremain = edate.getTime() - ndate.getTime();
        return formatTime(mremain, t);
    }, [seasonal_shop]);
    return (<div>
        <ItemHoverStat targetGroup='seasonal_item' />
        <CrewHoverStat targetGroup='seasonal_crew' />
        <h3>{shop_time}</h3>

        <div style={{...OptionsPanelFlexRow, justifyContent: 'flex-start', flexWrap: 'wrap', gap: '1.5em', alignItems: 'flex-start'}}>
            {shop_items?.map((item) => {
                const purchased = item.purchased > item.limit && item.limit;
                (item.reward as any).imageUrl = getIconPath(item.reward.icon!, true);
                let text = item.reward.name;
                if (item.reward.type === 1) {
                    let rcrew = globalContext.core.crew.find(f => f.symbol === item.reward.symbol);
                    if (rcrew) text = rcrew.name;
                }
                else if (item.reward.type === 8) {
                    let rship = globalContext.core.all_ships.find(f => f.symbol === item.reward.symbol);
                    if (rship) text = rship.name;
                }
                else {
                    let ritem = globalContext.core.items.find(f => f.symbol === item.reward.symbol);
                    if (ritem) text = ritem.name;
                }
                return (
                    <div
                        className='ui label'
                        key={`shop_item_${item.symbol}`}
                        style={{
                            ...OptionsPanelFlexColumn,
                            padding: '1em',
                            width: '13.5em',
                            height: '13.5em',
                            textAlign: 'center',
                            justifyContent: 'flex-start',

                            }}>
                        <AvatarView
                            reward={true}
                            style={{
                                opacity: item.is_locked || purchased ? 0.5 : 1
                            }}
                            crewBackground='rich'
                            mode={item.reward.type === 1 ? 'crew' : 'item'}
                            targetGroup={item.reward.type === 1 ? 'seasonal_crew' : 'seasonal_item'}
                            size={64}
                            item={item.reward as any}
                            />
                        {item.is_locked && (
                            <div style={{marginTop: '-24px', zIndex: 100}}>
                                <Icon name='lock' size='large' />
                            </div>
                        )}
                        {!item.is_locked && purchased && (
                            <div style={{marginTop: '-24px', zIndex: 100}}>
                                <Icon name='check' size='large' color='green' />
                            </div>
                        )}
                        <div style={{height: '3.5em', margin: '0.5em'}}>
                            {item.reward.quantity > 1 && <>{item.reward.quantity.toLocaleString()}</>} {text}
                            {item.is_locked && <div>{t('duration.n_days', { days: item.available_in_days })}</div>}
                        </div>
                        <div>
                            {printConquest(item.cost)}
                        </div>
                        {!!item.limit && !!ephemeral && (<div>
                            {item.purchased} / {item.limit}
                        </div>)}
                        {!ephemeral && (<div>
                            {item.limit}
                        </div>)}
                    </div>
                )
            })}
        </div>

    </div>)
}

export default SeasonalEvent;