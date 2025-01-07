import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';

type AvailabilityCrewFilterProps = {
	value: string;
	setValue: (availabilityFilter: string) => void;
	rosterCrew: PlayerCrew[];
};

export const AvailabilityCrewFilter = (props: AvailabilityCrewFilterProps) => {
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
			text: 'Show all crew'
		},
		{	/* Only show idle crew */
			key: 'is:idle',
			value: 'is:idle',
			text: 'Only show idle crew'
		},
		{	/* Only show frozen crew */
			key: 'is:frozen',
			value: 'is:frozen',
			text: 'Only show frozen crew'
		},
		{	/* Hide frozen crew */
			key: 'not:frozen',
			value: 'not:frozen',
			text: 'Hide frozen crew'
		}
	];

	// Always show at least 1 active crew option, even if no crew are active
	if (activeCrew.shuttlers === activeCrew.voyagers) {
		filterOptions.push(
			{	/* Only show active crew */
				key: 'is:active',
				value: 'is:active',
				text: 'Only show active crew'
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
				text: 'Only show crew on running shuttles'
			}
		);
	}
	if (activeCrew.voyagers) {
		filterOptions.push(
			{	/* Only show crew on running voyages */
				key: 'is:voyager',
				value: 'is:voyager',
				text: 'Only show crew on running voyages'
			}
		);
	}
	// Only show hide active option if any crew are active
	if (activeCrew.shuttlers || activeCrew.voyagers) {
		filterOptions.push(
			{	/* Hide active crew */
				key: 'not:active',
				value: 'not:active',
				text: 'Hide active crew'
			}
		);
	}

	return (
		<Form.Field	/* Filter by availability */
			placeholder='Filter by availability'
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
