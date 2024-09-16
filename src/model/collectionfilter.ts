import { Filter } from "./game-elements";
import { PlayerCollection, PlayerCrew, PlayerData } from "./player";

export interface MapFilterOptions {
	collectionsFilter?: number[];
	rewardFilter?: string[];
}

export interface CollectionMap {
	collection: PlayerCollection;
	crew: PlayerCrew[];
	neededStars?: number[];
	completes: boolean;
}

export interface ColComboMap {
    names: string[];
    count: number;
    crew: string[];
    exact: boolean;
}

export interface ComboCostMap {
    collection: string;
    combo: ColComboMap;
    cost: number;
    crew: PlayerCrew[];
    exact: boolean;
}

export interface CollectionGroup {
	name: string;
	maps: CollectionMap[];
	uniqueCrew: PlayerCrew[];
	commonCrew: PlayerCrew[];
	collection: PlayerCollection;
	nonfullfilling?: number;
	nonfullfillingRatio?: number;
	neededStars?: number[];
	uniqueCost?: number;
	combos?: ColComboMap[];
    comboCost?: number[];
	crew: PlayerCrew[];
}


export interface CollectionsToolSettings {
    short: boolean;
    mapFilter: MapFilterOptions;
    searchFilter: string;
    rarityFilter: number[];
    fuseFilter: string;
    ownedFilter: string;
    costMode: 'normal' | 'sale';
    matchMode: CollectionMatchMode;
    hardFilter: boolean;
    favorited: boolean;
    showIncomplete: boolean;
    tierFilter: number;
    byCost: boolean;
};


export interface ICollectionsContext extends CollectionsToolSettings {
    hardFilter: boolean;
    setHardFilter: (value: boolean) => void;

    short: boolean;
    setShort: (value: boolean) => void;

    mapFilter: MapFilterOptions;
    setMapFilter: (options: MapFilterOptions) => void;

    searchFilter: string;
    setSearchFilter: (value?: string) => void;

    tierFilter: number;
    setTierFilter: (value: number) => void;

    rarityFilter: number[];
    setRarityFilter: (value: number[]) => void;

    fuseFilter: string;
    setFuseFilter: (value?: string) => void;

    ownedFilter: string;
    setOwnedFilter: (value?: string) => void;

    costMode: 'normal' | 'sale';
    setCostMode: (value: 'normal' | 'sale') => void;

    byCost: boolean;
    setByCost: (value: boolean) => void;

    favorited: boolean;
    setFavorited: (value: boolean) => void;

    showIncomplete: boolean;
    setShowIncomplete: (value: boolean) => void;

    matchMode: CollectionMatchMode;
    setMatchMode: (value: CollectionMatchMode) => void;

    checkCommonFilter: (filter: CollectionsToolSettings, crew: PlayerCrew, exclude?: string[]) => boolean;
    checkRewardFilter: (collection: PlayerCollection, filters: string[]) => boolean;

    showThisCrew: (crew: PlayerCrew, filters: Filter[], filterType: string | null | undefined) => boolean
};

export type CollectionMatchMode = 'normal' | 'exact-only' | 'extended' | 'inexact-only';

export interface CollectionWorkerConfig {
    playerData: PlayerData;
    filterProps: CollectionsToolSettings;
    playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
    matchMode: CollectionMatchMode;
    byCost: boolean;
}

export interface CollectionWorkerResult {
    groups: CollectionGroup[];
    maps: CollectionMap[];
    costMap: ComboCostMap[];
}