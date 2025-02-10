import { PlayerCrew } from '../../../model/player';

export interface IEncounter {
	id: number;
	contests: IContest[];
	critTraits: string[];
};

export interface IContest {
	skills: IContestSkill[];
	critChance: number;
};

export interface IContestSkill {
	skill: string;
	range_min: number;
	range_max: number;
};

export interface IContestant {
	crew?: PlayerCrew;
	skills: IContestSkill[];
	critChance: number;
};

export interface IExpectedScore {
	average: number;
	min: number;
	max: number;
};

export interface IContestResult {
	oddsA: number;
	simulated?: ISimulatedResults;
};

export interface ISimulatedResults {
	a: IExpectedScore;
	b: IExpectedScore;
};
