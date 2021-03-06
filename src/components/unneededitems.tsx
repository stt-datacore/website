import React, { Component } from 'react';
import { Header, Message, Grid, Icon } from 'semantic-ui-react';

import ItemDisplay from '../components/itemdisplay';
import { mergeItems } from '../utils/itemutils';
import { mergeShips } from '../utils/shiputils';


type UnneededItemsProps = {
	playerData: any;
};

type UnneededItemsState = {
	fuelschematics: any[];
	fuelspecific: any[];
	fuelgeneric: any[];
};

class UnneededItems extends Component<UnneededItemsProps, UnneededItemsState> {
	constructor(props) {
		super(props);

		this.state = {
			fuelschematics: [],
			fuelspecific: [],
			fuelgeneric: []
		};
	}

	async componentDidMount() {
		const { playerData } = this.props;

		const [itemsResponse, shipsResponse] = await Promise.all([
			fetch('/structured/items.json'),
			fetch('/structured/ship_schematics.json')
		]);

		const allitems = await itemsResponse.json();
		const allships = await shipsResponse.json();

		let items = mergeItems(playerData.player.character.items, allitems);
		let ships = mergeShips(allships, playerData.player.character.ships);

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
		);

		// Calculate all replicator fodder
		// 	Only consider equipment of already immortalized crew as fodder
		//	This may miss out on items for crew who are mid-level (or even fully equipped Lvl 99s)
		let equipmentAlreadyOnCrew = new Set();
		let equipmentNeededByCrew = new Set();
		playerData.player.character.crew.forEach(crew => {
			crew.equipment_slots.forEach(equipment => {
				if (crew.immortal > 0)
					equipmentAlreadyOnCrew.add(equipment.symbol);
				else
					equipmentNeededByCrew.add(equipment.symbol);
			});
		});
		let fuellist = items.filter(
			item => equipmentAlreadyOnCrew.has(item.symbol) &&
					!equipmentNeededByCrew.has(item.symbol)
		);

		// Should probably regex this
		//	Fancy apostrophe check needed for some crew
		const isSpecificItem = (name) =>
			name.indexOf("'s ") > 0 ||
			name.indexOf("s' ") > 0 ||
			name.indexOf("’s ") > 0 ||
			name.indexOf("s’ ") > 0;

		// Filter crew-specific items
		let fuelspecific = fuellist.filter(
			item => isSpecificItem(item.name)
		);

		// Filter generic items
		let fuelgeneric = fuellist.filter(
			item =>
				item.quantity === 1 && item.rarity > 1 &&
				!isSpecificItem(item.name)
		);

		this.setState({ fuelschematics, fuelspecific, fuelgeneric });
	}

	render() {
		const { playerData } = this.props;

		let itemCount = playerData.player.character.items.length;
		let itemLimit = 1000, itemWarning = .9*itemLimit;
		// Hardcoded limit works now, but if the game increases limit, we'll have to update
		//	We should get this from playerData.player.character.item_limit, but it's not in preparedProfileData

		return (
			<div>
				{itemCount > itemWarning && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {itemLimit} the game starts randomly losing
							items; go and replicate away some unnecessary stuff.
						</p>
					</Message>
				)}

				<Header as='h4'>Here are {this.state.fuelschematics.length} items that you don't need (used to upgrade ships you already maxed):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuelschematics.map((item, idx) => (
						<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
								size={64}
								maxRarity={item.rarity}
								rarity={item.rarity}
							/>
							<p>{item.name}</p>
						</Grid.Column>
					))}
				</Grid>

				<Header as='h4'>Here are {this.state.fuelspecific.length} items that you don't need (used to equip specific crew you already equipped):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuelspecific.map((item, idx) => (
						<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
								size={64}
								maxRarity={item.rarity}
								rarity={item.rarity}
							/>
							<p>{item.name}</p>
						</Grid.Column>
					))}
				</Grid>

				<Header as='h4'>Here are {this.state.fuelgeneric.length} items that you don't need now, but might be useful in the future:</Header>
				<Grid columns={5} centered padded>
					{this.state.fuelgeneric.map((item, idx) => (
						<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
								size={64}
								maxRarity={item.rarity}
								rarity={item.rarity}
							/>
							<p>{item.name}</p>
						</Grid.Column>
					))}
				</Grid>
			</div>
		);
	}
}

export default UnneededItems;