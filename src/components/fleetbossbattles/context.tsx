import React from 'react';

import { BossCrew, ExportPreferences, SoloPreferences, SpotterPreferences, UserPreferences } from '../../model/boss';

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
