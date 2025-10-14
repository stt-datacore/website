import React from 'react';
import { EquipmentItem } from "../../model/equipment"
import { Dropdown, DropdownItemProps, Form } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';


export interface ItemDropDownProps {
    fluid?: boolean;
    items: EquipmentItem[];
    icons?: boolean;
    selectedSymbols: string[];
    setSelectedSymbols: (value: string[]) => void;
    style?: React.CSSProperties;
}

export const ItemDropDown = (props: ItemDropDownProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { items, icons, selectedSymbols, setSelectedSymbols, fluid, style } = props;
    const [itemOptions, setItemOptions] = React.useState<DropdownItemProps[]>([]);

    React.useEffect(() => {
        const newOptions = [] as DropdownItemProps[];
        items.forEach((item) => {
            newOptions.push({
                key: `${item.symbol}_${item.rarity}`,
                value: `${item.symbol}`,
                text: `${item.rarity}* ${item.name}`,
                content: icons ? (<div style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
                    <img style={{height: '24px'}} src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}/>
                    <span>{`${item.rarity}* ${item.name}`}</span>
                </div>) : undefined
            });
        });
        setItemOptions(newOptions);
    }, [items]);

    return (
		<Form.Field>
			<Dropdown
                style={style}
				placeholder={t('hints.select_items')}
				clearable
				selection
                search
                fluid={fluid}
				multiple={true}
				options={itemOptions}
				value={selectedSymbols}
				onChange={(e, { value }) => setSelectedSymbols(value as string[])}
				closeOnChange
			/>
		</Form.Field>
	);

}