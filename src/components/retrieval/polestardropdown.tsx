import React from "react";
import { IPolestar } from "./model";
import { Dropdown, DropdownItemProps } from "semantic-ui-react";
import { getIconPath } from "../../utils/assets";
import { GlobalContext } from "../../context/globalcontext";



export interface PolestarDropdownProps {
    polestars: IPolestar[];
    selection?: string[];
    setSelection: (value?: string[]) => void;
    multiple?: boolean;
    fluid?: boolean;
    style?: React.CSSProperties;
}

export const PolestarDropdown = (props: PolestarDropdownProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, ITEM_ARCHETYPES } = globalContext.localized;
    const { polestars, selection, setSelection, multiple, fluid, style } = props;

    const options = [] as DropdownItemProps[];

    polestars.forEach((polestar) => {
        options.push({
            key: `polestar_${polestar.symbol}`,
            value: polestar.symbol,
            text: polestar.name,
            content: <div style={{display:'flex', gap: '0.5em', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
                <img src={getIconPath(polestar.icon)} style={{height: '24px'}} />
                <span>{ITEM_ARCHETYPES[polestar.symbol]?.name || polestar.name}</span>
            </div>
        });
    });

    return (
        <Dropdown
            placeholder={t('hints.filter_by_polestars')}
            style={style}
            multiple={multiple}
            clearable
            selection
            search
            options={options}
            value={selection}
            onChange={(e, { value }) => setSelection(value as string[] | undefined)}
            fluid={fluid}
           />
    )
}