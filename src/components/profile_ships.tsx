import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';
import { mergeShips } from '../utils/shiputils';

type ProfileShipsProps = {
	playerData: any;
};

type ProfileShipsState = {
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

class ProfileShips extends Component<ProfileShipsProps, ProfileShipsState> {
	constructor(props: ProfileShipsProps) {
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
		fetch('/structured/ship_schematics.json')
			.then(response => response.json())
			.then(ship_schematics => {
				let data = mergeShips(ship_schematics, this.props.playerData.player.character.ships);
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
							Ship
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'antimatter' ? direction : null}
							onClick={() => this._handleSort('antimatter')}
						>
							Antimatter
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'accuracy' ? direction : null}
							onClick={() => this._handleSort('accuracy')}
						>
							Accuracy
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'attack' ? direction : null}
							onClick={() => this._handleSort('attack')}
						>
							Attack
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'evasion' ? direction : null}
							onClick={() => this._handleSort('evasion')}
						>
							Evasion
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'hull' ? direction : null}
							onClick={() => this._handleSort('hull')}
						>
							Hull
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'shields' ? direction : null}
							onClick={() => this._handleSort('shields')}
						>
							Shields
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'max_level' ? direction : null}
							onClick={() => this._handleSort('max_level')}
						>
							Level
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((ship, idx) => (
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
										<img width={48} src={`/media/assets/${ship.icon.file.substr(1).replace('/', '_')}.png`} />
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{ship.name}</span>
									</div>
									<div style={{ gridArea: 'description' }}>{ship.traits_named.join(', ')}</div>
								</div>
							</Table.Cell>
							<Table.Cell>{ship.antimatter}</Table.Cell>
							<Table.Cell>{ship.accuracy}</Table.Cell>
							<Table.Cell>{ship.attack} ({ship.attacks_per_second}/s)</Table.Cell>
							<Table.Cell>{ship.evasion}</Table.Cell>
							<Table.Cell>{ship.hull}</Table.Cell>
							<Table.Cell>{ship.shields} (regen {ship.shield_regen})</Table.Cell>
							<Table.Cell>{ship.level} / {ship.max_level}</Table.Cell>
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
								Ships per page:{' '}
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

export default ProfileShips;
