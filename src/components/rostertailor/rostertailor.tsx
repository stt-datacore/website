import React from 'react';
import {
	Button,
	Header
} from 'semantic-ui-react';

import { IEventData } from '../../model/events';
import { PlayerCrew } from '../../model/player';

import { TailorContext, ITailorContext } from './context';
import { CrewExcluder } from './crewexcluder/crewexcluder';

type RosterTailorProps = {
	rosterType: string;
	rosterCrew: PlayerCrew[];
	events: IEventData[];
	initialExclusions: Set<number>;
	applyTailor: (tailoredCrew: PlayerCrew[]) => void;
};

export const RosterTailor = (props: RosterTailorProps) => {
	const { rosterType, rosterCrew, events } = props;

	const [excludedCrewIds, setExcludedCrewIds] = React.useState<Set<number>>(new Set<number>());

	React.useEffect(() => {
		setExcludedCrewIds(props.initialExclusions);
	}, [props.initialExclusions]);

	React.useEffect(() => {
		const tailoredCrew: PlayerCrew[] = rosterCrew.filter(crew => {
			return !excludedCrewIds.has(crew.id);
		});
		props.applyTailor(tailoredCrew);
	}, [excludedCrewIds]);

	const tailorProvider: ITailorContext = {
		rosterType, rosterCrew, events,
		excludedCrewIds, setExcludedCrewIds
	};

	return (
		<TailorContext.Provider value={tailorProvider}>
			<React.Fragment>
				<Header as='h3'>
					Crew Options
				</Header>
				<p>A total of <b>{rosterCrew.length - excludedCrewIds.size}</b> crew will be considered.</p>
				<CrewExcluder />
				<Button icon='paint brush' content='Themed Crew' />
				<Button icon='user plus' content='Prospective Crew' />
				<Button content='Prospective Quipment' />
			</React.Fragment>
		</TailorContext.Provider>
	);
};
