import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { createFlavor, CustomFieldDef, FlavorConfig } from "./utils";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { PlayerEquipmentItem } from "../../model/player";
import { Icon, Table } from "semantic-ui-react";
import { omniSearchFilter } from "../../utils/omnisearch";
import { Filter } from "../../model/game-elements";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";
import { getItemBonuses } from "../../utils/itemutils";
import { renderBonuses } from "../item_presenters/item_presenter";
import { AvatarView } from "../item_presenters/avatarview";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { OptionsPanelFlexRow } from "../stats/utils";
import { ItemsFilterContext } from "./filters";


export interface EquipmentTableProps {
    pageId: string;
    items?: (EquipmentItem | PlayerEquipmentItem | EquipmentCommon)[];
    hideOwnedInfo?: boolean;
    types?: number[];
    buffs?: boolean;
    flavor?: boolean;
    customFields?: CustomFieldDef[];
    itemTargetGroup?: string;
    navigate?: (symbol: string) => void;
    noRender?: boolean;
}

export const EquipmentTable = (props: EquipmentTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const filterContext = React.useContext(ItemsFilterContext);

    const { available, ownedItems, filterItems, rarityFilter, itemTypeFilter, showUnownedNeeded } = filterContext;

    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { pageId, hideOwnedInfo, types, buffs, flavor, customFields, noRender } = props;

    const items = React.useMemo(() => {
        if (available) {
            return filterItems(props.items ?? globalContext.core.items);
        }
        else {
            return props.items ?? globalContext.core.items;
        }
    }, [props.items, globalContext.core.items, available, rarityFilter, itemTypeFilter, showUnownedNeeded]);

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
        { width: 1, column: 'rarity', title: t("items.columns.rarity"), reverse: true },
    );

    if (buffs) {
        tableConfig.push(
            { width: 1, column: 'buffs', title: t("items.columns.item_buffs"), reverse: true },
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
                { width: field.width as number ?? 1, column: field.field, title: t("items.faction_only"), reverse: field.reverse },
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
                        gridTemplateColumns: "60px auto",
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
                        <AvatarView
                            style={{
                                opacity:
                                    !item.quantity && !hideOwnedInfo ? "0.20" : "1",
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
}