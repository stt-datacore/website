import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { Button, Checkbox, Dropdown, DropdownItemProps, Icon, Input, Pagination, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { MutualMultiWorkerContext, MutualPolestarMultiWorkerStatus, MutualPolestarResults } from "./mutualmultiworker";
import { IConstellation, IKeystone, IPolestar } from "./model";
import { IMutualPolestarWorkerItem } from "../../model/worker";
import { formatRunTime } from "../../utils/misc";
import { compareShipResults } from "../../utils/shiputils";
import { PlayerCrew } from "../../model/player";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { getIconPath } from "../../utils/assets";


interface MutualViewConfig {
    max_workers: number;
    max_iterations?: number;
    combo_size: 1 | 2 | 3 | 4;
    verbose: boolean;
}


interface MutualViewConfigPanelProps {
    config: MutualViewConfig;
    setConfig: (value: MutualViewConfig) => void;
    calculateBegin: () => void;
}

const MutualViewConfigPanel = (props: MutualViewConfigPanelProps) => {
    const workerContext = React.useContext(MutualMultiWorkerContext);
    const { running } = workerContext;

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const { config, setConfig, calculateBegin } = props;

    const comboSizes = [] as DropdownItemProps[];

    [1, 2, 3, 4].forEach((num) => {
        comboSizes.push({
            key: `comboSize_${num}`,
            value: num,
            text: `${num}`
        })
    })

    const worker_sel = [] as DropdownItemProps[];
    let work_total = navigator?.hardwareConcurrency ?? 1;
    for (let i = 1; i <= work_total; i++) {
        let bgcolor = '';
        let fgcolor = '';
        if (i <= work_total / 2) {
            bgcolor = 'darkgreen';
            fgcolor = 'white';
        }
        else if (i <= (work_total * 0.75)) {
            bgcolor = 'goldenrod';
            fgcolor = 'black';
        }
        else {
            bgcolor = 'tomato';
            fgcolor = 'white';
        }

        worker_sel.push({
            key: `workers_${i}`,
            value: i,
            text: `${i}`,
            content: <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'stretch',
                margin: 0,
                padding: '0.5em 1em',
                backgroundColor: bgcolor,
                color: fgcolor
            }}>
                {i}
            </div>
        })
    }

    const optionStyle = {
        display: 'flex',
        gap: '0.5em',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
    } as React.CSSProperties;

    return <div className="ui segment">
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2em',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            justifyContent: 'center'
        }}>
            <div style={optionStyle}>
                <span>{t('retrieval.combo_length')}</span>
                <Dropdown
                    disabled={running}
                    options={comboSizes}
                    value={config.combo_size}
                    onChange={(e, { value }) => setConfig({ ...config, combo_size: value as 1 | 2 | 3 | 4 })}
                />
            </div>
            <div style={optionStyle}>
                <span>{t('retrieval.max_workers')}</span>
                <Dropdown
                    disabled={running}
                    options={worker_sel}
                    value={config.max_workers}
                    onChange={(e, { value }) => setConfig({ ...config, max_workers: value as number })}
                />
            </div>
            <div style={optionStyle}>
                <span>{t('retrieval.max_iterations')}</span>
                <div style={{display:'flex', flexDirection: 'row', justifyContent:'flex-start', alignItems: 'center', gap: '0.5em', marginBottom: '1em'}}>
                    <Input
                        disabled={running}
                        style={{backgroundColor: config.max_iterations ? (Number.isNaN(Number(config.max_iterations)) ? 'tomato' : undefined) : undefined}}
                        value={config.max_iterations ? (Number.isNaN(Number(config.max_iterations)) ? '' : config.max_iterations.toString()) : ''}
                        onChange={(e, { value }) => setConfig({ ...config, max_iterations: value ? Number(value) : undefined })}
                    />
                    <Icon style={{margin:0,cursor:'pointer'}} name='close' onClick={() => setConfig({ ...config, max_iterations: undefined })} />
                </div>
            </div>
        </div>
        <div style={{...optionStyle, justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
            <Checkbox label={t('retrieval.verbose_status_updates')}
                disabled={running}
                checked={config.verbose}
                onChange={(e, { checked }) => setConfig({ ...config, verbose: checked as boolean || false})}
            />
            <Button
                onClick={() => calculateBegin()}>
                {running ? t('global.cancel') : t('global.calculate')}
            </Button>
        </div>
    </div>
}

type MutualViewProps = {
    dbid: string;
    allKeystones: IKeystone[];
}

export const MutualView = (props: MutualViewProps) => {

    const { dbid, allKeystones } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;
    const workerContext = React.useContext(MutualMultiWorkerContext);
    const { cancel, running, runWorker } = workerContext;

    const DefaultConfig = {
        verbose: false,
        combo_size: 2,
        max_workers: navigator?.hardwareConcurrency ? navigator?.hardwareConcurrency / 2 : 2,
        max_iterations: undefined
    } as MutualViewConfig;

    const [config, setConfig] = useStateWithStorage(`${dbid}/mutualView_config`, DefaultConfig, { rememberForever: true });
    const [progressMsg, setProgressMsg] = React.useState('');
    const [results, setResults] = React.useState([] as IMutualPolestarWorkerItem[]);
    const [activeSuggestion, setActiveSuggestion] = React.useState<IMutualPolestarWorkerItem | undefined>(undefined);
    const [suggestions, setSuggestions] = React.useState<IMutualPolestarWorkerItem[]>([]);
    const [sugWait, setSugWait] = React.useState<number | undefined>();
    const [suggestion, setSuggestion] = React.useState<number | undefined>();
    const [resultCache, setResultCache] = React.useState([] as IMutualPolestarWorkerItem[]);
    // Count owned constellations
    const polestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
    const constellations = allKeystones.filter(k => k.type !== 'keystone') as IConstellation[];
    constellations.forEach(constellation => {
        if (playerData) {
            const itemsOwned = playerData.forte_root.items.find(item => item.id === constellation.id);
            constellation.owned = itemsOwned ? itemsOwned.quantity : 0;
        }
        else {
            constellation.owned = 0;
        }
    });
    polestars.forEach(polestar => {
        if (playerData) {
            const itemsOwned = playerData.forte_root.items.find(item => item.id === polestar.id);
            polestar.owned = itemsOwned ? itemsOwned.quantity : 0;
        }
        else {
            polestar.owned = 0;
        }
        const crates = constellations.filter(k => (k.type === 'crew_keystone_crate' || k.type === 'keystone_crate') && k.keystones.includes(polestar.id));
        const owned = crates.filter(k => k.owned > 0);
        polestar.owned_crate_count = owned.reduce((prev, curr) => prev + curr.owned, 0);
        polestar.owned_best_odds = owned.length === 0 ? 0 : 1/owned.reduce((prev, curr) => Math.min(prev, curr.keystones.length), 100);
        polestar.owned_total_odds = owned.length === 0 ? 0 : 1-owned.reduce((prev, curr) => prev*(((curr.keystones.length-1)/curr.keystones.length)**curr.owned), 1);
    });

    React.useEffect(() => {
        if (!activeSuggestion) return;
    }, [activeSuggestion]);

    React.useEffect(() => {
        if (suggestions?.length && (!activeSuggestion || sugWait !== undefined)) {
            setSuggestion(sugWait ?? 0);
            setSugWait(undefined);
        }
    }, [sugWait, suggestions]);

    return <React.Fragment>
        <MutualViewConfigPanel calculateBegin={calculateBegin} config={config} setConfig={setConfig} />
        {true && <div style={{ display: 'flex', textAlign: 'center', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '1em', marginBottom: '1em' }}>
            {progressMsg ? (running ? globalContext.core.spin(progressMsg || t('spinners.default')) : progressMsg) : t('global.idle')}
        </div>}
        {!running && !!suggestions?.length && <div style={{textAlign: 'center'}}>
            <MutualTable polestars={polestars} items={suggestions} />

        </div>}
        <CrewHoverStat targetGroup="mutual_crew_hover" />
        <ItemHoverStat targetGroup="mutual_crew_item" />
    </React.Fragment>

    function calculateBegin() {
        if (running) {
            cancel();
            return;
        }
        setProgressMsg('');
        setActiveSuggestion(undefined);
        setSuggestions([]);
        setSugWait(undefined);
        runWorker({
            max_workers: config.max_workers,
            config: {
                max_iterations: config.max_iterations ? BigInt(config.max_iterations) : undefined,
                polestars,
                comboSize: config.combo_size,
                verbose: config.verbose
            },
            callback: calculateCallback
        })
    }

    function calculateCallback(result: MutualPolestarMultiWorkerStatus) {
        if (!result.data.inProgress) {
            setProgressMsg(t('ship.calc.calc_summary', {
                message: t('global.completed'),
                count: `${result.data.result.total_iterations?.toLocaleString()}`,
                time: formatRunTime(Math.round(result.data.result.run_time ?? 0), t),
                accepted: `${result.data.result.items?.length.toLocaleString()}`
            }));

            if (result.data.result.items?.length === 1 && suggestions?.length && suggestions.length > 1) {
                let r = result.data.result.items[0];
                let sug = suggestions.findIndex(f => f.crew.every((cr1, idx) => r.crew.findIndex(cr2 => cr2 === cr1) === idx))
                if (sug !== -1) {
                    suggestions[sug] = r;
                    setSugWait(sug);
                    setSuggestions([...suggestions]);
                    return;
                }
            }
            setSugWait(0);
            setSuggestions(result.data.result.items ?? []);
        }
        else if (result.data.inProgress && result.data.result.format) {
            setProgressMsg(t(result.data.result.format, result.data.result.options));
        }
        else if (result.data.inProgress && result.data.result.count) {
            setProgressMsg(
                t(config.verbose ? 'ship.calc.calculating_pct_ellipses_verbose' : 'ship.calc.calculating_pct_ellipses',
                    {
                        percent: `${result.data.result.percent?.toLocaleString()}`,
                        count: `${result.data.result.count?.toLocaleString()}`,
                        progress: `${result.data.result.progress?.toLocaleString()}`,
                        accepted: `${result.data.result.accepted?.toLocaleString()}`
                    }
                )
            )
        }
        else if (result.data.inProgress && result.data.result.result) {
            resultCache.push(result.data.result.result);
            let new_cache = resultCache.concat().sort((a, b) => b.crew.length - a.crew.length || a.combo.length - b.combo.length);
            setSuggestion(undefined);
            setTimeout(() => {
                setResultCache(new_cache);
                setSuggestions(new_cache);
                setSugWait(0);
            });
        }
    }

    function clearAll() {
        setSuggestions([]);
        setSuggestion(undefined);
        setActiveSuggestion(undefined);
        setSugWait(undefined);
        setResultCache([].concat());
        setProgressMsg('');
        //setCrewStations(crewStations.map(c => undefined));
    }
}

interface MutualTableProps {
    items: IMutualPolestarWorkerItem[]
    polestars: IPolestar[];
}

type DisplayItem = {
    crew: PlayerCrew[];
    combo: IPolestar[];
}

const MutualTable = (props: MutualTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;

    const { items, polestars } = props;

    const { playerData } = globalContext.player;

    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);
    const [workItems, setWorkItems] = React.useState([] as DisplayItem[]);
    const pageStartIdx = (activePage - 1) * itemsPerPage;

    React.useEffect(() => {
        if (!playerData) return;

        let crew = items.map((item) => item.crew.map(symbol => playerData.player.character.crew.find(f => f.symbol === symbol))).flat().filter(f => f !== undefined);
        let downfiltered = crew.filter((c, idx) => crew.findIndex(cf => c.symbol === cf.symbol && c.highest_owned_rarity === cf.rarity) === idx);

        const workItems = items.map((item) => {
            return {
                crew: downfiltered.filter(f => item.crew.includes(f.symbol)),
                combo: polestars.filter(f => item.combo.some(cb => `${cb}_keystone` === f.symbol))
            } as DisplayItem
        })

        setWorkItems(workItems);
    }, [playerData, items, polestars])

    React.useEffect(() => {
        const totalPages = Math.ceil(workItems.length / itemsPerPage);
        setTotalPages(totalPages);
    }, [workItems])

    if (!playerData) return <></>

    const pageSizes = [1, 5, 10, 20, 50, 100].map(size => {
        return {
            key: `pageSize_${size}`,
            value: size,
            text: `${size}`
        } as DropdownItemProps;
    });

    const currentPage = workItems.slice(pageStartIdx, pageStartIdx + itemsPerPage);

    return <Table striped>
        <Table.Header>
            <Table.Row>
                <Table.HeaderCell>
                    {t('retrieval.combos')}
                </Table.HeaderCell>
                <Table.HeaderCell>
                    {t('base.crew')}
                </Table.HeaderCell>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {currentPage.map((item) => renderTableRow(item))}
        </Table.Body>
        <Table.Footer>
            <Table.Row>
                <Table.HeaderCell colspan={4}>
                    <Pagination
                        totalPages={totalPages}
                        activePage={activePage}
                        onPageChange={(e, data) => setActivePage(data.activePage as number)}
                    />

                    <span style={{ paddingLeft: '2em' }}>
                        {t('global.rows_per_page')}:{' '}
                        <Dropdown
                            options={pageSizes}
                            value={itemsPerPage}
                            inline
                            onChange={(e, { value }) => setItemsPerPage(value as number)}
                        />
                    </span>
                </Table.HeaderCell>
            </Table.Row>
        </Table.Footer>
    </Table>

    function renderTableRow(item: DisplayItem) {
        return <Table.Row>
            <Table.Cell>
                <div style={{display:'flex', flexWrap:'wrap', flexDirection:'row', justifyContent: 'space-evenly', alignItems: 'flex-start'}}>
                    {item.combo.map((polestar) => {
                        return <div style={{ width: '5em', display:'flex', flexWrap:'wrap', flexDirection:'column', justifyContent: 'center', alignItems: 'center', gap: '0.5em'}}>
                            <img src={getIconPath(polestar.icon)} style={{height: '48px'}} />
                            {TRAIT_NAMES[polestar.symbol.replace("_keystone", "")]}
                            </div>
                    })}
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{display:'flex', flexWrap:'wrap', flexDirection:'row', justifyContent: 'space-evenly', alignItems: 'flex-start'}}>
                    {item.crew.map((crew) => {
                        return <AvatarView
                                    mode='crew'
                                    item={crew}
                                    size={64}
                                    targetGroup="mutual_crew_hover"
                                    />
                    })}
                </div>
            </Table.Cell>
        </Table.Row>

    }

}