import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';
import { GlobalContext } from '../../../context/globalcontext';
import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';

type CrewOwnershipFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const CrewOwnershipFilter = (props: CrewOwnershipFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crewFilters, setCrewFilters } = props;

	const [ownershipFilter, setOwnershipFilter] = React.useState('');

	const statusOptions = [
		{ key: 'none', value: '', text: t('crew_ownership.none') },
		{ key: 'owned', value: 'owned', text: t('crew_ownership.owned') },
		{ key: 'immortal', value: 'immortal', text: t('crew_ownership.immortal') },
		{ key: 'mortal', value: 'mortal', text: t('crew_ownership.mortal') },
		{ key: 'unowned', value: 'unowned', text: t('crew_ownership.unowned') },
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
				placeholder={t('hints.filter_by_progress')}
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
