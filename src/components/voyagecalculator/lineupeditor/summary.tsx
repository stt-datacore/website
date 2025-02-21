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
import { Estimate, IVoyageCalcConfig, IVoyageCrew } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { CrewLabel } from '../../dataset_presenters/elements/crewlabel';
import { NumericDiff } from '../../dataset_presenters/elements/numericdiff';
import { AvatarView } from '../../item_presenters/avatarview';

import { getCrewTraitBonus, getCrewEventBonus } from '../utils';
import { SkillCheck } from '../skillcheck/skillcheck';
import { ProficiencyCheck } from '../encounters/proficiencycheck/proficiencycheck';

import { IControlVoyage, IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { EditorContext } from './context';

type ProspectiveSummaryProps = {
	roster: IVoyageCrew[];
	control: IControlVoyage | undefined;
	saveVoyage: () => void;
	resetVoyage: () => void;
};

export const ProspectiveSummary = (props: ProspectiveSummaryProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig, prospectiveEstimate, seekAlternateCrew, renderActions, dismissEditor } = React.useContext(EditorContext);
	const { roster, control, saveVoyage, resetVoyage } = props;

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
				{t('voyage.editor.prospective.voyage')}
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
				{prospectiveConfig.voyage_type === 'encounter' &&  (
					<ProspectiveProficiency roster={roster} />
				)}
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
								<p><Icon name='exclamation triangle' color='yellow' /> {t('voyage.editor.missing_voyagers_message')}</p>
							)}
						</div>
						<div>
							{isEdited && (
								<Button	/* Save as new recommendation */
									content={t('voyage.editor.save_recommendation')}
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
					<Segment attached='bottom'	/* Compared to the existing recommendation: */>
						<p>{t('voyage.editor.compared')}</p>
						<ToplinesCompared
							currentConfig={prospectiveConfig}
							currentEstimate={prospectiveEstimate}
							baselineConfig={control.config}
							baselineEstimate={control.estimate}
						/>
						<div style={{ marginTop: '2em', display: 'flex', justifyContent: 'flex-end', columnGap: '1em' }}>
							<Button	/* Reset to existing recommendation */
								content={t('voyage.editor.reset_recommendation')}
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
			title: t('voyage.estimate.estimate'),
			currentValue: currentEstimate.refills[0].result,
			baselineValue: baselineEstimate.refills[0].result,
			renderValue: renderAsTime
		},
		{	/* Guaranteed Minimum */
			key: 'saferResult',
			title: t('voyage.estimate.fields.minimum'),
			currentValue: currentEstimate.refills[0].saferResult,
			baselineValue: baselineEstimate.refills[0].saferResult,
			renderValue: renderAsTime
		},
		{	/* Moonshot */
			key: 'moonshotResult',
			title: t('voyage.estimate.fields.moonshot'),
			currentValue: currentEstimate.refills[0].moonshotResult,
			baselineValue: baselineEstimate.refills[0].moonshotResult,
			renderValue: renderAsTime
		}
	];

	if (currentEstimate.refills[0].lastDil === baselineEstimate.refills[0].lastDil) {
		toplines.push(
			{	/* LAST_DILh Chance */
				key: 'dilChance',
				title: t('voyage.estimate.fields.h_dilemma_chance', { h: currentEstimate.refills[0].lastDil }),
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
				title: t('voyage.estimate.fields.total_vp'),
				currentValue: currentEstimate.vpDetails?.total_vp ?? 0,
				baselineValue: baselineEstimate.vpDetails?.total_vp ?? 0,
				renderValue: renderVP
			},
			{	/* Event Crew Bonus */
				key: 'event_bonus',
				title: t('voyage.estimate.fields.event_crew_bonus'),
				currentValue: Math.round(currentConfig.crew_slots.reduce((prev, curr) => prev + (curr.crew ? getCrewEventBonus(currentConfig, curr.crew) : 0), 0) * 100),
				baselineValue: Math.round(baselineConfig.crew_slots.reduce((prev, curr) => prev + getCrewEventBonus(baselineConfig, curr.crew), 0) * 100),
				renderValue: renderAsPercent
			}
		);
	}

	toplines.push(
		{	/* Antimatter */
			key: 'max_hp',
			title: t('ship.antimatter'),
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
										{row.title}{t('global.colon')}
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
	const { t } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig, seekAlternateCrew } = React.useContext(EditorContext);
	const { control, onClick, highlightedSkills } = props;

	return (
		<React.Fragment>
			<Header	/* Prospective Lineup */
				as='h4'
			>
				{t('voyage.editor.prospective.lineup')}
			</Header>
			<p>
				<Button	/* Search for alternate crew */
					icon='search'
					content={t('voyage.editor.search_for_alternates')}
					onClick={() => seekAlternateCrew()}
				/>
				{` `}{t('voyage.editor.target_view_alternates')}
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
	const { t } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig } = React.useContext(EditorContext);
	const { control, highlightedSkills, setHighlightedSkills } = props;
	return (
		<React.Fragment>
			<Header	/* Prospective Skill Check */
				as='h4'
			>
				{t('voyage.editor.prospective.skill_check')}
			</Header>
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

type ProspectiveProficiencyProps = {
	roster: IVoyageCrew[];
};

const ProspectiveProficiency = (props: ProspectiveProficiencyProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { prospectiveConfig } = React.useContext(EditorContext);
	const { roster } = props;
	return (
		<React.Fragment>
			<Header	/* Prospective Proficiency */
				as='h4'
			>
				{t('voyage.editor.prospective.proficiency')}
			</Header>
			<ProficiencyCheck
				id='prospective/proficiencycheck'
				voyageConfig={prospectiveConfig}
				roster={roster}
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
