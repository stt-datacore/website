import React from 'react';
import { Header, Table, Icon, Rating, Form, Dropdown, Checkbox, Input, Button, Grid, Image } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'max_rarity', 'level'] },
	{ width: 1, column: 'bonus', title: 'Bonus' },
	{ width: 1, column: 'bestSkill.score', title: 'Best' },
	{ width: 1, column: 'bestPair.score', title: 'Pair' },
	{ width: 1, column: 'command_skill.core', title: <img alt="Command" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} style={{ height: '1.1em' }} /> },
	{ width: 1, column: 'science_skill.core', title: <img alt="Science" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} style={{ height: '1.1em' }} /> },
	{ width: 1, column: 'security_skill.core', title: <img alt="Security" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} style={{ height: '1.1em' }} /> },
	{ width: 1, column: 'engineering_skill.core', title: <img alt="Engineering" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} style={{ height: '1.1em' }} /> },
	{ width: 1, column: 'diplomacy_skill.core', title: <img alt="Diplomacy" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} style={{ height: '1.1em' }} /> },
	{ width: 1, column: 'medicine_skill.core', title: <img alt="Medicine" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} style={{ height: '1.1em' }} /> }
];

type EventPlannerProps = {
	playerData: any;
	eventData: any;
	activeCrew: string[];
	allCrew: any;
};

const EventPlanner = (props: EventPlannerProps) => {
	const { playerData, eventData, allCrew } = props;
	const dbid = playerData.player.dbid;

	const activeCrew = JSON.parse(JSON.stringify(props.activeCrew));

	let myCrew = [];
	let fakeID = 1;
	playerData.player.character.crew.forEach(crew => {
		let crewman = JSON.parse(JSON.stringify(crew));
		crewman.id = fakeID++;

		// Re-attach active_status property
		crewman.active_status = 0;
		if (crew.immortal === 0) {
			const isActive = (ac) => ac.symbol == crew.symbol && ac.level == crew.level && ac.equipment.join('') === crew.equipment.join('');
			let activeCrewIndex = activeCrew.findIndex(isActive);
			if (activeCrewIndex >= 0) {
				crewman.active_status = activeCrew[activeCrewIndex].active_status;
				activeCrew.splice(activeCrewIndex, 1);	// Clear this ID so that dupes are counted properly
			}
		}

		myCrew.push(crewman);
	});

	let activeEvents = eventData.filter((ev) => ev.seconds_to_end > 0);
	activeEvents.sort((a, b) => (a.seconds_to_start - b.seconds_to_start));

	let buffConfig = calculateBuffConfig(playerData.player);

	return (
		<EventPicker dbid={dbid} events={activeEvents} crew={myCrew} buffConfig={buffConfig} allCrew={allCrew} />
	);
};

type EventPickerProps = {
	dbid: string;
	events: any[];
	crew: any[];
	buffConfig: any;
	allCrew: any[];
};

class EventData {
	symbol: string = '';
    name: string = '';
	image: string = '';
	description: string = '';
	content_types: string[] = [];	/* shuttles, gather, etc. */
    bonus: string[] = [];	/* ALL bonus crew by symbol */
	featured: string[] = [];	/* ONLY featured crew by symbol */
};

const EventPicker = (props: EventPickerProps) => {
	const { dbid, events, crew, buffConfig, allCrew } = props;

	const [eventIndex, setEventIndex] = useStateWithStorage('eventplanner/eventIndex', 0);
	const [phaseIndex, setPhaseIndex] = useStateWithStorage('eventplanner/phaseIndex', 0);
	const [prospects, setProspects] = useStateWithStorage('eventplanner/prospects', []);

	const eventsList = [];
	events.forEach((activeEvent, eventId) => {
		eventsList.push(
			{
				key: activeEvent.symbol,
				value: eventId,
				text: activeEvent.name
			}
		);
	});

	const eventData = getEventData(events[eventIndex]);

	const EVENT_TYPES = {
		'shuttles': 'Faction',
		'gather': 'Galaxy',
		'skirmish': 'Skirmish'
	};

	const phaseList = [];
	eventData.content_types.forEach((contentType, phaseId) => {
		if (!phaseList.find((phase) => phase.key == contentType)) {
			phaseList.push(
				{
					key: contentType,
					value: phaseId,
					text: EVENT_TYPES[contentType]
				}
			);
		}
	});

	const allBonusCrew = allCrew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
	allBonusCrew.sort((a, b)=>a.name.localeCompare(b.name));

	const myCrew = JSON.parse(JSON.stringify(crew));

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
			myCrew.push(prospect);
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
				{phaseList.length > 1 && (<div style={{ margin: '1em 0' }}>Select a phase: <Dropdown selection options={phaseList} value={phaseIndex} onChange={(e, { value }) => setPhaseIndex(value) } /></div>)}
			</Form>
			<EventCrewTable crew={myCrew} eventData={eventData} phaseIndex={phaseIndex} buffConfig={buffConfig} />
			<EventProspects crew={allBonusCrew} prospects={prospects} setProspects={setProspects} />
			{eventData.content_types[phaseIndex] == 'shuttles' && (<EventShuttlers dbid={dbid} crew={myCrew} eventData={eventData} />)}
		</React.Fragment>
	);

	function getEventData(activeEvent: any): EventData | undefined {
		let result = new EventData();
		result.symbol = activeEvent.symbol;
		result.name = activeEvent.name;
		result.description = activeEvent.description;
		result.content_types = activeEvent.content_types;

		// We can get event image more definitively by fetching from events/instance_id.json rather than player data
		result.image = activeEvent.phases[0].splash_image.file.substr(1).replace(/\//g, '_') + '.png';

		// Content is active phase of started event or first phase of unstarted event
		//	This may not catch all bonus crew in hybrids, e.g. "dirty" shuttles while in phase 2 skirmish
		let activePhase = activeEvent.content;
		if (activePhase.content_type == 'shuttles') {
			activePhase.shuttles.forEach((shuttle: any) => {
				for (let symbol in shuttle.crew_bonuses) {
					if (result.bonus.indexOf(symbol) < 0) {
						result.bonus.push(symbol);
						if (shuttle.crew_bonuses[symbol] == 3) result.featured.push(symbol);
					}
				}
			});
		}
		else if (activePhase.content_type == 'gather') {
			for (let symbol in activePhase.crew_bonuses) {
				if (result.bonus.indexOf(symbol) < 0) {
					result.bonus.push(symbol);
					if (activePhase.crew_bonuses[symbol] == 10) result.featured.push(symbol);
				}
			}
		}
		else if (activePhase.content_type == 'skirmish' && activePhase.bonus_crew) {
			for (let i = 0; i < activePhase.bonus_crew.length; i++) {
				let symbol = activePhase.bonus_crew[i];
				if (result.bonus.indexOf(symbol) < 0) {
					result.bonus.push(symbol);
					result.featured.push(symbol);
				}
			}
			// Skirmish also uses activePhase.bonus_traits to identify smaller bonus event crew
		}

		return result;
	}
};

type EventCrewTableProps = {
	crew: any[];
	eventData: any;
	phaseIndex: number;
	buffConfig: any;
};

const EventCrewTable = (props: EventCrewTableProps) => {
	const { eventData, phaseIndex, buffConfig } = props;

	const [showBonus, setShowBonus] = useStateWithStorage('eventplanner/showBonus', true);
	const [applyBonus, setApplyBonus] = useStateWithStorage('eventplanner/applyBonus', true);
	const [showPotential, setShowPotential] = useStateWithStorage('eventplanner/showPotential', false);
	const [showFrozen, setShowFrozen] = useStateWithStorage('eventplanner/showFrozen', true);

	const phaseType = phaseIndex < eventData.content_types.length ? eventData.content_types[phaseIndex] : eventData.content_types[0];

	let bestPairs = {};

	const zeroCombos = {};
	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
		let firstSkill = CONFIG.SKILLS_SHORT[first];
		zeroCombos[firstSkill.name] = 0;
		for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
			let secondSkill = CONFIG.SKILLS_SHORT[second];
			zeroCombos[firstSkill.name+','+secondSkill.name] = 0;
		}
	}

	let myCrew = JSON.parse(JSON.stringify(props.crew));

	// Filter crew by bonus, frozen here instead of searchabletable callback so matrix can use filtered crew list
	if (showBonus) myCrew = myCrew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
	if (!showFrozen) myCrew = myCrew.filter((c) => c.immortal == 0);

	myCrew.forEach(crew => {
		// First adjust skill scores as necessary
		if (applyBonus || showPotential) {
			crew.bonus = 1;
			if (applyBonus && eventData.featured.indexOf(crew.symbol) >= 0) {
				if (phaseType == 'gather') crew.bonus = 10;
				else if (phaseType == 'shuttles') crew.bonus = 3;
			}
			else if (applyBonus && eventData.bonus.indexOf(crew.symbol) >= 0) {
				if (phaseType == 'gather') crew.bonus = 5;
				else if (phaseType == 'shuttles') crew.bonus = 2;
			}
			if (crew.bonus > 1 || showPotential) {
				CONFIG.SKILLS_SHORT.forEach(skill => {
					if (crew[skill.name].core > 0) {
						if (showPotential) {
							crew[skill.name].current = crew[skill.name].core*crew.bonus;
							if (crew.rarity == crew.max_rarity)
								crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.base_skills[skill.name]);
							else
								crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.skill_data[crew.rarity-1].base_skills[skill.name]);
						}
						crew[skill.name].core = crew[skill.name].core*crew.bonus;
					}
				});
			}
		}
		// Then calculate skill combination scores
		let combos = {...zeroCombos};
		let bestPair = { score: 0 };
		let bestSkill = { score: 0 };
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			let firstSkill = CONFIG.SKILLS_SHORT[first];
			if (crew[firstSkill.name].core > 0) {
				let pair = {
					score: crew[firstSkill.name].core,
					skillA: firstSkill.name,
					skillB: ''
				};
				combos[firstSkill.name] = pair.score;
				if (pair.score > bestPair.score) bestPair = pair;
				if (pair.score > bestSkill.score) bestSkill = { score: pair.score, skill: pair.skillA };
				if (!bestPairs[firstSkill.name] || pair.score > bestPairs[firstSkill.name].score)
					bestPairs[firstSkill.name] = { id: crew.id, score: pair.score };
				for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
					let secondSkill = CONFIG.SKILLS_SHORT[second];
					if (crew[secondSkill.name].core > 0) {
						pair = {
							score: crew[firstSkill.name].core+(crew[secondSkill.name].core/4),
							skillA: firstSkill.name,
							skillB: secondSkill.name
						}
						if (crew[secondSkill.name].core > crew[firstSkill.name].core) {
							pair = {
								score: crew[secondSkill.name].core+(crew[firstSkill.name].core/4),
								skillA: secondSkill.name,
								skillB: firstSkill.name
							}
						}
						combos[firstSkill.name+','+secondSkill.name] = pair.score;
						if (pair.score > bestPair.score) bestPair = pair;
						let pairId = firstSkill.name+secondSkill.name;
						if (!bestPairs[pairId] || pair.score > bestPairs[pairId].score)
							bestPairs[pairId] = { id: crew.id, score: pair.score };
					}
				}
			}
		}
		//crew.combos = combos;	// Not used yet. Can be added as columns to searchabletable or passed to shuttlers
		crew.bestPair = bestPair;
		crew.bestSkill = bestSkill;
	});

	return (
		<React.Fragment>
			<Header as='h4'>Your Crew</Header>
			<div style={{ margin: '.5em 0' }}>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label='Only show event crew'
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
				id={"eventplanner"}
				data={myCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions="true"
			/>
			{phaseType != "skirmish" && (<EventCrewMatrix crew={myCrew} bestPairs={bestPairs} />)}
		</React.Fragment>
	);

	function renderTableRow(crew: any, idx: number): JSX.Element {
		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
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
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{crew.bonus > 1 ? `x${crew.bonus}` : ''}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{Math.floor(crew.bestSkill.score)}</b>
					<br /><img alt="Skill" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestSkill.skill}.png`} style={{ height: '1em' }} />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{Math.floor(crew.bestPair.score)}</b>
					<br /><img alt="Skill" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillA}.png`} style={{ height: '1em' }} />
					{crew.bestPair.skillB != '' && (<span>+<img alt="Skill" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillB}.png`} style={{ height: '1em' }} /></span>)}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew[skill.name].core}</b>
							<br />
							<small>+({crew[skill.name].min}-{crew[skill.name].max})</small>
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		return (
			<div>
				<div><Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled /></div>
				<div>
					{crew.favorite && <Icon name="heart" />}
					{crew.immortal > 0 && <Icon name="snowflake" />}
					{crew.prospect && <Icon name="add user" />}
					<span>{crew.immortal ? (`${crew.immortal} frozen`) : (`Level ${crew.level}`)}</span>
				</div>
			</div>
		);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		// Bonus, frozen crew filtering now handled before rendering entire table instead of each row
		return crewMatchesSearchFilter(crew, filters, filterType);
	}
};

type EventCrewMatrixProps = {
	crew: any[];
	bestPairs: any;
};

const EventCrewMatrix = (props: EventCrewMatrixProps) => {
	const {crew, bestPairs} = props;

	return (
		<React.Fragment>
			<Header as='h4'>Skill Matrix</Header>
			<p>This table shows your best crew for each possible skill combination. Use this table to identify your best crew for this event and the best candidates to share in a faction event if you are a squad leader.</p>
			<Table definition celled striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						{CONFIG.SKILLS_SHORT.map((skill, cellId) => (
							<Table.HeaderCell key={cellId} textAlign='center'>
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
		let key = skillA+skillB;
		let bestPair = bestPairs[skillA] ?? {score: 0};
		if (bestPairs[skillB] && bestPairs[skillB].score > bestPair.score) {
			bestPair = bestPairs[skillB];
		}
		if (bestPairs[skillA] && bestPairs[skillB]) {
			if (bestPairs[skillA+skillB] && bestPairs[skillA+skillB].score > bestPair.score) bestPair = bestPairs[skillA+skillB];
			if (bestPairs[skillB+skillA] && bestPairs[skillB+skillA].score > bestPair.score) bestPair = bestPairs[skillB+skillA];
		}
		if (bestPair.score > 0) {
			let bestCrew = crew.find(c => c.id == bestPair.id);
			let icon = (<></>);
			if (bestCrew.immortal) icon = (<Icon name='snowflake' />);
			if (bestCrew.prospect) icon = (<Icon name='add user' />);
			return (
				<Table.Cell key={key} textAlign='center'>
					<img width={36} src={`${process.env.GATSBY_ASSETS_URL}${bestCrew.imageUrlPortrait}`} /><br/>{icon} {bestCrew.name} <small>({Math.floor(bestPair.score)})</small>
				</Table.Cell>
			);
		}
		return (
			<Table.Cell key={key} textAlign='center'>-</Table.Cell>
		);
	}

	// Formula based on PADD's EventHelperGalaxy, assuming craft_config is constant
	//	Not used yet
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

		let midpointOffset = skillValue / craft_config.specialist_challenge_rating;
		let val = Math.floor(
			100 /
			(1 +
				Math.exp(
					-craft_config.specialist_chance_formula.steepness *
					(midpointOffset - craft_config.specialist_chance_formula.midpoint)
					))
			);
		return Math.min(val / 100, craft_config.specialist_maximum_success_chance);
	}
};

type EventProspectsProps = {
	crew: any[];
	prospects: any[];
	setProspects: (prospects: any[]) => void;
};

const EventProspects = (props: EventProspectsProps) => {
	const {crew, prospects, setProspects} = props;

	const [selection, setSelection] = React.useState('');

	const crewList = crew.map((c) => (
		{
			key: c.symbol,
			value: c.symbol,
			image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` },
			text: c.name
		}
	));

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew (or shared crew) to see how they fit into your existing roster for this event.</p>
			<Dropdown search selection clearable
				placeholder='Select Crew'
				options={crewList}
				value={selection}
				onChange={(e, { value }) => setSelection(value)}
			/>
			<Button compact icon='add user' color='green' content='Add Crew' onClick={() => { addProspect(); }} style={{ marginLeft: '1em' }} />
			<Table celled striped collapsing unstackable compact="very">
				<Table.Body>
					{prospects.map((p, prospectNum) => (
						<Table.Row key={prospectNum}>
							<Table.Cell><img width={24} src={`${process.env.GATSBY_ASSETS_URL}${p.imageUrlPortrait}`} /></Table.Cell>
							<Table.Cell>{p.name}</Table.Cell>
							<Table.Cell><Rating icon='star' rating={p.rarity} maxRating={p.max_rarity} size="large" onRate={(e, {rating, maxRating}) => { fuseProspect(prospectNum, rating); }} /></Table.Cell>
							<Table.Cell><Button compact icon='trash' color='red' onClick={() => deleteProspect(prospectNum)} /></Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</React.Fragment>
	);

	function addProspect(): void {
		if (selection == '') return;
		let valid = crew.find((c) => c.symbol == selection);
		if (valid) {
			let prospect = {
				symbol: valid.symbol,
				name: valid.name,
				imageUrlPortrait: valid.imageUrlPortrait,
				rarity: valid.max_rarity,
				max_rarity: valid.max_rarity
			};
			prospects.push(prospect);
			setProspects([...prospects]);
		};
		setSelection('');
	}

	function fuseProspect(prospectNum: number, rarity: number): void {
		if (rarity == 0) return;
		prospects[prospectNum].rarity = rarity;
		setProspects([...prospects]);
	}

	function deleteProspect(prospectNum: number): void {
		prospects.splice(prospectNum, 1);
		setProspects([...prospects]);
	}
};

class Shuttlers {
	shuttles: Shuttle[] = [];
}

class Shuttle {
	name: string = '';
	seats: ShuttleSeat[] = [];
}

class ShuttleSeat {
	operand: string = 'AND';
	skillA: string = '';
	skillB: string = '';
};

function getSkillSetId(seat: ShuttleSeat): string {
	let skillA = seat.skillA;
	let skillB = seat.skillB;
	let operand = seat.operand;
	let skills = [skillA, skillB];
	if (skillA == "" || skillA == skillB)
		skills = [skillB];
	else if (skillB == "")
		skills = [skillA];
	return operand+','+skills.sort((a, b)=>a.localeCompare(b));
}

type EventShuttlersProps = {
	dbid: string;
	crew: any[];
	eventData: any;
};

const EventShuttlers = (props: EventShuttlersProps) => {
	const [shuttlers, setShuttlers] = useStateWithStorage(props.dbid+'/eventplanner/shuttlers', new Shuttlers(), { rememberForever: true });
	const [assigned, setAssigned] = useStateWithStorage(props.dbid+'/eventplanner/assigned', [], { rememberForever: true });
	const [skillsets, setSkillSets] = React.useState({});
	const [crewScores, setCrewScores] = React.useState([]);
	const [shuttleScores, setShuttleScores] = React.useState(new Array(shuttlers.shuttles.length));

	const [considerActive, setConsiderActive] = useStateWithStorage('eventplanner/considerActive', true);
	const [considerVoyage, setConsiderVoyage] = useStateWithStorage('eventplanner/considerVoyage', false);
	const [considerFrozen, setConsiderFrozen] = useStateWithStorage('eventplanner/considerFrozen', false);
	const [saveSetups, setSaveSetups] = useStateWithStorage(props.dbid+'/eventplanner/saveSetups', false, { rememberForever: true });

	React.useEffect(() => {
		updateCrewScores();
	}, [shuttlers]);

	React.useEffect(() => {
		updateShuttleScores();
	}, [assigned]);

	React.useEffect(() => {
		updateCrewScores(true);
	}, [props.crew, considerActive, considerVoyage, considerFrozen]);

	// Shuttle setups and assignments are saved in local storage,
	//	so we must check whether to clear them on session close
	React.useEffect(() => {
		if (typeof window !== 'undefined' && window) {
			window.onbeforeunload = (e: any) => {
				if (!saveSetups) {
					setShuttlers(new Shuttlers());
					setAssigned([]);
				}
			};
		}
	}, [saveSetups]);

	return (
		<React.Fragment>
			<Header as='h4'>Shuttle Helper</Header>
			<p>Use this tool to help plan your shuttles in a faction event. Start by adding all missions that you want to run and set each seat to the skills required for each mission. Click 'Recommend' to see the best seats for your current crew. You can then rearrange crew to balance shuttle chances as you see fit.</p>
			<Table striped>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Mission</Table.HeaderCell>
						<Table.HeaderCell>Seats</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{shuttlers.shuttles.map((shuttle, shuttleNum) => (
						<Table.Row key={shuttleNum}>
							<Table.Cell>
								<EventShuttlersRenamer shuttleNum={shuttleNum} shuttleName={shuttle.name} updateCallback={updateShuttleName} />
								<Button icon color='red' onClick={() => deleteShuttle(shuttleNum)}><Icon name='trash' /></Button>
								{shuttleScores[shuttleNum] ? <div>{Math.floor(shuttleScores[shuttleNum].chance*100)}% Chance</div> : <></>}
							</Table.Cell>
							<Table.Cell>
								<Table compact="very" size="small">
									<Table.Body>
										{shuttle.seats.map((seat, seatNum) => (
											<Table.Row key={`${shuttleNum}_${seatNum}`}>
												<Table.Cell><EventShuttlersSeat shuttleNum={shuttleNum} seatNum={seatNum} seat={seat} updateCallback={updateShuttleSeat} /></Table.Cell>
												<Table.Cell><EventShuttlersCrewPicker shuttleNum={shuttleNum} seatNum={seatNum} seat={seat} skillsets={skillsets} assigned={assigned} updateCallback={updateAssignment} /></Table.Cell>
												<Table.Cell><Button compact icon='trash' color='red' onClick={() => deleteShuttleSeat(shuttleNum, seatNum)} /></Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table>
								<Button compact icon='add square' color='green' content='Add Seat' onClick={() => { addShuttleSeat(shuttleNum); updateShuttlers(); }} />
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan="2">
							<Button compact icon='space shuttle' color='green' content='Add Shuttle Mission' onClick={() => { addShuttleAndSeat(); updateShuttlers(); }} />
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			<div style={{ margin: '1em 0' }}>
			<Form.Group grouped>
				<Form.Field
					control={Checkbox}
					label='Consider crew on active shuttles'
					checked={considerActive}
					onChange={(e, { checked }) => setConsiderActive(checked)}
				/>
				<Form.Field
					control={Checkbox}
					label='Consider crew on active voyage'
					checked={considerVoyage}
					onChange={(e, { checked }) => setConsiderVoyage(checked)}
				/>
				<Form.Field
					control={Checkbox}
					label='Consider frozen (vaulted) crew'
					checked={considerFrozen}
					onChange={(e, { checked }) => setConsiderFrozen(checked)}
				/>
				<Form.Field
					control={Checkbox}
					label='Remember shuttle setups'
					checked={saveSetups}
					onChange={(e, { checked }) => setSaveSetups(checked)}
				/>
			</Form.Group>
			</div>
			<Button onClick={() => { recommendShuttlers(); }}>Recommend Shuttle Crew</Button>
		</React.Fragment>
	);

	function updateShuttleName(shuttleNum: number, shuttleName: string): void {
		shuttlers.shuttles[shuttleNum].name = shuttleName;
		updateShuttlers();
	}

	function addShuttleAndSeat(): void {
		let shuttleNum = addShuttle();
		addShuttleSeat(shuttleNum);
	}

	function addShuttle(): number {
		shuttlers.shuttles.push(new Shuttle());
		return shuttlers.shuttles.length-1;
	}

	function addShuttleSeat(shuttleNum: number): number {
		shuttlers.shuttles[shuttleNum].seats.push(new ShuttleSeat());
		return shuttlers.shuttles[shuttleNum].seats.length-1;
	}

	function updateShuttleSeat(shuttleNum: number, seatNum: number, skill: string, value: string): void {
		shuttlers.shuttles[shuttleNum].seats[seatNum][skill] = value;
		updateShuttlers();
	}

	function updateAssignment(shuttleNum: number, seatNum: number, assignedCrew: any): void {
		// Unassign crew from previously assigned seat, if necessary
		if (assignedCrew) {
			let current = assigned.find(seat => seat.assignedId == assignedCrew.id);
			if (current) {
				current.assignedId = -1;
				current.assignedSymbol = "";
				current.seatScore = 0;
			}
		}

		let seated = assigned.find(seat => seat.shuttleNum == shuttleNum && seat.seatNum == seatNum);
		if (assignedCrew && !seated) {
			assigned.push({
				shuttleNum,
				seatNum,
				ssId: assignedCrew.ssId,
				assignedId: assignedCrew.id,
				assignedSymbol: assignedCrew.symbol,
				seatScore: assignedCrew.score
			});
		}
		else if (assignedCrew) {
			seated.assignedId = assignedCrew.id;
			seated.assignedSymbol = assignedCrew.symbol;
			seated.seatScore = assignedCrew.score;
		}
		else {
			seated.assignedId = -1;
			seated.assignedSymbol = "";
			seated.seatScore = 0;
		}
		setAssigned([...assigned]);
	}

	function deleteShuttle(shuttleNum: number): void {
		shuttlers.shuttles.splice(shuttleNum, 1);
		updateShuttlers();
	}

	function deleteShuttleSeat(shuttleNum: number, seatNum: number): void {
		shuttlers.shuttles[shuttleNum].seats.splice(seatNum, 1);
		updateShuttlers();
	}

	function updateShuttlers(): void {
		setShuttlers({...shuttlers});
	}

	function updateCrewScores(resetAll: boolean = false): void {
		const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
							'engineering_skill', 'science_skill', 'medicine_skill'];

		let newSkills = resetAll ? {} : {...skillsets};
		let newScores = resetAll ? [] : [...crewScores];

		let todo = [];
		for (let shuttleNum = 0; shuttleNum < shuttlers.shuttles.length; shuttleNum++) {
			let shuttle = shuttlers.shuttles[shuttleNum];
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				let skillSet = shuttle.seats[seatNum];
				if (skillSet.skillA == "" && skillSet.skillB == "") continue;
				let ssId = getSkillSetId(skillSet);
				if (!newSkills[ssId]) {
					newSkills[ssId] = [];
					todo.push(skillSet);
				}
			}
		}
		if (todo.length == 0) return;

		for (let i = 0; i < props.crew.length; i++) {
			if (!considerActive && props.crew[i].active_status == 2)
				continue;

			if (!considerVoyage && props.crew[i].active_status == 3)
				continue;

			if (!considerFrozen && props.crew[i].immortal > 0)
				continue;

			todo.forEach((skillSet) => {
				let skillOperand = skillSet.operand;
				let primarySkill = skillSet.skillA;
				let secondarySkill = skillSet.skillB;
				let ssId = getSkillSetId(skillSet);
				if (!newSkills[ssId]) newSkills[ssId] = [];

				let iHigherSkill = 0, iLowerSkill = 0;
				for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
					let skillId = SKILL_IDS[iSkill];
					if (skillId != primarySkill && skillId != secondarySkill) continue;
					if (props.crew[i][skillId].core == 0) continue;

					let iMultiplier = 1;
					if (props.eventData.featured.indexOf(props.crew[i].symbol) >= 0)
						iMultiplier = 3;
					else if (props.eventData.bonus.indexOf(props.crew[i].symbol) >= 0)
						iMultiplier = 2;
					let iSkillScore = props.crew[i][skillId].core*iMultiplier;

					if (iSkillScore > iHigherSkill) {
						iLowerSkill = iHigherSkill;
						iHigherSkill = iSkillScore;
					}
					else if (iSkillScore > iLowerSkill) {
						iLowerSkill = iSkillScore;
					}
				}

				let iSeatScore = 0;
				if (skillOperand == "OR")
					iSeatScore = iHigherSkill;
				else
					iSeatScore = iHigherSkill+(iLowerSkill/4);

				if (iSeatScore > 0) {
					let crewman = {
						id: props.crew[i].id,
						symbol: props.crew[i].symbol,
						name: props.crew[i].name,
						score: iSeatScore,
						ssId
					};
					newSkills[ssId].push(crewman);
					newScores.push(crewman);
				}
			});
		}

		todo.forEach((skillSet) => {
			let ssId = getSkillSetId(skillSet);
			newSkills[ssId].sort((a, b) => b.score - a.score);
		});
		setSkillSets({...newSkills});

		newScores.sort((a, b) => b.score - a.score);
		setCrewScores([...newScores]);
	}

	function updateShuttleScores(): void {
		const DIFFICULTY = 2000;
		const newScores = [];
		assigned.forEach((seated) => {
			if (!newScores[seated.shuttleNum]) {
				newScores[seated.shuttleNum] = { chance: 0, scores: [] };
			}
			newScores[seated.shuttleNum].scores.push(seated.seatScore);
			let dAvgSkill = newScores[seated.shuttleNum].scores.reduce((a, b) => (a + b))/newScores[seated.shuttleNum].scores.length;
			let dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
			newScores[seated.shuttleNum].chance = dChance;
		});
		setShuttleScores(newScores);
	}

	function recommendShuttlers(): void {
		let seats = [];
		for (let shuttleNum = 0; shuttleNum < shuttlers.shuttles.length; shuttleNum++) {
			let shuttle = shuttlers.shuttles[shuttleNum];
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				let ssId = getSkillSetId(shuttle.seats[seatNum]);
				seats.push({
					shuttleNum,
					seatNum,
					ssId,
					assignedId: -1,
					assignedSymbol: "",
					seatScore: 0
				});
			}
		}
		if (seats.length == 0) return;

		let scores = JSON.parse(JSON.stringify(crewScores));
		let iAssigned = 0;
		while (scores.length > 0 && iAssigned < seats.length) {
			let testScore = scores.shift();
			let alreadyAssigned = seats.find(seat => seat.assignedId == testScore.id);
			if (alreadyAssigned) continue;

			let openSeat = seats.find(seat => seat.ssId == testScore.ssId && seat.assignedId == -1);
			if (openSeat) {
				openSeat.assignedId = testScore.id;
				openSeat.assignedSymbol = testScore.symbol;
				openSeat.seatScore = testScore.score;
				iAssigned++;
			}
		}
		setAssigned([...seats]);
	}
};

type EventShuttlersRenamerProps = {
	shuttleNum: number;
	shuttleName: string;
	updateCallback: (shuttleNum: number, shuttleName: string) => void;
};

const EventShuttlersRenamer = (props: EventShuttlersRenamerProps) => {
	const [shuttleName, setShuttleName] = React.useState(props.shuttleName);

	return (
		<Input
			placeholder="Mission name..."
			value={shuttleName}
			onChange={(e, { value }) => onRenameShuttle(value)}>
				<input />
				<Button icon onClick={() => onRenameShuttle('')} >
					<Icon name='delete' />
				</Button>
		</Input>
	);

	// Wait for user to finish typing so that parent UI doesn't re-render on every keystroke
	let timeoutId;
	function onRenameShuttle(shuttleName: string) : void {
		setShuttleName(shuttleName);
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			const {shuttleNum, updateCallback} = props;
			updateCallback(shuttleNum, shuttleName);
		}, 500);
	}
};

type EventShuttlersSeatProps = {
	shuttleNum: number;
	seatNum: number;
	seat: ShuttleSeat;
	updateCallback: (shuttleNum: number, seatNum: number, key: string, value: string) => void;
};

const EventShuttlersSeat = (props: EventShuttlersSeatProps) => {
	const { shuttleNum, seatNum, seat, updateCallback } = props;

	const skillOptions = [
		{ key: 'CMD', text: 'CMD', value: 'command_skill' },
		{ key: 'DIP', text: 'DIP', value: 'diplomacy_skill' },
		{ key: 'ENG', text: 'ENG', value: 'engineering_skill' },
		{ key: 'MED', text: 'MED', value: 'medicine_skill' },
		{ key: 'SCI', text: 'SCI', value: 'science_skill' },
		{ key: 'SEC', text: 'SEC', value: 'security_skill' }
	];
	/*image: { src: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png` }*/

	return (
		<Grid textAlign='center' columns={3}>
			<Grid.Column>
				<Dropdown
					compact
					selection
					options={skillOptions}
					value={seat.skillA}
					onChange={(e, { value }) => updateCallback(shuttleNum, seatNum, 'skillA', value)}
				/>
			</Grid.Column>
			<Grid.Column>
				<Button circular disabled={seat.skillB == "" ? true : false} onClick={() => updateCallback(shuttleNum, seatNum, 'operand', seat.operand == 'AND' ? 'OR' : 'AND')}>{seat.skillB == "" ? "" : seat.operand}</Button>
			</Grid.Column>
			<Grid.Column>
				<Dropdown
					compact
					selection
					clearable
					options={skillOptions}
					value={seat.skillB}
					onChange={(e, { value }) => updateCallback(shuttleNum, seatNum, 'skillB', value)}
				/>
			</Grid.Column>
		</Grid>
	);
};

type EventShuttlersCrewPickerProps = {
	shuttleNum: number;
	seatNum: number;
	seat: ShuttleSeat;
	skillsets: any;
	assigned: any[];
	updateCallback: (shuttleNum: number, seatNum: number, assignedCrew: any) => void;
};

const EventShuttlersCrewPicker = (props: EventShuttlersCrewPickerProps) => {
	const { shuttleNum, seatNum, seat, skillsets, assigned, updateCallback } = props;

	const ssId = getSkillSetId(seat);
	const scores = skillsets[ssId];
	if (!scores) return (<></>);

	const seated = assigned.find((seat) => seat.shuttleNum == shuttleNum && seat.seatNum == seatNum);

	let assignedCrew = undefined;
	if (seated) {
		assignedCrew = scores.find((score) => score.id == seated.assignedId && score.symbol == seated.assignedSymbol);
		if (!assignedCrew) assignedCrew = scores.find((score) => score.symbol == seated.assignedSymbol);
	}

	const options = scores.map((score, idx) => {
		return { key: idx, text: score.name, value: score.id };
	});

	return (
		<Dropdown
			selection
			clearable
			options={options}
			value={assignedCrew ? assignedCrew.id : -1}
			onChange={(e, { value }) => updateCallback(shuttleNum, seatNum, scores.find(score => score.id == value))}
		/>
	);
}

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

export default EventPlanner;