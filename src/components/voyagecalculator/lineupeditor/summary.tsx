import React from 'react';
import {
	Button,
	Grid,
	Header,
	Icon,
	Message,
	Modal,
	Segment,
	Table
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { Estimate } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { IDataGridSetup, IEssentialData } from '../../dataset_presenters/model';
import { DataGrid } from '../../dataset_presenters/datagrid';
import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';
import { NumericDiff } from '../../dataset_presenters/elements/numericdiff';
import ItemDisplay from '../../itemdisplay';

import { getSkillData, ISkillData } from '../skillcheck/skilldata';
import { SkillDetail } from '../skillcheck/skilldetail';

import { IControlVoyage, IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { EditorContext } from './context';
import { getCrewTraitBonus } from '../utils';

type ProspectiveSummaryProps = {
	control: IControlVoyage | undefined;
	saveVoyage: () => void;
	resetVoyage: () => void;
};

export const ProspectiveSummary = (props: ProspectiveSummaryProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig, prospectiveEstimate, renderActions, dismissEditor } = React.useContext(EditorContext);
	const { control, saveVoyage, resetVoyage } = props;

	const isEdited = React.useMemo<boolean>(() => {
		if (!control) return false;
		let isEdited: boolean = false;
		prospectiveConfig.crew_slots.forEach((cs, slotId) => {
			if (!cs.crew || cs.crew.id !== control.config.crew_slots[slotId].crew.id)
				isEdited = true;
		});
		return isEdited;
	}, [prospectiveConfig]);

	const isValidConfig = React.useMemo<boolean>(() => {
		let isValid: boolean = true;
		prospectiveConfig.crew_slots.forEach(cs => {
			if (!cs.crew) isValid = false;
		});
		return isValid;
	}, [prospectiveConfig]);

	return (
		<Modal
			open={true}
			onClose={() => dismissEditor()}
			centered={false}
		>
			<Modal.Header	/* Prospective Voyage */>
				Prospective Voyage
			</Modal.Header>
			<Modal.Content scrolling>
				{renderTopLines()}
				<ProspectiveCrewSlots control={control} />
				<ProspectiveSkillCheck control={isEdited ? control : undefined} />
			</Modal.Content>
			<Modal.Actions>
				{renderActions()}
			</Modal.Actions>
		</Modal>
	);

	function renderTopLines(): JSX.Element {
		if (!prospectiveEstimate) return <></>;
		return (
			<React.Fragment>
				<Message attached={!!control && isEdited}>
					<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<p>
								{tfmt('voyage.estimate.estimate_time', {
									time: <b>{formatTime(prospectiveEstimate.refills[0].result, t)}</b>
								})}
								{` `}
								{t('voyage.estimate.expected_range', {
									a: formatTime(prospectiveEstimate.refills[0].saferResult, t),
									b: formatTime(prospectiveEstimate.refills[0].moonshotResult, t)
								})}
							</p>
							{!isValidConfig && (
								<p><Icon name='exclamation triangle' color='yellow' /> Please assign crew to all voyage seats.</p>
							)}
						</div>
						{isEdited && (
							<div>
								<Button	/* Save as new recommendation */
									content='Save as new recommendation'
									color={isValidConfig ? 'green' : undefined}
									size='large'
									disabled={!isValidConfig}
									onClick={() => saveVoyage()}
								/>
							</div>
						)}
					</div>
				</Message>
				{control && isEdited && (
					<Segment attached>
						<p>Compared to the existing recommendation:</p>
						<Grid columns={2} stackable>
							<Grid.Column>
								<EstimatesCompared
									current={prospectiveEstimate}
									baseline={control.estimate}
								/>
							</Grid.Column>
							<Grid.Column>
								<BonusesCompared
									current={prospectiveConfig}
									baseline={control.config}
								/>
							</Grid.Column>
						</Grid>
						<div style={{ marginTop: '1em', textAlign: 'right' }}>
							<Button	/* Reset to existing recommendation */
								content='Reset to existing recommendation'
								onClick={() => resetVoyage()}
							/>
						</div>
					</Segment>
				)}
			</React.Fragment>
		);
	}
};

interface IComparisonRow {
	field: string;
	title: string;
	renderValue?: (value: number) => JSX.Element;
	condition: boolean;
};

type EstimatesComparedProps = {
	current: Estimate;
	baseline: Estimate;
};

const EstimatesCompared = (props: EstimatesComparedProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { current, baseline } = props;

	const renderAsTime = (value: number) => <>{formatTime(value, t)}</>;
	const renderAsPercent = (value: number) => <>{Math.round(value)}%</>;

	const rows: IComparisonRow[] = [
		{	/* Estimate */
			field: 'result',
			title: 'Estimate',
			renderValue: renderAsTime,
			condition: true
		},
		{	/* Guaranteed minimum */
			field: 'saferResult',
			title: 'Guaranteed minimum',
			renderValue: renderAsTime,
			condition: true
		},
		{	/* Moonshot */
			field: 'moonshotResult',
			title: 'Moonshot',
			renderValue: renderAsTime,
			condition: true
		},
		{	/* LAST_DILh chance */
			field: 'dilChance',
			title: `${current.refills[0].lastDil}h chance`,
			renderValue: renderAsPercent,
			condition: current.refills[0].lastDil === baseline.refills[0].lastDil
		}
	];

	return (
		<Table striped>
			<Table.Body>
				{rows.filter(row => row.condition).map(row => (
					<Table.Row key={row.field}>
						<Table.Cell>
							{row.title}:
						</Table.Cell>
						<Table.Cell textAlign='right'>
							<NumericDiff
								compare={{
									currentValue: current.refills[0][row.field],
									baselineValue: baseline.refills[0][row.field],
									showCurrentValue: true
								}}
								customRender={row.renderValue}
								showNoChange
								justifyContent='right'
							/>
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);
};

type BonusesComparedProps = {
	current: IProspectiveConfig;
	baseline: IProspectiveConfig;
};

const BonusesCompared = (props: BonusesComparedProps) => {
	const { current, baseline } = props;

	const rows: IComparisonRow[] = [
		{	/* Antimatter */
			field: 'max_hp',
			title: 'Antimatter',
			renderValue: renderAm,
			condition: true
		}
	];

	return (
		<Table striped>
			<Table.Body>
				{rows.filter(row => row.condition).map(row => (
					<Table.Row key={row.field}>
						<Table.Cell>
							{row.title}:
						</Table.Cell>
						<Table.Cell textAlign='right'>
							<NumericDiff
								compare={{
									currentValue: current[row.field],
									baselineValue: baseline[row.field],
									showCurrentValue: true
								}}
								customRender={row.renderValue}
								showNoChange
								justifyContent='right'
							/>
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);
};

type ProspectiveCrewSlotsProps = {
	control: IControlVoyage | undefined;
};

const ProspectiveCrewSlots = (props: ProspectiveCrewSlotsProps) => {
	const { prospectiveConfig } = React.useContext(EditorContext);
	const { control } = props;

	return (
		<React.Fragment>
			<Header as='h3'>Prospective Lineup</Header>
			<Grid columns={2} centered stackable>
				<Grid.Column>
					{renderSimpleTable(prospectiveConfig.crew_slots.slice(0, 6))}
				</Grid.Column>
				<Grid.Column>
					{renderSimpleTable(prospectiveConfig.crew_slots.slice(6, 12))}
				</Grid.Column>
			</Grid>
		</React.Fragment>
	);

	function renderSimpleTable(crewSlots: IProspectiveCrewSlot[]): JSX.Element {
		return (
			<Table striped unstackable compact>
				<Table.Body>
					{crewSlots.map(cs => (
						<Table.Row key={cs.name}>
							<Table.Cell textAlign='center'>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${cs.skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
							</Table.Cell>
							<Table.Cell>
								{renderCrew(cs)}
							</Table.Cell>
							<Table.Cell textAlign='right'>
								{cs.crew && renderBonus(cs)}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		);
	}

	function renderCrew(crewSlot: IProspectiveCrewSlot): JSX.Element {
		const controlCrew: PlayerCrew | undefined = control?.config.crew_slots.find(cs => cs.symbol === crewSlot.symbol)?.crew;
		const editedSlot: boolean = !crewSlot.crew || (!!controlCrew && controlCrew.id !== crewSlot.crew.id);
		return (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				{editedSlot && controlCrew && (
					<React.Fragment>
						{renderCrewAvatar(controlCrew)}
						<Icon name='arrow right' />
					</React.Fragment>
				)}
				{crewSlot.crew && <CrewLabel crew={crewSlot.crew} />}
				{!crewSlot.crew && (
					<React.Fragment>
						<Icon name='exclamation triangle' color='yellow' size='large' /> (Unassigned)
					</React.Fragment>
				)}
			</div>
		);
	}

	function renderCrewAvatar(crew: PlayerCrew): JSX.Element {
		const imageUrlPortrait: string = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
		return (
			<ItemDisplay
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={32}
				maxRarity={crew.max_rarity}
				rarity={crew.rarity}
			/>
		);
	}

	function renderBonus(crewSlot: IProspectiveCrewSlot): JSX.Element {
		const controlCrew: PlayerCrew | undefined = control?.config.crew_slots.find(cs => cs.symbol === crewSlot.symbol)?.crew;
		const controlBonus: number = controlCrew ? getCrewTraitBonus(prospectiveConfig, controlCrew, crewSlot.trait) : 0;

		const editedSlot: boolean = !crewSlot.crew || (!!controlCrew && controlCrew.id !== crewSlot.crew.id);

		if (!editedSlot)
			return controlBonus > 0 ? renderAm(controlBonus) : <></>;

		const editedBonus: number = crewSlot.crew ? getCrewTraitBonus(prospectiveConfig, crewSlot.crew, crewSlot.trait) : 0;

		return (
			<NumericDiff
				compare={{
					currentValue: editedBonus,
					baselineValue: controlBonus,
					showCurrentValue: true
				}}
				customRender={renderAm}
				justifyContent='right'
			/>
		);
	}
};

type ProspectiveSkillCheckProps = {
	control: IControlVoyage | undefined;
};

const ProspectiveSkillCheck = (props: ProspectiveSkillCheckProps) => {
	const { prospectiveConfig } = React.useContext(EditorContext);
	const { control } = props;

	const data = React.useMemo<ISkillData[]>(() => {
		return getSkillData(prospectiveConfig);
	}, [prospectiveConfig]);

	const controlData = React.useMemo<ISkillData[] | undefined>(() => {
		if (!control) return;
		return getSkillData(control.config);
	}, [control]);

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 3,
			stackable: true
		},
		renderGridColumn: (datum: IEssentialData) => renderSkill(datum as ISkillData),
		defaultSort: { id: 'score', firstSort: 'descending' }
	};

	return (
		<React.Fragment>
			<Header as='h3'>Prospective Skill Check</Header>
			<DataGrid
				id='prospectiveskillcheck'
				data={data}
				setup={gridSetup}
			/>
		</React.Fragment>
	);

	function renderSkill(skillData: ISkillData): JSX.Element {
		const controlSkillData: ISkillData | undefined = controlData?.find(od =>
			od.skill === skillData.skill
		);
		return (
			<SkillDetail
				voyageConfig={prospectiveConfig}
				currentData={skillData}
				baselineData={controlSkillData}
			/>
		);
	}
};

function renderAm(value: number): JSX.Element {
	return (
		<React.Fragment>
			{value} <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
		</React.Fragment>
	);
}
