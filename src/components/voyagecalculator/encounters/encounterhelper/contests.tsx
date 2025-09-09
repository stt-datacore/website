import React from 'react';
import {
	Header,
	Label,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import ItemDisplay from '../../../itemdisplay';
import CONFIG from '../../../CONFIG';

import { IContest, IContestSkill, IExpectedScore } from '../model';
import { formatContestResult, getExpectedScore } from '../utils';
import { ProficiencyRanges } from '../common/ranges';
import { EncounterContext } from './context';
import { getConsumableImg } from './boostpicker';
import { IChampion, IChampionBoost, IChampionContest } from './championdata';

type ContestsTableProps = {
	setTargetSkills: (skills: string[]) => void;
};

export const ContestsTable = (props: ContestsTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds, championData, assignments } = React.useContext(EncounterContext);

	return (
		<React.Fragment>
			<Header	/* Contest Assignments */
				 as='h4'
			>
				{t('voyage.contests.contests_header')}
			</Header>
			<p>{t('voyage.contests.contests_description')}</p>
			<Table celled selectable striped padded='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell	/* Contest */
							textAlign='center'
						>
							{t('voyage.contests.contest')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Opponent */
							textAlign='center'
						>
							{t('global.opponent')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							{t('voyage.contests.crit_chance')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Assigned Crew */>
							{t('voyage.contests.assigned_crew')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Boost */
							textAlign='center'
						>
							Boost
						</Table.HeaderCell>
						<Table.HeaderCell	/* Skills */
							textAlign='center'
						>
							{t('base.skills')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							{t('voyage.contests.crit_chance')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Average Score */
							textAlign='center'
						>
							{t('voyage.contests.avg_score')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Odds of Winning */
							textAlign='center'
						>
							{t('voyage.contests.odds_of_winning')}
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{encounter.contests.map((contest, contestIndex) => {
						const contestId: string = contestIds[contestIndex];
						const assignedContest: IChampionContest | undefined = championData.find(crew =>
							crew.id === assignments[contestId].crew?.id
						)?.contests[contestId];
						return (
							<Table.Row key={contestId}
								onClick={() => props.setTargetSkills(contest.skills.map(cs => cs.skill))}
								style={{ cursor: 'pointer' }}
							>
								<Table.Cell textAlign='center'>
									{contestIndex+1}/{encounter.contests.length}
									{contest.critChance > 0 && (
										<div>
											<Label	/* Boss */
												color='pink'
											>
												{t('base.boss')}
											</Label>
										</div>
									)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderSkills(contest.skills)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{t('global.n_%', { n: contest.critChance })}
								</Table.Cell>
								<Table.Cell>
									{assignedContest && <CrewLabel crew={assignedContest.champion.crew} />}
									{!assignedContest && <>{t('global.unassigned')}</>}
								</Table.Cell>
								<Table.Cell>
									{renderBoost(assignments[contestId].boost)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && renderChampionSkills(assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && <>{t('global.n_%', { n: assignedContest.champion.critChance })}</>}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderContest(contestIndex, assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest?.result && <>{formatContestResult(assignedContest.result)}</>}
									{!assignedContest && <>{t('global.n_%', { n: 0 })}</>}
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		</React.Fragment>
	);

	function renderSkills(skills: IContestSkill[]): JSX.Element {
		return <ProficiencyRanges skills={skills} />;
	}

	function renderBoost(boost: IChampionBoost | undefined): JSX.Element {
		if (!boost) return <></>;
		let name: string = `${boost.rarity}*`;
		if (boost.type === 'voyage_crit_boost')
			name += ' CRIT';
		else
			name += ` ${CONFIG.SKILLS_SHORT.find(ss => ss.name === boost.type)?.short ?? ''}`;
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
				<ItemDisplay
					src={getConsumableImg(boost.type, boost.rarity)}
					size={32}
					rarity={boost.rarity}
					maxRarity={boost.rarity}
				/>
				<span style={{ padding: '0 .5em', whiteSpace: 'nowrap' }}>
					{name}
				</span>
			</div>
		);
	}

	function renderChampionSkills(contest: IChampionContest): JSX.Element {
		const champion: IChampion = contest.champion;
		const contestSkills: IContestSkill[] = contest.skills.map(contestSkill => {
			const championSkill: IContestSkill | undefined = champion.skills.find(championSkill =>
				championSkill.skill === contestSkill.skill
			);
			if (championSkill) return championSkill;
			return {
				skill: contestSkill.skill,
				range_min: 0,
				range_max: 0
			};
		});
		return renderSkills(contestSkills);
	}

	function renderContest(contestIndex: number, assignedContest: IChampionContest | undefined): JSX.Element {
		if (assignedContest) {
			return (
				<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
					<span>
						{assignedContest.result?.simulated?.a.average ?? assignedContest.champion_roll.average}
					</span>
					<span>
						vs
					</span>
					<span>
						{assignedContest.result?.simulated?.b.average ?? assignedContest.challenger_roll.average}
					</span>
				</div>
			);
		}
		const contest: IContest = encounter.contests[contestIndex];
		const challengerRoll: IExpectedScore = getExpectedScore(contest.skills);
		return (
			<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
				<span>0</span>
				<span>vs</span>
				<span>{challengerRoll.average}</span>
			</div>
		);
	}
};
