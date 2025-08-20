import React from 'react';

import { ICrewPickerFilters, IDeduction, IEvaluatedGuess, IRosterCrew, ISolverPrefs, ITraitMap, ITraitOption, IVariantMap } from './model';
import { GameRules } from './game';

export interface IWorfleContext {
	roster: IRosterCrew[];
	variantMap: IVariantMap;
	traitMap: ITraitMap;
};

export const WorfleContext = React.createContext<IWorfleContext>({} as IWorfleContext);

export interface IGuesserContext {
	rules: GameRules;
	evaluatedGuesses: IEvaluatedGuess[];
	traitOptions: ITraitOption[];
	deductions: IDeduction[];
	filters: ICrewPickerFilters;
	setFilters: (filters: ICrewPickerFilters) => void;
	solverPrefs: ISolverPrefs;
	setSolverPrefs: (solverPrefs: ISolverPrefs) => void;
};

export const GuesserContext = React.createContext<IGuesserContext>({} as IGuesserContext);
