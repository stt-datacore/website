import { BaseSkills, PlayerSkill, Skill } from '../../model/crew';
import { Estimate } from '../../model/worker';

export interface IAssemblerOptions {
	strategy?: string;
	customBoosts?: IBoosts;
	luckFactor?: number;
	favorSpecialists?: boolean;
	progressCallback?: (message: string) => void;
	debugCallback?: (message: string) => void;
};

export interface IBoosts {
	primary: number;
	secondary: number;
	other: number;
};

export interface IPrimedCrew {
	id: number;
	name: string;
	skills: BaseSkills;
	primary_score: number;
	secondary_score: number;
	other_score: number;
	viable_slots: number[];
	trait_slots: number[];
};

export interface ISlottableCrew extends IPrimedCrew {
	score: number;
	slot: number;
	isIdeal: boolean;
};

export interface IVoyagerScore {
	score: number;
	id: number;
	isIdeal: boolean;
};

export interface ISkillAggregate extends Skill {
	skill: PlayerSkill;
	voyage: number;
};

export interface ILineupEstimate {
	key: string;
	estimate: Estimate;
};

export interface IProjection {
	ticks: number;
	amBalance: number;
};
