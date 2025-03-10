import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { Button, Checkbox, Dropdown, DropdownItemProps, Icon, Input, Pagination, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { ICrewFilters, IPolestar, IPolestarTailors } from "./model";
import { IMutualPolestarWorkerItem, PolestarComboSize } from "../../model/worker";
import { formatRunTime } from "../../utils/misc";
import { CompletionState, PlayerCrew } from "../../model/player";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { getIconPath } from "../../utils/assets";
import { EquipmentItem } from "../../model/equipment";
import { CrewDropDown } from "../base/crewdropdown";
import { CrewMember } from "../../model/crew";
import CONFIG from "../CONFIG";
import { PolestarDropdown } from "./polestardropdown";
import { PolestarMultiWorkerStatus, PolestarMultiWorker } from "./polestarmultiworker";
import { MultiWorkerContext } from "../base/multiworkerbase";
import { printCredits, printISM, printQuantum, RetrievalContext } from "./context";
import { RarityFilter } from "../crewtables/commonoptions";
import { calculateRetrievalCost, RetrievalCost } from "../../utils/retrieval";

const polestarTailorDefaults: IPolestarTailors = {
	disabled: [],
	added: []
};

const crewFilterDefaults: ICrewFilters = {
	retrievable: 'retrievable',
	owned: '',
	hideFullyFused: true,
	rarity: [],
	trait: [],
	minTraitMatches: 1,
	collection: ''
};

const optionStyle = {
    display: 'flex',
    gap: '0.5em',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start'
} as React.CSSProperties;

function comboToPolestars(combo: string[]) {
    const symbols = [] as string[];
    combo.forEach((item) => {
        if (item.includes("_skill")) symbols.push(`${item}_keystone`);
        else if (!Number.isNaN(Number(item))) symbols.push(`rarity_${item}_keystone`);
        else symbols.push(`${item}_keystone`);
    })
    return symbols;
}

interface MutualViewConfig {
    calc_previews?: boolean;
    max_workers: number;
    max_iterations?: number;
    combo_size: PolestarComboSize | '1_batch' | '2_batch' | '3_batch' | '4_batch';
    verbose: boolean;
    allowUnowned?: number;
    no100?: boolean;
    alwaysShowPrice?: boolean;
}

type MutualViewProps = {
    dbid: string;
}

export const MutualView = (props: MutualViewProps) => {
    const retrievalContext = React.useContext(RetrievalContext);
    const { allKeystones, polestarTailors } = retrievalContext;
    const { dbid } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;

    const DefaultConfig = {
        considerUnowned: false,
        verbose: false,
        combo_size: 2,
        max_workers: navigator?.hardwareConcurrency ? navigator?.hardwareConcurrency / 2 : 2,
        max_iterations: undefined
    } as MutualViewConfig;

    const [config, setConfig] = useStateWithStorage(`${dbid}/mutualView_config`, DefaultConfig, { rememberForever: true });
    const [results, setResults] = React.useState<IMutualPolestarWorkerItem[]>([]);
    const [polestars, setPolestars] = React.useState([] as IPolestar[]);
    const [lastDbid, setLastDbid] = React.useState(undefined as string | undefined);

    React.useEffect(() => {
        const disabledPolestars = polestarTailors.disabled;
        const addedPolestars = polestarTailors.added;

        const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];

        const polestars = allPolestars.filter(polestar =>
            (polestar.owned > 0 && !disabledPolestars.includes(polestar.id)) || addedPolestars.includes(polestar.symbol)
        );

        const isSkill = (a: IPolestar) => {
            return a.symbol.endsWith("_skill_keystone");
        }

        const isRarity = (a: IPolestar) => {
            return a.symbol.startsWith("rarity_");
        }

        polestars.sort((a, b) => {
            let asy = isSkill(a);
            let bsy = isSkill(b);
            let ary = isRarity(a);
            let bry = isRarity(b);
            if (ary !== bry) {
                return ary ? -1 : 1;
            }
            else if (ary && bry) {
                let ra = Number(a.symbol.replace('rarity_', '').replace("_keystone", ""))
                let rb = Number(b.symbol.replace('rarity_', '').replace("_keystone", ""))
                return ra - rb;
            }
            if (asy !== bsy) {
                return asy ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        setPolestars(polestars);

        if (lastDbid && dbid !== lastDbid) {
            setResults([].concat());
        }
        setLastDbid(dbid);
    }, [dbid, allKeystones, polestarTailors]);

    return <React.Fragment>
        {playerData && <PolestarMultiWorker playerData={playerData}>
                <MutualWorkerPanel polestars={polestars} results={results} setResults={setResults} config={config} setConfig={setConfig} />
        </PolestarMultiWorker>}
        {!!results?.length && <div style={{textAlign: 'center'}}>
            <MutualTable alwaysShowPrice={config.alwaysShowPrice} polestars={polestars} items={results} />
        </div>}
        <CrewHoverStat targetGroup="mutual_crew_hover" />
        <ItemHoverStat targetGroup="mutual_crew_item" />
    </React.Fragment>
}

type DisplayItem = {
    crew: PlayerCrew[];
    combo: IPolestar[];
    cost: RetrievalCost
}

interface MutualWorkerPanelProps {
    config: MutualViewConfig;
    setConfig: (value: MutualViewConfig) => void;
    results: IMutualPolestarWorkerItem[];
    setResults: (value: IMutualPolestarWorkerItem[]) => void;
    polestars: IPolestar[];
}

const MutualWorkerPanel = (props: MutualWorkerPanelProps) => {
    const workerContext = React.useContext(MultiWorkerContext);
    const { cancel, running, runWorker } = workerContext;

    const globalContext = React.useContext(GlobalContext);
    const retrievalContext = React.useContext(RetrievalContext);
    const { market } = retrievalContext;
    const { t } = globalContext.localized;

    const { polestars, config, setConfig, results, setResults } = props;
    const [progressMsg, setProgressMsg] = React.useState('');

    const comboSizes = [] as DropdownItemProps[];

    [1, 2, 3, 4].forEach((num) => {
        comboSizes.push({
            key: `comboSize_${num}`,
            value: num,
            text: `${num}`
        })
    });

    const allowUnowned = [] as DropdownItemProps[];

    [0, 1, 2, 3].forEach((num) => {
        allowUnowned.push({
            key: `allowUnowned_${num}`,
            value: num,
            text: `${num}`
        })
    });

    // [2, 3, 4].forEach((num) => {
    //     comboSizes.push({
    //         key: `comboSize_${num}_batch`,
    //         value: `${num}_batch`,
    //         text: t('retrieval.up_to_n', { n: `${num}`})
    //     })
    // });

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

    return <div className="ui segment">
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2em',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            justifyContent: 'center'
        }}>
            <div style={{ margin: '1em', display: 'flex', textAlign: 'center', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '1em', marginBottom: '1em' }}>
                <span>{running && <Icon loading name='spinner' /> } {progressMsg || t('global.idle')}</span>
            </div>
            <div style={optionStyle}>
                <span>{t('retrieval.combo_length')}</span>
                <Dropdown
                    disabled={running}
                    options={comboSizes}
                    value={config.combo_size}
                    onChange={(e, { value }) => setConfig({ ...config, combo_size: value as PolestarComboSize })}
                />
            </div>
            <div style={optionStyle}>
                <span>{t('retrieval.allow_unowned')}</span>
                <Dropdown
                    disabled={running}
                    options={allowUnowned}
                    value={config.allowUnowned || 0}
                    onChange={(e, { value }) => setConfig({ ...config, allowUnowned: value as number | undefined })}
                />
            </div>
            <div style={optionStyle}>
                <span>{t('retrieval.max_workers')}</span>
                <Dropdown
                    scrolling
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
            <div style={{...optionStyle, flexDirection: 'column', margin: '0.5em', gap: '1em'}}>
                <Checkbox label={t('retrieval.verbose_status_updates')}
                    disabled={running}
                    checked={config.verbose}
                    onChange={(e, { checked }) => setConfig({ ...config, verbose: checked as boolean || false})}
                />
                <Checkbox label={t('base.live_results')}
                    disabled={running}
                    checked={config.calc_previews}
                    onChange={(e, { checked }) => setConfig({ ...config, calc_previews: checked as boolean || false})}
                />
                <Checkbox label={t('base.less_than_100_retrieval')}
                    disabled={running}
                    checked={config.no100}
                    onChange={(e, { checked }) => setConfig({ ...config, no100: checked as boolean || false})}
                />
                {!!market && <Checkbox label={t('retrieval.price.all')}
                    disabled={running}
                    checked={config.alwaysShowPrice}
                    onChange={(e, { checked }) => setConfig({ ...config, alwaysShowPrice: checked as boolean || false})}
                />}
            </div>
            <div style={{...optionStyle, flexDirection: 'row', margin: '0.5em'}}>
                <Button
                    onClick={() => clickCalculate()}>
                    {running ? t('global.cancel') : t('global.calculate')}
                </Button>
                <Button
                    disabled={running}
                    onClick={() => clickClear()}>
                    {t('global.clear')}
                </Button>
            </div>
        </div>
    </div>

    function clickClear() {
        if (running) {
            cancel();
        }
        clearAll();
    }

    function clickCalculate() {
        if (running) {
            setResults([...results]);
            cancel();
            return;
        }
        setProgressMsg('');
        //setSuggestions([].concat());

        let comboSize: PolestarComboSize = 1;
        //let batch = false;

        if (typeof config.combo_size === 'number') {
            comboSize = config.combo_size;
        }
        // else {
        //     comboSize = Number(config.combo_size.replace("_batch", '')) as PolestarComboSize;
        //     batch = true;
        // }

        runWorker({
            max_workers: config.max_workers,
            config: {
                max_iterations: config.max_iterations ? BigInt(config.max_iterations) : undefined,
                polestars,
                comboSize,
                verbose: config.verbose,
                allowUnowned: config.allowUnowned || 0,
                no100: !!config.no100
            },
            callback: calculateCallback
        })
    }

    function calculateCallback(result: PolestarMultiWorkerStatus) {
        if (!result) return;

        if (!result.data.inProgress) {
            setProgressMsg(t('ship.calc.calc_summary', {
                message: t('global.completed'),
                count: `${result.data.result.total_iterations?.toLocaleString()}`,
                time: formatRunTime(Math.round(result.data.result.run_time ?? 0), t),
                accepted: `${result.data.result.items?.length.toLocaleString()}`
            }));

            if (result.data.result.items?.length === 1 && results?.length && results.length > 1) {
                let r = result.data.result.items[0];
                let sug = results.findIndex(f => f.crew.every((cr1, idx) => r.crew.findIndex(cr2 => cr2 === cr1) === idx))
                if (sug !== -1) {
                    results[sug] = r;
                    setResults([...results]);
                    return;
                }
            }
            let new_cache = (result.data.result.items ?? []).concat(results);
            new_cache = new_cache.filter((f, idx) => new_cache.findIndex(f2 => itemsEqual(f, f2)) === idx);
            setResults(new_cache);
        }
        else if (result.data.inProgress && result.data.result.count) {
            setProgressMsg(
                t(config.verbose ? 'ship.calc.calculating_pct_ellipses_verbose' : 'ship.calc.calculating_pct_ellipses',
                    {
                        percent: `${result.data.result.percent?.toLocaleString() || ''}`,
                        count: `${result.data.result.count?.toLocaleString() || ''}`,
                        progress: `${result.data.result.progress?.toLocaleString() || ''}`,
                        accepted: `${results.length.toLocaleString() || ''}`
                    }
                )
            )
        }
        else if (result.data.inProgress && result.data.result.result) {
            results.push(result.data.result.result);
            if (config.calc_previews) {
                setResults([...results]);
            }
        }
    }

    function itemsEqual(a: IMutualPolestarWorkerItem, b: IMutualPolestarWorkerItem) {
        a.combo.sort();
        a.crew.sort();
        b.combo.sort();
        b.crew.sort();
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function clearAll() {
        setResults([].concat());
        setProgressMsg('');
    }

}

interface MutualTableProps {
    items: IMutualPolestarWorkerItem[]
    polestars: IPolestar[];
    alwaysShowPrice?: boolean;
}

const MutualTable = (props: MutualTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const retrievalContext = React.useContext(RetrievalContext);
    const { market, polestarTailors } = retrievalContext;
    const { t, TRAIT_NAMES } = globalContext.localized;

    const { items, polestars, alwaysShowPrice } = props;

    const { playerData } = globalContext.player;
    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);
    const [workItems, setWorkItems] = React.useState([] as DisplayItem[]);
    const [rarities, setRarities] = React.useState([] as number[]);
    const [allowedPolestars, setAllowedPolestars] = React.useState([] as IPolestar[]);
    const [polestarFilter, setPolestarFilter] = React.useState(undefined as string[] | undefined)
    const pageStartIdx = (activePage - 1) * itemsPerPage;

    const [crewPool, setCrewPool] = React.useState([] as (CrewMember | PlayerCrew)[]);
    const [selCrew, setSelCrew] = React.useState(undefined as undefined | number[]);

    const [sortOrder, setSortOrder] = useStateWithStorage('mutualView_sortOrder', 'descending' as 'ascending' | 'descending');
    const [sortBy, setSortBy] = useStateWithStorage('mutualView_sortBy', 'polestars' as 'crew' | 'polestars' | 'build_cost');

    React.useEffect(() => {
        if (!playerData) return;
        const mul = sortOrder === 'ascending' ? 1 : -1;
        let nid = -1 * (globalContext.core.crew.length * 4);
        let crew = items.map((item) =>
                item.crew.map(symbol => playerData.player.character.crew.find(f => f.symbol === symbol && f.rarity === f.highest_owned_rarity)
                || globalContext.core.crew.find(gfc => gfc.symbol === symbol)))
                .flat().filter(f => f !== undefined)
                .map((m) => {
                    let n = m as PlayerCrew;
                    n.rarity ??= 0;
                    n.level ??= 0;
                    n.highest_owned_rarity ??= 0;
                    n.id ??= nid--;
                    n.immortal ??= CompletionState.DisplayAsImmortalUnowned;
                    return n;
                });

        let downfiltered = crew.filter((c, idx) => crew.findIndex(cf => c.symbol === cf.symbol && (c.highest_owned_rarity ?? c.rarity ?? 0) === (cf.rarity ?? 0)) === idx);
        const workItems = items.map((item) => {
            const comboCrew = downfiltered.filter(f => item.crew.includes(f.symbol)).sort((a, b) => a.name.localeCompare(b.name));
            const comboStars = polestars.filter(f => item.combo.some(cb => `${cb}_keystone` === f.symbol || `rarity_${cb}_keystone` === f.symbol)).sort((a, b) => a.name.localeCompare(b.name));

            if (selCrew?.length && !comboCrew.some(cc => selCrew.includes(cc.id))) return undefined;
            if (polestarFilter?.length && !polestarFilter.every(cs => comboStars.some(cs2 => cs2.symbol === cs) )) return undefined;
            item.cost = calculateRetrievalCost(comboCrew);
            return {
                crew: comboCrew,
                combo: comboStars,
                cost: item.cost
            } as DisplayItem
        }).filter(f => f !== undefined && (!rarities.length || f.crew.some(c => rarities.includes(c.max_rarity)))) as DisplayItem[];

        const psSym = items.map(m => m.combo).map(c => comboToPolestars(c)).flat()
        const allowedPolestars = polestars.filter(f => psSym.includes(f.symbol));

        if (sortBy === 'crew') {
            workItems.sort((a, b) => {
                let r = 0;
                if (!r) r = a.crew.reduce((p, n) => p + n.rarity, 0) - b.crew.reduce((p, n) => p + n.rarity, 0);
                if (!r) r = a.crew.length - b.crew.length;
                if (!r) r = a.combo.length - b.combo.length;
                if (!r) r = a.combo.reduce((p, n) => p + n.owned, 0) - b.combo.reduce((p, n) => p + n.owned, 0);
                return r * mul;
            });
        }
        else if (sortBy === 'polestars') {
            workItems.sort((a, b) => {
                let r = 0;
                if (!r) r = a.combo.length - b.combo.length;
                if (!r) r = a.combo.reduce((p, n) => p + n.owned, 0) - b.combo.reduce((p, n) => p + n.owned, 0);
                if (!r) r = a.crew.reduce((p, n) => p + n.rarity, 0) - b.crew.reduce((p, n) => p + n.rarity, 0);
                if (!r) r = a.crew.length - b.crew.length;
                return r * mul;
            });
        }
        else if (sortBy === 'build_cost') {
            workItems.sort((a, b) => {
                let r = 0;
                if (!r) r = a.cost.credits - b.cost.credits;
                if (!r) r = a.cost.quantum - b.cost.quantum;
                if (!r) r = a.crew.length - b.crew.length;
                if (!r) r = a.combo.reduce((p, n) => p + n.owned, 0) - b.combo.reduce((p, n) => p + n.owned, 0);
                return r * mul;
            })
        }

        setAllowedPolestars(allowedPolestars);
        setWorkItems(workItems);
        setCrewPool(downfiltered);
    }, [playerData, items, polestars, sortBy, sortOrder, selCrew, polestarFilter, rarities]);

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

    return (<div>
            <div style={{...optionStyle, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center'}}>
                <div style={optionStyle}>
                    <span>{t('hints.filter_by_crew')}</span>
                    <CrewDropDown plain showRarity pool={crewPool} selection={selCrew} setSelection={setSelCrew} />
                </div>
                <div style={optionStyle}>
                    <span>{t('hints.filter_by_rarity')}</span>
                    <RarityFilter rarityFilter={rarities} setRarityFilter={setRarities} multiple />
                </div>
                <div style={optionStyle}>
                    <span>{t('hints.filter_by_polestars')}</span>
                    <div style={{display:'flex', flexDirection: 'row', justifyContent:'flex-start', alignItems: 'center', gap: '0.5em', marginBottom: '1em'}}>
                        <PolestarDropdown
                            multiple
                            style={{minWidth: '15em'}}
                            selection={polestarFilter}
                            setSelection={setPolestarFilter}
                            polestars={allowedPolestars}
                            />
                    </div>
                </div>
            </div>

            <Table striped sortable>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell
                        sorted={sortBy === 'polestars' ? sortOrder : undefined} onClick={() => sortBy === 'polestars' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortBy('polestars')}
                        >
                        {t('retrieval.combos')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        sorted={sortBy === 'crew' ? sortOrder : undefined} onClick={() => sortBy === 'crew' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortBy('crew')}
                        >
                        {t('base.crew')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        sorted={sortBy === 'build_cost' ? sortOrder : undefined} onClick={() => sortBy === 'build_cost' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortBy('build_cost')}
                        >
                        {t('retrieval.cost')}
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
    </div>)

    function renderTableRow(item: DisplayItem) {

        const costs = item.cost;

        return <Table.Row>
            <Table.Cell>
                <div style={{display:'flex', flexWrap:'wrap', flexDirection:'row', justifyContent: 'space-evenly', alignItems: 'flex-start'}}>
                    {item.combo.map((polestar) => {
                        polestar.imageUrl = getIconPath(polestar.icon, true);
                        let tailored = polestarTailors.added.filter(t => t == polestar.symbol);
                        (polestar as any)['quantity'] = polestar.owned;

                        let psName = '';
                        if (polestar.symbol.startsWith("rarity_")) {
                            let rarity = Number(polestar.symbol.replace("rarity_", "").replace("_keystone", ""));
                            psName = CONFIG.RARITIES[rarity].name;
                        }
                        else {
                            psName = TRAIT_NAMES[polestar.symbol.replace("_keystone", "")] || CONFIG.SKILLS[polestar.symbol.replace("_keystone", "")];
                        }

                        return <div style={{ width: '7em', display:'flex', flexWrap:'wrap', flexDirection:'column', justifyContent: 'center', alignItems: 'center', gap: '0.5em'}}>
                            <ItemTarget
                                inputItem={polestar as any as EquipmentItem}
                                targetGroup="mutual_crew_item">
                                <img src={getIconPath(polestar.icon)} style={{height: '48px'}} />
                            </ItemTarget>
                            <p style={{textAlign: 'center'}}>
                            {psName}
                            </p>
                            <div className={`ui label`}
                                 style={{backgroundColor: `${tailored.length ? 'darkgreen' : ''}`}}>
                                ({polestar.owned + tailored.length})
                            </div>
                            {!!market && (alwaysShowPrice || !!tailored.length) &&
                                <div style={{textAlign:'center'}}>
                                    {printISM(market[polestar.id]?.low ?? 0, t)}
                                    {t('global.n_available', { n: `${market[polestar.id]?.sell_count ?? 0}`})}
                                </div>
                            }
                            </div>
                    })}
                </div>
            </Table.Cell>
            <Table.Cell width={5}>
                <div style={{display:'flex', flexWrap:'wrap', flexDirection:'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '1em'}}>
                    {item.crew.map((crew) => {
                        return (
                            <div style={{display:'flex', gap: '1em', flexWrap:'wrap', flexDirection:'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                            <AvatarView
                                    mode='crew'
                                    item={crew}
                                    size={64}
                                    targetGroup="mutual_crew_hover"
                                    />
                                <span>
                                    <i>{crew.name}</i>
                                </span>
                            </div>

                        )
                    })}
                </div>
            </Table.Cell>
            <Table.Cell width={3}>
            <div style={{display:'flex', flexWrap:'wrap', flexDirection:'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '1em'}}>
                <p>{printCredits(costs?.credits ?? 0, t)}</p>
                <p>{printQuantum(costs?.quantum ?? 0, t)}</p>
            </div>
            </Table.Cell>
        </Table.Row>

    }

}