import React, { Component } from 'react';
import { Header, Message, Icon, Rating, Image, Popup, Grid } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import ItemSources from '../components/itemsources';
import ItemDisplay from '../components/itemdisplay';
import CONFIG from '../components/CONFIG';
import { Demand, PlayerCrew, PlayerData } from '../model/player';
import { IDemand } from '../utils/equipment';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { DataContext } from '../context/datacontext';
import { GlobalContext } from '../context/globalcontext';
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
import DataPageLayout from '../components/page/datapagelayout';
import { formatDuration, getItemBonuses, populateItemCadetSources } from '../utils/itemutils';
import { renderBonuses } from '../components/item_presenters/item_presenter';


export interface EquipmentItemData {
	item: EquipmentItem;
	crew_levels: { crew: PlayerCrew, level: number }[];
	builds: EquipmentItem[];
}

interface ItemInfoPageProps {};

interface ItemInfoComponentProps {
	setHeader: (value: string) => void;	
	isReady?: boolean;
};

interface ItemInfoComponentState {
	item_data?: EquipmentItemData;
	errorMessage?: string;
	items?: EquipmentItem[];
};

const ItemInfoPage = () => {
	
	const isReady = true;
	const [header, setHeader] = React.useState<string | undefined>('');

	return (
		<DataPageLayout demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet']}>
			<ItemInfoComponent isReady={isReady} setHeader={setHeader} />
		</DataPageLayout>

	);

}


class ItemInfoComponent extends Component<ItemInfoComponentProps, ItemInfoComponentState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	
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
		if (!this.inited) {
			this.initData();
		}
	}

	componentDidMount() {
		this.initData();
	}
	
	private changeComponent(symbol: string) {
		navigate("/item_info?symbol="+symbol, { replace: false });
		this.inited = false;
		this.initData(symbol);
	}

	private initData(symbol?: string) {
		let urlParams = new URLSearchParams(window.location.search);
		const { crew: allcrew, items } = this.context.core;
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
						if (this.context.player.playerData) {
							let owned = this.context.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
				
							crew_levels.push({
								crew: { ...crew as PlayerCrew, ...owned, rarity: owned?.rarity ?? 0 },
								level: es.level
							});
						}
						else {
							crew_levels.push({
								crew: { ...crew as PlayerCrew },
								level: es.level
							});
						}
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
				this.props.setHeader(item.name);
				this.inited = true;
			}				
		}

	}
	
	private haveCount(symbol: string) {
		const { playerData } = this.context.player;
		return playerData?.player?.character?.items?.find(f => f.symbol === symbol)?.quantity ?? 0;
	}

	render() {
		const { errorMessage, item_data } = this.state;
		const { playerData } = this.context.player;
		const { items } = this.context.core;

		if (item_data === undefined || errorMessage !== undefined) {
			return (
				<>
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
				</>
			);
		}

		console.log(item_data);

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
		
		const haveCount = this.haveCount(item_data.item.symbol);
		const ship = item_data.item.type === 8 ? this.context.core.ships?.find(f => f.symbol === item_data.item.symbol.replace("_schematic", "")) : undefined;
		const builds = item_data.builds;

		if (item_data.item.kwipment) {
			item_data.crew_levels = this.context.core.crew.filter(f => {
				let rr = item_data.item.max_rarity_requirement === f.max_rarity;

				if (item_data.item.traits_requirement) {
					if (item_data.item.traits_requirement_operator === "and") {
						return rr && item_data.item.traits_requirement?.every(t => f.traits.includes(t) || f.traits_hidden.includes(t));
					}
					else {
						return rr && item_data.item.traits_requirement?.some(t => f.traits.includes(t) || f.traits_hidden.includes(t));
					}
				}
				return rr;
			}).map(crew => {
				if (this.context.player.playerData) {
					let owned = this.context.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
					return {
						crew: { ...crew as PlayerCrew, ...owned, rarity: owned?.rarity ?? 0 },
						level: 100
					}
				}
				else {
					return {
						crew: crew as PlayerCrew,
						level: 100
					}
				}
			})
		}

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
							{!!item_data.item.duration && 
							<div
								style={{
									textAlign: "left",
									//fontStyle: "italic",
									fontSize: "1em",
									marginTop: "2px",
									marginBottom: "4px",
									marginLeft: "0.75em"
								}}
								>
								<div><b>Duration:</b></div>
								<i>{formatDuration(item_data.item.duration)}</i>
							</div>}
							{!!item_data.item.kwipment && !!item_data.item.traits_requirement?.length &&
								<div
									style={{
										textAlign: "left",
										//fontStyle: "italic",
										fontSize: "1em",
										marginTop: "2px",
										marginBottom: "4px",
										marginLeft: "0.75em"
									}}
									>
									<div><b>Required Traits:</b></div>
									<i>{item_data.item.traits_requirement?.map(t => appelate(t)).join(` ${item_data.item.traits_requirement_operator} `)}</i>
								</div>}
						</div>
					
					</div>
					{item_data?.item.flavor && <div style={{textAlign: 'center', fontStyle: "italic", width:"100%"}}>{item_data.item.flavor?.replace(/\<b\>/g, '').replace(/\<\/b\>/g, '')}</div>}
				<br />

				{item_data.item.type === 8 && !!ship &&
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center"}}>
						<ShipTarget inputItem={ship} targetGroup='item_info_ships'>
							<Link to={`/ship_info?ship=${ship.symbol}`}>
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
														allItems={this.context.core.items}
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
												allCrew={this.context.core.crew}
												playerData={this.context.player.playerData}						
												itemSymbol={entry.crew.symbol}											
												src={`${process.env.GATSBY_ASSETS_URL}${entry.crew.imageUrlPortrait}`}
												size={60}
												maxRarity={entry.crew.max_rarity}
												rarity={entry.crew.rarity ?? entry.crew.max_rarity ?? 0}
											/>
											</div>
										}
										content={<Link to={`/crew/${entry.crew.symbol}/`}>{entry.crew.name}</Link>}
										subheader={!!item_data.item.kwipment ? 'Post Immortalization' : `Level ${entry.level}`}
									/>
								</Grid.Column>
							))}
						</Grid>
						<br />
					</div>
				)}

				{!!builds && builds.length > 0 && (
					<div>
						<Header as="h3">Is used to build these:</Header>
						<ProfileItems pageName='item_info' noWorker={true} hideOwnedInfo={true} data={builds} navigate={(symbol) => this.changeComponent(symbol)} />
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
