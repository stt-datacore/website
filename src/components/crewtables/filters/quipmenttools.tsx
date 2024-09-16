import React from 'react';
import { Form, Dropdown, Checkbox, DropdownItemProps } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { ItemWithBonus } from '../../../utils/itemutils';
import { GlobalContext } from '../../../context/globalcontext';

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
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { immortalOnly, maxxed, quipment, hideForm, crewFilters, setCrewFilters, slots, setSlots, pstMode, setPstMode, powerMode, setPowerMode } = props;

	const [slotFilter, setSlotFilter] = React.useState<string>(slots ? `slot${slots}` : 'slot0');

	const slotFilterOptions = [
		{ key: 'slot0', value: 'slot0', text: t('quipment_dropdowns.slots.natural') },
		{ key: 'slot1', value: 'slot1', text: t('quipment_dropdowns.slots.one_slot') },
		{ key: 'slot2', value: 'slot2', text: t('quipment_dropdowns.slots.n_slots', { slots: "2" }) },
		{ key: 'slot3', value: 'slot3', text: t('quipment_dropdowns.slots.n_slots', { slots: "3" }) },
		{ key: 'slot4', value: 'slot4', text: t('quipment_dropdowns.slots.n_slots', { slots: "4" }) },
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
			text: t('quipment_dropdowns.mode.individual_skills')
		},
		{
			key: 'pst',
			value: true,
			text: t('quipment_dropdowns.mode.skill_order')
		},
		{
			key: 'besttwo',
			value: 2,
			text: t('quipment_dropdowns.mode.skill_combos')
		},
	] as DropdownItemProps[];

	const powerOptions = [
		{
			key: 'normal',
			value: 'all',
			text: t('quipment_dropdowns.calc_mode.core_and_proficiencies')
		},
		{
			key: 'base',
			value: 'core',
			text: t('quipment_dropdowns.calc_mode.core')
		},
		{
			key: 'prof',
			value: 'proficiency',
			text: t('quipment_dropdowns.calc_mode.proficiencies')
		}
	]

	return (
		<Form.Field style={{marginBottom: "1em", display: 'flex', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: "1em"}}>
			<Dropdown
				placeholder={props.altTitle ?? t('quipment_dropdowns.slot_label')}
				label={t('quipment_dropdowns.slot_label')}
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
