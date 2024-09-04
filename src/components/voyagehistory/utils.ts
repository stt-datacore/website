import { Voyage } from '../../model/player';
import { IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedAssignment, ITrackedCheckpoint, ITrackedDataRecord, ITrackedAssignmentsByCrew } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { UnifiedWorker } from '../../typings/worker';

export const defaultHistory = {
	voyages: [],
	crew: {}
} as IVoyageHistory;

export interface TrackerPostResult {
    status: number;
    inputId?: number;
    trackerId?: number;
}

export async function getRemoteHistory(trackerId?: string, dbid?: number): Promise<IVoyageHistory | undefined> {

	let url = `${process.env.GATSBY_DATACORE_URL}api/getTrackedData?`;
	if (trackerId && dbid) {
		url += `dbid=${dbid}&trackerId=${trackerId}`;
	}
	else if (dbid) {
		url += `dbid=${dbid}`;
	}
	else {
		return undefined;
	}

	let response = await fetch(`${url}}`);

	if (response.ok) {
		let resultcrew = {} as ITrackedAssignmentsByCrew;
		let resultvoyages = [] as ITrackedVoyage[];

		let hist = await response.json() as ITrackedDataRecord;

		if (hist.assignments) {
			for (let crew of hist.assignments) {
				resultcrew[crew.crew] ??= [];
				resultcrew[crew.crew].push(crew.assignment);
			}
		}

		if (hist.voyages) {
			resultvoyages = hist.voyages.map(histVoy => histVoy.voyage);
		}

		let result = {
			voyages: resultvoyages,
			crew: resultcrew
		} as IVoyageHistory;

		return result;
	}
	else {
		return undefined;
	}
}

export async function postRemoteHistory(voyage: ITrackedVoyage, dbid: number): Promise<TrackerPostResult> {
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

export function compareTrackedVoyages(v1: ITrackedVoyage, v2: ITrackedVoyage) {
	if (v1.voyage_id === v2.voyage_id) return true;

	let obj1 = {
		skills: v1.skills,
		ship: v1.ship,
		ship_trait: v1.ship_trait,
		max_hp: v1.max_hp,
		skill_aggregates: v1.skill_aggregates
	}

	let obj2 = {
		skills: v2.skills,
		ship: v2.ship,
		ship_trait: v2.ship_trait,
		max_hp: v2.max_hp,
		skill_aggregates: v2.skill_aggregates
	}

	return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export async function reconcileHistories(dbid: number, local: IVoyageHistory, remote: IVoyageHistory): Promise<IVoyageHistory> {
	let c = local.voyages.length;
	let d = remote.voyages.length;
	let safeId = remote.voyages.map(m => m.tracker_id).reduce((p, n) => p > n ? n : p, 0) + 1;
	let goodLocals = [] as number[];

	for (let i = 0; i < c; i++) {
		let pass = true;
		for (let j = 0; j < d; j++) {
			if (compareTrackedVoyages(local.voyages[i], remote.voyages[j])) {
				pass = false;
				break;
			}
			else if (local.voyages[i].tracker_id === remote.voyages[i].tracker_id) {
				let oldId = local.voyages[i].tracker_id;
				let newId = safeId++;

				local.voyages[i].tracker_id = newId;

				Object.keys(local.crew).forEach((symbol) => {
					for (let assignment of local.crew[symbol]) {
						if (assignment.tracker_id === oldId) {
							assignment.tracker_id = newId;
						}
					}
				});
			}
		}

		if (pass) {
			goodLocals.push(local.voyages[i].tracker_id);
		}
	}

	for (let trackerId of goodLocals) {
		let voyage = local.voyages.find(f => f.tracker_id === trackerId)!;
		let result = await postRemoteHistory(voyage, dbid);
		if (result?.trackerId) {
			const crewForPost = {} as { [key: string]: ITrackedAssignment[] };
			voyage.tracker_id = result.trackerId;
			for (let symbol in local.crew) {
				let crewTrack = local.crew[symbol].find(f => f.tracker_id === trackerId);
				if (crewTrack) {
					crewTrack.tracker_id = voyage.tracker_id;
					crewForPost[symbol] ??= [];
					crewForPost[symbol].push(crewTrack);
				}
			}
			await postRemoteCrew(crewForPost, dbid);
		}
	}

	return (await getRemoteHistory())!
}

export async function addVoyageToHistory(history: IVoyageHistory, voyageConfig: IVoyageCalcConfig | Voyage, shipSymbol: string, estimate: Estimate, postRemote?: boolean, dbid?: number): Promise<number> {
	// Get next unused id to track this voyage
	let trackerId = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;
	const flatEstimate = flattenEstimate(estimate);
	const voyage = {
		tracker_id: trackerId,
		voyage_id: 0,	// *
		skills: voyageConfig.skills,
		ship: shipSymbol,	// *
		ship_trait: voyageConfig.ship_trait,
		max_hp: voyageConfig.max_hp,
		skill_aggregates: voyageConfig.skill_aggregates,
		estimate: flatEstimate,
		created_at: Date.now(),	// *
		checkpoint: {
			state: 'pending',
			runtime: 0,
			hp: voyageConfig.max_hp,
			estimate: flatEstimate,
			checked_at: Date.now()
		},
		revivals: 0
	} as ITrackedVoyage;
	// * Reconcile on next playerData update, if necessary

	history.voyages.push(voyage);
	if (postRemote && dbid) {
		let result = await postRemoteHistory(voyage, dbid);
		if (result?.status < 300 && result.trackerId && result.inputId === trackerId) {
			trackerId = result.trackerId;
		}
	}

	return trackerId;
}

export async function postRemoteCrew(assignments: { [key: string]: ITrackedAssignment[] }, dbid: number): Promise<boolean> {
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

export function addCrewToHistory(history: IVoyageHistory, trackerId: number, voyageConfig: IVoyageCalcConfig, postRemote?: boolean, dbid?: number): void {
	const crewForPost = {} as { [key: string]: ITrackedAssignment[] };

	CONFIG.VOYAGE_CREW_SLOTS.forEach((slotSymbol, slotIndex) => {
		const voyageSlot = voyageConfig.crew_slots.find(slot => slot.symbol === slotSymbol);
		if (voyageSlot) {
			const crewSymbol = voyageSlot.crew.symbol;
			const assignment = {
				tracker_id: trackerId,
				slot: slotIndex,
				trait: voyageSlot.crew.traits.includes(voyageSlot.trait) ? voyageSlot.trait : '',
				kwipment: voyageSlot.crew.kwipment
			} as ITrackedAssignment;

			history.crew[crewSymbol] ??= [];
			history.crew[crewSymbol].push(assignment);

			if (postRemote && dbid) {
				crewForPost[crewSymbol] ??= [];
				crewForPost[crewSymbol].push(assignment);
			}
		}
	});


	if (postRemote && dbid) {
		postRemoteCrew(crewForPost, dbid);
	}
}

export function removeVoyageFromHistory(history: IVoyageHistory, trackerId: number): void {
	const index = history.voyages.findIndex(voyage => voyage.tracker_id === trackerId);
	if (index >= 0) history.voyages.splice(index, 1);

	const crewToDelete = [] as string[];
	Object.entries(history.crew).forEach(([crewSymbol, assignments]) => {
		let index = assignments.findIndex(assignment => assignment.tracker_id === trackerId);
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
