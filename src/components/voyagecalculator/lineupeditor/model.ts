import { BaseSkills } from '../../../model/crew';
import { CrewSlot, PlayerCrew } from '../../../model/player';
import { IVoyageCalcConfig, IVoyageInputConfig } from '../../../model/voyage';
import { Estimate } from '../../../model/worker';

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
