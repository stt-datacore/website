import React from 'react';
import { Form, Dropdown, DropdownItemProps } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';
import { GlobalContext } from '../../../context/globalcontext';

type ObtainedFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	altTitle?: string;
};

export const ObtainedFilter = (props: ObtainedFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
    const { crew } = globalContext.core;
	const { crewFilters, setCrewFilters } = props;

	const [obtainedFilter, setObtainedFilter] = React.useState<string[] | undefined>(undefined as string[] | undefined);

    const availObtained = [... new Set(crew.map(m => m.obtained)) ].sort();

	const portalFilterOptions = [] as DropdownItemProps[];

    availObtained.forEach((obtained) => {
        portalFilterOptions.push(
            { key: obtained, value: obtained, text: t(`obtained.long.${obtained.replace('HonorHall', 'Honor Hall')}`) || obtained },
        )
    });

	const filterByObtained = (crew: IRosterCrew) => {
        if (obtainedFilter?.length) {
            if (obtainedFilter.includes(crew.obtained)) return true;
            let parts = obtainedFilter.map(m => m.split('/'));
            let crewparts = crew.obtained.split("/");
            if (parts.some(p => p.some(pc => crewparts.includes(pc)))) return true;
            return false;
        }
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'obtained');
		if (index >= 0) crewFilters.splice(index, 1);
		if (obtainedFilter?.length) {
			crewFilters.push({ id: 'obtained', filterTest: filterByObtained });
		}
		setCrewFilters([...crewFilters]);
	}, [obtainedFilter]);

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('global.obtained')}
				clearable
				selection
				multiple={true}
				options={portalFilterOptions}
				value={obtainedFilter}
				onChange={(e, { value }) => setObtainedFilter(value as string[] | undefined)}
				closeOnChange
			/>
		</Form.Field>
	);
};
