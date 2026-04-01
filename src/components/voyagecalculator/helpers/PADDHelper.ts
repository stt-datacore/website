import '../../../typings/worker';
import { UnifiedWorker } from '../../../typings/worker';
import { Skill } from '../../../model/crew';
import { Aggregates } from '../../../model/player';
import { Estimate, IProposalEntry, IResultProposal, IVoyageCalcConfig, IVoyageRequest } from '../../../model/voyage';
import { GameWorkerOptions, VoyageStatsConfig } from '../../../model/worker';
import CONFIG from '../../CONFIG';
import { CalculatorState } from './calchelpers';
import { HelperProps, Helper } from './Helper';

// DataCore adaptation of PADD's voyage calculator by paulbilnoski

export class PADDHelper extends Helper {
	readonly calculator: string;
	readonly calcName: string;
	readonly calcOptions: GameWorkerOptions;

	constructor(props: HelperProps) {
		super(props);
		this.calculator = 'voypadd';
		this.calcName = 'PADD';
		this.calcOptions = {

		};
	}

	start(request: IVoyageRequest): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;

		const voyageConfig: IVoyageCalcConfig = structuredClone(request.voyageConfig) as IVoyageCalcConfig;

		const calcInput = {
			vd: voyageConfig,
			roster: request.consideredCrew,
			shipAM: request.bestShip.score,
		};

		let bestScore = 0;
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (message.data.result) {
				const score: number = message.data.result.hoursLeft;
				// Progress
				if (message.data.inProgress) {
					// ignore marginal gains (under 5 minutes)
					if (score > bestScore + 1 / 12) {
						bestScore = score;
						this._normalizeEstimate(request, message.data.result.ids, true);
					}
				// Done
				} else {
					this._normalizeEstimate(request, message.data.result.ids, false);
				}
			}
		});
		worker.postMessage({...calcInput, worker: 'voypadd' });
		this.calcWorker = worker;
	}

	_normalizeEstimate(request: IVoyageRequest, ids: number[], inProgress: boolean = false): void {

		let entries: IProposalEntry[] = [];
		let aggregates: Aggregates = {} as Aggregates;

		Object.keys(CONFIG.SKILLS).forEach(s => aggregates[s] = { skill: s, core: 0, range_min: 0, range_max: 0 } as Skill
		);

		let config: VoyageStatsConfig = {
			numSims: inProgress ? 200 : 5000,
			startAm: request.bestShip.score
		} as VoyageStatsConfig;

		for (let i = 0; i < 12; i++) {
			let crew = request.consideredCrew.find(c => c.id === ids[i]);
			if (!crew)
				continue;

			let entry: IProposalEntry = {
				slotId: i,
				choice: crew,
				hasTrait: crew?.traits.includes(request.voyageConfig.crew_slots[i].trait)
			};

			for (let skill in CONFIG.SKILLS) {
				aggregates[skill].core += crew[skill].core;
				aggregates[skill].range_min += crew[skill].min;
				aggregates[skill].range_max += crew[skill].max;
			}

			if (entry.hasTrait)
				config.startAm += 25;

			config.startAm += (crew.antimatter_bonus ?? 0);

			entries.push(entry);
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
				let finalResult: IResultProposal = {
					estimate: estimate,
					entries: entries,
					aggregates: aggregates,
					startAM: config.startAm,
					eventCrewBonus: 0
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
