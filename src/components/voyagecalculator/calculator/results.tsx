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

import { Estimate, IBestVoyageShip, IResultProposal, IVoyageCalcConfig, IVoyageCrew, IVoyageRequest, IVoyageResult } from '../../../model/voyage';
import { Voyage } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { OptionsPanelFlexColumn } from '../../stats/utils';
import { HistoryContext } from '../../voyagehistory/context';
import { SyncState } from '../../voyagehistory/utils';

import { CalculatorContext } from '../context';
import { CIVASMessage } from '../civas';
import { CalculatorState } from '../helpers/calchelpers';
import { ILineupEditorTrigger, LineupEditor } from '../lineupeditor/lineupeditor';
import { LineupViewerAccordion } from '../lineupviewer/lineup_accordion';
import { QuipmentProspectAccordion } from '../quipment/quipmentprospects';
import VoyageStatsAccordion from '../stats/stats_accordion';
import { VPGraphAccordion } from '../vpgraph';

export type ResultPaneProps = {
	result: IResultProposal | undefined;
	resultIndex: number;
	requests: IVoyageRequest[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
	analysis: string;
	trackState: number;
	confidenceState: number;
	trackResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate) => void;
	estimateResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, numSums: number) => void;
	dismissResult: (resultIndex: number) => void;
	addEditedResult: (request: IVoyageRequest, result: IVoyageResult) => void;
	idleRoster: IVoyageCrew[];
};

export const ResultPane = (props: ResultPaneProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { syncState } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { configSource, rosterType } = calculatorContext;
	const {
		result, resultIndex,
		requests, requestId,
		calcState, abortCalculation,
		analysis,
		trackState, trackResult,
		confidenceState, estimateResult,
		dismissResult,
		addEditedResult,
		idleRoster
	} = props;

	const [editorTrigger, setEditorTrigger] = React.useState<ILineupEditorTrigger | undefined>(undefined);

	const request = requests.find(r => r.id === requestId);
	if (!request) return (<></>);

	if (!result) {
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

	// Create new voyageConfig based on input and calc results
	const voyageConfig: IVoyageCalcConfig = {
		...request.voyageConfig,
		state: 'pending',
		max_hp: result.startAM,
		skill_aggregates: result.aggregates,
		crew_slots: request.voyageConfig.crew_slots.map(slot => {
			return ({
				...slot,
				crew: {} as IVoyageCrew
			});
		})
	};
	if (result.entries) {
		result.entries.forEach(entry => {
			const crew: IVoyageCrew | undefined =
				(request.calcHelper?.consideredCrew ?? calculatorContext.crew).find(c =>
					c.id === entry.choice.id
				);
			if (crew) voyageConfig.crew_slots[entry.slotId].crew = crew;
		});
	}

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
		inputs.unshift('considered crew: '+request.calcHelper.consideredCrew.length);
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
							{tfmt('voyage.estimate.estimate_time', {
								time: <b>{formatTime(result.estimate.refills[0].result, t)}</b>
							})}
							{` `}
							{t('voyage.estimate.expected_range', {
								a: formatTime(result.estimate.refills[0].saferResult, t),
								b: formatTime(result.estimate.refills[0].moonshotResult, t)
							})}
							{analysis !== '' && (<div style={{ marginTop: '1em' }}>{analysis}</div>)}
						</div>
						<div>
							<Button.Group>
								{configSource === 'player' && voyageConfig.voyage_type === 'dilemma' &&
									<Popup position='top center'
										content={<>Track this recommendation</>}
										trigger={
											<Button icon onClick={() => trackResult(resultIndex, voyageConfig, request.bestShip.ship.symbol, result.estimate)} disabled={syncState === SyncState.ReadOnly}>
												<Icon name={iconTrack[trackState]} color={trackState === 1 ? 'green' : undefined} />
											</Button>
										}
									/>
								}
								<Popup position='top center'
									content={<>Get more confident estimate</>}
									trigger={
										<Button icon onClick={() => { if (confidenceState !== 1) estimateResult(resultIndex, voyageConfig, 30000); }}>
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
										<Button icon='ban' onClick={() => dismissResult(resultIndex)} />
									}
								/>
							</Button.Group>
						</div>
					</div>
				</Message>
			)}
			<Tab.Pane>
				<div style={{...flexCol, alignItems: 'stretch', gap: '0.5em'}}>

					{result.estimate.vpDetails && (
						<VPGraphAccordion voyageConfig={voyageConfig} estimate={result.estimate} />
					)}
					<VoyageStatsAccordion
						configSource={configSource}
						voyageData={voyageConfig as Voyage}
						estimate={result.estimate}
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
						launchLineupEditor={(trigger: ILineupEditorTrigger) => setEditorTrigger(trigger)}
					/>
					<LineupEditor
						id={`${requestId}-${resultIndex}/lineupeditor`}
						trigger={editorTrigger}
						cancelTrigger={() => setEditorTrigger(undefined)}
						ship={request.bestShip.ship}
						control={{ config: voyageConfig, estimate: result.estimate }}
						commitVoyage={createResultFromEdit}
					/>
					<QuipmentProspectAccordion
						voyageConfig={voyageConfig}
					/>
					<div style={{ marginTop: '1em' }}>
						{renderCalculatorMessage()}
					</div>
				</div>
				{calcState === CalculatorState.Done && (
					<CIVASMessage voyageConfig={voyageConfig} estimate={result.estimate} />
				)}
			</Tab.Pane>
		</React.Fragment>
	);

	function createResultFromEdit(voyageConfig: IVoyageCalcConfig, ship: Ship, estimate: Estimate): void {
		const requestId: string = 'request-' + Date.now();
		const editedRequest: IVoyageRequest = {
			id: requestId,
			type: 'edit',
			voyageConfig,
			bestShip: {
				ship,
				archetype_id: ship.archetype_id!
			} as IBestVoyageShip
		};
		const editedResult: IVoyageResult = {
			id: `${requestId}-result`,
			requestId: requestId,
			name: formatTime(estimate.refills[0].result, t),
			calcState: CalculatorState.Done,
			proposal: {
				entries: voyageConfig.crew_slots.map((cs, entryId) => ({
					slotId: entryId,
					choice: cs.crew as IVoyageCrew,
					hasTrait: 0
				})),
				estimate,
				aggregates: voyageConfig.skill_aggregates,
				startAM: voyageConfig.max_hp
			}
		};
		addEditedResult(editedRequest, editedResult);
	}
};
