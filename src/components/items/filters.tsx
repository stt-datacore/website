import React from "react";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { Checkbox, Dropdown } from "semantic-ui-react";
import { OptionsPanelFlexRow } from "../stats/utils";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { PlayerEquipmentItem } from "../../model/player";

export interface IItemsFilterContext {
    available: boolean,
    ownedItems: boolean,
    showUnownedNeeded?: boolean,
    setShowUnownedNeeded: (value?: boolean) => void;
    rarityFilter?: number[];
    setRarityFilter: (value?: number[]) => void;
    itemTypeFilter?: number[];
    setItemTypeFilter: (value?: number[]) => void;
    filterItems: (items: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) => (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[];
    configureFilters: (pool?: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) => void;
}

const DefaultContextData: IItemsFilterContext = {
    available: false,
    ownedItems: false,
    showUnownedNeeded: false,
    setShowUnownedNeeded: () => false,
    setRarityFilter: () => false,
    setItemTypeFilter: () => false,
    filterItems: () => [],
    configureFilters: () => false
}

export const ItemsFilterContext = React.createContext(DefaultContextData);

export interface ItemsFilterProps {
    pageId: string;
    pool?: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[];
    ownedItems: boolean;
    children: JSX.Element;
    noRender?: boolean;
}

export const ItemsFilterProvider = (props: ItemsFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t }  = globalContext.localized;
    const { children, pageId, pool, ownedItems, noRender } = props;

    const [filterPool, setFilterPool] = React.useState(pool);

    const [showUnownedNeeded, setShowUnownedNeeded] = useStateWithStorage<boolean | undefined>(`${pageId}/items_show_unowned_needed`, false, { rememberForever: true });
    const [rarityFilter, setRarityFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_rarity_filter`, undefined, { rememberForever: true });
    const [itemTypeFilter, setItemTypeFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/items_item_type_filter`, undefined, { rememberForever: true });

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

    const contextData: IItemsFilterContext = {
        available: true,
        ownedItems,
        rarityFilter,
        setRarityFilter,
        itemTypeFilter,
        setItemTypeFilter,
        showUnownedNeeded,
        setShowUnownedNeeded,
        filterItems,
        configureFilters
    }

    const flexRow = OptionsPanelFlexRow;

    return <React.Fragment>
        {!noRender && <div className={'ui segment'} style={{...flexRow}}>
            <Dropdown
                placeholder={t("hints.filter_by_rarity")}
                multiple
                clearable
                selection
                options={rarityOptions}
                value={rarityFilter}
                onChange={(e, { value }) => setRarityFilter(value as number[] ?? [])}
            />
            <Dropdown
                placeholder={t("hints.filter_by_item_type")}
                multiple
                clearable
                selection
                options={itemTypeOptions}
                value={itemTypeFilter}
                onChange={(e, { value }) => setItemTypeFilter(value as number[] ?? [])}
            />
            {!!ownedItems && !!setShowUnownedNeeded &&
            <Checkbox
                label={t("items.show_unowned_needed")}
                checked={showUnownedNeeded}
                onChange={(e, { checked }) =>
                    setShowUnownedNeeded(!!checked)
                }
            />}
        </div>}
        <ItemsFilterContext.Provider value={contextData}>
            {children}
        </ItemsFilterContext.Provider>
    </React.Fragment>

    function filterItems(value: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) {
        return value.filter(item => {
            if (rarityFilter?.length) {
                if (!rarityFilter.includes(item.rarity)) return false;
            }
            if (itemTypeFilter?.length && item.type !== undefined) {
                if (!itemTypeFilter.includes(item.type)) return false;
            }
            if (ownedItems && !showUnownedNeeded && item.quantity === 0) return false;
            return true;
        });
    }

    function configureFilters(pool?: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) {
        setFilterPool(pool ?? props.pool);
    }
}