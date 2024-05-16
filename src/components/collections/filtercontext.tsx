import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { PlayerCollection, PlayerCrew } from "../../model/player";
import { getCollectionRewards } from '../../utils/itemutils';
import { useStateWithStorage } from '../../utils/storage';
import { TinyStore } from '../../utils/tiny';
import { MapFilterOptions, CollectionFilterContextProps, CollectionMap, CollectionGroup, CollectionMatchMode, CollectionFilterProps } from '../../model/collectionfilter';
import { checkCommonFilter, checkRewardFilter } from '../../utils/collectionutils';

const DefaultConfig = {
    mapFilter: {} as MapFilterOptions,
    searchFilter: '',
    rarityFilter: [],
    fuseFilter: '',
    ownedFilter: '',
    costMode: 'normal',
    short: false,
    matchMode: 'normal',    
    byCost: false,
    tierFilter: 1,
    hardFilter: false,
    favorited: true,
    showIncomplete: false,
} as CollectionFilterProps;

const DefaultData = {
    ... DefaultConfig,
    setMapFilter: (value) => null,
    setSearchFilter: (value) => null,
    setRarityFilter: (value) => null,
    setFuseFilter: (value) => null,
    setOwnedFilter: (value) => null,
    checkCommonFilter: (value) => false,
    checkRewardFilter: (value) => false,
    setShort: (value) => false,
    setCostMode: (value) => false,
    setMatchMode: (value) => false,
    setByCost: (value) => false,
    setTierFilter: (value) => 1,
    setHardFilter: (value) => null,
    setFavorited: (value) => null,
    setShowIncomplete: (value) => null
} as CollectionFilterContextProps;

export const CollectionFilterContext = React.createContext<CollectionFilterContextProps>(DefaultData);

export interface CollectionFiltersProviderProps {
    pageId: string;
    playerCollections: PlayerCollection[];
    children: JSX.Element;
}
export const CollectionFilterProvider = (props: CollectionFiltersProviderProps) => {
    const context = React.useContext(GlobalContext);
    const { children, pageId, playerCollections } = props;
	const tinyCol = TinyStore.getStore('collections');   

	const offsel = tinyCol.getValue<string | undefined>(pageId + "/selectedCollection");    
	const selColId = playerCollections.find(f => f.name === offsel)?.id;
	const defaultMap = {
		collectionsFilter: selColId !== undefined ? [selColId] : [] as number[],
		rewardFilter: []
	} as MapFilterOptions;

    const [collectionSettings, setCollectionSettings] = useStateWithStorage(pageId +'/collectionSettings', DefaultConfig, { rememberForever: true });

    const setTierFilter = (tierFilter: number) => {
        setCollectionSettings({ ... collectionSettings, tierFilter })
    }

    const setOwnedFilter = (ownedFilter: string) => {
        setCollectionSettings({ ... collectionSettings, ownedFilter })
    }

    const setFuseFilter = (fuseFilter: string) => {
        setCollectionSettings({ ... collectionSettings, fuseFilter })
    }

    const setRarityFilter = (rarityFilter: number[]) => {
        setCollectionSettings({ ... collectionSettings, rarityFilter })
    }

    const setSearchFilter = (searchFilter: string) => {
        setCollectionSettings({ ... collectionSettings, searchFilter })
    }

    const setMapFilter = (mapFilter: MapFilterOptions) => {
        setCollectionSettings({ ... collectionSettings, mapFilter })
    }

	const setShort = (short: boolean) => {
        setCollectionSettings({ ... collectionSettings, short, mapFilter: { ...collectionSettings.mapFilter, rewardFilter: [] } });
    }

	const setCostMode = (costMode: "normal" | "sale") => {
        setCollectionSettings({ ... collectionSettings, costMode })
    }

	const setMatchMode = (matchMode: CollectionMatchMode) => {
        setCollectionSettings({ ... collectionSettings, matchMode, mapFilter: { ...collectionSettings.mapFilter } })
    }

	const setShowIncomplete = (showIncomplete: boolean) => {
        setCollectionSettings({ ... collectionSettings, showIncomplete, mapFilter: { ...collectionSettings.mapFilter } })
    }

    const setByCost = (byCost: boolean) => {
        setCollectionSettings({ ... collectionSettings, byCost, mapFilter: { ...collectionSettings.mapFilter } })
	}

	const setFavorited = (favorited: boolean) => {
        setCollectionSettings({ ... collectionSettings, favorited, mapFilter: { ...collectionSettings.mapFilter } })
	}

    const setHardFilter = (hardFilter: boolean) => {
        setCollectionSettings({ ... collectionSettings, hardFilter, mapFilter: { ...collectionSettings.mapFilter } })
	}

    const data = {
        ... collectionSettings,
        setMapFilter,
        setSearchFilter,
        setRarityFilter,
        setFuseFilter,
        setOwnedFilter,
        setByCost,
        setTierFilter,
        setHardFilter,
        setFavorited,

        checkCommonFilter,
        checkRewardFilter,

        setShort,
        setCostMode,
        setMatchMode,
        setShowIncomplete
    } as CollectionFilterContextProps;

    return (<CollectionFilterContext.Provider value={data}>
        {children}    
    </CollectionFilterContext.Provider>)
} 


