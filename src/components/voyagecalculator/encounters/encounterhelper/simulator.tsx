import React from 'react';
import {
	Button,
	Divider,
	Message,
	Modal,
	Statistic
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { DataPickerLoading } from '../../../dataset_presenters/datapicker';
import { AvatarView } from '../../../item_presenters/avatarview';

import { IContestResult, IContestSkill, IExpectedScore } from '../model';
import { formatContestResult, getExpectedScore, makeContestant } from '../utils';
import { Contest } from '../contestsimulator/contest';
import { EncounterContext } from './context';
import { assignCrewToContest, CRIT_BOOSTS, getDefaultAssignments, IChampion, IChampionBoost, IChampionContest, IChampionContestResult, IChampionCrewData, IContestAssignment, IContestAssignments, IUnusedSkills, MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';
import { ContributorsTable } from './contributors';

type ChampionSimulatorProps = {
	activeContest: IChampionContest;
	updateData: (result: IChampionContestResult, assignments?: IContestAssignments) => void;
	cancelTrigger: () => void;
};

export const ChampionSimulator = (props: ChampionSimulatorProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds, championData, assignments } = React.useContext(EncounterContext);
	const { updateData, cancelTrigger } = props;

	const [pendingAssignments, setPendingAssignments] = React.useState<IContestAssignments>(getDefaultAssignments(encounter.contests));
	const [activeContest, setActiveContest] = React.useState<IChampionContest | undefined>(undefined);
	const [contestOdds, setContestOdds] = React.useState<{ [key: string]: number; }>({});
	const [championResult, setChampionResult] = React.useState<IChampionContestResult | undefined>(undefined);
	const [showWinsBug, setShowWinsBug] = React.useState<boolean>(false);

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

		const contestOdds: { [key: string]: number; } = {};
		Object.keys(pendingAssignments).forEach(contestId => {
			contestOdds[contestId] = 0;
			const assignment: IContestAssignment = assignments[contestId];
			const crewId: number = assignment.crew?.id ?? 0;
			const crewData: IChampionCrewData | undefined = championData.find(crewData =>
				crewData.id === crewId
			);
			if (crewData) {
				const championContest: IChampionContest = crewData.contests[contestId];
				if (championContest.result) contestOdds[contestId] = championContest.result.oddsA;
			}
		});
		setContestOdds(contestOdds);
	}, [assignments, props.activeContest]);

	React.useEffect(() => {
		if (!activeContest) return;
		const champion: IChampion = makeChampion(activeContest, pendingAssignments);
		const championRoll: IExpectedScore = getExpectedScore(champion.skills);
		setActiveContest({
			...activeContest,
			champion,
			champion_roll: championRoll,
			result: undefined
		});
	}, [pendingAssignments]);

	// Dirty if any of these are true:
	// 	1) Crew assigned to active contest is different
	//  2) Any assigned boost is different
	const isDirty = React.useMemo<boolean>(() => {
		return hasPendingChanges();
	}, [pendingAssignments, activeContest]);

	if (!activeContest)
		return <DataPickerLoading />;

	return (
		<Modal
			open={true}
			onClose={() => closeModal(false)}
			size='small'
		>
			<Modal.Header	/* Contest Simulator */>
				{t('voyage.contests.contest_simulator')}
			</Modal.Header>
			<Modal.Content scrolling>
				{showWinsBug && renderBug()}
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button	/* Close or Cancel */
					content={isDirty ? t('global.cancel') : t('global.close')}
					onClick={() => closeModal(false)}
				/>
				{isDirty && (
					<Button	/* Save */
						content={t('global.save')}
						onClick={() => closeModal(true)}
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
					onResult={serializeResult}
					onWinsViewChange={(inView) => setShowWinsBug(!inView)}
				/>
				<Divider />
				{pendingAssignments && (
					<ContributorsTable
						activeContest={activeContest}
						contestOdds={contestOdds}
						assignments={pendingAssignments}
						setAssignments={setPendingAssignments}
					/>
				)}
			</React.Fragment>
		);
	}

	function renderBug(): JSX.Element {
		if (!championResult) return <></>;
		return (
			<div style={{ position: 'absolute', top: '1em', right: '1em', zIndex: '100' }}>
				<Message compact color='black'>
					<div style={{ display: 'flex', alignItems: 'center', columnGap: '1em' }}>
						<div>
							{activeContest?.champion.crew && (
								<AvatarView
									mode='crew'
									size={64}
									item={activeContest.champion.crew}
									partialItem={true}
								/>
							)}
						</div>
						<div>
							<Statistic size='tiny'	/* Wins */>
								<Statistic.Value>
									{formatContestResult(championResult)}
								</Statistic.Value>
								<Statistic.Label>
									{t('voyage.contests.wins')}
								</Statistic.Label>
							</Statistic>
						</div>
					</div>
				</Message>
			</div>
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

	function hasPendingChanges(compareActiveCrew: boolean = true): boolean {
		const boostId = (assignments: IContestAssignments, contestId: string) => {
			const assignment: IContestAssignment = assignments[contestId];
			if (!assignment.boost) return '';
			return `${assignment.boost.type}_${assignment.boost.rarity}`;
		};
		if (!activeContest) return false;
		if (compareActiveCrew) {
			const currentId: number = assignments[activeContest.id].crew?.id ?? 0;
			const pendingId: number = pendingAssignments[activeContest.id].crew?.id ?? 0;
			if (currentId !== pendingId) return true;
		}
		let boostsAreDirty: boolean = false;
		for (let i = 0; i <= activeContest.index; i++) {
			boostsAreDirty = boostId(assignments, contestIds[i]) !== boostId(pendingAssignments, contestIds[i]);
			if (boostsAreDirty) break;
		}
		return boostsAreDirty;
	}

	// Serialize contestResult as championContestResult
	function serializeResult(result: IContestResult | undefined): void {
		if (!activeContest || !result) return;
		setChampionResult({
			...result,
			oddsA: result.oddsA,
			crewId: activeContest.champion.crew.id,
			contestId: activeContest.id,
			championAverage: activeContest.champion_roll.average,
			critChance: activeContest.champion.critChance
		});
	}

	function closeModal(affirmative: boolean): void {
		if (championResult) {
			// Always update champion odds when saving assignments
			if (affirmative)
				updateData(championResult, pendingAssignments);
			// Otherwise update champion odds only if no boosts have changed
			else if (!hasPendingChanges(false))
				updateData(championResult);
		}
		cancelTrigger();
	}
};
