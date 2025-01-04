import { BaseSkills } from '../../../model/crew';
import { CrewSlot, PlayerCrew } from '../../../model/player';
import { Estimate, IVoyageCalcConfig, IVoyageInputConfig } from '../../../model/voyage';

export interface IControlVoyage {
	config: IVoyageCalcConfig;
	estimate: Estimate;
};

export interface IProspectiveConfig extends IVoyageInputConfig {
	max_hp: number;
	crew_slots: IProspectiveCrewSlot[];
	skill_aggregates: BaseSkills;
};

export interface IProspectiveCrewSlot extends CrewSlot {
	crew?: PlayerCrew;
};
