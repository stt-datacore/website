import React from 'react';
import {
	Button,
	Grid,
	Icon
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { IContestant, IContestResult } from '../model';
import { formatContestResult, makeContestant, simulateContest } from '../utils';
import { Contestant } from './contestant';
import { ContestantPicker } from './contestantpicker';

const SIMULATIONS: number = 10000;
const PERCENTILE: number = 1;	// 1 for head-to-head simulations, <1 for sample simulations

interface IPickerTrigger {
	pool: PlayerCrew[];
	setContestant: (contestant: IContestant) => void;
};

type ContestProps = {
	id: string;
	skills: string[];
	traits?: string[];
	traitPool?: string[];
	a?: IContestant;
	aPool?: PlayerCrew[];
	b?: IContestant;
	bPool?: PlayerCrew[];
};

export const Contest = (props: ContestProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { skills, traits, traitPool, aPool, bPool } = props;

	const [contestantA, setContestantA] = React.useState<IContestant>(initContestant(props.a));
	const [contestantB, setContestantB] = React.useState<IContestant>(initContestant(props.b));
	const [contestResult, setContestResult] = React.useState<IContestResult | undefined>(undefined);
	const [pickerTrigger, setPickerTrigger] = React.useState<IPickerTrigger | undefined>(undefined);

	React.useEffect(() => {
		simulateContest(contestantA, contestantB, SIMULATIONS, PERCENTILE).then(result => {
			setContestResult(result);
		});
		setContestResult(undefined);
	}, [contestantA, contestantB]);

	return (
		<React.Fragment>
			<Grid columns={2} centered stackable>
				<Grid.Column>
					<Contestant
						skills={skills}
						contestant={contestantA}
						wins={contestResult ? formatContestResult(contestResult) : <Icon loading name='spinner' />}
						editContestant={(contestant: IContestant) => setContestantA(contestant)}
						dismissContestant={aPool ? () => setContestantA(makeContestant(skills, traits ?? [])) : undefined}
					/>
					{aPool && (
						<Button	/* Search for contestant */
							content={t('voyage.contests.search_for_contestant')}
							icon='search'
							fluid
							onClick={() => setPickerTrigger({ pool: aPool, setContestant: setContestantA })}
						/>
					)}
				</Grid.Column>
				<Grid.Column>
					<Contestant
						skills={skills}
						contestant={contestantB}
						wins={contestResult ? formatContestResult(contestResult, true) : <Icon loading name='spinner' />}
						editContestant={(contestant: IContestant) => setContestantB(contestant)}
						dismissContestant={bPool ? () => setContestantB(makeContestant(skills, traits ?? [])) : undefined}
					/>
					{bPool && (
						<Button	/* Search for contestant */
							content={t('voyage.contests.search_for_contestant')}
							icon='search'
							fluid
							onClick={() => setPickerTrigger({ pool: bPool, setContestant: setContestantB })}
						/>
					)}
				</Grid.Column>
			</Grid>
			{pickerTrigger && (
				<ContestantPicker
					id={`${props.id}/contestantpicker`}
					skills={skills}
					traits={traits}
					traitPool={traitPool}
					crewPool={pickerTrigger.pool}
					setContestant={pickerTrigger.setContestant}
					dismissPicker={() => setPickerTrigger(undefined)}
				/>
			)}
		</React.Fragment>
	);

	function initContestant(contestant?: IContestant): IContestant {
		if (contestant) {
			return {
				crew: contestant.crew,
				skills: JSON.parse(JSON.stringify(contestant.skills)),	// Prevent edits from bubbling up
				critChance: contestant.critChance
			};
		}
		return makeContestant(skills, traits ?? []);
	}
};
