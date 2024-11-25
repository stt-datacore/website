import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { printISM, RetrievalContext } from "./context";
import { CelestialMarketListing } from "../../model/celestial";
import { Checkbox, Dropdown, DropdownItemProps, Icon, Label, Message, Table } from "semantic-ui-react";
import { Filter } from "../../model/game-elements";
import { IKeystone } from "./model";
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
}

export const CelestialMarket = () => {
    const globalContext = React.useContext(GlobalContext);
    const retrievalContext = React.useContext(RetrievalContext);
    const { market, allKeystones } = retrievalContext;
    const { t, ITEM_ARCHETYPES } = globalContext.localized;
    const [filteredListings, setFilteredListings] = React.useState<CelestialMarketListing[]>([]);
    const [allListings, setAllListings] = React.useState<CelestialMarketListing[]>([]);
    const [typeFilter, setTypeFilter] = React.useState<string | undefined>(undefined);
    const [ownedFilter, setOwnedFilter] = React.useState<string | undefined>(undefined);
    const [listFilter, setListFilter] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
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
                    if (ownedFilter) {
                        if (ownedFilter === 'owned' && !keystone.owned) return;
                        if (ownedFilter === 'unowned' && keystone.owned) return;
                    }
                    if (listFilter) {
                        if (listFilter === 'listed' && !listing.sell_count) return;
                        if (listFilter === 'unlisted' && listing.sell_count) return;
                    }
                    newListings.push(l);
                }
            });
            setFilteredListings(newListings);
            setAllListings(allListings);
        }
    }, [market, typeFilter, ownedFilter, listFilter]);

    const marketTable: ITableConfigRow[] = [

        { width: 2, column: 'name', title: t('global.name') },
        {
            width: 1,
            column: 'owned',
            title: t('crew_state.owned'),
            customCompare: (a, b) => {
                let ka = a.data as IKeystone;
                let kb = b.data as IKeystone;
                return ka.owned - kb.owned;
            }
        },
        { width: 1, column: 'sell_count', title: t('retrieval.market.columns.sell_count') },
        { width: 1, column: 'low', title: t('retrieval.market.columns.low') },
        { width: 1, column: 'buy_count', title: t('retrieval.market.columns.buy_count') },
        { width: 1, column: 'high', title: t('retrieval.market.columns.high') },
        { width: 1, column: 'sold_last_day', title: t('retrieval.market.columns.sold_last_day') },
        { width: 1, column: 'last_price', title: t('retrieval.market.columns.last_price') },
    ];

    if (!market) return <></>

    return (<div>
        <Message color='blue'>
            <Icon name='info' bordered style={{ borderRadius: '16px', backgroundColor: 'white' }} />
            {t('retrieval.market.updated')}
        </Message>
        <div className='ui segment'
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: '1em' }}>
            {renderTypeFilter()} {renderOwnedFilter()} {renderListedFilter()}
        </div>
        <SearchableTable
            data={filteredListings}
            renderTableRow={(data, idx) => renderTableRow(data, idx)}
            config={marketTable}
            filterRow={(listing, filter) => filterText(listing, filter)}
        />
        <PopularCrew allListings={allListings} />
        <ItemHoverStat targetGroup="celestial_market_items" />
        <CrewHoverStat targetGroup="celestial_market_crew" />
    </div>)


    function renderTypeFilter() {
        const options = [
            { key: 'owned', value: 'owned', text: t('crew_state.owned') },
            { key: 'unowned', value: 'unowned', text: t('crew_state.unowned') },
        ]

        return <Dropdown
            placeholder={t('hints.filter_by_owned_status')}
            options={options}
            value={ownedFilter}
            clearable
            selection
            onChange={(e, { value }) => setOwnedFilter(value as string | undefined)}
        />

    }

    function renderOwnedFilter() {
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

    function renderTableRow(data: CelestialMarketListing, idx?: number) {

        const keystone = data.data as IKeystone;
        keystone.imageUrl = getIconPath(keystone.icon, true);
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
                        {data.name}
                    </span>
                </div>
            </Table.Cell>
            <Table.Cell>
                {keystone.owned?.toLocaleString() ?? '0'}
            </Table.Cell>
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

        for (let filter of filters) {
            let meetsAllConditions = true;
            if (filter.conditionArray?.length === 0) {
                // text search only
                for (let segment of filter.textSegments ?? []) {
                    let segmentResult = matchesFilter(listing.name!, segment.text);
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
}

const PopularCrew = (props: { allListings: CelestialMarketListing[] }) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const [popularCrew, setPopularCrew] = React.useState<PolestarCrew[]>([]);
    const [includeHfs, setIncludeHfs] = React.useState(false);
    const TRAIT_NAMES = JSON.parse(JSON.stringify(globalContext.localized.TRAIT_NAMES));
    const [rarities, setRarities] = useStateWithStorage(`popular_rarity_filter`, [5] as number[], { rememberForever: true });
    const [top, setTop] = useStateWithStorage(`popular_keystone_top`, 10, { rememberForever: true });
    const [minPolestars, setMinPolestars] = useStateWithStorage(`popular_keystone_min_polestars`, 3, { rememberForever: true });

    const topOptions = [] as DropdownItemProps[];

    [5, 10, 15, 20, 30, 50, 100].map((n) => {
        topOptions.push({
            key: `top_${n}`,
            value: n,
            text: t('retrieval.market.top_n_polestars', { n: `${n}` })
        });
    });

    const minOptions = [] as DropdownItemProps[];

    [1, 2, 3, 4, 5].map((n) => {
        minOptions.push({
            key: `min_${n}`,
            value: n,
            text: `${n}`
        });
    });

    CONFIG.RARITIES.forEach((rarity, idx) => {
        TRAIT_NAMES[`rarity_${idx}`] = rarity.name;
    });

    Object.entries(CONFIG.SKILLS).forEach(([skill, name]) => {
        TRAIT_NAMES[skill] = name;
    });

    const { allListings } = props;

    React.useEffect(() => {
        let listing = [...allListings].sort((a, b) => b.sold_last_day - a.sold_last_day);
        let keys = listing.filter(fi => (fi.data as IKeystone).type === 'keystone')
            .map(mi => mi.data as IKeystone)
            .map(d => d.symbol.replace("_keystone", ""))
            .filter(f => includeHfs || !["human", "federation", "starfleet"].includes(f))
            .slice(0, top);

        let tpop = globalContext.core.crew.map(fc => {
            let obj = ({ symbol: fc.symbol, traits: fc.traits.filter(t => keys.includes(t)), skill: false, rarity: false });
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
            return obj;
        });

        tpop = tpop.sort((a, b) => b.traits.length - a.traits.length).filter(f => f.traits.length >= minPolestars);
        const finalcrew = tpop.map(m => globalContext.core.crew.find(fc => fc.symbol === m.symbol))
                .filter(f => !!f)
                .map(mc => ({ ...mc, polestar_traits: [] as string[] }))
                .filter(f =>
                    //f.max_rarity === 5 &&
                    f.bigbook_tier < 5 &&
                    f.in_portal &&
                    f.unique_polestar_combos?.length &&
                    (!rarities.length || rarities.includes(f.max_rarity)));

        finalcrew.sort((a, b) => {
            let xa = tpop.findIndex(tpa => tpa.symbol === a.symbol);
            let xb = tpop.findIndex(tpb => tpb.symbol === b.symbol);
            if (!a.polestar_traits.length) a.polestar_traits = tpop[xa].traits;
            if (!b.polestar_traits.length) b.polestar_traits = tpop[xb].traits;
            return xa - xb;
        });

        setPopularCrew(finalcrew);
    }, [allListings, includeHfs, rarities, top, minPolestars]);

    return (
        <div className="ui segment">
            <Label attached="top" color='orange'>
                {t('global.experimental')}
            </Label>
            <h4>{t('retrieval.market.most_likely_popular')}</h4>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                gap: '1em'
            }}>
                <Checkbox
                    style={{margin: '0.5em 0'}}
                    checked={includeHfs}
                    onChange={(e, { checked }) => setIncludeHfs(!!checked)}
                    label={t('global.include_x', {
                        x: `${[TRAIT_NAMES['human'], TRAIT_NAMES['federation'], TRAIT_NAMES['starfleet']].join(", ")}`
                    })} />
                <div style={{display: 'inline'}}>
                    <p>{t('hints.filter_by_rarity')}</p>
                    <RarityFilter
                        rarityFilter={rarities}
                        setRarityFilter={setRarities}
                        />
                </div>
                <div style={{display: 'inline'}}>
                    <p>{t('retrieval.market.top_n_polestars', { n: '' })}</p>
                    <Dropdown
                        selection
                        value={top}
                        options={topOptions}
                        onChange={(e, { value }) => setTop(value as number)}
                        />
                </div>
                <div style={{display: 'inline'}}>
                    <p>{t('retrieval.market.min_polestars')}</p>
                    <Dropdown
                        selection
                        value={minPolestars}
                        options={minOptions}
                        onChange={(e, { value }) => setMinPolestars(value as number)}
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
                    return !!crew && <div style={{
                        padding: '1em',
                        width: '20%',
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: (crew as any).score === -1 ? 'lightgreen' : undefined
                    }}>
                        <AvatarView
                            mode='crew'
                            item={crew}
                            size={64}
                            targetGroup="celestial_market_crew"
                        />
                        {crew.name}
                        <br />
                        <i>({crew.polestar_traits.map(t => TRAIT_NAMES[t]).join(", ")})</i>
                    </div> || <></>
                })}
            </div>
        </div>)

}