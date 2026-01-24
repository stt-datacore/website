import React from "react";
import { isMobile } from "react-device-detect";
import { Button, Checkbox, Dropdown, Icon, Popup, Step, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { PromptContext } from "../../context/promptcontext";
import { Filter } from "../../model/game-elements";
import { downloadData } from "../../utils/crewutils";
import { simplejson2csv } from "../../utils/misc";
import { omniSearchFilter } from "../../utils/omnisearch";
import { useStateWithStorage } from "../../utils/storage";
import { DateRangePicker } from "../base/daterangepicker";
import { EnergyLogContext, EnergyLogEntry } from "../page/util";
import { printChrons, printCredits, printDilithium, printHonor, printISM, printMerits, printQuantum } from "../retrieval/context";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { ResourceGraphPicker } from "./graphpicker";
import { ResourceData, transKeys } from "./utils";

export const ResourceTracker = () => {
    const globalContext = React.useContext(GlobalContext);
    const promptContext = React.useContext(PromptContext);
    const { confirm } = promptContext;
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const trackerContext = React.useContext(EnergyLogContext);
    const dbid = playerData?.player.dbid ?? 0;
    const { enabled, setEnabled, log, clearLog, setLog, remoteEnabled, setRemoteEnabled, updateRemote, searchRemote } = trackerContext;

    const [startDate, setStartDate] = useStateWithStorage<Date | undefined>(`${dbid}/resource_tracker/start_date`, undefined);
    const [endDate, setEndDate] = useStateWithStorage<Date | undefined>(`${dbid}/resource_tracker/end_date`, undefined);

    const [resourceFilter, setResourceFilter] = useStateWithStorage<string[]>(`${dbid}/resource_tracker/filters`, []);
    const [compiledStats, setCompiledStats] = React.useState<ResourceData[]>([]);
    const [dailyFinal, setDailyFinal] = useStateWithStorage<boolean>(`${dbid}/resource_tracker/daily_final`, false);
    const [displayMode, setDisplayMode] = useStateWithStorage<string>(`${dbid}/resource_tracker/display_mode`, 'table');
    const uploadRef = React.useRef<HTMLInputElement>(null);

    const bodyArea: React.CSSProperties = {
        ...OptionsPanelFlexColumn,
        justifyContent: 'stretch',
        alignItems: 'stretch'
    }

    React.useEffect(() => {
        if (remoteEnabled && playerData && log && enabled) {
            const dbid = playerData.player.dbid;
            const playerLog = log[dbid] ?? [];
            if (playerLog.length) {
                searchRemote().then((results) => {
                    if (!results) return;
                    let plg = playerLog.filter(li => !li.remote && !results.some(res => (new Date(res.timestamp)).toISOString().slice(0, 16) === (new Date(li.timestamp)).toISOString().slice(0, 16)));
                    if (plg.length) {
                        updateRemote(plg).then(() => searchRemote());
                    }
                });
            }
            else {
                searchRemote();
            }
        }
    }, [remoteEnabled, playerData, enabled]);

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

        if (enabled) {
            let stats = compileStats();
            setCompiledStats(stats);
        }
        if (!enabled && remoteEnabled) {
            setRemoteEnabled(false);
        }
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
        if (!compiledStats?.length || remoteEnabled) return undefined;
        let d = new Date(compiledStats[0].timestamp);
        d.setDate(d.getDate() - 1);
        return d;
    }, [compiledStats]);

    const maxDate = React.useMemo(() => {
        if (!compiledStats?.length || remoteEnabled) return new Date();
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

    const pctstyle: React.CSSProperties = {
        color: 'lightblue',
        fontSize: '0.8em',
        fontStyle: 'italic'
    }

    return (
        <div style={bodyArea}>
            <div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
                <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start', gap: '1em'}}>
                    <Checkbox
                        checked={enabled}
                        onChange={(e, { checked }) => setEnabled(!!checked)}
                        label={t('resource_tracker.enable')}
                    />
                    {!!enabled && <Checkbox
                        checked={remoteEnabled}
                        onChange={(e, { checked }) => setRemoteEnabled(!!checked)}
                        label={t('resource_tracker.remote_tracking')}
                    />}
                </div>
                <div>
                    <Button onClick={askClearLog} disabled={!enabled || !entries.length}>
                        {t('resource_tracker.clear')}
                    </Button>
                    <Popup
                        openOnTriggerMouseEnter={true}
                        openOnTriggerClick={false}
                        openOnTriggerFocus={true}
                        trigger={(<Button icon='download' onClick={() => exportResourceLog()} />)}
                        content={(<div>{t('share_profile.export.export_csv')}</div>)}
                    />

                    <Popup
                        openOnTriggerMouseEnter={true}
                        openOnTriggerClick={false}
                        openOnTriggerFocus={true}
                        trigger={(<Button icon='upload' onClick={() => uploadRef?.current?.click()} />)}
                        content={(<div>{t('json.upload_file.title')}</div>)}
                    />

                    <Popup
                        openOnTriggerMouseEnter={true}
                        openOnTriggerClick={false}
                        openOnTriggerFocus={true}
                        trigger={(<Button icon='refresh' onClick={() => syncRemote()} />)}
                        content={(<div>{t('global.sync_remote')}</div>)}
                    />
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
                        <div style={{...OptionsPanelFlexRow, justifyContent: 'flex-start', alignItems: 'center'}}>
                            <DateRangePicker
                                minDate={minDate}
                                maxDate={maxDate}
                                startDate={startDate}
                                endDate={endDate}
                                setStartDate={setStartDate}
                                setEndDate={setEndDate}
                                />
                            {remoteEnabled && (
                                <div>
                                    <div style={{height: '1.5em'}}></div>
                                    <Button
                                        disabled={!startDate && !endDate}
                                        onClick={() => searchRemote(startDate, endDate)}
                                    >{t('global.search_remote')}</Button>
                                </div>
                            )}
                        </div>
                        <div>
                            {t('resource_tracker.start_date_hint')}
                        </div>
                    </div>
                </div>)
            }
            {enabled && (<>
             <Step.Group fluid>
                    <Step active={displayMode === 'table'} onClick={() => setDisplayMode('table')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('resource_tracker.sections.table')}</Step.Title>
                        <Step.Description>{t('resource_tracker.sections.table_description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'graph'} onClick={() => setDisplayMode('graph')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('resource_tracker.sections.graph')}</Step.Title>
                        <Step.Description>{t('resource_tracker.sections.graph_description')}</Step.Description>
                    </Step>
                </Step.Group>
            </>)}
            {enabled && displayMode === 'table' && (
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
            {enabled && displayMode === 'graph' &&
                <ResourceGraphPicker
                    dbid={dbid}
                    maxDays={getMaxDays()}
                    resources={stats} />
            }
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
                    {printValue(row)}<br /><span style={pctstyle}>{(100 * row.amount_pct).toFixed(1)}%</span>
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.moving_average).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.difference).toLocaleString()}<br /><span style={pctstyle}>{(100 * row.change_pct).toFixed(1)}%</span>
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.average_difference).toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {Math.round(row.total_difference).toLocaleString()}<br /><span style={pctstyle}>{(100 * row.total_change_pct).toFixed(1)}%</span>
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

    function getMaxDays() {
        if (!startDate && !endDate) return undefined;
        let sd = startDate;
        let ed = endDate;

        if (sd) sd = new Date(sd);
        if (ed) ed = new Date(ed);
        ed ??= new Date();
        if (!sd && ed) {
            sd = new Date(ed);
            sd.setDate(sd.getDate() - 14);
        }
        else if (!sd) {
            return undefined;
        }
        return Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24));
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
            if (!entry?.energy) return null;
            entry.timestamp = new Date(entry.timestamp);
            return Object.keys(entry.energy).map(key => {
                const obj: ResourceData = {
                    timestamp: entry.timestamp,
                    resource: key,
                    amount: entry.energy[key] ?? 0,
                    difference: 0,
                    average_difference: 0,
                    total_difference: 0,
                    moving_average: 0,
                    amount_pct: 0,
                    change_pct: 0,
                    total_change_pct: 0
                };
                return obj;
            });
        }).filter(f => f !== null).flat();
        stats.sort((a, b) => {
            let r = a.timestamp.getTime() - b.timestamp.getTime();
            if (r) return r;
            r = a.resource.localeCompare(b.resource);
            return r;
        });
        if (dailyFinal) {
            stats = stats.filter((stat1, idx) => stats.findLastIndex(stat2 => dateOf(stat1) === dateOf(stat2) && stat1.resource === stat2.resource) === idx);
        }
        let c = stats.length;
        let avgs = {} as {[key:string]: number};
        let firsts = {} as {[key:string]: number};
        let lastdiff = {} as {[key:string]: number}
        let lastval = {} as {[key:string]: number};
        let high = {} as {[key:string]: number};
        let low = {} as {[key:string]: number};
        for (let i = 0; i < c; i++) {
            const stat = stats[i];
            high[stat.resource] ??= stat.amount;
            low[stat.resource] ??= stat.amount;
            avgs[stat.resource] ??= stat.amount;
            firsts[stat.resource] ??= stat.amount;
            lastdiff[stat.resource] ??= firsts[stat.resource];

            if (high[stat.resource] < stat.amount) {
                high[stat.resource] = stat.amount;
            }

            if (low[stat.resource] > stat.amount) {
                low[stat.resource] = stat.amount;
            }
            stat.moving_average = (avgs[stat.resource] + stats[i].amount) / 2;
            avgs[stat.resource] = stat.moving_average;
            if (lastval[stat.resource] !== undefined) {
                stat.difference = stat.amount - lastval[stat.resource];
            }
            stat.total_difference = stat.amount - firsts[stat.resource];
            lastval[stat.resource] = stat.amount;
            lastdiff[stat.resource] = stat.average_difference;
        }

        let reslist = [...new Set(stats.map(stat => stat.resource))];
        for (let res of reslist) {
            let rstats = stats.filter(f => f.resource === res);
            c = rstats.length;
            for (let i = 0; i < c; i++) {
                const stat = rstats[i];
                let diffs = rstats.map(stat => stat.difference);
                stat.average_difference = diffs.slice(0, i + 1).reduce((p, n) => p + n, 0) / (i + 1);
                if (!high[stat.resource]) continue;
                stat.amount_pct = stat.amount / (low[stat.resource] || 1);
                if (!stat.amount || stat.amount === low[stat.resource] || i == 0) continue;
                stat.change_pct = stat.difference / stat.amount;
                stat.total_change_pct = stat.total_difference / stat.amount;
            }
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

    function exportResourceLog(clipboard?: boolean, all?: boolean) {
        let text = '';
        if (all) {
            text = JSON.stringify(log, null, 4);
        }
        else if (playerData) {
            let dbid = playerData.player.dbid;
            let newlog = { [dbid]: log[dbid] };
            text = JSON.stringify(newlog, null, 4);
        }
        else {
            return;
        }

        if (clipboard) {
            navigator.clipboard.writeText(text);
            return;
        }
        downloadData(`data:application/json;charset=utf-8,${encodeURIComponent(text)}`, 'resource_log.json');
    }

    function importResourceLog(files?: FileList) {
        if (files?.length === 1) {
            files[0].text().then((txt) => {
                let datain = JSON.parse(txt) as any;
                let inlog = [] as EnergyLogEntry[];
                if (Array.isArray(datain)) inlog = datain;
                else inlog = datain[dbid];
                inlog ??= [];
                if (dbid) {
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

    function syncRemote() {
        if (!playerData?.player) return;
        const dbid = playerData.player.dbid;
        const data = log[dbid]?.filter(f => !f.remote);
        if (!data?.length) {
            searchRemote(startDate, endDate);
            return;
        }
        updateRemote(data).then(() => searchRemote());
    }
}