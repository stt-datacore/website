import { TranslateMethod, Voyage, VoyageCrewSlot } from '../../model/player';
import { Estimate, IVoyageCalcConfig, IVoyageHistory, ITrackedVoyage, ITrackedCheckpoint, ITrackedAssignmentsByCrew, ITrackedDataRecord, IFullPayloadAssignment } from '../../model/voyage';
import { UnifiedWorker } from '../../typings/worker';
import CONFIG from '../CONFIG';
import { flattenEstimate } from '../../utils/voyageutils';
import { CrewMember } from '../../model/crew';
import { DropdownItemProps } from 'semantic-ui-react';
import { IRosterCrew } from '../crewtables/model';

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

export interface TrackerPostResultBatch {
	status: number;
	data: {
		status: number;
		inputId?: number;
		trackerId?: number;
	}[]
};

export interface LootCrew {
	crew: IRosterCrew;
	voyages: ITrackedVoyage[]
}

export const defaultHistory: IVoyageHistory = {
	voyages: [],
	crew: {}
};

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
			resultvoyages = hist.voyages.map(histVoy => ({...histVoy.voyage, tracker_id: histVoy.trackerId, remote: true }));
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

export async function postTrackedDataBatch(dbid: string, voyages: ITrackedVoyage[], assignments: IFullPayloadAssignment[][]): Promise<TrackerPostResultBatch> {
	let route = `${process.env.GATSBY_DATACORE_URL}api/postTrackedDataBatch`
	return await fetch(route, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			dbid,
			voyages,
			assignments
		})
	})
	.then((response: Response) => response.json())
	.catch((error) => { throw(error); });
}

export async function postUnsynchronizedVoyages(dbid: string, history: IVoyageHistory, tracker_id?: number) {
	let route = `${process.env.GATSBY_DATACORE_URL}api/postTrackedData`
	let unsynced = history.voyages.filter(v => !v.remote);
	let crewkeys = Object.keys(history.crew);

	for (let voyage of unsynced) {
		if (tracker_id !== undefined && voyage.tracker_id !== tracker_id) continue;
		let assignments = [] as IFullPayloadAssignment[];
		for (let key of crewkeys) {
			let fc = history.crew[key].filter(f => f.tracker_id === voyage.tracker_id);
			if (fc?.length) {
				for (let sym of fc) {
					assignments.push({
						...sym,
						crew: key,
					});
				}
			}
		}
		assignments.sort((a, b) => a.slot - b.slot);
		let res = (await fetch(route, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				dbid,
				voyage,
				assignments
			})
		})
		.then((response: Response) => response.json())
		.catch((error) => { throw(error); })) as TrackerPostResult;

		if (res?.trackerId) {
			voyage.tracker_id = res.trackerId;
			voyage.remote = true;
		}
	}
}

export function repairRemoteHistory(dbid: string): Promise<any> {
	return fetch(`${process.env.GATSBY_DATACORE_URL}api/repairVoyages?dbid=${dbid}`)
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

export function mergeHistories(local: IVoyageHistory, remote: IVoyageHistory, importMode?: boolean) {
	local.voyages ??= [];
	local.crew ??= {};
	remote.voyages ??= [];
	remote.crew ??= {};

	let lrms = local.voyages.filter(f => f.remote);
	let rrms = remote.voyages.filter(f => f.remote);
	let allorig = local.voyages.concat(remote.voyages);

	function cleanHistory(hist: IVoyageHistory) {
		hist.voyages = hist.voyages.filter(f => !!f?.tracker_id);
		Object.keys(hist.crew).forEach((symbol) => {
			hist.crew[symbol] = hist.crew[symbol].filter((f, i) => !!f?.tracker_id && hist.crew[symbol].findIndex(fii => fii.tracker_id === f.tracker_id) === i);
			if (!hist.crew[symbol].length) delete hist.crew[symbol];
		});
	}

	cleanHistory(local);
	cleanHistory(remote);

	const changeTrackerId = (hist: IVoyageHistory, oldId: number, newId: number) => {
		hist.voyages.forEach((voy) => {
			if (voy.tracker_id === oldId) voy.tracker_id = newId;
		});
		Object.entries(hist.crew).forEach(([symbol, assignments]) => {
			for (let a of assignments) {
				if (a.tracker_id === oldId) a.tracker_id = newId;
			}
		});
	}

	const removeTrackerId = (hist: IVoyageHistory, tracker_id: number) => {
		hist.voyages = hist.voyages.filter(f => f.tracker_id !== tracker_id);
		const delsym = [] as string[];
		Object.keys(hist.crew).forEach((symbol) => {
			hist.crew[symbol] = hist.crew[symbol].filter(f => f.tracker_id !== tracker_id);
			if (!hist.crew[symbol].length) delsym.push(symbol);
		});
		delsym.forEach(symbol => delete hist.crew[symbol]);
	}

	let localIds = local.voyages.map(m => m.tracker_id);
	let remoteIds = remote.voyages.map(m => m.tracker_id);

	localIds.sort();

	let maxRemote = remoteIds.sort((a, b) => b - a)[0];
	let minLocal = maxRemote + 1;
	let lvoyages = local.voyages.slice();

	if (lvoyages.length) {
		lvoyages.forEach((voy) => {
			let rf = remote.voyages.find(f => f.voyage_id === voy.voyage_id);
			if (voy.voyage_id && rf) {
				removeTrackerId(local, voy.tracker_id);
			}
			else if (remoteIds.includes(voy.tracker_id))  {
				changeTrackerId(local, voy.tracker_id, minLocal++);
			}
		});
	}

	const currhistory = local;

	let newvoyages = remote.voyages.concat(currhistory.voyages)

	newvoyages.sort((a, b) => a.created_at - b.created_at || a.voyage_id - b.voyage_id || a.tracker_id - b.tracker_id);

	// Prefilter. Prefer remote.
	newvoyages = newvoyages.filter((voy, idx) => voy.voyage_id == 0 ? true : newvoyages.findIndex(fivoy => voy.voyage_id == fivoy.voyage_id) == idx);


	// examine voyages for duplication
	let testvoyages = newvoyages.slice();

	newvoyages.sort((a, b) => b.voyage_id - a.voyage_id || (a.remote == b.remote ? 0 : (a.remote ? -1 : b.remote ? 1 : 0)));
	newvoyages = newvoyages.filter((voy, idx) => newvoyages.findIndex(voy2 => compareVoyages(voy2, voy, { omitVoyageId: true, omitTrackerId: true, omitCreatedAt: true })) == idx);

	// Check tracker id's.
	newvoyages.sort((a, b) => b.tracker_id - a.tracker_id);
	let newid = newvoyages[0].tracker_id + 1;
	let unique_ids = [...new Set(newvoyages.map(m => m.tracker_id))];

	for (let tid of unique_ids) {
		let found = newvoyages.filter(f => f.tracker_id === tid);
		if (found.length > 1) {
			let c = found.length;
			for (let i = 1; i < c; i++) {
				found[i].tracker_id = newid++;
				found[i].remote = false;
			}
		}
	}

	if (importMode) {
		let orphans = allorig.filter(f => !newvoyages.some(f2 => {
			return compareVoyages(f, f2, { omitTrackerId: true, omitVoyageId: true, omitCreatedAt: true })
		}));
		if (orphans.length) {
			orphans.sort((a, b) => a.created_at - b.created_at);
			for (let orphan of orphans) {
				orphan.tracker_id = newid++;
				orphan.orphan = true;
				orphan.remote = false;
			}
			orphans.reverse();
			newvoyages = orphans.concat(newvoyages);
		}
	}

	newvoyages.sort((a, b) => b.created_at - a.created_at);

	currhistory.voyages = newvoyages;

	Object.keys(remote.crew).forEach((symbol) => {
		currhistory.crew[symbol] ??= [];
		if (currhistory.crew[symbol]) {
			currhistory.crew[symbol] = currhistory.crew[symbol].concat(remote.crew[symbol]);
		}
	});

	currhistory.voyages.forEach((voy) => {
		if (lrms.some(v => v.tracker_id === voy.tracker_id && v.remote) || rrms.some(v => v.tracker_id === voy.tracker_id && v.remote)) {
			voy.remote = true;
		}
		else {
			voy.remote = false;
		}
	});

	return currhistory;
}

interface CompareOpts {
	omitTrackerId?: boolean,
	omitVoyageId?: boolean,
	omitCreatedAt?: boolean,
}

function compareVoyages(voyage1: ITrackedVoyage, voyage2: ITrackedVoyage, opts?: CompareOpts) {

	opts ??= {};
	const { omitCreatedAt, omitTrackerId, omitVoyageId } = opts;

    if (!omitTrackerId && voyage1.tracker_id !== voyage2.tracker_id) return false;
	if (!omitVoyageId && voyage1.voyage_id !== voyage2.voyage_id) return false;
	if (!omitCreatedAt && voyage1.created_at !== voyage2.created_at) return false;
    if (voyage1.skills.primary_skill !== voyage2.skills.primary_skill) return false;
    if (voyage1.skills.secondary_skill !== voyage2.skills.secondary_skill) return false;
    if (voyage1.ship_trait !== voyage2.ship_trait) return false;
    if (voyage1.estimate.dilemma.chance !== voyage2.estimate.dilemma.chance) return false;
    if (voyage1.estimate.dilemma.hour !== voyage2.estimate.dilemma.hour) return false;
    if (voyage1.estimate.median !== voyage2.estimate.median) return false;
    if (voyage1.estimate.minimum !== voyage2.estimate.minimum) return false;
    if (voyage1.estimate.moonshot !== voyage2.estimate.moonshot) return false;
    if (voyage1.ship !== voyage2.ship) return false;
    if (voyage1.max_hp !== voyage2.max_hp) return false;
	for (let agg of ['command_skill', 'science_skill', 'diplomacy_skill', 'security_skill', 'medicine_skill', 'engineering_skill']) {
		if (!voyage1.skill_aggregates[agg] && !voyage2.skill_aggregates[agg]) continue;
		else if (!voyage1.skill_aggregates[agg] || !voyage2.skill_aggregates[agg]) return false;

		if (voyage1.skill_aggregates[agg].core !== voyage2.skill_aggregates[agg].core) return false;
		if (voyage1.skill_aggregates[agg].range_min !== voyage2.skill_aggregates[agg].range_min) return false;
		if (voyage1.skill_aggregates[agg].range_max !== voyage2.skill_aggregates[agg].range_max) return false;
	}
	return true;
}
