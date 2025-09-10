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
	compact?: boolean;
	onResult?: (result: IContestResult) => void;
	onWinsViewChange?: (inView: boolean) => void;
};

export const Contest = (props: ContestProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { skills, traits, traitPool, aPool, bPool } = props;

	const [contestantA, setContestantA] = React.useState<IContestant>(initContestant(props.a));
	const [contestantB, setContestantB] = React.useState<IContestant>(initContestant(props.b));
	const [contestResult, setContestResult] = React.useState<IContestResult | undefined>(undefined);
	const [pickerTrigger, setPickerTrigger] = React.useState<IPickerTrigger | undefined>(undefined);

	const [compactMode, setCompactMode] = React.useState<boolean>(!!props.compact);

	// Listen to changes to champion from encounter helper simulator
	React.useEffect(() => {
		setContestantA(initContestant(props.a));
	}, [props.a]);

	React.useEffect(() => {
		// Run more simulations if contestants have high crit chances
		const simCount: number = Math.floor(SIMULATIONS*(1+((contestantA.critChance+contestantB.critChance)/100)));
		simulateContest(contestantA, contestantB, simCount, PERCENTILE).then(result => {
			setContestResult(result);
			if (props.onResult) props.onResult(result);
		});
		setContestResult(undefined);
	}, [contestantA, contestantB]);

	return (
		<React.Fragment>
			<div
				style={{ cursor: compactMode ? 'pointer' : undefined }}
				onClick={compactMode ? () => setCompactMode(false) : undefined}
			>
				<Grid columns={2} centered stackable>
					<Grid.Column>
						<Contestant
							skills={skills}
							contestant={contestantA}
							wins={contestResult ? formatContestResult(contestResult) : <Icon loading name='spinner' />}
							editContestant={(contestant: IContestant) => setContestantA(contestant)}
							dismissContestant={aPool ? () => setContestantA(makeContestant(skills, traits ?? [])) : undefined}
							compact={compactMode}
							onWinsViewChange={props.onWinsViewChange}
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
							compact={compactMode}
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
			</div>
			{!compactMode && (
				<div style={{ marginTop: '1em' }}>
					Avg, Min, and Max are calculated without crit chance.
					{contestResult?.simulated && (
						<>{` `}Wins % is calculated from simulations with crit chance.</>
					)}
				</div>
			)}
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
				skills: structuredClone(contestant.skills),	// Prevent edits from bubbling up
				critChance: contestant.critChance
			};
		}
		return makeContestant(skills, traits ?? []);
	}
};
