import { CrewMember } from '../../model/crew';

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

export type TTraitType = 'trait' | 'hidden_trait' | 'collection' | 'variant';

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
