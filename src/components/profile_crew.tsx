import * as React from 'react';
import { Table, Icon, Rating, Form, Header, Button, Dropdown, Checkbox } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { SearchableTable, ITableConfigRow, initSearchableOptions, initCustomOption } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';
import ProspectPicker from '../components/prospectpicker';

import { CrewBaseCells, CrewShipCells, CrewTraitMatchesCell } from '../components/crewtables/commoncells';
import { RarityFilter, CrewTraitFilter, descriptionLabel } from '../components/crewtables/commonoptions';
import RosterSummary from '../components/crewtables/rostersummary';
import UtilityWizard from '../components/crewtables/utilitywizard';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { ShipSkillRanking, ShipStatMap, applySkillBuff, createShipStatMap, crewCopy, getShipBonus, getShipChargePhases, getSkills, gradeToColor, isImmortal, mapToRankings, navToCrewPage, oneCrewCopy } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { CompletionState, Player, PlayerCrew, PlayerData } from '../model/player';
import { InitialOptions, LockedProspect, SymbolName } from '../model/game-elements';
import { CrewMember } from '../model/crew';
import CrewStat from './crewstat';
import { formatTierLabel } from '../utils/crewutils';
import { StatLabel } from './citeoptimizer';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { Ship } from '../model/ship';
import { ShipPickerFilter, findPotentialCrew, printTriggers } from '../utils/shiputils';
import { MergedContext } from '../context/mergedcontext';
import { AbilityUses, BonusPicker, ShipAbilityPicker, ShipAbilityRankPicker, ShipPicker, ShipSeatPicker, TriggerPicker } from './crewtables/shipoptions';
import { CrewFilterPanes, CrewTableCustomFilter, CustomFilterProps, FilterItemMethodConfig } from './crewtables/customviews';
import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';

const isWindow = typeof window !== 'undefined';

export type ProfileCrewProps = {
	isTools?: boolean;
	location: any;
	pageId?: string;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const { playerData, allCrew: crew, playerShips } = React.useContext(MergedContext);
	const myCrew = [...playerData.player.character.crew];
	const { pageId } = props;

	// Check for custom initial table options from URL or <Link state>
	//	Custom options are only available in player tool right now
	let initOptions = initSearchableOptions(window.location);
	// Check for custom initial profile_crew options from URL or <Link state>
	const initHighlight = initCustomOption(props.location, 'highlight', '');
	const initProspects = initCustomOption(props.location, 'prospect', [] as string[]);
	// Clear history state now so that new stored values aren't overriden by outdated parameters
	if ("state" in window.location && (initOptions || initHighlight || initProspects))
		window.history.replaceState(null, '');

	const allCrew = [...crew ?? []].sort((a, b)=>a.name.localeCompare(b.name));

	if (props.isTools) {
		const buffConfig = calculateBuffConfig(playerData.player);
		return (
			<ProfileCrewTools pageId={pageId} playerData={playerData} myCrew={myCrew} allCrew={allCrew} buffConfig={buffConfig}
				ships={playerShips} initOptions={initOptions} initHighlight={initHighlight} initProspects={initProspects}
				dbid={`${playerData.player.dbid}`} />
		);
	}

	const lockable = [] as SymbolName[];
	if (initHighlight != '') {
		const highlighted = myCrew.find(c => c.symbol === initHighlight);
		if (highlighted) {
			lockable.push({
				symbol: highlighted.symbol,
				name: highlighted.name
			});
		}
	}

	return (<ProfileCrewTable pageId={pageId} playerData={playerData} crew={myCrew} allCrew={allCrew} initOptions={initOptions} lockable={lockable} />);
};

type ProfileCrewToolsProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
	ships?: Ship[];
	playerData: PlayerData;
	buffConfig: BuffStatTable;
	initOptions?: InitialOptions;
	initHighlight: string;
	initProspects: string[];
	dbid: string;
	pageId?: string;
};

const ProfileCrewTools = (props: ProfileCrewToolsProps) => {
	const { pageId, allCrew, buffConfig, initOptions, ships } = props;
	const [prospects, setProspects] = useStateWithStorage<LockedProspect[]>('crewTool/prospects', []);
	const [activeCrew, setActiveCrew] = useStateWithStorage<PlayerCrew[] | undefined>('tools/activeCrew', undefined);
	const [wizard, setWizard] = React.useState(undefined);

	const myCrew = prospects?.length ? JSON.parse(JSON.stringify(props.myCrew)) : props.myCrew;

	// Create fake ids for active crew based on rarity, level, and equipped status
	const activeCrewIds = activeCrew?.map(ac => {
		return {
			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});
	myCrew.forEach((crew, crewId) => {
		crew.active_status = 0;
		if (!crew.immortal) {
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment?.join('');
			const active = activeCrewIds?.find(ac => ac.id === activeCrewId);
			if (active) {
				crew.active_status = active.active_status;
				active.id = '';	// Clear this id so that dupes are counted properly
			}
		}

		// Allow for more consistent sorting by ship abilities
		crew.action.ability_text = crew.action.ability ? getShipBonus(crew) : '';
		if (crew?.action?.ability?.condition) crew.action.ability_trigger = (crew.action.ability?.condition ?? -1) > 0 ? CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition] : '';
		crew.action.charge_text = crew.action.charge_phases ? getShipChargePhases(crew).join('; ') : '';
	});

	const lockable = [] as LockedProspect[];

	React.useEffect(() => {
		if (props.initProspects?.length > 0) {
			const newProspects = [] as LockedProspect[];
			props.initProspects.forEach(p => {
				const newProspect = allCrew.find(c => c.symbol === p) as PlayerCrew | undefined;
				if (newProspect) {
					newProspects.push({
						... newProspect,
						symbol: newProspect.symbol,
						name: newProspect.name,
						imageUrlPortrait: newProspect.imageUrlPortrait,
						rarity: newProspect.max_rarity,
						max_rarity: newProspect.max_rarity,
						prospect: true,
						level: 100
					});
				}
			});
			setProspects([...newProspects]);
		}
	}, [props.initProspects]);

	prospects?.forEach((p) => {
		let crew = allCrew.find((c) => c.symbol == p.symbol);
		if (crew) {
			let prospect = oneCrewCopy(crew) as PlayerCrew;
			prospect.id = myCrew.length+1;
			prospect.prospect = true;
			prospect.have = false;
			prospect.rarity = p.rarity;
			prospect.level = 100;
			let mc = myCrew.find(item => item.symbol === p.symbol);
			if (!mc) {
				prospect.immortal = CompletionState.DisplayAsImmortalUnowned;
			}
			CONFIG.SKILLS_SHORT.forEach(skill => {
				let score = { "core": 0, "min": 0, "max" : 0 };
				if (prospect.base_skills[skill.name]) {
					if (prospect.rarity == prospect.max_rarity)
						score = applySkillBuff(buffConfig, skill.name, prospect.base_skills[skill.name]);
					else
						score = applySkillBuff(buffConfig, skill.name, prospect.skill_data[prospect.rarity-1].base_skills[skill.name]);
				}
				prospect[skill.name] = score;
			});
			if (!prospect.action.ability) prospect.action.ability = { type: 0, condition: 0, amount: 0 };
			myCrew.push(prospect);
			lockable.push({
				//...prospect,
				symbol: prospect.symbol,
				name: prospect.name,
				rarity: prospect.rarity,
				level: prospect.level,
				prospect: prospect.prospect
			});
		}
	});

	if (props.initHighlight != '') {
		const highlighted = myCrew.find(c => c.symbol === props.initHighlight);
		if (highlighted) {
			lockable.push({
				...highlighted,
				symbol: highlighted.symbol,
				name: highlighted.name,
				max_rarity: highlighted.max_rarity,
				rarity: highlighted.rarity,
				level: 100,
				prospect: highlighted.prospect ?? false
			});
		}
	}


	return (
		<React.Fragment>
			<ProfileCrewTable ships={ships} allCrew={allCrew} playerData={props.playerData} pageId={pageId ?? 'crewTool'} crew={myCrew} initOptions={initOptions} lockable={lockable} wizard={wizard} />
			{!(pageId?.includes("profile_")) &&
				<Prospects pool={props.allCrew} prospects={prospects} setProspects={setProspects} />}
			<Header as='h3'>Advanced Analysis</Header>
			<RosterSummary myCrew={myCrew} allCrew={props.allCrew} buffConfig={buffConfig} />
			<UtilityWizard myCrew={myCrew} handleWizard={(wizardData: any) => setWizard({...wizardData})} dbid={props.dbid} />
			<div style={{height: "2em"}}>&nbsp;</div>
		</React.Fragment>
	);

	// function applySkillBuff(buffConfig: any, skill: string, base_skill: any): { core: number, min: number, max: number } {
	// 	const getMultiplier = (skill: string, stat: string) => {
	// 		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
	// 	};
	// 	return {
	// 		core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
	// 		min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
	// 		max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
	// 	};
	// }
};


export type ProfileCrewTableProps = {
	pageId?: string;

	playerData: PlayerData;
	crew: PlayerCrew[];
	allCrew: CrewMember[];
	ships?: Ship[];

	initOptions: any;
	lockable?: any[];
	wizard?: any;

	/** Indicates which panes are showing */
	activePanes?: CrewFilterPanes;

	/** Custom filter content (the widgets, drop-downs, text inputs and other filter options) */
	customFilters?: CrewTableCustomFilter[];
};


interface ShipFilterConfig {
	selectedShip?: Ship;
	selectedSeats?: string[];
	selectedAbilities?: string[];
	selectedRankings?: string[];
	selectedTriggers?: string[];
	triggerOnly?: boolean;
	selectedUses?: number[];
	selectedBonuses?: number[];
}

export const ProfileCrewTable = (props: ProfileCrewTableProps) => {
	const pageId = props.pageId ?? 'crew';
	const { customFilters } = props;

	const [tableView, setTableView] = useStateWithStorage(pageId+'/tableView', 'base');
	const [usableFilter, setUsableFilter] = useStateWithStorage(pageId+'/usableFilter', '');
	const [rosterFilter, setRosterFilter] = useStateWithStorage(pageId+'/rosterFilter', '');
	const [rarityFilter, setRarityFilter] = useStateWithStorage(pageId+'/rarityFilter', [] as number[]);
	const [shipRarityFilter, setShipRarityFilter] = useStateWithStorage(pageId+'/shipRarityFilter', [] as number[]);
	const [shipPickerFilter, setShipPickerFilter] = useStateWithStorage<ShipPickerFilter>(pageId+'/shipPickerFilter', {} as ShipPickerFilter);
	const [traitFilter, setTraitFilter] = useStateWithStorage(pageId+'/traitFilter', [] as string[]);
	const [minTraitMatches, setMinTraitMatches] = useStateWithStorage(pageId+'/minTraitMatches', 1);

	const [shipFilters, setShipFilters] = useStateWithStorage<ShipFilterConfig>(pageId+"/shipFilterConfig", {});

	const { selectedBonuses, selectedShip, selectedTriggers, selectedSeats, selectedAbilities, selectedRankings, triggerOnly, selectedUses } = shipFilters;
	
	const [availableSeats, setAvailableSeats] = React.useState([] as string[]);
	const [availableAbilities, setAvailableAbilities] = React.useState([] as string[]);

	const [shipCrew, setShipCrew] = React.useState<string[]>([]);
	const [rankings, setRankings] = React.useState<ShipSkillRanking[] | undefined>([]);

	const [focusedCrew, setFocusedCrew] = React.useState<PlayerCrew | CrewMember | undefined | null>(undefined);
	
	const myCrew = props.crew; 

	const makeUses = (crew: (PlayerCrew | CrewMember)[]) => {
		let uses = crew.map((item) => item.action.limit ?? 0);
		uses = uses.filter((item, index) => uses.indexOf(item) === index);

		uses.sort((a, b) => a - b);

		return uses;
	}

	const [availableUses, setAvailableUses] = React.useState(makeUses(myCrew));

	React.useEffect(() => {
		if (selectedShip && !selectedShip?.actions?.some(l => l.status && l.status !== 16)) {
			if (triggerOnly) {
				setShipFilters({ ... shipFilters, triggerOnly: false });
			}
		}
	}, [selectedShip]);

	React.useEffect(() => {
		if (usableFilter === 'frozen' || usableFilter === 'frozen_dupes') setRosterFilter('');
	}, [usableFilter]);

	React.useEffect(() => {
		if (tableView === 'ship') {
			setRosterFilter(rosterFilter);
		}
	}, [tableView]);

	React.useEffect(() => {
		if (minTraitMatches > traitFilter.length)
			setMinTraitMatches(traitFilter.length === 0 ? 1 : traitFilter.length);
	}, [traitFilter]);
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
			newuses = makeUses(myCrew.filter(item => shipCrew.some(sc => sc === item.symbol)));
		}
		else {
			newuses = makeUses(myCrew);
		}
		if (JSON.stringify(newuses) !== JSON.stringify(availableUses)) {
			setAvailableUses(newuses);
		}
	}, [shipCrew, selectedAbilities]);

	const updateRankings = () => {
		let statmap: ShipStatMap;
		let newRankings: ShipSkillRanking[];

		if (shipCrew && shipCrew.length !== 0) {
			statmap = createShipStatMap(myCrew.filter(item => shipCrew.some(sc => sc === item.symbol)));
			newRankings = mapToRankings(statmap);
			newRankings = newRankings.filter(r => shipCrew.some(sc => r.crew_symbols.includes(sc)));
		}
		else {
			statmap = createShipStatMap(myCrew);
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
		let sc: (PlayerCrew | CrewMember)[] | undefined = undefined;

		if (selectedShip) {
			sc = findPotentialCrew(selectedShip, myCrew, triggerOnly, selectedSeats);
			if (selectedAbilities?.length) {
				sc = sc?.filter(c => selectedAbilities.some(able => c.action.ability?.type.toString() === able));
			}
			setAvailableSeats(Object.keys(CONFIG.SKILLS).filter(key => selectedShip.battle_stations?.some(bs => bs?.skill === key) ?? true));
		}
		else {
			if (selectedAbilities?.length) {
				sc = myCrew?.filter(c => selectedAbilities.some(able => c.action.ability?.type.toString() === able));
			}
			setAvailableSeats(Object.keys(CONFIG.SKILLS));
		}
		setAvailableAbilities(Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT).slice(0, 9));
		setShipCrew(sc?.map(f=>f.symbol).filter(g=>g) as string[]);
	}

	const clearShipFilters = () => {
		setShipFilters({});
		setShipCrew([]);		
		setShipPickerFilter({});
		setShipRarityFilter([]);
	}
	
	if (!rankings?.length) {
		if (isWindow) window.setTimeout(() => updateRankings());
	}

	const usableFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' },
		{ key: 'frozen', value: 'frozen', text: 'Only show frozen crew' },
		{ key: 'frozen_dupes', value: 'frozen_dupes', text: 'Only show frozen duplicate crew' },
		{ key: 'idle', value: 'idle', text: 'Only show idle crew', tool: 'true' }
	];

	const rosterFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'freezable', value: 'freezable', text: 'Only show freezable crew' },
		{ key: 'mortal', value: 'mortal', text: 'Only show non-immortals' },
		{ key: 'priority', value: 'priority', text: 'Only show fully-fused non-immortals' },
		{ key: 'impact', value: 'impact', text: 'Only show crew needing 1 fuse' },
		{ key: 'threshold', value: 'threshold', text: 'Only show crew needing 2 fuses' },
		{ key: 'fodder', value: 'fodder', text: 'Only show unfused crew' },
		{ key: 'dupes', value: 'dupes', text: 'Only show duplicate crew' },
		{ key: 'faves', value: 'faves', text: 'Only show favorite crew' },

	];

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'level', 'events', 'collections.length'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['rarity'] },
	];

	if (traitFilter.length > 1) {
		tableConfig.push(
			{ width: 1, column: 'traits_matched.length', title: 'Matches', reverse: true, tiebreakers: ['max_rarity', 'rarity'] }
		);
	}

	if (tableView === 'base') {
		tableConfig?.push(
			{ width: 1, column: 'bigbook_tier', title: 'Tier' },
			{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
			{ width: 1, column: 'ranks.voyRank', title: 'Voyage' }
		);
		CONFIG.SKILLS_SHORT.forEach((skill) => {
			tableConfig.push({
				width: 1,
				column: `${skill.name}.core`,
				title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
				reverse: true
			});
		});
		tableConfig.push(
			{ width: 1, column: 'date_added', title: 'Release Date' },
		);
		if (props.wizard?.view === tableView) {
			props.wizard.columns.forEach(column => tableConfig.push(column));
		}
	}
	else if (tableView === 'ship') {
		tableConfig.push(
			{ width: 1, column: 'action.bonus_type', title: 'Boosts' },
			{ width: 1, column: 'action.bonus_amount', title: 'Amount', reverse: true, tiebreakers: ['action.bonus_type'] },
			{ width: 1, column: 'action.penalty.type', title: 'Handicap', tiebreakers: ['action.penalty.amount'] },
			{ width: 1, column: 'action.initial_cooldown', title: 'Initialize' },
			{ width: 1, column: 'action.cycle_time', title: 'Cycle Time' },
			{ width: 1, column: 'action.cooldown', title: 'Cooldown' },
			{ width: 1, column: 'action.duration', title: 'Duration', reverse: true },
			{ width: 1, column: 'action.limit', title: 'Uses' },
			{ width: 1, column: 'action.ability.amount', title: 'Bonus Ability', tiebreakers: ['action.ability.type'] },
			{ width: 1, column: 'action.ability.condition', title: 'Trigger', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
			{ width: 1, column: 'action.charge_text', title: 'Charge Phases' },
			{ width: 1, column: 'ship_battle.accuracy', title: 'Accuracy', reverse: true },
			{ width: 1, column: 'ship_battle.crit_bonus', title: 'Crit Bonus', reverse: true },
			{ width: 1, column: 'ship_battle.crit_chance', title: 'Crit Rating', reverse: true },
			{ width: 1, column: 'ship_battle.evasion', title: 'Evasion', reverse: true }
		);
	}
	else if (customFilters?.length && tableView.startsWith("custom")) {
		let idx = Number.parseInt(tableView.replace("custom", ""));
		if (idx < customFilters.length) {
			if (customFilters[idx].customColumns?.length) {
				for (let column of customFilters[idx].customColumns ?? []) {
					tableConfig.push(column);
				}
			}
		}
	}
	if (traitFilter.length > 0) {
		myCrew.forEach(crew => {
			crew.traits_matched = traitFilter.filter(trait => crew.traits.includes(trait));
		});
	}

	function showThisCrew(crew: PlayerCrew, filters: [], filterType: string): boolean {
		if (usableFilter === 'idle' && (crew.immortal > 0 || crew.active_status > 0)) return false;
		if (usableFilter === 'thawed' && crew.immortal > 0) return false;
		if (usableFilter === 'frozen' && crew.immortal <= 0) return false;
		if (usableFilter === 'frozen_dupes' && crew.immortal <= 1) return false;
		if (rosterFilter === 'faves' && !crew.favorite) return false;
		if (rosterFilter === 'freezable' && (crew.immortal !== -1 || !isImmortal(crew))) return false;
		if (rosterFilter === 'mortal' && isImmortal(crew)) return false;
		if (rosterFilter === 'priority' && (isImmortal(crew) || crew.max_rarity !== crew.rarity)) return false;
		if (rosterFilter === 'threshold' && crew.max_rarity - crew.rarity !== 2) return false;
		if (rosterFilter === 'impact' && crew.max_rarity - crew.rarity !== 1) return false;
		if (rosterFilter === 'fodder' && (crew.max_rarity === 1 || crew.rarity !== 1 || crew.level >= 10)) return false;
		if (rosterFilter === 'dupes' && props.crew.filter((c) => c.symbol === crew.symbol).length === 1) return false;
		if (rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (traitFilter.length > 0 && (crew.traits_matched?.length ?? 0) < minTraitMatches) return false;

		// Ship filter
		if (tableView === 'ship' && ((shipCrew) || (selectedSeats?.length) || selectedRankings?.length || availableSeats?.length)) {
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
		}
		else if (tableView.startsWith("custom")) {
			let idx = Number.parseInt(tableView.replace("custom", ""));
			if (idx < (filterConfig?.length ?? 0)) {
				let cfg = filterConfig[idx];
				if (cfg.filterItem && !cfg.filterItem(crew)) return false;
			}
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: PlayerCrew, idx: number, highlighted: boolean, setCrew: React.Dispatch<React.SetStateAction<PlayerCrew | CrewMember | null | undefined>> | undefined = undefined): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		setCrew ??= (e) => { return; };

		return (
			<Table.Row key={idx} {...attributes}>
				<Table.Cell className='sticky'>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget inputItem={crew} targetGroup={pageId+"targetClass"} >
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				{traitFilter.length > 1 && <CrewTraitMatchesCell crew={crew} />}
				{tableView === 'base' && <CrewBaseCells crew={crew} />}
				{tableView === 'ship' && <CrewShipCells crew={crew} />}
				{props.wizard?.view === tableView && props.wizard.renderCells(crew)}
			</Table.Row>
		);
	}


	// Adapted from function of same name in crewutils.ts
	// function formatChargePhases(crew): string {
	// 	let totalTime = 0;
	// 	let result = [] as string[];
	// 	crew.action.charge_phases.forEach(phase => {
	// 		totalTime += phase.charge_time;
	// 		let ps = `After ${totalTime}s `;

	// 		if (crew.action.ability?.type !== '') {
	// 			ps += CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', phase.ability_amount);
	// 		} else {
	// 			ps += `+${phase.bonus_amount - crew.action.bonus_amount} ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}`;
	// 		}

	// 		if (phase.cooldown) {
	// 			ps += ` (+${phase.cooldown - crew.action.cooldown}s Cooldown)`;
	// 		}
	// 		result.push(ps);
	// 	});

	// 	return result.join('; ');
	// }
	const compact = true;

	const isCheckDisabled = () => {
		return !selectedShip?.actions?.some(ab => ab.status && ab.status != 16);
	}

	const discoveredPanes: CrewFilterPanes[] = [];

	if (props.activePanes) {
		if (props.activePanes & CrewFilterPanes.BaseStats) {
			discoveredPanes.push(CrewFilterPanes.BaseStats);
		}
		if (props.activePanes & CrewFilterPanes.ShipStats) {
			discoveredPanes.push(CrewFilterPanes.ShipStats);
		}
		if (props.activePanes & CrewFilterPanes.CustomFilters) {
			if (customFilters?.length) {
				discoveredPanes.push(CrewFilterPanes.CustomFilters);
			}
		}
	}
	else {
		discoveredPanes.push(CrewFilterPanes.BaseStats);
		discoveredPanes.push(CrewFilterPanes.ShipStats);
		if (customFilters?.length) {
			discoveredPanes.push(CrewFilterPanes.CustomFilters);
		}
	}

	const activeElements: JSX.Element[] = [];
	const [filterConfig, setFilterConfig] = React.useState<FilterItemMethodConfig<PlayerCrew | CrewMember>[]>([]);

	const setItemConfig = (props: FilterItemMethodConfig<PlayerCrew | CrewMember>) => {
		let cfilters = [ ... filterConfig ];
		let seen = false;
		let update = false;

		for (let flt of cfilters) {
			if (flt.index === props.index) {
				if (flt.filterItem !== props.filterItem) {
					flt.filterItem = props.filterItem;
					update = true;
				}
				seen = true;
				break;
			}
		}
		if (!seen) cfilters.push(props);
		if (!seen || update) setFilterConfig(cfilters);
	}

	if (discoveredPanes.includes(CrewFilterPanes.CustomFilters) && customFilters?.length) {
		customFilters.forEach((filter, idx) => {
			const FilterView = filter.filterComponent as unknown as typeof React.Component<CustomFilterProps<PlayerCrew | CrewMember>, any, any>;
			activeElements.push(<FilterView key={idx} index={idx} setFilterItemMethod={setItemConfig} />);
		});
	}

	const viewModeButtons = [] as JSX.Element[];
	let btnidx = 0;

	if (discoveredPanes.includes(CrewFilterPanes.BaseStats)) viewModeButtons.push(<Button
			key={btnidx++}
			onClick={() => setTableView("base")}
			positive={tableView === "base" ? true : false}
			size="large"
		>
			Base Skills
		</Button>);

	if (discoveredPanes.includes(CrewFilterPanes.ShipStats)) {
		if (viewModeButtons.length) viewModeButtons.push(<Button.Or key={btnidx++} />);
		viewModeButtons.push(<Button
		key={btnidx++}
		onClick={() => setTableView("ship")}
			positive={tableView === "ship" ? true : false}
			size="large"
		>
			Ship Abilities
		</Button>)
	}

	if (discoveredPanes.includes(CrewFilterPanes.CustomFilters) && customFilters?.length) {
		customFilters.forEach((cfg, idx) => {
			const FilterView = cfg.filterComponent;
			const title = cfg.title;

			if (viewModeButtons.length) viewModeButtons.push(<Button.Or key={btnidx++} />);
			viewModeButtons.push(<Button
				key={btnidx++}
				onClick={() => setTableView("custom" + idx)}
				positive={tableView === ("custom" + idx) ? true : false}
				size="large"
			>
				{title ?? FilterView.title}
			</Button>);

		});
	}

	return (
        <React.Fragment>
            {pageId?.includes("crewTool") && (
					<Button.Group>
					{viewModeButtons.map((btn, idx) => {
						return btn;
					})}
					</Button.Group>
            )}
			{(
			(tableView.startsWith("custom") &&
			<div style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-start"
			}}>
				{activeElements[Number.parseInt(tableView.replace("custom", ""))]}
			</div>)
			||
			(tableView === 'ship' &&
				<div style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start"
				}}>
					<div style={{
						margin: "1em 0 0 0",
						display: "flex",
						flexDirection: window.innerWidth < 725 ? "column" : "row",
						justifyContent: "flex-start"
					}}>
						<div style={{marginRight: "1em"}}>
							<RarityFilter
									altTitle='Filter ship rarity'
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
								onClick={(e) => clearShipFilters()}
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
							<Checkbox checked={triggerOnly} onChange={(e, { value }) => setShipFilters({ ... shipFilters, triggerOnly: !!!triggerOnly })} />
							<div style={{ margin: "8px" }}>Show Only Crew With Matching Trigger {selectedShip?.actions?.some(ab => ab.status && ab.status != 16) && "(" + printTriggers(selectedShip) + ")"}</div>
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
			))}
            <CrewHoverStat targetGroup={pageId+"targetClass"} />

            <div style={{ margin: "1em 0" }}>
                <Form>
                    <Form.Group inline>
                        <Form.Field
                            placeholder="Filter by availability"
                            control={Dropdown}
                            clearable
                            selection
                            options={usableFilterOptions.filter(
                                (option) =>
                                    pageId === "crewTool" ||
                                    option.tool !== "true"
                            )}
                            value={usableFilter}
                            onChange={(e, { value }) => setUsableFilter(value)}
                        />
                        {usableFilter !== "frozen" && usableFilter !== "frozen_dupes" && (
                            <Form.Field
								style={{width:"18em"}}							
                                placeholder="Roster maintenance"
                                control={Dropdown}
                                clearable
                                selection
                                options={rosterFilterOptions}
                                value={rosterFilter}
                                onChange={(e, { value }) =>
                                    setRosterFilter(value)
                                }
                            />
                        )}
                        <RarityFilter
							rarityFilter={rarityFilter}
                            setRarityFilter={setRarityFilter}
                        />
                        <CrewTraitFilter
                            traitFilter={traitFilter}
                            setTraitFilter={setTraitFilter}
                            minTraitMatches={minTraitMatches}
                            setMinTraitMatches={setMinTraitMatches}
                        />
                    </Form.Group>
                </Form>
            </div>

            <SearchableTable
                id={`${pageId}/table_`}
                data={myCrew}
                config={tableConfig}
                renderTableRow={(crew, idx, highlighted) =>
                    renderTableRow(
                        crew,
                        idx ?? -1,
                        highlighted ?? false,
                        setFocusedCrew
                    )
                }
                filterRow={(crew, filters, filterType) =>
                    showThisCrew(crew, filters, filterType as string)
                }
				overflowX='auto'
                showFilterOptions={true}
                initOptions={props.initOptions}
                lockable={props.lockable}
            />
        </React.Fragment>
    );
}

type ProspectsProps = {
	pool: CrewMember[];
	prospects: LockedProspect[],
	setProspects: (data: LockedProspect[]) => void;
};

const Prospects = (props: ProspectsProps) => {
	const { pool, prospects, setProspects } = props;

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew to see how they fit into your existing roster.</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

export default ProfileCrew;
