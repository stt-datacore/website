import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';

import CONFIG from '../components/CONFIG';

type ProfileItemsProps = {
	playerData: any;
};

type ProfileItemsState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	pagination_rows: number;
	pagination_page: number;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ProfileItems extends Component<ProfileItemsProps, ProfileItemsState> {
	constructor(props: ProfileItemsProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: []
		};
	}

	componentDidMount() {
		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				let data = [];
				this.props.playerData.player.character.items.forEach(item => {
					let itemEntry = items.find(i => i.symbol === item.symbol);
					if (itemEntry) {
						data.push({
							name: itemEntry.name,
							type: itemEntry.type,
							rarity: itemEntry.rarity,
							flavor: itemEntry.flavor,
							bonuses: itemEntry.bonuses,
							imageUrl: itemEntry.imageUrl,
							symbol: item.symbol,
							quantity: item.quantity
						});
					} else {
						data.push({
							name: item.name,
							type: item.type,
							rarity: item.rarity,
							flavor: item.flavor,
							bonuses: undefined,
							imageUrl: item.imageUrl,
							symbol: item.symbol,
							quantity: item.quantity
						});
					}
				});
				this.setState({ data });
			});
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_handleSort(clickedColumn) {
		const { column, direction } = this.state;
		let { data } = this.state;

		if (column !== clickedColumn) {
			const compare = (a, b) => (a > b ? 1 : b > a ? -1 : 0);
			let sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));

			this.setState({
				column: clickedColumn,
				direction: 'ascending',
				pagination_page: 1,
				data: sortedData
			});
		} else {
			this.setState({
				direction: direction === 'ascending' ? 'descending' : 'ascending',
				pagination_page: 1,
				data: data.reverse()
			});
		}
	}

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							width={3}
							sorted={column === 'name' ? direction : null}
							onClick={() => this._handleSort('name')}
						>
							Item
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'quantity' ? direction : null}
							onClick={() => this._handleSort('quantity')}
						>
							Quantity
						</Table.HeaderCell>
                        <Table.HeaderCell
							width={1}
							sorted={column === 'type' ? direction : null}
							onClick={() => this._handleSort('type')}
						>
							Item type
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'rarity' ? direction : null}
							onClick={() => this._handleSort('rarity')}
						>
							Rarity
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((item, idx) => (
						<Table.Row key={idx}>
							<Table.Cell>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}
								>
									<div style={{ gridArea: 'icon' }}>
										<img width={48} src={`/media/assets/${item.imageUrl}`} />
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
											{item.rarity > 0 && (
												<span>
													{item.rarity} <Icon name="star" />{' '}
												</span>
											)}
											{item.name}
										</span>
									</div>
									<div style={{ gridArea: 'description' }}>{item.flavor}</div>
								</div>
							</Table.Cell>
							<Table.Cell>{item.quantity}</Table.Cell>
                            <Table.Cell>{CONFIG.REWARDS_ITEM_TYPE[item.type]}</Table.Cell>
							<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan="8">
							<Pagination
								totalPages={totalPages}
								activePage={pagination_page}
								onPageChange={(event, { activePage }) => this._onChangePage(activePage)}
							/>
							<span style={{ paddingLeft: '2em' }}>
								Items per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={pagination_rows}
									onChange={(event, { value }) =>
										this.setState({ pagination_page: 1, pagination_rows: value as number })
									}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		);
	}
}

export default ProfileItems;
