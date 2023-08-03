import * as React from 'react';
import { Solver, Optimizer, ExportPreferences } from '../../model/boss';
import { CrewMember } from '../../model/crew';
import { PlayerCrew } from '../../model/player';

export const FinderContext = React.createContext<CrewGroupsProps>({} as CrewGroupsProps);

export interface CrewGroupsProps {
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
	exportPrefs: ExportPreferences;
};
