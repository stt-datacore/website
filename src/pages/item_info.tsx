import React, { Component } from 'react';
import { Container, Header, Message, Icon, Rating, Image, Popup, Grid } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import ItemSources from '../components/itemsources';
import ItemDisplay from '../components/itemdisplay';
import CONFIG from '../components/CONFIG';

type ItemInfoPageProps = {};

type ItemInfoPageState = {
	item_data?: any;
	errorMessage?: string;
	items?: any;
};

class ItemInfoPage extends Component<ItemInfoPageProps, ItemInfoPageState> {
	constructor(props: ItemInfoPageProps) {
		super(props);

		this.state = {
			errorMessage: undefined,
			item_data: undefined
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('symbol')) {
			let item_symbol = urlParams.get('symbol');

			fetch('/structured/items.json')
				.then(response => response.json())
				.then(items => {
					this.setState({ items });
					fetch('/structured/crew.json')
						.then(response => response.json())
						.then(allcrew => {
							let item = items.find(entry => entry.symbol === item_symbol);

							let crew_levels = [];
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

							if (item === undefined) {
								this.setState({ errorMessage: 'Invalid item symbol, or data not yet available for this item.' });
							} else {
								this.setState({ item_data: { item, crew_levels } });
							}
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	render() {
		const { errorMessage, item_data, items } = this.state;

		if (item_data === undefined || errorMessage !== undefined) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
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
					</Container>
				</Layout>
			);
		}

		console.log(item_data);

		let bonusText = [];
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
		let demands = [];
		if (item_data.item.recipe) {
			for (let iter of item_data.item.recipe.list) {
				let recipeEquipment = items.find(item => item.symbol === iter.symbol);
				demands.push({
					count: iter.count,
					symbol: iter.symbol,
					equipment: recipeEquipment,
					factionOnly: iter.factionOnly
				});
			}
		}

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Message icon warning>
						<Icon name="exclamation triangle" />
						<Message.Content>
							<Message.Header>Work in progress!</Message.Header>
							This section is under development and not fully functional yet.
						</Message.Content>
					</Message>
					<Header as="h3">
						{item_data.item.name}{' '}
						<Rating rating={item_data.item.rarity} maxRating={item_data.item.rarity} size="large" disabled />
					</Header>
					<Image size="small" src={`/media/assets/${item_data.item.imageUrl}`} />

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
								{demands.map((entry, idx) => (
									<Grid.Column key={idx}>
										<Popup
											trigger={
												<Header
													style={{ display: 'flex', cursor: 'zoom-in' }}
													icon={
														<ItemDisplay
															src={`/media/assets/${entry.equipment.imageUrl}`}
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
								))}
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
													src={`/media/assets/${entry.crew.imageUrlPortrait}`}
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
				</Container>
			</Layout>
		);
	}
}

export default ItemInfoPage;
