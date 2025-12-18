import { Filter } from "./game-elements";
import { MilestoneBuff, PlayerCollection, PlayerCrew, PlayerData, Reward } from "./player";

export interface CollectionFilterOptions {
	collectionsFilter?: number[];
	rewardFilter?: string[];
}

export interface CollectionInfo {
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
    shadow_cost: number;
}

export interface CollectionCombo {
	name: string;
	maps: CollectionInfo[];
	combinedUnique: PlayerCrew[];
	crewInCommon: PlayerCrew[];
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
    mapFilter: CollectionFilterOptions;
    searchFilter: string;
    rarityFilter: number[];
    fuseFilter: string;
    ownedFilter: string;
    costMode: 'normal' | 'sale';
    matchMode: CollectionMatchMode;
    hardFilter: boolean;
    favorited: boolean;
    showIncomplete: boolean;
    tierFilter?: number;
    byCost: boolean;
};

export interface CollectionModalDisplayOptions {
    collection: PlayerCollection;
    activeTab?: number;
    pageId?: string;
}

export interface ICollectionsContext extends CollectionsToolSettings {
    hardFilter: boolean;
    setHardFilter: (value: boolean) => void;

    short: boolean;
    setShort: (value: boolean) => void;

    mapFilter: CollectionFilterOptions;
    setMapFilter: (options: CollectionFilterOptions) => void;

    searchFilter: string;
    setSearchFilter: (value?: string) => void;

    tierFilter?: number;
    setTierFilter: (value: number | undefined) => void;

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

    setCollectionSettings: (value: CollectionsToolSettings) => void;

    modalInstance: CollectionModalDisplayOptions | null
    setModalInstance: (value: CollectionModalDisplayOptions | null) => void;
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
    combos: CollectionCombo[];
    collections: CollectionInfo[];
    comboCostMap: ComboCostMap[];
}

export interface CollectionScore {
  score: number;
  details: {
    portal: number;
    non_portal: number;
    average_rarity: number;
    average_datascore: number;
    rarity_datascores: {
      "1"?: number,
      "2"?: number,
      "3"?: number,
      "4"?: number,
      "5"?: number,
    }
  }
}

export interface Collection {
  id: number;
  type_id?: number;
  name: string;
  crew?: string[];
  description?: string;
  image?: string;
  milestones?: Milestone[];
  score?: CollectionScore;
}

export interface Milestone {
  goal: number;
  buffs: MilestoneBuff[];
  rewards: Reward[];
}
