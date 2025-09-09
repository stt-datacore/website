import React from 'react';
import {
	Button,
	Divider,
	Modal
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';

import { IContestSkill, IExpectedScore } from '../model';
import { getExpectedScore, makeContestant, simulateContest } from '../utils';
import { Contest } from '../contestsimulator/contest';
import { EncounterContext } from './context';
import { assignCrewToContest, CRIT_BOOSTS, getDefaultAssignments, IChampion, IChampionBoost, IChampionContest, IContestAssignment, IContestAssignments, IUnusedSkills, MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';
import { ContributorsTable } from './contributors';

const SIMULATIONS: number = 20000;
const PERCENTILE: number = 1;	// 1 for head-to-head simulations, <1 for sample simulations

type ChampionSimulatorProps = {
	activeContest: IChampionContest;
	updateAssignments: (assignments: IContestAssignments) => void;
	cancelTrigger: () => void;
};

export const ChampionSimulator = (props: ChampionSimulatorProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds, assignments } = React.useContext(EncounterContext);
	const { updateAssignments, cancelTrigger } = props;

	const [pendingAssignments, setPendingAssignments] = React.useState<IContestAssignments>(getDefaultAssignments(encounter.contests));
	const [activeContest, setActiveContest] = React.useState<IChampionContest | undefined>(undefined);

	React.useEffect(() => {
		// Make copy of assignments so we can test crew and boosts without saving
		const pendingAssignments: IContestAssignments = getDefaultAssignments(encounter.contests);
		Object.keys(assignments).forEach(contestId => {
			const assignment: IContestAssignment = assignments[contestId];
			pendingAssignments[contestId].crew = assignment.crew;
			pendingAssignments[contestId].boost = assignment.boost;
			pendingAssignments[contestId].unusedSkills = assignment.unusedSkills;
		});

		// Update assignments with (unboosted) crew to test, if not currently assigned to active contest
		const assignment: IContestAssignment = assignments[props.activeContest.id];
		if (props.activeContest.champion.crew.id !== assignment.crew?.id) {
			assignCrewToContest(encounter, pendingAssignments, props.activeContest.id, props.activeContest.champion.crew);
		}
		const champion: IChampion = makeChampion(props.activeContest, pendingAssignments);
		const championRoll: IExpectedScore = getExpectedScore(champion.skills);
		setActiveContest({
			...props.activeContest,
			champion,
			champion_roll: championRoll,
			result: undefined
		});
		setPendingAssignments(pendingAssignments);
	}, [assignments, props.activeContest]);

	React.useEffect(() => {
		if (!activeContest) return;
		const champion: IChampion = makeChampion(activeContest, pendingAssignments);
		const championRoll: IExpectedScore = getExpectedScore(champion.skills);
		simulateContest(champion, activeContest.challenger, SIMULATIONS, PERCENTILE).then(result => {
			setActiveContest({
				...activeContest,
				champion,
				champion_roll: championRoll,
				result: {
					...result,
					contestId: activeContest.id,
					crewId: champion.crew.id,
					championAverage: championRoll.average,
					critChance: champion.critChance
				}
			});
		});
	}, [pendingAssignments]);

	// Dirty if any of these are true:
	// 	1) Crew assigned to active contest is different
	//  2) Any assigned boost is different
	const isDirty = React.useMemo<boolean>(() => {
		const boostId = (assignments: IContestAssignments, contestId: string) => {
			const assignment: IContestAssignment = assignments[contestId];
			if (!assignment.boost) return '';
			return `${assignment.boost.type}_${assignment.boost.rarity}`;
		};
		if (!activeContest) return false;
		const currentId: number = assignments[activeContest.id].crew?.id ?? 0;
		const pendingId: number = pendingAssignments[activeContest.id].crew?.id ?? 0;
		if (currentId !== pendingId) return true;
		let isDirty: boolean = false;
		for (let i = 0; i <= activeContest.index; i++) {
			isDirty = boostId(assignments, contestIds[i]) !== boostId(pendingAssignments, contestIds[i]);
			if (isDirty) break;
		}
		return isDirty;
	}, [pendingAssignments, activeContest]);

	if (!activeContest) return <></>;

	return (
		<Modal
			open={true}
			onClose={cancelTrigger}
			size='small'
		>
			<Modal.Header	/* Contest Simulator */>
				{t('voyage.contests.contest_simulator')}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button	/* Close or Cancel */
					content={isDirty ? 'Cancel' : t('global.close')}
					onClick={cancelTrigger}
				/>
				{isDirty && (
					<Button	/* Save */
						content='Save'
						onClick={() => {
							updateAssignments(pendingAssignments);
							cancelTrigger();
						}}
					/>
				)}
			</Modal.Actions>
		</Modal>
	);

	function renderContent(): JSX.Element {
		if (!activeContest) return <></>;
		return (
			<React.Fragment>
				<Contest
					id='contestodds/contest'
					skills={activeContest.skills.map(cs => cs.skill)}
					a={activeContest.champion}
					b={activeContest.challenger}
					compact={true}
				/>
				<Divider />
				{pendingAssignments && (
					<ContributorsTable
						activeContest={activeContest}
						assignments={pendingAssignments}
						setAssignments={setPendingAssignments}
					/>
				)}
			</React.Fragment>
		);
	}

	function makeChampion(contest: IChampionContest, assignments: IContestAssignments): IChampion {
		const skills: string[] = contest.skills.map(cs => cs.skill);
		const champion: IChampion = makeContestant(skills, encounter.critTraits, contest.champion.crew) as IChampion;
		const boost: IChampionBoost | undefined = assignments[contest.id].boost;
		if (boost?.type === 'voyage_crit_boost') {
			champion.critChance += CRIT_BOOSTS[boost.rarity];
		}
		else if (boost) {
			const boostedSkill: IContestSkill | undefined = champion.skills.find(cs => cs.skill === boost.type);
			if (boostedSkill) {
				boostedSkill.range_min += MIN_RANGE_BOOSTS[boost.rarity];
				boostedSkill.range_max += MAX_RANGE_BOOSTS[boost.rarity];
			}
		}
		const unusedSkills: IUnusedSkills = assignments[contest.id].unusedSkills;
		skills.forEach(skill => {
			const championSkill: IContestSkill | undefined = champion.skills.find(cs => cs.skill === skill);
			if (championSkill) {
				championSkill.range_min += unusedSkills[skill].range_min;
				championSkill.range_max += unusedSkills[skill].range_max;
			}
		});
		return champion;
	}
};
