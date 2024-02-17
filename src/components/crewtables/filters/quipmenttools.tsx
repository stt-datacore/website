import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';

type QuipmentToolsFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
    slots?: number;
    setSlots: (value?: number) => void;
	altTitle?: string;
    hideForm?: boolean;
};

export const QuipmentToolsFilter = (props: QuipmentToolsFilterProps) => {
	const { hideForm, crewFilters, setCrewFilters, slots, setSlots } = props;

	const [slotFilter, setSlotFilter] = React.useState<string>(slots ? `slot${slots}` : '');

	const slotFilterOptions = [
		{ key: 'natural', value: '', text: 'Quip natural slots' },
		{ key: 'slot1', value: 'slot1', text: 'Quip at most 1 slot' },
		{ key: 'slot2', value: 'slot2', text: 'Quip at most 2 slots' },
		{ key: 'slot3', value: 'slot3', text: 'Quip at most 3 slots' },
		{ key: 'slot4', value: 'slot4', text: 'Quip all 4 slots' },
	];

	const filterCrew = (crew: IRosterCrew) => {
        return crew.have ? crew.immortal === -1 : true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'quipmenttools');
		if (index >= 0) crewFilters.splice(index, 1);
        crewFilters.push({ id: 'quipmenttools', filterTest: filterCrew });
        const fidx = slotFilterOptions.findIndex(option => option.value === slotFilter);
        if (fidx >= 1) {
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
		<Form.Field style={{marginBottom: "0.25em"}}>
			<Dropdown
				placeholder={props.altTitle ?? 'Set slots'}
				clearable
				selection
				multiple={false}
				options={slotFilterOptions}
				value={slotFilter}
				onChange={(e, { value }) => setSlotFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};
