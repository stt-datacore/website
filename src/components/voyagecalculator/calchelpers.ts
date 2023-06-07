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


import { CompactCrew, Player, PlayerCrew, Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { CalcResult, GameWorkerOptions, VoyageStatsConfig } from '../../model/worker';
import { IAmPicardHelper } from './IAmPicardHelper';
import { USSJohnJayHelper } from './USSJohnJayHelper';

export const CALCULATORS = {
	helpers: [
		{ id: 'iampicard', name: 'Original', helper: (props: HelperProps) => new IAmPicardHelper(props) },
		{ id: 'ussjohnjay', name: 'Multi-vector Assault', helper: (props: HelperProps) => new USSJohnJayHelper(props) }
	] as CalculatorHelper[],
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
			id: 'strategy',
			name: 'Strategy',
			description: 'Prioritize estimates by strategy',
			control: 'select',
			options: [
				{ key: 'estimate', text: 'Best estimate (default)', value: 'estimate' },
				{ key: 'minimum', text: 'Guaranteed minimum', value: 'minimum' },
				{ key: 'moonshot', text: 'Moonshot', value: 'moonshot' },
				{ key: 'versatile', text: 'Versatile', value: 'versatile' },
				{ key: 'thorough', text: 'Thorough (slow)', value: 'thorough' }
			],
			default: 'estimate'
		}
	]
};

export enum CalculatorState {
	NotStarted,
	InProgress,
	Done
}

export interface CalculatorHelper {
	id: string;
	name: string;
	helper: <T extends Helper>(props: HelperProps) => T;
}

export type HelperProps = {
	voyageConfig: Voyage;
	bestShip: Ship;
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
	readonly bestShip: Ship;
	readonly consideredCrew: PlayerCrew[];
	readonly resultsCallback: (requestId: string, reqResults: CalcResult[], calcState: number) => void;

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

	abstract start(): void;

	abort(): void {
		if (this.calcWorker) this.calcWorker.terminate();
		this.perf.end = performance.now();
		this.calcState = CalculatorState.Done;
	}
};

const formatTime = (time: number): string => {
	let hours = Math.floor(time);
	let minutes = Math.floor((time-hours)*60);
	return hours+"h " +minutes+"m";
};
