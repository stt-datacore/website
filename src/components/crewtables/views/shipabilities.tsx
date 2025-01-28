import React from 'react';
import { Form, Table, Checkbox } from 'semantic-ui-react';


import CONFIG from '../../../components/CONFIG';

import { RarityFilter } from '../../../components/crewtables/commonoptions';

import { ShipSkillRanking, ShipStatMap, createShipStatMap, getShipBonus, getSkills, mapToRankings } from '../../../utils/crewutils';
import { Ship } from '../../../model/ship';
import { ShipPickerFilter, findPotentialCrew, printTriggers } from '../../../utils/shiputils';
import { AbilityUses, BonusPicker, ShipAbilityPicker, ShipAbilityRankPicker, ShipPicker, ShipSeatPicker, TriggerPicker } from '../../../components/crewtables/shipoptions';
import { DEFAULT_MOBILE_WIDTH } from '../../../components/hovering/hoverstat';

import { IRosterCrew, ICrewFilter } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import { TranslateMethod } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';

const isWindow = typeof window !== 'undefined';

export function getShipTableConfig(t: TranslateMethod) {
	return [
		{ width: 1, column: 'action.bonus_type', title: t('ship.boosts') },
		{ width: 1, column: 'action.bonus_amount', title: t('ship.amount'), reverse: true, tiebreakers: ['action.bonus_type'] },
		{ width: 1, column: 'action.penalty.type', title: t('ship.handicap'), tiebreakers: ['action.penalty.amount'] },
		{ width: 1, column: 'action.initial_cooldown', title: t('ship.initialize') },
		{ width: 1, column: 'action.cycle_time', title: t('ship.cycle_time') },
		{ width: 1, column: 'action.cooldown', title: t('ship.cooldown') },
		{ width: 1, column: 'action.duration', title: t('ship.duration'), reverse: true },
		{ width: 1, column: 'action.limit', title: t('ship.uses') },
		{ width: 1, column: 'action.ability.amount', title: t('ship.bonus_ability'), tiebreakers: ['action.ability.type'] },
		{ width: 1, column: 'action.ability.condition', title: t('ship.trigger'), tiebreakers: ['action.ability.type', 'action.ability.amount'] },
		{ width: 1, column: 'action.charge_text', title: t('ship.charge_phases') },
		{ width: 1, column: 'ship_battle.accuracy', title: t('ship.accuracy'), reverse: true },
		{ width: 1, column: 'ship_battle.crit_bonus', title: t('ship.crit_bonus'), reverse: true },
		{ width: 1, column: 'ship_battle.crit_chance', title: t('ship.crit_rating'), reverse: true },
		{ width: 1, column: 'ship_battle.evasion', title: t('ship.evasion'), reverse: true }
	] as ITableConfigRow[];
}

type CrewCellProps = {
	crew: IRosterCrew;
};

export const CrewShipCells = (props: CrewCellProps) => {
	const { crew } = props;
	const { t } = React.useContext(GlobalContext).localized;
	if (crew.action.ability !== undefined && crew.action.ability_text === undefined) {
		crew.action.ability_text = crew.action.ability ? getShipBonus(t, crew) : '';
	}
	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<b>{CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.bonus_amount && <>+<b>{crew.action.bonus_amount}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.penalty && <><b>{CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type]}</b> -<b>{crew.action.penalty.amount}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.initial_cooldown >= 0 && <><b>{crew.action.initial_cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.cooldown >= 0 && <><b>{crew.action.cycle_time}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.cooldown >= 0 && <><b>{crew.action.cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.duration && <><b>{crew.action.duration}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.limit && <><b>{crew.action.limit}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability && <>{crew.action.ability_text}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability && <>{CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</> || <>None</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.charge_phases && <>{crew.action.charge_text}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.accuracy && <>+<b>{crew.ship_battle.accuracy}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.crit_bonus && <>+<b>{crew.ship_battle.crit_bonus}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.crit_chance && <>+<b>{crew.ship_battle.crit_chance}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.evasion && <>+<b>{crew.ship_battle.evasion}</b></>}
			</Table.Cell>
		</React.Fragment>
	);
};

interface ShipAbilitiesConfig {
	selectedShip?: Ship;
	selectedSeats?: string[];
	selectedAbilities?: string[];
	selectedRankings?: string[];
	selectedTriggers?: string[];
	triggerOnly?: boolean;
	selectedUses?: number[];
	selectedBonuses?: number[];
}

type ShipAbilitiesFilterProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	playerData: any;
	ships: Ship[];
	crewFilters: ICrewFilter[];
	setCrewFilters: (crewFilters: ICrewFilter[]) => void;
};

export const ShipAbilitiesFilter = (props: ShipAbilitiesFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { rosterCrew, crewFilters, setCrewFilters } = props;

	const [shipRarityFilter, setShipRarityFilter] = React.useState([] as number[]);
	const [shipPickerFilter, setShipPickerFilter] = React.useState({} as ShipPickerFilter);
	const [shipFilters, setShipFilters] = React.useState<ShipAbilitiesConfig>({});

	const { selectedBonuses, selectedShip, selectedTriggers, selectedSeats, selectedAbilities, selectedRankings, triggerOnly, selectedUses } = shipFilters;

	const [availableSeats, setAvailableSeats] = React.useState([] as string[]);
	const [availableAbilities, setAvailableAbilities] = React.useState([] as string[]);

	const [shipCrew, setShipCrew] = React.useState<string[]>([]);
	const [rankings, setRankings] = React.useState<ShipSkillRanking[] | undefined>([]);

	const makeUses = (crew: IRosterCrew[]) => {
		let uses = crew.map((item) => item.action.limit ?? 0);
		uses = uses.filter((item, index) => uses.indexOf(item) === index);

		uses.sort((a, b) => a - b);

		return uses;
	}

	const [availableUses, setAvailableUses] = React.useState(makeUses(rosterCrew));

	const filterByShipAbility = (crew: IRosterCrew) => {
		if (shipCrew && !shipCrew.some(cm => cm === crew.symbol)) return false;

		if (selectedUses?.length) {
			if (!selectedUses.some(su => su === crew.action.limit || (su === 0 && crew.action.limit === undefined))) return false;
		}

		if (selectedRankings?.length && rankings?.length) {
			if (!selectedRankings.some(sr => rankings.find(rk => rk.key === sr)?.crew_symbols.includes(crew.symbol))) return false;
		}

		if (!selectedShip && selectedTriggers?.length) {
			if (!selectedTriggers.some(st => (crew.action.ability?.condition ?? 0).toString() === st)) return false;
		}

		if (selectedBonuses?.length) {
			if (!selectedBonuses.some(st => crew.action.bonus_type === st)) return false;
		}

		if (selectedSeats?.length && !selectedSeats.some(seat => getSkills(crew).includes(seat))) return false;
		else if (availableSeats?.length && !availableSeats.some(seat => getSkills(crew).includes(seat))) return false;

		return true;
	};

	React.useEffect(() => {
		const index = crewFilters.findIndex(crewFilter => crewFilter.id === 'ship_abilities');
		if (index >= 0) crewFilters.splice(index, 1);
		if ((shipCrew) || (selectedSeats?.length) || selectedRankings?.length || availableSeats?.length) {
			crewFilters.push({ id: 'ship_abilities', filterTest: filterByShipAbility });
		}
		setCrewFilters([...crewFilters]);
	}, [shipCrew, selectedSeats, selectedRankings, availableSeats]);

	React.useEffect(() => {
		if (selectedShip && !selectedShip?.actions?.some(l => l.status && l.status !== 16)) {
			if (triggerOnly) {
				setShipFilters({ ... shipFilters, triggerOnly: false });
			}
		}
	}, [selectedShip]);

	// Ship stuff

	React.useEffect(() => {
		let newFilter: ShipPickerFilter;
		if (!shipRarityFilter || !shipRarityFilter.length) {
			newFilter = { ... shipPickerFilter, rarity: undefined };
		}
		else {
			newFilter = { ... shipPickerFilter, rarity: shipRarityFilter };
		}
		if (JSON.stringify(newFilter) !== JSON.stringify(shipPickerFilter)) {
			setShipPickerFilter(newFilter);
		}
	}, [shipRarityFilter]);

	React.useEffect(() => {
		if (selectedRankings?.length) {
			let newselranks = selectedRankings?.filter(ab => rankings?.some(av => av.key === ab));
			if (newselranks.length != selectedRankings.length) {
				setShipFilters({ ... shipFilters, selectedRankings: newselranks });
			}
		}
	}, [rankings])

	React.useEffect(() => {
		if (selectedUses?.length) {
			let usesel = selectedUses.filter(su => availableUses.some(v => v == su));
			if (JSON.stringify(selectedUses) != JSON.stringify(usesel)) {
				setShipFilters({ ... shipFilters, selectedUses: usesel });
			}
		}
	}, [availableUses])

	React.useEffect(() => {
		updateRankings();
	}, [shipCrew, selectedAbilities]);

	React.useEffect(() => {
		updateShipCrew();
	}, [shipFilters])

	React.useEffect(() => {
		let newuses: number[];
		if (shipCrew?.length) {
			newuses = makeUses(rosterCrew.filter(item => shipCrew.some(sc => sc === item.symbol)));
		}
		else {
			newuses = makeUses(rosterCrew);
		}
		if (JSON.stringify(newuses) !== JSON.stringify(availableUses)) {
			setAvailableUses(newuses);
		}
	}, [shipCrew, selectedAbilities]);

	const isCheckDisabled = () => {
		return !selectedShip?.actions?.some(ab => ab.status && ab.status != 16);
	}

	const updateRankings = () => {
		let statmap: ShipStatMap;
		let newRankings: ShipSkillRanking[];

		if (shipCrew && shipCrew.length !== 0) {
			statmap = createShipStatMap(rosterCrew.filter(item => shipCrew.some(sc => sc === item.symbol)));
			newRankings = mapToRankings(statmap);
			newRankings = newRankings.filter(r => shipCrew.some(sc => r.crew_symbols.includes(sc)));
		}
		else {
			statmap = createShipStatMap(rosterCrew);
			newRankings = mapToRankings(statmap);
		}
		if (selectedAbilities && selectedAbilities.length) {
			newRankings = newRankings.filter(r => selectedAbilities.some(sel => sel === r.type.toString()));
		}
		if (JSON.stringify(rankings) !== JSON.stringify(newRankings)) {
			setRankings(newRankings);
		}
	}

	const updateShipCrew = () => {
		let sc: IRosterCrew[] | undefined = undefined;

		if (selectedShip) {
			sc = findPotentialCrew(selectedShip, rosterCrew, triggerOnly, selectedSeats) as IRosterCrew[];
			if (selectedAbilities?.length) {
				sc = sc?.filter(c => selectedAbilities.some(able => c.action.ability?.type.toString() === able));
			}
			setAvailableSeats(Object.keys(CONFIG.SKILLS).filter(key => selectedShip.battle_stations?.some(bs => bs?.skill === key) ?? true));
		}
		else {
			if (selectedAbilities?.length) {
				sc = rosterCrew?.filter(c => selectedAbilities.some(able => c.action.ability?.type.toString() === able));
			}
			setAvailableSeats(Object.keys(CONFIG.SKILLS));
		}
		setAvailableAbilities(Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT).slice(0, 9));
		setShipCrew(sc?.map(f=>f.symbol).filter(g=>g) as string[]);
	}

	const clearShipAbilitiess = () => {
		setShipFilters({});
		setShipCrew([]);
		setShipPickerFilter({});
		setShipRarityFilter([]);
	}

	if (!rankings?.length) {
		if (isWindow) window.setTimeout(() => updateRankings());
	}

	return (
		<Form>
			<div style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-start",
				marginBottom: "1em"
			}}>
				<div style={{
					margin: "0",
					display: "flex",
					flexDirection: window.innerWidth < 725 ? "column" : "row",
					justifyContent: "flex-start"
				}}>
					<div style={{marginRight: "1em"}}>
						<RarityFilter
								altTitle={t('hints.filter_ship_rarity')}
								rarityFilter={shipRarityFilter}
								setRarityFilter={setShipRarityFilter}
							/>
					</div>
					<div style={{marginRight: "1em", width: window.innerWidth < 725 ? "auto" : "25em"}}>
						<ShipPicker
							filter={shipPickerFilter}
							selectedShip={selectedShip}
							pool={props.ships}
							setSelectedShip={(item) => setShipFilters({ ... shipFilters, selectedShip: item })}
							playerData={props.playerData} />
					</div>
					<div className="ui button"
							title={"Clear Ship Filters"}
							onClick={(e) => clearShipAbilitiess()}
							style={{
								marginTop: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '1em' : undefined,
								height: "3em",
								width: "3em",
								display: "flex",
								flexDirection: "row",
								textAlign: "center",
								justifyContent: "center",
								alignItems: "center"
								}}

								>
						<i style={{margin:0}}

							className="trash icon alt" />
					</div>
				</div>

				<div style={{margin: "0", marginTop:"1em", display: "flex", flexWrap: "wrap", flexDirection: "row", alignItems: "center"}}>
					<div style={{
						marginLeft: 0,
						marginTop: 0
						}}>
						<ShipSeatPicker
								setSelectedSeats={(item) => setShipFilters({ ... shipFilters, selectedSeats: item })}
								selectedSeats={selectedSeats ?? []}
								availableSeats={availableSeats}
							/>
					</div>

				</div>

				<div style={{margin: "1em 0", display: "flex", flexWrap: "wrap", flexDirection: "row", alignItems: "center"}}>
					<div style={{marginRight: "1em"}}>
						<AbilityUses uses={availableUses} selectedUses={selectedUses ?? []} setSelectedUses={(item) => setShipFilters({ ... shipFilters, selectedUses: item })} />
					</div>
					<div style={{display: "flex", flexDirection:"row", alignItems: "center", margin: 0, marginRight:"1em"}}>
						<BonusPicker selectedBonuses={selectedBonuses} setSelectedBonuses={(item) => setShipFilters({ ... shipFilters, selectedBonuses: item })} />
					</div>
					{!isCheckDisabled() &&
					<div style={{display: "flex", flexDirection:"row", alignItems: "center"}}>
						<Checkbox checked={triggerOnly} onChange={(e, { checked }) => setShipFilters({ ... shipFilters, triggerOnly: checked as boolean })} />
						<div style={{ margin: "8px" }}>{t('ship.crew_with_trigger_check')} {selectedShip?.actions?.some(ab => ab.status && ab.status != 16) && "(" + printTriggers(selectedShip) + ")"}</div>
					</div>}
					{!selectedShip &&
					<div style={{display: "flex", flexDirection:"row", alignItems: "center", margin: 0}}>
						<TriggerPicker selectedTriggers={selectedTriggers} setSelectedTriggers={(item) => setShipFilters({ ... shipFilters, selectedTriggers: item as string[] })} />
					</div>}
				</div>

				<div style={{
					margin: "0.25em 0",
					marginTop: 0,
					display: "flex",
					flexDirection: window.innerWidth < 725 ? "column" : "row",
					justifyContent: "flex-start"
				}}>
					<div style={{marginRight: "1em", width: window.innerWidth < 725 ? "auto" : "25em"}}>
						<ShipAbilityPicker
								fluid
								selectedAbilities={selectedAbilities ?? []}
								setSelectedAbilities={(item) => setShipFilters({ ... shipFilters, selectedAbilities: item })}
								availableAbilities={availableAbilities}
							/>
					</div>
					<div style={{marginRight: "1em", width: window.innerWidth < 725 ? "auto" : "25em"}}>
						<ShipAbilityRankPicker
								selectedRankings={selectedRankings ?? []}
								setSelectedRankings={(item) => setShipFilters({ ... shipFilters, selectedRankings: item })}
								availableRankings={rankings}
							/>
					</div>
				</div>
			</div>
		</Form>
	);
};
