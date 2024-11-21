import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Button, Input, Checkbox } from 'semantic-ui-react';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../../utils/datasort';
import { Ship, ShipInUse } from '../../model/ship';
import { ShipHoverStat, ShipTarget } from '../hovering/shiphoverstat';
import { GlobalContext } from '../../context/globalcontext';
import { navigate } from 'gatsby';
import { RarityFilter } from '../crewtables/commonoptions';
import { ShipAbilityPicker, TraitPicker, TriggerPicker } from '../crewtables/shipoptions';
import { isMobile } from 'react-device-detect';
import { getShipsInUse } from '../../utils/shiputils';
import CONFIG from '../CONFIG';
import { TinyStore } from '../../utils/tiny';

type ShipTableProps = {
	event_ships?: string[];
	high_bonus?: string[];
	event_ship_traits?: string[];
};

type ShipTableState = {
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
	shipsInUse?: ShipInUse[];
	onlyUsed?: boolean;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];


class ShipTable extends Component<ShipTableProps, ShipTableState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	inited: boolean;
	hasPlayer: boolean;
	private readonly tiny = TinyStore.getStore('profile_ships');
	constructor(props: ShipTableProps) {
		super(props);

		this.state = {
			onlyUsed: this.tiny.getValue<boolean>('only_used'),
			column: this.props.event_ships ? 'antimatter' : null,
			direction: this.props.event_ships ? 'descending' : null,
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

	componentDidUpdate(prevProps: Readonly<ShipTableProps>, prevState: Readonly<ShipTableState>, snapshot?: any): void {
		this.initData();
	}

	printUsage(ship: Ship) {
		const { shipsInUse } = this.state;
		const { t } = this.context.localized;
		let usages = shipsInUse?.filter(f => f.ship.id === ship.id);
		let texts = [] as JSX.Element[];
		if (usages?.length) {
			for (let usage of usages) {
				if (usage.battle_mode.startsWith('fbb')) {
					texts.push(<a onClick={() => navigate(`/ship_info?ship=${ship.symbol}&battle_mode=${usage.battle_mode}&rarity=${usage.rarity}`)} style={{color: CONFIG.RARITIES[usage.rarity].color, cursor: 'pointer'}}>{`${t(`ship.fbb`)} ${usage.rarity + 1}*`}</a>);
				}
				else if (usage.battle_mode === 'pvp') {
					texts.push(<a onClick={() => navigate(`/ship_info?ship=${ship.symbol}&battle_mode=${usage.battle_mode}&rarity=${usage.rarity}`)} style={{color: CONFIG.RARITIES[usage.rarity].color, cursor: 'pointer'}}>{`${t('ship.pvp')}: ${t(`ship.pvp_divisions.${usage.pvp_division}`)}`}</a>);
				}
			}
		}
		if (!texts.length) return <></>
		return texts.reduce((p, n) => p ? <>{p}<br />{n}</> : n)
	}

	initData() {
		const hp = !!this.context.player.playerData;
		if (hp !== this.hasPlayer) {
			this.inited = false;
			this.hasPlayer = hp;
		}
		if (this.inited) return;
		const { event_ships } = this.props;

		this.inited = true;
		if (this.context.player.playerShips?.length) {
			let shipsInUse = getShipsInUse(this.context.player);
			this.setState({
				... this.state,
				data: this.context.player.playerShips?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => this.transmogrify(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0),
				shipsInUse
			});
		}
		else {
			this.setState({
				... this.state,
				data: this.context.core.ships?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => this.transmogrify(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0)
			});
		}

	}

	transmogrify(ship: Ship) {
		if (ship.max_level && !this.context.player.playerData) {
			ship = { ...ship, max_level: ship.max_level + 1 };
		}
		if (!this.props.event_ships) return ship;
		ship = JSON.parse(JSON.stringify(ship));
		if (this.props.high_bonus?.includes(ship.symbol)) {
			ship.antimatter += 500;
		}
		else {
			let traits = ship.traits?.filter(f => this.props.event_ship_traits?.includes(f))?.length ?? 0;
			ship.antimatter += (100 * traits);
		}
		return ship;
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

	private readonly setOnlyUsed = (value?: boolean) => {
		this.tiny.setValue('only_used', value)
		this.setState({ ...this.state, onlyUsed: value });
	}

	render() {
		const { localized } = this.context;
		const { t, SHIP_TRAIT_NAMES } = localized;
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
			if (this.state.onlyUsed && this.state.shipsInUse?.length) {
				return this.state.shipsInUse.some(usage => usage.ship.id === ship.id);
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
			{!this.props.event_ships?.length && <div style={{
				display: "flex",
				flexDirection: "row",
				gap: "0.5em"
			}}>
				<Input
					style={{ width: isMobile ? '100%' : '30%' }}
					iconPosition="left"
					placeholder={t('global.search_by_name_or_trait_ellipses')}
					value={textFilter}
					onChange={(e, { value }) => this.setTextFilter(value)}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => this.setTextFilter('')} >
							<Icon name='delete' />
						</Button>
				</Input>

				<RarityFilter
					altTitle={t('hints.filter_ship_rarity')}
					rarityFilter={rarityFilter ?? []}
					setRarityFilter={this.setRarityFilter}
				/>
					<TriggerPicker grants={true} altTitle={t('hints.filter_ship_grants')} selectedTriggers={grantFilter} setSelectedTriggers={(value) => this.setGrantFilter(value as string[])} />

				<ShipAbilityPicker ship={true} selectedAbilities={this.state.abilityFilter} setSelectedAbilities={(value) => this.setAbilityFilter(value as string[])} />
				<TraitPicker ship={true} selectedTraits={this.state.traitFilter} setSelectedTraits={(value) => this.setTraitFilter(value as string[])} />
			</div>}
			{!this.props.event_ships?.length &&
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1em', margin: '1em'}}>
				<Checkbox label={t('ship.show.only_in_use')} checked={this.state.onlyUsed ?? false} onChange={(e, { checked }) => this.setOnlyUsed(checked as boolean)} />
			</div>}
			{!!this.props.event_ships?.length &&
				<div>
					<div style={{margin: '0.25em 0'}}>
						<b>{t('base.featured_ships')}: </b>&nbsp;{this.props.high_bonus?.map(sym => this.state.data.find(f => f.symbol === sym)?.name || '').join(", ")}
					</div>
					<div style={{margin: '0.25em 0'}}>
						<b>{t('base.featured_traits')}: </b>&nbsp;{this.props.event_ship_traits?.map(sym => SHIP_TRAIT_NAMES[sym]).join(", ")}
					</div>
				</div>
			}
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							width={3}
							sorted={column === 'name' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('name')}
						>
							{t('ship.ship')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'antimatter' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('antimatter')}
						>
							{t('ship.antimatter')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'accuracy' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('accuracy')}
						>
							{t('ship.accuracy')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'attack' ? direction ?? undefined  : undefined}
							onClick={() => this._handleSort('attack')}
						>
							{t('ship.attack')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'evasion' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('evasion')}
						>
							{t('ship.evasion')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'hull' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('hull')}
						>
							{t('ship.hull')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'shields' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('shields')}
						>
							{t('ship.shields')}
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'max_level' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('max_level')}
						>
							{t('ship.level')}
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
										gridTemplateAreas: `'icon stats' 'icon description' 'icon usages'`,
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
									<div style={{ gridArea: 'usages', fontWeight: 'bold'}}>{this.printUsage(ship)}</div>
								</div>
							</Table.Cell>
							<Table.Cell>{ship.antimatter}</Table.Cell>
							<Table.Cell>{ship.accuracy}</Table.Cell>
							<Table.Cell>{ship.attack} ({ship.attacks_per_second}/s)</Table.Cell>
							<Table.Cell>{ship.evasion}</Table.Cell>
							<Table.Cell>{ship.hull}</Table.Cell>
							<Table.Cell>{ship.shields} (regen {ship.shield_regen})</Table.Cell>
							<Table.Cell>
								{ship.level && <> {ship.level} / {ship.max_level} </>
								|| <>{ship.max_level}</>}


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
							 	{t('global.rows_per_page')}:{' '}
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



export default ShipTable;
