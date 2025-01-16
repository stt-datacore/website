import React from 'react';
import {
	Button,
	Icon,
	Image,
	Label,
	Message,
	Popup,
	Segment,
	Table
} from 'semantic-ui-react';

import { Skill } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

import CONFIG from '../../CONFIG';
import { IDataGridSetup, IDataMatrixField, IDataMatrixSetup, IEssentialData, IEssentialMatrixData } from '../../dataset_presenters/model';
import { DataGrid } from '../../dataset_presenters/datagrid';
import { DataMatrix } from '../../dataset_presenters/datamatrix';
import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';

import { POPUP_DELAY } from '../utils';
import { IProspectiveConfig } from '../lineupeditor/model';

import { gauntletScore, getSkillPairData, ISkillPairData } from './skilldata';

export interface IProficiencyContext {
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	sortedSkills: string[];
	data: ISkillPairData[];
};

const ProficiencyContext = React.createContext<IProficiencyContext>({} as IProficiencyContext);

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

	const proficiencyContext: IProficiencyContext = {
		voyageConfig,
		sortedSkills,
		data
	};

	return (
		<ProficiencyContext.Provider value={proficiencyContext}>
			<React.Fragment>
				<div>
					The skill score is the crew's max proficiency for that skill. The gauntlet score is the sum of the crew's average proficiency after 3 rolls per skill.{` `}
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_shipability_overcharge.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' /> represents the number of potential crit bonuses per roll.
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
						halfMatrix={layout === 'halfmatrix'}
					/>
				)}
				{layout === 'grid' && (
					<ProficiencyGrid
						id={`${id}/grid`}
					/>
				)}
			</React.Fragment>
		</ProficiencyContext.Provider>
	);
};

type ProficiencyMatrixProps = {
	id: string;
	halfMatrix: boolean;
};

const ProficiencyMatrix = (props: ProficiencyMatrixProps) => {
	const { voyageConfig, sortedSkills, data } = React.useContext(ProficiencyContext);
	const { id, halfMatrix } = props;

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
				<div>
					<CrewProficiencies
						crew={bestCrew}
						skillA={datum.rowId}
						skillB={datum.columnId}
					/>
				</div>
				<div>
					<CrewExpectedRange
						crew={bestCrew}
						skillA={datum.rowId}
						skillB={datum.columnId}
						trigger={(
							<Label style={{ cursor: 'help' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '.2em' }}>
									<img src='/media/gauntlet.png' style={{ height: '1em' }} className='invertibleIcon' />
									{gauntletScore(bestCrew, datum.rowId, datum.columnId)}
								</div>
							</Label>
						)}
					/>
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
};

const ProficiencyGrid = (props: ProficiencyGridProps) => {
	const { voyageConfig, data } = React.useContext(ProficiencyContext);
	const { id } = props;

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 2,
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
		const singleSkill: boolean = datum.rowId === datum.columnId;
		return (
			<div style={{ overflowX: 'auto' }}>
				<Table striped compact unstackable>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>
								Crew
							</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${datum.rowId}.png`} style={{ height: '1em' }} className='invertibleIcon' />
							</Table.HeaderCell>
							{!singleSkill && (
								<Table.HeaderCell textAlign='center'>
									<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${datum.columnId}.png`} style={{ height: '1em' }} className='invertibleIcon' />
								</Table.HeaderCell>
							)}
							<Table.HeaderCell textAlign='center'>
								<img src='/media/gauntlet.png' style={{ height: '1em' }} className='invertibleIcon' />
							</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_shipability_overcharge.png`} style={{ height: '1em' }} className='invertibleIcon' />
							</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{datum.coverage.map(crew => (
							<Table.Row key={crew.id}>
								<Table.Cell>
									<CrewLabel crew={crew} />
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{crew.skills[datum.rowId]?.range_max ?? ''}
								</Table.Cell>
								{!singleSkill && (
									<Table.Cell textAlign='center'>
										{crew.skills[datum.columnId]?.range_max ?? ''}
									</Table.Cell>
								)}
								<Table.Cell textAlign='center'>
									<CrewExpectedRange
										crew={crew}
										skillA={datum.rowId}
										skillB={datum.columnId}
										trigger={(
											<span style={{ cursor: 'help' }}>
												{gauntletScore(crew, datum.rowId, datum.columnId)}
											</span>
										)}
									/>
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
			</div>
		);
	}
};

type CrewProficienciesProps = {
	crew: PlayerCrew;
	skillA: string;
	skillB: string;
};

const CrewProficiencies = (props: CrewProficienciesProps) => {
	const { crew, skillA, skillB } = props;
	const skills: string[] = [];
	if (Object.keys(crew.base_skills).includes(skillA))
		skills.push(skillA);
	if (skillA !== skillB && Object.keys(crew.base_skills).includes(skillB))
		skills.push(skillB);

	return (
		<Label.Group>
			{skills.map(skill => (
				<Label key={skill}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2em' }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em' }} className='invertibleIcon' />
						<span>{crew.skills[skill].range_max}</span>
					</div>
				</Label>
			))}
		</Label.Group>
	);
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
		<span style={{ whiteSpace: 'nowrap' }}>
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

type CrewExpectedRangeProps = {
	crew: PlayerCrew;
	skillA: string;
	skillB: string;
	trigger: JSX.Element;
};

const CrewExpectedRange = (props: CrewExpectedRangeProps) => {
	const { crew, skillA, skillB, trigger } = props;

	const a: Skill | undefined = crew.skills[skillA];
	const b: Skill | undefined = crew.skills[skillB];

	let minScore: number = (a?.range_min ?? 0) * 3;
	if (skillA !== skillB) minScore += (b?.range_min ?? 0) * 3;

	let maxScore: number = (a?.range_max ?? 0) * 3;
	if (skillA !== skillB) maxScore += (b?.range_max ?? 0) * 3;

	return (
		<Popup
			mouseEnterDelay={POPUP_DELAY}
			position='bottom center'
			trigger={trigger}
		>
			<Popup.Content>
				Expected range: {minScore} - {maxScore}
			</Popup.Content>
		</Popup>
	);
};
