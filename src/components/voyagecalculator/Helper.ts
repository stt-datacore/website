import '../../typings/worker';
import UnifiedWorker from 'worker-loader!../../workers/unifiedWorker';
import { PlayerCrew, Voyage } from '../../model/player';
import { CalcResult, GameWorkerOptions, VoyageConsideration } from '../../model/worker';
import { CalculatorState } from './calchelpers';


export type HelperProps = {
	voyageConfig: Voyage;
	bestShip: VoyageConsideration;
	consideredCrew: PlayerCrew[];
	calcOptions: GameWorkerOptions;
	resultsCallback: (requestId: string, reqResults: CalcResult[], calcState: number) => void
};

export abstract class Helper {
	abstract readonly id: string;
	abstract readonly calculator: string;
	abstract readonly calcName: string;
	abstract readonly calcOptions: GameWorkerOptions;

	readonly voyageConfig: Voyage;
	readonly bestShip: VoyageConsideration;
	readonly consideredCrew: PlayerCrew[];
	readonly resultsCallback: (requestId: string, reqResults: CalcResult[], calcState: number) => void;

	calcWorker: UnifiedWorker;
	calcState: number = CalculatorState.NotStarted;

	perf: { start: number; end: number; } = { start: 0, end: 0 };

	constructor(props: HelperProps) {
		this.voyageConfig = JSON.parse(JSON.stringify(props.voyageConfig));
		this.bestShip = JSON.parse(JSON.stringify(props.bestShip));
		this.consideredCrew = JSON.parse(JSON.stringify(props.consideredCrew));
		this.resultsCallback = props.resultsCallback;

		if (!this.voyageConfig || !this.bestShip || !this.consideredCrew)
			throw ('Voyage calculator cannot start without required parameters!');
	}

	abstract start(): void;

	abort(): void {
		if (this.calcWorker)
			this.calcWorker.terminate();
		this.perf.end = performance.now();
		this.calcState = CalculatorState.Done;
	}
}
