import React from 'react';
import { IVoyageCalcConfig, IVoyageCrew } from '../../../../model/voyage';
import { IProspectiveConfig } from '../../lineupeditor/model';
import { ISimulatorTrigger } from './proficiencycheck';
import { ISkillPairData } from './data';

export interface IProficiencyContext {
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	roster: IVoyageCrew[];
	sortedSkills: string[];
	data: ISkillPairData[];
	simulateContest: (trigger: ISimulatorTrigger) => void;
};

export const ProficiencyContext = React.createContext<IProficiencyContext>({} as IProficiencyContext);
