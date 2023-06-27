import React from "react";
import { Form, Dropdown } from "semantic-ui-react";

type AbilityUsesProps = {    
    uses: number[];
    zeroText?: string;
	selectedUses: number[];
	setSelectedUses: (rarityFilter: number[]) => void;
	altTitle?: string;
};

export const AbilityUses = (props: AbilityUsesProps) => {
	const zeroText = props.zeroText ?? "Unlimited";
    const abilityUsesOptions = props.uses.map((u) => {
        return {
            key: u ? `${u}x` : zeroText,
            text: u ? `${u}x` : zeroText,
            value: u
        }
    })
    
    // [
	// 	{ key: '1*', value: 1, text: '1* Common' },
	// 	{ key: '2*', value: 2, text: '2* Uncommon' },
	// 	{ key: '3*', value: 3, text: '3* Rare' },
	// 	{ key: '4*', value: 4, text: '4* Super Rare' },
	// 	{ key: '5*', value: 5, text: '5* Legendary' }
	// ];

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? 'Battle uses'} 
				clearable
				multiple
				selection
				options={abilityUsesOptions}
				value={props.selectedUses}
				onChange={(e, { value }) => props.setSelectedUses(value as number[])}
				closeOnChange
			/>
		</Form.Field>
	);
};