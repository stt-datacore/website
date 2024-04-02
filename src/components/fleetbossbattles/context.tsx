import React from 'react';

import { BossBattle, BossCrew, ExportPreferences, SoloPreferences, Spotter, SpotterPreferences, UserPreferences } from '../../model/boss';

export interface IUserContext {
	userType: 'player' | 'nonplayer';
	bossCrew: BossCrew[];
	userPrefs: UserPreferences;
	setUserPrefs: (userPrefs: UserPreferences) => void;
	spotterPrefs: SpotterPreferences;
	setSpotterPrefs: (spotterPrefs: SpotterPreferences) => void;
	soloPrefs: SoloPreferences;
	setSoloPrefs: (soloPrefs: SoloPreferences) => void;
	exportPrefs: ExportPreferences;
	setExportPrefs: (exportPrefs: ExportPreferences) => void;
};

export const UserContext = React.createContext<IUserContext>({} as IUserContext);

export interface ISolverContext {
	bossBattleId: number;
	bossBattle: BossBattle;
	spotter: Spotter;
	setSpotter: (spotter: Spotter) => void;
	collaboration?: {
		roomCode: string;
		userRole: 'player' | 'anonymous';
	};
};

export const SolverContext = React.createContext<ISolverContext>({} as ISolverContext);
