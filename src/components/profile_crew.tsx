import React from 'react';
import { Table, Icon, Rating, Form, Header, Button, Dropdown, Label, Message, Accordion, Grid } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow, initSearchableOptions, initCustomOption } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';
import ProspectPicker from '../components/prospectpicker';
import ComboWizard from '../components/fleetbossbattles/combowizard';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

import allTraits from '../../static/structured/translation_en.json';

import * as SearchString from 'search-string';

const AllDataContext = React.createContext();

type ProfileCrewProps = {
	playerData: any;
	isTools?: boolean;
	allCrew?: any[];
	location: any;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const myCrew = [...props.playerData.player.character.crew];

	// Check for custom initial table options from URL or <Link state>
	//	Custom options are only available in player tool right now
	let initOptions = initSearchableOptions(window.location);
	// Check for custom initial profile_crew options from URL or <Link state>
	const initHighlight = initCustomOption(props.location, 'highlight', '');
	const initProspects = initCustomOption(props.location, 'prospect', []);
	// Clear history state now so that new stored values aren't overriden by outdated parameters
	if (window.location.state && (initOptions || initHighlight || initProspects))
		window.history.replaceState(null, '');

	if (props.isTools) {
		const allCrew = [...props.allCrew].sort((a, b)=>a.name.localeCompare(b.name));
		const buffConfig = calculateBuffConfig(props.playerData.player);
		const allData = {
			allCrew, playerData: props.playerData, buffConfig
		};
		return (
			<AllDataContext.Provider value={allData}>
				<ProfileCrewTools myCrew={myCrew} initOptions={initOptions} initHighlight={initHighlight} initProspects={initProspects} />
			</AllDataContext.Provider>
		);
	}

	const lockable = [];
	if (initHighlight != '') {
		const highlighted = myCrew.find(c => c.symbol === initHighlight);
		if (highlighted) {
			lockable.push({
				symbol: highlighted.symbol,
				name: highlighted.name
			});
		}
	}
	myCrew.forEach((crew, crewId) => {
		// Allow for more consistent sorting by action ability
		if (!crew.action.ability) crew.action.ability = { type: '', condition: '', amount: '' };
	});
	return (<ProfileCrewTable crew={myCrew} initOptions={initOptions} lockable={lockable} />);
};

type ProfileCrewTools = {
	myCrew: any[];
	initOptions: any;
	initHighlight: string;
	initProspects: string[];
};

const ProfileCrewTools = (props: ProfileCrewTools) => {
	const { allCrew, buffConfig } = React.useContext(AllDataContext);

	const { initOptions } = props;
	const [prospects, setProspects] = useStateWithStorage('crewTool/prospects', []);
	const [activeCrew, setActiveCrew] = useStateWithStorage('tools/activeCrew', undefined);

	const myCrew = [...props.myCrew];

	// Create fake ids for active crew based on rarity, level, and equipped status
	const activeCrewIds = activeCrew.map(ac => {
		return {
			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});
	myCrew.forEach((crew, crewId) => {
		crew.active_status = 0;
		if (crew.immortal === 0) {
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
			const active = activeCrewIds.find(ac => ac.id === activeCrewId);
			if (active) {
				crew.active_status = active.active_status;
				active.id = '';	// Clear this id so that dupes are counted properly
			}
		}

		// Allow for more consistent sorting by action ability
		if (!crew.action.ability) crew.action.ability = { type: '', condition: '', amount: '' };
	});

	const lockable = [];

	React.useEffect(() => {
		if (props.initProspects?.length > 0) {
			const newProspects = [];
			props.initProspects.forEach(p => {
				const newProspect = allCrew.find(c => c.symbol === p);
				if (newProspect) {
					newProspects.push({
						symbol: newProspect.symbol,
						name: newProspect.name,
						imageUrlPortrait: newProspect.imageUrlPortrait,
						rarity: newProspect.max_rarity,
						max_rarity: newProspect.max_rarity
					});
				}
			});
			setProspects([...newProspects]);
		}
	}, [props.initProspects]);

	prospects.forEach((p) => {
		let prospect = allCrew.find((c) => c.symbol == p.symbol);
		if (prospect) {
			prospect = JSON.parse(JSON.stringify(prospect));
			prospect.id = myCrew.length+1;
			prospect.prospect = true;
			prospect.have = false;
			prospect.rarity = p.rarity;
			prospect.level = 100;
			prospect.immortal = 0;
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
			if (!prospect.action.ability) prospect.action.ability = { type: '', condition: '', amount: '' };
			myCrew.push(prospect);
			lockable.push({
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
				symbol: highlighted.symbol,
				name: highlighted.name
			});
		}
	}

	return (
		<React.Fragment>
			<ProfileCrewTable pageId='crewTool' crew={myCrew} initOptions={initOptions} lockable={lockable} />
			<Prospects pool={allCrew} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

type ProfileCrewTableProps = {
	pageId?: string;
	crew: any[];
	initOptions: any;
	lockable?: any[];
};

const ProfileCrewTable = (props: ProfileCrewTableProps) => {
	const pageId = props.pageId ?? 'crew';
	const [initOptions, setInitOptions] = React.useState(props.initOptions);
	const [tableView, setTableView] = useStateWithStorage(pageId+'/tableView', 'base');
	const [usableFilter, setUsableFilter] = useStateWithStorage(pageId+'/usableFilter', '');
	const [rosterFilter, setRosterFilter] = useStateWithStorage(pageId+'/rosterFilter', '');
	const [rarityFilter, setRarityFilter] = useStateWithStorage(pageId+'/rarityFilter', []);
	const [traitFilter, setTraitFilter] = useStateWithStorage(pageId+'/traitFilter', []);
	const [presetOptions, setPresetOptions] = useStateWithStorage(pageId+'/presetOptions', undefined);

	React.useEffect(() => {
		if (usableFilter === 'frozen') setRosterFilter('');
	}, [usableFilter]);

	const usableFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' },
		{ key: 'frozen', value: 'frozen', text: 'Only show frozen crew' },
		{ key: 'idle', value: 'idle', text: 'Only show idle crew', tool: 'true' }
	];

	const rosterFilterOptions = [
		{ key: 'none', value: '', text: 'Show all owned crew' },
		{ key: 'freezable', value: 'freezable', text: 'Only show freezable crew' },
		{ key: 'mortal', value: 'mortal', text: 'Only show non-immortals' },
		{ key: 'priority', value: 'priority', text: 'Only show fully-fused non-immortals' },
		{ key: 'impact', value: 'impact', text: 'Only show crew needing 1 fuse' },
		{ key: 'fodder', value: 'fodder', text: 'Only show unfused crew' },
		{ key: 'dupes', value: 'dupes', text: 'Only show duplicate crew' }
	];

	const rarityFilterOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	const traitOptions = Object.keys(allTraits.trait_names).map(trait => {
		return {
			key: trait,
			value: trait,
			text: allTraits.trait_names[trait]
		};
	}).sort((a, b) => a.text.localeCompare(b.text));

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
			{ width: 1, column: 'action.ability.type', title: 'Bonus Ability', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
			{ width: 1, column: 'action.ability.condition', title: 'Trigger', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
			{ width: 1, column: 'action.charge_phases', title: 'Charge Phases' },
			{ width: 1, column: 'ship_battle.accuracy', title: 'Accuracy', reverse: true },
			{ width: 1, column: 'ship_battle.crit_bonus', title: 'Crit Bonus', reverse: true },
			{ width: 1, column: 'ship_battle.crit_chance', title: 'Crit Rating', reverse: true },
			{ width: 1, column: 'ship_battle.evasion', title: 'Evasion', reverse: true }
		);
	}

	const isImmortal = c => c.level === 100 && c.rarity === c.max_rarity && c.equipment?.length === 4;

	const myCrew = [...props.crew];
	if (traitFilter.length > 0) {
		myCrew.forEach(crew => {
			crew.traits_matched = traitFilter.filter(trait => crew.traits.includes(trait));
		});
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (usableFilter === 'idle' && (crew.immortal > 0 || crew.active_status > 0)) return false;
		if (usableFilter === 'thawed' && crew.immortal > 0) return false;
		if (usableFilter === 'frozen' && crew.immortal === 0) return false;
		if (rosterFilter === 'freezable' && (crew.immortal > 0 || !isImmortal(crew))) return false;
		if (rosterFilter === 'mortal' && isImmortal(crew)) return false;
		if (rosterFilter === 'priority' && (isImmortal(crew) || crew.max_rarity !== crew.rarity)) return false;
		if (rosterFilter === 'impact' && crew.max_rarity - crew.rarity !== 1) return false;
		if (rosterFilter === 'fodder' && (crew.max_rarity === 1 || crew.rarity !== 1 || crew.level >= 10)) return false;
		if (rosterFilter === 'dupes' && props.crew.filter((c) => c.symbol === crew.symbol).length === 1) return false;
		if (rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (traitFilter.length > 0 && crew.traits_matched.length === 0) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: any, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)} {...attributes}>
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
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
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
				{traitFilter.length > 1 && (
					<Table.Cell textAlign='center'>
						{crew.traits_matched.map((trait, idx) => (
							<Label key={idx} color='brown'>
								{allTraits.trait_names[trait]}
							</Label>
						)).reduce((prev, curr) => [prev, ' ', curr], [])}
					</Table.Cell>
				)}
				{tableView === 'base' && <CrewRowBaseCells crew={crew} />}
				{tableView === 'ship' && <CrewRowShipCells crew={crew} />}
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
		)).reduce((prev, curr) => [prev, ' ', curr]);
		return (
			<div>
				{crew.favorite && <Icon name='heart' />}
				{immortal &&
					<React.Fragment>
						{crew.immortal > 0 && <span><Icon name='snowflake' />{crew.immortal} frozen</span>}
						{crew.immortal === 0 && <span>Immortalized</span>}
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

	return (
		<React.Fragment>
			<div>
				<Button.Group>
					<Button onClick={() => setTableView('base')} positive={tableView === 'base' ? true : null} size='large'>
						Base Skills
					</Button>
					<Button.Or />
					<Button onClick={() => setTableView('ship')} positive={tableView === 'ship' ? true : null} size='large'>
						Ship Abilities
					</Button>
				</Button.Group>
				<Button.Group floated='right'>
					{pageId === 'crewTool' && (!presetOptions || presetOptions.wizard === 'fleetboss') && (
						<Button.Group>
							<ComboWizard handleWizard={handleWizard} triggerText={presetOptions?.title} />
							{presetOptions && <Button content='Reset' onClick={() => resetForm()} />}
						</Button.Group>
					)}
				</Button.Group>
			</div>
			<div style={{ margin: '1em 0' }}>
				<Form>
					<Form.Group inline>
						<Form.Field
							placeholder='Filter by availability'
							control={Dropdown}
							clearable
							selection
							options={usableFilterOptions.filter(option => pageId === 'crewTool' || option.tool !== 'true')}
							value={usableFilter}
							onChange={(e, { value }) => setUsableFilter(value)}
						/>
						{usableFilter !== 'frozen' && (
							<Form.Field
								placeholder='Roster maintenance'
								control={Dropdown}
								clearable
								selection
								options={rosterFilterOptions}
								value={rosterFilter}
								onChange={(e, { value }) => setRosterFilter(value)}
							/>
						)}
						<Form.Field
							placeholder='Filter by rarity'
							control={Dropdown}
							clearable
							multiple
							selection
							options={rarityFilterOptions}
							value={rarityFilter}
							onChange={(e, { value }) => setRarityFilter(value)}
							closeOnChange
						/>
						<Form.Field
							placeholder='Filter by trait'
							control={Dropdown}
							clearable
							multiple
							search
							selection
							options={traitOptions}
							value={traitFilter}
							onChange={(e, { value }) => setTraitFilter(value)}
							closeOnChange
						/>
					</Form.Group>
				</Form>
			</div>
			<SearchableTable
				id={`${pageId}/table_`}
				data={myCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) => renderTableRow(crew, idx, highlighted)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions={true}
				initOptions={initOptions}
				lockable={props.lockable}
				zeroMessage={(search) => renderZeroMessage(search)}
				postTable={(searchFilter, filterType, filteredCount) => renderPostTable(searchFilter, filterType, filteredCount)}
			/>
		</React.Fragment>
	);

	function handleWizard(wizardData: any): void {
		const { nodeName, traitPool, rarityPool, searchText } = wizardData;
		setInitOptions({
			search: searchText,
			filter: 'Exact',
			column: 'traits_matched.length'
		});
		setRarityFilter(rarityPool);
		setTraitFilter(traitPool);
		setPresetOptions({
			wizard: 'fleetboss',
			title: nodeName,
			search: searchText
		});
	}

	function resetForm(): void {
		setInitOptions({ search: '' });	// This will reset all searchable options to default values
		setUsableFilter('');
		setRosterFilter('');
		setRarityFilter([]);
		setTraitFilter([]);
		setPresetOptions(undefined);
	}

	function renderZeroMessage(searchFilter: string): JSX.Element {
		return (
			<Message icon>
				<Icon name='search' />
				<Message.Content>
					<Message.Header>0 results found on your roster</Message.Header>
					<p>Please try different search options.</p>
					{presetOptions && presetOptions.search !== searchFilter && (
						<p>
							If you recently used a search wizard, it might help to
							<Button content='Reset' size='tiny' onClick={() => resetForm()} style={{ margin: '0 .5em' }} />
							all options to their default values before starting a new search.
						</p>
					)}
				</Message.Content>
			</Message>
		);
	}

	function renderPostTable(searchFilter: string, filterType: string, filteredCount: number): JSX.Element {
		if (pageId !== 'crewTool') return (<></>);
		if (usableFilter !== '') return (<></>);
		if (searchFilter === '' && rarityFilter.length === 0 && traitFilter.length === 0) return (<></>);

		return (
			<UnownedCrewTable myCrew={myCrew} tableView={tableView}
				rarityFilter={rarityFilter} traitFilter={traitFilter}
				searchFilter={searchFilter} filterType={filterType} filteredCount={filteredCount}
			/>
		);
	}
}

type UnownedCrewTableProps = {
	myCrew: any[];
	tableView: string;
	rarityFilter: number[];
	traitFilter: string[];
	searchFilter: string;
	filterType: string;
	filteredCount: number;
};

const UnownedCrewTable = (props: UnownedCrewTableProps) => {
	const { allCrew, buffConfig } = React.useContext(AllDataContext);
	const { tableView, rarityFilter, traitFilter, searchFilter, filterType, filteredCount } = props;

	const [showUnowned, setShowUnowned] = useStateWithStorage('crewTool/showUnowned', false);

	// Add dummy fields for sorting to work
	let unownedCrew = [...allCrew].filter(crew => !props.myCrew.find(m => m.symbol === crew.symbol));
	unownedCrew.forEach(crew => {
		CONFIG.SKILLS_SHORT.forEach(skill => {
			if (crew.base_skills[skill.name])
				crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.base_skills[skill.name]);
			else
				crew[skill.name] = 0;
		});
		crew.traits_matched = traitFilter.filter(trait => crew.traits.includes(trait));
		if (!crew.action.ability) crew.action.ability = { type: '', condition: '', amount: '' };
	});

	// Filter by original search conditions
	const filters = [];
	if (searchFilter) {
		const grouped = searchFilter.split(/\s+OR\s+/i);
		grouped.forEach(group => {
			filters.push(SearchString.parse(group));
		});
	}
	unownedCrew = unownedCrew.filter(crew => {
		if (rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (traitFilter.length > 0 && crew.traits_matched.length === 0) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	});

	const isShowing = showUnowned || (filteredCount === 0 && unownedCrew.length > 0);

	return (
		<Accordion>
			<Accordion.Title
				active={isShowing}
				onClick={() => setShowUnowned(!isShowing)}
			>
				<Icon name={isShowing ? 'caret down' : 'caret right'} /> Unowned Crew ({unownedCrew.length})
			</Accordion.Title>
			<Accordion.Content active={isShowing}>
				<p>{unownedCrew.length} unowned crew {filteredCount > 0 && unownedCrew.length > 0 ? ' also ' : ''} matched the above search options.</p>
				{unownedCrew.length > 0 && renderTable()}
			</Accordion.Content>
		</Accordion>
	);

	function renderTable(): JSX.Element {
		const tableConfig: ITableConfigRow[] = [
			{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'events', 'collections.length'] },
			{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
		];

		if (traitFilter.length > 1) {
			tableConfig.push(
				{ width: 1, column: 'traits_matched.length', title: 'Matches', reverse: true, tiebreakers: ['max_rarity'] }
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
				{ width: 1, column: 'action.ability.type', title: 'Bonus Ability', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
				{ width: 1, column: 'action.ability.condition', title: 'Trigger', tiebreakers: ['action.ability.type', 'action.ability.amount'] },
				{ width: 1, column: 'action.charge_phases', title: 'Charge Phases' },
				{ width: 1, column: 'ship_battle.accuracy', title: 'Accuracy', reverse: true },
				{ width: 1, column: 'ship_battle.crit_bonus', title: 'Crit Bonus', reverse: true },
				{ width: 1, column: 'ship_battle.crit_chance', title: 'Crit Rating', reverse: true },
				{ width: 1, column: 'ship_battle.evasion', title: 'Evasion', reverse: true }
			);
		}

		return (
			<SearchableTable
				id='crewToolUnowned/table_'
				data={unownedCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) => renderTableRow(crew, idx, highlighted)}
				filterRow={(crew, filters, filterType) => crewMatchesSearchFilter(crew, filters, filterType)}
				showFilterOptions={true}
			/>
		);
	}

	function renderTableRow(crew: any, idx: number, highlighted: boolean): JSX.Element {
		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
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
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				{traitFilter.length > 1 && (
					<Table.Cell textAlign='center'>
						{crew.traits_matched.map((trait, idx) => (
							<Label key={idx} color='brown'>
								{allTraits.trait_names[trait]}
							</Label>
						)).reduce((prev, curr) => [prev, ' ', curr], [])}
					</Table.Cell>
				)}
				{tableView === 'base' && <CrewRowBaseCells crew={crew} />}
				{tableView === 'ship' && <CrewRowShipCells crew={crew} />}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		const counts = [
			{ name: 'event', count: crew.events },
			{ name: 'collection', count: crew.collections.length }
		];
		const formattedCounts = counts.map((count, idx) => (
			<span key={idx} style={{ whiteSpace: 'nowrap' }}>
				{count.count} {count.name}{count.count !== 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
			</span>
		)).reduce((prev, curr) => [prev, ' ', curr]);
		return (
			<div>
				<React.Fragment>
					{formattedCounts}
				</React.Fragment>
			</div>
		);
	}
};

type CrewRowProps = {
	crew: any;
};

const CrewRowBaseCells = (props: CrewRowProps) => {
	const { crew } = props;
	const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<b>{formatTierLabel(crew.bigbook_tier)}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>{crew.cab_ov}</b><br />
				<small>{rarityLabels[parseInt(crew.max_rarity)-1]} #{crew.cab_ov_rank}</small>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>#{crew.ranks.voyRank}</b><br />
				{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
			</Table.Cell>
			{CONFIG.SKILLS_SHORT.map(skill =>
				crew[skill.name].core > 0 ? (
					<Table.Cell key={skill.name} textAlign='center'>
						<b>{crew[skill.name].core}</b>
						<br />
						+({crew[skill.name].min}-{crew[skill.name].max})
					</Table.Cell>
				) : (
					<Table.Cell key={skill.name} />
				)
			)}
		</React.Fragment>
	);
};

const CrewRowShipCells = (props: CrewRowProps) => {
	const { crew } = props;

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
				{crew.action.cooldown >= 0 && <><b>{crew.action.cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.duration && <><b>{crew.action.duration}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.limit && <><b>{crew.action.limit}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability.type !== '' && <>{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', crew.action.ability.amount)}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability.type !== '' && <>{CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.charge_phases && <>{formatChargePhases(crew)}</>}
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

	// Adapted from function of same name in crewutils.ts
	function formatChargePhases(crew): string {
		let totalTime = 0;
		let result = [];
		crew.action.charge_phases.forEach(phase => {
			totalTime += phase.charge_time;
			let ps = `After ${totalTime}s `;

			if (crew.action.ability?.type !== '') {
				ps += CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', phase.ability_amount);
			} else {
				ps += `+${phase.bonus_amount - crew.action.bonus_amount} ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}`;
			}

			if (phase.cooldown) {
				ps += ` (+${phase.cooldown - crew.action.cooldown}s Cooldown)`;
			}
			result.push(ps);
		});

		return result.join('; ');
	}
};

type ProspectsProps = {
	pool: any[];
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

function applySkillBuff(buffConfig: any, skill: string, base_skill: any): { core: number, min: number, max: number } {
	const getMultiplier = (skill: string, stat: string) => {
		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
	};
	return {
		core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
		min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
		max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
	};
}

export default ProfileCrew;
