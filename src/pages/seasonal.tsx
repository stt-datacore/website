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


export const SEASONAL_EVENT_ICON = 'items_consumables_seasonal_event_shop_icon.png';
export const CONQUEST_CURRENCY_ICON = 'currency_conquest_token_icon.png';


export interface SeasonalEventProps {

}

const SeasonalEvent = (props: SeasonalEventProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { ephemeral } = globalContext.player;
    const { t } = globalContext.localized;

    return (<DataPageLayout
        pageTitle={t('seasonal.seasonal_event_shop')}
        playerPromptType='recommend' demands={['seasonal_shop']}>
        <div>
            <Message warning>
                <Message.Header>
                    {t('global.work_in_progress.title')}
                </Message.Header>
                <Message.Content>
                    {t('global.work_in_progress.heading')}
                </Message.Content>
            </Message>
            <SeasonalEventInfo />
        </div>
    </DataPageLayout>);
}

const SeasonalEventInfo = () => {
    const globalContext = React.useContext(GlobalContext);
    const { ephemeral } = globalContext.player;

    let shop_items = ephemeral?.seasonalEventShop?.shop_items || globalContext.core?.seasonal_shop?.shop_items || [];

    if (!shop_items?.length) return (<></>);

    return (<div>
        <ItemHoverStat targetGroup='seasonal_item' />
        <CrewHoverStat targetGroup='seasonal_crew' />

        <div style={{...OptionsPanelFlexRow, justifyContent: 'center', flexWrap: 'wrap', gap: '1.5em'}}>
            {shop_items?.map((item) => {
                let icon = getIconPath(item.reward.icon!)
                return (
                    <div
                        key={`shop_item_${item.symbol}`}
                        style={{
                            ...OptionsPanelFlexColumn,
                            width: '10em',
                            height: '10em',
                            textAlign: 'center',
                            justifyContent: 'flex-start',
                            opacity: item.is_locked || item.purchased >= item.limit ? 0.5 : 1
                            }}>
                        <AvatarView
                            mode={item.reward.type === 1 ? 'crew' : 'item'}
                            targetGroup={item.reward.type === 1 ? 'seasonal_crew' : 'seasonal_item'}
                            size={64}
                            src={icon}
                            item={item.reward as any}
                            />
                        {item.is_locked && (
                            <div style={{marginTop: '-24px', zIndex: 100}}>
                                <Icon name='lock' size='large' />
                            </div>
                        )}
                        {!item.is_locked && item.purchased >= item.limit && (
                            <div style={{marginTop: '-24px', zIndex: 100}}>
                                <Icon name='check' size='large' color='green' />
                            </div>
                        )}

                        <div style={{height: '3.5em'}}>
                        {item.reward.quantity} {item.name}
                        </div>
                        {printConquest(item.cost)}
                    </div>
                )
            })}
        </div>

    </div>)
}

export default SeasonalEvent;