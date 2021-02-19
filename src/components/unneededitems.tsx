import React, { Component } from 'react';
import { Header, Message, Grid, Icon } from 'semantic-ui-react';

import ItemDisplay from '../components/itemdisplay';
import { mergeItems } from '../utils/itemutils';
import { mergeShips } from '../utils/shiputils';


type UnneededItemsProps = {
	playerData: any;
};

type UnneededItemsState = {
	fuellist: any[];
	fuelschematicslist: any[];
};

class UnneededItems extends Component<UnneededItemsProps, UnneededItemsState> {
	constructor(props) {
		super(props);

		this.state = {
			fuellist: [],
			fuelschematicslist: []
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

		let equipmentAlreadyOnCrew = new Set();

		let fuellist = items.filter(
			item =>
				(equipmentAlreadyOnCrew.has(item.symbol) && item.quantity === 1 && item.rarity > 1) ||
				item.name.indexOf("'s ") > 0 ||
				item.name.indexOf("s' ") > 0
		);

		let maxedShips = ships.filter(
			ship => ship.level === ship.max_level
		);

		let fuelschematicslist = items.filter(
			item => maxedShips.some((ship) => {
				if (ship.symbol+'_schematic' === item.symbol) {
					item.rarity = ship.rarity;	// Use ship rarity instead of schematic item rarity
					return true;
				}
			})
		);

		this.setState({ fuellist, fuelschematicslist });
	}

	render() {
		const { playerData } = this.props;

		let itemCount = playerData.player.character.items.length;
		let schematicsCount = this.state.fuelschematicslist.length;
		let fuelCount = this.state.fuellist.length;

		return (
			<div>
				{itemCount > 900 && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {playerData.player.character.item_limit} the game starts randomly losing
							items; go and replicate away some unnecessary stuff.
						</p>
					</Message>
				)}

				<Header as='h4'>Here are {schematicsCount} potential items that you don't need (used to upgrade ships you already maxed):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuelschematicslist.map((item, idx) => (
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

				<Header as='h4'>Here are {fuelCount} potential items that you don't need (used to equip crew you already equipped):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuellist.map((item, idx) => (
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