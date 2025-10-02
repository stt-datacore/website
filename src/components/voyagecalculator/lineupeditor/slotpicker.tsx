import React from 'react';
import {
	Icon,
	Message,
	Segment,
	Table
} from 'semantic-ui-react';

import { Skill } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { Estimate } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import CONFIG from '../../CONFIG';
import { IDataGridSetup, IDataTableColumn, IDataTableSetup, IEssentialData } from '../../dataset_presenters/model';
import { DataPicker, DataPickerLoading } from '../../dataset_presenters/datapicker';
import { NumericDiff } from '../../dataset_presenters/elements/numericdiff';
import { AvatarView } from '../../item_presenters/avatarview';

import { CalculatorContext } from '../context';
import { getCrewTraitBonus, voySkillScore } from '../utils';

import { EditorContext } from './context';
import { IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { promiseEstimateFromConfig } from './utils';

interface IAlternateSlotData extends IEssentialData {
	assigned_crew: PlayerCrew | undefined;
	config: IProspectiveConfig;
	estimate: Estimate | undefined;
	runtime: number;
	diff_voyage_total: number;
	diff_command_skill: number;
	diff_diplomacy_skill: number;
	diff_engineering_skill: number;
	diff_medicine_skill: number;
	diff_science_skill: number;
	diff_security_skill: number;
	diff_antimatter: number;
	diff_runtime: number;
};

interface IAlternateSlotEstimate {
	slotId: number;
	estimate: Estimate;
};

type AlternateSlotPickerProps = {
	alternateCrew: PlayerCrew;
	setAlternateVoyage: (config: IProspectiveConfig, estimate: Estimate) => void;
};

export const AlternateSlotPicker = (props: AlternateSlotPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const calculatorContext = React.useContext(CalculatorContext);
	const { id, prospectiveConfig, sortedSkills, getConfigFromCrewSlots, getRuntimeDiff, renderActions, dismissEditor } = React.useContext(EditorContext);
	const { alternateCrew, setAlternateVoyage } = props;

	const [data, setData] = React.useState<IAlternateSlotData[] | undefined>(undefined);
	const [estimates, setEstimates] = React.useState<IAlternateSlotEstimate[]>([]);

	React.useEffect(() => {
		const crewSlots: IProspectiveCrewSlot[] = structuredClone(prospectiveConfig.crew_slots);

		// Unseat alternate crew from current seat first, if already seated
		const currentSlot: IProspectiveCrewSlot | undefined = crewSlots.find(cs => cs.crew?.id === alternateCrew.id);
		if (currentSlot) currentSlot.crew = undefined;

		const data: IAlternateSlotData[] = [];
		prospectiveConfig.crew_slots.forEach((crewSlot, slotId) => {
			if (crewSlot.crew?.id !== alternateCrew.id && Object.keys(alternateCrew.skills).includes(crewSlot.skill)) {
				const altCrewSlots: IProspectiveCrewSlot[] = structuredClone(crewSlots);
				altCrewSlots[slotId].crew = alternateCrew;
				const altConfig: IProspectiveConfig = getConfigFromCrewSlots(altCrewSlots);
				data.push({
					id: slotId,
					name: crewSlot.name,
					assigned_crew: crewSlot.crew,
					config: altConfig,
					estimate: undefined,
					runtime: 0,
					diff_voyage_total: getVoyageSkillDiff(alternateCrew, crewSlot.crew),
					diff_command_skill: getSkillDiff('command_skill', alternateCrew, crewSlot.crew),
					diff_diplomacy_skill: getSkillDiff('diplomacy_skill', alternateCrew, crewSlot.crew),
					diff_engineering_skill: getSkillDiff('engineering_skill', alternateCrew, crewSlot.crew),
					diff_medicine_skill: getSkillDiff('medicine_skill', alternateCrew, crewSlot.crew),
					diff_science_skill: getSkillDiff('science_skill', alternateCrew, crewSlot.crew),
					diff_security_skill: getSkillDiff('security_skill', alternateCrew, crewSlot.crew),
					diff_antimatter: getTraitDiff(alternateCrew, crewSlot.crew, crewSlot.trait),
					diff_runtime: 0
				});
				promiseEstimateFromConfig(
					altConfig,
					(estimate: Estimate) => {
						estimates.push({ slotId, estimate });
						setEstimates([...estimates]);
					}
				);
			}
		});
		setData([...data]);
	}, [prospectiveConfig.crew_slots, alternateCrew]);

	React.useEffect(() => {
		if (!data) return;
		estimates.forEach(estimate => {
			const alternateSlot: IAlternateSlotData | undefined = data.find(datum => datum.id === estimate.slotId);
			if (alternateSlot) {
				alternateSlot.estimate = estimate.estimate;
				alternateSlot.runtime = estimate.estimate.refills[0].result;
				alternateSlot.diff_runtime = getRuntimeDiff(estimate.estimate.refills[0].result);
			}
		});
		setData([...data]);
	}, [estimates]);

	if (!data) return <DataPickerLoading />;

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 2,
			stackable: true
		},
		renderGridColumn: renderGridSlot
	};

	const columns: IDataTableColumn[] = [
		{	/* Voyage Seat */
			id: 'slot',
			title: t('voyage.editor.fields.voyage_seat'),
			sortField: { id: 'id' },
			renderCell: (datum: IEssentialData) => renderSlotName(datum as IAlternateSlotData)
		},
		{	/* Voyage */
			id: 'voyage',
			title: t('base.voyage'),
			align: 'center',
			sortField: { id: 'diff_voyage_total', firstSort: 'descending' },
			renderCell: (datum: IEssentialData) => <NumericDiff diff={datum[`diff_voyage_total`]} showNoChange />
		}
	];

	sortedSkills.forEach(skill => {
		columns.push({
			id: skill,
			title: renderSkillHeader(skill),
			align: 'center',
			sortField: {
				id: `diff_${skill}`,
				firstSort: 'descending'
			},
			renderCell: (datum: IEssentialData) => <NumericDiff diff={datum[`diff_${skill}`]} />
		});
	});

	columns.push(
		{
			id: 'antimatter',
			title: <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />,
			align: 'center',
			sortField: { id: 'diff_antimatter', firstSort: 'descending' },
			renderCell: (datum: IEssentialData) => <NumericDiff diff={datum[`diff_antimatter`]} />
		},
		{	/* Estimate */
			id: 'estimate',
			title: t('voyage.estimate.estimate'),
			align: 'center',
			sortField: { id: 'runtime', firstSort: 'descending' },
			renderCell: (datum: IEssentialData) => renderEstimate((datum as IAlternateSlotData))
		}
	);

	const tableSetup: IDataTableSetup = {
		columns,
		rowsPerPage: 6,
		defaultSort: { id: 'diff_voyage_total', firstSort: 'descending' }
	};

	return (
		<DataPicker	/* Alternate Seats for ALT_CREW_NAME */
			id={`${id}/seatpicker/datapicker`}
			data={data}
			closePicker={handleSelectedIds}
			title={t('voyage.editor.alternate_seats_for_crew', { crew: alternateCrew.name })}
			selection
			closeOnChange
			renderPreface={renderPreface}
			renderActions={renderActions}
			gridSetup={gridSetup}
			tableSetup={tableSetup}
		/>
	);

	function getVoyageSkillDiff(alternateCrew: PlayerCrew | undefined, slottedCrew: PlayerCrew | undefined): number {
		let totalDiff: number = 0;
		Object.keys(CONFIG.SKILLS).forEach(skill => {
			totalDiff += getSkillDiff(skill, alternateCrew, slottedCrew);
		});
		return totalDiff;
	}

	function getSkillDiff(skill: string, alternateCrew: PlayerCrew | undefined, slottedCrew: PlayerCrew | undefined): number {
		const alternateSkill: Skill | undefined = alternateCrew?.skills[skill];
		const slottedSkill: Skill | undefined = slottedCrew?.skills[skill];
		const alternateVoyScore: number = alternateSkill ? voySkillScore(alternateSkill) : 0;
		const slottedVoyScore: number = slottedSkill ? voySkillScore(slottedSkill) : 0;
		return Math.floor(alternateVoyScore) - Math.floor(slottedVoyScore);
	}

	function getTraitDiff(alternateCrew: PlayerCrew | undefined, slottedCrew: PlayerCrew | undefined, slotTrait: string): number {
		const alternateBonus: number = alternateCrew ? getCrewTraitBonus(calculatorContext.voyageConfig, alternateCrew, slotTrait) : 0;
		const slottedBonus: number = slottedCrew ? getCrewTraitBonus(calculatorContext.voyageConfig, slottedCrew, slotTrait) : 0;
		return alternateBonus - slottedBonus;
	}

	function handleSelectedIds(selectedIds: Set<number>, affirmative: boolean): void {
		if (!affirmative) dismissEditor();
		if (selectedIds.size > 0) {
			const alternateSlot: IAlternateSlotData | undefined = data?.find(slotData =>
				slotData.id === [...selectedIds][0]
			);
			if (alternateSlot?.estimate)
				setAlternateVoyage(alternateSlot.config, alternateSlot.estimate);
			// Ignore request if estimate not yet ready
		}
	}

	function renderPreface(): React.JSX.Element {
		const currentSlot: IProspectiveCrewSlot | undefined = prospectiveConfig.crew_slots.find(cs => cs.crew?.id === alternateCrew.id);
		return (
			<React.Fragment	/* Select a voyage seat. Any existing crew in that seat will be replaced by CREW, resulting in the listed changes to the prospective voyage. */>
				<p>{t('voyage.editor.select_slot', { crew: alternateCrew.name })}</p>
				{currentSlot && (
					<Message	/* CREW is already seated as the SEAT on this prospective voyage. The estimates below account for CREW in a new seat while leaving the SEAT seat unassigned. */>
						<Icon name='info circle' /> {t('voyage.editor.slotted_message', { crew: alternateCrew.name, seat: currentSlot.name })}
					</Message>
				)}
			</React.Fragment>
		);
	}

	function renderGridSlot(datum: IEssentialData): React.JSX.Element {
		return (
			<GridAlternateSlot
				alternateSlot={datum as IAlternateSlotData}
				renderCrewSwap={(slottedCrew: PlayerCrew | undefined) => renderCrewSwap(alternateCrew, slottedCrew)}
				renderEstimate={renderEstimate}
			/>
		);
	}

	function renderSkillHeader(skill: string): React.JSX.Element {
		return (
			<React.Fragment>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
				{calculatorContext.voyageConfig.skills.primary_skill === skill && <Icon name='star' color='yellow' />}
				{calculatorContext.voyageConfig.skills.secondary_skill === skill && <Icon name='star' color='grey' />}
			</React.Fragment>
		);
	}

	function renderSlotName(datum: IAlternateSlotData): React.JSX.Element {
		return (
			<React.Fragment>
				<div style={{ fontWeight: 'bold' }}>
					{datum.name}
				</div>
				{renderCrewSwap(alternateCrew, datum.assigned_crew)}
			</React.Fragment>
		);
	}

	function renderCrewSwap(alternateCrew: PlayerCrew, slottedCrew: PlayerCrew | undefined): React.JSX.Element {
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
				{slottedCrew && <AvatarView mode='crew' item={slottedCrew} size={40} />}
				{!slottedCrew && <Icon name='exclamation triangle' color='yellow' size='big' />}
				<Icon name='arrow right' />
				<AvatarView mode='crew' item={alternateCrew} size={40} />
			</div>
		);
	}

	function renderEstimate(datum: IAlternateSlotData): React.JSX.Element {
		if (!datum.estimate) return <Icon loading name='spinner' />;
		return (
			<React.Fragment>
				<NumericDiff
					diff={datum.diff_runtime}
					customRender={(diff: number) => <>{formatTime(diff, t)}</>}
					showNoChange
				/>
				<div>
					{datum.diff_runtime !== 0 && <Icon name='arrow right' />}
					{formatTime(Math.abs(datum.estimate.refills[0].result), t)}
				</div>
			</React.Fragment>
		);
	}
};

type GridAlternateSlotProps = {
	alternateSlot: IAlternateSlotData;
	renderCrewSwap: (slottedCrew: PlayerCrew | undefined) => React.JSX.Element;
	renderEstimate: (datum: IAlternateSlotData) => React.JSX.Element;
};

const GridAlternateSlot = (props: GridAlternateSlotProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const calculatorContext = React.useContext(CalculatorContext);
	const { sortedSkills } = React.useContext(EditorContext);
	const { alternateSlot, renderCrewSwap, renderEstimate } = props;

	const diffSkills: string[] = sortedSkills.filter(skill => alternateSlot[`diff_${skill}`] !== 0);

	return (
		<React.Fragment>
			<Message attached>
				<Message.Header>
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							{alternateSlot.name}
						</div>
						<div>
							{renderCrewSwap(alternateSlot.assigned_crew)}
						</div>
					</div>
				</Message.Header>
			</Message>
			<Segment attached='bottom'>
				{renderDiffsAsTable()}
			</Segment>
		</React.Fragment>
	);

	function renderDiffsAsTable(): React.JSX.Element {
		return (
			<React.Fragment>
				<div style={{ overflowX: 'auto' }}>
					<Table striped compact unstackable>
						<Table.Body>
							<Table.Row>
								<Table.Cell	/* Voyage */
									textAlign='center'
								>
									<b>{t('base.voyage')}</b>
								</Table.Cell>
								<Table.Cell textAlign='center'>
									<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
								</Table.Cell>
								<Table.Cell /* Estimate */
									textAlign='center'
								>
									<b>{t('voyage.estimate.estimate')}</b>
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell textAlign='center'>
									<NumericDiff diff={alternateSlot[`diff_voyage_total`]} showNoChange />
								</Table.Cell>
								<Table.Cell textAlign='center'>
									<NumericDiff diff={alternateSlot[`diff_antimatter`]} showNoChange />
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderEstimate(alternateSlot)}
								</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table>
				</div>
				<div style={{ overflowX: 'auto' }}>
					<Table striped compact unstackable>
						<Table.Body>
							<Table.Row>
								{diffSkills.map(skill => (
									<Table.Cell key={skill} textAlign='center'>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
										{calculatorContext.voyageConfig.skills.primary_skill === skill && <Icon name='star' color='yellow' />}
										{calculatorContext.voyageConfig.skills.secondary_skill === skill && <Icon name='star' color='grey' />}
									</Table.Cell>
								))}
							</Table.Row>
							<Table.Row>
								{diffSkills.map(skill => (
									<Table.Cell key={skill} textAlign='center'>
										<NumericDiff diff={alternateSlot[`diff_${skill}`]} showNoChange />
									</Table.Cell>
								))}
							</Table.Row>
						</Table.Body>
					</Table>
				</div>
			</React.Fragment>
		);
	}
};
