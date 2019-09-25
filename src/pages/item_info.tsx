import React, { Component } from 'react';
import { Container, Header, Table, Message, Icon, Rating, Image } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

import CONFIG from '../components/CONFIG';

type ItemInfoPageProps = {};

type ItemInfoPageState = {
	item_data?: any;
	errorMessage?: string;
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
					fetch('/structured/crew.json')
						.then(response => response.json())
						.then(allcrew => {
							let item = items.find(entry => entry.symbol === item_symbol);

							let crew_levels = [];
							allcrew.forEach(crew => {
								crew.equipment_slots.forEach(es => {
									if (es.symbol === item_symbol) {
										crew_levels.push({
											crew: crew.symbol,
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
		const { errorMessage, item_data } = this.state;

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

					{item_data.item.recipe && (
						<div>
							<Header as="h4">Craft it for {item_data.item.recipe.craftCost} chrons using this recipe:</Header>
							<Table celled selectable striped collapsing unstackable compact="very">
								<Table.Header>
									<Table.Row>
										<Table.HeaderCell width={2}>Item</Table.HeaderCell>
										<Table.HeaderCell width={2}>Quantity</Table.HeaderCell>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{item_data.item.recipe.list.map((recipeItem, idx) => (
										<Table.Row key={idx}>
											<Table.Cell>
												<Link to={`/item_info?symbol=${recipeItem.symbol}`}>{recipeItem.symbol}</Link>
											</Table.Cell>
											<Table.Cell>{recipeItem.count}</Table.Cell>
										</Table.Row>
									))}
								</Table.Body>
							</Table>
							<br />
						</div>
					)}

					{item_data.item.item_sources.length > 0 && (
						<div>
							<Header as="h4">Item sources:</Header>
							<Table celled selectable striped collapsing unstackable compact="very">
								<Table.Header>
									<Table.Row>
										<Table.HeaderCell width={2}>Source</Table.HeaderCell>
										<Table.HeaderCell width={2}>Chance</Table.HeaderCell>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{item_data.item.item_sources.map((source, idx) => (
										<Table.Row key={idx}>
											<Table.Cell>{source.name}</Table.Cell>
											<Table.Cell>{source.chance_grade}</Table.Cell>
										</Table.Row>
									))}
								</Table.Body>
							</Table>
						</div>
					)}

					{item_data.crew_levels.length > 0 && (
						<div>
							<Header as="h4">Equippable by this crew:</Header>
							<Table celled selectable striped collapsing unstackable compact="very">
								<Table.Header>
									<Table.Row>
										<Table.HeaderCell width={2}>Crew</Table.HeaderCell>
										<Table.HeaderCell width={2}>Level</Table.HeaderCell>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{item_data.crew_levels.map((cl, idx) => (
										<Table.Row key={idx}>
											<Table.Cell>{cl.crew}</Table.Cell>
											<Table.Cell>{cl.level}</Table.Cell>
										</Table.Row>
									))}
								</Table.Body>
							</Table>
						</div>
					)}
				</Container>
			</Layout>
		);
	}
}

export default ItemInfoPage;
