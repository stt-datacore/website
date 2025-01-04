import { IBestVoyageShip, IResultProposal, IVoyageInputConfig, IVoyageCrew } from '../../../model/voyage';
import { GameWorkerOptions } from '../../../model/worker';
import { UnifiedWorker } from '../../../typings/worker';
import { CalculatorState } from './calchelpers';

export type HelperProps = {
	voyageConfig: IVoyageInputConfig;
	bestShip: IBestVoyageShip;
	consideredCrew: IVoyageCrew[];
	calcOptions: GameWorkerOptions;
	resultsCallback: (requestId: string, reqResults: IResultProposal[], calcState: number) => void
	errorCallback?: (requestId: string, errorMessage: string) => void
};

export abstract class Helper {
	abstract readonly calculator: string;
	abstract readonly calcName: string;
	abstract readonly calcOptions: GameWorkerOptions;

	readonly voyageConfig: IVoyageInputConfig;
	readonly bestShip: IBestVoyageShip;
	readonly consideredCrew: IVoyageCrew[];
	readonly resultsCallback: (requestId: string, reqResults: IResultProposal[], calcState: number) => void;
	readonly errorCallback: (requestId: string, error: any) => void;

	calcWorker: UnifiedWorker | undefined = undefined;
	calcState: number = CalculatorState.NotStarted;

	perf: { start: number; end: number; } = { start: 0, end: 0 };

	constructor(props: HelperProps) {
		this.voyageConfig = JSON.parse(JSON.stringify(props.voyageConfig));
		this.bestShip = JSON.parse(JSON.stringify(props.bestShip));
		this.consideredCrew = JSON.parse(JSON.stringify(props.consideredCrew));
		this.resultsCallback = props.resultsCallback;
		this.errorCallback = props.errorCallback ?? this.defaultErrorCallback;

		if (!this.voyageConfig || !this.bestShip || !this.consideredCrew)
			throw ('Voyage calculator cannot start without required parameters!');
	}

	abstract start(requestId: string): void;

	abort(): void {
		if (this.calcWorker)
			this.calcWorker.terminate();
		this.perf.end = performance.now();
		this.calcState = CalculatorState.Done;
	}

	defaultErrorCallback(errorMessage: string): void {
		throw(errorMessage);
	}
}
