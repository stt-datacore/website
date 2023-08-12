import React, { Component } from 'react';
import { Header, Message, Icon, Rating, Image, Popup, Grid } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

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
import { ComputedBuff, CrewMember, Skill } from '../model/crew';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import { appelate } from '../utils/misc';
import { prepareProfileData } from '../utils/crewutils';
import ProfileItems from '../components/profile_items';

interface ItemInfoPageProps {};

interface ItemInfoComponentProps {
	isReady: boolean;
};

interface ItemInfoComponentState {
	item_data?: any;
	errorMessage?: string;
	items?: EquipmentItem[];
};


const ItemInfoPage = () => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	let playerData: PlayerData | undefined = undefined;

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
						items: coreData.items
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
		navigate("/item_info?symbol="+symbol, { replace: true });
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
	
	renderBonuses(skills: { [key: string]: Skill }) {

		return (<div style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-evenly",
			alignItems: "left"
		}}>
			{Object.values(skills).map(((skill, idx) => {
				const atext = appelate(skill.skill ?? "").replace("_", " ");
				return (
					<div
						title={atext}
						key={(skill.skill ?? "") + idx}
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "flex-start",
							alignItems: "center",
							alignContent: "center"
						}}
					>
						<div style={{width: "2em"}}>
						<img style={{ maxHeight: "2em", maxWidth: "2em", margin: "0.5em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} />
						</div>
						<h4 style={{ margin: "0.5em"}} >+{skill.core ?? 0} +({skill.range_min ?? 0}-{skill.range_max ?? 0})</h4>
						<h4 style={{ margin: "0.5em"}} >{atext}</h4>
					</div>)
			}))}
		</div>)
	}
	
	private haveCount(symbol: string) {
		const { playerData } = this.context;
		return playerData?.player?.character?.items?.find(f => f.symbol === symbol)?.quantity ?? null;
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

		let bonusText = [] as string[];
		let bonuses = {} as { [key: string]: Skill };

		if (item_data.item.bonuses) {
			for (let [key, value] of Object.entries(item_data.item.bonuses)) {
				let bonus = CONFIG.STATS_CONFIG[Number.parseInt(key)];
				if (bonus) {
					bonusText.push(`+${value} ${bonus.symbol}`);	
					bonuses[bonus.skill] ??= {} as Skill;
					bonuses[bonus.skill][bonus.stat] = value;				
					bonuses[bonus.skill].skill = bonus.skill;
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
				if (recipeEquipment) {
					demands.push({
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
		return (
				<div>

					<CrewHoverStat targetGroup='item_info' />
					
					<div style={{
						paddingTop:"2em",
						marginBottom: "1em",
						display:"flex",
						alignItems:"center",
						justifyContent:"center",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
					}}>
						<ItemDisplay
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
							<Header style={{margin: 0, marginLeft: "0.5em"}} as="h2">{item_data.item.name}</Header>
							{!!bonusText?.length && this.renderBonuses(bonuses)}
							{!!haveCount && <div style={{margin: 0, marginLeft: "1em", color:"lightgreen"}}>OWNED ({haveCount})</div>}
						</div>
					
					</div>

				<br />

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
												crewSymbol={entry.crew.symbol}											
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
						<ProfileItems data={item_data.builds} navigate={(symbol) => this.changeComponent(symbol)} />
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
