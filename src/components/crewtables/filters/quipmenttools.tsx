import React from 'react';
import { Form, Dropdown, Checkbox } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';
import { BuffStatTable } from '../../../utils/voyageutils';
import { calcQLots } from '../../../utils/equipment';
import { ItemWithBonus } from '../../../utils/itemutils';
import { PlayerBuffMode } from '../../../model/player';

type QuipmentToolsFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	quipment: ItemWithBonus[];
	maxxed?: boolean;
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
    slots?: number;
    setSlots: (value?: number) => void;
	pstMode: boolean;
    setPstMode: (value: boolean) => void;
	altTitle?: string;
    hideForm?: boolean;
	immortalOnly?: boolean;
};

export const QuipmentToolsFilter = (props: QuipmentToolsFilterProps) => {
	const { immortalOnly, maxxed, quipment, hideForm, crewFilters, setCrewFilters, slots, setSlots, pstMode, setPstMode } = props;

	const [slotFilter, setSlotFilter] = React.useState<string>(slots ? `slot${slots}` : 'slot0');

	const slotFilterOptions = [
		{ key: 'slot0', value: 'slot0', text: 'Quip natural slots' },
		{ key: 'slot1', value: 'slot1', text: 'Quip 1 slot' },
		{ key: 'slot2', value: 'slot2', text: 'Quip 2 slots' },
		{ key: 'slot3', value: 'slot3', text: 'Quip 3 slots' },
		{ key: 'slot4', value: 'slot4', text: 'Quip 4 slots' },
	];

	const filterCrew = (crew: IRosterCrew) => {
        if (!immortalOnly || crew.immortal === undefined || crew.immortal < 0) {
			//calcQLots(crew, quipment, buffConfig, maxxed, slots);
			return true;
		}
		else {
			return false;
		}
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
			<Checkbox checked={pstMode} onChange={(e, { checked }) => setPstMode(!!checked)}
				label={'Skill Order Mode'} />
				
		</Form.Field>
	);
};
