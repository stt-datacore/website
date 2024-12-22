import React from "react";
import { Calculation, Estimate } from "../../../model/worker";
import { Helper } from "../helpers/Helper";
import { Popup, Header, Tab } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { IVoyageCrew, IVoyageCalcConfig, ITrackedVoyage, IFullPayloadAssignment } from "../../../model/voyage";
import { UnifiedWorker } from "../../../typings/worker";
import { flattenEstimate, formatTime } from "../../../utils/voyageutils";
import { HistoryContext } from "../../voyagehistory/context";
import { NEW_TRACKER_ID, createTrackableVoyage, createTrackableCrew, SyncState, deleteTrackedData, removeVoyageFromHistory, postTrackedData, addVoyageToHistory, addCrewToHistory } from "../../voyagehistory/utils";
import { CalculatorContext } from "../context";
import { CalculatorState } from "../helpers/calchelpers";
import { ErrorPane } from "./errorpane";
import { ResultPane } from "./results";

export type ResultsGroupProps = {
	requests: Helper[];
	results: Calculation[];
	setResults: (results: Calculation[]) => void;
};

export const ResultsGroup = (props: ResultsGroupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { voyageConfig } = calculatorContext;

	const { requests, results, setResults } = props;

	const [trackerId, setTrackerId] = React.useState<number>(NEW_TRACKER_ID);

	const analyses: string[] = [];

	// In-game voyage crew picker ignores frozen crew, active shuttlers, and active voyagers
	const availableRoster: IVoyageCrew[] = calculatorContext.crew.filter(
		c => c.immortal <= 0 && c.active_status !== 2 && c.active_status !== 3
	);

	if (results.length === 0)
		return (<></>);

	// Compare best values among ALL results
	interface IBestValues {
		median: number;
		minimum: number;
		moonshot: number;
		dilemma: {
			hour: number;
			chance: number;
		};
		antimatter: number;
		total_vp: number;
		vp_per_min: number;
	};
	const bestValues: IBestValues = {
		median: 0,
		minimum: 0,
		moonshot: 0,
		dilemma: {
			hour: 0,
			chance: 0
		},
		antimatter: 0,
		total_vp: 0,
		vp_per_min: 0
	};
	results.forEach(result => {
		if (result.calcState === CalculatorState.Done && result.result) {
			const values = {
				...flattenEstimate(result.result.estimate),
				antimatter: result.result.estimate.antimatter ?? 0,
				total_vp: result.result.estimate.vpDetails?.total_vp ?? 0,
				vp_per_min: result.result.estimate.vpDetails?.vp_per_min ?? 0
			};
			Object.keys(bestValues).forEach((valueKey) => {
				if (valueKey === 'dilemma') {
					if (values.dilemma.hour > bestValues.dilemma.hour
						|| (values.dilemma.hour === bestValues.dilemma.hour && values.dilemma.chance > bestValues.dilemma.chance)) {
							bestValues.dilemma = values.dilemma;
					}
				}
				else if (values[valueKey] > bestValues[valueKey]) {
					bestValues[valueKey] = values[valueKey];
				}
			});
		}
	});
	results.forEach(result => {
		let analysis: string = '';
		if (result.calcState === CalculatorState.Done && result.result) {
			const recommended: string[] = getRecommendedList(result.result.estimate, bestValues);
			if (results.length === 1)
				analysis = 'Recommended for all criteria';
			else {
				if (recommended.length > 0)
					analysis = ' Recommended for ' + recommended.map((method) => getRecommendedValue(method, bestValues)).join(', ');
				else
					analysis = ' Proposed alternative';
			}
		}
		analyses.push(analysis);
	});

	const panes = results.map((result, resultIndex) => ({
		menuItem: { key: result.id, content: renderMenuItem(result.name, analyses[resultIndex]) },
		render: () => {
			if (result.calcState === CalculatorState.Error) {
				return (
					<ErrorPane
						errorMessage={result.errorMessage} resultIndex={resultIndex}
						requests={requests} requestId={result.requestId}
						dismissResult={dismissResult}
					/>
				);
			}
			return (
				<ResultPane result={result.result} resultIndex={resultIndex}
					requests={requests} requestId={result.requestId}
					calcState={result.calcState} abortCalculation={abortCalculation}
					analysis={analyses[resultIndex]}
					trackState={result.trackState ?? 0} trackResult={trackResult}
					confidenceState={result.confidenceState ?? 0} estimateResult={estimateResult}
					dismissResult={dismissResult}
					roster={availableRoster}
				/>
			);
		}
	}));

	function renderMenuItem(name: string, analysis: string): JSX.Element {
		if (analysis !== '') {
			return (
				<Popup position='top center'
					content={<p>{analysis}</p>}
					trigger={<p>{name}</p>}
				/>
			);
		}
		else {
			return <p>{name}</p>;
		}
	}

	function getRecommendedList(estimate: Estimate, bestValues: IBestValues): string[] {
		const recommended: string[] = [];
		const values = {
			...flattenEstimate(estimate),
			antimatter: estimate.antimatter ?? 0,
			total_vp: estimate.vpDetails?.total_vp ?? 0,
			vp_per_min: estimate.vpDetails?.vp_per_min ?? 0
		};
		Object.keys(bestValues).forEach(method => {
			let canRecommend: boolean = false;
			if (method === 'dilemma') {
				if (voyageConfig.voyage_type === 'dilemma') {
					canRecommend = bestValues.dilemma.hour === values.dilemma.hour
						&& bestValues.dilemma.chance === values.dilemma.chance;
				}
			}
			else if ((method === 'total_vp' || method === 'vp_per_min')) {
				if (voyageConfig.voyage_type === 'encounter') {
					canRecommend = bestValues[method] === values[method];
				}
			}
			else {
				canRecommend = bestValues[method] === values[method];
			}
			if (canRecommend) recommended.push(method);
		});
		return recommended;
	};

	function getRecommendedValue(method: string, bestValues: IBestValues): string {
		let sortName = '', sortValue: string | number = '';
		switch (method) {
			case 'median':
				sortName = 'estimated runtime';
				sortValue = formatTime(bestValues.median, t);
				break;
			case 'minimum':
				sortName = 'guaranteed minimum';
				sortValue = formatTime(bestValues.minimum, t);
				break;
			case 'moonshot':
				sortName = 'moonshot';
				sortValue = formatTime(bestValues.moonshot, t);
				break;
			case 'dilemma':
				sortName = 'dilemma chance';
				sortValue = Math.round(bestValues.dilemma.chance)+'% to reach '+bestValues.dilemma.hour+'h';
				break;
			case 'antimatter':
				sortName = 'starting antimatter';
				sortValue = bestValues.antimatter;
				break;
			case 'total_vp':
				sortName = 'projected VP';
				sortValue = bestValues.total_vp.toLocaleString();
				break;
			case 'vp_per_min':
				sortName = 'projected VP per minute';
				sortValue = Math.floor(bestValues.vp_per_min);
				break;
		}
		if (sortValue !== '') sortValue = ' ('+sortValue+')';
		return sortName+sortValue;
	}

	function abortCalculation(requestId: string): void {
		const request = requests.find(r => r.id === requestId);
		if (request) {
			request.abort();
			const result = results.find(prev => prev.id === requestId);
			if (result && result.result) {
				result.name = formatTime(result.result.estimate.refills[0].result, t);
				result.calcState = CalculatorState.Done;
			}
			else {
				const index = results.findIndex(prev => prev.id === requestId);
				results.splice(index, 1);
			}
			setResults([...results]);
		}
	}

	function trackResult(resultIndex: number, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate): void {
		// First remove previous tracked voyage and associated crew assignments
		//	(in case user tracks a different recommendation from same request)
		const trackableVoyage: ITrackedVoyage = createTrackableVoyage(
			voyageConfig, shipSymbol, estimate, trackerId
		);
		const trackableCrew: IFullPayloadAssignment[] = createTrackableCrew(voyageConfig, trackerId);
		if (syncState === SyncState.RemoteReady) {
			deleteTrackedData(dbid, trackerId).then((success: boolean) => {
				if (success) {
					removeVoyageFromHistory(history, trackerId);
					postTrackedData(dbid, trackableVoyage, trackableCrew).then(result => {
						if (result.status < 300 && result.trackerId && result.inputId === trackerId) {
							const newRemoteId: number = result.trackerId;
							addVoyageToHistory(history, newRemoteId, trackableVoyage);
							addCrewToHistory(history, newRemoteId, trackableCrew);
							setHistory({...history});
							updateTrackedResults(resultIndex, newRemoteId);
						}
						else {
							throw('Failed trackResult -> postTrackedData');
						}
					})
				}
				else {
					throw('Failed trackResult -> deleteTrackedData');
				}
			}).catch(e => {
				setMessageId('voyage.history_msg.failed_to_track');
				console.log(e);
			});
		}
		else if (syncState === SyncState.LocalOnly) {
			removeVoyageFromHistory(history, trackerId);
			const newLocalId: number = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;
			addVoyageToHistory(history, newLocalId, trackableVoyage);
			addCrewToHistory(history, newLocalId, trackableCrew);
			setHistory({...history});
			updateTrackedResults(resultIndex, newLocalId);
		}
		else {
			setMessageId('voyage.history_msg.invalid_sync_state');
			console.log(`Failed trackResult (invalid syncState: ${syncState})`);
		}
	}

	function updateTrackedResults(resultIndex: number, trackerId: number): void {
		results.forEach((result, idx) => {
			result.trackState = idx === resultIndex ? 1 : 0;
		});
		setResults([...results]);
		setTrackerId(trackerId);
	}

	function estimateResult(resultIndex: number, voyageConfig: IVoyageCalcConfig, numSims: number): void {
		const config = {
			startAm: voyageConfig.max_hp,
			ps: voyageConfig.skill_aggregates[voyageConfig.skills['primary_skill']],
			ss: voyageConfig.skill_aggregates[voyageConfig.skills['secondary_skill']],
			others: Object.values(voyageConfig.skill_aggregates).filter(s => !Object.values(voyageConfig.skills).includes(s.skill)),
			numSims: numSims
		};
		const VoyageEstConfig = {
			config,
			worker: 'voyageEstimate'
		};
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				const estimate = message.data.result;
				const result = results[resultIndex];
				result.name = formatTime(estimate.refills[0].result, t);
				if (result.result) result.result.estimate = estimate;
				result.confidenceState = 2;
				setResults([...results]);
			}
		});
		worker.postMessage(VoyageEstConfig);
		const result = results[resultIndex];
		result.name = 'Calculating...';
		result.confidenceState = 1;
		setResults([...results]);
	}

	function dismissResult(resultIndex: number): void {
		results.splice(resultIndex, 1);
		setResults([...results]);
	}

	return (
		<React.Fragment>
			<Header as='h3'>Recommended Lineups</Header>
			<Tab menu={{ pointing: true }} panes={panes} />
		</React.Fragment>
	);
};
