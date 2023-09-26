import React from 'react';
import { Header, Table, Icon, Rating, Form, Dropdown, Checkbox, Image, Message } from 'semantic-ui-react';
import { Link } from 'gatsby';

import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import ProspectPicker from '../components/prospectpicker';
import ShuttleHelper from '../components/shuttlehelper/shuttlehelper';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { guessCurrentEvent, getEventData, EventData } from '../utils/events';
import { useStateWithStorage } from '../utils/storage';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { BestCombos, CompletionState, GameEvent, EventCombos, EventPair, EventSkill, PlayerCrew, PlayerData } from '../model/player';
import { ComputedBuff, CrewMember, Skill } from '../model/crew';
import { InitialOptions, LockedProspect } from '../model/game-elements';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { applySkillBuff, navToCrewPage } from '../utils/crewutils';
import { MergedContext } from '../context/mergedcontext';


const EventPlanner = () => {
	const { playerData, allCrew } = React.useContext(MergedContext);

	const [eventData, setEventData] = useStateWithStorage<EventData[] | undefined>('tools/eventData', undefined);
	const [activeCrew, setActiveCrew] = useStateWithStorage('tools/activeCrew', [] as PlayerCrew[]);

	const [activeEvents, setActiveEvents] = React.useState<EventData[] | undefined>(undefined);
	if (!activeEvents) {
		identifyActiveEvents();
		return (<></>);
	}

	if (activeEvents.length === 0)
		return (<p>Event data currently not available.</p>);

	// Create fake ids for active crew based on rarity, level, and equipped status
	const activeCrewIds = activeCrew.map(ac => {
		return {
			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});

	const myCrew = [] as PlayerCrew[];
	let fakeId = 1;
	playerData.player.character.crew.forEach(crew => {
		const crewman = JSON.parse(JSON.stringify(crew)) as PlayerCrew;
		crewman.id = fakeId++;

		// Re-attach active_status property
		crewman.active_status = 0;
		if (crew.immortal <= 0) {
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
			const active = activeCrewIds.find(ac => ac.id === activeCrewId);
			if (active) {
				crewman.active_status = active.active_status;
				active.id = '';	// Clear this id so that dupes are counted properly
			}
		}

		// Add immortalized skill numbers to skill_data
		//	allCrew stores immortalized numbers as base_skills,
		//	but playerData base_skills of unleveled crew are unbuffed skills at current level
		if (crew.immortal === CompletionState.NotComplete) {
			const ff = allCrew.find((c) => c.symbol === crew.symbol);
			if (ff)
				crewman.skill_data.push({
					rarity: crew.max_rarity,
					base_skills: ff.base_skills
				});
		}

		myCrew.push(crewman);
	});

	const buffConfig = calculateBuffConfig(playerData.player);

	return (
		<EventPicker playerData={playerData} events={activeEvents} crew={myCrew} buffConfig={buffConfig} allCrew={allCrew} />
	);

	function identifyActiveEvents(): void {
		// Get event data from recently uploaded playerData
		if (eventData) {
			let currentEvents = eventData.map((ev) => getEventData(ev, allCrew))
				.filter(ev => ev !== undefined).map(ev => ev as EventData)
				.filter((ev) => ev && ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setActiveEvents([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			guessCurrentEvent().then(currentEvent => {
				setActiveEvents([currentEvent]);
			});
		}
	}
};

type EventPickerProps = {
	playerData: PlayerData;
	events: EventData[];
	crew: PlayerCrew[];
	buffConfig: BuffStatTable;
	allCrew: CrewMember[];
};

interface EventMap {
	key: string;
	value: number;
	text: string;
}

const EventPicker = (props: EventPickerProps) => {
	const { playerData, events, crew, buffConfig, allCrew } = props;

	const [eventIndex, setEventIndex] = useStateWithStorage('eventplanner/eventIndex', 0);
	const [phaseIndex, setPhaseIndex] = useStateWithStorage('eventplanner/phaseIndex', 0);
	const [prospects, setProspects] = useStateWithStorage('eventplanner/prospects', [] as LockedProspect[]);

	const eventsList = [] as EventMap[];
	events.forEach((activeEvent, eventId) => {
		eventsList.push(
			{
				key: activeEvent.symbol,
				value: eventId,
				text: activeEvent.name
			}
		);
	});

	const eventData = events[eventIndex];

	const EVENT_TYPES = {
		'shuttles': 'Faction',
		'gather': 'Galaxy',
		'skirmish': 'Skirmish'
	};

	const phaseList = [] as EventMap[];
	eventData.content_types.forEach((contentType, phaseId) => {
		if (!phaseList.find((phase) => phase.key === contentType)) {
			phaseList.push(
				{
					key: contentType,
					value: phaseId,
					text: EVENT_TYPES[contentType]
				}
			);
		}
	});

	const allBonusCrew = allCrew.filter((c) => (eventData.bonus?.indexOf(c.symbol) ?? -1) >= 0);
	allBonusCrew.sort((a, b)=>a.name.localeCompare(b.name));

	const myCrew = JSON.parse(JSON.stringify(crew));
	const lockable = [] as LockedProspect[];

	prospects.forEach((p) => {
		let crew = allCrew.find((c) => c.symbol === p.symbol);
		if (crew) {
			let prospect = JSON.parse(JSON.stringify(crew)) as PlayerCrew;
			prospect.id = myCrew.length+1;
			prospect.prospect = true;
			prospect.have = false;
			prospect.rarity = p.rarity;
			prospect.level = 100;
			prospect.immortal = CompletionState.DisplayAsImmortalUnowned;
			CONFIG.SKILLS_SHORT.forEach(skill => {
				let score: ComputedBuff = { core: 0, min: 0, max: 0 };
				if (prospect.base_skills[skill.name]) {
					if (prospect.rarity === prospect.max_rarity)
						score = applySkillBuff(buffConfig, skill.name, prospect.base_skills[skill.name]);
					else
						score = applySkillBuff(buffConfig, skill.name, prospect.skill_data[prospect.rarity-1].base_skills[skill.name]);
				}
				prospect[skill.name] = score;
			});
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

	return (
		<React.Fragment>
			<Form>
				<Form.Field
					control={Dropdown}
					selection
					options={eventsList}
					value={eventIndex}
					onChange={(e, { value }) => setEventIndex(value) }
				/>
				<Image size='large' src={`${process.env.GATSBY_ASSETS_URL}${eventData.image}`} />
				<div>{eventData.description}</div>
				{phaseList.length > 1 && (<div style={{ margin: '1em 0' }}>Select a phase: <Dropdown selection options={phaseList} value={phaseIndex} onChange={(e, { value }) => setPhaseIndex(value as number) } /></div>)}
			</Form>
			<EventCrewTable allCrew={allCrew} crew={myCrew} eventData={eventData} phaseIndex={phaseIndex} buffConfig={buffConfig} lockable={lockable} />
			<EventProspects pool={allBonusCrew} prospects={prospects} setProspects={setProspects} />
			{eventData.content_types[phaseIndex] === 'shuttles' && (<EventShuttles playerData={playerData} crew={myCrew} eventData={eventData} />)}
		</React.Fragment>
	);
};

type EventCrewTableProps = {
	allCrew: (CrewMember | PlayerCrew)[];
	crew: PlayerCrew[];
	eventData: any;
	phaseIndex: number;
	buffConfig: BuffStatTable;
	lockable?: any[];
};

const EventCrewTable = (props: EventCrewTableProps) => {
	const { allCrew, eventData, phaseIndex, buffConfig } = props;

	const [showBonus, setShowBonus] = useStateWithStorage('eventplanner/showBonus', true);
	const [applyBonus, setApplyBonus] = useStateWithStorage('eventplanner/applyBonus', true);
	const [showPotential, setShowPotential] = useStateWithStorage('eventplanner/showPotential', false);
	const [showFrozen, setShowFrozen] = useStateWithStorage('eventplanner/showFrozen', true);
	const [initOptions, setInitOptions] = React.useState<InitialOptions>({});
	const crewAnchor = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		setInitOptions({});
	}, [eventData, phaseIndex]);

	if (eventData.bonus.length === 0)
		return (
			<div style={{ marginTop: '1em' }}>
				Featured crew not yet identified for this event.
			</div>
		);

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'max_rarity', 'level'] },
		{ width: 1, column: 'bonus', title: 'Bonus', reverse: true },
		{ width: 1, column: 'bestSkill.score', title: 'Best', reverse: true },
		{ width: 1, column: 'bestPair.score', title: 'Pair', reverse: true }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	// Check for custom column (i.e. combo from crew matrix click)
	let customColumn = '';
	if (initOptions?.column && tableConfig.findIndex(col => col.column === initOptions.column) === -1) {
		customColumn = initOptions.column;
		const customSkills = customColumn.replace('combos.', '').split(',');
		tableConfig.push({
			width: 1,
			column: customColumn,
			title:
				<span>
					<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${customSkills[0]}.png`} style={{ height: '1.1em' }} />
					+<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${customSkills[1]}.png`} style={{ height: '1.1em' }} />
				</span>,
			reverse: true
		});
	}

	const phaseType = phaseIndex < eventData.content_types.length ? eventData.content_types[phaseIndex] : eventData.content_types[0];

	let bestCombos: BestCombos = {};

	const zeroCombos: EventCombos = {};
	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
		let firstSkill = CONFIG.SKILLS_SHORT[first];
		zeroCombos[firstSkill.name] = 0;
		for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
			let secondSkill = CONFIG.SKILLS_SHORT[second];
			zeroCombos[firstSkill.name+','+secondSkill.name] = 0;
		}
	}

	// Always calculate new skill numbers from original, unaltered crew list
	let myCrew = JSON.parse(JSON.stringify(props.crew));

	// Filter crew by bonus, frozen here instead of searchabletable callback so matrix can use filtered crew list
	if (showBonus) myCrew = myCrew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
	if (!showFrozen) myCrew = myCrew.filter((c) => c.immortal <= 0);

	const getPairScore = (crew: any, primary: string, secondary: string) => {
		if (phaseType === 'shuttles') {
			if (secondary) return crew[primary].core+(crew[secondary].core/4);
			return crew[primary].core;
		}
		if (secondary) return (crew[primary].core+crew[secondary].core)/2;
		return crew[primary].core/2;
	};

	myCrew.forEach(crew => {
		// First adjust skill scores as necessary
		if (applyBonus || showPotential) {
			crew.bonus = 1;
			if (applyBonus && eventData.featured.indexOf(crew.symbol) >= 0) {
				if (phaseType === 'gather') crew.bonus = 10;
				else if (phaseType === 'shuttles') crew.bonus = 3;
			}
			else if (applyBonus && eventData.bonus.indexOf(crew.symbol) >= 0) {
				if (phaseType === 'gather') crew.bonus = 5;
				else if (phaseType === 'shuttles') crew.bonus = 2;
			}
			if (crew.bonus > 1 || showPotential) {
				CONFIG.SKILLS_SHORT.forEach(skill => {
					if (crew[skill.name].core > 0) {
						if (showPotential && crew.immortal === CompletionState.NotComplete && !crew.prospect) {
							crew[skill.name].current = crew[skill.name].core*crew.bonus;
							crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.skill_data[crew.rarity-1].base_skills[skill.name]);
						}
						crew[skill.name].core = crew[skill.name].core*crew.bonus;
					}
				});
			}
		}
		// Then calculate skill combination scores
		let combos: EventCombos = {...zeroCombos};
		let bestPair: EventPair = { score: 0, skillA: '', skillB: '' };
		let bestSkill: EventSkill = { score: 0, skill: '' };
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			const firstSkill = CONFIG.SKILLS_SHORT[first];
			const single = {
				score: crew[firstSkill.name].core,
				skillA: firstSkill.name
			};
			combos[firstSkill.name] = single.score;
			if (!bestCombos[firstSkill.name] || single.score > bestCombos[firstSkill.name].score)
				bestCombos[firstSkill.name] = { id: crew.id, score: single.score };
			if (single.score > bestSkill.score) bestSkill = { score: single.score, skill: single.skillA };
			for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
				const secondSkill = CONFIG.SKILLS_SHORT[second];
				let pair = {
					score: getPairScore(crew, firstSkill.name, secondSkill.name),
					skillA: firstSkill.name,
					skillB: secondSkill.name
				}
				if (crew[secondSkill.name].core > crew[firstSkill.name].core) {
					pair = {
						score: getPairScore(crew, secondSkill.name, firstSkill.name),
						skillA: secondSkill.name,
						skillB: firstSkill.name
					}
				}
				combos[firstSkill.name+','+secondSkill.name] = pair.score;
				if (pair.score > bestPair.score) bestPair = pair;
				const pairId = firstSkill.name+secondSkill.name;
				if (!bestCombos[pairId] || pair.score > bestCombos[pairId].score)
					bestCombos[pairId] = { id: crew.id, score: pair.score };
			}
		}
		crew.combos = combos;
		crew.bestPair = bestPair;
		crew.bestSkill = bestSkill;
	});

	return (
		<React.Fragment>
			<div ref={crewAnchor} />
			<Header as='h4'>Your Crew</Header>
			{eventData.bonusGuessed && <Message warning>The full list of bonus crew for this event is not yet available from player data. As a result, DataCore may not identify all of your possible event crew.</Message>}
			<div style={{ margin: '.5em 0' }}>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label={`Only show event crew (${eventData.bonus_text.replace('Crew Bonus: ', '')})`}
						checked={showBonus}
						onChange={(e, { checked }) => setShowBonus(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Apply event bonus to skills'
						checked={applyBonus}
						onChange={(e, { checked }) => setApplyBonus(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Show potential skills of unleveled crew'
						checked={showPotential}
						onChange={(e, { checked }) => setShowPotential(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Show frozen (vaulted) crew'
						checked={showFrozen}
						onChange={(e, { checked }) => setShowFrozen(checked)}
					/>
				</Form.Group>
			</div>
			<SearchableTable
				id='eventplanner'
				data={myCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) => renderTableRow(crew, idx ?? -1, highlighted ?? false)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType ?? '')}
				initOptions={initOptions}
				showFilterOptions={true}
				lockable={props.lockable}
			/>
			<CrewHoverStat openCrew={(crew) => navToCrewPage(crew, myCrew, buffConfig)} targetGroup='eventTarget' />
			{phaseType !== 'skirmish' && (<EventCrewMatrix crew={myCrew} bestCombos={bestCombos} phaseType={phaseType} handleClick={sortByCombo} />)}
		</React.Fragment>
	);

	function renderTableRow(crew: any, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		return (
			<Table.Row key={idx} {...attributes}>
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
							<CrewTarget targetGroup='eventTarget' inputItem={crew} >
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{crew.bonus > 1 ? `x${crew.bonus}` : ''}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{scoreLabel(crew.bestSkill.score)}</b>
					<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestSkill.skill}.png`} style={{ height: '1em' }} />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{scoreLabel(crew.bestPair.score)}</b>
					<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillA}.png`} style={{ height: '1em' }} />
					{crew.bestPair.skillB !== '' && (<span>+<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillB}.png`} style={{ height: '1em' }} /></span>)}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{scoreLabel(crew[skill.name].core)}</b>
							{phaseType !== 'gather' && (<span><br /><small>+({crew[skill.name].min}-{crew[skill.name].max})</small></span>)}
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
				{customColumn !== '' && (
						<Table.Cell key='custom' textAlign='center'>
							<b>{scoreLabel(customColumn.split('.').reduce((prev, curr) => prev.hasOwnProperty(curr) ? prev[curr] : undefined, crew))}</b>
						</Table.Cell>
					)
				}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		return (
			<div>
				<div><Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled /></div>
				<div>
					{crew.favorite && <Icon name='heart' />}
					{crew.immortal > 0 && <Icon name='snowflake' />}
					{crew.prospect && <Icon name='add user' />}
					<span>{crew.immortal > 0 ? (`${crew.immortal} frozen`) : crew.immortal < 0 ? crew.immortal <= -2 ? `Unowned` : `Immortalized` : (`Level ${crew.level}`)}</span>
				</div>
			</div>
		);
	}

	function scoreLabel(score: number): JSX.Element {
		if (!score || score === 0) return (<></>);
		if (phaseType === 'gather') return (<>{`${calculateGalaxyChance(score)}%`}</>);
		return (<>{Math.floor(score)}</>);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		// Bonus, frozen crew filtering now handled before rendering entire table instead of each row
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function sortByCombo(skillA: string, skillB: string): void {
		if (skillA === skillB) {
			setInitOptions({
				column: `${skillA}.core`,
				direction: 'descending'
			});
		}
		else {
			// Order of combo match order of skills in CONFIG
			const customSkills = [] as string[];
			CONFIG.SKILLS_SHORT.forEach((skill) => {
				if (skillA === skill.name || skillB === skill.name)
					customSkills.push(skill.name);
			});
			setInitOptions({
				column: `combos.${customSkills[0]},${customSkills[1]}`,
				direction: 'descending'
			});
		}
		if (!crewAnchor.current) return;
		crewAnchor.current.scrollIntoView({
			behavior: 'smooth'
		});
	}
};

type EventCrewMatrixProps = {
	crew: PlayerCrew[];
	bestCombos: any;
	phaseType: string;
	handleClick: (skillA: string, skillB: string) => void;
};

const EventCrewMatrix = (props: EventCrewMatrixProps) => {
	const { crew, bestCombos, phaseType, handleClick } = props;

	return (
		<React.Fragment>
			<Header as='h4'>Skill Matrix</Header>
			<p>This table shows your best crew for each possible skill combination. Use this table to identify your best crew for this event{phaseType === 'shuttles' ? ` and the best candidates to share in a faction event if you are a squad leader` : ''}.</p>
			<Table definition celled striped collapsing unstackable compact='very' style={{ width: '100%' }}>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						{CONFIG.SKILLS_SHORT.map((skill, cellId) => (
							<Table.HeaderCell key={cellId} width={2} textAlign='center'>
								<img alt={`${skill.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{CONFIG.SKILLS_SHORT.map((skillA, rowId) => (
						<Table.Row key={rowId}>
							<Table.Cell width={1} textAlign='center'><img alt={`${skillA.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillA.name}.png`} style={{ height: '1.1em' }} /></Table.Cell>
							{CONFIG.SKILLS_SHORT.map((skillB, cellId) => renderCell(skillA.name, skillB.name))}
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</React.Fragment>
	);

	function renderCell(skillA: string, skillB: string) : JSX.Element {
		let key, best;
		if (skillA === skillB) {
			key = skillA;
			best = bestCombos[skillA];
		}
		else {
			key = skillA+skillB;
			best = bestCombos[skillA+skillB] ?? bestCombos[skillB+skillA];
		}
		if (!best) best = {score: 0};
		if (best.score > 0) {
			let bestCrew = crew.find(c => c.id === best.id);
			let icon = (<></>);
			if (bestCrew && bestCrew.immortal > 0) icon = (<Icon name='snowflake' />);
			if (bestCrew && bestCrew.prospect) icon = (<Icon name='add user' />);
			return (
				<Table.Cell key={key} textAlign='center' style={{ cursor: 'zoom-in' }} onClick={() => handleClick(skillA, skillB)}>
				<CrewTarget inputItem={bestCrew} targetGroup='eventTarget'>
					<div>
					<img width={36} src={`${process.env.GATSBY_ASSETS_URL}${bestCrew?.imageUrlPortrait}`} /><br/>{icon} {bestCrew?.name} <small>({phaseType === 'gather' ? `${calculateGalaxyChance(best.score)}%` : Math.floor(best.score)})</small>
					</div>
				</CrewTarget> 

				</Table.Cell>
			);
		}
		return (
			<Table.Cell key={key} textAlign='center'>-</Table.Cell>
		);
	}
};

type EventProspectsProps = {
	pool: any[];
	prospects: any[];
	setProspects: (prospects: any[]) => void;
};

const EventProspects = (props: EventProspectsProps) => {
	const { pool, prospects, setProspects } = props;
	if (pool.length === 0) return (<></>);

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew (or shared crew) to see how they fit into your existing roster for this event.</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

type EventShuttlesProps = {
	playerData: any;
	crew: any[];
	eventData: any;
};

const EventShuttles = (props: EventShuttlesProps) => {
	const { playerData, eventData } = props;

	const [fullEventData, setFullEventData] = useStateWithStorage<EventData[] | undefined>('tools/eventData', undefined);

	//playerData.player.shuttle_rental_tokens

	const ShuttleProjection = () => {
		const SHUTTLE_DIFFICULTY = 4000;
		const SHUTTLE_DURATION = 3*60*60;
		const SHUTTLE_RATE = .9;

		if (eventData.seconds_to_start !== 0) return (<></>);

		let currentVP = 0, secondsToEndShuttles = eventData.seconds_to_end, endType = 'event';
		if (fullEventData) {
			const activeEvent = fullEventData.find(event => event.symbol === eventData.symbol);
			if (!activeEvent) return (<></>);
			currentVP = activeEvent.victory_points ?? 0;
			if (activeEvent.content_types.length > 1) {
				activeEvent.phases.forEach((phase, phaseIdx) => {
					if (activeEvent.content_types[phaseIdx] === 'shuttles')
						secondsToEndShuttles = phase.seconds_to_end;
						endType = 'faction phase';
				});
			}
		}

		let estimatedVP = currentVP;
		if (secondsToEndShuttles > 0) {
			const runsLeft = Math.floor(secondsToEndShuttles/SHUTTLE_DURATION)*playerData.player.character.shuttle_bays;
			const runsSuccessful = Math.floor(runsLeft*SHUTTLE_RATE);
			const runsFailed = runsLeft - runsSuccessful;
			estimatedVP += (runsSuccessful*SHUTTLE_DIFFICULTY)+(runsFailed*SHUTTLE_DIFFICULTY/5);
			return (
				<span> If you run {playerData.player.character.shuttle_bays} shuttles every 3 hours with a 90% success rate, you will have <b>{estimatedVP} VP</b> by the end of the {endType}.</span>
			);
		}

		return (<></>);
	};

	return (
		<React.Fragment>
			<Header as='h4'>Shuttle Helper</Header>
			<p>
				Use this tool to help plan your shuttles.
				<ShuttleProjection />
			</p>
			<ShuttleHelper helperId='eventplanner' groupId={eventData.symbol} dbid={playerData.player.dbid} crew={props.crew} eventData={eventData} />
		</React.Fragment>
	);
};

// Formula based on PADD's EventHelperGalaxy, assuming craft_config is constant
function calculateGalaxyChance(skillValue: number) : number {
	const craft_config = {
		specialist_chance_formula: {
			steepness: 0.3,
			midpoint: 5.5
		},
		specialist_challenge_rating: 1050,
		specialist_failure_bonus: 0.05,
		specialist_maximum_success_chance: 0.99
	};

	const midpointOffset = skillValue / craft_config.specialist_challenge_rating;
	const val = Math.floor(
		100 /
			(1 +
				Math.exp(
					-craft_config.specialist_chance_formula.steepness *
						(midpointOffset - craft_config.specialist_chance_formula.midpoint)
				)
			)
	);
	return Math.round(Math.min(val / 100, craft_config.specialist_maximum_success_chance)*100);
}

export default EventPlanner;
