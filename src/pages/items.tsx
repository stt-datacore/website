import React, { Component } from 'react';
import { Header, Table, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import { Filter } from '../model/game-elements';
import { Archetype17 } from '../model/archetype';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { PlayerCrew, PlayerData } from '../model/player';
import { CrewMember } from '../model/crew';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { BuffStatTable } from '../utils/voyageutils';
import ItemDisplay from '../components/itemdisplay';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { populateItemCadetSources } from '../utils/itemutils';

export interface ItemsPageProps {}

const ItemsPage = (props: ItemsPageProps) => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items', 'cadet']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	
	let maxBuffs: BuffStatTable | undefined;
	const cadetforitem = isReady ? coreData?.cadet?.filter(f => f.cadet) : undefined;

	if (isReady && cadetforitem?.length) {
		populateItemCadetSources(coreData.items, cadetforitem);
	}
	maxBuffs = playerContext.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady) {
		maxBuffs = coreData.all_buffs;
	} 

	return (
		<Layout>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
						allCrew: coreData.crew,
						playerData: strippedPlayerData ?? {} as PlayerData,
						buffConfig: buffConfig,
						maxBuffs: maxBuffs,
						items: coreData.items
					}}>
						<ItemsComponent isReady={isReady} />
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);
};



interface ItemsComponentProps {
	isReady: boolean;
};

interface ItemsComponentState {
	items?: EquipmentItem[];
	crew?: (PlayerCrew | CrewMember)[];
	crewLevels?: { [key: string]: Set<string>; };
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Item' },
	{ width: 1, column: 'type', title: 'Item type' },
	{ width: 1, column: 'rarity', title: 'Rarity' },
	{ width: 3, column: 'flavor', title: 'Flavor' }
];

class ItemsComponent extends Component<ItemsComponentProps, ItemsComponentState> {
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private inited: boolean;

	constructor(props: ItemsComponentProps) {
		super(props);

		this.state = {
			crew: undefined,
			items: undefined
		};
	}

	componentDidUpdate(prevProps: Readonly<ItemsComponentProps>, prevState: Readonly<ItemsComponentState>, snapshot?: any): void {
		if (this.props.isReady && !this.inited) {
			this.initData();
		}
	}

	componentDidMount() {
		if (this.props.isReady) this.initData();
	}
	
	private binaryLocate(symbol: string, items: EquipmentItem[]) : EquipmentItem | undefined {
		let lo = 0, hi = items.length - 1;

		while (true)
		{
			if (lo > hi) break;

			let p = Math.floor((hi + lo) / 2);
			let elem = items[p];

			let c = symbol.localeCompare(items[p].symbol);

			if (c == 0)
			{
				return elem;
			}
			else if (c < 0)
			{
				hi = p - 1;
			}
			else
			{
				lo = p + 1;
			}
		}

		return undefined;
	}

	private initData() {

		const { items: origItems, allCrew: origCrew } = this.context;
		let crew = JSON.parse(JSON.stringify(origCrew)) as PlayerCrew[];
		let items = JSON.parse(JSON.stringify(origItems)) as EquipmentItem[];
		items = items.filter(item => item.imageUrl && item.imageUrl !== '');
		let origpos = items.map(item => item.symbol);

		// Fill in something useful for flavor where it's missing
		items.forEach(item => {
			if (!item.flavor) {
				if (item.type === 2 && (!item.item_sources || item.item_sources.length === 0) && !item.recipe) {
					// Most likely a galaxy item
					item.flavor = 'Unused or Galaxy Event item';
				}

				// let crew_levels = new Set();
				// crew.forEach(cr => {
				// 	cr.equipment_slots.forEach(es => {
				// 		if (es.symbol === item.symbol) {
				// 			crew_levels.add(cr.name);
				// 		}
				// 	});
				// });

				// if (crew_levels.size > 0) {
				// 	if (crew_levels.size > 5) {
				// 		item.flavor = `Equippable by ${crew_levels.size} crew`;
				// 	} else {
				// 		item.flavor = 'Equippable by: ' + [...crew_levels].join(', ');
				// 	}
				// }
			}
		});
		
		
		items.sort((a, b) => a.symbol.localeCompare(b.symbol));
  		let crewLevels: { [key: string]: Set<string>; } = {};
		
		crew.forEach(cr => {
			cr.equipment_slots.forEach(es => {
				let item = this.binaryLocate(es.symbol, items);
				if (item) {
					crewLevels[es.symbol] ??= new Set();
					crewLevels[es.symbol].add(cr.name);
				}
			});
		});

		for (let symbol in crewLevels) {
			if (crewLevels[symbol] && crewLevels[symbol].size > 0) {
				let item = this.binaryLocate(symbol, items);
				if (item) {
					if (crewLevels[symbol].size > 5) {
						item.flavor = `Equippable by ${crewLevels[symbol].size} crew`;
					} else {
						item.flavor = 'Equippable by: ' + [...crewLevels[symbol]].join(', ');
					}
				}
			}
		}

		let itemsFinal = [] as EquipmentItem[];

		for (let symbol of origpos) {
			let item = this.binaryLocate(symbol, items);
			if (item) itemsFinal.push(item);
		}

		items = itemsFinal.filter(item => (item.type !== 2) || item.flavor);

		this.setState({ ... this.state, crew, items: items, crewLevels });
		this.inited = true;
	}

	_filterItem(item: any, filters: Filter[]): boolean {
		if (filters.length == 0) return true;

		const matchesFilter = (input: string, searchString: string) =>
			input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let meetsAnyCondition = false;

		for (let filter of filters) {
			let meetsAllConditions = true;
			if (filter.conditionArray?.length === 0) {
				// text search only
				for (let segment of filter.textSegments ?? []) {
					let segmentResult = matchesFilter(item.name, segment.text) || matchesFilter(item.flavor, segment.text);
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

	renderTableRow(item: any): JSX.Element {
		const { playerData } = this.context;

		return (
			<Table.Row key={item.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<ItemDisplay
								playerData={playerData}
								itemSymbol={item.symbol}
								allItems={this.context.items}
								targetGroup='items_page'
								rarity={item.rarity}
								maxRarity={item.rarity}
								size={48} 
								src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<Link to={`/item_info?symbol=${item.symbol}`}>
								<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
									{item.rarity > 0 && (
										<span>
											{item.rarity} <Icon name="star" />{' '}
										</span>
									)}
									{item.name}
								</span>
							</Link>
						</div>
						<div style={{ gridArea: 'description' }}>{item.flavor}</div>
					</div>
				</Table.Cell>
				<Table.Cell>{CONFIG.REWARDS_ITEM_TYPE[item.type] ?? item.type}</Table.Cell>
				<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
				<Table.Cell>{item.flavor}</Table.Cell>
			</Table.Row>
		);
	}

	render() {
		return (<>
				<Header as="h2">Items</Header>

				{!this.state.items && (
					<div>
						<Icon loading name="spinner" /> Loading...
					</div>
				)}
				{this.state.items && (
					<>
					<ItemHoverStat targetGroup='items_page' />
					<SearchableTable
						id="items"
						data={this.state.items}
						explanation={
							<div>
								<p>Search for items by name or flavor.</p>
							</div>
						}
						renderTableRow={crew => this.renderTableRow(crew)}
						filterRow={(crew, filter) => this._filterItem(crew, filter)}
						config={tableConfig}
					/>
					</>
				)}
			</>);
	}
}

export default ItemsPage;
