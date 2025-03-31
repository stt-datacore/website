import React from 'react';
import { Table, Checkbox } from 'semantic-ui-react';

import { Ship, ShipInUse } from '../../model/ship';
import { ShipHoverStat, ShipTarget } from '../hovering/shiphoverstat';
import { GlobalContext } from '../../context/globalcontext';
import { navigate } from 'gatsby';
import { RarityFilter } from '../crewtables/commonoptions';
import { ShipAbilityPicker, ShipOwnership, TraitPicker, TriggerPicker } from '../crewtables/shipoptions';
import { getShipsInUse, mergeRefShips } from '../../utils/shiputils';
import CONFIG from '../CONFIG';
import { formatShipScore } from './utils';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { omniSearchFilter } from '../../utils/omnisearch';
import { useStateWithStorage } from '../../utils/storage';

type ShipTableProps = {
	pageId: string;
	event_ships?: string[];
	high_bonus?: string[];
	event_ship_traits?: string[];
};

type Ownership = 'owned' | 'unowned';

export const ShipTable = (props: ShipTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { all_ships } = globalContext.core;
	const { playerData, playerShips } = globalContext.player;
	const { t, SHIP_TRAIT_NAMES } = globalContext.localized;
	const { pageId, event_ships, high_bonus, event_ship_traits } = props;

	const [rarityFilter, setRarityFilter] = useStateWithStorage<number[] | undefined>(`${pageId}/ship_table_filter/rarity`, undefined);
	const [grantFilter, setGrantFilter] = useStateWithStorage<string[] | undefined>(`${pageId}/ship_table_filter/grant`, undefined);
	const [abilityFilter, setAbilityFilter] = useStateWithStorage<string[]>(`${pageId}/ship_table_filter/ability`, []);
	const [traitFilter, setTraitFilter] = useStateWithStorage<string[] | undefined>(`${pageId}/ship_table_filter/trait`, undefined);
	const [onlyUsed, setOnlyUsed] = useStateWithStorage(`${pageId}/ship_table_filter/trait`, false);
	const [ownership, setOwnership] = useStateWithStorage<Ownership | undefined>(`${pageId}/ship_table_filter/trait`, undefined);
	const [shipsInUse, setShipsInUse] = React.useState<ShipInUse[] | undefined>(undefined);
	const [ships, setShips] = React.useState<Ship[]>([]);

	React.useEffect(() => {
		if (playerShips?.length && playerData) {
			const playerships = [...playerShips];
			const merged = mergeRefShips(all_ships, playerships, SHIP_TRAIT_NAMES);
			const shipsInUse = getShipsInUse(globalContext.player);
			setShips(merged?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => createEventShip(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0));
			setShipsInUse(shipsInUse);
		}
		else {
			const coreships = mergeRefShips(all_ships, [], SHIP_TRAIT_NAMES);
			setShips(coreships?.filter(f => event_ships?.includes(f.symbol) ?? true).map(m => createEventShip(m)).sort((a, b) => !!event_ships?.length ? b.antimatter - a.antimatter : 0));
			setShipsInUse(undefined);
		}
	}, [playerData, event_ships, SHIP_TRAIT_NAMES, all_ships]);

	const filteredShips = React.useMemo(() => {
		return ships.filter((ship) => {
			if (rarityFilter && !!rarityFilter?.length && !rarityFilter.some((r) => ship.rarity === r)) return false;
			if (grantFilter && !!grantFilter?.length && !ship.actions?.some((action) => grantFilter.some((gf) => Number.parseInt(gf) === action.status))) return false;
			if (abilityFilter && !!abilityFilter?.length && !ship.actions?.some((action) => abilityFilter.some((af) => action.ability?.type.toString() === af))) return false;
			if (traitFilter && !!traitFilter?.length && !ship.traits?.some((trait) => traitFilter.includes(trait))) return false;
			if (ownership === 'owned' && !ship.owned) return false;
			if (ownership === 'unowned' && ship.owned) return false;
			if (onlyUsed && shipsInUse?.length) {
				return shipsInUse.some(usage => usage.ship.id === ship.id);
			}
			return true;
		});
	}, [ships, shipsInUse, rarityFilter, grantFilter, abilityFilter, traitFilter, ownership, onlyUsed]);

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
		{!event_ships?.length &&

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
						setRarityFilter={setRarityFilter}
					/>
					<TriggerPicker grants={true} altTitle={t('hints.filter_ship_grants')} selectedTriggers={grantFilter} setSelectedTriggers={(value) => setGrantFilter(value as string[])} />

					<ShipAbilityPicker ship={true} selectedAbilities={abilityFilter} setSelectedAbilities={(value) => setAbilityFilter(value as string[])} />
					<TraitPicker ship={true} selectedTraits={traitFilter} setSelectedTraits={(value) => setTraitFilter(value as string[])} />
					{!!playerShips && <ShipOwnership selectedValue={ownership} setSelectedValue={setOwnership} />}
				</div>
			</div>}
		{!event_ships?.length && !!playerShips &&
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1em', margin: '1em 0' }}>
				<Checkbox label={t('ship.show.only_in_use')} checked={onlyUsed ?? false} onChange={(e, { checked }) => setOnlyUsed(checked as boolean)} />
			</div>}
		{!!event_ships?.length &&
			<div>
				<div style={{ margin: '0.25em 0' }}>
					<b>{t('base.featured_ships{{:}}')} </b>&nbsp;{high_bonus?.map(sym => ships.find(f => f.symbol === sym)?.name || '').join(", ")}
				</div>
				<div style={{ margin: '0.25em 0' }}>
					<b>{t('base.featured_traits{{:}}')} </b>&nbsp;{event_ship_traits?.map(sym => SHIP_TRAIT_NAMES[sym]).join(", ")}
				</div>
			</div>
		}
		<SearchableTable
			id={`${pageId}/ship_table`}
			data={filteredShips}
			config={tableConfig}
			renderTableRow={renderTableRow}
			filterRow={filterRow}
		/>
		<ShipHoverStat targetGroup={`${pageId}/ship_hover`} />
	</div>);

	function printUsage(ship: Ship) {
		let usages = shipsInUse?.filter(f => f.ship.id === ship.id);
		let texts = [] as JSX.Element[];
		if (usages?.length) {
			for (let usage of usages) {
				if (usage.battle_mode.startsWith('fbb')) {
					texts.push(<a onClick={() => navigate(`/ship_info?ship=${ship.symbol}&battle_mode=${usage.battle_mode}&rarity=${usage.rarity}`)} style={{ color: CONFIG.RARITIES[usage.rarity].color, cursor: 'pointer' }}>{`${t(`ship.fbb`)} ${usage.rarity + 1}*`}</a>);
				}
				else if (usage.battle_mode === 'pvp') {
					texts.push(<a onClick={() => navigate(`/ship_info?ship=${ship.symbol}&battle_mode=${usage.battle_mode}&rarity=${usage.rarity}`)} style={{ color: CONFIG.RARITIES[usage.rarity].color, cursor: 'pointer' }}>{`${t('ship.pvp')}: ${t(`ship.pvp_divisions.${usage.pvp_division}`)}`}</a>);
				}
			}
		}
		if (!texts.length) return <></>
		return texts.reduce((p, n) => p ? <>{p}<br />{n}</> : n)
	}

	function createEventShip(ship: Ship) {
		if (!event_ships) return ship;
		ship = JSON.parse(JSON.stringify(ship));
		if (high_bonus?.includes(ship.symbol)) {
			ship.antimatter += 500;
		}
		else {
			let traits = ship.traits?.filter(f => event_ship_traits?.includes(f))?.length ?? 0;
			ship.antimatter += (100 * traits);
		}
		return ship;
	}

	function filterRow(row: Ship, filter: any, filterType?: string) {
		return omniSearchFilter(row, filter, filterType, ['name', 'flavor', {
			field: 'traits',
			customMatch: (value, text) => {
				return (value as Ship).traits?.some(t => SHIP_TRAIT_NAMES[t].toLowerCase().includes(text.toLowerCase())) ||
					(value as Ship).traits_hidden?.some(t => t.toLowerCase().includes(text.toLowerCase())) || false;
			}
		}]);
	}

	function renderTableRow(ship: Ship, idx?: number) {
		const navToShip = (ship: Ship) => {
			navigate('/ship_info?ship=' + ship.symbol);
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
						<ShipTarget inputItem={ship} targetGroup={`${pageId}/ship_hover`}>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} />
						</ShipTarget>
					</div>
					<div style={{ gridArea: 'stats', cursor: "pointer" }} onClick={(e) => navToShip(ship)}>
						<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{ship.name}</span>
					</div>
					<div style={{ gridArea: 'description' }}>{ship.traits?.map(trait => SHIP_TRAIT_NAMES[trait]).join(', ')}</div>
					<div style={{ gridArea: 'usages', fontWeight: 'bold' }}>{printUsage(ship)}</div>
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{ display: 'flex' }}>
					{formatShipScore('ship', ship.ranks?.overall, t)}
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{ display: 'flex' }}>
					{formatShipScore('ship', ship.ranks?.arena, t)}
				</div>
			</Table.Cell>
			<Table.Cell>
				<div style={{ display: 'flex' }}>
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
		</Table.Row>)
	}
}
