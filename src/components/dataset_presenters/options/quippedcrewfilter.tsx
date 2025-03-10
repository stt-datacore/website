import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { qbitsToSlots } from '../../../utils/crewutils';

type QuippedCrewFilterProps = {
	value: string;
	setValue: (quippedFilter: string) => void;
};

export const QuippedCrewFilter = (props: QuippedCrewFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { value, setValue } = props;
	const filterOptions: DropdownItemProps[] = [
		{	/* Show all crew */
			key: 'all',
			value: '',
			text: t('base.all_crew')
		},
		{	/* Only show quipped crew */
			key: 'is:quipped',
			value: 'is:quipped',
			text: t('options.roster_maintenance.quipped')
		},
		{	/* Hide quipped crew */
			key: 'not:quipped',
			value: 'not:quipped',
			text: t('options.roster_maintenance.quipped_hide')
		},
		{	/* Only show quippable crew */
			key: 'is:quippable',
			value: 'is:quippable',
			text: t('options.roster_maintenance.quippable')
		}
	];
	return (
		<Form.Field	/* Filter by quipped status */
			placeholder={t('hints.filter_by_quipped_status')}
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
