import React from 'react';
import { Table, Icon, Rating, Form, Header, Button, Dropdown } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow, initSearchableOptions, initCustomOption } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';
import ProspectPicker from '../components/prospectpicker';

import { CrewBaseCells, CrewShipCells, CrewTraitMatchesCell } from '../components/crewtables/commoncells';
import { RarityFilter, CrewTraitFilter } from '../components/crewtables/commonoptions';
import RosterSummary from '../components/crewtables/rostersummary';
import UtilityWizard from '../components/crewtables/utilitywizard';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { applySkillBuff, getShipBonus, getShipChargePhases, getSkills, gradeToColor, isImmortal, navToCrewPage } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { InitialOptions, LockedProspect, SymbolName } from '../model/game-elements';
import { CrewMember } from '../model/crew';
import CrewStat from './crewstat';
import { formatTierLabel } from '../utils/crewutils';
import { StatLabel } from './citeoptimizer';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import ShipPicker from './shippicker';
import { Ship } from '../model/ship';
import { ShipPickerFilter, findPotentialCrew } from '../utils/shiputils';
import ShipSeatPicker from './shipseatpicker';

type ProfileCrewProps = {
	playerData: PlayerData;
	isTools?: boolean;
	allCrew?: PlayerCrew[];
	location: any;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const myCrew = [...props.playerData.player.character.crew];

	// Check for custom initial table options from URL or <Link state>
	//	Custom options are only available in player tool right now
	let initOptions = initSearchableOptions(window.location);
	// Check for custom initial profile_crew options from URL or <Link state>
	const initHighlight = initCustomOption(props.location, 'highlight', '');
	const initProspects = initCustomOption(props.location, 'prospect', [] as string[]);
	// Clear history state now so that new stored values aren't overriden by outdated parameters
	if ("state" in window.location && (initOptions || initHighlight || initProspects))
		window.history.replaceState(null, '');

	const allCrew = [...props.allCrew ?? []].sort((a, b)=>a.name.localeCompare(b.name));

	if (props.isTools) {
		const buffConfig = calculateBuffConfig(props.playerData.player);
		return (
			<ProfileCrewTools playerData={props.playerData} myCrew={myCrew} allCrew={allCrew} buffConfig={buffConfig}
				initOptions={initOptions} initHighlight={initHighlight} initProspects={initProspects}
				dbid={`${props.playerData.player.dbid}`} />
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

	return (<ProfileCrewTable playerData={props.playerData} crew={myCrew} allCrew={allCrew} initOptions={initOptions} lockable={lockable} />);
};

type ProfileCrewToolsProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
	playerData: PlayerData;
	buffConfig: BuffStatTable;
	initOptions?: InitialOptions;
	initHighlight: string;
	initProspects: string[];
	dbid: string;
};

const ProfileCrewTools = (props: ProfileCrewToolsProps) => {
	const { allCrew, buffConfig, initOptions } = props;
	const [prospects, setProspects] = useStateWithStorage<LockedProspect[]>('crewTool/prospects', []);
	const [activeCrew, setActiveCrew] = useStateWithStorage<PlayerCrew[] | undefined>('tools/activeCrew', undefined);
	const [wizard, setWizard] = React.useState(undefined);

	const myCrew = JSON.parse(
		JSON.stringify(props.myCrew), 
		(key, value) => {
			if (key === 'date_added' && typeof value === 'string') {
				return new Date(value);
			}
			return value;
		}
	);

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
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
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
			let prospect = JSON.parse(JSON.stringify(crew)) as PlayerCrew;
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
				...prospect,
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
			<ProfileCrewTable allCrew={allCrew} playerData={props.playerData} pageId='crewTool' crew={myCrew} initOptions={initOptions} lockable={lockable} wizard={wizard} />
			<Prospects pool={props.allCrew} prospects={prospects} setProspects={setProspects} />
			<Header as='h3'>Advanced Analysis</Header>
			<RosterSummary myCrew={myCrew} allCrew={props.allCrew} buffConfig={buffConfig} />
			<UtilityWizard myCrew={myCrew} handleWizard={(wizardData: any) => setWizard({...wizardData})} dbid={props.dbid} />
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

type ProfileCrewTableProps = {
	pageId?: string;
	crew: PlayerCrew[];
	allCrew: CrewMember[];
	initOptions: any;
	lockable?: any[];
	wizard?: any;
	playerData: PlayerData;
};

const ProfileCrewTable = (props: ProfileCrewTableProps) => {
	const pageId = props.pageId ?? 'crew';

	const [tableView, setTableView] = useStateWithStorage(pageId+'/tableView', 'base');
	const [usableFilter, setUsableFilter] = useStateWithStorage(pageId+'/usableFilter', '');
	const [rosterFilter, setRosterFilter] = useStateWithStorage(pageId+'/rosterFilter', '');
	const [rarityFilter, setRarityFilter] = useStateWithStorage(pageId+'/rarityFilter', [] as number[]);
	const [shipRarityFilter, setShipRarityFilter] = useStateWithStorage(pageId+'/shipRarityFilter', [] as number[]);
	const [shipFilter, setShipFilter] = useStateWithStorage<ShipPickerFilter | undefined>(pageId+'/shipFilter', undefined);
	const [traitFilter, setTraitFilter] = useStateWithStorage(pageId+'/traitFilter', [] as string[]);
	const [minTraitMatches, setMinTraitMatches] = useStateWithStorage(pageId+'/minTraitMatches', 1);
	const [selectedShip, setSelectedShip] = useStateWithStorage<Ship | undefined>(pageId+'/selectedShip', undefined);
	const [selectedSeats, setSelectedSeats] = useStateWithStorage(pageId+'/selectedSeats', [] as string[]);
	const [availableSeats, setAvailableSeats] = useStateWithStorage(pageId+'/availableSeats', [] as string[]);

	const [focusedCrew, setFocusedCrew] = React.useState<PlayerCrew | CrewMember | undefined | null>(undefined);
	const [shipCrew, setShipCrew] = React.useState<PlayerCrew[] | CrewMember[] | undefined | null>([]);

	const buffConfig = calculateBuffConfig(props.playerData.player);

	React.useEffect(() => {
		if (usableFilter === 'frozen') setRosterFilter('');		
	}, [usableFilter, shipCrew, tableView]);

	React.useEffect(() => {
		if (minTraitMatches > traitFilter.length)
			setMinTraitMatches(traitFilter.length === 0 ? 1 : traitFilter.length);
	}, [traitFilter]);
	// Ship stuff

	React.useEffect(() => {
		if (!shipRarityFilter) {
			if (!shipFilter) return;
			setShipFilter({ ... shipFilter, rarity: undefined });
		}
		else {
			if (!shipFilter) {
				setShipFilter({ rarity: shipRarityFilter });
			}
			else {
				setShipFilter({ ... shipFilter, rarity: shipRarityFilter });
			}
		}
	}, [shipRarityFilter]);

	React.useEffect(() => {
		if (selectedShip) {
			setShipCrew(findPotentialCrew(selectedShip, myCrew, false, selectedSeats));
			setAvailableSeats(Object.keys(CONFIG.SKILLS).filter(key => selectedShip.battle_stations?.some(bs => bs?.skill === key) ?? true));
		}
		else {
			setShipCrew([]);
			setAvailableSeats(Object.keys(CONFIG.SKILLS));
		}	
	}, [selectedShip, selectedSeats])

	const usableFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' },
		{ key: 'frozen', value: 'frozen', text: 'Only show frozen crew' },
		{ key: 'idle', value: 'idle', text: 'Only show idle crew', tool: 'true' }
	];

	const rosterFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'freezable', value: 'freezable', text: 'Only show freezable crew' },
		{ key: 'mortal', value: 'mortal', text: 'Only show non-immortals' },
		{ key: 'priority', value: 'priority', text: 'Only show fully-fused non-immortals' },
		{ key: 'impact', value: 'impact', text: 'Only show crew needing 1 fuse' },
		{ key: 'fodder', value: 'fodder', text: 'Only show unfused crew' },
		{ key: 'dupes', value: 'dupes', text: 'Only show duplicate crew' }
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
		tableConfig.push(
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
			{ width: 1, column: 'date_added', title: 'Date Added' },
		);
		if (props.wizard?.view === tableView) {
			props.wizard.columns.forEach(column => tableConfig.push(column));
		}
	}

	if (tableView === 'ship') {
		tableConfig.push(
			{ width: 1, column: 'action.bonus_type', title: 'Boosts' },
			{ width: 1, column: 'action.bonus_amount', title: 'Amount', reverse: true, tiebreakers: ['action.bonus_type'] },
			{ width: 1, column: 'action.penalty.type', title: 'Handicap', tiebreakers: ['action.penalty.amount'] },
			{ width: 1, column: 'action.initial_cooldown', title: 'Initialize' },
			{ width: 1, column: 'action.cooldown', title: 'Cooldown' },
			{ width: 1, column: 'action.duration', title: 'Duration', reverse: true },
			{ width: 1, column: 'action.limit', title: 'Uses' },
			{ width: 1, column: 'action.ability_text', title: 'Bonus Ability', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
			{ width: 1, column: 'action.ability_trigger', title: 'Trigger', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
			{ width: 1, column: 'action.charge_text', title: 'Charge Phases' },
			{ width: 1, column: 'ship_battle.accuracy', title: 'Accuracy', reverse: true },
			{ width: 1, column: 'ship_battle.crit_bonus', title: 'Crit Bonus', reverse: true },
			{ width: 1, column: 'ship_battle.crit_chance', title: 'Crit Rating', reverse: true },
			{ width: 1, column: 'ship_battle.evasion', title: 'Evasion', reverse: true }
		);
	}

	const myCrew = [...props.crew];
	const allCrew = [...props.allCrew];

	if (traitFilter.length > 0) {
		myCrew.forEach(crew => {
			crew.traits_matched = traitFilter.filter(trait => crew.traits.includes(trait));
		});
	}

	function showThisCrew(crew: PlayerCrew, filters: [], filterType: string): boolean {
		if (usableFilter === 'idle' && (crew.immortal > 0 || crew.active_status > 0)) return false;
		if (usableFilter === 'thawed' && crew.immortal > 0) return false;
		if (usableFilter === 'frozen' && crew.immortal <= 0) return false;
		if (rosterFilter === 'freezable' && (crew.immortal !== -1 || !isImmortal(crew))) return false;
		if (rosterFilter === 'mortal' && isImmortal(crew)) return false;
		if (rosterFilter === 'priority' && (isImmortal(crew) || crew.max_rarity !== crew.rarity)) return false;
		if (rosterFilter === 'impact' && crew.max_rarity - crew.rarity !== 1) return false;
		if (rosterFilter === 'fodder' && (crew.max_rarity === 1 || crew.rarity !== 1 || crew.level >= 10)) return false;
		if (rosterFilter === 'dupes' && props.crew.filter((c) => c.symbol === crew.symbol).length === 1 && crew.immortal <= 1) return false;
		if (rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (traitFilter.length > 0 && (crew.traits_matched?.length ?? 0) < minTraitMatches) return false;
		
		// Ship filter

		if (tableView === 'ship' && ((shipCrew && shipCrew.length) || (selectedSeats.length))) {
			if (shipCrew && shipCrew.length && !shipCrew.some(cm => cm.symbol === crew.symbol)) return false;
			if (selectedSeats && selectedSeats.length && !selectedSeats.some(seat => getSkills(crew).includes(seat))) return false;
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
	}
	
	function renderTableRow(crew: PlayerCrew, idx: number, highlighted: boolean, setCrew: React.Dispatch<React.SetStateAction<PlayerCrew | CrewMember | null | undefined>> | undefined = undefined): JSX.Element {
		const attributes = {
			positive: highlighted
		};
				
		setCrew ??= (e) => { return; };
		
		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} {...attributes}>
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
							<CrewTarget buffConfig={buffConfig} allCrew={allCrew} inputItem={crew} setDisplayItem={setCrew} targetGroup='targetClass'>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
								<a onClick={(e) => navToCrewPage(crew, myCrew, buffConfig, allCrew)}>
									{crew.name}
								</a>
							</span>
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

	function descriptionLabel(crew: any): JSX.Element {
		const immortal = isImmortal(crew);
		const counts = [
			{ name: 'event', count: crew.events },
			{ name: 'collection', count: crew.collections.length }
		];
		const formattedCounts = counts.map((count, idx) => (
			<span key={idx} style={{ whiteSpace: 'nowrap' }}>
				{count.count} {count.name}{count.count !== 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
			</span>
		)).reduce((prev, curr) => <>{prev} {curr}</>);
		return (
			<div>
				{crew.favorite && <Icon name='heart' />}
				{immortal &&
					<React.Fragment>
						{crew.immortal > 0 && <span><Icon name='snowflake' />{crew.immortal} frozen</span>}
						{crew.immortal === CompletionState.Immortalized && <span>Immortalized, {formattedCounts}</span>}
					</React.Fragment>
				}
				{!immortal &&
					<React.Fragment>
						{crew.prospect && <Icon name='add user' />}
						{crew.active_status > 0 && <Icon name='space shuttle' />}
						<span>Level {crew.level}, </span>
						{formattedCounts}
					</React.Fragment>
				}
			</div>
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
	
	return (
        <React.Fragment>
            {pageId === "crewTool" && (
					<Button.Group>
						<Button
							onClick={() => setTableView("base")}
							positive={tableView === "base" ? true : false}
							size="large"
						>
							Base Skills
						</Button>
						<Button.Or />
						<Button
							onClick={() => setTableView("ship")}
							positive={tableView === "ship" ? true : false}
							size="large"
						>
							Ship Abilities
						</Button>
					</Button.Group>
            )}

			
			{

			tableView === 'ship_disabled' && 
				<div style={{
					margin: "1em 0",
					display: "flex",
					flexDirection: "row",
					justifyContent: "flex-start"					
				}}>
					<div style={{marginRight: "16px"}}>
						<RarityFilter
								altTitle='Filter ship rarity'
								rarityFilter={shipRarityFilter}
								setRarityFilter={setShipRarityFilter}
							/>					
					</div>
					<div style={{marginRight: "16px", width: "25em"}}>
						<ShipPicker 							
							filter={shipFilter}
							selectedShip={selectedShip}
							setSelectedShip={setSelectedShip}
							playerData={props.playerData} />
					</div>
					<div style={{marginRight: "16px", minWidth: "15em"}}>
						<ShipSeatPicker
								setSelectedSeats={setSelectedSeats}
								selectedSeats={selectedSeats}
								availableSeats={availableSeats}
							/>					
					</div>

				</div>
			}

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
                        {usableFilter !== "frozen" && (
                            <Form.Field
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
                showFilterOptions={true}
                initOptions={props.initOptions}
                lockable={props.lockable}
            />
            <CrewHoverStat openCrew={(crew) => navToCrewPage(crew, myCrew, buffConfig, allCrew)} crew={focusedCrew ?? undefined} targetGroup="targetClass" />
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
