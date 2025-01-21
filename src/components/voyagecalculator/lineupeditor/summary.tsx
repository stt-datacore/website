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
import { Estimate, IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';
import { NumericDiff } from '../../dataset_presenters/elements/numericdiff';
import { AvatarView } from '../../item_presenters/avatarview';

import { getCrewTraitBonus, getCrewEventBonus } from '../utils';
import { SkillCheck } from '../skillcheck/skillcheck';
import { ProficiencyCheck } from '../skillcheck/proficiencycheck';

import { IControlVoyage, IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { EditorContext } from './context';

type ProspectiveSummaryProps = {
	control: IControlVoyage | undefined;
	saveVoyage: () => void;
	resetVoyage: () => void;
};

export const ProspectiveSummary = (props: ProspectiveSummaryProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig, prospectiveEstimate, seekAlternateCrew, renderActions, dismissEditor } = React.useContext(EditorContext);
	const { control, saveVoyage, resetVoyage } = props;

	const [highlightedSkills, setHighlightedSkills] = React.useState<string[]>([]);

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
				<ProspectiveCrewSlots
					highlightedSkills={highlightedSkills}
					control={control}
					onClick={(cs: IProspectiveCrewSlot) => seekAlternateCrew(cs)}
				/>
				<ProspectiveSkillCheck
					control={isEdited ? control : undefined}
					highlightedSkills={highlightedSkills}
					setHighlightedSkills={setHighlightedSkills}
				/>
				{prospectiveConfig.voyage_type === 'encounter' &&  <ProspectiveProficiency />}
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
						<div>
							{isEdited && (
								<Button	/* Save as new recommendation */
									content='Save as new recommendation'
									color={isValidConfig ? 'green' : undefined}
									size='large'
									disabled={!isValidConfig}
									onClick={() => saveVoyage()}
								/>
							)}
						</div>
					</div>
				</Message>
				{control && isEdited && (
					<Segment attached='bottom'>
						<p>Compared to the existing recommendation:</p>
						<ToplinesCompared
							currentConfig={prospectiveConfig}
							currentEstimate={prospectiveEstimate}
							baselineConfig={control.config}
							baselineEstimate={control.estimate}
						/>
						<div style={{ marginTop: '2em', display: 'flex', justifyContent: 'flex-end', columnGap: '1em' }}>
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

interface IToplines {
	key: string;
	title: string;
	currentValue: number;
	baselineValue: number;
	renderValue?: (value: number) => JSX.Element;
};

type ToplinesComparedProps = {
	currentConfig: IProspectiveConfig;
	currentEstimate: Estimate;
	baselineConfig: IVoyageCalcConfig;
	baselineEstimate: Estimate;
};

const ToplinesCompared = (props: ToplinesComparedProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { currentConfig, currentEstimate, baselineConfig, baselineEstimate } = props;

	const renderAsTime = (value: number) => <>{formatTime(value, t)}</>;
	const renderAsPercent = (value: number) => <>{Math.round(value)}%</>;

	const toplines: IToplines[] = [
		{	/* Estimate */
			key: 'result',
			title: 'Estimate',
			currentValue: currentEstimate.refills[0].result,
			baselineValue: baselineEstimate.refills[0].result,
			renderValue: renderAsTime
		},
		{	/* Guaranteed minimum */
			key: 'saferResult',
			title: 'Guaranteed minimum',
			currentValue: currentEstimate.refills[0].saferResult,
			baselineValue: baselineEstimate.refills[0].saferResult,
			renderValue: renderAsTime
		},
		{	/* Moonshot */
			key: 'moonshotResult',
			title: 'Moonshot',
			currentValue: currentEstimate.refills[0].moonshotResult,
			baselineValue: baselineEstimate.refills[0].moonshotResult,
			renderValue: renderAsTime
		}
	];

	if (currentEstimate.refills[0].lastDil === baselineEstimate.refills[0].lastDil) {
		toplines.push(
			{	/* LAST_DILh chance */
				key: 'dilChance',
				title: `${currentEstimate.refills[0].lastDil}h chance`,
				currentValue: currentEstimate.refills[0].dilChance,
				baselineValue: baselineEstimate.refills[0].dilChance,
				renderValue: renderAsPercent
			}
		);
	}

	if (currentConfig.voyage_type === 'encounter') {
		toplines.push(
			{	/* Projected VP */
				key: 'projected_vp',
				title: 'Projected VP',
				currentValue: currentEstimate.vpDetails?.total_vp ?? 0,
				baselineValue: baselineEstimate.vpDetails?.total_vp ?? 0,
				renderValue: renderVP
			},
			{	/* Event crew bonus */
				key: 'event_bonus',
				title: 'Event crew bonus',
				currentValue: Math.round(currentConfig.crew_slots.reduce((prev, curr) => prev + (curr.crew ? getCrewEventBonus(currentConfig, curr.crew) : 0), 0) * 100),
				baselineValue: Math.round(baselineConfig.crew_slots.reduce((prev, curr) => prev + getCrewEventBonus(baselineConfig, curr.crew), 0) * 100),
				renderValue: renderAsPercent
			}
		);
	}

	toplines.push(
		{	/* Antimatter */
			key: 'max_hp',
			title: 'Antimatter',
			currentValue: currentConfig.max_hp,
			baselineValue: baselineConfig.max_hp,
			renderValue: renderAntimatter
		}
	);

	const maxRows: number = Math.round(toplines.length / 2);
	const tables: IToplines[][] = [
		toplines.slice(0, maxRows),
		toplines.slice(maxRows)
	];

	return (
		<Grid columns={2} stackable>
			{tables.map((table, idx) => (
				<Grid.Column key={idx}>
					<Table striped>
						<Table.Body>
							{table.map(row => (
								<Table.Row key={row.key}>
									<Table.Cell>
										{row.title}:
									</Table.Cell>
									<Table.Cell textAlign='right'>
										<NumericDiff
											compare={{
												currentValue: row.currentValue,
												baselineValue: row.baselineValue,
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
				</Grid.Column>
			))}
		</Grid>
	);
};

type ProspectiveCrewSlotsProps = {
	control: IControlVoyage | undefined;
	onClick: (slot: IProspectiveCrewSlot) => void;
	highlightedSkills: string[];
};

const ProspectiveCrewSlots = (props: ProspectiveCrewSlotsProps) => {
	const { prospectiveConfig, seekAlternateCrew } = React.useContext(EditorContext);
	const { control, onClick, highlightedSkills } = props;

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Lineup</Header>
			<p>
				<Button	/* Search for alternate crew */
					icon='search'
					content='Search for alternate crew'
					onClick={() => seekAlternateCrew()}
				/>
				{` `} or tap any crew below to view alternate crew for that seat.
			</p>
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
			<Table selectable striped unstackable compact>
				<Table.Body>
					{crewSlots.map((cs, csIdx) => {
						let bg: string | undefined = undefined;
						if (cs.crew && highlightedSkills) {
							if (highlightedSkills.length && highlightedSkills.every(skill => cs.crew?.skill_order.includes(skill))) {
								if (csIdx % 2) {
									bg = 'forestgreen';
								}
								else {
									bg = 'darkgreen';
								}
							}
						}
						return (
							<Table.Row
								key={cs.name}
								style={{ cursor: 'pointer', backgroundColor: bg }}
								onClick={() => onClick(cs)}
							>
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
						)
					})}
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
						<AvatarView mode='crew' item={controlCrew} size={32} />
						<Icon name='arrow right' />
					</React.Fragment>
				)}
				{crewSlot.crew && <CrewLabel crew={crewSlot.crew} />}
				{!crewSlot.crew && (
					<React.Fragment>
						<Icon name='exclamation triangle' color='yellow' size='large' /> (Unassigned)
					</React.Fragment>
				)}
				{!!highlightedSkills.length && highlightedSkills.every(skill => crewSlot.crew?.skill_order.includes(skill)) && <Icon name='check' />}
			</div>
		);
	}

	function renderBonus(crewSlot: IProspectiveCrewSlot): JSX.Element {
		const controlCrew: PlayerCrew | undefined = control?.config.crew_slots.find(cs => cs.symbol === crewSlot.symbol)?.crew;
		const controlBonus: number = controlCrew ? getCrewTraitBonus(prospectiveConfig, controlCrew, crewSlot.trait) : 0;

		const editedSlot: boolean = !crewSlot.crew || (!!controlCrew && controlCrew.id !== crewSlot.crew.id);

		if (!editedSlot)
			return controlBonus > 0 ? renderAntimatter(controlBonus) : <></>;

		const editedBonus: number = crewSlot.crew ? getCrewTraitBonus(prospectiveConfig, crewSlot.crew, crewSlot.trait) : 0;

		return (
			<NumericDiff
				compare={{
					currentValue: editedBonus,
					baselineValue: controlBonus,
					showCurrentValue: true
				}}
				showNoChange
				customRender={renderAntimatter}
				justifyContent='right'
			/>
		);
	}
};

type ProspectiveSkillCheckProps = {
	control: IControlVoyage | undefined;
	highlightedSkills: string[];
	setHighlightedSkills: (value: string[]) => void;
};

const ProspectiveSkillCheck = (props: ProspectiveSkillCheckProps) => {
	const { prospectiveConfig } = React.useContext(EditorContext);
	const { control, highlightedSkills, setHighlightedSkills } = props;
	return (
		<React.Fragment>
			<Header as='h4'>Prospective Skill Check</Header>
			<SkillCheck
				highlightedSkills={highlightedSkills}
				setHighlightedSkills={setHighlightedSkills}
				id='prospective/skillcheck'
				voyageConfig={prospectiveConfig}
				baselineConfig={control?.config}
			/>
		</React.Fragment>
	);
};

const ProspectiveProficiency = () => {
	const { prospectiveConfig } = React.useContext(EditorContext);

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Proficiency</Header>
			<ProficiencyCheck
				id='prospective/proficiencycheck'
				voyageConfig={prospectiveConfig}
			/>
		</React.Fragment>
	);
};

function renderAntimatter(value: number): JSX.Element {
	return (
		<React.Fragment>
			{value} <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
		</React.Fragment>
	);
}

function renderVP(value: number): JSX.Element {
	return (
		<React.Fragment>
			{value.toLocaleString()} <img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
		</React.Fragment>
	);
}
