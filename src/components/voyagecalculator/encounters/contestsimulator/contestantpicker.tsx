import React from 'react';
import {
	Icon
} from 'semantic-ui-react';

import { Skill } from '../../../../model/crew';
import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { oneCrewCopy } from '../../../../utils/crewutils';

import CONFIG from '../../../CONFIG';
import { IDataGridSetup, IDataTableColumn, IDataTableSetup, IEssentialData } from '../../../dataset_presenters/model';
import { DataPicker } from '../../../dataset_presenters/datapicker';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import { CrewPortrait } from '../../../dataset_presenters/elements/crewportrait';

import { IContestant } from '../model';
import { getCrewCritChance, getCrewSkillsScore, makeContestant } from '../utils';

interface IProficientCrew extends PlayerCrew {
	scored_contest: number;
	scored_command_skill: number;
	scored_diplomacy_skill: number;
	scored_engineering_skill: number;
	scored_medicine_skill: number;
	scored_science_skill: number;
	scored_security_skill: number;
	crit_chance: number;
	crit_potential: string[];
};

type ContestantPickerProps = {
	id: string;
	skills: string[];
	traits: string[] | undefined;
	traitPool: string[] | undefined;
	crewPool: PlayerCrew[];
	setContestant: (contestant: IContestant) => void;
	dismissPicker: () => void;
};

export const ContestantPicker = (props: ContestantPickerProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { skills, traits, traitPool, crewPool, setContestant, dismissPicker } = props;

	const gridSetup: IDataGridSetup = {
		renderGridColumn: (datum: IEssentialData) => <CrewPortrait crew={datum as PlayerCrew} />
	};

	const data = React.useMemo<IProficientCrew[]>(() => {
		return crewPool.map(crew => {
			const proficientCrew: IProficientCrew = oneCrewCopy(crew) as IProficientCrew;
			proficientCrew.scored_contest = getCrewSkillsScore(proficientCrew, skills);
			Object.keys(CONFIG.SKILLS).forEach(skill => {
				proficientCrew[`scored_${skill}`] = getCrewSkillsScore(proficientCrew, [skill]);
			});
			proficientCrew.crit_chance = traits && traits.length > 0 ? getCrewCritChance(proficientCrew, traits) : 0;
			proficientCrew.crit_potential = (traitPool ?? []).filter(critTrait =>
				proficientCrew.traits.includes(critTrait)
			);
			return proficientCrew;
		});
	}, [crewPool]);

	const columns: IDataTableColumn[] = [
		{	/* Crew */
			id: 'name',
			title: 'Crew',
			sortField: { id: 'name', stringValue: true },
			renderCell: (datum: IEssentialData) => renderCrewLabel(datum as PlayerCrew)
		},
		{	/* Score */
			id: 'scored_contest',
			title: 'Score',
			align: 'center',
			sortField: { id: 'scored_contest', firstSort: 'descending' },
			renderCell: (datum: IEssentialData) => renderContestScore(datum as IProficientCrew)
		}
	];
	if (traits && traits.length > 0) {
		columns.push(
			{	/* Crit Chance */
				id: 'crit_chance',
				title: 'Crit Chance',
				align: 'center',
				sortField: { id: 'crit_chance', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => <>{(datum as IProficientCrew).crit_chance}%</>
			}
		);
	}
	else if (traitPool && traitPool.length > 0) {
		columns.push(
			{
				id: 'crit_potential',
				title: <img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />,
				align: 'center',
				sortField: { id: 'crit_potential.length', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => renderCritPotential(datum as IProficientCrew)
			}
		);
	}
	Object.keys(CONFIG.SKILLS).sort((a, b) => {
		if (skills.includes(a) && !skills.includes(b)) return -1;
		if (skills.includes(b) && !skills.includes(a)) return 1;
		return 0;
	}).forEach(skill => {
		columns.push({
			id: skill,
			title: <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />,
			align: 'center',
			sortField: {
				id: `scored_${skill}`,
				firstSort: 'descending'
			},
			renderCell: (datum: IEssentialData) => renderCrewProficiency(datum as PlayerCrew, skill)
		});
	});

	const tableSetup: IDataTableSetup = {
		columns,
		rowsPerPage: 12,
		defaultSort: { id: 'scored_contest', firstSort: 'descending' }
	};

	return (
		<DataPicker
			id={`${props.id}/datapicker`}
			data={data}
			closePicker={(selectedIds: Set<number>) => selectContestant(selectedIds, crewPool, setContestant)}
			selection
			closeOnChange
			search
			searchPlaceholder='Search for contestant by name'
			renderPreface={renderPreface}
			gridSetup={gridSetup}
			tableSetup={tableSetup}
		/>
	);

	function renderPreface(): JSX.Element {
		return (
			<React.Fragment>
				Select a contestant to simulate in a {skills.map(skill => (
					<img key={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.2em', verticalAlign: 'middle' }} className='invertibleIcon' />
				))} contest. Scores are the sum of a crew's average proficiency after 3 rolls per contest skill.
				{traitPool && traitPool.length > 0 && (
					<span>
						{` `}<img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' /> represents a crew's number of potential crit traits.
					</span>
				)}
			</React.Fragment>
		);
	}

	function renderCrewLabel(crew: PlayerCrew): JSX.Element {
		return (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<CrewLabel crew={crew} />
				{crew.immortal > 0 && <Icon name='snowflake'/>}
			</div>
		);
	}

	function renderContestScore(crew: IProficientCrew): JSX.Element {
		if (crew.scored_contest === 0) return <></>;
		return <>{crew.scored_contest}</>;
	}

	function renderCritPotential(crew: IProficientCrew): JSX.Element {
		if (crew.crit_potential.length === 0) return <></>;
		const title: string = crew.crit_potential.map(critTrait => TRAIT_NAMES[critTrait]).join(', ');
		return (
			<div title={title}>
				{crew.crit_potential.length}
			</div>
		);
	}

	function renderCrewProficiency(crew: PlayerCrew, skill: string): JSX.Element {
		const crewSkill: Skill | undefined = crew.skills[skill];
		if (!crewSkill) return <></>;
		return (
			<React.Fragment>
				{crewSkill.range_min}-{crewSkill.range_max}
			</React.Fragment>
		);
	}

	function selectContestant(selectedIds: Set<number>, crewPool: PlayerCrew[], setContestant: (contestant: IContestant) => void): void {
		if (selectedIds.size > 0) {
			const selectedId: number = [...selectedIds][0];
			const crew: PlayerCrew | undefined = crewPool.find(crew =>
				crew.id === selectedId
			);
			if (crew) {
				setContestant(makeContestant(skills, traits ?? [], crew))
			}
		}
		dismissPicker();
	}
};
