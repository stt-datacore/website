import { TranslateMethod, Voyage, VoyageCrewSlot } from '../../model/player';
import { Estimate, IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedCheckpoint, ITrackedAssignmentsByCrew, ITrackedDataRecord, IFullPayloadAssignment } from '../../model/voyage';
import { UnifiedWorker } from '../../typings/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { CrewMember } from '../../model/crew';
import { DropdownItemProps } from 'semantic-ui-react';

export const NEW_VOYAGE_ID = 0;
export const NEW_TRACKER_ID = 0;

export enum InitState {
	Initializing,
	VarsLoading,
	VarsLoaded,
	HistoryLoaded,
	Reconciling,
	Initialized
};

export enum SyncState {
	ReadOnly,
	LocalOnly,
	RemoteReady
};

export interface TrackerPostResult {
	status: number;
	inputId?: number;
	trackerId?: number;
};

export interface LootCrew {
	crew: CrewMember;
	voyages: ITrackedVoyage[]
}

export const defaultHistory: IVoyageHistory = {
	voyages: [],
	crew: {}
};

export function createTrackableVoyage(
	voyageConfig: IVoyageCalcConfig,
	shipSymbol: string,
	estimate: Estimate,
	trackerId?: number,
	runningVoyage?: Voyage,
	runningCheckpoint?: ITrackedCheckpoint
): ITrackedVoyage {
	const flatEstimate = flattenEstimate(estimate);
	const currentTime: number = Date.now();
	const defaultCheckpoint: ITrackedCheckpoint = {
		state: 'pending',
		runtime: 0,
		hp: voyageConfig.max_hp,
		estimate: flatEstimate,
		checked_at: currentTime
	};
	return {
		tracker_id: trackerId ?? NEW_TRACKER_ID,
		voyage_id: runningVoyage ? runningVoyage.id : NEW_VOYAGE_ID,
		skills: voyageConfig.skills,
		ship: shipSymbol,
		ship_trait: voyageConfig.ship_trait,
		max_hp: voyageConfig.max_hp,
		skill_aggregates: voyageConfig.skill_aggregates,
		estimate: flatEstimate,
		created_at: runningVoyage ? Date.parse(runningVoyage.created_at) : currentTime,
		checkpoint: runningCheckpoint ?? defaultCheckpoint,
		revivals: 0,
		lootcrew: []
	};
}

export function createTrackableCrew(
	voyageConfig: IVoyageCalcConfig,
	trackerId?: number
): IFullPayloadAssignment[] {
	const trackableCrew: IFullPayloadAssignment[] = [];
	CONFIG.VOYAGE_CREW_SLOTS.forEach((slotSymbol, slotIndex) => {
		const voyageSlot: VoyageCrewSlot | undefined = voyageConfig.crew_slots.find(slot => slot.symbol === slotSymbol);
		if (voyageSlot) {
			trackableCrew.push({
				tracker_id: trackerId ?? NEW_TRACKER_ID,
				crew: voyageSlot.crew.symbol,
				slot: slotIndex,
				trait: voyageSlot.crew.traits.includes(voyageSlot.trait) ? voyageSlot.trait : '',
				kwipment: voyageSlot.crew.kwipment
			});
		}
	});
	return trackableCrew;
}

export function addVoyageToHistory(history: IVoyageHistory, trackerId: number, trackableVoyage: ITrackedVoyage): void {
	history.voyages.push({...trackableVoyage, tracker_id: trackerId});
}

export function addCrewToHistory(history: IVoyageHistory, trackerId: number, trackableCrew: IFullPayloadAssignment[]): void {
	trackableCrew.forEach(assignment => {
		const crewSymbol: string = assignment.crew;
		history.crew[crewSymbol] ??= [];
		if (!history.crew[crewSymbol].find(existing => existing.tracker_id === trackerId)) {
			history.crew[crewSymbol].push({...assignment, tracker_id: trackerId});
		}
	});
}

export function updateVoyageInHistory(history: IVoyageHistory, trackedVoyage: ITrackedVoyage): void {
	const trackerIndex: number = history.voyages.findIndex(voyage => voyage.tracker_id === trackedVoyage.tracker_id);
	if (trackerIndex >= 0) history.voyages[trackerIndex] = trackedVoyage;
}

// Remove tracked voyage and associated crew assignments
export function removeVoyageFromHistory(history: IVoyageHistory, trackerId: number): void {
	const index: number = history.voyages.findIndex(voyage => voyage.tracker_id === trackerId);
	if (index >= 0) history.voyages.splice(index, 1);

	const crewToDelete: string[] = [];
	Object.entries(history.crew).forEach(([crewSymbol, assignments]) => {
		let index: number = assignments.findIndex(assignment => assignment.tracker_id === trackerId);
		if (index >= 0) assignments.splice(index, 1);
		if (assignments.length === 0) crewToDelete.push(crewSymbol);
	});
	crewToDelete.forEach(crewSymbol => delete history.crew[crewSymbol]);
}

export async function createCheckpoint(voyageConfig: Voyage): Promise<ITrackedCheckpoint> {
	return new Promise<ITrackedCheckpoint>(resolve => {
		const clockedLogTime = voyageConfig.log_index/180;	// Runtime in hours at the point the user last checked on the voyage in-game
		const clockedHp = voyageConfig.hp;	// Remaining antimatter at the point the user last checked on on the voyage in-game
		// Use clocked log time, hp for more accurate checkpoint estimates; might be a little stale though!
		estimateTrackedVoyage(voyageConfig, clockedLogTime*3600).then((estimate: Estimate) => {
			const checkpoint = {
				state: voyageConfig.state,
				runtime: clockedLogTime,
				hp: clockedHp,
				checked_at: Date.now(),
				estimate: flattenEstimate(estimate)
			};
			resolve(checkpoint);
		})
	});
}

export async function estimateTrackedVoyage(voyageConfig: Voyage, duration?: number, currentAm?: number): Promise<Estimate> {
	return new Promise<Estimate>(resolve => {
		const config = {
			startAm: voyageConfig.max_hp,
			currentAm: currentAm ?? voyageConfig.hp,
			elapsedSeconds: duration ?? voyageConfig.voyage_duration,
			ps: voyageConfig.skill_aggregates[voyageConfig.skills['primary_skill']],
			ss: voyageConfig.skill_aggregates[voyageConfig.skills['secondary_skill']],
			others: Object.values(voyageConfig.skill_aggregates).filter(s => !Object.values(voyageConfig.skills).includes(s.skill))
		};
		const VoyageEstConfig = {
			config,
			worker: 'voyageEstimate'
		};
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) resolve(message.data.result);
		});
		worker.postMessage(VoyageEstConfig);
	});
}

export function getRuntime(voyageConfig: Voyage): number {
	const durationTime = voyageConfig.voyage_duration/3600;	// Runtime in hours, including time waiting for dilemma to be resolved
	const clockedLogTime = voyageConfig.log_index/180;	// Runtime in hours at the point the user last checked on the voyage in-game

	let runtime = durationTime;
	if (voyageConfig.state === 'started') {
		// Use dilemma hour as runtime if waiting to resolve dilemma
		const dilemmaTime = Math.floor(clockedLogTime)+2-(Math.floor(clockedLogTime)%2);
		if (durationTime > dilemmaTime) runtime = dilemmaTime;
	}
	// Use log time as runtime if voyage recalled or failed
	else {
		runtime = clockedLogTime;
	}

	return runtime;
}

export async function getTrackedData(dbid: string, trackerId?: string): Promise<IVoyageHistory | undefined> {
	let url = `${process.env.GATSBY_DATACORE_URL}api/getTrackedData?`;
	if (trackerId) {
		url += `dbid=${dbid}&trackerId=${trackerId}`;
	}
	else {
		url += `dbid=${dbid}`;
	}

	let response = await fetch(`${url}}`);

	if (response.ok) {
		let resultcrew: ITrackedAssignmentsByCrew = {};
		let resultvoyages: ITrackedVoyage[] = [];

		let hist: ITrackedDataRecord = await response.json() as ITrackedDataRecord;

		if (hist.assignments) {
			for (let crew of hist.assignments) {
				resultcrew[crew.crew] ??= [];
				resultcrew[crew.crew].push(crew.assignment);
			}
		}

		if (hist.voyages) {
			resultvoyages = hist.voyages.map(histVoy => ({...histVoy.voyage, tracker_id: histVoy.trackerId }));
		}

		let result: IVoyageHistory = {
			voyages: resultvoyages,
			crew: resultcrew
		};

		return result;
	}
	else {
		return undefined;
	}
}

export function createReportDayOptions(t: TranslateMethod) {
	const reportDayOptions: DropdownItemProps[] = [
		{	/* Show all voyages */
			key: 'all',
			value: undefined,
			text: t('voyage.show_all_voyages')
		},
		{	/* Show voyages from last year */
			key: 'year',
			value: 365,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.year') })
		},
		{	/* Show voyages from last 180 days */
			key: 'half',
			value: 180,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.half') })
		},
		{	/* Show voyages from last 90 days */
			key: 'quarter',
			value: 90,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.quarter') })
		},
		{	/* Show voyages from last 60 days */
			key: 'months',
			value: 60,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.months') })
		},
		{	/* Show voyages from last month */
			key: 'month',
			value: 30,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.month') })
		},
		{	/* Show voyages from last week */
			key: 'week',
			value: 7,
			text: t('voyage.crew_history.options.report', { period: t('voyage.crew_history.options.report_period.week') })
		}
	];

	return reportDayOptions;
}

export async function postTrackedData(dbid: string, voyage: ITrackedVoyage, assignments: IFullPayloadAssignment[]): Promise<TrackerPostResult> {
	let route = `${process.env.GATSBY_DATACORE_URL}api/postTrackedData`
	return await fetch(route, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			voyage,
			assignments
		})
	})
	.then((response: Response) => response.json())
	.catch((error) => { throw(error); });
}

export async function postVoyage(dbid: string, voyage: ITrackedVoyage): Promise<TrackerPostResult> {
	let route = `${process.env.GATSBY_DATACORE_URL}api/postVoyage`
	return await fetch(route, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			voyage
		})
	})
	.then((response: Response) => response.json())
	.catch((error) => { throw(error); });
}

export async function deleteTrackedData(dbid: string, trackerId?: number): Promise<boolean> {
	let url = `${process.env.GATSBY_DATACORE_URL}api/deleteTrackedData?`;
	if (trackerId) {
		url += `dbid=${dbid}&trackerId=${trackerId}`;
	}
	else {
		url += `dbid=${dbid}`;	// NOT FUNCTIONAL
	}
	return await fetch(url, { method: 'DELETE' })
		.then((response: Response) => !!response)
		.catch((error) => { throw(error); });
}
