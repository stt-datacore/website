import { Voyage, VoyageCrewSlot } from '../../model/player';
import { IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedAssignment, ITrackedCheckpoint, ITrackedAssignmentsByCrew, ITrackedDataRecord } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { UnifiedWorker } from '../../typings/worker';

export const NEW_VOYAGE_ID = 0;

export enum InitState {
	Initializing,
	VarsLoading,
	VarsLoaded,
	HistoryLoaded,
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

export const defaultHistory: IVoyageHistory = {
	voyages: [],
	crew: {}
};

export function createTrackableVoyage(
	localTrackerId: number,
	voyageConfig: IVoyageCalcConfig,
	shipSymbol: string,
	estimate: Estimate,
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
		tracker_id: localTrackerId,
		voyage_id: runningVoyage ? runningVoyage.id : NEW_VOYAGE_ID,
		skills: voyageConfig.skills,
		ship: shipSymbol,
		ship_trait: voyageConfig.ship_trait,
		max_hp: voyageConfig.max_hp,
		skill_aggregates: voyageConfig.skill_aggregates,
		estimate: flatEstimate,
		created_at: runningVoyage ? Date.parse(runningVoyage.created_at) : currentTime,
		checkpoint: runningCheckpoint ?? defaultCheckpoint,
		revivals: 0
	};
}

export function createTrackableAssignments(
	trackerId: number,
	voyageConfig: IVoyageCalcConfig
): ITrackedAssignmentsByCrew {
	const crewAssignments: ITrackedAssignmentsByCrew = {};
	CONFIG.VOYAGE_CREW_SLOTS.forEach((slotSymbol, slotIndex) => {
		const voyageSlot: VoyageCrewSlot | undefined = voyageConfig.crew_slots.find(slot => slot.symbol === slotSymbol);
		if (voyageSlot) {
			const crewSymbol: string = voyageSlot.crew.symbol;
			const assignment: ITrackedAssignment = {
				tracker_id: trackerId,
				slot: slotIndex,
				trait: voyageSlot.crew.traits.includes(voyageSlot.trait) ? voyageSlot.trait : '',
				kwipment: voyageSlot.crew.kwipment
			};
			crewAssignments[crewSymbol] ??= [];
 			crewAssignments[crewSymbol].push(assignment);
		}
	});
	return crewAssignments;
}

export function addVoyageToHistory(history: IVoyageHistory, trackedVoyage: ITrackedVoyage): void {
	history.voyages.push(trackedVoyage);
}

export function addCrewToHistory(history: IVoyageHistory, crewAssignments: ITrackedAssignmentsByCrew): void {
	Object.keys(crewAssignments).forEach(crewSymbol => {
		history.crew[crewSymbol] ??= [];
		crewAssignments[crewSymbol].forEach(assignment => {
			if (!history.crew[crewSymbol].find(existing => existing.tracker_id === assignment.tracker_id)) {
				history.crew[crewSymbol].push(assignment);
			}
		});
	});
}

export function updateVoyageInHistory(history: IVoyageHistory, trackerId: number, updatedVoyage: ITrackedVoyage): void {
	const trackerIndex: number = history.voyages.findIndex(voyage => voyage.tracker_id === trackerId);
	if (trackerIndex >= 0) history.voyages[trackerIndex] = updatedVoyage;
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

export async function getRemoteHistory(dbid: string, trackerId?: string): Promise<IVoyageHistory | undefined> {
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
			resultvoyages = hist.voyages.map(histVoy => histVoy.voyage);
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

export async function postRemoteVoyage(dbid: string, voyage: ITrackedVoyage): Promise<TrackerPostResult> {
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

export async function postRemoteCrew(dbid: string, assignments: ITrackedAssignmentsByCrew): Promise<boolean> {
	let route = `${process.env.GATSBY_DATACORE_URL}api/postAssignments`
	return await fetch(route, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			assignments
		})
	})
	.then((response: Response) => !!response)
	.catch((error) => { throw(error); });
}

export async function putRemoteVoyage(dbid: string, trackerId: number, voyage: ITrackedVoyage): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		reject('No API to update voyage');
	});
	// TODO: Send request to update voyage in remote history, similar to the following code:
	let route = `${process.env.GATSBY_DATACORE_URL}api/putVoyage`
	return await fetch(route, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			trackerId,
			voyage
		})
	})
	.then((response: Response) => !!response)
	.catch((error) => { throw(error); });
};

export async function deleteRemoteVoyage(dbid: string, trackerId: number): Promise<boolean> {
	// Can ignore delete request when tracker_id not set
	if (trackerId === 0) return true;
	return new Promise<boolean>((resolve, reject) => {
		reject('No API to delete remote voyage');
	});
	// TODO: Send request to delete voyage from remote history, similar to the following code:
	//	Need to also disassociate crew from deleted voyage, either here or remotely
	let route = `${process.env.GATSBY_DATACORE_URL}api/deleteVoyage`
	return await fetch(route, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			trackerId
		})
	})
	.then((response: Response) => !!response)
	.catch((error) => { throw(error); });
}
