import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { createFlavor, CustomFieldDef, FlavorConfig } from "./utils";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { PlayerCrew, PlayerEquipmentItem } from "../../model/player";
import { Checkbox, Icon, Table } from "semantic-ui-react";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentWorkerResults } from "../../model/worker";
import { omniSearchFilter } from "../../utils/omnisearch";
import { Filter } from "../../model/game-elements";
import CONFIG from "../CONFIG";
import ItemDisplay from "../itemdisplay";
import { navigate } from "gatsby";
import { getItemBonuses } from "../../utils/itemutils";
import { renderBonuses } from "../item_presenters/item_presenter";
import { AvatarView } from "../item_presenters/avatarview";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { OptionsPanelFlexRow } from "../stats/utils";


export interface EquipmentTableProps {
    pageId: string;
    items: (EquipmentItem | PlayerEquipmentItem | EquipmentCommon)[];
    hideOwnedInfo?: boolean;
    types?: number[];
    buffs?: boolean;
    flavor?: boolean;
    customFields?: CustomFieldDef[];
    useWorker?: boolean;
    addNeeded?: boolean;
    itemTargetGroup?: string;
    navigate?: (symbol: string) => void;
    noRender?: boolean;
}

export const EquipmentTable = (props: EquipmentTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const { pageId, hideOwnedInfo, types, buffs, flavor, customFields, items, useWorker, addNeeded, noRender } = props;

    const [triggerWorker, setTriggerWorker] = React.useState(false);
    const [displayData, setDisplayData] = React.useState(items);

    // const isMobile = typeof window !== "undefined" && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const itemTargetGroup = React.useMemo(() => {
        if (props.itemTargetGroup) return props.itemTargetGroup;
        return `${pageId}_items_hover`;
    }, [props.itemTargetGroup]);

    const flavorConfig = React.useMemo<FlavorConfig>(() => {
        return {
            localized: globalContext.localized,
            crew: playerData?.player?.character?.crew ?? globalContext?.core?.crew
        }
    }, [globalContext.localized, playerData, globalContext.core.crew]);

    const { cancel, runWorker, running } = React.useMemo(() => {
        if (useWorker) {
            return workerContext;
        }
        else {
            return { cancel: () => false, runWorker: () => false, running: false };
        }
    }, [useWorker, workerContext]);

    React.useEffect(() => {
        if (useWorker && triggerWorker) return;
        if (!!runWorker && !!useWorker && !!items?.length && !!playerData) {
            setTriggerWorker(true);
        }
        else if (!useWorker && !!items?.length && displayData !== items) {
            setDisplayData(items);
        }
    }, [runWorker, useWorker, playerData, items]);

    React.useEffect(() => {
        if (triggerWorker) {
            setTimeout(() => {
                if (triggerWorker && useWorker) {
                    setTriggerWorker(false);
                    runWorker(
                        "equipmentWorker", {
                            playerData,
                            items: globalContext.core.items,
                            addNeeded: !!addNeeded
                        },
                        (data: { data: { result: EquipmentWorkerResults } }) => {
                            setDisplayData(data.data.result.items);
                        }
                    )
                }
            }, 500);
        }
    }, [triggerWorker]);

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
    const flexRow = OptionsPanelFlexRow;

    if (noRender) {
        return <></>
    }
    else if (useWorker && running) {
        return <div style={{...flexRow, justifyContent: 'center', marginTop: '4em'}}>{globalContext.core.spin(t('spinners.demands'))}</div>;
    }
    else return <React.Fragment>

        {!props.itemTargetGroup && <ItemHoverStat targetGroup={itemTargetGroup} />}
        <SearchableTable
            config={tableConfig}
            data={displayData}
            renderTableRow={renderTableRow}
            filterRow={filterRow}
        />
    </React.Fragment>

    function filterRow(row: (EquipmentItem | PlayerEquipmentItem | EquipmentCommon), filters: Filter[], filterType?: string) {
        return omniSearchFilter(row, filters, filterType, ['name', 'flavor']);
    }

    function renderTableRow(item: EquipmentItem, idx: any) {
        return <Table.Row key={`${pageId}_equipment_Table_${item.archetype_id}_${item.symbol}+${idx}`}>

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
                        {createFlavor(item, flavorConfig) || item.flavor}
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