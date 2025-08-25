import { SemanticICONS } from 'semantic-ui-react';
import { CrewMember } from '../../model/crew';

export type TDeductionField = 'era' | 'series' | 'rarity' | 'skills' | 'traits';
export type TTraitType = 'trait' | 'hidden_trait' | 'collection' | 'variant';
export type TAssertion = 'required' | 'rejected';
export type THintGroup = TDeductionField | 'required';

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

export interface IRosterCrew extends CrewMember {
	gamified_series: string;
	gamified_variants: string[];
	gamified_traits: string[];
};

export interface IDeductionOption {
	id: number;
	name: string;
	icon?: SemanticICONS;
	iconUrl?: string;
	field: TDeductionField;
	value: string | number;
};

export interface ITraitMap {
	[key: string]: {
		type: TTraitType;
		display_name: string;
		iconUrl: string;
		crew: string[];
	};
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
	field: TDeductionField;
	value: string | number;
	assertion: TAssertion;
};

export interface IUserPrefs {
	favorites: string[];
	handicap_rarity: boolean;
	handicap_series: boolean;
	handicap_skills: 'hide' | 'count' | 'order';
	hide_guessed_crew: boolean;
	hide_nonviable_crew: boolean;
};
