import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';

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
		{ key: 'noninportal', value: 'notinportal', text: 'Not in portal' },
	];

	const filterByPortal = (crew: IRosterCrew) => {
		if (portalFilter === 'inportal' && !crew.in_portal) return false;
		if (portalFilter === 'notinportal' && crew.in_portal) return false;
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
