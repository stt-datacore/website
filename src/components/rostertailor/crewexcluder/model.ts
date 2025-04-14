import { SemanticICONS } from 'semantic-ui-react';

export interface IPreset {
	id: string;
	title: string;
	short: string;
	icon: SemanticICONS;
	filters: IPickerFilters;
	crewIds: Set<number>;
	subsets?: IViewableSubset[];
};

export interface IViewableSubset {
	id: string;
	title: string;
	filters: IPickerFilters;
};

export interface IPickerFilters {
	availability: string;
	event: string;
	quipped: string;
	rarity: number[];
	skills: string[];
};
