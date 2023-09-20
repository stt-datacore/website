import { PlayerCrew } from '../../model/player';

export interface IRosterCrew extends PlayerCrew {
	any_immortal?: boolean;
	markup?: {
		traits_matched?: string[];
	}
};

export type RosterType = 'allCrew' | 'myCrew' | 'profileCrew';

export interface ICrewFilter {
	id: string;
	filterTest: (crew: IRosterCrew) => boolean;
};

export interface ICrewMarkup {
	id: string;
	applyMarkup: (crew: IRosterCrew) => void;
};
