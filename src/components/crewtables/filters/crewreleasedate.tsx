import React from 'react';
import { Form, Dropdown, DropdownItemProps } from 'semantic-ui-react';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { printPortalStatus } from '../../../utils/crewutils';
import { GlobalContext } from '../../../context/globalcontext';
import { TimeframeFilter, timeframeToWeeks } from '../../../pages/events';

type ReleaseDateFilterProps = {
	pageId: string;
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
	altTitle?: string;
};

export const ReleaseDateFilter = (props: ReleaseDateFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
    const { crew } = globalContext.core;
	const { crewFilters, setCrewFilters } = props;

	const [releaseDateFilter, setReleaseDateFilter] = React.useState<string | undefined>(undefined as string | undefined);

    const availObtained = [... new Set(crew.map(m => m.obtained)) ].sort();

	const portalFilterOptions = [] as DropdownItemProps[];

    const minDate = React.useMemo(() => {
        let days = timeframeToWeeks(releaseDateFilter);
        if (!days) return undefined;
        days *= 7;
        let d = new Date();
        d.setDate(d.getDate() - days);
        return d;
    }, [releaseDateFilter]);

    availObtained.forEach((obtained) => {
        portalFilterOptions.push(
            { key: obtained, value: obtained, text: t(`obtained.long.${obtained.replace('HonorHall', 'Honor Hall')}`) || obtained },
        )
    });

	const filterByTimeframe = (crew: IRosterCrew) => {
        if (releaseDateFilter?.length && minDate) {
            if (typeof crew.date_added === 'string') crew.date_added = new Date(crew.date_added);
            if (crew.date_added.getTime() < minDate.getTime()) return false;
        }
		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'timeframe');
		if (index >= 0) crewFilters.splice(index, 1);
		if (releaseDateFilter?.length) {
			crewFilters.push({ id: 'timeframe', filterTest: filterByTimeframe });
		}
		setCrewFilters([...crewFilters]);
	}, [releaseDateFilter]);

	return (
		<Form.Field>
            <TimeframeFilter
                setTimeframe={setReleaseDateFilter}
                timeframe={releaseDateFilter}
                />
		</Form.Field>
	);

};
