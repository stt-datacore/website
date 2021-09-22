import React from 'react';
import { isMobile } from 'react-device-detect';
import { Icon, Modal, Form, Button, Dropdown, Table, Message, Checkbox, Select, Segment, Header, Image, Tab, Grid, Card } from 'semantic-ui-react';
import { Link } from 'gatsby';

import CONFIG from './CONFIG';
import allTraits from '../../static/structured/translation_en.json';

import { VoyageStats } from '../components/voyagestats';

import { guessCurrentEvent, getEventData } from '../utils/events';
import { mergeShips } from '../utils/shiputils';
import { useStateWithStorage } from '../utils/storage';
import { CALCULATORS, CalculatorState } from '../utils/voyagehelpers';

type VoyageCalculatorProps = {
	playerData: any;
};

const VoyageCalculator = (props: VoyageCalculatorProps) => {
	const { playerData } = props;

	const [activeCrew, setActiveCrew] = useStateWithStorage('tools/activeCrew', undefined);
	const [allShips, setAllShips] = React.useState(undefined);

	if (!allShips) {
		fetchAllShips();
		return (<><Icon loading name='spinner' /> Loading...</>);
	}

	// Create fake ids for shuttle crew based on level and equipped status
	const shuttleCrew = activeCrew.map(ac => {
		return {
			id: ac.symbol+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});

	const myCrew = JSON.parse(JSON.stringify(playerData.player.character.crew));
	myCrew.forEach((crew, crewId) => {
		crew.id = crewId+1;

		// Voyage calculator looks for skills, range_min, range_max properties
		let skills = {};
		for (let skill in CONFIG.SKILLS) {
			if (crew[skill].core > 0)
				skills[skill] = {
					'core': crew[skill].core,
					'range_min': crew[skill].min,
					'range_max': crew[skill].max
				};
		}
		crew.skills = skills;

		// Voyage roster generation looks for active_status property
		crew.active_status = 0;
		if (crew.immortal === 0) {
			let shuttleCrewId = crew.symbol+','+crew.level+','+crew.equipment.join('');
			let onShuttle = shuttleCrew.find(sc => sc.id == shuttleCrewId);
			if (onShuttle) {
				crew.active_status = onShuttle.active_status;
				onShuttle.id = '';	// Clear this id so that dupes are counted properly
			}
		}
	});

	// There may be other ways we should check for voyage eligibility
	if (playerData.player.character.level < 8 || myCrew.length < 12)
		return (<Message>Sorry, but you can't voyage just yet!</Message>);

	return (
		<VoyageMain myCrew={myCrew} allShips={allShips} />
	);

	async function fetchAllShips() {
		const [shipsResponse] = await Promise.all([
			fetch('/structured/ship_schematics.json')
		]);
		const allships = await shipsResponse.json();
		const ships = mergeShips(allships, playerData.player.character.ships);

		const ownedCount = playerData.player.character.ships.length;
		playerData.player.character.ships.sort((a, b) => a.archetype_id - b.archetype_id).forEach((ship, idx) => {
			const myShip = ships.find(s => s.symbol === ship.symbol);
			if (myShip) {
				myShip.id = ship.id;	// VoyageStats needs ship id to identify ship on existing voyage
				myShip.index = { left: (ownedCount-idx+1), right: idx-1 };
				if (idx == 0)
					myShip.index = { left: 1, right: ownedCount-1 };
				else if (idx == 1)
					myShip.index = { left: 0, right: 0 };
			}
		});
		setAllShips(ships);
	}
};

type VoyageMainProps = {
	myCrew: any[];
	allShips: any[];
};

const VoyageMain = (props: VoyageMainProps) => {
	const { myCrew, allShips } = props;

	const [voyageData, setVoyageData] = useStateWithStorage('tools/voyageData', undefined);
	const [voyageConfig, setVoyageConfig] = React.useState(undefined);
	const [voyageState, setVoyageState] = React.useState('input');	// input or from voyageData: started, recalled

	if (!voyageConfig) {
		if (voyageData) {
			// Voyage started, config will be full voyage data
			if (voyageData.voyage && voyageData.voyage.length > 0) {
				setVoyageConfig(voyageData.voyage[0]);
				setVoyageState(voyageData.voyage[0].state);
			}
			// Voyage awaiting input, config will be input parameters only
			else {
				setVoyageConfig(voyageData.voyage_descriptions[0]);
			}
		}
		else {
			// voyageData not found in cache, config will be blank voyage
			setVoyageConfig({ skills: {} });
		}
		return (<></>);
	}

	return (
		<React.Fragment>
			{voyageState == 'input' &&
				<Grid columns={2} stackable>
					<Grid.Column width={14}>
						<Card.Group>
							<Card>
								<Card.Content>
									<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.primary_skill}.png`} style={{ height: '2em' }} />
									<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</Card.Header>
									<p>primary</p>
								</Card.Content>
							</Card>
							<Card>
								<Card.Content>
									<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.secondary_skill}.png`} style={{ height: '2em' }} />
									<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</Card.Header>
									<p>secondary</p>
								</Card.Content>
							</Card>
							<Card>
								<Card.Content>
									<Card.Header>{allTraits.ship_trait_names[voyageConfig.ship_trait]}</Card.Header>
									<p>ship trait</p>
								</Card.Content>
							</Card>
						</Card.Group>
					</Grid.Column>
					<Grid.Column width={2} textAlign='right'>
						<VoyageEditConfigModal voyageConfig={voyageConfig} updateConfig={updateConfig} />
					</Grid.Column>
				</Grid>
			}
			{voyageState != 'input' && (<VoyageExisting voyageConfig={voyageConfig} allShips={allShips} useCalc={() => setVoyageState('input')} />)}
			{voyageState == 'input' && (<VoyageInput voyageConfig={voyageConfig} myCrew={myCrew} allShips={allShips} useInVoyage={() => setVoyageState(voyageConfig.state)} />)}
		</React.Fragment>
	);

	function updateConfig(voyageConfig: any): void {
		setVoyageConfig({...voyageConfig});
		// Update stored voyageData with new voyageConfig
		setVoyageData({
			voyage_descriptions: [{...voyageConfig}],
			voyage: []
		});
		setVoyageState('input');
	}
};

type VoyageEditConfigModalProps = {
	voyageConfig: any;
	updateConfig: (newVoyageConfig: any) => void;
};

const VoyageEditConfigModal = (props: VoyageEditConfigModalProps) => {
	const { updateConfig } = props;

	const [voyageConfig, setVoyageConfig] = React.useState(props.voyageConfig);

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [updateOnClose, setUpdateOnClose] = React.useState(false);
	const [options, setOptions] = React.useState(undefined);

	React.useEffect(() => {
		if (!modalIsOpen && updateOnClose) {
			updateConfig(voyageConfig);
			setUpdateOnClose(false);
		}

	}, [modalIsOpen]);

	const defaultSlots = [
		{ symbol: 'captain_slot', name: 'First Officer', skill: 'command_skill', trait: '' },
		{ symbol: 'first_officer', name: 'Helm Officer', skill: 'command_skill', trait: '' },
		{ symbol: 'chief_communications_officer', name: 'Communications Officer', skill: 'diplomacy_skill', trait: '' },
		{ symbol: 'communications_officer', name: 'Diplomat', skill: 'diplomacy_skill', trait: '' },
		{ symbol: 'chief_security_officer', name: 'Chief Security Officer', skill: 'security_skill', trait: '' },
		{ symbol: 'security_officer', name: 'Tactical Officer', skill: 'security_skill', trait: '' },
		{ symbol: 'chief_engineering_officer', name: 'Chief Engineer', skill: 'engineering_skill', trait: '' },
		{ symbol: 'engineering_officer', name: 'Engineer', skill: 'engineering_skill', trait: '' },
		{ symbol: 'chief_science_officer', name: 'Chief Science Officer', skill: 'science_skill', trait: '' },
		{ symbol: 'science_officer', name: 'Deputy Science Officer', skill: 'science_skill', trait: '' },
		{ symbol: 'chief_medical_officer', name: 'Chief Medical Officer', skill: 'medicine_skill', trait: '' },
		{ symbol: 'medical_officer', name: 'Ship\'s Counselor', skill: 'medicine_skill', trait: '' }
	];
	const crewSlots = voyageConfig.crew_slots ?? defaultSlots;

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button size='small'><Icon name='edit' />Edit</Button>}
		>
			<Modal.Header>Edit Voyage</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button positive onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderContent(): JSX.Element {
		if (!modalIsOpen) return (<></>);

		if (!options) {
			// Renders a lot faster by using known voyage traits rather than calculate list from all possible traits
			const knownShipTraits = ['andorian','battle_cruiser','borg','breen','cardassian','cloaking_device',
				'dominion','emp','explorer','federation','ferengi','freighter','historic','hologram',
				'klingon','maquis','orion_syndicate','pioneer','reman','romulan','ruthless',
				'scout','spore_drive','terran','tholian','transwarp','vulcan','warship','war_veteran','xindi'];
			const knownCrewTraits = ['android','astrophysicist','bajoran','borg','brutal',
				'cardassian','civilian','communicator','costumed','crafty','cultural_figure','cyberneticist',
				'desperate','diplomat','doctor','duelist','exobiology','explorer','federation','ferengi',
				'gambler','hero','hologram','human','hunter','innovator','inspiring','jury_rigger','klingon',
				'marksman','maverick','pilot','prodigy','resourceful','romantic','romulan',
				'saboteur','scoundrel','starfleet','survivalist','tactician','telepath','undercover_operative',
				'veteran','villain','vulcan'];

			const skillsList = [];
			for (let skill in CONFIG.SKILLS) {
				skillsList.push({
					key: skill,
					value: skill,
					text: CONFIG.SKILLS[skill]
				});
			}

			const shipTraitsList = knownShipTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: allTraits.ship_trait_names[trait]
				};
			});
			shipTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const crewTraitsList = knownCrewTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: allTraits.trait_names[trait]
				};
			});
			crewTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			setOptions({ skills: skillsList, ships: shipTraitsList, traits: crewTraitsList });
			return (<></>);
		}

		return (
			<React.Fragment>
				<Message>Editing this voyage will reset all existing recommendations and estimates.</Message>
				<Form>
					<Form.Group>
						<Form.Select
							label='Primary skill'
							options={options.skills}
							value={voyageConfig.skills.primary_skill ?? 'command_skill'}
							onChange={(e, { value }) => setSkill('primary_skill', value)}
							placeholder='Primary'
						/>
						<Form.Select
							label='Secondary skill'
							options={options.skills}
							value={voyageConfig.skills.secondary_skill ?? 'science_skill'}
							onChange={(e, { value }) => setSkill('secondary_skill', value)}
							placeholder='Secondary'
						/>
						<Form.Select
							search clearable
							label='Ship trait'
							options={options.ships}
							value={voyageConfig.ship_trait}
							onChange={(e, { value }) => setShipTrait(value)}
							placeholder='Ship trait'
						/>
					</Form.Group>
				</Form>
				<Table compact striped>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell textAlign='center'>Skill</Table.HeaderCell>
							<Table.HeaderCell>Seat</Table.HeaderCell>
							<Table.HeaderCell>Trait</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{crewSlots.map((seat, idx) => (
							<Table.Row key={seat.symbol}>
								{ idx % 2 == 0 ?
									(
										<Table.Cell rowSpan='2' textAlign='center'>
											<img alt="{seat.skill}" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skill}.png`} style={{ height: '2em' }} />
										</Table.Cell>
									)
									: (<></>)
								}
								<Table.Cell>{seat.name}</Table.Cell>
								<Table.Cell>
									<Dropdown search selection clearable
										options={options.traits}
										value={seat.trait}
										onChange={(e, { value }) => setSeatTrait(seat.symbol, value)}
										placeholder='Trait'
									/>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</React.Fragment>
		);
	}

	function setSkill(prime: string, value: string): void {
		// Flip skill values if changing to value that's currently set as the other prime
		if (prime == 'primary_skill' && value == voyageConfig.skills.secondary_skill)
			voyageConfig.skills.secondary_skill = voyageConfig.skills.primary_skill;
		else if (prime == 'secondary_skill' && value == voyageConfig.skills.primary_skill)
			voyageConfig.skills.primary_skill = voyageConfig.skills.secondary_skill;
		voyageConfig.skills[prime] = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}

	function setShipTrait(value: string): void {
		voyageConfig.ship_trait = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}

	function setSeatTrait(seat: symbol, value: string): void {
		voyageConfig.crew_slots.find(s => s.symbol === seat).trait = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}
};

type VoyageExistingProps = {
	voyageConfig: any;
	allShips: any[];
};

const VoyageExisting = (props: VoyageExistingProps) => {
	const { voyageConfig, allShips,  useCalc} = props;

	return (
		<div style={{ marginTop: '1em' }}>
			<VoyageStats
				voyageData={voyageConfig}
				ships={allShips}
				showPanels={voyageConfig.state == 'started' ? ['estimate'] : ['rewards']}
			/>
			<Button onClick={() => useCalc()}>Return to calculator</Button>
		</div>
	)
};

type VoyageInputProps = {
	voyageConfig: any;
	myCrew: any[];
	allShips: any[];
};

const VoyageInput = (props: VoyageInputProps) => {
	const { voyageConfig, myCrew, allShips, useInVoyage } = props;

	const [bestShip, setBestShip] = React.useState(undefined);
	const [consideredCrew, setConsideredCrew] = React.useState([]);
	const [calculator, setCalculator] = React.useState(isMobile ? 'ussjohnjay' : 'iampicard');
	const [calcOptions, setCalcOptions] = React.useState({});
	const [telemetryOptOut, setTelemetryOptOut] = useStateWithStorage('telemetryOptOut', false, { rememberForever: true });
	const [requests, setRequests] = React.useState([]);
	const [results, setResults] = React.useState([]);

	React.useEffect(() => {
		// Note that allShips is missing the default ship for some reason (1* Constellation Class)
		//	This WILL break voyagecalculator if that's the only ship a player owns
		const consideredShips = [];
		allShips.filter(ship => ship.owned).forEach(ship => {
			const traited = ship.traits.find(trait => trait === voyageConfig.ship_trait);
			let entry = {
				ship: ship,
				score: ship.antimatter + (traited ? 150 : 0),
				traited: traited
			};
			consideredShips.push(entry);
		});
		setBestShip(consideredShips.sort((a, b) => b.score - a.score)[0]);
		setRequests([]);
		setResults([]);
	}, [voyageConfig]);

	React.useEffect(() => {
		return function cleanup() {
			// Cancel active calculations when leaving page
			requests.forEach(request => {
				if (request.calcState == CalculatorState.InProgress)
					request.abort();
			});
		}
	}, []);

	// Scroll here when calculator started, finished
	const topAnchor = React.useRef(null);

	const calculators = CALCULATORS.helpers.map(helper => {
		return { key: helper.id, value: helper.id, text: helper.name };
	});
	calculators.push({ key: 'all', value: 'all', text: 'All calculators' });

	return (
		<React.Fragment>
			<div ref={topAnchor} />
			{renderBestShip()}
			{renderResults()}
			{requests.length > 0 && <Header as='h3'>Options</Header>}
			<Form>
				<InputCrewOptions myCrew={myCrew} updateConsideredCrew={setConsideredCrew} />
				<Form.Group inline>
					<Form.Field
						control={Select}
						label='Calculator'
						options={calculators}
						value={calculator}
						onChange={(e, { value }) => setCalculator(value)}
						placeholder='Select calculator'
					/>
					{CALCULATORS.fields.filter(field => field.calculators.includes(calculator) || calculator == 'all').map(field => (
						<Form.Field
							key={field.id}
							control={Select}	/* Only control allowed at the moment */
							label={field.name}
							options={field.options}
							value={calcOptions[field.id] ?? field.default}
							placeholder={field.description}
							onChange={(e, { value }) => setCalcOptions(prevOptions =>
								{
									const newValue = { [field.id]: value };
									return {...prevOptions, ...newValue};
								}
							)}
						/>
					))}
				</Form.Group>

				<Form.Group>
					<Form.Button primary onClick={() => startCalculation()}>
						Calculate best crew selection
					</Form.Button>
					{voyageConfig.state &&
						<Form.Button onClick={()=> useInVoyage()}>
							Return to in voyage calculator
						</Form.Button>
					}
				</Form.Group>
			</Form>
			<Message style={{ marginTop: '2em' }}>
				<Message.Content>
					<Message.Header>Privacy Notice</Message.Header>
					<p>We use anonymous statistics aggregated from voyage calculations to improve DataCore and power our <b><Link to='/hall_of_fame'>Voyage Hall of Fame</Link></b>.</p>
					<Form>
						<Form.Field
							control={Checkbox}
							label={<label>Permit DataCore to collect anonymous voyage stats</label>}
							checked={!telemetryOptOut}
							onChange={(e, { checked }) => setTelemetryOptOut(!checked) }
						/>
					</Form>
				</Message.Content>
			</Message>
		</React.Fragment>
	);

	function renderBestShip(): JSX.Element {
		if (!bestShip) return (<></>);

		const direction = bestShip.ship.index.right < bestShip.ship.index.left ? 'right' : 'left';
		const index = bestShip.ship.index[direction] ?? 0;

		return (
			<Card fluid>
				<Card.Content>
					<Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${bestShip.ship.icon.file.substr(1).replace('/', '_')}.png`} style={{ height: '4em' }} />
					<Card.Header>{bestShip.ship.name}</Card.Header>
					<p>best ship{bestShip.traited && (<span style={{ marginLeft: '1em' }}>{` +`}{allTraits.ship_trait_names[voyageConfig.ship_trait]}</span>)}</p>
					<p style={{ marginTop: '.5em' }}>Tap <Icon name={`arrow alternate circle outline ${direction}`} />{index} time{index != 1 ? 's' : ''} on your voyage ship selection screen to select {bestShip.ship.name}.</p>
				</Card.Content>
			</Card>
		);
	}

	function renderResults(): JSX.Element {
		if (results.length == 0)
			return (<></>);

		const panes = results.map(result => ({
			menuItem: { key: result.id, content: result.name },
			render: () => (
				<VoyageResultPane result={result.result}
					requests={requests} requestId={result.requestId}
					calcState={result.calcState} abortCalculation={abortCalculation}
				/>
			)
		}));

		return (
			<React.Fragment>
				<Header as='h3'>Recommended Lineups</Header>
				<Tab menu={{ pointing: true }}
					panes={panes}
				/>
			</React.Fragment>
		);
	}

	function scrollToAnchor(): void {
		if (!topAnchor.current) return;
		topAnchor.current.scrollIntoView({
			behavior: 'smooth'
		}, 500);
	}

	function startCalculation(): void {
		const helperConfig = {
			voyageConfig, bestShip, consideredCrew, calcOptions,
			resultsCallback: handleResults,
			isMobile
		};
		CALCULATORS.helpers.forEach(helper => {
			if (helper.id == calculator || calculator == 'all') {
				const request = helper.helper(helperConfig);
				requests.push(request);
				results.push({
					id: request.id,
					requestId: request.id,
					name: 'Calculating...',
					calcState: CalculatorState.InProgress
				});
				request.start();
			}
		});
		setRequests([...requests]);
		setResults([...results]);
		scrollToAnchor();
	}

	function handleResults(requestId: string, reqResults: any[], calcState: number): void {
		reqResults.forEach((reqResult, idx) => {
			// Update existing pane with results
			if (idx == 0) {
				setResults(prevResults => {
					const result = prevResults.find(r => r.id == requestId);
					if (calcState == CalculatorState.Done) {
						result.name = formatTime(reqResult.estimate.refills[0].result);
						result.calcState = CalculatorState.Done;
						sendTelemetry(requestId, reqResult);
					}
					result.result = reqResult;
					return [...prevResults];
				});
			}
			// Add new panes if multiple results generated by this request
			else {
				setResults(prevResults => [...prevResults, {
					id: requestId+'-'+idx,
					requestId,
					name: formatTime(reqResult.estimate.refills[0].result),
					calcState: CalculatorState.Done,
					result: reqResult
				}]);
			}
		});
		if (calcState == CalculatorState.Done) scrollToAnchor();
	}

	function abortCalculation(requestId: string): void {
		const request = requests.find(r => r.id == requestId);
		if (request) {
			request.abort();
			setResults(prevResults => {
				const result = prevResults.find(prev => prev.id == requestId);
				if (result.result) {
					result.name = formatTime(result.result.estimate.refills[0].result);
					result.calcState = CalculatorState.Done;
				}
				else {
					const index = prevResults.findIndex(prev => prev.id == requestId);
					prevResults.splice(index, 1);
				}
				return [...prevResults];
			});
		}
	}

	function sendTelemetry(requestId: string, result: any): void {
		if (telemetryOptOut) return;
		const request = requests.find(r => r.id == requestId);
		try {
			fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry`, {
				method: 'post',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: 'voyageCalc',
					data: {
						voyagers: result.entries.map((entry) => {
							return crew.find(c => c.id === entry.choice).symbol;
						}),
						estimatedDuration: result.score * 60 * 60,
						calculator: request ? request.calculator : ''
					}
				})
			});
		}
		catch (err) {
			console.log('An error occurred while sending telemetry', err);
		}
	}
};

type InputCrewOptionsProps = {
	myCrew: any[];
	updateConsideredCrew: () => void;
};

const InputCrewOptions = (props: InputCrewOptionsProps) => {
	const { myCrew, updateConsideredCrew } = props;

	const [considerActive, setConsiderActive] = React.useState(false);
	const [considerFrozen, setConsiderFrozen] = React.useState(false);
	const [excludedCrew, setExcludedCrew] = React.useState([]);

	React.useEffect(() => {
		const consideredCrew = myCrew.filter(crewman => {
			if (!considerActive && crewman.active_status == 2)
				return false;

			if (!considerFrozen && crewman.immortal > 0)
				return false;

			if (excludedCrew && excludedCrew.includes(crewman.id))
				return false;

			return true;
		});
		updateConsideredCrew(consideredCrew);
	}, [considerActive, considerFrozen, excludedCrew]);

	const activeCount = myCrew.filter(crew => crew.active_status == 2).length;

	return (
		<React.Fragment>
			<Form.Group grouped>
				{activeCount > 0 && (
					<Form.Field
						control={Checkbox}
						label='Consider crew on active shuttles'
						checked={considerActive}
						onChange={(e, { checked }) => setConsiderActive(checked)}
					/>
				)}
				<Form.Field
					control={Checkbox}
					label='Consider frozen (vaulted) crew'
					checked={considerFrozen}
					onChange={(e, { checked }) => setConsiderFrozen(checked)}
				/>
			</Form.Group>
			<InputCrewExcluder myCrew={myCrew} excludedCrew={excludedCrew} updateExclusions={setExcludedCrew} showFrozen={considerFrozen} />
		</React.Fragment>
	);
};

type InputCrewExcluderProps = {
	myCrew: any[];
	excludedCrew: undefined | number[];
	updateExclusions: (crewIds: number[]) => void;
	showFrozen: boolean;
}

const InputCrewExcluder = (props: InputCrewExcluderProps) => {
	const { updateExclusions } = props;

	const [eventData, setEventData] = useStateWithStorage('tools/eventData', undefined);
	const [activeEvent, setActiveEvent] = React.useState(undefined);
	const [options, setOptions] = React.useState(undefined);

	React.useEffect(() => {
		if (props.excludedCrew)
			if (options && !options.initialized) populatePlaceholders();
	}, [props.excludedCrew]);

	React.useEffect(() => {
		if (!options) return;
		if (!options.initialized)
			populatePlaceholders();
		else
			populateOptions();
	}, [props.showFrozen]);

	React.useEffect(() => {
		if (activeEvent && activeEvent.seconds_to_end > 0 && activeEvent.seconds_to_start < 86400) {
			if (activeEvent.content_types.includes('shuttles') || activeEvent.content_types.includes('gather')) {
				const crewIds = props.myCrew.filter(c => activeEvent.bonus.includes(c.symbol)).map(c => c.id);
				updateExclusions([...crewIds]);
			}
		}
	}, [activeEvent]);

	if (!activeEvent) {
		identifyActiveEvent();
		return (<></>);
	}

	if (!options) {
		populatePlaceholders();
		return (<></>);
	}

	const label = (
		<React.Fragment>
			<label>Crew to exclude from voyage</label>
			{activeEvent && activeEvent.bonus.length > 0 &&
				(<div style={{ margin: '-.5em 0 .5em' }}>Preselected crew give bonuses for the event <b>{activeEvent.name}</b></div>)
			}
		</React.Fragment>
	);

	return (
		<React.Fragment>
			<Form.Field
				label={label}
				placeholder='Search for crew to exclude'
				control={Dropdown}
				clearable
				fluid
				multiple
				search
				selection
				options={options.list}
				value={props.excludedCrew}
				onFocus={() => { if (!options.initialized) populateOptions(); }}
				onChange={(e, { value }) => updateExclusions(value) }
			/>
		</React.Fragment>
	);

	function identifyActiveEvent(): void {
		// Get event data from recently uploaded playerData
		if (eventData) {
			const currentEvent = getEventData(eventData.sort((a, b) => (a.seconds_to_start - b.seconds_to_start))[0]);
			setActiveEvent({...currentEvent});
		}
		// Otherwise guess event from autosynced events
		else {
			guessCurrentEvent().then(currentEvent => {
				setActiveEvent({...currentEvent});
			});
		}
	}

	function populatePlaceholders(): void {
		const options = { initialized: false, list: [] };
		if (props.excludedCrew.length > 0) {
			let crewList = [...props.myCrew];
			if (!props.showFrozen) crewList = crewList.filter(c => c.immortal == 0);
			options.list = crewList.filter(c => props.excludedCrew.includes(c.id)).map(c => {
				return { key: c.id, value: c.id, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
			});
		}
		else {
			options.list = [{ key: 0, value: 0, text: 'Loading...' }];
		}
		setOptions({...options});
	}

	function populateOptions(): void {
		let crewList = [...props.myCrew];
		if (!props.showFrozen) crewList = crewList.filter(c => c.immortal == 0);
		options.list = crewList.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
			return { key: c.id, value: c.id, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
		});
		options.initialized = true;
		setOptions({...options});
	}
};

type VoyageResultPaneProps = {
	result: any;
	requests: any[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
};

const VoyageResultPane = (props: VoyageResultPaneProps) => {
	const { result, requests, requestId, calcState, abortCalculation } = props;

	const request = requests.find(r => r.id == requestId);
	if (!request) return (<></>);

	if (!result) {
		return (
			<Tab.Pane>
				<div style={{ textAlign: 'center' }}>
					<Image centered src='/media/voyage-wait-icon.gif' />
					<Button onClick={() => abortCalculation(request.id)}>Abort</Button>
				</div>
			</Tab.Pane>
		);
	}

	// resultToVoyageData
	let data = {...request.voyageConfig};
	if (result.entries) {
		result.entries.forEach((entry, idx) => {
			let acrew = request.consideredCrew.find(c => c.symbol === entry.choice.symbol);
			data.crew_slots[entry.slotId].crew = acrew;
		});
	}
	data.skill_aggregates = result.aggregates;
	data.max_hp = result.startAM;
	data.state = 'pending';

	const renderCalculatorMessage = () => {
		if (calcState != CalculatorState.Done) {
			return (
				<>
					<Image inline size='mini' src='/media/voyage-wait-icon.gif' />
					Calculation in progress. Please wait...{` `}
					<Button size='mini' onClick={() => abortCalculation(request.id)}>Abort</Button>
				</>
			);
		}
		let inputs = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (
			<>
				Calculated by <b>{request.calcName}</b> calculator ({inputs.join(', ')}){` `}
				in {((request.perf.end-request.perf.start)/1000).toFixed(2)} seconds!
			</>
		);
	};

	return (
		<React.Fragment>
			{calcState == CalculatorState.Done && (
				<Message attached>
					Median runtime: <b>{formatTime(result.estimate.refills[0].result)}</b>{` `}
					(expected range: {formatTime(result.estimate.refills[0].saferResult)} to{` `}
						{formatTime(result.estimate.refills[0].moonshotResult)}).
				</Message>
			)}
			<Tab.Pane>
				<VoyageStats
					voyageData={data}
					estimate={result.estimate}
					ships={[request.bestShip]}
					showPanels={['crew']}
				/>
				<div style={{ marginTop: '1em' }}>
					{renderCalculatorMessage()}
				</div>
			</Tab.Pane>
		</React.Fragment>
	);
};

const formatTime: string = (time: number) => {
	let hours = Math.floor(time);
	let minutes = Math.floor((time-hours)*60);
	return hours+"h " +minutes+"m";
};

export default VoyageCalculator;
