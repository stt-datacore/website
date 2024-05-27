import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Button, Input } from 'semantic-ui-react';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship } from '../model/ship';
import { ShipHoverStat, ShipTarget } from './hovering/shiphoverstat';
import { GlobalContext } from '../context/globalcontext';
import { navigate } from 'gatsby';
import { RarityFilter } from './crewtables/commonoptions';
import { ShipAbilityPicker, TraitPicker, TriggerPicker } from './crewtables/shipoptions';
import { isMobile } from 'react-device-detect';

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
	abilityFilter: string[];
	traitFilter: string[];
	textFilter?: string;
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
	hasPlayer: boolean;

	constructor(props: ProfileShipsProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: [],
			originals: [],
			abilityFilter: [],
			traitFilter: []
		};
	}

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate(prevProps: Readonly<ProfileShipsProps>, prevState: Readonly<ProfileShipsState>, snapshot?: any): void {
		this.initData();
	}

	initData() {
		const hp = !!this.context.player.playerData;
		if (hp !== this.hasPlayer) {
			this.inited = false;
			this.hasPlayer = hp;
		}
		if (this.inited) return;
		
		this.inited = true;
		if (this.context.player.playerShips?.length) {
			this.setState({ ... this.state, data: this.context.player.playerShips });
		}
		else {
			this.setState({ ... this.state, data: this.context.core.ships });
		}
		
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

	private readonly setTraitFilter = (filter: string[]) => {
		window.setTimeout(() => {
			this.setState({...this.state, traitFilter: filter});
		})		
	}

	private readonly setAbilityFilter = (filter: string[]) => {
		window.setTimeout(() => {
			this.setState({...this.state, abilityFilter: filter});
		})		
	}

	private readonly setTextFilter = (filter?: string) => {
		this.setState({ ...this.state, textFilter: filter });
	}
	render() {
		const { localized } = this.context;
		const trait_names = localized.SHIP_TRAIT_NAMES;
		const { textFilter, grantFilter, traitFilter, abilityFilter, rarityFilter, column, direction, pagination_rows, pagination_page } = this.state;
		
		const dataContext = this.context;
		if (!dataContext || (!dataContext.core.ships && !dataContext.player.playerShips)) return <></>;

		let prefiltered = this.state.data;
		
		let data = prefiltered.filter((ship) => {
			if (rarityFilter && !!rarityFilter?.length && !rarityFilter.some((r) => ship.rarity === r)) return false;			
			if (grantFilter && !!grantFilter?.length && !ship.actions?.some((action) => grantFilter.some((gf) => Number.parseInt(gf) === action.status))) return false;
			if (abilityFilter && !!abilityFilter?.length && !ship.actions?.some((action) => abilityFilter.some((af) => action.ability?.type.toString() === af))) return false;
			if (traitFilter && !!traitFilter?.length && !ship.traits?.some((trait) => traitFilter.includes(trait))) return false;
			if (textFilter?.length) {
				const usearch = textFilter.toLocaleUpperCase();
				if (!ship.name?.toLocaleUpperCase().includes(usearch) 
					&& !ship.traits?.some(t => t.toLocaleUpperCase().includes(usearch)) 
					&& !ship.traits_hidden?.some(t => t.toLocaleUpperCase().includes(textFilter))) return false;
			} 
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
				<Input
					style={{ width: isMobile ? '100%' : '30%' }}
					iconPosition="left"
					placeholder="Search by name or trait..."
					value={textFilter}
					onChange={(e, { value }) => this.setTextFilter(value)}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => this.setTextFilter('')} >
							<Icon name='delete' />
						</Button>
				</Input>

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
				<div style={{
					marginLeft: "0.5em"
				}}>
					<ShipAbilityPicker ship={true} selectedAbilities={this.state.abilityFilter} setSelectedAbilities={(value) => this.setAbilityFilter(value as string[])} />
				</div>
				<div style={{
					marginLeft: "0.5em"
				}}>
					<TraitPicker ship={true} selectedTraits={this.state.traitFilter} setSelectedTraits={(value) => this.setTraitFilter(value as string[])} />
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
									<div style={{ gridArea: 'description' }}>{ship.traits?.map(trait => trait_names[trait]).join(', ')}</div>
								</div>
							</Table.Cell>
							<Table.Cell>{ship.antimatter}</Table.Cell>
							<Table.Cell>{ship.accuracy}</Table.Cell>
							<Table.Cell>{ship.attack} ({ship.attacks_per_second}/s)</Table.Cell>
							<Table.Cell>{ship.evasion}</Table.Cell>
							<Table.Cell>{ship.hull}</Table.Cell>
							<Table.Cell>{ship.shields} (regen {ship.shield_regen})</Table.Cell>
							<Table.Cell> 
								{ship.level && <>
									{ship.level} / {ship.max_level}
								</>
								||
								<>
								{(ship.max_level ?? 0) + 1}
								</>
								}
								
								
								</Table.Cell>
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
