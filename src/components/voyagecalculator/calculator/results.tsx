import React from 'react';
import { Helper } from '../helpers/Helper';
import { CalcResult, Estimate } from '../../../model/worker';
import { Tab, Button, SemanticICONS, Message, Popup, Icon, Image } from 'semantic-ui-react';
import { GlobalContext } from '../../../context/globalcontext';
import { Voyage } from '../../../model/player';
import { IVoyageCalcConfig, IVoyageCrew } from '../../../model/voyage';
import { formatTime } from '../../../utils/voyageutils';
import { HistoryContext } from '../../voyagehistory/context';
import { SyncState } from '../../voyagehistory/utils';
import { CIVASMessage } from '../civas';
import { CalculatorContext } from '../context';
import { CalculatorState } from '../helpers/calchelpers';
import VoyageStats from '../stats/viewer';
import { VPGraphAccordion } from '../vpgraph';
import { LineupViewerAccordion } from '../lineup/viewer';

export type ResultPaneProps = {
	result: CalcResult | undefined;
	resultIndex: number;
	requests: Helper[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
	analysis: string;
	trackState: number;
	confidenceState: number;
	trackResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate) => void;
	estimateResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, numSums: number) => void;
	dismissResult: (resultIndex: number) => void;
	roster: IVoyageCrew[];
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
		roster
	} = props;

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
			const crew: IVoyageCrew | undefined = request.consideredCrew.find(c => c.id === entry.choice.id);
			if (crew) voyageConfig.crew_slots[entry.slotId].crew = crew;
		});
	}

	const renderCalculatorMessage = () => {
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
		const inputs: string[] = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (
			<React.Fragment>
				Calculated by <b>{request.calcName}</b> calculator ({inputs.join(', ')}){` `}
				in {((request.perf.end-request.perf.start)/1000).toFixed(2)} seconds!
			</React.Fragment>
		);
	};

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
				{result.estimate.vpDetails && (
					<VPGraphAccordion voyageConfig={voyageConfig} estimate={result.estimate} />
				)}
				<VoyageStats
					configSource={configSource}
					voyageData={voyageConfig as Voyage}
					estimate={result.estimate}
					ships={[request.bestShip.ship]}
					roster={roster}
					rosterType={rosterType}
					showPanels={['crew']}
				/>
				<LineupViewerAccordion
					configSource={configSource}
					voyageConfig={voyageConfig}
					ship={request.bestShip.ship}
					roster={roster}
					rosterType={rosterType}
				/>
				<div style={{ marginTop: '1em' }}>
					{renderCalculatorMessage()}
				</div>
				{calcState === CalculatorState.Done && (
					<CIVASMessage voyageConfig={voyageConfig} estimate={result.estimate} />
				)}
			</Tab.Pane>
		</React.Fragment>
	);
};
