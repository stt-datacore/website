import React, { Component } from 'react';
import { Header, Message, Grid, Icon } from 'semantic-ui-react';

import ItemDisplay from '../components/itemdisplay';
import { mergeItems } from '../utils/itemutils';
import { mergeShips } from '../utils/shiputils';
import { PlayerData } from '../model/player';
import { EquipmentCommon } from '../model/equipment';
import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';
import { ItemHoverStat } from './hovering/itemhoverstat';


type UnneededItemsProps = {
};

type UnneededItemsState = {
	fuelschematics: EquipmentCommon[];
	fuelspecific: EquipmentCommon[];
	fuelgeneric: EquipmentCommon[];
};

class UnneededItems extends Component<UnneededItemsProps, UnneededItemsState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

	constructor(props: UnneededItemsProps | Readonly<UnneededItemsProps>) {
		super(props);

		this.state = {
			fuelschematics: [],
			fuelspecific: [],
			fuelgeneric: []
		};
	}

	async componentDidMount() {
		const { playerData } = this.context.player;

		const [itemsResponse, shipsResponse] = await Promise.all([
			fetch('/structured/items.json'),
			fetch('/structured/ship_schematics.json')
		]);

		const allitems = await itemsResponse.json();
		const allships = await shipsResponse.json();

		let items = mergeItems((playerData?.player.character.items ?? []) as EquipmentCommon[], allitems);
		let ships = mergeShips(allships, playerData?.player.character.ships ?? []);

		// Calculate unneeded schematics
		let maxedShips = ships.filter(
			ship => ship.level === ship.max_level
		);
		let fuelschematics = items.filter(
			item => maxedShips.some((ship) => {
				if (ship.symbol+'_schematic' === item.symbol) {
					item.rarity = ship.rarity;	// Use ship rarity instead of schematic item rarity
					return true;
				}
			})
		).sort((a, b) => {
			if (a.rarity == b.rarity)
				return a.name.localeCompare(b.name);
			return b.rarity - a.rarity;
		});

		// Only consider equipment of fully-equipped crew as potential fodder
		//	Assume all equipment items of other crew are still needed
		let equipmentEquipped = new Set();
		let equipmentNeeded = new Set();
		// Handle dupes as either all fully-equipped or as all needing items
		let crewBySymbol = [] as string[];
		playerData?.player.character.crew.forEach(crew => {
			if (crewBySymbol.indexOf(crew.symbol) == -1) crewBySymbol.push(crew.symbol);
		});
		crewBySymbol.forEach(crewSymbol => {
			const crewList = playerData?.player.character.crew.filter(crew => crew.symbol === crewSymbol) ?? [];
			let allFullyEquipped = true;
			crewList.forEach(crew => {
				if (crew.level < 99 || (crew.equipment && crew.equipment?.length < 4))
					allFullyEquipped = false;
			});
			const crew = crewList[0];
			crew.equipment_slots.forEach(equipment => {
				if (allFullyEquipped)
					equipmentEquipped.add(equipment.symbol);
				else
					equipmentNeeded.add(equipment.symbol);
			});
		});

		// Calculate all replicator fodder
		let fuellist = items.filter(
			item => equipmentEquipped.has(item.symbol) &&
					!equipmentNeeded.has(item.symbol)
		).sort((a, b) => {
			if (a.rarity == b.rarity)
				return a.name.localeCompare(b.name);
			return b.rarity - a.rarity;
		});

		// Should probably regex this
		//	Fancy apostrophe check needed for some crew
		const isSpecificItem = (name) =>
			name.indexOf("'s ") > 0 ||
			name.indexOf("s' ") > 0 ||
			name.indexOf("’s ") > 0 ||
			name.indexOf("s’ ") > 0;

		// Assume needed if a higher quality item of same name is needed
		const needsHigherQuality = (symbol, rarity) => {
			let needsHigher = false;
			for (let i = rarity + 1; i <= 5; i++) {
				if (equipmentNeeded.has(symbol.replace(/quality\d/, 'quality'+i))) {
					needsHigher = true;
					break;
				}
			}
			return needsHigher;
		};

		// Filter crew-specific items
		let fuelspecific = fuellist.filter(
			item => isSpecificItem(item.name) && !needsHigherQuality(item.symbol, item.rarity)
		);

		// Filter generic items
		let fuelgeneric = fuellist.filter(
			item =>
				item.quantity === 1 && item.rarity > 1 &&
				!isSpecificItem(item.name) &&
				!needsHigherQuality(item.symbol, item.rarity)
		);

		this.setState({ fuelschematics, fuelspecific, fuelgeneric });
	}

	render() {
		const { playerData } = this.context.player;
		const { items } = this.context.core;
		const pitems = (!!items && !!playerData?.player?.character?.items?.length) ? mergeItems(playerData.player.character.items, items) : undefined;
		let itemCount = playerData?.player.character.items.length ?? 0;
		let itemLimit = 1000, itemWarning = .9*itemLimit;
		// Hardcoded limit works now, but if the game increases limit, we'll have to update
		//	We should get this from playerData.player.character.item_limit, but it's not in preparedProfileData

		const wikiLink = itemName => {
			return 'https://sttwiki.org/wiki/'+itemName.replace(/\s/g,'_').replace(/’/g,'\'');
		};

		return (
			<div>
				{itemCount > itemWarning && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {itemLimit} the game starts randomly losing
							items; go and replicate away some of the items suggested below.
						</p>
					</Message>
				)}

				{this.state.fuelschematics.length > 0 && (
					<React.Fragment>
						<Header as='h4'>Ship Schematics ({this.state.fuelschematics.length})</Header>
						<p>The following ship schematics are safe to discard as they are used to upgrade <b>ships you have already maxed</b>.</p>
						<ItemHoverStat targetGroup='unneeded_items' />
						<Grid columns={5} centered padded>
							{this.state.fuelschematics.map((item, idx) => (
								<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
									<div style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "top",
										alignItems: "center",
									}}>
									<ItemDisplay
										targetGroup='unneeded_items'
										playerData={playerData}
										allItems={pitems}
										itemSymbol={item.symbol}
										src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
										size={64}
										maxRarity={item.rarity}
										rarity={item.rarity}
									/>
									<p>{item.name}<br /><i>({item.quantity} Owned)</i></p>
									
									</div>
								</Grid.Column>
							))}
						</Grid>
					</React.Fragment>
				)}

				{this.state.fuelspecific.length > 0 && (
					<React.Fragment>
						<Header as='h4'>Crew-Specific Equipment ({this.state.fuelspecific.length})</Header>
						<p>The following equipment items are good candidates to discard as they are used to equip <b>specific crew you have already fully equipped</b>. Note: some items listed here might be useful for crew who are not on your current roster, or as building blocks of other needed equipment. Click an item name to consult the wiki for more information about the equipment.</p>
						<Grid columns={5} centered padded>
							{this.state.fuelspecific.map((item, idx) => (
								<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
									<div style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "top",
										alignItems: "center",
									}}>
									<ItemDisplay
										targetGroup='unneeded_items'
										playerData={playerData}
										allItems={pitems}
										itemSymbol={item.symbol}
										src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
										size={64}
										maxRarity={item.rarity}
										rarity={item.rarity}
									/>
									<p><a href={wikiLink(item.name)}>{item.name}</a><br /><i>({item.quantity} Owned)</i></p>
									</div>
								</Grid.Column>
							))}
						</Grid>
					</React.Fragment>
				)}

				{this.state.fuelgeneric.length > 0 && (
					<React.Fragment>
						<Header as='h4'>Other Equipment ({this.state.fuelgeneric.length})</Header>
						<p>The following equipment items are other candidates to discard as they are <b>no longer needed for any crew on your current roster</b>. Note: some items listed here might be useful for crew who are not on your current roster, or as building blocks of other needed equipment. Click an item name to consult the wiki for more information about the equipment.</p>
						<Grid columns={5} centered padded>
							{this.state.fuelgeneric.map((item, idx) => (
								<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
									<div style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "top",
										alignItems: "center",
									}}>
									<ItemDisplay
										targetGroup='unneeded_items'
										playerData={playerData}
										allItems={pitems}
										itemSymbol={item.symbol}
										src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
										size={64}
										maxRarity={item.rarity}
										rarity={item.rarity}
									/>									
									<p><a href={wikiLink(item.name)}>{item.name}</a><br /><i>({item.quantity} Owned)</i></p>
									</div>
								</Grid.Column>
							))}
						</Grid>
					</React.Fragment>
				)}
			</div>
		);
	}
}

export default UnneededItems;