import React from 'react';

import { Skill } from "../../../model/crew";
import { PlayerCrew, Voyage } from "../../../model/player";
import { Ship } from "../../../model/ship";
import { IVoyageCalcConfig } from "../../../model/voyage";

export interface IAssignment {
	crew: PlayerCrew;
	name: string;
	trait: string;
	bestRank: ISkillsRank | undefined;
};

export interface ISkillsRankings {
	[key: string]: PlayerCrew[];	// key is skill or joined skills combo (i.e. skill,skill)
};

export interface ISkillsRank {
	skills: string[];
	rank: number;
};

export interface IShipData {
	direction: 'left' | 'right';
	index: number;
	shipBonus: number;
	crewBonus: number;
};

export interface IViewContext {
	voyageConfig: IVoyageCalcConfig | Voyage;
	rosterType?: 'allCrew' | 'myCrew';
	ship?: Ship;
	shipData: IShipData;
	assignments: IAssignment[];
};

export const ViewContext = React.createContext<IViewContext>({} as IViewContext);

export const SHOW_SHIP_FINDER = false;
export const POPUP_DELAY = 500;

export const voySkillScore = (sk: Skill) => sk.core + (sk.range_min + sk.range_max)/2;
export const crewVoySkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + voySkillScore((c.skills[curr] as Skill)), 0);

// Average prof (profSkillScore) might be first tiebreaker for encounter crew sort
// const profSkillScore = (sk: Skill) => (sk.range_min + sk.range_max)/2;
// const crewProfSkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + profSkillScore((c.skills[curr] as Skill)), 0);
export const crewProfSkillsMax = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + (c.skills[curr] as Skill).range_max, 0);
export const crewProfSkillsMin = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + (c.skills[curr] as Skill).range_min, 0);


export type ViewProps = {
	layout: string;
};
