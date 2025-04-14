import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { Dropdown } from "semantic-ui-react";
import { useStateWithStorage } from "../../../utils/storage";
import { OptionsPanelFlexColumn } from "../utils";


export type EventDistributionType = 'event' | 'mega';


export interface DistributionPickerOpts {

}

export const EventDistributionPicker = (props: DistributionPickerOpts) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [type, setType] = useStateWithStorage<EventDistributionType>('stattrends/distribution_type', 'event');

    const choices = [
        { key: 'event', value: 'event', text: t('obtained.long.Event') },
        { key: 'mega', value: 'mega', text: t('obtained.long.Mega') },
    ];

    const flexCol = OptionsPanelFlexColumn;

    return (
        <div style={{...flexCol, alignItems: 'flex-start'}}>
        <Dropdown
            selection
            options={choices}
            value={type}
            onChange={(e, { value }) => {
                setType(value as any);
            }}
            />
        </div>
    )

}


export const EventDistributionGrid = () => {

    const globalContext = React.useContext(GlobalContext);





}