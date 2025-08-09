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

export interface IPortalCrew extends CrewMember {
	viable_guess: boolean;
}

export interface IGuessableCrew {
	symbol: string;
	name: string;
	short_name: string;
	variants: string[];
	imageUrlPortrait: string;
	flavor: string;
	series: string;
	rarity: number;
	skill_order: string[];
	traits: string[];
}

export interface IEvaluatedCrew extends IGuessableCrew {
	evaluation: IEvaluation;
}

export interface IEvaluation {
	crew: EvaluationState;
	variant: EvaluationState;
	series: EvaluationState;
	rarity: EvaluationState;
	skills: EvaluationState[];
	matching_traits: string[];
}
