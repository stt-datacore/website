import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship, Schematics, Ability, ShipBonus, BattleStation } from '../model/ship';
import { PlayerData } from '../model/player';
import CONFIG from './CONFIG';
import { ShipHoverStat, ShipTarget } from './hovering/shiphoverstat';
import { useStateWithStorage } from '../utils/storage';
import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';
import { navigate } from 'gatsby';
import { RarityFilter } from './crewtables/commonoptions';
import { TriggerPicker } from './crewtables/shipoptions';

type ProfileShipsProps = {
};

type ProfileShipsState = {
	column: string | null;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: Ship[];
	originals: Ship[];
	pagination_rows: number;
	pagination_page: number;
	activeShip?: Ship | null;
	rarityFilter?: number[];
	grantFilter?: string[];
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];


class ProfileShips extends Component<ProfileShipsProps, ProfileShipsState> {

	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	inited: boolean;

	constructor(props: ProfileShipsProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: [],
			originals: []
		};
	}

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate(prevProps: Readonly<ProfileShipsProps>, prevState: Readonly<ProfileShipsState>, snapshot?: any): void {
		this.initData();
	}

	initData() {
		if (!this.context.player.playerShips?.length) return;
		if (this.inited) return;		
		
		this.inited = true;
		this.setState({ ... this.state, data: this.context.player.playerShips });
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_handleSort(clickedColumn) {
		const { column, direction } = this.state;
		let { data } = this.state;

		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction: clickedColumn === column ? direction : (direction === 'descending' ? 'ascending' : 'descending')
		};
		
		let sorted = {} as IResultSortDataBy;

		if(sortConfig.field === 'max_level') {
			sortConfig.direction = clickedColumn !== column ? direction : (direction === 'descending' ? 'ascending' : 'descending');
			const newdata = [...data];
			newdata.sort((a, b) => {
				let r = 0;
				r = (a.max_level ?? 0) - (b.max_level ?? 0);
				if (r) {
					return sortConfig.direction === 'descending' ? -r : r;
				}		
				r = (a.level ?? 0) - (b.level ?? 0);

				if (this.state.rarityFilter?.length === 1) {
					return sortConfig.direction === 'descending' ? -r : r;
				}
				else {
					return -r;
				}				
			});
			sorted = {
				field: 'max_level',
				direction: sortConfig.direction ?? 'ascending',
				result: newdata
			}
		}
		else {
			sorted = sortDataBy(data, sortConfig);
		}
		
		const sortResult = sorted;

		this.setState({
			column: sortResult.field,
			direction: sortResult.direction,
			pagination_page: 1,
			data: sortResult.result
		});
	}

	private readonly setRarityFilter = (filter: number[] | undefined) => {
		window.setTimeout(() => {
			this.setState({...this.state, rarityFilter: filter});
		});
		
	}
	private readonly setGrantFilter = (filter: string[] | undefined) => {
		window.setTimeout(() => {
			this.setState({...this.state, grantFilter: filter});
		})
		
	}

	render() {
		const { grantFilter, rarityFilter, column, direction, pagination_rows, pagination_page } = this.state;
		
		const dataContext = this.context;
		if (!dataContext || !dataContext.core.ships || !dataContext.player.playerShips) return <></>;

		let prefiltered = this.state.data;
		
		let data = prefiltered.filter((ship) => {
			if (rarityFilter && !!rarityFilter?.length && !rarityFilter.some((r) => ship.rarity === r)) return false;			
			if (grantFilter && !!grantFilter?.length && !ship.actions?.some((action) => grantFilter.some((gf) => Number.parseInt(gf) === action.status))) return false;

			return true;
		})

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		const setActiveShip = (ship: Ship | null | undefined) => {
			this.setState({...this.state, activeShip: ship});
		}
	
		const navToShip = (ship: Ship) => {
			navigate('/ship_info?ship='+ship.symbol);
		}

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);
		
		return (<div>	

			<div style={{
				display: "flex",
				flexDirection: "row"
			}}>

				<RarityFilter
					altTitle='Filter ship rarity'
					rarityFilter={rarityFilter ?? []}
					setRarityFilter={this.setRarityFilter}
				/>
				<div style={{
					marginLeft: "0.5em"
				}}>
					<TriggerPicker grants={true} altTitle='Filter ship grants' selectedTriggers={grantFilter} setSelectedTriggers={(value) => this.setGrantFilter(value as string[])} />
				</div>
			</div>
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
									<div style={{ gridArea: 'icon', cursor: "pointer" }} onClick={(e) => navToShip(ship)}>
										<ShipTarget inputItem={ship} targetGroup='ships'>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} />
										</ShipTarget>
									</div>
									<div style={{ gridArea: 'stats', cursor: "pointer" }} onClick={(e) => navToShip(ship)}>
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
										this.setState({ ... this.state, pagination_page: 1, pagination_rows: value as number })
									}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			<ShipHoverStat targetGroup='ships' />
			</div>);
	}
}



export default ProfileShips;
