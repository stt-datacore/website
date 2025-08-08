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

export interface Guess {
	fail: number;
	[key: number]: number;
}

export interface IGuessedCrew {
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
