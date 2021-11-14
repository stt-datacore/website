/*
DataCore(<VoyageTool>): input from UI =>
	Calculator Helper(): input as message =>
		Unified Worker(): input as message =>
			Calculator Worker() { parse input, start calculating } : results

Calculator Worker(): results =>
	Unified Worker(): results as message =>
		Calculator Helper(): ICalcResults =>
			DataCore(<VoyageTool>) { updateUI } : void
*/

import CONFIG from '../components/CONFIG';

import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';

export const CALCULATORS = {
	helpers: [
		{ id: 'iampicard', name: 'Original', helper: (props: HelperProps) => new IAmPicardHelper(props) },
		{ id: 'ussjohnjay', name: 'Multi-vector Assault', helper: (props: HelperProps) => new USSJohnJayHelper(props) }
	],
	fields: [
		{
			calculators: ['iampicard'],
			id: 'searchDepth',
			name: 'Search depth',
			description: 'Search depth',
			control: 'select',
			options: [
				{ key: '4', text: '4 (fastest)', value: 4 },
				{ key: '5', text: '5 (faster)', value: 5 },
				{ key: '6', text: '6 (normal)', value: 6 },
				{ key: '7', text: '7 (slower)', value: 7 },
				{ key: '8', text: '8 (slowest)', value: 8 },
				{ key: '9', text: '9 (for supercomputers)', value: 9 }
			],
			default: 6
		},
		{
			calculators: ['iampicard'],
			id: 'extendsTarget',
			name: 'Extends (target)',
			description: 'How many times you plan to revive',
			control: 'select',
			options: [
				{ key: '0', text: 'none (default)', value: 0 },
				{ key: '1', text: 'one', value: 1 },
				{ key: '2', text: 'two', value: 2 }
			],
			default: 0
		},
		{
			calculators: ['ussjohnjay'],
			id: 'estimatorThreshold',
			name: 'Estimator threshold',
			description: 'Estimator threshold',
			control: 'select',
			options: [
				{ key: '0', text: 'Auto (recommended)', value: 0 },
				{ key: '0.1', text: '0.1 (fastest)', value: 0.1 },
				{ key: '0.25', text: '0.25', value: 0.25 },
				{ key: '0.5', text: '0.5', value: 0.5 },
				{ key: '1', text: '1.0 (slowest)', value: 1 }
			],
			default: 0
		}
	]
};

export enum CalculatorState {
	NotStarted,
	InProgress,
	Done
}

interface ICalcResult {
	estimate: any;
	entries: {
		slotId: number;
		choice: any;
		hasTrait: boolean;
	}[];
	aggregates: {
		command_skill: ICrewSkill;
		science_skill: ICrewSkill;
		security_skill: ICrewSkill;
		engineering_skill: ICrewSkill;
		diplomacy_skill: ICrewSkill;
		medicine_skill: ICrewSkill;
	};
	startAM: number;
	explanation?: string;
}

interface ICrewSkill {
	core: number;
	range_min: number;
	range_max: number;
	voyage?: number;	// core + range_min + (range_max-range_min)/2
}

type HelperProps = {
	voyageConfig: any;
	bestShip: any;
	consideredCrew: any[];
	calcOptions: any;
	resultsCallback: (requestId: string, reqResults: ICalcResult[], calcState: number) => void
};

class Helper {
	readonly id: string;
	readonly voyageConfig: any;
	readonly bestShip: any;
	readonly consideredCrew: any[];
	readonly calcOptions: any = {};
	readonly resultsCallback: (requestId: string, reqResults: ICalcResult[], calcState: number) => void;
	readonly calculator: string;
	readonly calcName: string;
	calcWorker: any;
	calcState: number = CalculatorState.NotStarted;
	perf: { start: number, end: number } = { start: 0, end: 0 };

	constructor(props: HelperProps) {
		this.voyageConfig = JSON.parse(JSON.stringify(props.voyageConfig));
		this.bestShip = JSON.parse(JSON.stringify(props.bestShip));
		this.consideredCrew = JSON.parse(JSON.stringify(props.consideredCrew));
		this.resultsCallback = props.resultsCallback;

		if (!this.voyageConfig || !this.bestShip || !this.consideredCrew)
			throw('Voyage calculator cannot start without required parameters!');
	}

	abort(): void {
		if (this.calcWorker) this.calcWorker.terminate();
		this.perf.end = performance.now();
		this.calcState = CalculatorState.Done;
	}
};

// This code is heavily inspired from IAmPicard's work and released under the GPL-V3 license. Huge thanks for all his contributions!
class IAmPicardHelper extends Helper {
	constructor(props: HelperProps) {
		super(props);
		this.id = 'request-'+Date.now();
		this.calculator = 'iampicard';
		this.calcName = 'Original';
		this.calcOptions = {
			searchDepth: props.calcOptions.searchDepth ?? 6,
			extendsTarget: props.calcOptions.extendsTarget ?? 0
		};
	}

	start(): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;

		const IAmPicardConfig = {
			searchDepth: this.calcOptions.searchDepth,
			extendsTarget: this.calcOptions.extendsTarget,
			shipAM: this.bestShip.score,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: this.voyageConfig,
			roster: this.consideredCrew
		};

		let bestScore = 0;
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (message.data.result) {
				const result = new DataView(Uint8Array.from(message.data.result).buffer);
				const score = result.getFloat32(0, true);
				// Progress
				if (message.data.inProgress) {
					// ignore marginal gains (under 5 minutes)
					if (score > bestScore + 1/12) {
						bestScore = score;
						this._finaliseIAPEstimate(result, true);
					}
				// Done
				} else {
					this._finaliseIAPEstimate(result, false);
				}
			}
		});
		const dataToExport = this._exportVoyageData(IAmPicardConfig);
		dataToExport.worker = 'iampicard';
		worker.postMessage(dataToExport);
		this.calcWorker = worker;
	}

	_exportVoyageData(options: any): any {
		let dataToExport = {
			// These values get filled in the following code
			crew: [],
			binaryConfig: undefined
		};

		let binaryConfigBuffer = new ArrayBuffer(34);
		let binaryConfig = new DataView(binaryConfigBuffer);
		binaryConfig.setUint8(0, options.searchDepth);
		binaryConfig.setUint8(1, options.extendsTarget);
		binaryConfig.setUint16(2, options.shipAM, true);
		binaryConfig.setFloat32(4, options.skillPrimaryMultiplier, true);
		binaryConfig.setFloat32(8, options.skillSecondaryMultiplier, true);
		binaryConfig.setFloat32(12, options.skillMatchingMultiplier, true);
		binaryConfig.setUint16(16, options.traitScoreBoost, true);

		// 18 is primary_skill
		// 19 is secondary_skill
		// 20 - 32 is voyage_crew_slots

		binaryConfig.setUint16(32, 0 /*crew.size*/, true);

		let voyage_description = options.voyage_description;
		const SLOT_COUNT = voyage_description.crew_slots.length;
		console.assert(SLOT_COUNT === 12, 'Ooops, voyages have more than 12 slots !? The algorithm needs changes.');

		// Find unique traits used in the voyage slots
		let setTraits = new Set();
		voyage_description.crew_slots.forEach(slot => {
			setTraits.add(slot.trait);
		});

		let arrTraits = Array.from(setTraits);
		let skills = Object.keys(CONFIG.SKILLS);

		// Replace traits and skills with their id
		let slotTraitIds = [];
		for (let i = 0; i < voyage_description.crew_slots.length; i++) {
			let slot = voyage_description.crew_slots[i];

			binaryConfig.setUint8(20 + i, skills.indexOf(slot.skill));
			slotTraitIds[i] = arrTraits.indexOf(slot.trait);
		}

		binaryConfig.setUint8(18, skills.indexOf(voyage_description.skills.primary_skill));
		binaryConfig.setUint8(19, skills.indexOf(voyage_description.skills.secondary_skill));

		options.roster.forEach(crew => {
			let traitIds = [];
			crew.traits.forEach(trait => {
				if (arrTraits.indexOf(trait) >= 0) {
					traitIds.push(arrTraits.indexOf(trait));
				}
			});

			let traitBitMask = 0;
			for (let nFlag = 0; nFlag < SLOT_COUNT; traitBitMask |= (traitIds.indexOf(slotTraitIds[nFlag]) !== -1 ? 1 : 0) << nFlag++);

			// We store traits in the first 12 bits, using the next few for flags
			traitBitMask |= (crew.immortal > 0 ? 1 : 0) << SLOT_COUNT;
			traitBitMask |= (crew.active_id && crew.active_id > 0 ? 1 : 0) << (SLOT_COUNT + 1);
			traitBitMask |= (crew.level == 100 && crew.rarity == crew.max_rarity ? 1 : 0) << (SLOT_COUNT + 2); // ff100

			// Replace skill data with a binary blob
			let buffer = new ArrayBuffer(6 /*number of skills */ * 3 /*values per skill*/ * 2 /*we need 2 bytes per value*/);
			let skillData = new Uint16Array(buffer);
			for (let i = 0; i < skills.length; i++) {
				if (!crew.skills[skills[i]]) {
					skillData[i * 3] = 0;
					skillData[i * 3 + 1] = 0;
					skillData[i * 3 + 2] = 0;
				} else {
					let skill = crew.skills[skills[i]];
					skillData[i * 3] = skill.core;
					skillData[i * 3 + 1] = skill.range_min;
					skillData[i * 3 + 2] = skill.range_max;
				}
			}

			// This won't be necessary once we switch away from Json to pure binary for native invocation
			let newCrew = {
				id: crew.crew_id ? crew.crew_id : crew.id,
				name: crew.name.replace(/[^\x00-\x7F]/g, ''),
				traitBitMask: traitBitMask,
				max_rarity: crew.max_rarity,
				skillData: Array.from(skillData)
			};

			dataToExport.crew.push(newCrew);
		});

		binaryConfig.setUint16(32, dataToExport.crew.length, true);

		dataToExport.binaryConfig = Array.from(new Uint8Array(binaryConfigBuffer));

		return dataToExport;
	}

	_finaliseIAPEstimate(result: DataView, inProgress: boolean = false): void {
		let entries = [];
		let aggregates = Object.fromEntries(Object.keys(CONFIG.SKILLS).map(s =>
			[s, ({skill: s, core: 0, range_min: 0, range_max: 0})]));

		let config = {
			numSims: inProgress ? 200 : 5000,
			startAm: this.bestShip.score
		};

		for (let i = 0; i < 12; i++) {
			let crew = this.consideredCrew.find(c => c.id === result.getUint32(4 + i * 4, true));

			let entry = {
				slotId: i,
				choice: crew,
				hasTrait: crew
					.traits_named
					.map(trait => trait.toLowerCase())
					.includes(this.voyageConfig.crew_slots[i].trait)
			};

			for (let skill in CONFIG.SKILLS) {
				aggregates[skill].core += crew[skill].core;
				aggregates[skill].range_min += crew[skill].min;
				aggregates[skill].range_max += crew[skill].max;
			}

			if (entry.hasTrait) config.startAm += 25;

			entries.push(entry);
		}

		const {primary_skill, secondary_skill } = this.voyageConfig.skills;
		config.ps = aggregates[primary_skill];
		config.ss = aggregates[secondary_skill];

		config.others =
			Object.values(aggregates)
				.filter(value => value.skill != primary_skill && value.skill != secondary_skill);

		const ChewableConfig = {
			config,
			worker: 'chewable'
		};

		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				let finalResult = {
					estimate: message.data.result,
					entries,
					aggregates,
					startAM: config.startAm,
					postscript: 'Recommended for median runtime ('+formatTime(message.data.result.refills[0].result)+')'
				};
				if (!inProgress) {
					this.perf.end = performance.now();
					this.calcState = CalculatorState.Done;
				}
				// Array of ICalcResults is expected by callbacks
				this.resultsCallback(this.id, [finalResult], inProgress ? CalculatorState.InProgress : CalculatorState.Done);
			}
		});
		worker.postMessage(ChewableConfig);
	}
};

class USSJohnJayHelper extends Helper {
	constructor(props: HelperProps) {
		super(props);
		this.id = 'request-'+Date.now();
		this.calculator = 'ussjohnjay';
		this.calcName = 'Multi-vector Assault';
		this.calcOptions = {
			estimatorThreshold: props.calcOptions.estimatorThreshold ?? 0
		};
	}

	start(): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;

		const USSJohnJayConfig = {
			voyage_description: this.voyageConfig,
			bestShip: this.bestShip,
			roster: this.consideredCrew,
			estimatorThreshold: this.calcOptions.estimatorThreshold,
			luckFactor: false,
			favorSpecialists: false,
			worker: 'ussjohnjay'
		};

		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (message.data.result) {
				const { lineups, estimates } = message.data.result;
				const results = this._estimatesToResults(lineups, estimates);
				this.perf.end = performance.now();
				this.calcState = CalculatorState.Done;
				this.resultsCallback(this.id, results, CalculatorState.Done);
			}
		});
		worker.postMessage(JSON.parse(JSON.stringify(USSJohnJayConfig)));
		this.calcWorker = worker;
	}

	_estimatesToResults(lineups: any[], estimates: any[]): ICalcResult[] {
		const results = [];

		const bestKeys = [];
		[0, 1, 2, 3, 4].forEach(sort => {
			const best = estimates.sort((a, b) => this._chewableSort(a, b, sort))[0];
			let bestLineup = lineups.find(lineup => lineup.key == best.key);
			if (bestLineup.best) bestLineup.best.push(sort); else bestLineup.best = [sort];
			if (!bestKeys.includes(best.key)) bestKeys.push(best.key);
		});

		bestKeys.forEach((bestKey, idx) => {
			const best = estimates.find(estimate => estimate.key == bestKey);
			let bestLineup = lineups.find((lineup) => lineup.key == bestKey);
			let postscript = bestLineup.best.length < 5
				? '['+(idx+1)+'/'+bestKeys.length+'] Recommended for '+bestLineup.best.map(sort => this._showRecommendedValue(sort, best.estimate)).join(', ')
				: 'Recommended for all criteria';
			let result = {
				entries: bestLineup.crew.map(({id}, idx) => ({
					slotId: idx,
					choice: this.consideredCrew.find(c => c.id == id),
					hasTrait: bestLineup.traits[idx]
				})),	// convert to ICalcResult entries
				estimate: best.estimate,
				aggregates: bestLineup.skills,
				startAM: this.bestShip.score + bestLineup.antimatter,
				postscript
			};
			results.push(result);
		});

		return results;
	}

	_chewableSort(a: any, b: any, sortOption: number = 0): number {
		const DIFFERENCE = 0.02; // ~1 minute

		let aEstimate = a.estimate.refills[0];
		let bEstimate = b.estimate.refills[0];

		// Best Median Runtime by default
		let aScore = aEstimate.result;
		let bScore = bEstimate.result;

		let compareCloseTimes = false;

		// Best Guaranteed Runtime
		//	Compare 99% worst case times (saferResult)
		if (sortOption == 1 && aEstimate.saferResult) {
			aScore = aEstimate.saferResult;
			bScore = bEstimate.saferResult;
		}
		// Best Moonshot Runtime
		//	Compare best case times (moonshotResult)
		else if (sortOption == 2 && aEstimate.moonshotResult) {
			compareCloseTimes = true;
			aScore = aEstimate.moonshotResult;
			bScore = bEstimate.moonshotResult;
			// If times are close enough, use the one with the better median result
			if (Math.abs(bScore - aScore) <= DIFFERENCE) {
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}
		// Best Dilemma Chance
		else if (sortOption == 3 && aEstimate.lastDil) {
			aScore = aEstimate.lastDil;
			bScore = bEstimate.lastDil;
			if (aScore == bScore) {
				aScore = aEstimate.dilChance;
				bScore = bEstimate.dilChance;
			}
			// If dilemma chance is the same, use the one with the better median result
			if (aScore == bScore) {
				compareCloseTimes = true;
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}
		// Highest Antimatter
		else if (sortOption == 4 && a.estimate.antimatter) {
			aScore = a.estimate.antimatter;
			bScore = b.estimate.antimatter;
			// If antimatter is the same, use the one with the better median result
			if (aScore == bScore) {
				compareCloseTimes = true;
				aScore = aEstimate.result;
				bScore = bEstimate.result;
			}
		}

		// If times are close enough, use the one with the better safer result
		if (compareCloseTimes && Math.abs(bScore - aScore) <= DIFFERENCE) {
			aScore = aEstimate.saferResult;
			bScore = bEstimate.saferResult;
		}

		return bScore - aScore;
	}

	_showRecommendedValue(sortOption: number, estimate: any): string {
		const sortNames = [
			'median runtime', 'guaranteed runtime', 'moonshot runtime', 'dilemma chance', 'starting antimatter'
		];
		let sortValue = "";
		switch (sortOption) {
			case 0:
				sortValue = formatTime(estimate.refills[0].result);
				break;
			case 1:
				sortValue = formatTime(estimate.refills[0].saferResult);
				break;
			case 2:
				sortValue = formatTime(estimate.refills[0].moonshotResult);
				break;
			case 3:
				sortValue = estimate.refills[0].dilChance+'% to reach '+estimate.refills[0].lastDil+'h';
				break;
			case 4:
				sortValue = estimate.antimatter;
				break;
		}
		if (sortValue != '') sortValue = ' ('+sortValue+')';
		return sortNames[sortOption]+sortValue;
	}
};

const formatTime: string = (time: number) => {
	let hours = Math.floor(time);
	let minutes = Math.floor((time-hours)*60);
	return hours+"h " +minutes+"m";
};
