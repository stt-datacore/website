/*
DataCore(<VoyageTool>): input from UI =>
	Calculator Helper(): input as message =>
		Unified Worker(): input as message =>
			Calculator Worker() { parse input, start calculating } : results

Calculator Worker(): results =>
	Unified Worker(): results as message =>
		Calculator Helper(): IResultProposals =>
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
				{ key: 'any', text: 'Any best time', value: 'any' },
				{ key: 'peak-antimatter', text: 'Peak antimatter', value: 'peak-antimatter' },
				{ key: 'peak-vp', text: 'Peak VP', value: 'peak-vp' },
				{ key: 'featured-vp', text: 'Featured VP', value: 'featured-vp' },
				// { key: 'thorough', text: 'Thorough (slow)', value: 'thorough' }
			],
			default: 'estimate'
		},
		{
			calculators: ['ussjohnjay-mvam'],
			id: 'proficiency',
			name: 'Proficiency',
			description: 'Boost crew with higher max proficiency',
			control: 'select',
			options: [
				{ key: 'prof-0', text: 'Ignore crew proficiency', value: 0 },
				{ key: 'prof-1', text: 'Any proficiency (default)', value: 1 },
				{ key: 'prof-2', text: 'Prefer high proficiency', value: 2 },
				{ key: 'prof-3', text: 'Prefer higher proficiency', value: 3 },
				{ key: 'prof-5', text: 'Prefer highest proficiency', value: 5 },
			],
			default: 1
		},
		{
			calculators: ['ussjohnjay-mvam'],
			id: 'mandate',
			name: 'Skill Mandate',
			description: 'Lineup must have at least this many crew with each skill',
			control: 'select',
			options: [
				{ key: 'mandate-2', text: 'None (default)', value: 2 },
				{ key: 'mandate-3', text: 'At least 3 crew with each skill', value: 3 },
				{ key: 'mandate-4', text: 'At least 4 crew with each skill', value: 4 },
				{ key: 'mandate-5', text: 'At least 5 crew with each skill', value: 5 },
				{ key: 'mandate-6', text: 'At least 6 crew with each skill', value: 6 },
			],
			default: 2
		}

	]
};
