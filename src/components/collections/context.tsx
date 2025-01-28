import React from 'react';

import { PlayerCollection, PlayerCrew } from "../../model/player";
import { useStateWithStorage } from '../../utils/storage';
import { MapFilterOptions, ICollectionsContext, CollectionMatchMode, CollectionsToolSettings } from '../../model/collectionfilter';
import { checkCommonFilter, checkRewardFilter } from '../../utils/collectionutils';
import { Filter } from '../../model/game-elements';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';

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
} as CollectionsToolSettings;

const DefaultData = {
    ... DefaultConfig,
    setMapFilter: () => null,
    setSearchFilter: () => null,
    setRarityFilter: () => null,
    setFuseFilter: () => null,
    setOwnedFilter: () => null,
    checkCommonFilter: () => false,
    checkRewardFilter: () => false,
    setShort: () => false,
    setCostMode: () => false,
    setMatchMode: () => false,
    setByCost: () => false,
    setTierFilter: () => 1,
    setHardFilter: () => null,
    setFavorited: () => null,
    setShowIncomplete: () => null,
    showThisCrew: () => false,
} as ICollectionsContext;

export const CollectionsContext = React.createContext<ICollectionsContext>(DefaultData);

export interface CollectionFiltersProviderProps {
    pageId: string;
    playerCollections: PlayerCollection[];
    children: JSX.Element;
}
export const CollectionFilterProvider = (props: CollectionFiltersProviderProps) => {
    const { children, pageId } = props;

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
        setShowIncomplete,
        showThisCrew
    } as ICollectionsContext;

    return (<CollectionsContext.Provider value={data}>
        {children}    
    </CollectionsContext.Provider>)

    function showThisCrew(crew: PlayerCrew, filters: Filter[], filterType: string | null | undefined): boolean {

        if (crew.immortal === -1 || crew.immortal > 0) {
            return false;
        }

        if (!filterType) return true;

        if (collectionSettings.mapFilter.collectionsFilter && collectionSettings.mapFilter.collectionsFilter.length > 0) {
            let hasAllCollections = true;
            for (let i = 0; i < collectionSettings.mapFilter.collectionsFilter.length; i++) {
                if (!crew.unmaxedIds?.includes(collectionSettings.mapFilter.collectionsFilter[i])) {
                    hasAllCollections = false;
                    break;
                }
            }
            if (!hasAllCollections) return false;
        }
        if (!checkCommonFilter(collectionSettings, crew)) return false;
        return crewMatchesSearchFilter(crew, filters, filterType);
    }

} 


