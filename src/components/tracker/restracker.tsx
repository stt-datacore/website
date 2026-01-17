import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { EnergyLog, EnergyLogContext, EnergyLogEntry } from "../page/util";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { Button, Checkbox, Dropdown, Icon, Table } from "semantic-ui-react";
import { PromptContext } from "../../context/promptcontext";
import { useStateWithStorage } from "../../utils/storage";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { Filter } from "../../model/game-elements";
import { printChrons, printCredits, printDilithium, printHonor, printISM, printMerits, printQuantum } from "../retrieval/context";
import { omniSearchFilter } from "../../utils/omnisearch";
import { downloadData } from "../../utils/crewutils";
import { simplejson2csv } from "../../utils/misc";
import { DateRangePicker } from "../base/daterangepicker";

export type ResourceViewMode = 'resource' | 'update';

export interface ResourceData {
    resource: string,
    amount: number,
    moving_average: number,
    difference: number,
    timestamp: Date,
    average_difference: number,
    total_difference: number
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
    const dbid = playerData?.player.dbid ?? 0;
    const { enabled, setEnabled, log, clearLog, setLog } = trackerContext;

    const [startDate, setStartDate] = useStateWithStorage<Date | undefined>(`${dbid}/resource_tracker/start_date`, undefined);
    const [endDate, setEndDate] = useStateWithStorage<Date | undefined>(`${dbid}/resource_tracker/end_date`, undefined);

    const [resourceFilter, setResourceFilter] = useStateWithStorage<string[]>(`${dbid}/resource_tracker/filters`, []);
    const [compiledStats, setCompiledStats] = React.useState<ResourceData[]>([]);
    const [dailyFinal, setDailyFinal] = useStateWithStorage<boolean>(`${dbid}/resource_tracker/daily_final`, false);
    const uploadRef = React.useRef<HTMLInputElement>(null);

    const bodyArea: React.CSSProperties = {
        ...OptionsPanelFlexColumn,
        justifyContent: 'stretch',
        alignItems: 'stretch'
    }

    const entries = React.useMemo(() => {
        if (playerData) {
            const dbid = playerData.player.dbid;
            if (!enabled) return [].slice();
            log[dbid] ??= [];
            return log[dbid];
        }
        else {
            return [].slice();
        }
    }, [playerData, log, enabled]);

    React.useEffect(() => {
        let stats = compileStats();
        setCompiledStats(stats);
    }, [log, enabled, resourceFilter, dailyFinal]);

    const stats = React.useMemo(() => {
        return compiledStats.filter(row => {
            if (resourceFilter.length && !resourceFilter.includes(row.resource)) return false;
            if (startDate && row.timestamp.getTime() < (new Date(startDate)).getTime()) return false;
            if (endDate && row.timestamp.getTime() > (new Date(endDate)).getTime()) return false;
            return true;
        });
    }, [compiledStats, startDate, endDate]);

    const minDate = React.useMemo(() => {
        if (!compiledStats?.length) return undefined;
        let d = new Date(compiledStats[0].timestamp);
        d.setDate(d.getDate() - 1);
        return d;
    }, [compiledStats]);

    const maxDate = React.useMemo(() => {
        if (!compiledStats?.length) return undefined;
        let d = new Date(compiledStats[compiledStats.length - 1].timestamp);
        d.setDate(d.getDate() + 1);
        return d;
    }, [compiledStats]);

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
            title: t('resource_tracker.columns.timestamp'),
            reverse: true
        },
        {
            column: 'resource',
            width: 1,
            title: t('resource_tracker.columns.resource')
        },
        {
            column: 'amount',
            width: 1,
            title: t('ship.amount')
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
        },
        {
            column: 'average_difference',
            width: 1,
            title: t('resource_tracker.columns.average_difference')
        },
        {
            column: 'total_difference',
            width: 1,
            title: t('resource_tracker.columns.total_difference')
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
                    <Button icon='download' onClick={() => exportResourceLog()} ></Button>
                    <Button icon='upload' onClick={() => uploadRef?.current?.click()}></Button>
                </div>
            </div>
            {enabled && (
                <div style={{...OptionsPanelFlexRow, alignItems: 'center'}}>
                    <div style={{...OptionsPanelFlexColumn, margin: '1em 0', alignItems: 'flex-start', gap: '0.5em'}}>
                        <span>{t('hints.filter_by_item_type')}</span>
                        <div style={{...OptionsPanelFlexRow, margin: '0', justifyContent: 'center', gap: '1em'}}>
                            <Dropdown
                                placeholder={t('global.show_all')}
                                options={filterOpts}
                                value={resourceFilter}
                                selection
                                multiple
                                clearable
                                onChange={(e, { value }) => setResourceFilter(value as string[] || []) }
                                />

                            <Checkbox
                                checked={dailyFinal}
                                onChange={(e, { checked }) => setDailyFinal(!!checked)}
                                label={t('resource_tracker.daily_final')}
                            />
                        </div>
                        <div style={{...OptionsPanelFlexRow, justifyContent: 'flex-start'}}>
                            <DateRangePicker
                                minDate={minDate}
                                maxDate={maxDate}
                                startDate={startDate}
                                endDate={endDate}
                                setStartDate={setStartDate}
                                setEndDate={setEndDate}
                                />
                        </div>
                    </div>
                </div>)
            }
            {enabled && (
                <SearchableTable
                    config={tableConfig}
                    data={stats}
                    filterRow={filterRows}
                    renderTableRow={renderTableRow}
                    extraSearchContent={<>
                        <Button onClick={() => exportCSV()}>
                            <Icon name='download' />
                            {t('share_profile.export.export_csv')}
                        </Button>
                    </>}
                    />
            )}
            <input
                type="file"
                accept="text/json,application/json"
                ref={uploadRef}
                style={{display: 'none'}}
                onChange={(e) => importResourceLog(e.target.files || undefined)}
                name="files"
                id="upload_resource_log_file_input"
                />

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
                <Table.Cell>
                    {Math.round(row.average_difference).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.total_difference).toLocaleString()}
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
        let stats = entries.map((entry) => {
            entry.timestamp = new Date(entry.timestamp);
            return Object.keys(entry.energy).map(key => {
                const obj = {
                    timestamp: entry.timestamp,
                    resource: key,
                    amount: entry.energy[key] ?? 0,
                } as ResourceData;
                obj.difference = 0;
                obj.average_difference = 0;
                obj.total_difference = 0;
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
        if (dailyFinal) {
            stats = stats.filter((stat1, idx) => stats.findLastIndex(stat2 => dateOf(stat1) === dateOf(stat2) && stat1.resource === stat2.resource) === idx);
        }
        const c = stats.length;
        let avgs = {} as {[key:string]: number};
        let firsts = {} as {[key:string]: number};
        let lastdiff = {} as {[key:string]: number}
        let lastval = {} as {[key:string]: number}
        for (let i = 0; i < c; i++) {
            const stat = stats[i];
            avgs[stat.resource] ??= stats[i].amount;
            firsts[stat.resource] ??= stats[i].amount;
            lastdiff[stat.resource] ??= firsts[stat.resource];
            stat.moving_average = (avgs[stat.resource] + stats[i].amount) / 2;
            avgs[stat.resource] = stat.moving_average;
            if (lastval[stat.resource] !== undefined) {
                stat.difference = stat.amount - lastval[stat.resource];
            }
            stat.total_difference = stat.amount - firsts[stat.resource];
            lastval[stat.resource] = stat.amount;
            lastdiff[stat.resource] = stat.average_difference;
        }
        let diffs = stats.map(stat => stat.difference);
        for (let i = 0; i < c; i++) {
            stats[i].average_difference = diffs.slice(0, i + 1).reduce((p, n) => p + n, 0) / (i + 1);
        }
        return stats;
    }
    function dateOf(stat: ResourceData) {
        let str = typeof stat.timestamp === 'string' ? stat.timestamp : ((new Date(stat.timestamp)).toLocaleDateString());
        return str;
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
        } else {
            return (
                <>{(row.amount)}</>
            );
        }
    }

    function exportCSV(clipboard?: boolean) {
        const stats = compiledStats;
        if (!stats?.length) return;
        let text = simplejson2csv(stats, Object.keys(stats[0]).map((key) => ({
            label: key === 'amount' ? t('ship.amount') : t(`resource_tracker.columns.${key}`),
            value: (row) => key === 'resource' ? t(`global.item_types.${transKeys[row[key]]}`) : row[key]
        })));
         if (clipboard) {
            navigator.clipboard.writeText(text);
            return;
        }
        downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'resource_log.csv');
    }

    function exportResourceLog(clipboard?: boolean) {
        let text = JSON.stringify(log, null, 4);
        if (clipboard) {
            navigator.clipboard.writeText(text);
            return;
        }
        downloadData(`data:application/json;charset=utf-8,${encodeURIComponent(text)}`, 'resource_log.json');
    }

    function importResourceLog(files?: FileList) {
        if (files?.length === 1) {
            files[0].text().then((txt) => {
                let inlog = JSON.parse(txt) as EnergyLogEntry[];
                if (dbid) {
                    inlog ??= [].slice();
                    log[dbid] ??= [].slice();
                    let newlog = inlog.concat(log[dbid]);
                    newlog = newlog.filter((obj, i) => newlog.findIndex(obj2 => obj.timestamp.getTime() == obj2.timestamp.getTime()) === i);
                    newlog.sort((a, b) => {
                        let r = a.timestamp.getTime() - b.timestamp.getTime();
                        return r;
                    });
                    log[dbid] = newlog;
                    setLog({...log});
                }
            });
        }
    }

}