import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { createFlavor, CustomFieldDef, FlavorConfig } from "./utils";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { PlayerEquipmentItem } from "../../model/player";
import { Checkbox, Icon, Table } from "semantic-ui-react";
import { omniSearchFilter } from "../../utils/omnisearch";
import { Filter } from "../../model/game-elements";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";
import { getItemBonuses, getItemWithBonus, ItemWithBonus } from "../../utils/itemutils";
import { renderBonuses } from "../item_presenters/item_presenter";
import { AvatarView } from "../item_presenters/avatarview";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { OptionsPanelFlexRow } from "../stats/utils";
import { ItemsFilterContext } from "./filters";
import { skillSum } from "../../utils/crewutils";


export interface EquipmentTableProps {
    pageId: string;
    items?: (EquipmentItem | PlayerEquipmentItem | EquipmentCommon)[];
    hideOwnedColumns?: boolean;
    types?: number[];
    buffsColumn?: boolean;
    flavorColumn?: boolean;
    customFields?: CustomFieldDef[];
    itemTargetGroup?: string;
    navigate?: (symbol: string) => void;
    noRender?: boolean;
    selection?: number[];
    setSelection?: (value?: number[]) => void;
    maxSelections?: number;
    selectionMode?: boolean;
}

export const EquipmentTable = (props: EquipmentTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const filterContext = React.useContext(ItemsFilterContext);

    const { available, ownedItems, filterItems, rarityFilter, itemTypeFilter, showUnownedNeeded } = filterContext;

    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { pageId, hideOwnedColumns: hideOwnedInfo, types, buffsColumn: buffs, flavorColumn: flavor, customFields, noRender } = props;
    const { selection, setSelection, maxSelections, selectionMode } = props;

    const items = React.useMemo(() => {
        if (available) {
            return filterItems(props.items ?? globalContext.core.items);
        }
        else {
            return props.items ?? globalContext.core.items;
        }
    }, [props.items, globalContext.core.items, available, rarityFilter, itemTypeFilter, showUnownedNeeded]);

    const buffCache = React.useMemo(() => {
        if (items?.length && buffs) {
            const output = {} as {[key: string]: ItemWithBonus };
            for (let item of items) {
                output[item.symbol] = getItemWithBonus(item as EquipmentItem);
            }
            return output;
        }
        else {
            return {};
        }
    }, [items, buffs]);

    const itemTargetGroup = React.useMemo(() => {
        if (props.itemTargetGroup) return props.itemTargetGroup;
        return `${pageId}_items_hover`;
    }, [props.itemTargetGroup]);

    const flavorConfig = React.useMemo<FlavorConfig>(() => {
        const config = {
            localized: globalContext.localized,
            crew: globalContext.core.crew,
            ownedItems
        }
        if (ownedItems && playerData) config.crew = playerData.player.character.crew.filter(f => !f.immortal && f.equipment.filter(f => !!f).length !== 4);
        return config;
    }, [globalContext.localized, playerData, globalContext.core.crew, ownedItems]);

    React.useEffect(() => {
        if (available) {

        }
    }, [rarityFilter, itemTypeFilter, showUnownedNeeded]);

    const tableConfig = [
        { width: 3, column: "name", title: t("items.columns.item") },
    ] as ITableConfigRow[];

    if (!hideOwnedInfo) {
        tableConfig.push(
            { width: 1, column: 'quantity', title: t("items.columns.quantity"), reverse: true },
            { width: 1, column: 'needed', title: t("items.columns.needed"), reverse: true },
        );
    }

    if (!types?.length) {
        tableConfig.push(
            { width: 1, column: 'type', title: t("items.columns.item_type"), reverse: false },
        );
    }

    tableConfig.push(
        {
            width: 1, column: 'rarity', title: t("items.columns.rarity"), reverse: true,
            customCompare: (a: EquipmentItem, b: EquipmentItem) => a.rarity - b.rarity || buffComp(a, b) || a.name.localeCompare(b.name)
        },
    );

    if (buffs) {
        tableConfig.push(
            {
                width: 1, column: 'buffs', title: t("items.columns.item_buffs"), reverse: true,
                customCompare: (a: EquipmentItem, b: EquipmentItem) => buffComp(a, b) || a.name.localeCompare(b.name)
            },
        );
    }

    if (flavor) {
        tableConfig.push(
            { width: 1, column: 'flavor', title: t("items.columns.flavor"), reverse: false },
        );
    }

    if (!hideOwnedInfo) {
        tableConfig.push(
            { width: 1, column: 'factionOnly', title: t("items.faction_only"), reverse: false },
        );
    }

    if (!!customFields?.length) {
        customFields.forEach((field) => {
            tableConfig.push(
                { width: field.width as number ?? 1, column: field.field, title: field.text, reverse: field.reverse, customCompare: field.customCompare },
            )
        });
    }

    if (noRender) {
        return <></>
    }
    else return <React.Fragment>
        {!props.itemTargetGroup && <ItemHoverStat targetGroup={itemTargetGroup} />}
        <SearchableTable
            config={tableConfig}
            data={items}
            renderTableRow={renderTableRow}
            filterRow={filterRow}
        />
    </React.Fragment>

    function filterRow(row: (EquipmentItem | EquipmentCommon), filters: Filter[], filterType?: string) {
        return omniSearchFilter(row, filters, filterType, ['name', 'flavor']);
    }

    function renderTableRow(item: EquipmentItem | EquipmentCommon, idx: any) {
        return <Table.Row key={`${pageId}_equipment_TableRow_${item.archetype_id}_${item.symbol}+${idx}`}>
            <Table.Cell>
                <div
                    title={
                        item.name +
                        (!hideOwnedInfo ? !item.quantity ? ` (${t('owned_status.unowned')})` : ` (${item.quantity})` : "")
                    }
                    style={{
                        display: "grid",
                        gridTemplateColumns: !!setSelection && !!selectionMode
                        ? "87px auto"
                        : "60px auto",
                        gridTemplateAreas: `'icon stats' 'icon description'`,
                        gridGap: "1px",
                    }}
                >
                    <div
                        style={{
                            gridArea: "icon",
                            display: "flex",
                            gap: "0.5em",
                            width: "87px",
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {!!setSelection && !!selectionMode && (
                            <Checkbox
                                disabled={
                                    !!selection && !!maxSelections && selection.length >= maxSelections &&
                                    !selection.includes(Number(item.id))
                                }
                                checked={!!selection?.includes(Number(item.id))}
                                onChange={(e, { checked }) => {
                                    let sel = [ ...selection ?? []];
                                    if (checked) {
                                        if (!sel.includes(Number(item.id))) sel.push(Number(item.id));
                                    }
                                    else {
                                        sel = sel.filter(i => i != Number(item.id));
                                    }
                                    setSelection(sel);
                                }}
                            />
                        )}
                        <AvatarView
                            style={{
                                opacity:
                                    !item.quantity && !hideOwnedInfo && ownedItems ? "0.20" : "1",
                            }}
                            mode='item'
                            partialItem={true}
                            item={item}
                            size={48}
                            targetGroup={itemTargetGroup}
                            />
                    </div>
                    <div style={{ gridArea: "stats", cursor: "pointer" }}>
                        <a onClick={(e) => execNavigation(item.symbol)}>
                            <span
                                style={{ fontWeight: "bolder", fontSize: "1.25em" }}
                            >
                                {item.rarity > 0 && (
                                    <span>
                                        {item.rarity} <Icon name="star" />{" "}
                                    </span>
                                )}
                                {item.name}
                            </span>
                        </a>
                    </div>
                    <div style={{ gridArea: "description" }}>
                        {createFlavor(item, flavorConfig)}
                    </div>
                </div>
            </Table.Cell>
            {!hideOwnedInfo && <Table.Cell>{item.quantity}</Table.Cell>}
            {!hideOwnedInfo && (
                <Table.Cell>{item.needed ?? "N/A"}</Table.Cell>
            )}
            {!types?.length && (
                <Table.Cell>
                    {CONFIG.REWARDS_ITEM_TYPE[item.type]}
                </Table.Cell>
            )}
            <Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
            {!!buffs && <Table.Cell>{renderBuffs(item)}</Table.Cell>}
            {!!flavor && (
                <Table.Cell>{createFlavor(item, flavorConfig)}</Table.Cell>
            )}
            {!hideOwnedInfo && (
                <Table.Cell>
                    {item.factionOnly === undefined
                        ? ""
                        : item.factionOnly === true
                            ? t("global.yes")
                            : t("global.no")}
                </Table.Cell>
            )}
            {!!customFields?.length &&
                customFields.map((field) => (
                    <Table.Cell key={"custom_" + field.field + "_value"}>
                        {field.format
                            ? field.format(item[field.field])
                            : item[field.field]}
                    </Table.Cell>
                ))}
        </Table.Row>
    }

    function execNavigation(symbol: string) {
        if (props.navigate) {
            props.navigate(symbol);
        } else {
            navigate("/item_info?symbol=" + symbol);
        }
    }
    function renderBuffs(item: EquipmentItem | EquipmentCommon) {
        const { bonuses } = getItemBonuses(item as EquipmentItem);
        return renderBonuses(bonuses, "1em", "0.25em");
    }

    function buffComp(a: EquipmentItem, b: EquipmentItem) {
        const abonus = buffCache[a.symbol];
        const bbonus = buffCache[b.symbol];
        if (abonus === bbonus) return 0;
        else if (!abonus) return -1;
        else if (!bbonus) return 1;
        let r = skillSum(Object.values(abonus.bonusInfo.bonuses)) - skillSum(Object.values(bbonus.bonusInfo.bonuses))
        if (!r) {
            r = Object.keys(abonus.bonusInfo).join().localeCompare(Object.keys(bbonus.bonusInfo).join());
        }
        return r;
    }
}