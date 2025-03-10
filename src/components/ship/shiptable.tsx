import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Button, Input, Checkbox } from 'semantic-ui-react';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../../utils/datasort';
import { Ship, ShipInUse } from '../../model/ship';
import { ShipHoverStat, ShipTarget } from '../hovering/shiphoverstat';
import { GlobalContext } from '../../context/globalcontext';
import { navigate } from 'gatsby';
import { RarityFilter } from '../crewtables/commonoptions';
import { ShipAbilityPicker, ShipOwnership, TraitPicker, TriggerPicker } from '../crewtables/shipoptions';
import { isMobile } from 'react-device-detect';
import { getShipsInUse, mergeShips } from '../../utils/shiputils';
import CONFIG from '../CONFIG';
import { TinyStore } from '../../utils/tiny';
import { formatShipScore } from './utils';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { omniSearchFilter } from '../../utils/omnisearch';

type ShipTableProps = {
	event_ships?: string[];
	high_bonus?: string[];
	event_ship_traits?: string[];
};

type ShipTableState = {
	data: Ship[];
	originals: Ship[];
	activeShip?: Ship | null;
	rarityFilter?: number[];
	grantFilter?: string[];
	abilityFilter: string[];
	traitFilter: string[];
	shipsInUse?: ShipInUse[];
	onlyUsed?: boolean;
	ownership?: 'owned' | 'unowned'
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ShipTable extends Component<ShipTableProps, ShipTableState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;
	inited: boolean = false;
	hasPlayer: boolean = false;
	private readonly tiny = TinyStore.getStore('profile_ships');
	constructor(props: ShipTableProps) {
		super(props);

		this.state = {
			onlyUsed: this.tiny.getValue<boolean>('only_used'),
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
		const hp = !!this.context.player.playerData?.player?.character?.crew?.length;
		if (hp !== this.hasPlayer) {
			this.inited = false;
			this.hasPlayer = hp;
		}
		if (this.inited) return;
		const { event_ships } = this.props;

		this.inited = true;
		let schematics = [...this.context.core.ship_schematics];

		const constellation = {
			symbol: 'constellation_ship',
			rarity: 1,
			max_level: 5,
			antimatter: 1250,
			name: 'Constellation Class',
			icon: { file: '/ship_previews_fed_constellationclass' },
			traits: ['federation','explorer'],
			owned: true,
			battle_stations: [
				{
					skill: 'command_skill'
				},
				{
					skill: 'diplomacy_skill'
				}
			],
			ranks: { overall: 0, arena: 0, fbb: 0, kind: 'ship', overall_rank: schematics.length + 1, fbb_rank: schematics.length + 1, arena_rank: schematics.length + 1, divisions: { fbb: {}, arena: {} } }
		} as Ship;

		schematics.push({
			ship: constellation,
			rarity: constellation.rarity,
			cost: 0,
			id: 1,
			icon: constellation.icon!
		});

		for (let ship of schematics) {
			ship.ship.ranks ??= { overall: 0, arena: 0, fbb: 0, kind: 'ship', overall_rank: schematics.length + 1, fbb_rank: schematics.length + 1, arena_rank: schematics.length + 1, divisions: { fbb: {}, arena: {} } }
		}

		if (this.context.player.playerShips?.length && this.context.player.playerData) {
			let playerships = [...this.context.player.playerData.player.character.ships];
			let merged = mergeShips(schematics, playerships);
			let shipsInUse = getShipsInUse(this.context.player);
			this.setState({
				... this.state,
				data: merged?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => this.transmogrify(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0),
				shipsInUse
			});
		}
		else {
			let coreships = [...this.context.core.ships];
			coreships.push(constellation);
			this.setState({
				... this.state,
				data: coreships?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => this.transmogrify(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0)
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

	private readonly setOwnedFilter = (filter?: 'owned' | 'unowned') => {
		window.setTimeout(() => {
			this.setState({...this.state, ownership: filter});
		})
	}

	private readonly setAbilityFilter = (filter: string[]) => {
		window.setTimeout(() => {
			this.setState({...this.state, abilityFilter: filter});
		})
	}

	private readonly setOnlyUsed = (value?: boolean) => {
		this.tiny.setValue('only_used', value)
		this.setState({ ...this.state, onlyUsed: value });
	}

	render() {
		const { localized } = this.context;
		const { t, SHIP_TRAIT_NAMES } = localized;
		const { ownership, grantFilter, traitFilter, abilityFilter, rarityFilter } = this.state;

		const dataContext = this.context;
		if (!dataContext || (!dataContext.core.ships && !dataContext.player.playerShips)) return <></>;

		let prefiltered = this.state.data;

		let data = prefiltered.filter((ship) => {
			if (rarityFilter && !!rarityFilter?.length && !rarityFilter.some((r) => ship.rarity === r)) return false;
			if (grantFilter && !!grantFilter?.length && !ship.actions?.some((action) => grantFilter.some((gf) => Number.parseInt(gf) === action.status))) return false;
			if (abilityFilter && !!abilityFilter?.length && !ship.actions?.some((action) => abilityFilter.some((af) => action.ability?.type.toString() === af))) return false;
			if (traitFilter && !!traitFilter?.length && !ship.traits?.some((trait) => traitFilter.includes(trait))) return false;
			if (ownership === 'owned' && !ship.owned) return false;
			if (ownership === 'unowned' && ship.owned) return false;
			if (this.state.onlyUsed && this.state.shipsInUse?.length) {
				return this.state.shipsInUse.some(usage => usage.ship.id === ship.id);
			}
			return true;
		});

		const tableConfig = [
			{ width: 3, column: 'name', title: t('ship.ship') },
			{ width: 1, column: 'ranks.overall', title: t('rank_names.ship_rank'), reverse: true },
			{ width: 1, column: 'ranks.arena', title: t('rank_names.arena_rank'), reverse: true },
			{ width: 1, column: 'ranks.fbb', title: t('rank_names.fbb_rank'), reverse: true },
			{ width: 1, column: 'antimatter', title: t('ship.antimatter'), reverse: true },
			{ width: 1, column: 'accuracy', title: t('ship.accuracy'), reverse: true },
			{ width: 1, column: 'attack', title: t('ship.attack'), reverse: true },
			{ width: 1, column: 'evasion', title: t('ship.evasion'), reverse: true },
			{ width: 1, column: 'hull', title: t('ship.hull'), reverse: true },
			{ width: 1, column: 'shields', title: t('ship.shields'), reverse: true },
			{
				width: 1,
				column: 'level',
				title: t('ship.level'),
				reverse: true,
				customCompare: (a, b) => {
					let r = 0;
					r = (a.max_level ?? 0) - (b.max_level ?? 0);
					if (!r) r = (a.level ?? 0) - (b.level ?? 0);
					return r;
				}
			},
		] as ITableConfigRow[];

		return (<div>
			{!this.props.event_ships?.length &&

			<div style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.5em",
				marginBottom: '0.5em'
			}}>
				<div style={{
					display: "flex",
					flexDirection: "row",
					gap: "0.5em",
				}}>
					<RarityFilter
						altTitle={t('hints.filter_ship_rarity')}
						rarityFilter={rarityFilter ?? []}
						setRarityFilter={this.setRarityFilter}
					/>
						<TriggerPicker grants={true} altTitle={t('hints.filter_ship_grants')} selectedTriggers={grantFilter} setSelectedTriggers={(value) => this.setGrantFilter(value as string[])} />

					<ShipAbilityPicker ship={true} selectedAbilities={this.state.abilityFilter} setSelectedAbilities={(value) => this.setAbilityFilter(value as string[])} />
					<TraitPicker ship={true} selectedTraits={this.state.traitFilter} setSelectedTraits={(value) => this.setTraitFilter(value as string[])} />
					{!!this.hasPlayer && <ShipOwnership selectedValue={this.state.ownership} setSelectedValue={this.setOwnedFilter} />}
				</div>
			</div>}
			{!this.props.event_ships?.length && !!this.hasPlayer &&
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1em', margin: '1em 0'}}>
				<Checkbox label={t('ship.show.only_in_use')} checked={this.state.onlyUsed ?? false} onChange={(e, { checked }) => this.setOnlyUsed(checked as boolean)} />
			</div>}
			{!!this.props.event_ships?.length &&
				<div>
					<div style={{margin: '0.25em 0'}}>
						<b>{t('base.featured_ships{{:}}')} </b>&nbsp;{this.props.high_bonus?.map(sym => this.state.data.find(f => f.symbol === sym)?.name || '').join(", ")}
					</div>
					<div style={{margin: '0.25em 0'}}>
						<b>{t('base.featured_traits{{:}}')} </b>&nbsp;{this.props.event_ship_traits?.map(sym => SHIP_TRAIT_NAMES[sym]).join(", ")}
					</div>
				</div>
			}
			<SearchableTable
				data={data}
				config={tableConfig}
				renderTableRow={(row, idx) => this.renderTableRow(row, idx)}
				filterRow={(row, filter, filterType) => this.filterRow(row, filter, filterType)}
				/>
			<ShipHoverStat targetGroup='ships' />
			</div>);
	}

	filterRow(row: Ship, filter: any, filterType?: string) {
		const { SHIP_TRAIT_NAMES } = this.context.localized;
		return omniSearchFilter(row, filter, filterType, ['name', 'flavor', {
			field: 'traits',
			customMatch: (value, text) => {
				return (value as Ship).traits?.some(t => SHIP_TRAIT_NAMES[t].toLowerCase().includes(text.toLowerCase())) ||
					(value as Ship).traits_hidden?.some(t => t.toLowerCase().includes(text.toLowerCase())) || false;
			}
		}]);
	}

	renderTableRow(ship: Ship, idx?: number) {
		const { t, SHIP_TRAIT_NAMES } = this.context.localized;
		const navToShip = (ship: Ship) => {
			navigate('/ship_info?ship='+ship.symbol);
		}

		return (<Table.Row key={idx}>
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
					<div style={{ gridArea: 'description' }}>{ship.traits?.map(trait => SHIP_TRAIT_NAMES[trait]).join(', ')}</div>
					<div style={{ gridArea: 'usages', fontWeight: 'bold'}}>{this.printUsage(ship)}</div>
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{display: 'flex'}}>
					{formatShipScore('ship', ship.ranks?.overall, t)}
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{display: 'flex'}}>
					{formatShipScore('ship', ship.ranks?.arena, t)}
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{display: 'flex'}}>
					{formatShipScore('ship', ship.ranks?.fbb, t)}
				</div>
			</Table.Cell>
			<Table.Cell>{ship.antimatter}</Table.Cell>
			<Table.Cell>{ship.accuracy}</Table.Cell>
			<Table.Cell>{ship.attack} ({ship.attacks_per_second}/s)</Table.Cell>
			<Table.Cell>{ship.evasion}</Table.Cell>
			<Table.Cell>{ship.hull}</Table.Cell>
			<Table.Cell>{ship.shields} ({t('ship.regen')} {ship.shield_regen})</Table.Cell>
			<Table.Cell>
				{ship.level && <> {ship.level} / {ship.max_level} </>
				|| <>{ship.max_level}</>}
				</Table.Cell>
		</Table.Row>
)
	}
}



export default ShipTable;
