import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';

type AvailabilityCrewFilterProps = {
	value: string;
	setValue: (availabilityFilter: string) => void;
	rosterCrew: PlayerCrew[];
};

export const AvailabilityCrewFilter = (props: AvailabilityCrewFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { value, setValue, rosterCrew } = props;

	const activeCrew = React.useMemo(() => {
		const shuttlers: boolean = rosterCrew.filter(crew => crew.active_status === 2).length > 0;
		const voyagers: boolean = rosterCrew.filter(crew => crew.active_status === 3).length > 0;
		return { shuttlers, voyagers };
	}, [rosterCrew]);

	const filterOptions: DropdownItemProps = [
		{	/* Show all crew */
			key: 'all',
			value: '',
			text: t('base.all_crew')
		},
		{	/* Only show idle crew */
			key: 'is:idle',
			value: 'is:idle',
			text: t('options.crew_status.idle')
		},
		{	/* Only show frozen crew */
			key: 'is:frozen',
			value: 'is:frozen',
			text: t('options.crew_status.frozen')
		},
		{	/* Hide frozen crew */
			key: 'not:frozen',
			value: 'not:frozen',
			text: t('options.crew_status.frozen_hide')
		}
	];

	// Always show at least 1 active crew option, even if no crew are active
	if (activeCrew.shuttlers === activeCrew.voyagers) {
		filterOptions.push(
			{	/* Only show active crew */
				key: 'is:active',
				value: 'is:active',
				text: t('options.crew_status.active')
			}
		);
	}
	// Only show active type option if that there are active crew of that type
	//	Currently opting NOT to show hide active type option
	if (activeCrew.shuttlers) {
		filterOptions.push(
			{	/* Only show crew on running shuttles */
				key: 'is:shuttler',
				value: 'is:shuttler',
				text: t('options.crew_status.shuttler')
			}
		);
	}
	if (activeCrew.voyagers) {
		filterOptions.push(
			{	/* Only show crew on running voyages */
				key: 'is:voyager',
				value: 'is:voyager',
				text: t('options.crew_status.voyager')
			}
		);
	}
	// Only show hide active option if any crew are active
	if (activeCrew.shuttlers || activeCrew.voyagers) {
		filterOptions.push(
			{	/* Hide active crew */
				key: 'not:active',
				value: 'not:active',
				text: t('options.crew_options.active_hide')
			}
		);
	}

	return (
		<Form.Field	/* Filter by availability */
			placeholder={t('hints.filter_by_availability')}
			control={Dropdown}
			selection
			clearable
			options={filterOptions}
			value={value}
			onChange={(e, { value }) => setValue(value as string)}
		/>
	);
};

export function crewMatchesAvailabilityFilter(crew: PlayerCrew, availabilityFilter: string): boolean {
	if (availabilityFilter === '') return true;
	if (availabilityFilter === 'is:idle' && crew.immortal <= 0 && crew.active_status === 0) return true;
	if (availabilityFilter === 'not:frozen' && crew.immortal <= 0) return true;
	if (availabilityFilter === 'is:frozen' && crew.immortal > 0) return true;
	if (availabilityFilter === 'not:active' && crew.active_status === 0) return true;
	if (availabilityFilter === 'is:active' && crew.active_status > 0) return true;
	if (availabilityFilter === 'is:shuttler' && crew.active_status === 2) return true;
	if (availabilityFilter === 'is:voyager' && crew.active_status === 3) return true;
	return false;
}
