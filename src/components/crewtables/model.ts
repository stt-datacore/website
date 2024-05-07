import { Skill } from '../../model/crew';
import { EquipmentItem } from '../../model/equipment';
import { PlayerCrew, PlayerUtilityRanks } from '../../model/player';

export interface IRosterCrew extends PlayerCrew {
	any_immortal?: boolean;
	markup?: {
		traits_matched?: string[];
		crew_utility?: ICrewUtility;
	}

};

export type RosterType = 'allCrew' | 'myCrew' | 'profileCrew' | 'buyBack';

export interface ICrewFilter {
	id: string;
	filterTest: (crew: IRosterCrew) => boolean;
};

export interface ICrewMarkup {
	id: string;
	applyMarkup: (crew: IRosterCrew) => void;
};

export interface ICrewUtility {
	ranks: ICrewUtilityRanks;
	thresholds: string[];
	counts: {
		shuttle: number;
		gauntlet: number;
		voyage: number;
	}
};

export interface ICrewUtilityRanks {
	[key: string]: number;
};