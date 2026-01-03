import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { EnergyLogContext } from "../page/util";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { Button, Checkbox, Dropdown, Table } from "semantic-ui-react";
import { PromptContext } from "../../context/promptcontext";
import { useStateWithStorage } from "../../utils/storage";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { Filter } from "../../model/game-elements";
import { printChrons, printCredits, printDilithium, printHonor, printISM, printMerits, printQuantum } from "../retrieval/context";
import { omniSearchFilter } from "../../utils/omnisearch";

export type ResourceViewMode = 'resource' | 'update';

export interface ResourceData {
    resource: string,
    amount: number,
    moving_average: number,
    difference: number,
    timestamp: Date
}

const transKeys = {
    money: 'credits',
    premium_purchasable: 'dilithium',
    honor: 'honor',
    premium_earnable: 'merits',
    shuttle_rental_tokens: 'shuttle_token',
    chrons: 'chronitons',
    ism: 'ism',
    quantum: 'quantum',

}

export const ResourceTracker = () => {
    const globalContext = React.useContext(GlobalContext);
    const promptContext = React.useContext(PromptContext);
    const { confirm } = promptContext;
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const trackerContext = React.useContext(EnergyLogContext);

    const { enabled, setEnabled, log, clearLog } = trackerContext;

    const [resourceFilter, setResourceFilter] = useStateWithStorage<string[]>('resource_tracker/filters', []);

    const bodyArea: React.CSSProperties = {
        ...OptionsPanelFlexColumn,
        justifyContent: 'stretch',
        alignItems: 'stretch'
    }

    const entries = React.useMemo(() => {
        if (playerData) {
            const dbid = playerData.player.dbid;
            log[dbid] ??= [];
            return log[dbid];
        }
        else {
            return [].slice();
        }
    }, [playerData, log]);

    const stats = React.useMemo(() => {
        const stats = compileStats();
        return stats.filter(row => {
            if (resourceFilter.length && !resourceFilter.includes(row.resource)) return false;
            return true;
        });
    }, [entries, resourceFilter]);

    if (!playerData) {
        return (
            <div style={bodyArea}>
            </div>
        )
    }

    const tableConfig = [] as ITableConfigRow[];

    tableConfig.push(
        {
            column: 'timestamp',
            width: 1,
            title: t('resource_tracker.columns.timestamp')
        },
        {
            column: 'resource',
            width: 1,
            title: t('resource_tracker.columns.resource')
        },
        {
            column: 'amount',
            width: 1,
            title: t('global.amount')
        },
        {
            column: 'moving_average',
            width: 1,
            title: t('resource_tracker.columns.moving_average')
        },
        {
            column: 'difference',
            width: 1,
            title: t('resource_tracker.columns.difference')
        }
    );

    const filterOpts = Object.entries(transKeys).map(([key, value]) => {
        return {
            key,
            value: key,
            text: t(`global.item_types.${value}`)
        }
    });

    return (
        <div style={bodyArea}>
            <div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
                <div style={{...OptionsPanelFlexColumn}}>
                    <Checkbox
                        checked={enabled}
                        onChange={(e, { checked }) => setEnabled(!!checked)}
                        label={t('resource_tracker.enable')}
                    />
                </div>
                <div>
                    <Button onClick={askClearLog} disabled={!enabled || !entries.length}>
                        {t('resource_tracker.clear')}
                    </Button>
                </div>
            </div>
            {enabled && (
                <div style={{...OptionsPanelFlexColumn, margin: '1em 0', alignItems: 'flex-start', gap: '0.5em'}}>
                    <span>{t('hints.filter_by_item_type')}</span>
                    <Dropdown
                        placeholder={t('global.show_all')}
                        options={filterOpts}
                        value={resourceFilter}
                        selection
                        multiple
                        clearable
                        onChange={(e, { value }) => setResourceFilter(value as string[] || []) }
                        />
                </div>)
            }
            {enabled && (
                <SearchableTable
                    config={tableConfig}
                    data={stats}
                    filterRow={filterRows}
                    renderTableRow={renderTableRow}
                    />
            )}
        </div>
    )

    function renderTableRow(row: ResourceData, index?: number, isActive?: boolean) {
        return (
            <Table.Row>
                <Table.Cell>
                    {row.timestamp.toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {t(`global.item_types.${transKeys[row.resource]}`)}
                </Table.Cell>
                <Table.Cell>
                    {printValue(row)}
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.moving_average).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.difference).toLocaleString()}
                </Table.Cell>
            </Table.Row>
        )
    }

    function filterRows(row: ResourceData, filter: Filter[], filterType?: string) {
        return omniSearchFilter(row, filter, filterType, [
            {
                field: 'resource',
                customMatch: (fieldValue: string, text) => {
                    return fieldValue.toLowerCase().includes(text.toLowerCase());
                }
            },
            {
                field: 'timestamp',
                customMatch: (fieldValue: Date, text) => {
                    if (typeof fieldValue === 'string') fieldValue = new Date(fieldValue);
                    let str = fieldValue.toLocaleString();
                    if (str.includes(text)) return true;
                    str = fieldValue.toString();
                    if (str.toLowerCase().includes(text.toLowerCase())) return true;
                    return false;
                }
            }
        ]);
    }

    function askClearLog() {
        confirm({
            title: t('resource_tracker.clear'),
            message: t('resource_tracker.confirm'),
            negative: t('global.no'),
            affirmative: t('global.yes'),
            onClose: (result) => {
                if (result) {
                    clearLog();
                }
            }
        });
    }

    function compileStats() {
        const stats = entries.map((entry) => {
            entry.timestamp = new Date(entry.timestamp);
            return Object.keys(entry.energy).map(key => {
                const obj = {
                    timestamp: entry.timestamp,
                    resource: key,
                    amount: entry.energy[key] ?? 0,
                } as ResourceData;
                obj.difference = 0;
                obj.moving_average = 0;
                return obj;
            });
        }).flat();
        stats.sort((a, b) => {
            let r = a.timestamp.getTime() - b.timestamp.getTime();
            if (r) return r;
            r = a.resource.localeCompare(b.resource);
            return r;
        });
        const c = stats.length;
        let avgs = {} as {[key:string]: number}
        let lastval = {} as {[key:string]: number}
        for (let i = 0; i < c; i++) {
            const stat = stats[i];
            avgs[stat.resource] ??= stats[i].amount;
            stat.moving_average = (avgs[stat.resource] + stats[i].amount) / 2;
            avgs[stat.resource] = stat.moving_average;
            if (lastval[stat.resource] !== undefined) {
                stat.difference = stat.amount - lastval[stat.resource];
            }
            lastval[stat.resource] = stat.amount;
        }
        return stats;
    }

    function printValue(row: ResourceData) {
        if (row.resource === 'ism') {
            return (
                printISM(row.amount)
            );
        }
        else if (row.resource === 'money') {
            return (
                printCredits(row.amount)
            );
        }
        else if (row.resource === 'premium_purchasable') {
            return (
                printDilithium(row.amount)
            );
        }
        else if (row.resource === 'honor') {
            return (
                printHonor(row.amount)
            );
        }
        else if (row.resource === 'premium_earnable') {
            return (
                printMerits(row.amount)
            );
        }
        else if (row.resource === 'shuttle_rental_tokens') {
            return (
                <>{(row.amount)}</>
            );
        }
        else if (row.resource === 'chrons') {
            return (
                printChrons(row.amount)
            );
        }
        else if (row.resource === 'quantum') {
            return (
                printQuantum(row.amount)
            );
        }else {
            return (
                <>{(row.amount)}</>
            );
        }
    }
}