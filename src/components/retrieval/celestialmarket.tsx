import React from "react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { printISM, RetrievalContext } from "./context";
import { CelestialMarketListing } from "../../model/celestial";
import { Dropdown, Icon, Message, Table } from "semantic-ui-react";
import { Filter } from "../../model/game-elements";
import { IKeystone } from "./model";
import { getIconPath } from "../../utils/assets";



export const CelestialMarket = () => {

    const globalContext = React.useContext(GlobalContext);
    const retrievalContext = React.useContext(RetrievalContext);
    const { market, allKeystones } = retrievalContext;
    const { t, ITEM_ARCHETYPES } = globalContext.localized;
    const [listings, setListings] = React.useState<CelestialMarketListing[]>([]);
    const [typeFilter, setTypeFilter] = React.useState<string | undefined>(undefined);
    const [ownedFilter, setOwnedFilter] = React.useState<string | undefined>(undefined);
    const [listFilter, setListFilter] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (market) {
            const newListings: CelestialMarketListing[] = [];
            Object.entries(market).forEach(([id, listing]) => {
                const keystone = allKeystones.find(f => f.id === Number(id));
                if (keystone) {
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
                    const l = { ... listing };
                    const arch = ITEM_ARCHETYPES[keystone.symbol];
                    l.name = arch?.name ?? keystone.name;
                    l.data = keystone;
                    newListings.push(l);
                }
            });
            setListings(newListings);
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
                <Icon name='info' bordered style={{borderRadius: '16px', backgroundColor: 'white'}} />
                {t('retrieval.market.updated')}
            </Message>
            <div className='ui segment'
                 style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: '1em'}}>
                {renderTypeFilter()} {renderOwnedFilter()} {renderListedFilter()}
            </div>
            <SearchableTable
                data={listings}
                renderTableRow={(data, idx) => renderTableRow(data, idx)}
                config={marketTable}
                filterRow={(listing, filter) => filterText(listing, filter)}
                />

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
                    <img style={{gridArea: 'img', height: '48px'}} src={`${process.env.GATSBY_ASSETS_URL}${keystone.imageUrl}`} />
                    <span style={{gridArea: 'text'}}>
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