import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { PlayerCollection, PlayerCrew } from "../../model/player";
import { getCollectionRewards } from '../../utils/itemutils';
import { useStateWithStorage } from '../../utils/storage';
import { TinyStore } from '../../utils/tiny';
import { MapFilterOptions, CollectionFilterContextProps, CollectionMap, CollectionGroup, CollectionMatchMode } from '../../model/collectionfilter';
import { checkCommonFilter, checkRewardFilter } from '../../utils/collectionutils';

const DefaultData = {
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

export interface CollectionFiltersProps {
    pageId: string;
    playerCollections: PlayerCollection[];
    children: JSX.Element;
}
export const CollectionFilterProvider = (props: CollectionFiltersProps) => {
    const context = React.useContext(GlobalContext);
    const { children, pageId, playerCollections } = props;
	const tinyCol = TinyStore.getStore('collections');   

	const offsel = tinyCol.getValue<string | undefined>(pageId + "/selectedCollection");    
	const selColId = playerCollections.find(f => f.name === offsel)?.id;
	const defaultMap = {
		collectionsFilter: selColId !== undefined ? [selColId] : [] as number[],
		rewardFilter: []
	} as MapFilterOptions;

    const [tierFilter, setTierFilter] = useStateWithStorage(pageId + 'collectionstool/tierFilter', 1);
    const [ownedFilter, setOwnedFilter] = useStateWithStorage(pageId + 'collectionstool/ownedFilter', '');
    const [fuseFilter, setFuseFilter] = useStateWithStorage(pageId + 'collectionstool/fuseFilter', '');
    const [rarityFilter, setRarityFilter] = useStateWithStorage(pageId + 'collectionstool/rarityFilter', [] as number[]);
    const [searchFilter, setSearchFilter] = useStateWithStorage(pageId + 'collectionstool/searchFilter', '');
    const [mapFilter, setMapFilter] = useStateWithStorage(pageId + 'collectionstool/mapFilter', defaultMap);
	const [short, internalSetShort] = useStateWithStorage('collectionstool/colGroupShort', false, { rememberForever: true });
    const [hardFilter, internalSetHardFilter] = useStateWithStorage('collectionstool/colHardFilter', false, { rememberForever: true });
	const [costMode, setCostMode] = useStateWithStorage<'normal' | 'sale'>("collectionstool/costMode", 'normal', { rememberForever: true });
	const [matchMode, setMatchMode] = useStateWithStorage<CollectionMatchMode>("colOptimizer/matchMode", 'normal', { rememberForever: true });
	const [showIncomplete, setShowIncomplete] = useStateWithStorage('colOptimizer/showIncomplete', false, { rememberForever: true });
    const [byCost, internalSetByCost] = useStateWithStorage("colOptimizer/sortByCost", false, { rememberForever: true });
    const [favorited, internalSetFavorited] = useStateWithStorage("colOptimizer/favorited", true, { rememberForever: true });

	const setByCost = (value: boolean) => {
		internalSetByCost(value);
		setMapFilter({ ... mapFilter });
	}

	const setFavorited = (value: boolean) => {
		internalSetFavorited(value);
		setMapFilter({ ... mapFilter });
	}

    const setHardFilter = (value: boolean) => {
		internalSetHardFilter(value);
		setMapFilter({ ... mapFilter });
	}

    const data = {
        mapFilter,
        searchFilter,
        rarityFilter,
        fuseFilter,
        ownedFilter,
        short,
        costMode,
        matchMode,
        byCost,
        tierFilter,
        hardFilter,
        favorited,
        showIncomplete,

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

        setShort: internalSetShort,
        setCostMode,
        setMatchMode,
        setShowIncomplete
    } as CollectionFilterContextProps;

    return (<CollectionFilterContext.Provider value={data}>
            {children}    
        </CollectionFilterContext.Provider>)
} 


