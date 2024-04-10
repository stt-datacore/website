import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';

type CrewPortalFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	altTitle?: string;
};

export const CrewPortalFilter = (props: CrewPortalFilterProps) => {
	const { crewFilters, setCrewFilters } = props;

	const [portalFilter, setPortalFilter] = React.useState<string>('');

	const portalFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'inportal', value: 'inportal', text: 'In portal' },
		{ key: 'unique', value: 'unique', text: 'Uniquely Retrievable' },
		{ key: 'notunique', value: 'notunique', text: 'Not Uniquely Retrievable' },
		{ key: 'noninportal', value: 'notinportal', text: 'Not in portal' },
		{ key: 'neverportal', value: 'neverportal', text: 'Never in portal' },
	];

	const filterByPortal = (crew: IRosterCrew) => {
		if (['inportal', 'unique', 'notunique'].includes(portalFilter) && !crew.in_portal) return false;
		if (portalFilter === 'unique' && !crew.unique_polestar_combos?.length) return false;
		if (portalFilter === 'notunique' && !!crew.unique_polestar_combos?.length) return false;
		if (portalFilter === 'notinportal' && crew.in_portal) return false;
		if (portalFilter === 'neverportal') {
			if (!printPortalStatus(crew, true, false, false, false).includes("Never")) return false;
		}
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'portal');
		if (index >= 0) crewFilters.splice(index, 1);
		if (portalFilter !== '') {
			crewFilters.push({ id: 'portal', filterTest: filterByPortal });
		}
		setCrewFilters([...crewFilters]);
	}, [portalFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? 'Filter by portal status'}
				clearable
				selection
				multiple={false}
				options={portalFilterOptions}
				value={portalFilter}
				onChange={(e, { value }) => setPortalFilter(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
};
