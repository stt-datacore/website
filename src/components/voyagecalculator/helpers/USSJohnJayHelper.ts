import '../../../typings/worker';
import { UnifiedWorker } from '../../../typings/worker';
import { IVoyageCrew } from '../../../model/voyage';
import { CalcResult, JohnJayBest } from '../../../model/worker';
import { CalculatorState } from './calchelpers';
import { HelperProps, Helper } from "./Helper";

export class USSJohnJayHelper extends Helper {
	readonly id: string;
	readonly calculator: string;
	readonly calcName: string;
	readonly calcOptions: any;

	constructor(props: HelperProps, calculator: string = 'mvam') {
		super(props);
		this.id = 'request-' + Date.now();
		this.calculator = calculator;
		this.calcName = calculator === 'idic' ? 'Infinite Diversity' : 'Multi-vector Assault';
		this.calcOptions = {
			strategy: props.calcOptions?.strategy ?? 'estimate'
		};
	}

	start(): void {
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
					this.errorCallback(this.id, message.data.result.error);
				}
				else {
					const results = this._messageToResults(message.data.result);
					this.calcState = CalculatorState.Done;
					this.resultsCallback(this.id, results, CalculatorState.Done);
				}
			}
		});
		worker.postMessage(JSON.parse(JSON.stringify(USSJohnJayConfig)));
		this.calcWorker = worker;
	}

	_messageToResults(bests: JohnJayBest[]): CalcResult[] {
		return bests.map((best, bestId) => {
			return {
				entries: best.crew.map((crew, entryId) => ({
					slotId: entryId,
					choice: this.consideredCrew.find(c => c.id === crew.id) ?? {} as IVoyageCrew,
					hasTrait: best.traits[entryId]
				})),
				estimate: best.estimate,
				aggregates: best.skills,
				startAM: best.estimate.antimatter
			} as CalcResult;
		});
	}
}
