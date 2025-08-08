export interface Guess {
	fail: number;
	[key: number]: number;
}

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
