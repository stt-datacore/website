import { CrewMember } from '../../model/crew';

export enum SolveState {
	Unsolved,
	Winner,
	Loser
}

export enum EvaluationState {
	Wrong,
	Adjacent,
	Exact
}

export interface IRosterCrew extends CrewMember {
	usable_short_name: string;
	usable_variants: string[];
	usable_traits: string[];
	valid_series: boolean;
}

export interface IEvaluatedGuess {
	crew: IRosterCrew;
	crewEval: EvaluationState;
	variantEval: EvaluationState;
	seriesEval: EvaluationState;
	rarityEval: EvaluationState;
	skillsEval: EvaluationState[];
	matching_traits: string[];
}
