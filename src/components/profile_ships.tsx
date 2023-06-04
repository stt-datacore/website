import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship, Schematics, Ability, ShipBonus } from '../model/ship';
import { PlayerData } from '../model/player';

type ProfileShipsProps = {
	playerData: PlayerData;
};

type ProfileShipsState = {
	column: string | null;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: Ship[];
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

		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction: clickedColumn === column ? direction : (clickedColumn === 'name' ? null : 'ascending')
		};

		if(sortConfig.field === 'max_level') {
			sortConfig.secondary = {
				field: 'level',
				direction: 'descending' //sortConfig.direction
			};
		}

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		this.setState({
			column: sorted.field,
			direction: sorted.direction,
			pagination_page: 1,
			data: sorted.result
		});
	}

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		const clickShip = (data: Ship) => {
			let shipCrew = findPotentialCrew(data, this.props.playerData.player.character.crew);
			console.log(shipCrew);
		}

		return (
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							width={3}
							sorted={column === 'name' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('name')}
						>
							Ship
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'antimatter' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('antimatter')}
						>
							Antimatter
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'accuracy' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('accuracy')}
						>
							Accuracy
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'attack' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('attack')}
						>
							Attack
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'evasion' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('evasion')}
						>
							Evasion
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'hull' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('hull')}
						>
							Hull
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'shields' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('shields')}
						>
							Shields
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'max_level' ? direction ?? undefined : undefined}
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
										<a onClick={(e) => clickShip(ship)} style={{cursor: "pointer"}}>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} />
										</a>
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{ship.name}</span>
									</div>
									<div style={{ gridArea: 'description' }}>{ship.traits_named?.join(', ')}</div>
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
