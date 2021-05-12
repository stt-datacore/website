import React from 'react';
import { Header, Table, Icon, Rating, Form, Dropdown, Checkbox, Input, Button, Grid } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'level'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity' },
	{ width: 1, column: 'bonus', title: 'Bonus' },
	{ width: 1, column: 'command_skill.core', title: 'Command' },
	{ width: 1, column: 'science_skill.core', title: 'Science' },
	{ width: 1, column: 'security_skill.core', title: 'Security' },
	{ width: 1, column: 'engineering_skill.core', title: 'Engineering' },
	{ width: 1, column: 'diplomacy_skill.core', title: 'Diplomacy' },
	{ width: 1, column: 'medicine_skill.core', title: 'Medicine' }
];

type EventPlannerProps = {
	playerData: any;
	eventData: any;
	activeCrew: string[];
};

const EventPlanner = (props: EventPlannerProps) => {
	const { playerData, eventData } = props;
	const dbid = playerData.player.dbid;
	const activeCrew = JSON.parse(JSON.stringify(props.activeCrew));

	let crewlist = [];
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

		crewlist.push(crewman);
	});

	let activeEvents = eventData.filter((ev) => ev.seconds_to_end > 0);
	activeEvents.sort((a, b) => (a.seconds_to_start - b.seconds_to_start));

	let buffConfig = calculateBuffConfig(playerData.player);

	return (
		<EventPicker dbid={dbid} events={activeEvents} crew={crewlist} buffConfig={buffConfig} />
	);
};

type EventPickerProps = {
	dbid: string;
	events: any[];
	crew: any[];
	buffConfig: any;
};

class EventData {
    name: string = '';
	description: string = '';
	content_types: string[] = [];	/* shuttles, gather, etc. */
    bonus: string[] = [];	/* ALL bonus crew by symbol */
	featured: string[] = [];	/* ONLY featured crew by symbol */
};

const EventPicker = (props: EventPickerProps) => {
	const { dbid, events, crew, buffConfig } = props;

	const [eventIndex, setEventIndex] = useStateWithStorage('eventplanner/eventIndex', 0);

	const eventsList = [];
	let eventId = 0;
	events.forEach((activeEvent) => {
		eventsList.push(
			{
				key: eventId,
				value: eventId,
				text: activeEvent.name
			}
		);
		eventId++;
	});

	const eventData = getEventData(events[eventIndex]);
	const bonusCrew = crew.filter(crewman => eventData.bonus.indexOf(crewman.symbol) >= 0);

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
				<div>{eventData.description}</div>
			</Form>
			<EventCrewTable crew={crew} eventData={eventData} buffConfig={buffConfig} />
			<EventShuttlers dbid={dbid} crew={crew} eventData={eventData} />
		</React.Fragment>
	);

	function getEventData(activeEvent: any): EventData | undefined {
		let result = new EventData();
		result.name = activeEvent.name;
		result.description = activeEvent.description;
		result.content_types = activeEvent.content_types;

		// Content is active phase of started event or first phase of unstarted event
		let activePhase = activeEvent.content;
		if (activePhase.content_type == 'shuttles') {
			activePhase.shuttles.forEach((shuttle: any) => {
				for (let symbol in shuttle.crew_bonuses) {
					result.bonus.push(symbol);
					if (shuttle.crew_bonuses[symbol] == 3) result.featured.push(symbol);
				}
			});
		}
		else if (activePhase.content_type == 'gather') {
			for (let symbol in activePhase.crew_bonuses) {
				result.bonus.push(symbol);
				if (activePhase.crew_bonuses[symbol] == 10) result.featured.push(symbol);
			}
		}
		else if (activePhase.content_type == 'skirmish' && activePhase.bonus_crew) {
			for (let i = 0; i < activePhase.bonus_crew.length; i++) {
				let symbol = activePhase.bonus_crew[i];
				result.bonus.push(symbol);
				result.featured.push(symbol);
			}
			// Skirmish also uses activePhase.bonus_traits to identify smaller bonus event crew
		}

		return result;
	}
};

type EventCrewTableProps = {
	crew: any[];
	eventData: any;
	buffConfig: any;
};

const EventCrewTable = (props: EventCrewTableProps) => {
	const { eventData, buffConfig } = props;

	const [showBonus, setShowBonus] = useStateWithStorage('eventplanner/showBonus', true);
	const [applyBonus, setApplyBonus] = useStateWithStorage('eventplanner/applyBonus', true);
	const [showPotential, setShowPotential] = useStateWithStorage('eventplanner/showPotential', false);
	const [showFrozen, setShowFrozen] = useStateWithStorage('eventplanner/showFrozen', true);

	const bonusCrew = JSON.parse(JSON.stringify(props.crew));
	if (applyBonus || showPotential) {
		bonusCrew.forEach(crew => {
			crew.bonus = 1;
			if (applyBonus && eventData.featured.indexOf(crew.symbol) >= 0) {
				crew.bonus = 3;
			}
			else if (applyBonus && eventData.bonus.indexOf(crew.symbol) >= 0) {
				crew.bonus = 2;
			}
			if (crew.bonus > 1) {
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
		});
	}

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
				data={bonusCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions="true"
			/>
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
				<Table.Cell>
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{crew.bonus > 1 ? `x${crew.bonus}` : ''}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew[skill.name].core}</b>
							<br />
							+({crew[skill.name].min}-{crew[skill.name].max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		if (crew.immortal) {
			return (
				<div>
					<Icon name="snowflake" /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			return (
				<div>
					{crew.favorite && <Icon name="heart" />}
					<span>Level {crew.level}</span>
				</div>
			);
		}
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (showBonus && props.eventData.bonus.indexOf(crew.symbol) == -1) {
			return false;
		}

		if (!showFrozen && crew.immortal > 0) {
			return false;
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
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

	const [considerActive, setConsiderActive] = useStateWithStorage('eventplanner/considerActive', false);
	const [considerFrozen, setConsiderFrozen] = useStateWithStorage('eventplanner/considerFrozen', false);
	const [saveSetups, setSaveSetups] = useStateWithStorage(props.dbid+'/eventplanner/saveSetups', false, { rememberForever: true });

	React.useEffect(() => {
		updateCrewScores();
	}, [shuttlers]);

	React.useEffect(() => {
		updateShuttleScores();
	}, [assigned]);

	React.useEffect(() => {
		setAssigned([]);
		updateCrewScores(true);
	}, [considerActive, considerFrozen]);

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
								<Input
									placeholder="Mission name..."
									value={shuttle.name}
									onChange={(e, { value }) => onRenameShuttle(shuttleNum, value)}>
										<input />
										<Button icon onClick={() => onRenameShuttle(shuttleNum, '')} >
											<Icon name='delete' />
										</Button>
								</Input>
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
												<Table.Cell><Button icon color='red' onClick={() => deleteShuttleSeat(shuttleNum, seatNum)}><Icon name='trash' /></Button></Table.Cell>
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
					label='Consider active (on shuttles or voyage) crew'
					checked={considerActive}
					onChange={(e, { checked }) => setConsiderActive(checked)}
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

	function onRenameShuttle(shuttleNum: number, shuttleName: string): void {
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
		if (!seated) {
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
				if (!newSkills[ssId]) todo.push(skillSet);
			}
		}
		if (todo.length == 0) return;

		for (let i = 0; i < props.crew.length; i++) {
			if (!considerActive && props.crew[i].active_status > 0)
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

export default EventPlanner;