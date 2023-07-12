import React, { Component } from 'react';
import { Header, Message, Icon, Rating, Image, Popup, Grid } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import ItemSources from '../components/itemsources';
import ItemDisplay from '../components/itemdisplay';
import CONFIG from '../components/CONFIG';
import { Demand, PlayerData } from '../model/player';
import { IDemand } from '../utils/equipment';
import { EquipmentItem } from '../model/equipment';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { BuffStatTable } from '../utils/voyageutils';
import { CrewMember } from '../model/crew';

interface ItemInfoPageProps {};

interface ItemInfoComponentProps {
	isReady: boolean;
};

interface ItemInfoComponentState {
	item_data?: any;
	errorMessage?: string;
	items?: EquipmentItem[];
};

const ItemInfoPage = (props: ItemInfoPageProps) => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	
	let maxBuffs: BuffStatTable | undefined;

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
						<ItemInfoComponent isReady={isReady} />
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);
};



class ItemInfoComponent extends Component<ItemInfoComponentProps, ItemInfoComponentState> {
	static contextType = DataContext;
	context!: React.ContextType<typeof DataContext>;
	
	private inited: boolean = false;

	constructor(props: ItemInfoComponentProps) {
		super(props);

		this.state = {
			errorMessage: undefined,
			item_data: undefined
		};
	}
	componentDidUpdate() {
		if (this.props.isReady && !this.inited) {
			this.initData();
		}
	}

	componentDidMount() {
		if (this.props.isReady) {
			this.initData();
		}
	}

	private initData() {
		let urlParams = new URLSearchParams(window.location.search);
		const { crew: allcrew, items } = this.context;

		if (urlParams.has('symbol')) {
			let item_symbol = urlParams.get('symbol');
			let item = items.find(entry => entry.symbol === item_symbol);

			let crew_levels = [] as { crew: CrewMember, level: number }[];
			allcrew.forEach(crew => {
				crew.equipment_slots.forEach(es => {
					if (es.symbol === item_symbol) {
						crew_levels.push({
							crew: crew,
							level: es.level
						});
					}
				});
			});

			// Find other items' whose recipes use this one
			let builds = [] as EquipmentItem[];

			items.forEach(it => {
				if (it.recipe && it.recipe.list && it.recipe.list.find(entry => entry.symbol === item_symbol)) {
					builds.push(it);
				}
			});

			if (item === undefined) {
				this.setState({ errorMessage: 'Invalid item symbol, or data not yet available for this item.' });
				this.inited = true;
			} else {
				this.setState({ item_data: { item, crew_levels, builds } });
				this.inited = true;
			}				
		}
	}

	render() {
		const { errorMessage, item_data, items } = this.state;

		if (item_data === undefined || errorMessage !== undefined) {
			return (
				<Layout title='Item information'>
					<Header as="h4">Item information</Header>
					{errorMessage && (
						<Message negative>
							<Message.Header>Unable to load item information</Message.Header>
							<pre>{errorMessage.toString()}</pre>
						</Message>
					)}
					{!errorMessage && (
						<div>
							<Icon loading name="spinner" /> Loading...
						</div>
					)}
				</Layout>
			);
		}

		console.log(item_data);

		let bonusText = [] as string[];
		if (item_data.item.bonuses) {
			for (let [key, value] of Object.entries(item_data.item.bonuses)) {
				let bonus = CONFIG.STATS_CONFIG[Number.parseInt(key)];
				if (bonus) {
					bonusText.push(`+${value} ${bonus.symbol}`);
				} else {
					// TODO: what kind of bonus is this?
				}
			}
		}

		// TODO: share this code with equipment.ts
		let demands = [] as IDemand[];
		if (item_data.item.recipe) {
			for (let iter of item_data.item.recipe.list) {
				let recipeEquipment = items?.find(item => item.symbol === iter.symbol);
				demands.push({
					count: iter.count,
					symbol: iter.symbol,
					equipment: recipeEquipment,
					factionOnly: iter.factionOnly,
					have: 0
				});
			}
		}

		return (
			<Layout title={item_data.item.name}>
				<Message icon warning>
					<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
							This section is under development and not fully functional yet.
						</Message.Content>
					</Message>
				<Header as="h3">
					{item_data.item.name}{' '}
					<Rating icon='star' rating={item_data.item.rarity} maxRating={item_data.item.rarity} size="large" disabled />
				</Header>
				<Image size="small" src={`${process.env.GATSBY_ASSETS_URL}${item_data.item.imageUrl}`} />

				<br />

				{bonusText.length > 0 && (
					<div>
						<p>Bonuses: {bonusText.join(', ')}</p>
						<br />
					</div>
				)}

				{item_data.item.recipe && item_data.item.recipe.list && (
					<div>
						<Header as="h4">Craft it for {item_data.item.recipe.craftCost} chrons using this recipe:</Header>
						<Grid columns={3} padded>
							{demands.map((entry, idx) => {
								if (!entry.equipment) return <></>
								return <Grid.Column key={idx}>
									<Popup
										trigger={
											<Header
												style={{ display: 'flex', cursor: 'zoom-in' }}
												icon={
													<ItemDisplay
														src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
														size={48}
														maxRarity={entry.equipment.rarity}
														rarity={entry.equipment.rarity}
													/>
												}
												content={entry.equipment.name}
												subheader={`Need ${entry.count} ${entry.factionOnly ? ' (FACTION)' : ''}`}
											/>
										}
										header={
											<Link to={`/item_info?symbol=${entry.symbol}`}>
												{CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
											</Link>
										}
										content={<ItemSources item_sources={entry.equipment.item_sources} />}
										on="click"
										wide
									/>
								</Grid.Column>
								})}
						</Grid>
					</div>
				)}

				{item_data.item.item_sources.length > 0 && (
					<div>
						<Header as="h4">Item sources</Header>
						<ItemSources item_sources={item_data.item.item_sources} />
						<br />
					</div>
				)}

				{item_data.crew_levels.length > 0 && (
					<div>
						<Header as="h4">Equippable by this crew:</Header>
						<Grid columns={3} padded>
							{item_data.crew_levels.map((entry, idx) => (
								<Grid.Column key={idx}>
									<Header
										style={{ display: 'flex' }}
										icon={
											<ItemDisplay
												src={`${process.env.GATSBY_ASSETS_URL}${entry.crew.imageUrlPortrait}`}
												size={60}
												maxRarity={entry.crew.max_rarity}
												rarity={entry.crew.max_rarity}
											/>
										}
										content={<Link to={`/crew/${entry.crew.symbol}/`}>{entry.crew.name}</Link>}
										subheader={`Level ${entry.level}`}
									/>
								</Grid.Column>
							))}
						</Grid>
					</div>
				)}

				{item_data.builds.length > 0 && (
					<div>
						<Header as="h4">Is used to build these</Header>
						<Grid columns={3} padded>
							{item_data.builds.map((entry, idx) => (
								<Grid.Column key={idx}>
									<Header
										style={{ display: 'flex', cursor: 'zoom-in' }}
										icon={
											<ItemDisplay
												src={`${process.env.GATSBY_ASSETS_URL}${entry.imageUrl}`}
												size={48}
												maxRarity={entry.rarity}
												rarity={entry.rarity}
											/>
										}
										content={
											<Link to={`/item_info?symbol=${entry.symbol}`}>
												{CONFIG.RARITIES[entry.rarity].name + ' ' + entry.name}
											</Link>
										}
									/>
								</Grid.Column>
							))}
						</Grid>
					</div>
				)}
			</Layout>
		);
	}
}

export default ItemInfoPage;
