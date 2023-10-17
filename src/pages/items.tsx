import React, { Component } from 'react';
import { Header, Table, Icon, Step } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import { Filter } from '../model/game-elements';
import { Archetype17 } from '../model/archetype';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { PlayerCrew, PlayerData } from '../model/player';
import { CrewMember } from '../model/crew';
import { DataContext } from '../context/datacontext';
import { GlobalContext } from '../context/globalcontext';
import { PlayerContext } from '../context/playercontext';
import { BuffStatTable } from '../utils/voyageutils';
import ItemDisplay from '../components/itemdisplay';
import DataPageLayout from '../components/page/datapagelayout';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { binaryLocate, populateItemCadetSources } from '../utils/itemutils';
import { useStateWithStorage } from '../utils/storage';
import ProfileItems from '../components/profile_items';

export interface ItemsPageProps {}

const ItemsPage = (props: ItemsPageProps) => {
	
	const [activeTabIndex, setActiveTabIndex] = useStateWithStorage<number>('items/mode', 0, { rememberForever: true });	
	const context = React.useContext(GlobalContext);

	const hasPlayer = !!context.player.playerData;
	const allActive = activeTabIndex === 0 || !hasPlayer;

	return (

		<DataPageLayout playerPromptType='recommend' pageTitle='Items' demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet']}>
			<React.Fragment>
			{hasPlayer &&
			<Step.Group>
				<Step active={allActive} onClick={() => setActiveTabIndex(0)}>
					<Step.Content>
						<Step.Title>All Items</Step.Title>
						<Step.Description>Overview of all items in the game.</Step.Description>
					</Step.Content>
				</Step>

				{hasPlayer && <Step active={!allActive} onClick={() => setActiveTabIndex(1)}>
					<Step.Content>
						<Step.Title>Owned Items</Step.Title>
						<Step.Description>Overview of all items owned (and also needed) by the player.</Step.Description>
					</Step.Content>
				</Step>}
			</Step.Group>}

			<ItemsComponent noRender={!allActive} />
			<ProfileItems noRender={allActive} />

			</React.Fragment>
		</DataPageLayout>
	);
};



interface ItemsComponentProps {
	noRender?: boolean;
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
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	private inited: boolean;

	constructor(props: ItemsComponentProps) {
		super(props);

		this.state = {
			crew: undefined,
			items: undefined
		};
	}

	componentDidUpdate(prevProps: Readonly<ItemsComponentProps>, prevState: Readonly<ItemsComponentState>, snapshot?: any): void {
		if (!this.inited) {
			this.initData();
		}
	}

	componentDidMount() {
		this.initData();
	}	

	private initData() {

		const { items: origItems, crew: origCrew } = this.context.core;
		let crew = JSON.parse(JSON.stringify(origCrew)) as PlayerCrew[];
		let items = JSON.parse(JSON.stringify(origItems.filter(f => !f.isReward))) as EquipmentItem[];
		items = items.filter(item => item.imageUrl && item.imageUrl !== '');
		let origpos = items.map(item => item.symbol);

		// Fill in something useful for flavor where it's missing
		items.forEach(item => {
			if (!item.flavor) {
				if (item.type === 2 && (!item.item_sources || item.item_sources.length === 0) && !item.recipe) {
					// Most likely a galaxy item
					item.flavor = 'Unused or Galaxy Event item';
				}
			}
		});
		
		
		items.sort((a, b) => a.symbol.localeCompare(b.symbol));
  		let crewLevels: { [key: string]: Set<string>; } = {};
		
		crew.forEach(cr => {
			cr.equipment_slots.forEach(es => {
				let item = binaryLocate(es.symbol, items);
				if (item) {
					crewLevels[es.symbol] ??= new Set();
					crewLevels[es.symbol].add(cr.name);
				}
			});
		});

		for (let symbol in crewLevels) {
			if (crewLevels[symbol] && crewLevels[symbol].size > 0) {
				let item = binaryLocate(symbol, items);
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
			let item = binaryLocate(symbol, items);
			if (item) itemsFinal.push(item as EquipmentItem);
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
		const { playerData } = this.context.player;
		const { items } = this.state;

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
								allItems={items}
								allCrew={this.context.core.crew}
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
		if (this.props.noRender) return <></>
		return (<>
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
