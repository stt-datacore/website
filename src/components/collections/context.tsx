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
    setCollectionSettings: () => null
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
        showThisCrew,
        setCollectionSettings
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

    function setTierFilter(tierFilter: number) {
        setCollectionSettings({ ... collectionSettings, tierFilter })
    }

    function setOwnedFilter(ownedFilter: string) {
        setCollectionSettings({ ... collectionSettings, ownedFilter })
    }

    function setFuseFilter(fuseFilter: string) {
        setCollectionSettings({ ... collectionSettings, fuseFilter })
    }

    function setRarityFilter(rarityFilter: number[]) {
        setCollectionSettings({ ... collectionSettings, rarityFilter })
    }

    function setSearchFilter(searchFilter: string) {
        setCollectionSettings({ ... collectionSettings, searchFilter })
    }

    function setMapFilter(mapFilter: MapFilterOptions) {
        setCollectionSettings({ ... collectionSettings, mapFilter })
    }

	function setShort(short: boolean) {
        setCollectionSettings({ ... collectionSettings, short, mapFilter: { ...collectionSettings.mapFilter, rewardFilter: [] } });
    }

	function setCostMode(costMode: "normal" | "sale") {
        setCollectionSettings({ ... collectionSettings, costMode })
    }

	function setMatchMode(matchMode: CollectionMatchMode) {
        setCollectionSettings({ ... collectionSettings, matchMode, mapFilter: { ...collectionSettings.mapFilter } })
    }

	function setShowIncomplete(showIncomplete: boolean) {
        setCollectionSettings({ ... collectionSettings, showIncomplete, mapFilter: { ...collectionSettings.mapFilter } })
    }

    function setByCost(byCost: boolean) {
        setCollectionSettings({ ... collectionSettings, byCost, mapFilter: { ...collectionSettings.mapFilter } })
	}

	function setFavorited(favorited: boolean) {
        setCollectionSettings({ ... collectionSettings, favorited, mapFilter: { ...collectionSettings.mapFilter } })
	}

    function setHardFilter(hardFilter: boolean) {
        setCollectionSettings({ ... collectionSettings, hardFilter, mapFilter: { ...collectionSettings.mapFilter } })
	}

}



/**
 * Format collection description text by parsing the markup
 * @param text The collection text to parse and format
 * @param style Optional style to include on the output DIV
 * @param className Optional className to include on the output DIV (comes before style in rendering)
 * @param linkFunc Optional on-click function
 * @param linkValue Optional value (parsed contents used otherwise)
 * @returns {JSX.Element} Formatted collection description
 */
export const formatColString = (text: string, style?: React.CSSProperties, className?: string, linkFunc?: (value: string) => void, linkValue?: string) => {
	const greg = new RegExp(/(.+)\<([A-Fa-f0-9#]+)\>\<b\>(.+)\<\/b\>\<\/color\>(.+)/);
	const greg2 = new RegExp(/(.+)\<span style\=\"color:([A-Fa-f0-9#]+)\"\>\<b\>(.+)\<\/b\>\<\/span\>(.+)/);

	let testA = greg.test(text);
	let testB = greg2.test(text);

	if (!testA && !testB) {
		if (linkFunc && linkValue) {
			return <div className={className} style={{ ...(style ?? {}), cursor: "pointer" }} onClick={(e) => linkFunc(linkValue)}>{text}</div>;
		}
		else {
			return <div className={className} style={style}>{text}</div>;
		}

	}

	if (testA) {
		const result = greg.exec(text);

		return result && <div style={style}>
			{result[1]}<b style={{ color: result[2], cursor: linkFunc ? 'pointer' : undefined }} onClick={(e) => linkFunc ? linkFunc(linkValue ?? result[3]) : null}>{result[3]}</b>{result[4]}
		</div> || <>{text}</>
	}
	else {
		const result = greg2.exec(text);

		return result && <div className={className} style={style}>
			{result[1]}<b style={{ color: result[2], cursor: linkFunc ? 'pointer' : undefined }} onClick={(e) => linkFunc ? linkFunc(linkValue ?? result[3]) : null}>{result[3]}</b>{result[4]}
		</div> || <>{text}</>
	}
}

