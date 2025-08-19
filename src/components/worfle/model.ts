import { SemanticICONS } from 'semantic-ui-react';
import { CrewMember } from '../../model/crew';

export type TTraitType = 'trait' | 'hidden_trait' | 'collection' | 'variant';
export type TEvaluationField = 'series' | 'rarity' | 'skills' | 'traits';
export type TAssertion = 'required' | 'rejected';

export interface IRosterCrew extends CrewMember {
	gamified_series: string;
	gamified_variants: string[];
	gamified_traits: string[];
};

export interface IVariantMap {
	[key: string]: {
		short_names: string[];
		display_name: string;
	};
};

export interface ITraitMap {
	[key: string]: {
		type: TTraitType;
		count: number;
	};
};

export enum SolveState {
	Unsolved,
	Winner,
	Loser
};

export enum EvaluationState {
	Wrong,
	Adjacent,
	Exact
};

export interface IEvaluatedGuess {
	crew: IRosterCrew;
	crewEval: EvaluationState;
	variantEval: EvaluationState;
	seriesEval: EvaluationState;
	rarityEval: EvaluationState;
	skillsEval: EvaluationState[];
	matching_traits: string[];
};

export interface IDeduction {
	field: TEvaluationField;
	value: string | number;
	assertion: TAssertion;
};

export interface ITraitOption {
	id: number;
	name: string;
	icon?: SemanticICONS;
	iconUrl?: string;
	field: TEvaluationField;
	value: string | number;
};

export interface ICrewPickerFilters {
	deductions: IDeduction[];
	hide_nonviable: boolean;
	hide_guessed: boolean;
};

export interface ISolverPrefs {
	variants: boolean;
	gender: boolean;
	series: boolean;
	rarity: boolean;
	skills: boolean;
	traits: boolean;
};
