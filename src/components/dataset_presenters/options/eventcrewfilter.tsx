import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { IEventData } from '../../eventplanner/model';

type EventCrewFilterProps = {
	value: string;
	setValue: (eventFilter: string) => void;
	events: IEventData[];
};

export const EventCrewFilter = (props: EventCrewFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { value, setValue, events } = props;

	const eventOptions = React.useMemo<DropdownItemProps[]>(() => {
		const eventTypes = {
			'gather' : t('event_type.gather'),
			'shuttles': t('event_type.shuttles'),
			'skirmish': t('event_type.skirmish'),
			'voyage': t('event_type.voyage')
		};
		const eventOptions: DropdownItemProps[] = [
			{	/* Show all crew */
				key: 'all',
				value: '',
				text: t('base.all_crew')
			}
		];
		events.filter(eventData => eventData.seconds_to_end > 0)
			.sort((a, b) => a.seconds_to_start - b.seconds_to_start)
			.forEach(eventData => {
				const contentTypes: string[] = [];
				eventData.content_types.forEach(contentType => {
					if (!contentTypes.includes(contentType))
						contentTypes.push(contentType);
				});
				eventOptions.push(
					{
						key: eventData.symbol,
						value: eventData.symbol,
						text: `"${eventData.name}" (${contentTypes.map(type => eventTypes[type]).join(', ')})`
					}
				);
			});
		return eventOptions;
	}, [events]);

	if (events.length === 0) return <></>;

	const bonusOptions: DropdownItemProps[] = [
		{	/* Only show event crew */
			key: 'all',
			value: 'is:bonus',
			text: t('options.event_status.bonus')
		},
		{	/* Hide event crew */
			key: 'not:bonus',
			value: 'not:bonus',
			text: t('options.event_status.bonus_hide')
		},
		{	/* Only show featured crew */
			key: 'is:featured',
			value: 'is:featured',
			text: t('options.event_status.featured')
		},
		{	/* Hide featured crew */
			key: 'not:featured',
			value: 'not:featured',
			text: t('options.event_status.featured_hide')
		}
	];

	let eventValue: string = '';
	let bonusValue: string = '';
	if (value !== '') [eventValue, bonusValue] = value.split(',');

	return (
		<React.Fragment>
			<Form.Field	/* Filter by event */
				placeholder={t('hints.filter_by_event')}
				control={Dropdown}
				selection
				clearable
				options={eventOptions}
				value={eventValue}
				onChange={(e, { value }) => setValue(value !== '' ? `${value as string},is:bonus` : '')}
			/>
			{eventValue !== '' && (
				<Form.Field	/* Filter by bonus */
					placeholder={t('hints.filter_by_bonus')}
					control={Dropdown}
					selection
					options={bonusOptions}
					value={bonusValue}
					onChange={(e, { value }) => setValue(`${eventValue},${value as string}`)}
				/>
			)}
		</React.Fragment>
	);
};

export function crewMatchesEventFilter(crew: PlayerCrew, eventFilter: string, events: IEventData[]): boolean {
	if (eventFilter === '') return true;
	const [eventSymbol, bonusFilter] = eventFilter.split(',');
	const eventData = events.find(e => e.symbol === eventSymbol);
	if (eventData) {
		const [filterType, bonusType] = bonusFilter.split(':');
		const isEventCrew: boolean = (bonusType === 'featured' ? eventData.featured : eventData.bonus).includes(crew.symbol);
		if (isEventCrew && filterType === 'is') return true;
		if (!isEventCrew && filterType === 'not') return true;
	}
	return false;
}
