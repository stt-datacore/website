import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { qbitsToSlots } from '../../../utils/crewutils';

type QuippedCrewFilterProps = {
	value: string;
	setValue: (quippedFilter: string) => void;
};

export const QuippedCrewFilter = (props: QuippedCrewFilterProps) => {
	const { value, setValue } = props;
	const filterOptions: DropdownItemProps[] = [
		{	/* Show all crew */
			key: 'all',
			value: '',
			text: 'Show all crew'
		},
		{	/* Only show quipped crew */
			key: 'is:quipped',
			value: 'is:quipped',
			text: 'Only show quipped crew'
		},
		{	/* Hide quipped crew */
			key: 'not:quipped',
			value: 'not:quipped',
			text: 'Hide quipped crew'
		},
		{	/* Only show crew with unlocked quipment slots */
			key: 'is:quippable',
			value: 'is:quippable',
			text: 'Only show crew with unlocked quipment slots'
		}
	];
	return (
		<Form.Field	/* Filter by quipped status */
			placeholder='Filter by quipped status'
			control={Dropdown}
			selection
			clearable
			options={filterOptions}
			value={value}
			onChange={(e, { value }) => setValue(value as string)}
		/>
	);
};

export function crewMatchesQuippedFilter(crew: PlayerCrew, quipFilter: string): boolean {
	return quipFilter === ''
		|| (quipFilter === 'not:quipped' && !crew.kwipment?.some(k => typeof k === 'number' ? !!k : !!k[1]))
		|| (quipFilter === 'is:quipped' && crew.kwipment?.some(k => typeof k === 'number' ? !!k : !!k[1]))
		|| (quipFilter === 'is:quippable' && qbitsToSlots(crew.q_bits) > 0);
}
