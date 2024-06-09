import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { GlobalContext } from '../../../context/globalcontext';

type CrewStatusFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewStatusFilter = (props: CrewStatusFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;	
	const { crewFilters, setCrewFilters } = props;

	const [statusFilter, setStatusFilter] = React.useState('');

	const statusOptions = [
		{ key: 'none', value: '', text: t('options.crew_status.none') },
		{ key: 'thawed', value: 'thawed', text: t('options.crew_status.thawed') },
		{ key: 'frozen', value: 'frozen', text: t('options.crew_status.frozen') },
		{ key: 'frozen_dupes', value: 'frozen_dupes', text: t('options.crew_status.frozen_dupes') },
		{ key: 'favorites', value: 'favorites', text: t('options.crew_status.favorites') },
		{ key: 'idle', value: 'idle', text: t('options.crew_status.idle') },
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
				placeholder={t('hints.filter_by_status')}
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
