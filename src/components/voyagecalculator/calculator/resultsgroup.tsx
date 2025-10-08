import React from 'react';
import {
	Header,
	Popup,
	Tab
} from 'semantic-ui-react';

import { Estimate, IFullPayloadAssignment, IVoyageCalcConfig, IVoyageCrew, IVoyageRequest, IVoyageResult, ITrackedVoyage, IResultProposal } from '../../../model/voyage';
import { UnifiedWorker } from '../../../typings/worker';
import { GlobalContext } from '../../../context/globalcontext';
import { oneCrewCopy } from '../../../utils/crewutils';
import { flattenEstimate, formatTime } from '../../../utils/voyageutils';
import { calcVoyageVP } from '../../../utils/voyagevp';

import { HistoryContext } from '../../voyagehistory/context';
import { NEW_TRACKER_ID, createTrackableVoyage, createTrackableCrew, SyncState, deleteTrackedData, removeVoyageFromHistory, postTrackedData, addVoyageToHistory, addCrewToHistory } from '../../voyagehistory/utils';

import { CalculatorContext } from '../context';
import { getCrewEventBonus } from '../utils';
import { CalculatorState } from '../helpers/calchelpers';

import { ErrorPane } from './errorpane';
import { ResultPane } from './results';
import { UserPrefsContext } from './userprefs';

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
	event_crew_bonus: number;
};

export type ResultsGroupProps = {
	requests: IVoyageRequest[];
	setRequests: (requests: IVoyageRequest[]) => void;
	results: IVoyageResult[];
	setResults: (results: IVoyageResult[]) => void;
};

export const ResultsGroup = (props: ResultsGroupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { voyageConfig } = calculatorContext;
	const { qpConfig, applyQp } = React.useContext(UserPrefsContext);

	const { requests, setRequests, results, setResults } = props;

	const [activeIndex, setActiveIndex] = React.useState<number>(0);
	const [trackerId, setTrackerId] = React.useState<number>(NEW_TRACKER_ID);

	// Full roster (pre-filtering but post-QP) is needed by lineup editor
	const fullRoster = React.useMemo<IVoyageCrew[]>(() => {
		return calculatorContext.crew.map(crew => {
			if (qpConfig.enabled || qpConfig.remove) {
				return applyQp(crew, voyageConfig) as IVoyageCrew;
			}
			return oneCrewCopy(crew) as IVoyageCrew;
		});
	}, [calculatorContext.crew, qpConfig]);

	// In-game voyage crew picker ignores frozen crew, active shuttlers, and active voyagers
	//	Must be based on non-QP full roster for crew finder to sort properly
	const idleRoster = React.useMemo<IVoyageCrew[]>(() => {
		return calculatorContext.crew.filter(
			c => c.immortal <= 0 && c.active_status !== 2 && c.active_status !== 3
		);
	}, [calculatorContext.crew]);

	const analyses = React.useMemo<string[]>(() => {
		const analyses: string[] = [];
		// Compare best values among ALL results
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
			event_crew_bonus: 0
		};
		results.forEach(result => {
			if (result.calcState === CalculatorState.Done && result.proposal) {
				const values = {
					...flattenEstimate(result.proposal.estimate),
					antimatter: result.proposal.startAM,
					total_vp: result.proposal.estimate.vpDetails?.total_vp ?? 0,
					event_crew_bonus: result.proposal.eventCrewBonus ?? 0
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
			if (result.calcState === CalculatorState.Done && result.proposal) {
				const recommended: string[] = getRecommendedList(result.proposal, bestValues);
				if (results.length === 1)	//	Recommended for all criteria
					analysis = t('voyage.estimate.analysis.all_criteria');
				else {
					if (recommended.length > 0)	{	// Recommended for MODE
						analysis = t('voyage.estimate.analysis.recommended_for_mode', {
							mode: recommended.map((method) => getRecommendedValue(method, bestValues)).join(', ')
						});
					}
					else {	// Proposed alternative
						analysis = t('voyage.estimate.analysis.proposed_alternative');
					}
				}
			}
			analyses.push(analysis);
		});
		return analyses;
	}, [results]);

	if (results.length === 0) return <></>;

	const panes = results.map((result, resultIndex) => ({
		menuItem: { key: result.id, content: renderMenuItem(result.name, analyses[resultIndex]) },
		render: () => {
			if (result.calcState === CalculatorState.Error) {
				return (
					<ErrorPane
						resultId={result.id} errorMessage={result.errorMessage}
						requests={requests} requestId={result.requestId}
						dismissResult={dismissResult}
					/>
				);
			}
			return (
				<ResultPane
					resultId={result.id} proposal={result.proposal}
					requests={requests} requestId={result.requestId}
					calcState={result.calcState} abortCalculation={abortCalculation}
					analysis={analyses[resultIndex]}
					trackState={result.trackState ?? 0} trackResult={trackResult}
					confidenceState={result.confidenceState ?? 0} estimateResult={estimateResult}
					dismissResult={dismissResult}
					addEditedResult={addResult}
					fullRoster={fullRoster}
					idleRoster={idleRoster}
				/>
			);
		}
	}));

	return (
		<React.Fragment>
			<Header	/* Recommended Lineups */
				as='h3'
			>
				{t('voyage.estimate.recommended_lineups')}
			</Header>
			<Tab
				menu={{ pointing: true }}
				panes={panes}
				activeIndex={activeIndex}
				onTabChange={(e, { activeIndex }) => setActiveIndex(activeIndex as number)}
			/>
		</React.Fragment>
	);

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

	function getRecommendedList(proposal: IResultProposal, bestValues: IBestValues): string[] {
		const recommended: string[] = [];
		const values = {
			...flattenEstimate(proposal.estimate),
			antimatter: proposal.startAM,
			total_vp: proposal.estimate.vpDetails?.total_vp ?? 0,
			event_crew_bonus: proposal.eventCrewBonus
		};
		Object.keys(bestValues).forEach(method => {
			let canRecommend: boolean = false;
			if (method === 'dilemma') {
				if (voyageConfig.voyage_type === 'dilemma') {
					canRecommend = bestValues.dilemma.hour === values.dilemma.hour
						&& bestValues.dilemma.chance === values.dilemma.chance;
				}
			}
			else if ((method === 'total_vp' || method === 'event_crew_bonus')) {
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
		sortName = t(`voyage.estimate.recommendations.${method}`);
		switch (method) {
			case 'median':
				//sortName = t(`voyage.estimate.recommendations.${method}`);
				sortValue = formatTime(bestValues.median, t);
				break;
			case 'minimum':
				//sortName = 'guaranteed minimum';
				sortValue = formatTime(bestValues.minimum, t);
				break;
			case 'moonshot':
				//sortName = 'moonshot';
				sortValue = formatTime(bestValues.moonshot, t);
				break;
			case 'dilemma':
				//sortName = 'dilemma chance';
				sortValue = t('voyage.estimate.recommendations.n%_to_reach_h', {
					n: Math.round(bestValues.dilemma.chance),
					h: bestValues.dilemma.hour
				});
				break;
			case 'antimatter':
				//sortName = 'starting antimatter';
				sortValue = bestValues.antimatter;
				break;
			case 'total_vp':
				//sortName = 'projected VP';
				sortValue = bestValues.total_vp.toLocaleString();
				break;
			case 'event_crew_bonus':
				// sortName = 'event crew bonus';
				sortValue = `+${t('global.n_%', { n: Math.round((bestValues.event_crew_bonus ?? 0) * 100) })}`;
				break;
		}
		if (sortValue !== '') sortValue = ' ('+sortValue+')';
		return sortName+sortValue;
	}

	function abortCalculation(requestId: string): void {
		const request: IVoyageRequest | undefined = requests.find(r => r.id === requestId);
		if (request && request.calcHelper) {
			request.calcHelper.abort();
			const result = results.find(prev => prev.id === requestId);
			if (result && result.proposal) {
				result.name = formatTime(result.proposal.estimate.refills[0].result, t);
				result.calcState = CalculatorState.Done;
			}
			else {
				const index = results.findIndex(prev => prev.id === requestId);
				results.splice(index, 1);
			}
			setResults([...results]);
		}
	}

	function trackResult(resultId: string, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate): void {
		const result: IVoyageResult | undefined = results.find(result => result.id === resultId);
		if (!result) return;

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
							updateTrackedResults(resultId, newRemoteId);
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
			updateTrackedResults(resultId, newLocalId);
		}
		else {
			setMessageId('voyage.history_msg.invalid_sync_state');
			console.log(`Failed trackResult (invalid syncState: ${syncState})`);
		}
	}

	function updateTrackedResults(resultId: string, trackerId: number): void {
		results.forEach(result => {
			result.trackState = result.id === resultId ? 1 : 0;
		});
		setResults([...results]);
		setTrackerId(trackerId);
	}

	function estimateResult(resultId: string, voyageConfig: IVoyageCalcConfig, numSims: number): void {
		const result: IVoyageResult | undefined = results.find(result => result.id === resultId);
		if (!result) return;
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
				// Add vpDetails to estimate
				if (voyageConfig.voyage_type === 'encounter') {
					const eventCrewBonuses: number[] = voyageConfig.crew_slots.map(cs =>
						getCrewEventBonus(voyageConfig, cs.crew)
					);
					const seconds: number = estimate.refills[0].result*60*60;
					estimate.vpDetails = calcVoyageVP(seconds, eventCrewBonuses, voyageConfig.event_content?.encounter_times);
				}
				result.name = formatTime(estimate.refills[0].result, t);
				if (result.proposal) result.proposal.estimate = estimate;
				result.confidenceState = 2;
				setResults([...results]);
			}
		});
		worker.postMessage(VoyageEstConfig);
		result.name = t('spinners.default');
		result.confidenceState = 1;
		setResults([...results]);
	}

	function dismissResult(resultId: string): void {
		const resultIndex: number = results.findIndex(result => result.id === resultId);
		if (resultIndex < 0) return;

		results.splice(resultIndex, 1);
		setResults([...results]);

		// Focus on newest remaining result, if any
		if (activeIndex >= results.length)
			setActiveIndex(Math.max(results.length - 1, 0));
	}

	function addResult(request: IVoyageRequest, result: IVoyageResult): void {
		requests.push(request);
		setRequests([...requests]);
		results.push(result);
		setResults([...results]);

		// Focus on newest result
		setActiveIndex(results.length - 1);
	}
};
