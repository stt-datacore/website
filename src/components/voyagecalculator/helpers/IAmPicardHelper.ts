import '../../../typings/worker';
import { UnifiedWorker } from '../../../typings/worker';
import { Skill } from '../../../model/crew';
import { Aggregates, PlayerCrew, VoyageDescription } from '../../../model/player';
import { IProposalEntry as VoyageSlotEntry, IResultProposal, IVoyageCalcConfig, IVoyageEventContent, Estimate, IVoyageRequest } from '../../../model/voyage';
import { VoyageStatsConfig, ExportCrew, GameWorkerOptions } from '../../../model/worker';
import { calcVoyageVP } from '../../../utils/voyagevp';
import CONFIG from '../../CONFIG';
import { getCrewEventBonus } from '../utils';
import { CalculatorState } from './calchelpers';
import { HelperProps, Helper } from './Helper';

// This code is heavily inspired from IAmPicard's work and released under the GPL-V3 license. Huge thanks for all his contributions!

export class IAmPicardHelper extends Helper {
	readonly calculator: string;
	readonly calcName: string;
	readonly calcOptions: GameWorkerOptions;

	constructor(props: HelperProps) {
		super(props);
		this.calculator = 'iampicard';
		this.calcName = 'Original';
		this.calcOptions = {
			searchDepth: props.calcOptions.searchDepth ?? 6,
			extendsTarget: props.calcOptions.extendsTarget ?? 0
		};
	}

	start(request: IVoyageRequest): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;

		const voyageConfig: IVoyageCalcConfig = JSON.parse(JSON.stringify(request.voyageConfig));

		// For limited support of encounter voyages:
		//	Set crew traits to first event bonus trait
		//	Maybe artificially inflate skill scores for featured crew here?
		if (voyageConfig.voyage_type === 'encounter' && voyageConfig.event_content) {
			const content: IVoyageEventContent = voyageConfig.event_content!;
			voyageConfig.crew_slots.forEach(slot => {
				slot.trait = content.antimatter_bonus_crew_traits[0];
			});
		}

		const IAmPicardConfig = {
			searchDepth: this.calcOptions.searchDepth,
			extendsTarget: this.calcOptions.extendsTarget,
			shipAM: request.bestShip.score,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: voyageConfig,
			roster: request.consideredCrew
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
					if (score > bestScore + 1 / 12) {
						bestScore = score;
						this._finaliseIAPEstimate(request, result, true);
					}
					// Done
				} else {
					this._finaliseIAPEstimate(request, result, false);
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
			crew: [] as ExportCrew[],
			binaryConfig: [] as number[]
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

		let voyage_description = options.voyage_description as VoyageDescription;
		const SLOT_COUNT = voyage_description.crew_slots.length;
		console.assert(SLOT_COUNT === 12, 'Ooops, voyages have more than 12 slots !? The algorithm needs changes.');

		// Find unique traits used in the voyage slots
		let setTraits = new Set<string>();
		voyage_description.crew_slots.forEach(slot => {
			setTraits.add(slot.trait);
		});

		let arrTraits = Array.from(setTraits);
		let skills = Object.keys(CONFIG.SKILLS);

		// Replace traits and skills with their id
		let slotTraitIds = [] as number[];
		for (let i = 0; i < voyage_description.crew_slots.length; i++) {
			let slot = voyage_description.crew_slots[i];

			binaryConfig.setUint8(20 + i, skills.indexOf(slot.skill));
			slotTraitIds[i] = arrTraits.indexOf(slot.trait);
		}

		binaryConfig.setUint8(18, skills.indexOf(voyage_description.skills.primary_skill));
		binaryConfig.setUint8(19, skills.indexOf(voyage_description.skills.secondary_skill));

		options.roster.forEach(crew => {
			let traitIds = [] as number[];
			crew.traits.forEach(trait => {
				if (arrTraits.indexOf(trait) >= 0) {
					traitIds.push(arrTraits.indexOf(trait));
				}
			});

			let traitBitMask = 0;
			for (let nFlag = 0; nFlag < SLOT_COUNT; traitBitMask |= (traitIds.indexOf(slotTraitIds[nFlag]) !== -1 ? 1 : 0) << nFlag++)
				;

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

	_finaliseIAPEstimate(request: IVoyageRequest, result: DataView, inProgress: boolean = false): void {

		let entries = [] as VoyageSlotEntry[];
		let aggregates = {} as Aggregates;

		Object.keys(CONFIG.SKILLS).forEach(s => aggregates[s] = { skill: s, core: 0, range_min: 0, range_max: 0 } as Skill
		);

		let config = {
			numSims: inProgress ? 200 : 5000,
			startAm: request.bestShip.score
		} as VoyageStatsConfig;

		const eventCrewBonuses: number[] = [];

		for (let i = 0; i < 12; i++) {
			let crew = request.consideredCrew.find(c => c.id === result.getInt32(4 + i * 4, true));
			if (!crew)
				continue;

			let entry = {
				slotId: i,
				choice: crew,
				hasTrait: crew?.traits.includes(request.voyageConfig.crew_slots[i].trait)
			} as VoyageSlotEntry;

			for (let skill in CONFIG.SKILLS) {
				aggregates[skill].core += crew[skill].core;
				aggregates[skill].range_min += crew[skill].min;
				aggregates[skill].range_max += crew[skill].max;
			}

			if (entry.hasTrait)
				config.startAm += 25;

			entries.push(entry);

			eventCrewBonuses.push(getCrewEventBonus(request.voyageConfig, crew as PlayerCrew));
		}

		const { primary_skill, secondary_skill } = request.voyageConfig.skills;
		config.ps = aggregates[primary_skill];
		config.ss = aggregates[secondary_skill];

		config.others =
			Object.values(aggregates)
				.filter(value => value.skill != primary_skill && value.skill != secondary_skill);

		const VoyageEstConfig = {
			config,
			worker: 'voyageEstimate'
		};

		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				const estimate: Estimate = message.data.result;
				// Add vpDetails prop here to allow for post-sorting by VP details
				if (request.voyageConfig.voyage_type === 'encounter') {
					const seconds: number = estimate.refills[0].result*60*60;
					estimate.vpDetails = calcVoyageVP(seconds, eventCrewBonuses);
				}
				let finalResult: IResultProposal = {
					estimate: estimate,
					entries: entries,
					aggregates: aggregates,
					startAM: config.startAm,
					eventCrewBonus: eventCrewBonuses.reduce((prev, curr) => prev + curr, 0)
				};
				if (!inProgress) {
					this.perf.end = performance.now();
					this.calcState = CalculatorState.Done;
				}
				// Array of IResultProposals is expected by callbacks
				this.resultsCallback(request.id, [finalResult], inProgress ? CalculatorState.InProgress : CalculatorState.Done);
			}
		});
		worker.postMessage(VoyageEstConfig);
	}
}
