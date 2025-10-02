import React from "react";
import { EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { Checkbox, Dropdown, DropdownItemProps } from "semantic-ui-react";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { PlayerEquipmentItem } from "../../model/player";

const ItemSources = {
    "cadet_missions": 4,
    "faction_missions": 1,
    "missions": 0,
    "ship_battles": 2
};

export interface IItemsFilterContext {
    available: boolean,
    ownedItems: boolean,
    hideUnneeded?: boolean,
    setHideUnneeded: (value?: boolean) => void;
    showUnownedNeeded?: boolean,
    setShowUnownedNeeded: (value?: boolean) => void;
    rarityFilter?: number[];
    setRarityFilter: (value?: number[]) => void;
    itemTypeFilter?: number[];
    setItemTypeFilter: (value?: number[]) => void;
    itemSourceFilter?: number[];
    setItemSourceFilter: (value?: number[]) => void;
    masteryFilter?: number[];
    setMasteryFilter: (value?: number[]) => void;
    filterItems: (items: (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[]) => (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[];
    configureFilters: (pool?: (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[]) => void;
}

const DefaultContextData: IItemsFilterContext = {
    available: false,
    ownedItems: false,
    showUnownedNeeded: false,
    hideUnneeded: false,
    setHideUnneeded: () => false,
    setShowUnownedNeeded: () => false,
    setRarityFilter: () => false,
    setItemTypeFilter: () => false,
    setItemSourceFilter: () => false,
    setMasteryFilter: () => false,
    filterItems: () => [],
    configureFilters: () => false,
}

export const ItemsFilterContext = React.createContext(DefaultContextData);

export interface ItemsFilterProps {
    pageId: string;
    pool?: (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[];
    ownedItems: boolean;
    children: React.JSX.Element;
    noRender?: boolean;
}

export const ItemsFilterProvider = (props: ItemsFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, useT } = globalContext.localized;
    const { t: hint } = useT('hints');
    const { children, pageId, pool, ownedItems, noRender } = props;

    const [filterPool, setFilterPool] = React.useState(pool);

    const [showUnownedNeeded, setShowUnownedNeeded] = useStateWithStorage<boolean | undefined>(`${pageId}/items_show_unowned_needed`, false, { rememberForever: true });
    const [hideUnneeded, setHideUnneeded] = useStateWithStorage<boolean | undefined>(`${pageId}/items_hide_unneeded`, false, { rememberForever: true });
    const [rarityFilter, setRarityFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_rarity_filter`, undefined, { rememberForever: true });
    const [itemTypeFilter, setItemTypeFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_item_type_filter`, undefined, { rememberForever: true });
    const [itemSourceFilter, setItemSourceFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_item_source_filter`, undefined, { rememberForever: true });
    const [masteryFilter, setMasteryFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_mastery_filter`, undefined, { rememberForever: true });

    const rarityOptions = React.useMemo(() => CONFIG.RARITIES
        .filter((rarity, idx) => filterPool?.some((p) => p.rarity === idx) ?? true)
        .map((rarity, idx) => {
            return {
                key: `rarity_${idx}`,
                text: `${rarity.name}`,
                value: idx
            }
        }), [filterPool]);

    const itemTypeOptions = React.useMemo(() => Object.entries(CONFIG.REWARDS_ITEM_TYPE)
        .filter(([type, name], idx) => filterPool?.some((p) => Number(p.type) === Number(type)) ?? true)
        .map(([type, name], idx) => {
            return {
                key: `item_type_${type}`,
                text: `${name}`,
                value: Number(type)
            }
        }), [filterPool]);

    const itemSourceOptions = Object.entries(ItemSources).map(([source, value]) => ({
        key: source,
        value,
        text: t(`item_source.${source}`)
    } as DropdownItemProps));

    const masteryOptions = ['normal', 'elite', 'epic'].map((key, idx) => ({
        key,
        value: idx,
        text: t(`mastery.${key}`)
    }));

    const contextData: IItemsFilterContext = {
        available: true,
        ownedItems,
        rarityFilter,
        setRarityFilter,
        itemTypeFilter,
        setItemTypeFilter,
        hideUnneeded,
        setHideUnneeded,
        showUnownedNeeded,
        setShowUnownedNeeded,
        filterItems,
        configureFilters,
        itemSourceFilter,
        setItemSourceFilter,
        masteryFilter,
        setMasteryFilter
    }

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return <React.Fragment>
        {!noRender && <div className={'ui segment'} style={{ ...flexRow, flexWrap: 'wrap' }}>
            <Dropdown
                placeholder={hint("filter_by_rarity")}
                multiple
                clearable
                selection
                options={rarityOptions}
                value={rarityFilter}
                onChange={(e, { value }) => setRarityFilter(value as number[] ?? [])}
            />
            <Dropdown
                placeholder={hint("filter_by_item_type")}
                multiple
                clearable
                selection
                options={itemTypeOptions}
                value={itemTypeFilter}
                onChange={(e, { value }) => setItemTypeFilter(value as number[] ?? [])}
            />
            <Dropdown
                placeholder={t("items.item_sources")}
                multiple
                clearable
                selection
                options={itemSourceOptions}
                value={itemSourceFilter}
                onChange={(e, { value }) => setItemSourceFilter(value as number[] ?? [])}
            />
            {!!itemSourceFilter?.length && itemSourceFilter.some(s => s !== ItemSources.faction_missions) && <Dropdown
                placeholder={hint("filter_by_mastery")}
                multiple
                clearable
                selection
                options={masteryOptions}
                value={masteryFilter}
                onChange={(e, { value }) => setMasteryFilter(value as number[] ?? [])}
            />}
            <div style={{ ...flexCol, alignItems: 'flex-start', gap: '1em' }}>
                {!!ownedItems && !!setShowUnownedNeeded &&
                    <Checkbox
                        label={t("items.show_unowned_needed")}
                        checked={showUnownedNeeded}
                        onChange={(e, { checked }) =>
                            setShowUnownedNeeded(!!checked)
                        }
                    />}
                {!!ownedItems && !!setShowUnownedNeeded &&
                    <Checkbox
                        label={t("items.hide_unneeded_items")}
                        checked={hideUnneeded}
                        onChange={(e, { checked }) =>
                            setHideUnneeded(!!checked)
                        }
                    />}
            </div>
        </div>}
        <ItemsFilterContext.Provider value={contextData}>
            {children}
        </ItemsFilterContext.Provider>
    </React.Fragment>

    function filterItems(value: (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[]) {
        return value.filter(item => {
            if (rarityFilter?.length) {
                if (!rarityFilter.includes(item.rarity)) return false;
            }
            if (itemTypeFilter?.length && item.type !== undefined) {
                if (!itemTypeFilter.includes(item.type)) return false;
            }
            if (itemSourceFilter?.length && "item_sources" in item && item.item_sources) {
                if (!item.item_sources?.some(s => itemSourceFilter.includes(s.type))) return false;
            }
            if (ownedItems && !showUnownedNeeded && item.quantity === 0) return false;
            if (hideUnneeded && (!("needed" in item) || !item.needed)) return false;
            return true;
        })
            .map(item => {
                if (itemSourceFilter?.length) {
                    item = { ...item };
                    if ("item_sources" in item && item.item_sources) {
                        item.item_sources = item.item_sources
                            .filter(s =>
                                itemSourceFilter.includes(s.type) &&
                                (s.type === 1 || !masteryFilter?.length || masteryFilter.includes(s.mastery ?? -1))
                            );
                    }
                }
                return item;
            });
    }

    function configureFilters(pool?: (EquipmentItem | EquipmentItem | PlayerEquipmentItem)[]) {
        setFilterPool(pool ?? props.pool);
    }
}