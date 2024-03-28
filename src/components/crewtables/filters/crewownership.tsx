import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';

type CrewOwnershipFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewOwnershipFilter = (props: CrewOwnershipFilterProps) => {
	const { crewFilters, setCrewFilters } = props;

	const [ownershipFilter, setOwnershipFilter] = React.useState('');

	const statusOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'owned', value: 'owned', text: 'Only show owned crew' },
		{ key: 'immortal', value: 'immortal', text: 'Only show immortalized crew' },
		{ key: 'mortal', value: 'mortal', text: 'Only show owned non-immortals' },
		{ key: 'unowned', value: 'unowned', text: 'Only show unowned crew' },
	];

	const filterByOwnership = (crew: IRosterCrew) => {
		if (ownershipFilter === 'owned' && !crew.have) return false;
		if (ownershipFilter === 'unowned' && crew.have) return false;
		if (ownershipFilter === 'immortal' && !crew.any_immortal) return false;
		if (ownershipFilter === 'mortal' && (!crew.have || crew.any_immortal)) return false;
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'ownership');
		if (index >= 0) crewFilters.splice(index, 1);
		if (ownershipFilter !== '') {
			crewFilters.push({ id: 'ownership', filterTest: filterByOwnership });
		}
		setCrewFilters([...crewFilters]);
	}, [ownershipFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder='Filter by progress'
				clearable
				selection
				options={statusOptions}
				value={ownershipFilter}
				onChange={(e, { value }) => setOwnershipFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};
