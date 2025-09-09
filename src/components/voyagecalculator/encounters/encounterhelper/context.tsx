import React from 'react';
import { PlayerCrew } from '../../../../model/player';
import { IEncounter } from '../model';
import { IChampionCrewData, IContestAssignments } from './championdata';

export interface IEncounterContext {
	voyageCrew: PlayerCrew[];
	encounter: IEncounter;
	contestIds: string[];
	championData: IChampionCrewData[];
	assignments: IContestAssignments;
	setAssignments: (assignments: IContestAssignments) => void;
};

export const EncounterContext = React.createContext<IEncounterContext>({} as IEncounterContext);
