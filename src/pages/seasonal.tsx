import React from 'react';
import { GlobalContext } from '../context/globalcontext';
import { Message } from 'semantic-ui-react';
import DataPageLayout from '../components/page/datapagelayout';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../components/stats/utils';
import { AvatarView } from '../components/item_presenters/avatarview';


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

    const shop = ephemeral?.seasonalEventShop ?? globalContext.core.seasonal_shop;

    if (!shop) return (<></>);

    return (<div>
        <ItemHoverStat targetGroup='seasonal_item' />

        <div style={{...OptionsPanelFlexRow, justifyContent: 'center', flexWrap: 'wrap', gap: '0.5em'}}>
            {shop.shop_items.map((item) => {

                return (
                    <div style={{...OptionsPanelFlexColumn, width: '10em', height: '10em', textAlign: 'center', justifyContent: 'flex-start'}}>
                        <AvatarView
                            mode='item'
                            targetGroup='seasonal_item'
                            size={64}
                            item={item.reward as any}
                            partialItem={true}
                            />
                        {item.reward.quantity} {item.name}
                    </div>
                )
            })}
        </div>

    </div>)
}

export default SeasonalEvent;