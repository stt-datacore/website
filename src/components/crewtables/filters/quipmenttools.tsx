import React from 'react';
import { Form, Dropdown, Checkbox, DropdownItemProps } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { ItemWithBonus } from '../../../utils/itemutils';

export type PowerMode = 'all' | 'core' | 'proficiency';

type QuipmentToolsFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	quipment: ItemWithBonus[];
	maxxed?: boolean;
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
    slots?: number;
    setSlots: (value?: number) => void;
	pstMode: boolean | 2 | 3;
    setPstMode: (value: boolean | 2 | 3) => void;
	powerMode: PowerMode;
	setPowerMode: (value: PowerMode) => void;
	altTitle?: string;
    hideForm?: boolean;
	immortalOnly?: boolean;
};

export const QuipmentToolsFilter = (props: QuipmentToolsFilterProps) => {
	const { immortalOnly, maxxed, quipment, hideForm, crewFilters, setCrewFilters, slots, setSlots, pstMode, setPstMode, powerMode, setPowerMode } = props;

	const [slotFilter, setSlotFilter] = React.useState<string>(slots ? `slot${slots}` : 'slot0');

	const slotFilterOptions = [
		{ key: 'slot0', value: 'slot0', text: 'Quip natural slots' },
		{ key: 'slot1', value: 'slot1', text: 'Quip 1 slot' },
		{ key: 'slot2', value: 'slot2', text: 'Quip 2 slots' },
		{ key: 'slot3', value: 'slot3', text: 'Quip 3 slots' },
		{ key: 'slot4', value: 'slot4', text: 'Quip 4 slots' },
	];

	const filterCrew = (crew: IRosterCrew) => {
		return true;
        // if (!immortalOnly || crew.immortal === undefined || crew.immortal !== 0) {
		// 	return true;
		// }
		// else {
		// 	return false;
		// }
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'quipmenttools');
		if (index >= 0) crewFilters.splice(index, 1);
        crewFilters.push({ id: 'quipmenttools', filterTest: filterCrew });
        const fidx = slotFilterOptions.findIndex(option => option.value === slotFilter);
        if (fidx >= 0) {
            setSlots(fidx);
        }
        else {
            setSlots(undefined);
        }
		setCrewFilters([...crewFilters]);
	}, [slotFilter]);

    if (hideForm) {
        return <></>;
    }

	const contentOptions = [
		{
			key: 'normal',
			value: false,
			text: 'Individual Skills'
		},
		{
			key: 'pst',
			value: true,
			text: 'Skill Order'
		},
		{
			key: 'besttwo',
			value: 2,
			text: 'Skill Combos'
		},
	] as DropdownItemProps[];

	const powerOptions = [
		{
			key: 'normal',
			value: 'all',
			text: 'Core and Proficiencies'
		},
		{
			key: 'base',
			value: 'core',
			text: 'Core'
		},
		{
			key: 'prof',
			value: 'proficiency',
			text: 'Proficiencies'
		}
	]

	return (
		<Form.Field style={{marginBottom: "1em", display: 'flex', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: "1em"}}>
			<Dropdown
				placeholder={props.altTitle ?? 'Set slots'}				
				selection
				multiple={false}
				options={slotFilterOptions}
				value={slotFilter}
				onChange={(e, { value }) => setSlotFilter(value as string)}
				closeOnChange
			/>
			<Dropdown
				placeholder={'Skill mode'}				
				selection
				multiple={false}
				options={contentOptions}
				value={pstMode}
				onChange={(e, { value }) => setPstMode(value as boolean | 2 | 3)}
				closeOnChange
			/>
			<Dropdown
				placeholder={'Power mode'}
				selection
				multiple={false}
				options={powerOptions}
				value={powerMode}
				onChange={(e, { value }) => setPowerMode(value as PowerMode)}
				closeOnChange
			/>
				
		</Form.Field>
	);
};
