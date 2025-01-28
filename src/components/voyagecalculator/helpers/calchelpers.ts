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

import { IAmPicardHelper } from './IAmPicardHelper';
import { USSJohnJayHelper } from './USSJohnJayHelper';
import { Helper, HelperProps } from './Helper';

export enum CalculatorState {
	NotStarted,
	InProgress,
	Done,
	Error
};

export interface CalculatorHelper {
	id: string;
	name: string;
	helper: <T extends Helper>(props: HelperProps) => T;
};

export const CALCULATORS = {
	helpers: [
		{ id: 'iampicard', name: 'Original', helper: (props: HelperProps) => new IAmPicardHelper(props) },
		{ id: 'ussjohnjay-mvam', name: 'Multi-vector Assault', helper: (props: HelperProps) => new USSJohnJayHelper(props, 'mvam') },
		// { id: 'ussjohnjay-idic', name: 'Infinite Diversity', helper: (props: HelperProps) => new USSJohnJayHelper(props, 'idic') }
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
			calculators: ['ussjohnjay-mvam', 'ussjohnjay-idic'],
			id: 'strategy',
			name: 'Strategy',
			description: 'Prioritize estimates by strategy',
			control: 'select',
			options: [
				{ key: 'estimate', text: 'Best estimate (default)', value: 'estimate' },
				{ key: 'minimum', text: 'Guaranteed minimum', value: 'minimum' },
				{ key: 'moonshot', text: 'Moonshot', value: 'moonshot' },
				{ key: 'any', text: 'Any best', value: 'any' },
				{ key: 'peak-antimatter', text: 'Peak antimatter (experimental)', value: 'peak-antimatter' },
				// { key: 'thorough', text: 'Thorough (slow)', value: 'thorough' }
			],
			default: 'estimate'
		}
	]
};
