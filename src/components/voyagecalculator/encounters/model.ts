import { PlayerCrew } from '../../../model/player';

export interface IEncounter {
	contests: IContest[];
	critTraits: string[];
};

export interface IContest {
	skills: IContestSkill[];
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

export interface IExpectedRoll {
	average: number;
	min: number;
	max: number;
};

export interface IContestResult {
	oddsA: number;
	simulated: boolean;
};
