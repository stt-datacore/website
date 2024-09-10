import { Voyage } from '../../model/player';
import { IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedAssignment, ITrackedCheckpoint, ITrackedAssignmentsByCrew } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { UnifiedWorker } from '../../typings/worker';

export const NEW_VOYAGE_ID = 0;

export const defaultHistory: IVoyageHistory = {
	voyages: [],
	crew: {}
};

export function addVoyageToHistory(history: IVoyageHistory, voyageConfig: IVoyageCalcConfig | Voyage, shipSymbol: string, estimate: Estimate): number {
	// Get next unused id to track this voyage
	const trackerId = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;

	const flatEstimate = flattenEstimate(estimate);
	const voyage = {
		tracker_id: trackerId,
		voyage_id: NEW_VOYAGE_ID,	// *
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
	return trackerId;
}

export function addCrewToHistory(history: IVoyageHistory, trackerId: number, voyageConfig: IVoyageCalcConfig): void {
	CONFIG.VOYAGE_CREW_SLOTS.forEach((slotSymbol, slotIndex) => {
		const voyageSlot = voyageConfig.crew_slots.find(slot => slot.symbol === slotSymbol);
		if (voyageSlot) {
			const crewSymbol = voyageSlot.crew.symbol;
			const assignment = {
				tracker_id: trackerId,
				slot: slotIndex,
				trait: voyageSlot.crew.traits.includes(voyageSlot.trait) ? voyageSlot.trait : ''
			} as ITrackedAssignment;
			if (!!history.crew[crewSymbol])
				history.crew[crewSymbol].push(assignment);
			else
				history.crew[crewSymbol] = [assignment];
		}
	});
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

export function mergeHistories(h1: IVoyageHistory, h2: IVoyageHistory): IVoyageHistory {
	// Start with blank history
	const newVoyages: ITrackedVoyage[] = [];
	const newAssignments: ITrackedAssignmentsByCrew = {};

	let lastId: number = 0;

	// Add h1 voyages to new history, with new validated ids for each voyage
	h1.voyages.forEach(v1 => {
		const oldId: number = v1.tracker_id;
		const newId: number = ++lastId;
		const newVoyage: ITrackedVoyage = {
			...v1,
			tracker_id: newId
		};
		newVoyages.push(newVoyage);
		Object.keys(h1.crew).forEach(crewSymbol => {
			const oldAssignment: ITrackedAssignment | undefined = h1.crew[crewSymbol].find(a => a.tracker_id === oldId);
			if (oldAssignment) {
				if (!!!newAssignments[crewSymbol]) newAssignments[crewSymbol] = [];
				newAssignments[crewSymbol].push({
					...oldAssignment,
					tracker_id: newId
				})
			}
		});
	});

	console.log(newVoyages, newAssignments);

	return {
		voyages: newVoyages,
		crew: newAssignments
	};
}

export function compareTrackedVoyages(v1: ITrackedVoyage, v2: ITrackedVoyage): boolean {
	if (v1.voyage_id === v2.voyage_id) return true;

	const obj1 = {
		skills: v1.skills,
		ship: v1.ship,
		ship_trait: v1.ship_trait,
		max_hp: v1.max_hp,
		skill_aggregates: v1.skill_aggregates
	};

	const obj2 = {
		skills: v2.skills,
		ship: v2.ship,
		ship_trait: v2.ship_trait,
		max_hp: v2.max_hp,
		skill_aggregates: v2.skill_aggregates
	};

	return JSON.stringify(obj1) === JSON.stringify(obj2);
}
