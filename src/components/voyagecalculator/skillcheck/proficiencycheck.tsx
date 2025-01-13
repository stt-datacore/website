import React from 'react';
import {
	Button,
	Icon,
	Image,
	Message,
	Segment,
	Table
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

import CONFIG from '../../CONFIG';
import { IDataGridSetup, IDataMatrixField, IDataMatrixSetup, IEssentialData, IEssentialMatrixData } from '../../dataset_presenters/model';
import { DataGrid } from '../../dataset_presenters/datagrid';
import { DataMatrix } from '../../dataset_presenters/datamatrix';
import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';

import { IProspectiveConfig } from '../lineupeditor/model';

import { gauntletScore, getSkillPairData, ISkillPairData } from './skilldata';

type ProficiencyCheckProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
};

export const ProficiencyCheck = (props: ProficiencyCheckProps) => {
	const { id, voyageConfig } = props;

	const [layout, setLayout] = React.useState<string>('halfmatrix');

	const sortedSkills: string[] = [
		voyageConfig.skills.primary_skill,
		voyageConfig.skills.secondary_skill
	];
	Object.keys(CONFIG.SKILLS).filter(skill =>
		skill !== voyageConfig.skills.primary_skill
			&& skill !== voyageConfig.skills.secondary_skill
	).forEach(otherSkill => {
		sortedSkills.push(otherSkill);
	});

	const data = React.useMemo<ISkillPairData[]>(() => {
		return getSkillPairData(voyageConfig, sortedSkills);
	}, [voyageConfig]);

	return (
		<React.Fragment>
			<div>
				The numbers listed are, in order:
				<ol>
					<li>The sum of a crew's average proficiency after 3 contests per skill</li>
					<li>The number of contests per skill pair</li>
					<li>The potential number of crit bonuses per contest</li>
				</ol>
			</div>
			<div style={{ margin: '1em 0' }}>
				Toggle layout:{` `}
				<Button.Group>
					<Button icon='expand' color={layout === 'matrix' ? 'blue' : undefined} onClick={() => setLayout('matrix')} />
					<Button icon='compress' color={layout === 'halfmatrix' ? 'blue' : undefined} onClick={() => setLayout('halfmatrix')} />
					<Button icon='block layout' color={layout === 'grid' ? 'blue' : undefined} onClick={() => setLayout('grid')} />
				</Button.Group>
			</div>
			{(layout === 'matrix' || layout === 'halfmatrix') && (
				<ProficiencyMatrix
					id={`${id}/matrix`}
					voyageConfig={voyageConfig}
					data={data}
					sortedSkills={sortedSkills}
					halfMatrix={layout === 'halfmatrix'}
				/>
			)}
			{layout === 'grid' && (
				<ProficiencyGrid
					id={`${id}/grid`}
					voyageConfig={voyageConfig}
					data={data}
					sortedSkills={sortedSkills}
				/>
			)}
		</React.Fragment>
	);
};

type ProficiencyMatrixProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	data: ISkillPairData[];
	sortedSkills: string[];
	halfMatrix: boolean;
};

const ProficiencyMatrix = (props: ProficiencyMatrixProps) => {
	const { id, voyageConfig, data, sortedSkills, halfMatrix } = props;

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
		permutate: !halfMatrix
	};

	return (
		<React.Fragment>
			<DataMatrix
				id={`${id}/datamatrix`}
				setup={matrixSetup}
				data={data}
			/>
		</React.Fragment>
	);

	function renderSkillHeader(skill: string): JSX.Element {
		return (
			<React.Fragment>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
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
				<div><img width={36} src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`} /></div>
				{bestCrew.name}
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', columnGap: '.5em' }}>
					<span>
						{gauntletScore(bestCrew, datum.rowId, datum.columnId)}
					</span>
					<span>
						{getContestCount(bestCrew, datum.rowId, datum.columnId)}
					</span>
					<CrewCritTraits
						crew={bestCrew}
						critTraits={voyageConfig.event_content?.encounter_traits ?? []}
					/>
				</div>
			</React.Fragment>
		);
	}
};

type ProficiencyGridProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	data: ISkillPairData[];
	sortedSkills: string[];
};

const ProficiencyGrid = (props: ProficiencyGridProps) => {
	const { id, voyageConfig, data } = props;

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 3,
			stackable: true
		},
		renderGridColumn: (datum: IEssentialData) => renderGridColumn(datum as ISkillPairData),
		defaultSort: { id: 'coverage_count', firstSort: 'descending' }
	};

	return (
		<React.Fragment>
			<DataGrid
				id={`${id}/datagrid`}
				data={data}
				setup={gridSetup}
			/>
		</React.Fragment>
	);

	function renderGridColumn(datum: ISkillPairData): JSX.Element {
		return (
			<React.Fragment>
				<Message attached>
					<div style={{ display: 'flex', justifyContent: 'center' }}>
						<Image src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${datum.rowId}.png`} style={{ height: '1.5em' }} />
						{datum.rowId !== datum.columnId && (
							<Image src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${datum.columnId}.png`} style={{ height: '1.5em' }} />
						)}
					</div>
				</Message>
				<Segment attached>
					{renderCoverageTable(datum)}
				</Segment>
			</React.Fragment>
		);
	}

	function renderCoverageTable(datum: ISkillPairData): JSX.Element {
		return (
			<Table striped compact unstackable>
				<Table.Body>
					{datum.coverage.map(crew => (
						<Table.Row key={crew.id}>
							<Table.Cell>
								<CrewLabel crew={crew} />
							</Table.Cell>
							<Table.Cell textAlign='right'>
								{gauntletScore(crew, datum.rowId, datum.columnId)}
							</Table.Cell>
							<Table.Cell textAlign='center'>
								{getContestCount(crew, datum.rowId, datum.columnId)}
							</Table.Cell>
							<Table.Cell textAlign='center'>
								<CrewCritTraits
									crew={crew}
									critTraits={voyageConfig.event_content?.encounter_traits ?? []}
								/>
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
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

	return (
		<span>
			{crewCritTraits.map(trait => (
				<img key={trait}
					title={TRAIT_NAMES[trait]}
					src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_shipability_overcharge.png`}
					style={{ height: '1em' }}
					className='invertibleIcon'
				/>
			))}
		</span>
	)
};

function getContestCount(crew: PlayerCrew, skillA: string, skillB): number {
	let contests: number = 0;
	if (Object.keys(crew.base_skills).includes(skillA))
		contests += 3;
	if (skillA !== skillB && Object.keys(crew.base_skills).includes(skillB))
		contests += 3;
	return contests;
}
