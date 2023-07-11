import React from 'react';
import { Icon, Form, Button, Dropdown, Message, Checkbox, Select, Header, Image, Tab, Card, Popup } from 'semantic-ui-react';
import { Link } from 'gatsby';

import CONFIG from '../CONFIG';
import allTraits from '../../../static/structured/translation_en.json';

import { CALCULATORS, CalculatorState } from './calchelpers';
import CIVASMessage from './civas';
import { VoyageStats } from './voyagestats';

import { guessCurrentEvent, getEventData } from '../../utils/events';
import { useStateWithStorage } from '../../utils/storage';

import UnifiedWorker from 'worker-loader!../../workers/unifiedWorker';

const AllDataContext = React.createContext();

type RecommenderProps = {
	voyageConfig: any;
	myCrew: any[];
	useInVoyage: () => void;
	allData: any;
};

const Recommender = (props: RecommenderProps) => {
	const { voyageConfig, myCrew, useInVoyage, allData } = props;

	const allShips = allData.allShips;
	const playerData = allData.playerData;

	const [bestShip, setBestShip] = React.useState(undefined);
	const [consideredCrew, setConsideredCrew] = React.useState([]);
	const [calculator, setCalculator] = useStateWithStorage(playerData.player.dbid+'/voyage/calculator', 'iampicard', { rememberForever: true });
	const [calcOptions, setCalcOptions] = useStateWithStorage(playerData.player.dbid+'/voyage/calcOptions', {}, { rememberForever: true });
	const [telemetryOptOut, setTelemetryOptOut] = useStateWithStorage('telemetryOptOut', false, { rememberForever: true });
	const [requests, setRequests] = React.useState([]);
	const [results, setResults] = React.useState([]);

	React.useEffect(() => {
		const consideredShips = [];
		allShips.filter(ship => ship.owned).forEach(ship => {
			const traited = ship.traits.includes(voyageConfig.ship_trait);
			let entry = {
				ship: ship,
				score: ship.antimatter + (traited ? 150 : 0),
				traited: traited,
				bestIndex: Math.min(ship.index.left, ship.index.right)
			};
			consideredShips.push(entry);
		});
		consideredShips.sort((a, b) => {
			if (a.score === b.score) return a.bestIndex - b.bestIndex;
			return b.score - a.score;
		});
		setBestShip(consideredShips[0]);
		setRequests([]);
		setResults([]);
	}, [voyageConfig]);

	React.useEffect(() => {
		return function cleanup() {
			// Cancel active calculations when leaving page
			requests.forEach(request => {
				if (request.calcState === CalculatorState.InProgress)
					request.abort();
			});
		}
	}, []);

	// Scroll here when calculator started, finished
	const topAnchor = React.useRef(null);

	const calculators = CALCULATORS.helpers.map(helper => {
		return { key: helper.id, value: helper.id, text: helper.name };
	});
	calculators.push({ key: 'all', value: 'all', text: 'All calculators (slower)' });

	return (
		<AllDataContext.Provider value={allData}>
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
					{CALCULATORS.fields.filter(field => field.calculators.includes(calculator) || calculator === 'all').map(field => (
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
				<Button fluid size='big' color='green' onClick={() => startCalculation()}>
					Recommend Crew
				</Button>
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
		</AllDataContext.Provider>
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
					<p style={{ marginTop: '.5em' }}>Tap <Icon name={`arrow ${direction}`} />{index} time{index !== 1 ? 's' : ''} on your voyage ship selection screen to select {bestShip.ship.name}.</p>
				</Card.Content>
			</Card>
		);
	}

	function renderResults(): JSX.Element {
		if (results.length === 0)
			return (<></>);

		// In-game voyage crew picker ignores immortalized crew and crew active on shuttles
		const availableRoster = myCrew.filter(c => c.immortal === 0 && c.active_status !== 2);

		// Compare best values among ALL results
		const bestValues = {
			estimate: 0,
			minimum: 0,
			moonshot: 0,
			antimatter: 0,
			dilemma: {
				hour: 0,
				chance: 0
			}
		};
		results.forEach(result => {
			if (result.calcState === CalculatorState.Done) {
				const values = flattenEstimate(result.result.estimate);
				Object.keys(bestValues).forEach((valueKey) => {
					if (valueKey === 'dilemma') {
						if (values.dilemma.hour > bestValues.dilemma.hour
							|| (values.dilemma.hour === bestValues.dilemma.hour && values.dilemma.chance > bestValues.dilemma.chance)) {
								bestValues.dilemma = values.dilemma;
						}
					}
					else if (values[valueKey] > bestValues[valueKey]) {
						bestValues[valueKey] = values[valueKey];
					}
				});
			}
		});
		results.forEach(result => {
			let compared = '';
			if (result.calcState === CalculatorState.Done) {
				const recommended = getRecommendedList(result.result.estimate, bestValues);
				if (results.length === 1)
					compared = 'Recommended for all criteria';
				else {
					if (recommended.length > 0)
						compared = ' Recommended for ' + recommended.map((method) => getRecommendedValue(method, bestValues)).join(', ');
					else
						compared = ' Proposed alternative';
				}
				result.compared = compared;
			}
		});

		const showPopup = (result) => <Popup position='top center' content={<p>{result.compared}</p>} trigger={<p>{result.name}</p>} />
		const panes = results.map((result, resultIndex) => ({
			menuItem: { key: result.id, content: result.result ? showPopup(result) : result.name },
			render: () => (
				<VoyageResultPane result={result.result} resultIndex={resultIndex} resultCompared={result.compared}
					requests={requests} requestId={result.requestId}
					calcState={result.calcState} abortCalculation={abortCalculation}
					estimateResult={estimateResult} dismissResult={dismissResult}
					roster={availableRoster}
				/>
			)
		}));

		return (
			<React.Fragment>
				<Header as='h3'>Recommended Lineups</Header>
				<Tab menu={{ pointing: true }} panes={panes} />
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
			resultsCallback: handleResults
		};
		CALCULATORS.helpers.forEach(helper => {
			if (helper.id === calculator || calculator === 'all') {
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
			if (idx === 0) {
				setResults(prevResults => {
					const result = prevResults.find(r => r.id === requestId);
					if (calcState === CalculatorState.Done) {
						result.name = formatTime(reqResult.estimate.refills[0].result);
						result.calcState = CalculatorState.Done;
						sendTelemetry(requestId, reqResult);
					}
					result.result = {...reqResult, confidence: 0};
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
					result: {...reqResult, confidence: 0}
				}]);
			}
		});
		if (calcState === CalculatorState.Done) scrollToAnchor();
	}

	function abortCalculation(requestId: string): void {
		const request = requests.find(r => r.id === requestId);
		if (request) {
			request.abort();
			setResults(prevResults => {
				const result = prevResults.find(prev => prev.id === requestId);
				if (result.result) {
					result.name = formatTime(result.result.estimate.refills[0].result);
					result.calcState = CalculatorState.Done;
					result.result.confidence = 0;
				}
				else {
					const index = prevResults.findIndex(prev => prev.id === requestId);
					prevResults.splice(index, 1);
				}
				return [...prevResults];
			});
		}
	}

	function flattenEstimate(estimate: any): any {
		const extent = estimate.refills[0];
		return {
			estimate: extent.result,
			minimum: extent.saferResult,
			moonshot: extent.moonshotResult,
			antimatter: estimate.antimatter,
			dilemma: {
				hour: extent.lastDil,
				chance: extent.dilChance
			}
		};
	}

	function getRecommendedList(estimate: any, bestValues: any): string[] {
		const recommended = [];
		const values = flattenEstimate(estimate);
		Object.keys(bestValues).forEach((method) => {
			if (bestValues[method] === values[method] ||
				(method === 'dilemma' && bestValues.dilemma.hour === values.dilemma.hour && bestValues.dilemma.chance === values.dilemma.chance))
					recommended.push(method);
		});
		return recommended;
	};

	function getRecommendedValue(method: number, bestValues: any): string {
		let sortName = '', sortValue = '';
		switch (method) {
			case 'estimate':
				sortName = 'estimated runtime';
				sortValue = formatTime(bestValues.estimate);
				break;
			case 'minimum':
				sortName = 'guaranteed minimum';
				sortValue = formatTime(bestValues.minimum);
				break;
			case 'moonshot':
				sortName = 'moonshot';
				sortValue = formatTime(bestValues.moonshot);
				break;
			case 'dilemma':
				sortName = 'dilemma chance';
				sortValue = Math.round(bestValues.dilemma.chance)+'% to reach '+bestValues.dilemma.hour+'h';
				break;
			case 'antimatter':
				sortName = 'starting antimatter';
				sortValue = bestValues.antimatter;
				break;
		}
		if (sortValue != '') sortValue = ' ('+sortValue+')';
		return sortName+sortValue;
	}

	function estimateResult(resultIndex: number, voyageConfig: any, numSims: number): void {
		const config = {
			startAm: voyageConfig.max_hp,
			ps: voyageConfig.skill_aggregates[voyageConfig.skills['primary_skill']],
			ss: voyageConfig.skill_aggregates[voyageConfig.skills['secondary_skill']],
			others: Object.values(voyageConfig.skill_aggregates).filter(s => !Object.values(voyageConfig.skills).includes(s.skill)),
			numSims: numSims
		};
		const VoyageEstConfig = {
			config,
			worker: 'voyageEstimate'
		};
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				const estimate = message.data.result;
				setResults(prevResults => {
					const result = prevResults[resultIndex];
					result.name = formatTime(estimate.refills[0].result);
					result.result.estimate = estimate;
					result.result.confidence = 2;
					return [...prevResults];
				});
			}
		});
		worker.postMessage(VoyageEstConfig);
		setResults(prevResults => {
			const result = prevResults[resultIndex];
			result.name = 'Calculating...';
			result.result.confidence = 1;
			return [...prevResults];
		});
	}

	function dismissResult(resultIndex: number): void {
		setResults(prevResults => {
			prevResults.splice(resultIndex, 1);
			return [...prevResults];
		});
	}

	function sendTelemetry(requestId: string, result: any): void {
		if (telemetryOptOut) return;
		const request = requests.find(r => r.id === requestId);
		const estimatedDuration = result.estimate.refills[0].result*60*60;
		try {
			fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry`, {
				method: 'post',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: 'voyageCalc',
					data: {
						voyagers: result.entries.map((entry) => entry.choice.symbol),
						estimatedDuration,
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
			if (!considerActive && crewman.active_status === 2)
				return false;

			if (!considerFrozen && crewman.immortal > 0)
				return false;

			if (excludedCrew && excludedCrew.includes(crewman.id))
				return false;

			return true;
		});
		updateConsideredCrew(consideredCrew);
	}, [considerActive, considerFrozen, excludedCrew]);

	const activeCount = myCrew.filter(crew => crew.active_status === 2).length;

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
	const { allCrew } = React.useContext(AllDataContext);
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
		if (eventData && eventData.length > 0) {
			const currentEvent = getEventData(eventData.sort((a, b) => (a.seconds_to_start - b.seconds_to_start))[0], allCrew);
			setActiveEvent({...currentEvent});
		}
		// Otherwise guess event from autosynced events
		/* 	Uncomment when voyagecalc can run without playerData
		else {
			guessCurrentEvent().then(currentEvent => {
				setActiveEvent({...currentEvent});
			});
		}
		*/
	}

	function populatePlaceholders(): void {
		const options = { initialized: false, list: [] };
		if (props.excludedCrew.length > 0) {
			let crewList = [...props.myCrew];
			if (!props.showFrozen) crewList = crewList.filter(c => c.immortal === 0);
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
		if (!props.showFrozen) crewList = crewList.filter(c => c.immortal === 0);
		options.list = crewList.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
			return { key: c.id, value: c.id, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
		});
		options.initialized = true;
		setOptions({...options});
	}
};

type VoyageResultPaneProps = {
	result: any;
	resultIndex: number;
	requests: any[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
	estimateResult: (resultIndex: number, voyageConfig: any, numSums: number) => void;
	dismissResult: (resultIndex: number) => void;
	roster: any[];
};

const VoyageResultPane = (props: VoyageResultPaneProps) => {
	const { playerData } = React.useContext(AllDataContext);
	const { result, resultIndex, resultCompared, requests, requestId, calcState, abortCalculation, estimateResult, dismissResult, roster } = props;

	const request = requests.find(r => r.id === requestId);
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

	const confidence = ['outline', 'half', 'end'];

	// resultToVoyageData
	let data = {...request.voyageConfig};
	if (result.entries) {
		result.entries.forEach((entry, idx) => {
			let acrew = request.consideredCrew.find(c => c.id === entry.choice.id);
			data.crew_slots[entry.slotId].crew = acrew;
		});
	}
	data.skill_aggregates = result.aggregates;
	data.max_hp = result.startAM;
	data.state = 'pending';

	const renderCalculatorMessage = () => {
		if (calcState !== CalculatorState.Done) {
			return (
				<>
					<Image inline size='mini' src='/media/voyage-wait-icon.gif' />
					Calculation in progress. Please wait...{` `}
					<Button compact style={{ marginLeft: '1em' }}
						content='Abort' onClick={() => abortCalculation(request.id)} />
				</>
			);
		}
		const inputs = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
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
			{calcState === CalculatorState.Done && (
				<Message attached>
					<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
						<div>
							Estimate: <b>{formatTime(result.estimate.refills[0].result)}</b>{` `}
							(expected range: {formatTime(result.estimate.refills[0].saferResult)} to{` `}
								{formatTime(result.estimate.refills[0].moonshotResult)})
							{resultCompared && (<div style={{ marginTop: '1em' }}>{resultCompared}</div>)}
						</div>
						<div>
							<Button.Group>
								<Popup position='top center'
									content={<>Get more confident estimate</>}
									trigger={
										<Button icon onClick={() => { if (result.confidence !== 1) estimateResult(resultIndex, data, 30000); }}>
											<Icon name={`hourglass ${confidence[result.confidence]}`} color={result.confidence === 2 ? 'green' : undefined} />
										</Button>
									}
								/>
								<Popup position='top center'
									content={<>Dismiss this recommendation</>}
									trigger={
										<Button icon='ban' onClick={() => dismissResult(resultIndex)} />
									}
								/>
							</Button.Group>
						</div>
					</div>
				</Message>
			)}
			<Tab.Pane>
				<VoyageStats
					voyageData={data}
					estimate={result.estimate}
					ships={[request.bestShip]}
					roster={roster}
					showPanels={['crew']}
					dbid={playerData.player.dbid}
				/>
				<div style={{ marginTop: '1em' }}>
					{renderCalculatorMessage()}
				</div>
				{calcState === CalculatorState.Done && (
					<CIVASMessage voyageConfig={data} estimate={result.estimate} />
				)}
			</Tab.Pane>
		</React.Fragment>
	);
};

const formatTime: string = (time: number) => {
	let hours = Math.floor(time);
	let minutes = Math.floor((time-hours)*60);
	return hours+"h " +minutes+"m";
};

export default Recommender;
