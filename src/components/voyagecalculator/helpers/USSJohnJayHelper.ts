import '../../../typings/worker';
import { UnifiedWorker } from '../../../typings/worker';
import { IResultProposal } from "../../../model/voyage";
import { GameWorkerOptions, JohnJayBest } from '../../../model/worker';
import { CalculatorState } from './calchelpers';
import { HelperProps, Helper } from './Helper';

export class USSJohnJayHelper extends Helper {
	readonly calculator: string;
	readonly calcName: string;
	readonly calcOptions: GameWorkerOptions;

	constructor(props: HelperProps, calculator: string = 'mvam') {
		super(props);
		this.calculator = calculator;
		this.calcName = calculator === 'idic' ? 'Infinite Diversity' : 'Multi-vector Assault';
		this.calcOptions = {
			strategy: props.calcOptions?.strategy ?? 'estimate',
			proficiency: props.calcOptions?.proficiency ?? 1
		};
	}

	start(requestId: string): void {
		this.perf.start = performance.now();
		this.calcState = CalculatorState.InProgress;

		const USSJohnJayConfig = {
			voyage_description: this.voyageConfig,
			bestShip: this.bestShip,
			roster: this.consideredCrew,
			options: {
				...this.calcOptions,
				assembler: this.calculator
			},
			worker: 'ussjohnjay'
		};

		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (message.data.result) {
				this.perf.end = performance.now();
				if (message.data.result.error) {
					this.calcState = CalculatorState.Error;
					this.errorCallback(requestId, message.data.result.error);
				}
				else {
					const results = this._messageToResults(message.data.result);
					this.calcState = CalculatorState.Done;
					this.resultsCallback(requestId, results, CalculatorState.Done);
				}
			}
		});
		worker.postMessage(JSON.parse(JSON.stringify(USSJohnJayConfig)));
		this.calcWorker = worker;
	}

	_messageToResults(bests: JohnJayBest[]): IResultProposal[] {
		return bests.map((best, bestId) => {
			return {
				entries: best.crew.map((crew, entryId) => ({
					slotId: entryId,
					choice: this.consideredCrew.find(c => c.id === crew.id)!,
					hasTrait: best.traits[entryId]
				})),
				estimate: best.estimate,
				aggregates: best.skills,
				startAM: best.estimate.antimatter!
			};
		});
	}
}
