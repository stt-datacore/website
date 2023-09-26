import React, { Component } from 'react';
import { Header, Message, Icon, Rating, Image, Popup, Grid } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import Layout from '../components/layout';
import ItemSources from '../components/itemsources';
import ItemDisplay from '../components/itemdisplay';
import CONFIG from '../components/CONFIG';
import { Demand, PlayerCrew, PlayerData } from '../model/player';
import { IDemand } from '../utils/equipment';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { BuffStatTable } from '../utils/voyageutils';
import { ComputedBuff, CrewMember, Skill } from '../model/crew';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import { appelate } from '../utils/misc';
import { prepareProfileData } from '../utils/crewutils';
import ProfileItems from '../components/profile_items';
import { ShipHoverStat, ShipTarget } from '../components/hovering/shiphoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { getItemBonuses, populateItemCadetSources } from '../utils/itemutils';
import { renderBonuses } from '../components/item_presenters/item_presenter';


export interface EquipmentItemData {
	item: EquipmentItem;
	crew_levels: { crew: PlayerCrew, level: number }[];
	builds: EquipmentItem[];
}

interface ItemInfoPageProps {};

interface ItemInfoComponentProps {
	isReady: boolean;
};

interface ItemInfoComponentState {
	item_data?: EquipmentItemData;
	errorMessage?: string;
	items?: EquipmentItem[];
};

const ItemInfoPage = () => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items', 'ship_schematics', 'cadet']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	let playerData: PlayerData | undefined = undefined;
	
	const cadetforitem = isReady ? coreData?.cadet?.filter(f => f.cadet) : undefined;

	if (isReady && cadetforitem?.length) {
		populateItemCadetSources(coreData.items, cadetforitem);
	}

	if (isReady && strippedPlayerData && strippedPlayerData.stripped && strippedPlayerData?.player?.character?.crew?.length) {
		playerData = JSON.parse(JSON.stringify(strippedPlayerData));
		if (playerData) prepareProfileData("ITEM_INFO", coreData.crew, playerData, new Date());
	}

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
						playerData: playerData ?? {} as PlayerData,
						buffConfig: buffConfig,
						maxBuffs: maxBuffs,
						items: coreData.items,
						allShips: coreData.ships
					}}>
						<ItemInfoComponent isReady={isReady} />
					</MergedContext.Provider>
				</React.Fragment>
			}

		</Layout>
	);

}


class ItemInfoComponent extends Component<ItemInfoComponentProps, ItemInfoComponentState> {
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	
	private inited: boolean = false;

	constructor(props: ItemInfoComponentProps) {
		super(props);
		window.addEventListener('popstate', (e) => {
			this.inited = false;
			this.initData();
		});
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
	
	private changeComponent(symbol: string) {
		navigate("/item_info?symbol="+symbol, { replace: false });
		this.inited = false;
		this.initData(symbol);
	}

	private initData(symbol?: string) {
		let urlParams = new URLSearchParams(window.location.search);
		const { allCrew: allcrew, items } = this.context;
		let item_symbol = symbol;
		if (!symbol && urlParams.has('symbol')) {
			item_symbol = urlParams.get('symbol') ?? undefined;
		}
		if (item_symbol){
			let item = items?.find(entry => entry.symbol === item_symbol);

			let crew_levels = [] as { crew: PlayerCrew, level: number }[];
			allcrew.forEach(crew => {
				crew.equipment_slots.forEach(es => {
					if (es.symbol === item_symbol) {
						crew_levels.push({
							crew: crew as PlayerCrew,
							level: es.level
						});
					}
				});
			});

			// Find other items' whose recipes use this one
			let builds = [] as EquipmentItem[];

			items?.forEach(it => {
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
	
	private haveCount(symbol: string) {
		const { playerData } = this.context;
		return playerData?.player?.character?.items?.find(f => f.symbol === symbol)?.quantity ?? 0;
	}

	render() {
		const { errorMessage, item_data } = this.state;
		const { items, playerData } = this.context;

		if (item_data === undefined || errorMessage !== undefined) {
			return (
				<Layout title='Item information'>
					<Header as="h3">Item information</Header>
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

		// console.log(item_data);

		const { bonuses, bonusText } = getItemBonuses(item_data.item);

		// TODO: share this code with equipment.ts
		let demands = [] as IDemand[];
		if (item_data.item.recipe) {
			for (let iter of item_data.item.recipe.list) {
				let recipeEquipment = items?.find(item => item.symbol === iter.symbol);
				if (recipeEquipment) {
					demands.push({
						crewSymbols: [],
						count: iter.count,
						symbol: iter.symbol,
						equipment: recipeEquipment,
						factionOnly: iter.factionOnly,
						have: 0
					});
				}
			}
		}
		if (item_data.item.type === 14) {
			console.log(item_data);
		}
		
		
		const haveCount = this.haveCount(item_data.item.symbol);
		const ship = item_data.item.type === 8 ? this.context.allShips?.find(f => f.symbol === item_data.item.symbol.replace("_schematic", "")) : undefined;

		return (
				<div>

					<CrewHoverStat targetGroup='item_info' />
					<ShipHoverStat targetGroup='item_info_ships' />
					<ItemHoverStat navigate={(symbol) => this.changeComponent(symbol)} targetGroup='item_info_items' />

					<div style={{
						paddingTop:"2em",
						marginBottom: "1em",
						display:"flex",
						alignItems:"center",
						justifyContent:"center",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
					}}>
						<ItemDisplay
							targetGroup='item_info_items'
							playerData={playerData}
							allItems={items}
							itemSymbol={item_data.item.symbol}
							style={{
								margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '0 0 0.25em 0' : '0.25em 0 0 0'
							}}
							src={`${process.env.GATSBY_ASSETS_URL}${item_data.item.imageUrl}`}
							size={128}
							rarity={item_data?.item.rarity ?? 0}
							maxRarity={item_data?.item.rarity ?? 0}
							/>
						<div style={{display:"flex",
							flexDirection: "column",
							justifyContent: "space-evenly",
							alignItems: "left"
							}}>
							<Header style={{
								margin: 0, 
								marginLeft: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 0 : "0.5em",
								textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'center' : 'left'
								}} as="h2">{item_data.item.name}</Header>
							<div style={{marginLeft:"0.75em"}}>{!!bonusText?.length && renderBonuses(bonuses)}</div>
							{!!haveCount && <div style={{margin: 0, marginLeft: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 0 : "1em", color:"lightgreen"}}>OWNED ({haveCount})</div>}
						</div>
					
					</div>
					{item_data?.item.flavor && <div style={{textAlign: 'center', fontStyle: "italic", width:"100%"}}>{item_data.item.flavor}</div>}
				<br />

				{item_data.item.type === 8 && !!ship &&
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center"}}>
						<ShipTarget inputItem={ship} targetGroup='item_info_ships'>
							<Link to={`/playertools?tool=ship&ship=${ship.symbol}`}>
								<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center"}}>
								<ItemDisplay 
									src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
									size={128}
									rarity={ship.rarity}
									maxRarity={ship.rarity}
									/>
									{ship.name}
								</div>
							</Link>
						</ShipTarget>
						
					</div>}

				{!!item_data.item.recipe && !!item_data.item.recipe.list?.length && (
					<div>
						<Header as="h3">Craft it for <img title={"Chronotons"} style={{width: "1.5em", margin: 0, padding: 0, marginBottom: "2px"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} /> {item_data.item.recipe.craftCost.toLocaleString()} using this recipe:</Header>
						<Grid columns={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 1 : 3} padded>
							{demands.map((entry, idx) => {
								if (!entry.equipment) return <></>
								return <Grid.Column key={idx}>
									<Popup
										trigger={
											<Header
												style={{ display: 'flex', cursor: 'zoom-in' }}
												icon={
													<ItemDisplay
														playerData={playerData}
														itemSymbol={entry.equipment.symbol}
														allItems={this.context.items}
														targetGroup='item_info_items'
														style={{ marginRight: "0.5em"}}
														src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
														size={48}
														maxRarity={entry.equipment.rarity}
														rarity={entry.equipment.rarity}
													/>
												}
												content={entry.equipment.name}
												subheader={`Need ${entry.count} ${playerData?.player ? "(Have " + this.haveCount(entry.equipment.symbol) + ")" : ""} ${entry.factionOnly ? ' (Faction Only)' : ''}`}
											/>
										}
										header={
											<a style={{cursor: "pointer"}} onClick={(e) => this.changeComponent(entry.symbol)}>
												{CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
											</a>
										}
										content={<ItemSources item_sources={entry.equipment.item_sources} />}
										on="click"
										wide
									/>
								</Grid.Column>
								})}
						</Grid>
						<br />

					</div>
				)}

				{!!(item_data.item.item_sources.length > 0) && (
					<div>
						<Header as="h3">Item sources:</Header>
						<ItemSources item_sources={item_data.item.item_sources} />
						<br />
					</div>
				)}

				{item_data.crew_levels.length > 0 && (
					<div>
						<Header as="h3">Equippable by this crew:</Header>
						<Grid columns={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 1 : 3}  padded>
							{item_data.crew_levels.map((entry, idx) => (
								<Grid.Column key={idx}>
									<Header
										style={{ display: 'flex' }}
										icon={
											<div style={{marginRight:"0.5em"}}>
											<ItemDisplay
												targetGroup='item_info'
												allCrew={this.context.allCrew}
												playerData={this.context.playerData}						
												itemSymbol={entry.crew.symbol}											
												src={`${process.env.GATSBY_ASSETS_URL}${entry.crew.imageUrlPortrait}`}
												size={60}
												maxRarity={entry.crew.max_rarity}
												rarity={entry.crew.rarity ?? entry.crew.max_rarity ?? 0}
											/>
											</div>
										}
										content={<Link to={`/crew/${entry.crew.symbol}/`}>{entry.crew.name}</Link>}
										subheader={`Level ${entry.level}`}
									/>
								</Grid.Column>
							))}
						</Grid>
						<br />
					</div>
				)}

				{item_data.builds.length > 0 && (
					<div>
						<Header as="h3">Is used to build these:</Header>
						<ProfileItems pageName='item_info' hideOwnedInfo={true} data={item_data.builds} navigate={(symbol) => this.changeComponent(symbol)} />
						{/* <Grid columns={3} padded>
							{item_data.builds.map((entry, idx) => (
								<Grid.Column key={idx}>
									<Header
										style={{ display: 'flex', cursor: 'zoom-in' }}
										icon={
											<div style={{marginRight:"0.5em"}}>
											<ItemDisplay
												src={`${process.env.GATSBY_ASSETS_URL}${entry.imageUrl}`}
												size={48}
												maxRarity={entry.rarity}
												rarity={entry.rarity}
											/>
											</div>
										}
										content={
											<a onClick={(e) => this.changeComponent(entry.symbol)}>
												{CONFIG.RARITIES[entry.rarity].name + ' ' + entry.name}
											</a>
										}
									/>
								</Grid.Column>
							))}
						</Grid> */}
					</div>
				)}
				</div>
		);
	}
}

export default ItemInfoPage;
