import React from 'react';
import {
	Form
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';

import { IDataTableColumn, IDataTableSetup, IEssentialData } from '../../../dataset_presenters/model';
import { DataTable } from '../../../dataset_presenters/datatable';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import { SkillToggler } from '../../../dataset_presenters/options/skilltoggler';

import { crewIsShortSkilled } from '../utils';
import { ProficiencyRanges } from '../common/ranges';

import { ProficiencyContext } from './context';
import { getProficientCrewData, IScoredSkill, IProficientCrew } from './data';

type ProficiencyTableProps = {
	id: string;
};

export const ProficiencyTable = (props: ProficiencyTableProps) => {
	const { t, TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { voyageConfig, sortedSkills, simulateContest } = React.useContext(ProficiencyContext);

	const [skillFilter, setSkillFilter] = React.useState<string[]>([]);

	const data = React.useMemo<IProficientCrew[]>(() => {
		return getProficientCrewData(voyageConfig, sortedSkills);
	}, [voyageConfig]);

	const tableSetup = React.useMemo<IDataTableSetup>(() => {
		interface ICrewCount {
			skills: string[];
			count: number;
		};
		const crewCounts: ICrewCount[] = [];
		for (let i = 0; i < sortedSkills.length; i++) {
			const crewCount: number = data.filter(crew => crew.scored_skills[sortedSkills[i]].score > 0).length;
			crewCounts.push({
				skills: [sortedSkills[i]],
				count: crewCount
			});
			for (let j = i + 1; j < sortedSkills.length; j++) {
				const skillId: string = sortedSkills[i]+','+sortedSkills[j];
				const crewCount: number = data.filter(crew => crew.scored_skills[skillId].score > 0).length;
				crewCounts.push({
					skills: [sortedSkills[i], sortedSkills[j]],
					count: crewCount
				});
			}
		}

		const columns: IDataTableColumn[] = [
			{	/* Crew */
				id: 'name',
				title: t('base.crew'),
				sortField: { id: 'name', stringValue: true },
				renderCell: (datum: IEssentialData) => <CrewLabel crew={datum as IProficientCrew} />
			},
			{	/* Skills */
				id: 'skills',
				title: t('base.skills'),
				align: 'center',
				sortField: { id: 'best_proficiency', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => renderCrewSkills(datum as IProficientCrew)
			},
			{
				id: 'crit_potential',
				title: <img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />,
				align: 'center',
				sortField: { id: 'crit_potential.length', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => renderCritPotential(datum as IProficientCrew)
			}
		];
		crewCounts.sort((a, b) => b.count - a.count).filter(crewCount =>
			skillFilter.length === 0 || skillFilter.every(filter => crewCount.skills.includes(filter))
		).forEach(crewCount => {
			const skillId: string = crewCount.skills.length > 1 ? crewCount.skills.join(',') : crewCount.skills[0];
			columns.push({
				id: `scored_skills.${skillId}`,
				title: renderSkillHeader(crewCount.skills, crewCount.count),
				align: 'center',
				sortField: {
					id: `scored_skills.${skillId}.score`,
					firstSort: 'descending'
				},
				renderCell: (datum: IEssentialData) => renderContestScore(datum as IProficientCrew, skillId)
			});
		});

		return {
			columns,
			rowsPerPage: 12
		};
	}, [data, skillFilter]);

	return (
		<React.Fragment>
			<Form style={{ marginBottom: '1em' }}>
				<SkillToggler
					value={skillFilter}
					setValue={(value: string[]) => setSkillFilter(value)}
					maxSkills={1}
				/>
			</Form>
			<DataTable
				id={`${props.id}/datatable`}
				data={data}
				setup={tableSetup}
			/>
		</React.Fragment>
	);

	function renderSkillHeader(skills: string[], crewCount: number): React.JSX.Element {
		return (
			<span title={t('voyage.contests.n_viable_crew', { n: crewCount })}>
				{skills.map(skill => (
					<img key={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				))}
				{` `}({crewCount})
			</span>
		);
	}

	function renderCrewSkills(crew: IProficientCrew): React.JSX.Element {
		const skills = Object.keys(crew.skills).map(skill => {
			return {...crew.skills[skill], skill};
		});
		return <ProficiencyRanges skills={skills} sort />;
	}

	function renderCritPotential(crew: IProficientCrew): React.JSX.Element {
		if (crew.crit_potential.length === 0) return <></>;
		const title: string = crew.crit_potential.map(critTrait => TRAIT_NAMES[critTrait]).join(', ');
		return (
			<div title={title}>
				{crew.crit_potential.length}
			</div>
		);
	}

	function renderContestScore(crew: IProficientCrew, skillId: string): React.JSX.Element {
		const scoredSkill: IScoredSkill = crew.scored_skills[skillId];
		if (scoredSkill.score === 0) return <></>;
		return (
			<div	/* Simulate contest */
				style={{ cursor: 'pointer' }}
				onClick={() => simulateContest({ skills: scoredSkill.skills, crew })}
				title={t('voyage.contests.simulate_contest')}
			>
				{scoredSkill.score}{crewIsShortSkilled(crew, scoredSkill.skills) && <>*</>}
			</div>
		);
	}
};
