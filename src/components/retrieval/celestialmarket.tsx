import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { printISM, RetrievalContext } from "./context";
import { CelestialMarketListing } from "../../model/celestial";
import { Checkbox, Dropdown, DropdownItemProps, Icon, Label, Message, Table } from "semantic-ui-react";
import { Filter } from "../../model/game-elements";
import { IConstellation, IKeystone } from "./model";
import { getIconPath } from "../../utils/assets";
import { CrewMember } from "../../model/crew";
import { ItemHoverStat, ItemTarget } from "../hovering/itemhoverstat";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import CONFIG from "../CONFIG";
import { RarityFilter } from "../crewtables/commonoptions";
import { useStateWithStorage } from "../../utils/storage";

interface PolestarCrew extends CrewMember {
    polestar_traits: string[];
    contains_unique: boolean;
}

export const CelestialMarket = (props: { dbid?: string }) => {
    const dbid = props.dbid ? props.dbid + '/' : '';
    const globalContext = React.useContext(GlobalContext);
    const retrievalContext = React.useContext(RetrievalContext);
    const { market, allKeystones, polestarTailors, wishlist, autoWishes } = retrievalContext;
    const { t, ITEM_ARCHETYPES, TRAIT_NAMES } = globalContext.localized;
    const { playerData } = globalContext.player;
    const [filteredListings, setFilteredListings] = React.useState<CelestialMarketListing[]>([]);
    const [allListings, setAllListings] = React.useState<CelestialMarketListing[]>([]);
    const [neededPolestars, setNeededPolestars] = React.useState<string[]>([]);
    const [wishlistPolestars, setWishlistPolestars] = React.useState<string[]>([]);
    const [autoWishlistPolestars, setAutoWishlistPolestars] = React.useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useStateWithStorage(dbid + 'celestial_market/type_filter', undefined as string | undefined, { rememberForever: true });
    const [ownedFilter, setOwnedFilter] = useStateWithStorage(dbid + 'celestial_market/owned_filter', undefined as string | undefined, { rememberForever: true });
    const [listFilter, setListFilter] = useStateWithStorage(dbid + 'celestial_market/list_filter', undefined as string | undefined, { rememberForever: true });
    const [movementFilter, setMovementFilter] = useStateWithStorage(dbid + 'celestial_market/movement_filter', undefined as string | undefined, { rememberForever: true });

    React.useEffect(() => {
        if (!playerData) return;
        let eligcrew = playerData.player.character.crew.filter(f => {
            if (!f.in_portal) return false;
            if ((f.highest_owned_rarity || f.rarity) >= f.max_rarity) return false;
            if (ownedFilter === 'needed_unique' && !f.unique_polestar_combos?.length) return false;
            if (ownedFilter === 'needed_wishlist' && !wishlist.includes(f.symbol) && !autoWishes.includes(f.symbol)) return false;
            return true;
        });
        setNeededPolestars(getKeystonesForCrew(eligcrew, false));
    }, [playerData, allKeystones, ownedFilter]);

    React.useEffect(() => {
        if (!playerData) return;
        let eligcrew = playerData.player.character.crew.filter(f => wishlist.includes(f.symbol));
        setWishlistPolestars(getKeystonesForCrew(eligcrew, true));
    }, [playerData, allKeystones, wishlist]);

    React.useEffect(() => {
        if (!playerData) return;
        let eligcrew = playerData.player.character.crew.filter(f => autoWishes.includes(f.symbol));
        setAutoWishlistPolestars(getKeystonesForCrew(eligcrew, true));
    }, [playerData, allKeystones, autoWishes]);

    React.useEffect(() => {
        if (ownedFilter !== undefined && typeFilter === 'constellations' && ['needed', 'needed_unique'].includes(ownedFilter || '')) {
            setOwnedFilter(undefined);
            return;
        }
        if (market) {
            const newListings: CelestialMarketListing[] = [];
            const allListings: CelestialMarketListing[] = [];
            Object.entries(market).forEach(([id, listing]) => {
                const keystone = allKeystones.find(f => f.id === Number(id));
                if (keystone) {
                    const l = { ...listing };
                    const arch = ITEM_ARCHETYPES[keystone.symbol];
                    l.name = arch?.name ?? keystone.name;
                    l.data = keystone;
                    allListings.push(l);
                    if (typeFilter) {
                        if (typeFilter === 'polestars' && (keystone.type === 'crew_keystone_crate' || keystone.type === 'keystone_crate')) return;
                        if (typeFilter === 'constellations' && keystone.type === 'keystone') return;
                    }
                    if (playerData && ownedFilter) {
                        if (ownedFilter === 'owned' && !keystone.owned) return;
                        if (ownedFilter === 'unowned' && keystone.owned) return;
                        if (ownedFilter.includes("wishlist") && !wishlistPolestars.includes(keystone.symbol) && !autoWishlistPolestars.includes(keystone.symbol)) return;
                        if (ownedFilter.startsWith("needed") && !neededPolestars.includes(keystone.symbol)) return;
                    }
                    if (listFilter) {
                        if (listFilter === 'listed' && !listing.sell_count) return;
                        if (listFilter === 'unlisted' && listing.sell_count) return;
                    }
                    if (movementFilter) {
                        if (movementFilter === 'sold_last_day' && !listing.sold_last_day) return;
                        if (movementFilter === 'not_sold_last_day' && listing.sold_last_day) return;
                    }
                    newListings.push(l);
                }
            });
            setFilteredListings(newListings);
            setAllListings(allListings);
        }
    }, [market, typeFilter, ownedFilter, listFilter, movementFilter, neededPolestars]);

    let _marketTable: ITableConfigRow[] = [];

    _marketTable.push(
        { width: 2, column: 'name', title: t('global.name') },
    )

    if (playerData) {
        _marketTable.push(
            {
                width: 1,
                column: 'owned',
                title: t('crew_state.owned'),
                customCompare: (a, b) => {
                    let keystone_a = a.data as IKeystone;
                    let keystone_b = b.data as IKeystone;
                    let added_a = polestarTailors?.added?.filter(f => f == keystone_a.symbol)?.length;
                    let added_b = polestarTailors?.added?.filter(f => f == keystone_b.symbol)?.length;
                    return keystone_a.owned - keystone_b.owned || added_a - added_b;
                }
            }
        )
    }

    _marketTable = _marketTable.concat([
        { width: 1, column: 'sell_count', title: t('retrieval.market.columns.sell_count') },
        { width: 1, column: 'low', title: t('retrieval.market.columns.low') },
        { width: 1, column: 'buy_count', title: t('retrieval.market.columns.buy_count') },
        { width: 1, column: 'high', title: t('retrieval.market.columns.high') },
        { width: 1, column: 'sold_last_day', title: t('retrieval.market.columns.sold_last_day') },
        { width: 1, column: 'last_price', title: t('retrieval.market.columns.last_price') },
    ]);

    const marketTable = _marketTable;

    if (!market) return <></>

    return (<div>
        <CrewHoverStat targetGroup="celestial_market_crew" />
        <ItemHoverStat targetGroup="celestial_market_items" />
        <Message color='blue'>
            <Icon name='info' bordered style={{ borderRadius: '16px', backgroundColor: 'white' }} />
            {t('retrieval.market.updated')}
        </Message>
        <div className='ui segment'
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: '1em' }}>
            {!!playerData && renderOwnedFilter()} {renderTypeFilter()} {renderListedFilter()} {renderMovementFilter()}
        </div>
        <SearchableTable
            data={filteredListings}
            renderTableRow={(data, idx) => renderTableRow(data, idx)}
            config={marketTable}
            filterRow={(listing, filter) => filterText(listing, filter)}
        />
        {/* <PopularCrew allListings={allListings} /> */}
    </div>)


    function renderOwnedFilter() {
        const options = [
            { key: 'owned', value: 'owned', text: t('retrieval.market.disposition.owned') },
            { key: 'unowned', value: 'unowned', text: t('retrieval.market.disposition.unowned') },
        ];

        if (typeFilter !== 'constellations') {
            options.push(
                { key: 'needed', value: 'needed', text: t('retrieval.market.disposition.needed') }
            )
            options.push(
                { key: 'needed_unique', value: 'needed_unique', text: t('retrieval.market.disposition.needed_unique') }
            )
            if (wishlist.length || autoWishes.length) {
                options.push(
                    { key: 'wishlist', value: 'wishlist', text: t('retrieval.market.disposition.wishlist') },
                )
                options.push(
                    { key: 'owned_wishlist', value: 'owned_wishlist', text: t('retrieval.market.disposition.owned_wishlist') },
                )
                options.push(
                    { key: 'needed_wishlist', value: 'needed_wishlist', text: t('retrieval.market.disposition.needed_wishlist') }
                )
            }
        }

        return <Dropdown
            placeholder={t('hints.filter_by_owned_status')}
            options={options}
            value={ownedFilter}
            clearable
            selection
            onChange={(e, { value }) => setOwnedFilter(value as string | undefined)}
        />

    }

    function renderTypeFilter() {
        const options = [
            { key: 'constellations', value: 'constellations', text: t('retrieval.constellations') },
            { key: 'polestars', value: 'polestars', text: t('retrieval.polestars') },
        ]

        return <Dropdown
            placeholder={t('hints.filter_by_item_type')}
            options={options}
            value={typeFilter}
            clearable
            selection
            onChange={(e, { value }) => setTypeFilter(value as string | undefined)}
        />

    }

    function renderListedFilter() {
        const options = [
            { key: 'listed', value: 'listed', text: t('retrieval.market.listed') },
            { key: 'unlisted', value: 'unlisted', text: t('retrieval.market.unlisted') },
        ]

        return <Dropdown
            placeholder={t('hints.filter_by_listed_status')}
            options={options}
            value={listFilter}
            clearable
            selection
            onChange={(e, { value }) => setListFilter(value as string | undefined)}
        />

    }

    function renderMovementFilter() {
        const options = [
            { key: 'sold_last_day', value: 'sold_last_day', text: t('retrieval.market.movement.sold_last_day') },
            { key: 'not_sold_last_day', value: 'not_sold_last_day', text: t('retrieval.market.movement.not_sold_last_day') },
        ];

        return <Dropdown
            placeholder={t('hints.filter_by_movement')}
            options={options}
            value={movementFilter}
            clearable
            selection
            onChange={(e, { value }) => setMovementFilter(value as string | undefined)}
    />

    }

    function renderTableRow(data: CelestialMarketListing, idx?: number) {

        const keystone = data.data as IKeystone;
        keystone.imageUrl = getIconPath(keystone.icon, true);
        const isadded = polestarTailors?.added?.filter(f => f === keystone.symbol)?.length;
        const isremoved = polestarTailors?.disabled?.some(f => f === keystone.id) || false;
        let subitems = [] as IKeystone[];
        if (keystone.type === 'crew_keystone_crate') {
            let ks = keystone as IConstellation;
            subitems = ks.keystones.map(ks => allKeystones.find(f => f.id === ks)!);
        }
        return <Table.Row key={`celest_${data.name}_${idx}`}>
            <Table.Cell>
                <div style={{
                    display: 'grid',
                    gridTemplateAreas: `'img text'`,
                    gridTemplateColumns: '64px auto',
                    alignItems: 'center'
                }}>
                    <ItemTarget inputItem={{ ...keystone as any, quantity: keystone.owned }} passDirect={true} targetGroup="celestial_market_items">
                        <img style={{ gridArea: 'img', height: '48px' }} src={`${process.env.GATSBY_ASSETS_URL}${keystone.imageUrl}`} />
                    </ItemTarget>
                    <span style={{ gridArea: 'text' }}>
                        {/* {!!isadded && <Icon name='add circle' color='blue' />} */}
                        {wishlistPolestars.includes(keystone.symbol) && <Icon name='heart' color='pink' />}
                        {autoWishlistPolestars.includes(keystone.symbol) && !wishlistPolestars.includes(keystone.symbol) && <Icon name='heart' />}
                        {!!isremoved && <Icon name='remove circle' color='orange' />}
                        {data.name}
                        {!!subitems.length &&
                            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
                                <br />
                                <b style={{textDecoration: 'underline'}}>{t('retrieval.polestars')}</b>
                                <i>
                                {subitems.map(item => <span key={`${item.name}+subitem+${keystone.name}`}>{printKeystone(item)}</span>)
                                    .reduce((p, n, i) => p ? <>{p}{i ? ', ' : ''}{n}</> : n, <></>)
                                }
                                </i>
                            </div>
                        }
                    </span>
                </div>
            </Table.Cell>
            {!!playerData && <Table.Cell>
                {((keystone.owned)?.toLocaleString() ?? '0')}
                {!!isadded && <Label color='blue' style={{marginLeft: '1em'}}>+ {isadded}</Label>}
            </Table.Cell>}
            <Table.Cell>
                {data.sell_count.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {printISM(data.low, t)}
            </Table.Cell>
            <Table.Cell>
                {data.buy_count.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {printISM(data.high, t)}
            </Table.Cell>
            <Table.Cell>
                {data.sold_last_day.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {printISM(data.last_price, t)}
            </Table.Cell>
        </Table.Row>
    }

    function filterText(listing: CelestialMarketListing, filters: Filter[]): boolean {
        if (filters.length === 0) return true;

        const matchesFilter = (input: string, searchString: string) =>
            input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

        let meetsAnyCondition = false;
        let subitems = listing?.data?.keystones?.map(ks => allKeystones.find(f => f.id === ks)!) as IKeystone[] | undefined;
        for (let filter of filters) {
            let meetsAllConditions = true;
            if (filter.conditionArray?.length === 0) {
                // text search only
                for (let segment of filter.textSegments ?? []) {
                    let segmentResult = matchesFilter(listing.name!, segment.text);
                    if (!segmentResult && subitems) {
                        segmentResult = subitems.some(si => {
                            return matchesFilter(printKeystone(si), segment.text);
                        });
                    }
                    meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
                }
            }
            if (meetsAllConditions) {
                meetsAnyCondition = true;
                break;
            }
        }

        return meetsAnyCondition;
    }

    function getKeystonesForCrew(crewlist: CrewMember[], ignore_owned: boolean) {
        let rarities = [...new Set(crewlist.map(m => `rarity_${m.max_rarity}_keystone`))];
        let skills = [... new Set(crewlist.map(m => m.skill_order).flat().map(s => `${s}_keystone`))];
        let traits = [... new Set(crewlist.map(m => ownedFilter === 'needed_unique' ? m.unique_polestar_combos?.flat() ?? [] : m.traits).flat().map(s => `${s}_keystone`))];
        let compiled = traits.concat(rarities).concat(skills);
        let needed = allKeystones.filter(f => compiled.includes(f.symbol) && (!f.owned || ignore_owned)).map(m => m.symbol);
        return [...new Set(needed)];
    }


    function printKeystone(keystone: IKeystone) {
        if (keystone.filter?.type === 'rarity') {
            return CONFIG.RARITIES[Number(keystone.filter!.rarity!)]?.name ?? '';
        }
        else if (keystone.filter?.type === 'skill') {
            return CONFIG.SKILLS[keystone!.filter!.skill!] ?? '';
        }
        else if (keystone.filter?.type === 'trait')  {
            return TRAIT_NAMES[keystone!.filter!.trait!] ?? '';
        }
        return keystone.name;
    }

}

type PopularityMode = 'orders' | 'high' | 'sold_last_day';

const PopularCrew = (props: { allListings: CelestialMarketListing[] }) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const [popularCrew, setPopularCrew] = React.useState<PolestarCrew[]>([]);
    const [includeHfs, setIncludeHfs] = React.useState(false);
    const TRAIT_NAMES = structuredClone(globalContext.localized.TRAIT_NAMES);
    const [rarities, setRarities] = useStateWithStorage(`popular_rarity_filter`, [5] as number[]);
    const [top, setTop] = useStateWithStorage(`popular_keystone_top`, 10, { rememberForever: true });
    const [minPolestars, setMinPolestars] = useStateWithStorage(`popular_keystone_min_polestars`, 3);
    const [cabOv, setCabOv] = useStateWithStorage(`popular_keystone_cab_ov`, 14);
    const [mode, setMode] = useStateWithStorage<PopularityMode>(`popular_mode`, 'sold_last_day');
    const topOptions = [] as DropdownItemProps[];

    [5, 10, 15, 20, 30, 50, 100].map((n) => {
        topOptions.push({
            key: `top_${n}`,
            value: n,
            text: t('retrieval.market.top_n_polestars', { n: `${n}` })
        });
    });

    const minOptions = [] as DropdownItemProps[];

    for (let n = 1; n <= 5; n++) {
        minOptions.push({
            key: `min_${n}`,
            value: n,
            text: `${n}`
        });
    }

    const cabOptions = [] as DropdownItemProps[];

    for (let n = 16; n >= 1; n++) {
        cabOptions.push({
            key: `cab_opt_${n}`,
            value: n,
            text: n === 16 ? '16' : t('global.x_or_better', { x: `${n}` })
        });
    }

    const modes = [
        { key: 'orders', value: 'orders', text: t('retrieval.market.modes.orders') },
        { key: 'high', value: 'high', text: t('retrieval.market.modes.high') },
        { key: 'sold_last_day', value: 'sold_last_day', text: t('retrieval.market.modes.sold_last_day') },
    ] as DropdownItemProps[];


    CONFIG.RARITIES.forEach((rarity, idx) => {
        TRAIT_NAMES[`rarity_${idx}`] = rarity.name;
    });

    Object.entries(CONFIG.SKILLS).forEach(([skill, name]) => {
        TRAIT_NAMES[skill] = name;
    });

    const { allListings } = props;

    React.useEffect(() => {
        let listing = [...allListings].sort((a, b) => {
            let r = 0;
            if (mode === 'sold_last_day') {
                r = b.sold_last_day - a.sold_last_day;
            }
            else if (mode === 'high') {
                r = b.high - a.high;
            }
            else {
                r = b.buy_count - a.buy_count;
            }
            if (!r) r = b.low - a.low;
            return r;
        });
        const tsl = {} as { [key: string]: number }
        listing.forEach(l => tsl[l.data!.symbol!.replace('_keystone', '')] = mode === 'sold_last_day' ? l.sold_last_day : (mode === 'high' ? l.high : l.buy_count));
        let keys = listing.filter(fi => (fi.data as IKeystone).type === 'keystone')
            .map(mi => mi.data as IKeystone)
            .map(d => d.symbol.replace("_keystone", ""))
            .filter(f => includeHfs || !["human", "federation", "starfleet"].includes(f))
            .slice(0, top);

        let tpop = globalContext.core.crew.map(fc => {
            fc.unique_polestar_combos = fc.unique_polestar_combos?.map(m => ([... new Set(m)]))
            let cbs = (fc.unique_polestar_combos ?? []).map(unc => {
                let ft = unc.filter(z => keys.includes(z));
                return {
                    combo: unc,
                    score: ft.length
                }
            });
            if (cbs?.length) {
                cbs.sort((a, b) => b.score - a.score);
            }
            let uniques = !!(cbs?.length && cbs[0].score === cbs[0].combo.length);
            let obj = ({ symbol: fc.symbol, traits: uniques ? cbs[0].combo : fc.traits.filter(t => keys.includes(t)), skill: false, rarity: false, unique: uniques });

            if (!uniques) {
                if (keys.some(k => k === `rarity_${fc.max_rarity}`)) {
                    obj.traits.push(`rarity_${fc.max_rarity}`);
                    obj.rarity = true;
                }
                if (keys.some(k => k.endsWith("_skill"))) {
                    let traits = keys.filter(f => f.endsWith("_skill") && fc.base_skills[f]?.core);
                    if (traits.length) {
                        obj.traits = obj.traits.concat(traits);
                        obj.skill = true;
                    }
                }
            }
            obj.traits = obj.traits.filter((f, idx) => obj.traits.findIndex(fo => fo === f) === idx);
            return obj;
        });

        tpop = tpop.sort((a, b) => b.traits.length - a.traits.length).filter(f => f.traits.length >= minPolestars);
        const finalcrew = tpop.map(m => globalContext.core.crew.find(fc => fc.symbol === m.symbol))
            .filter(f => !!f)
            .map(mc => ({ ...mc, polestar_traits: [] as string[], contains_unique: false }))
            .filter(f =>
                //f.max_rarity === 5 &&
                f.cab_ov_rank && f.cab_ov_rank >= cabOv &&
                f.in_portal &&
                f.unique_polestar_combos?.length &&
                (!rarities.length || rarities.includes(f.max_rarity ?? 0)));

        if (finalcrew.length === 1) {
            let tpf = tpop.find(tf => tf.symbol === finalcrew[0].symbol);
            if (tpf) {
                finalcrew[0].polestar_traits = tpf.traits;
                finalcrew[0].contains_unique = tpf.unique;
            }
        }
        else {
            finalcrew.sort((a, b) => {
                let xa = tpop.findIndex(tpa => tpa.symbol === a.symbol);
                let xb = tpop.findIndex(tpb => tpb.symbol === b.symbol);
                if (!a.polestar_traits.length) {
                    a.polestar_traits = tpop[xa].traits;
                    a.contains_unique = tpop[xa].unique;
                }
                if (!b.polestar_traits.length) {
                    b.polestar_traits = tpop[xb].traits;
                    b.contains_unique = tpop[xb].unique;
                }
                return b.polestar_traits.reduce((p, n) => p + tsl[n], 0) - a.polestar_traits.reduce((p, n) => p + tsl[n], 0)
                //return xa - xb;
            });
        }

        setPopularCrew(finalcrew);
    }, [allListings, includeHfs, rarities, top, minPolestars, cabOv, mode]);

    return (
        <div className="ui segment">
            <Label attached="top" color='orange'>
                {t('global.experimental')}
            </Label>
            <h4>{t('retrieval.market.most_likely_popular')}</h4>
            <Checkbox
                style={{ margin: '0.5em 0' }}
                checked={includeHfs}
                onChange={(e, { checked }) => setIncludeHfs(!!checked)}
                label={t('global.include_x', {
                    x: `${[TRAIT_NAMES['human'], TRAIT_NAMES['federation'], TRAIT_NAMES['starfleet']].join(", ")}`
                })} />
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '1em'
            }}>
                <div style={{ display: 'inline' }}>
                    <p>{t('collections.options.mode.title')}</p>
                    <Dropdown
                        selection
                        value={mode}
                        options={modes}
                        onChange={(e, { value }) => setMode(value as PopularityMode)}
                    />
                </div>
                <div style={{ display: 'inline' }}>
                    <p>{t('hints.filter_by_rarity')}</p>
                    <RarityFilter
                        rarityFilter={rarities}
                        setRarityFilter={setRarities}
                    />
                </div>
                <div style={{ display: 'inline' }}>
                    <p>{t('retrieval.market.top_n_polestars', { n: '' })}</p>
                    <Dropdown
                        selection
                        value={top}
                        options={topOptions}
                        onChange={(e, { value }) => setTop(value as number)}
                    />
                </div>
                <div style={{ display: 'inline' }}>
                    <p>{t('retrieval.market.min_polestars')}</p>
                    <Dropdown
                        selection
                        value={minPolestars}
                        options={minOptions}
                        onChange={(e, { value }) => setMinPolestars(value as number)}
                    />
                </div>
                <div style={{ display: 'inline' }}>
                    <p>{t('rank_names.cab_rank')}</p>
                    <Dropdown
                        selection
                        value={cabOv}
                        options={cabOptions}
                        onChange={(e, { value }) => setCabOv(value as number)}
                    />
                </div>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                flexWrap: 'wrap'
            }}>
                {popularCrew.map((crew, idx) => {
                    if (crew?.contains_unique) {
                        console.log("break");
                    }
                    return !!crew && <div style={{
                        padding: '1em',
                        width: '20%',
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',

                    }}>
                        <AvatarView
                            mode='crew'
                            item={crew}
                            size={64}
                            targetGroup="celestial_market_crew"
                        />
                        {crew.name}
                        <br />
                        <i style={{ color: crew.contains_unique ? 'lightgreen' : undefined }}>({crew.polestar_traits.map(t => TRAIT_NAMES[t]).join(", ")})</i>
                    </div> || <></>
                })}
            </div>
        </div>)

}