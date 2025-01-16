import React from 'react';
import {
	Button,
	Icon,
	Image,
	Message,
	Popup,
	SemanticICONS,
	Tab
} from 'semantic-ui-react';

import { Voyage } from '../../../model/player';
import { Estimate, IProposalEntry, IResultProposal, IVoyageCalcConfig, IVoyageCrew, IVoyageRequest, IVoyageResult } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { OptionsPanelFlexColumn } from '../../stats/utils';
import { HistoryContext } from '../../voyagehistory/context';
import { SyncState } from '../../voyagehistory/utils';

import { CalculatorContext } from '../context';
import { CIVASMessage } from '../civas';
import { getCrewEventBonus, getCrewTraitBonus } from '../utils';
import { CalculatorState } from '../helpers/calchelpers';
import { ILineupEditorTrigger, LineupEditor } from '../lineupeditor/lineupeditor';
import { LineupViewerAccordion } from '../lineupviewer/lineup_accordion';
import { QuipmentProspectAccordion } from '../quipment/quipmentprospects';
import { SkillCheckAccordion } from '../skillcheck/accordion';
import VoyageStatsAccordion from '../stats/stats_accordion';

export type ResultPaneProps = {
	resultId: string;
	proposal: IResultProposal | undefined;
	requests: IVoyageRequest[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
	analysis: string;
	trackState: number;
	confidenceState: number;
	trackResult: (resultId: string, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate) => void;
	estimateResult: (resultId: string, voyageConfig: IVoyageCalcConfig, numSums: number) => void;
	dismissResult: (resultId: string) => void;
	addEditedResult: (request: IVoyageRequest, result: IVoyageResult) => void;
	idleRoster: IVoyageCrew[];
	fullRoster: IVoyageCrew[];
};

export const ResultPane = (props: ResultPaneProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { syncState } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { configSource, rosterType } = calculatorContext;
	const {
		resultId, proposal,
		requests, requestId,
		calcState, abortCalculation,
		analysis,
		trackState, trackResult,
		confidenceState, estimateResult,
		dismissResult,
		addEditedResult,
		idleRoster,
		fullRoster
	} = props;

	const [editorTrigger, setEditorTrigger] = React.useState<ILineupEditorTrigger | undefined>(undefined);

	const request = requests.find(r => r.id === requestId);
	if (!request) return (<></>);

	if (!proposal) {
		return (
			<Tab.Pane>
				<div style={{ textAlign: 'center' }}>
					<Image centered src='/media/voyage-wait-icon.gif' />
					<Button onClick={() => abortCalculation(request.id)}>Abort</Button>
				</div>
			</Tab.Pane>
		);
	}

	const iconTrack: SemanticICONS[] = ['flag outline', 'flag'];
	const iconConfidence: SemanticICONS[] = ['hourglass outline', 'hourglass half', 'hourglass end'];

	// Create new voyageConfig based on input and proposal
	const voyageConfig: IVoyageCalcConfig = {
		...request.voyageConfig,
		state: 'pending',
		max_hp: proposal.startAM,
		skill_aggregates: proposal.aggregates,
		crew_slots: request.voyageConfig.crew_slots.map((slot, slotId) => {
			return ({
				...slot,
				crew: proposal.entries[slotId].choice
			});
		})
	};

	const renderCalculatorMessage = () => {
		if (!request.calcHelper) return <></>;
		if (calcState !== CalculatorState.Done) {
			return (
				<React.Fragment>
					<Image inline size='mini' src='/media/voyage-wait-icon.gif' />
					Calculation in progress. Please wait...{` `}
					<Button compact style={{ marginLeft: '1em' }}
						content='Abort' onClick={() => abortCalculation(request.id)} />
				</React.Fragment>
			);
		}
		const inputs: string[] = Object.entries(request.calcHelper.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (
			<React.Fragment>
				Calculated by <b>{request.calcHelper.calcName}</b> calculator ({inputs.join(', ')}){` `}
				in {((request.calcHelper.perf.end-request.calcHelper.perf.start)/1000).toFixed(2)} seconds!
			</React.Fragment>
		);
	};

	const flexCol = OptionsPanelFlexColumn;

	return (
		<React.Fragment>
			{calcState === CalculatorState.Done && (
				<Message attached>
					<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
						<div>
							<div>
								{tfmt('voyage.estimate.estimate_time', {
									time: <b>{formatTime(proposal.estimate.refills[0].result, t)}</b>
								})}
								{` `}
								{t('voyage.estimate.expected_range', {
									a: formatTime(proposal.estimate.refills[0].saferResult, t),
									b: formatTime(proposal.estimate.refills[0].moonshotResult, t)
								})}
							</div>
							{proposal.estimate.vpDetails && (
								<div>
									{t('voyage.estimate.projected_vp')}: <b>{proposal.estimate.vpDetails.total_vp.toLocaleString()}</b>
									{` `}<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />;
									{` `}event crew bonus: <b>+{t('global.n_%', { n: Math.round((proposal.eventCrewBonus ?? 0) * 100) })}</b>
								</div>
							)}
							{analysis !== '' && (
								<div style={{ marginTop: '1em' }}>
									{analysis}
								</div>
							)}
						</div>
						<div>
							<Button.Group>
								{configSource === 'player' && voyageConfig.voyage_type === 'dilemma' &&
									<Popup position='top center'
										content={<>Track this recommendation</>}
										trigger={
											<Button icon onClick={() => trackResult(resultId, voyageConfig, request.bestShip.ship.symbol, proposal.estimate)} disabled={syncState === SyncState.ReadOnly}>
												<Icon name={iconTrack[trackState]} color={trackState === 1 ? 'green' : undefined} />
											</Button>
										}
									/>
								}
								<Popup position='top center'
									content={<>Get more confident estimate</>}
									trigger={
										<Button icon onClick={() => { if (confidenceState !== 1) estimateResult(resultId, voyageConfig, 30000); }}>
											<Icon name={iconConfidence[confidenceState]} color={confidenceState === 2 ? 'green' : undefined} />
										</Button>
									}
								/>
								<Popup position='top center'
									content={<>Edit lineup</>}
									trigger={
										<Button icon='pencil' onClick={() => setEditorTrigger({ view: 'crewpicker' })} />
									}
								/>
								<Popup position='top center'
									content={<>Dismiss this recommendation</>}
									trigger={
										<Button icon='ban' onClick={() => dismissResult(resultId)} />
									}
								/>
							</Button.Group>
						</div>
					</div>
				</Message>
			)}
			<Tab.Pane>
				<div style={{...flexCol, alignItems: 'stretch', gap: '0.5em'}}>
					<VoyageStatsAccordion
						configSource={configSource}
						voyageData={voyageConfig as Voyage}
						estimate={proposal.estimate}
						roster={idleRoster}
						rosterType={rosterType}
					/>
					<LineupViewerAccordion
						configSource={configSource}
						voyageConfig={voyageConfig}
						ship={request.bestShip.ship}
						roster={idleRoster}
						rosterType={rosterType}
						initialExpand={true}
					/>
					<LineupEditor key={resultId}
						id={`${resultId}/lineupeditor`}
						trigger={editorTrigger}
						cancelTrigger={() => setEditorTrigger(undefined)}
						ship={request.bestShip.ship}
						roster={fullRoster}
						control={{ config: voyageConfig, estimate: proposal.estimate }}
						commitVoyage={(voyageConfig: IVoyageCalcConfig, estimate: Estimate) => createResultFromEdit(request, voyageConfig, estimate)}
					/>
					<SkillCheckAccordion
						voyageConfig={voyageConfig}
						launchLineupEditor={(trigger: ILineupEditorTrigger) => setEditorTrigger(trigger)}
					/>
					<QuipmentProspectAccordion
						voyageConfig={voyageConfig}
					/>
					<div style={{ marginTop: '1em' }}>
						{renderCalculatorMessage()}
					</div>
				</div>
				{calcState === CalculatorState.Done && (
					<CIVASMessage voyageConfig={voyageConfig} estimate={proposal.estimate} />
				)}
			</Tab.Pane>
		</React.Fragment>
	);

	function createResultFromEdit(request: IVoyageRequest, voyageConfig: IVoyageCalcConfig, estimate: Estimate): void {
		const requestId: string = 'request-' + Date.now();
		const editedRequest: IVoyageRequest = {
			id: requestId,
			type: 'edit',
			voyageConfig: request.voyageConfig,
			bestShip: request.bestShip,
			consideredCrew: fullRoster
		};
		const entries: IProposalEntry[] = [];
		let crewTraitBonus: number = 0, eventCrewBonus: number = 0;
		voyageConfig.crew_slots.forEach((cs, slotId) => {
			const crew: IVoyageCrew = cs.crew;
			if (crew) {
				const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, cs.trait);
				crewTraitBonus += traitBonus;
				eventCrewBonus += getCrewEventBonus(voyageConfig, crew);
				entries.push({
					slotId,
					choice: crew,
					hasTrait: traitBonus > 0
				});
			}
		});
		const editedResult: IVoyageResult = {
			id: `${requestId}-result`,
			requestId: requestId,
			name: formatTime(estimate.refills[0].result, t),
			calcState: CalculatorState.Done,
			proposal: {
				entries,
				estimate,
				aggregates: voyageConfig.skill_aggregates,
				startAM: voyageConfig.max_hp,
				eventCrewBonus
			}
		};
		addEditedResult(editedRequest, editedResult);
	}
};
