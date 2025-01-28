import { Voyage } from '../../model/player';
import { IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedAssignment, ITrackedCheckpoint } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { UnifiedWorker } from '../../typings/worker';
export const defaultHistory = {
	voyages: [],
	crew: {}
} as IVoyageHistory;

export function addVoyageToHistory(history: IVoyageHistory, voyageConfig: IVoyageCalcConfig | Voyage, shipSymbol: string, estimate: Estimate): number {
	// Get next unused id to track this voyage
	const trackerId = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;

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
