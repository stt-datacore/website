import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { IEventData } from '../../eventplanner/model';

type EventCrewFilterProps = {
	value: string;
	setValue: (eventFilter: string) => void;
	events: IEventData[];
};

export const EventCrewFilter = (props: EventCrewFilterProps) => {
	const { value, setValue, events } = props;

	if (events.length === 0) return <></>;

	const filterOptions: DropdownItemProps[] = [
		{ key: 'all', value: '', text: 'Show all crew' }	/* Show all crew */
	];
	events.forEach(eventData => {
		filterOptions.push(
			{	/* Hide all event crew from "EVENT_NAME" */
				key: `not:bonus:${eventData.symbol}`,
				value: `not:bonus:${eventData.symbol}`,
				text: `Hide all event crew from "${eventData.name}"`
			},
			{	/* Hide featured crew from "EVENT_NAME" */
				key: `not:featured:${eventData.symbol}`,
				value: `not:featured:${eventData.symbol}`,
				text: `Hide featured crew from "${eventData.name}"`
			},
			{	/* Only show event crew from "EVENT_NAME" */
				key: `is:bonus:${eventData.symbol}`,
				value: `is:bonus:${eventData.symbol}`,
				text: `Only show event crew from "${eventData.name}"`
			},
			{	/* Only show featured crew from "EVENT_NAME" */
				key: `is:featured:${eventData.symbol}`,
				value: `is:featured:${eventData.symbol}`,
				text: `Only show featured crew from "${eventData.name}"`
			}
		);
	});

	return (
		<Form.Field	/* Filter by event */
			placeholder='Filter by event'
			control={Dropdown}
			selection
			clearable
			options={filterOptions}
			value={value}
			onChange={(e, { value }) => setValue(value as string)}
		/>
	);
};

export function crewMatchesEventFilter(crew: PlayerCrew, eventFilter: string, events: IEventData[]): boolean {
	if (eventFilter === '') return true;
	const [filterType, bonusType, eventSymbol] = eventFilter.split(':');
	const eventData = events.find(e => e.symbol === eventSymbol);
	if (eventData) {
		const isEventCrew: boolean = (bonusType === 'featured' ? eventData.featured : eventData.bonus).includes(crew.symbol);
		if (isEventCrew && filterType === 'is') return true;
		if (!isEventCrew && filterType === 'not') return true;
	}
	return false;
}
