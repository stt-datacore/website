import React from 'react';
import {
	Icon,
	Image,
	Label
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';

import { IDataMatrixField, IDataMatrixSetup, IEssentialMatrixData } from '../../../dataset_presenters/model';
import { DataMatrix } from '../../../dataset_presenters/datamatrix';;

import { crewIsShortSkilled, getCrewSkillsScore } from '../utils';

import { ProficiencyContext } from './context';
import { ISkillPairData } from './data';

type ProficiencyMatrixProps = {
	id: string;
	halfMatrix: boolean;
};

export const ProficiencyMatrix = (props: ProficiencyMatrixProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig, sortedSkills, data, simulateContest } = React.useContext(ProficiencyContext);

	const fields: IDataMatrixField[] = sortedSkills.map(skill => {
		return {
			id: skill,
			title: renderSkillHeader(skill),
			align: 'center'
		};
	});

	const matrixSetup: IDataMatrixSetup = {
		rows: fields,
		columns: fields.slice().reverse(),
		renderCell: (datum: IEssentialMatrixData) => renderMatrixCell(datum as ISkillPairData),
		permutate: !props.halfMatrix
	};

	return (
		<React.Fragment>
			<DataMatrix
				id={`${props.id}/datamatrix`}
				setup={matrixSetup}
				data={data}
			/>
		</React.Fragment>
	);

	function renderSkillHeader(skill: string): JSX.Element {
		return (
			<React.Fragment>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				{voyageConfig.skills.primary_skill === skill && <Icon name='star' color='yellow' />}
				{voyageConfig.skills.secondary_skill === skill && <Icon name='star' color='grey' />}
			</React.Fragment>
		);
	}

	function renderMatrixCell(datum: ISkillPairData): JSX.Element {
		if (datum.coverage.length === 0) return <></>;
		const bestCrew: PlayerCrew = datum.coverage[0];
		const imageUrlPortrait: string = bestCrew.imageUrlPortrait ?? `${bestCrew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
		return (
			<React.Fragment>
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<Image src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`} style={{ height: '36px' }} />
				</div>
				<div>{bestCrew.name}</div>
				<Label.Group>
					<Label	/* Simulate contest */
						style={{ cursor: 'pointer' }}
						onClick={() => simulateContest({ skills: [datum.rowId, datum.columnId], crew: bestCrew })}
						title={t('voyage.contests.simulate_contest')}
					>
						{getCrewSkillsScore(bestCrew, [datum.rowId, datum.columnId])}
						{crewIsShortSkilled(bestCrew, [datum.rowId, datum.columnId]) && <>*</>}
					</Label>
					<CrewCritTraits
						crew={bestCrew}
						critTraits={voyageConfig.event_content?.encounter_traits ?? []}
					/>
				</Label.Group>
			</React.Fragment>
		);
	}
};

type CrewCritTraitsProps = {
	crew: PlayerCrew;
	critTraits: string[];
};

const CrewCritTraits = (props: CrewCritTraitsProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { crew, critTraits } = props;

	const crewCritTraits: string[] = critTraits.filter(critTrait => crew.traits.includes(critTrait));
	if (crewCritTraits.length === 0) return <></>;

	const title: string = crewCritTraits.map(critTrait => TRAIT_NAMES[critTrait]).join(', ');

	return (
		<Label>
			<div style={{ display: 'flex', alignItems: 'center' }} title={title}>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: '.9em', verticalAlign: 'middle' }} className='invertibleIcon' />
				{crewCritTraits.length}
			</div>
		</Label>
	);
};
