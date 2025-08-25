import React from 'react';

import { IDeduction, IDeductionOption, IEvaluatedGuess, IRosterCrew, ITraitMap, IUserPrefs, THintGroup } from './model';
import { GameRules } from './game';

export interface IWorfleContext {
	roster: IRosterCrew[];
	traitMap: ITraitMap;
	userPrefs: IUserPrefs;
	setUserPrefs: (userPrefs: IUserPrefs) => void;
};

export const WorfleContext = React.createContext<IWorfleContext>({} as IWorfleContext);

export interface IGameContext {
	rules: GameRules;
	deductionOptions: IDeductionOption[];
	mysteryCrew: IRosterCrew;
	evaluatedGuesses: IEvaluatedGuess[];
	deductions: IDeduction[];
	hints: IDeduction[];	// Hints are deductions used to filter crew list
	hintGroups: THintGroup[];
	solveState: number;
};

export const GameContext = React.createContext<IGameContext>({} as IGameContext);
