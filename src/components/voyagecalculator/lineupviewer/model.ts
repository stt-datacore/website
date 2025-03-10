import { PlayerCrew } from '../../../model/player';

export interface IAssignment {
	crew: PlayerCrew;
	name: string;
	trait: string;
	bestRank: ISkillsRank | undefined;
}

export interface ISkillsRankings {
	[key: string]: PlayerCrew[]; // key is skill or joined skills combo (i.e. skill,skill)
}

export interface ISkillsRank {
	skills: string[];
	rank: number;
}

export interface IShipData {
	direction: 'left' | 'right';
	index: number;
	shipBonus: number;
	crewBonus: number;
}
