import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { OptionsPanelFlexColumn } from "../stats/utils";
import { Message } from "semantic-ui-react";



export const BestShipFinder = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return (
        <div style={{...OptionsPanelFlexColumn, justifyContent: 'center', alignItems: 'flex-start'}}>
            <Message warning>
                <Message.Header>
                    {t('global.work_in_progress.title')}
                </Message.Header>
                <Message.Content>
                    {t('global.work_in_progress.heading')}
                </Message.Content>
            </Message>
        </div>
    );

}