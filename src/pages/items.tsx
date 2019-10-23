import React, { Component } from 'react';
import { Container, Header, Table, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';

type ItemsPageProps = {};

type ItemsPageState = {
	items?: any;
	crew?: any;
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Item' },
	{ width: 1, column: 'type', title: 'Item type' },
	{ width: 1, column: 'rarity', title: 'Rarity' },
	{ width: 3, column: 'flavor', title: 'Flavor' }
];

class ItemsPage extends Component<ItemsPageProps, ItemsPageState> {
	constructor(props: ItemsPageProps) {
		super(props);

		this.state = {
			crew: undefined,
			items: undefined
		};
	}

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(crew => {
				this.setState({ crew });

				fetch('/structured/items.json')
					.then(response => response.json())
					.then(items => {
						items = items.filter(item => item.imageUrl);

						// Fill in something useful for flavor where it's missing
						items.forEach(item => {
							if (!item.flavor) {
								if (item.type === 2 && (!item.item_sources || item.item_sources.length === 0) && !item.recipe) {
									// Most likely a galaxy item
									item.flavor = 'Unused or Galaxy Event item';
								}

								let crew_levels = new Set();
								crew.forEach(cr => {
									cr.equipment_slots.forEach(es => {
										if (es.symbol === item.symbol) {
											crew_levels.add(cr.name);
										}
									});
								});

								if (crew_levels.size > 0) {
									if (crew_levels.size > 5) {
										item.flavor = `Equippable by ${crew_levels.size} crew`;
									} else {
										item.flavor = 'Equippable by: ' + [...crew_levels].join(', ');
									}
								}
							}
						});

						this.setState({ items });
					})
					.catch(err => {
						this.setState({ items: [] });
					});
			});
	}

	_filterItem(item: any, filter: any): boolean {
		const matchesFilter = (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let matches = true;

		if (filter.conditionArray.length === 0) {
			// text search only
			for (let segment of filter.textSegments) {
				let segmentResult = matchesFilter(item.name, segment.text) || matchesFilter(item.flavor, segment.text);
				matches = matches && (segment.negated ? !segmentResult : segmentResult);
			}
		}

		return matches;
	}

	renderTableRow(item: any): JSX.Element {
		return (
			<Table.Row key={item.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`/media/assets/${item.imageUrl}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<Link to={`/item_info?symbol=${item.symbol}`}>
								<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
									{item.rarity > 0 && (
										<span>
											{item.rarity} <Icon name='star' />{' '}
										</span>
									)}
									{item.name}
								</span>
							</Link>
						</div>
						<div style={{ gridArea: 'description' }}>{item.flavor}</div>
					</div>
				</Table.Cell>
				<Table.Cell>{CONFIG.REWARDS_ITEM_TYPE[item.type]}</Table.Cell>
				<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
				<Table.Cell>{item.flavor}</Table.Cell>
			</Table.Row>
		);
	}

	render() {
		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as='h2'>Items</Header>

					{!this.state.items && (
						<div>
							<Icon loading name='spinner' /> Loading...
						</div>
					)}
					{this.state.items && (
						<SearchableTable
							data={this.state.items}
							explanation={
								<div>
									<p>Do simple text search in the name and flavor</p>
								</div>
							}
							renderTableRow={crew => this.renderTableRow(crew)}
							filterRow={(crew, filter) => this._filterItem(crew, filter)}
							config={tableConfig}
						/>
					)}
				</Container>
			</Layout>
		);
	}
}

export default ItemsPage;
