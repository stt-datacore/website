import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';
import { GlobalContext } from '../../../context/globalcontext';

type CrewPortalFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	altTitle?: string;
};

export const CrewPortalFilter = (props: CrewPortalFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crewFilters, setCrewFilters } = props;

	const [portalFilter, setPortalFilter] = React.useState<string>('');

	const portalFilterOptions = [
		{ key: 'none', value: '', text: t('data_names.base.all_crew') },
		{ key: 'inportal', value: 'inportal', text: t('data_names.base.in_portal') },
		{ key: 'unique', value: 'unique', text: t('data_names.base.uniquely_retrievable') },
		{ key: 'notunique', value: 'notunique', text: t('data_names.base.not_uniquely_retrievable') },
		{ key: 'noninportal', value: 'notinportal', text: t('data_names.base.not_in_portal') },
		{ key: 'neverportal', value: 'neverportal', text: t('data_names.base.never_in_portal') },
	];

	const filterByPortal = (crew: IRosterCrew) => {
		if (['inportal', 'unique', 'notunique'].includes(portalFilter) && !crew.in_portal) return false;
		if (portalFilter === 'unique' && !crew.unique_polestar_combos?.length) return false;
		if (portalFilter === 'notunique' && !!crew.unique_polestar_combos?.length) return false;
		if (portalFilter === 'notinportal' && crew.in_portal) return false;
		if (portalFilter === 'neverportal') {
			if (!printPortalStatus(crew, t, true, false, false, false).includes(t('global.never'))) return false;
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
				placeholder={props.altTitle ?? t('hints.filter_by_portal_status')}
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
