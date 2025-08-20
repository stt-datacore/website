import React from 'react';

import { ICrewPickerFilters, IDeduction, IEvaluatedGuess, IRosterCrew, ISolverPrefs, ITraitMap, ITraitOption, IVariantMap } from './model';
import { GameRules } from './game';

export interface IWorfleContext {
	roster: IRosterCrew[];
	variantMap: IVariantMap;
	traitMap: ITraitMap;
};

export const WorfleContext = React.createContext<IWorfleContext>({} as IWorfleContext);

export interface IGameContext {
	rules: GameRules;
	traitOptions: ITraitOption[];
	mysteryCrew: IRosterCrew;
	evaluatedGuesses: IEvaluatedGuess[];
	deductions: IDeduction[];
	deductionsUsed: IDeduction[];
	solveState: number;
};

export const GameContext = React.createContext<IGameContext>({} as IGameContext);

export interface IGuesserContext {
	filters: ICrewPickerFilters;
	setFilters: (filters: ICrewPickerFilters) => void;
	solverPrefs: ISolverPrefs;
	setSolverPrefs: (solverPrefs: ISolverPrefs) => void;
};

export const GuesserContext = React.createContext<IGuesserContext>({} as IGuesserContext);
