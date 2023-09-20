import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';

type CrewStatusFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewStatusFilter = (props: CrewStatusFilterProps) => {
	const { crewFilters, setCrewFilters } = props;

	const [statusFilter, setStatusFilter] = React.useState('');

	const statusOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' },
		{ key: 'frozen', value: 'frozen', text: 'Only show frozen crew' },
		{ key: 'frozen_dupes', value: 'frozen_dupes', text: 'Only show frozen duplicate crew' },
		{ key: 'favorites', value: 'favorites', text: 'Only show favorite crew' },
		{ key: 'idle', value: 'idle', text: 'Only show idle crew' }
	];

	const filterByStatus = (crew: IRosterCrew) => {
		if (statusFilter === 'idle' && (crew.immortal > 0 || crew.active_status > 0)) return false;
		if (statusFilter === 'thawed' && crew.immortal > 0) return false;
		if (statusFilter === 'frozen' && crew.immortal <= 0) return false;
		if (statusFilter === 'frozen_dupes' && crew.immortal <= 1) return false;
		if (statusFilter === 'favorites' && !crew.favorite) return false;
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'status');
		if (index >= 0) crewFilters.splice(index, 1);
		if (statusFilter !== '') {
			crewFilters.push({ id: 'status', filterTest: filterByStatus });
		}
		setCrewFilters([...crewFilters]);
	}, [statusFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder='Filter by status'
				clearable
				selection
				options={statusOptions}
				value={statusFilter}
				onChange={(e, { value }) => setStatusFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};
