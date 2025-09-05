import React from 'react';
import {
	Button,
	Grid,
	Icon
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { IContestant, IContestResult, ISkillBoost } from '../model';
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
	const [boostA, setBoostA] = React.useState<ISkillBoost | undefined>(undefined);
	const [boostB, setBoostB] = React.useState<ISkillBoost | undefined>(undefined);
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
						boost={boostA}
						wins={contestResult ? formatContestResult(contestResult) : <Icon loading name='spinner' />}
						editContestant={(contestant: IContestant) => setContestantA(contestant)}
						editBoost={(boost: ISkillBoost | undefined) => editBoost(boost, 'a')}
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
						boost={boostB}
						wins={contestResult ? formatContestResult(contestResult, true) : <Icon loading name='spinner' />}
						editContestant={(contestant: IContestant) => setContestantB(contestant)}
						editBoost={(boost: ISkillBoost | undefined) => editBoost(boost, 'b')}
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

	function editBoost(boost: ISkillBoost | undefined, applyTo: 'a' | 'b'): void {
		// Boosts can only be applied to crew (i.e. not generic contestants)
		const contestant: IContestant = applyTo === 'a' ? contestantA : contestantB;
		if (!contestant.crew) return;

		// Rebase skills from copy of crew in pool (base + endurable skills - applied boosts)
		const pool: PlayerCrew[] | undefined = applyTo === 'a' ? aPool : bPool;
		const poolCrew: PlayerCrew | undefined = pool?.find(crew => crew.id === contestant.crew?.id);
		if (!poolCrew) return;

		// Applying boosts will override manually-edited skills and crit chance
		const boostedContestant: IContestant = makeContestant(skills, traits ?? [], poolCrew, boost);
		const setContestant: (contestant: IContestant) => void = applyTo === 'a' ? setContestantA : setContestantB;
		setContestant(boostedContestant);

		const setBoost: (boost: ISkillBoost | undefined) => void = applyTo === 'a' ? setBoostA : setBoostB;
		setBoost(boost);
	}
};
