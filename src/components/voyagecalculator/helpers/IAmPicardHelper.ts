import '../../../typings/worker';
import UnifiedWorker from 'worker-loader!../../../workers/unifiedWorker';
import CONFIG from '../../CONFIG';
import { CalcResult, Aggregates, CalcResultEntry as VoyageSlotEntry, VoyageStatsConfig, AggregateSkill, ExportCrew, GameWorkerOptions, IAmPicardConfig } from '../../../model/worker';
import { CalculatorState } from './calchelpers';
import { HelperProps, Helper } from "./Helper";
import { VoyageDescription } from '../../../model/player';
import { IVoyageCrew } from '../../../model/voyage';

// This code is heavily inspired from IAmPicard's work and released under the GPL-V3 license. Huge thanks for all his contributions!
const SLOT_COUNT = 12;

export class IAmPicardHelper extends Helper {
	readonly id: string;
	readonly calculator: string;
	readonly calcName: string;
	readonly calcOptions: any;

	constructor(props: HelperProps) {
		super(props);
		this.id = 'request-' + Date.now();
		this.calculator = 'iampicard';
		this.calcName = 'Original';
		this.calcOptions = {
			searchDepth: props.calcOptions.searchDepth ?? 6,
			extendsTarget: props.calcOptions.extendsTarget ?? 0
		} as GameWorkerOptions;
	}

	start(): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;
		const { extendsTarget, searchDepth } = this.calcOptions;
		const skills = Object.keys(CONFIG.SKILLS);
		const arrTraits = this.voyageConfig.crew_slots.map(slot => slot.trait).filter((val, i, arr) => !arr.includes(val));
		const slotTraitIds = this.voyageConfig.crew_slots.map(slot => arrTraits.indexOf(slot.trait));
		const config : IAmPicardConfig = {
			searchDepth,
			extendsTarget,
			shipAM: this.bestShip.score,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			slotSkills: this.voyageConfig.crew_slots.map(skill => skills.indexOf(skill.skill)),
			primarySkill: skills.indexOf(this.voyageConfig.skills.primary_skill),
			secondarySkill: skills.indexOf(this.voyageConfig.skills.secondary_skill),
			worker: 'iampicard',
			crew: [],
		};

		this.consideredCrew.forEach(crew => {
			let traitIds = [] as number[];
			crew.traits.forEach(trait => {
				if (arrTraits.indexOf(trait) >= 0) {
					traitIds.push(arrTraits.indexOf(trait));
				}
			});

			let traitBitMask = 0;
			for (let nFlag = 0; nFlag < SLOT_COUNT; ++nFlag)
				traitBitMask |= (traitIds.indexOf(slotTraitIds[nFlag]) !== -1 ? 1 : 0) << nFlag;

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
			const newCrew : ExportCrew = {
				id: crew.id,
				name: crew.name.replace(/[^\x00-\x7F]/g, ''),
				traitBitMask: traitBitMask,
				max_rarity: crew.max_rarity,
				skillData: Array.from(skillData)
			};
			config.crew.push(newCrew);
		});

		let bestScore = 0;
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (message.data.result) {
				const result = message.data.result;
				const { score } = result;
				// Progress
				if (message.data.inProgress) {
					// ignore marginal gains (under 5 minutes)
					if (score > bestScore + 1 / 12) {
						bestScore = score;
						this._finaliseIAPEstimate(result, true);
					}
					// Done
				} else {
					this._finaliseIAPEstimate(result, false);
				}
			}
		});
		
		worker.postMessage(config);
		this.calcWorker = worker;
	}

	_finaliseIAPEstimate(result: any, inProgress: boolean = false): void {
		const { considered, config } = result;
		const VoyageEstConfig = {
			config: {...config, vfast: false},
			worker: 'voyageEstimate'
		};

		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				let finalResult = {
					estimate: message.data.result,
					entries: considered.map((crew, slotId) => ({
						slotId,
						choice: this.consideredCrew.find(c => c.id === crew.id) ?? {} as IVoyageCrew,
						hasTrait: crew.traitIds & slotId
					})),
					aggregates: config.aggregates,
					startAM: config.startAm
				} as CalcResult;
				//console.log(finalResult);
				if (!inProgress) {
					this.perf.end = performance.now();
					this.calcState = CalculatorState.Done;
				}
				// Array of ICalcResults is expected by callbacks
				this.resultsCallback(this.id, [finalResult], inProgress ? CalculatorState.InProgress : CalculatorState.Done);
			}
		});
		worker.postMessage(VoyageEstConfig);
	}
}
