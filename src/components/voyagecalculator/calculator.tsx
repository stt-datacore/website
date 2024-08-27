import React from 'react';
import { Icon, Form, Button, Grid, Message, Segment, Checkbox, Select, Header, Image, Tab, Card, Popup, SemanticICONS } from 'semantic-ui-react';
import { Link } from 'gatsby';

//import allTraits from '../../../static/structured/translation_en.json';
import { Voyage } from '../../model/player';
import { IVoyageInputConfig, IVoyageCalcConfig, IVoyageCrew, IVoyageHistory } from '../../model/voyage';
import { CalcResult, Calculation, Estimate, GameWorkerOptions, VoyageConsideration } from '../../model/worker';
import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';
import { formatTime, flattenEstimate, BuffStatTable } from '../../utils/voyageutils';
import { UnifiedWorker } from '../../typings/worker';
import { CalculatorContext } from './context';
import { CrewThemes } from './crewthemes';
import { CrewExcluder } from './crewexcluder';
import { CALCULATORS, CalculatorState } from './helpers/calchelpers';
import { Helper } from './helpers/Helper';
import { VoyageStats } from './voyagestats';
import { CIVASMessage } from './civas';

import { defaultHistory, addVoyageToHistory, addCrewToHistory, removeVoyageFromHistory } from '../voyagehistory/utils';
import CONFIG from '../CONFIG';

// These preferences are per-user, so they need separate handlers when there's no player data
interface IUserPrefsContext {
	calculator: string;
	setCalculator: (calculator: string) => void;
	calcOptions: GameWorkerOptions;
	setCalcOptions: (calcOptions: GameWorkerOptions) => void;
	telemetryOptIn: boolean;
	setTelemetryOptIn: (telemetryOptIn: boolean) => void;
	history: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
};

const UserPrefsContext = React.createContext<IUserPrefsContext>({} as IUserPrefsContext);

type CalculatorProps = {
	voyageConfig: IVoyageInputConfig;
};

export const Calculator = (props: CalculatorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	return (
		<React.Fragment>
			{playerData && <PlayerCalculator voyageConfig={props.voyageConfig} dbid={`${playerData.player.dbid}`} />}
			{!playerData && <NonPlayerCalculator voyageConfig={props.voyageConfig} />}
		</React.Fragment>
	);
};

type PlayerCalculatorProps = {
	voyageConfig: IVoyageInputConfig;
	dbid: string;
};

const PlayerCalculator = (props: PlayerCalculatorProps) => {
	const [calculator, setCalculator] = useStateWithStorage(props.dbid+'/voyage/calculator', 'iampicard', { rememberForever: true });
	const [calcOptions, setCalcOptions] = useStateWithStorage<GameWorkerOptions>(props.dbid+'/voyage/calcOptions', {} as GameWorkerOptions, { rememberForever: true });
	const [telemetryOptIn, setTelemetryOptIn] = useStateWithStorage(props.dbid+'/voyage/telemetryOptIn', true, { rememberForever: true });
	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true } );

	const userPrefs = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		history, setHistory
	} as IUserPrefsContext;

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm voyageConfig={props.voyageConfig} />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};

const NonPlayerCalculator = (props: CalculatorProps) => {
	const [calculator, setCalculator] = React.useState('iampicard');
	const [calcOptions, setCalcOptions] = React.useState<GameWorkerOptions>({} as GameWorkerOptions);
	const [telemetryOptIn, setTelemetryOptIn] = React.useState(false);
	const [history, setHistory] = React.useState<IVoyageHistory>(defaultHistory);

	const userPrefs = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		history, setHistory
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm voyageConfig={props.voyageConfig} />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};

const CalculatorForm = (props: CalculatorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, ephemeral } = globalContext.player;
	const calculatorContext = React.useContext(CalculatorContext);
	const { rosterType } = calculatorContext;
	const userPrefs = React.useContext(UserPrefsContext);
	const { voyageConfig } = props;

	const [bestShip, setBestShip] = React.useState<VoyageConsideration | undefined>(undefined);
	const [consideredCrew, setConsideredCrew] = React.useState<IVoyageCrew[]>([] as IVoyageCrew[]);

	const [requests, setRequests] = React.useState<Helper[]>([] as Helper[]);
	const [results, setResults] = React.useState<Calculation[]>([] as Calculation[]);

	React.useEffect(() => {
		const consideredShips = [] as VoyageConsideration[];
		calculatorContext.ships.filter(ship => ship.owned).forEach(ship => {
			const traited = ship.traits?.includes(voyageConfig.ship_trait);
			let entry = {
				ship: ship,
				score: ship.antimatter + (traited ? 150 : 0),
				traited: traited,
				bestIndex: Math.min(ship.index?.left ?? 0, ship.index?.right ?? 0),
				archetype_id: ship.archetype_id
			} as VoyageConsideration;
			if (voyageConfig.voyage_type === 'encounter') {
				let f = ephemeral?.events?.find(f => f.content_types.includes('voyage'));
				if (f) {
					if (f.content.featured_ships?.includes(ship.symbol)) {
						entry.score = ship.antimatter + 500;
					}
					else {
						let ftrait = f.content.antimatter_bonus_ship_traits?.filter(bs => ship.traits?.includes(bs))?.length ?? 0;
						entry.score = ship.antimatter + (ftrait * 100);
					}
				}
			}
			consideredShips.push(entry);
		});
		consideredShips.sort((a, b) => {
			if (a.score === b.score) return a.archetype_id - b.archetype_id;
			return b.score - a.score;
		});
		setBestShip(consideredShips[0]);
		setRequests([]);
		setResults([]);
	}, [voyageConfig, calculatorContext]);

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
	const topAnchor = React.useRef<HTMLDivElement>(null);

	const calculators = CALCULATORS.helpers.map(helper => {
		return { key: helper.id, value: helper.id, text: helper.name };
	});
	calculators.push({ key: 'all', value: 'all', text: 'All calculators (slower)' });

	if (!bestShip) return (<></>);

	return (
		<React.Fragment>
			<div ref={topAnchor} />
			{false && <BestShipCard voyageConfig={voyageConfig} bestShip={bestShip} />}
			<ResultsGroup requests={requests} results={results} setResults={setResults} />
			<div style={{ marginTop: '1em' }}>
				{requests.length > 0 && <Header as='h3'>Options</Header>}
				<Form>
					<CrewOptions updateConsideredCrew={setConsideredCrew} />
					<Form.Group inline>
						<Form.Field
							control={Select}
							label='Calculator'
							options={calculators}
							value={userPrefs.calculator}
							onChange={(e, { value }) => userPrefs.setCalculator(value as string)}
							placeholder='Select calculator'
						/>
						{CALCULATORS.fields.filter(field => field.calculators.includes(userPrefs.calculator) || userPrefs.calculator === 'all').map(field => (
							<Form.Field
								key={field.id}
								control={Select}	/* Only control allowed at the moment */
								label={field.name}
								options={field.options}
								value={userPrefs.calcOptions[field.id] ?? field.default}
								placeholder={field.description}
								onChange={(e, { value }) => updateCalcOption(field.id, value)}
							/>
						))}
					</Form.Group>
					<Button fluid size='big' color='green' onClick={() => startCalculation()} disabled={consideredCrew.length < 12}>
						{t('global.recommend_crew')}
					</Button>
				</Form>
			</div>
			{rosterType === 'myCrew' && (
				<Message style={{ marginTop: '2em' }}>
					<Message.Content>
						<Message.Header>Privacy Notice</Message.Header>
						<p>We use anonymous statistics aggregated from voyage calculations to improve DataCore and power our <b><Link to='/hall_of_fame'>Voyage Hall of Fame</Link></b>.</p>
						<Form>
							<Form.Field
								control={Checkbox}
								label={<label>Permit DataCore to collect anonymous voyage stats</label>}
								checked={userPrefs.telemetryOptIn}
								onChange={(e, { checked }) => userPrefs.setTelemetryOptIn(checked) }
							/>
						</Form>
					</Message.Content>
				</Message>
			)}
		</React.Fragment>
	);

	function updateCalcOption(fieldId: string, value: any): void {
		const newValue = { [fieldId]: value };
		userPrefs.setCalcOptions({...userPrefs.calcOptions, ...newValue});
	}

	function scrollToAnchor(): void {
		if (!topAnchor.current) return;
		topAnchor.current.scrollIntoView({
			behavior: 'smooth'
		});
	}

	function startCalculation(): void {
		if (!voyageConfig || !bestShip || !consideredCrew || !userPrefs.calcOptions) return;

		const helperConfig = {
			voyageConfig, bestShip, consideredCrew, calcOptions: userPrefs.calcOptions,
			resultsCallback: handleResults,
			errorCallback: handleError
		};

		CALCULATORS.helpers.forEach(helper => {
			if (helper.id === userPrefs.calculator || userPrefs.calculator === 'all') {
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

	function handleResults(requestId: string, reqResults: CalcResult[], calcState: number): void {
		reqResults.forEach((reqResult, idx) => {
			// Update existing pane with results
			if (idx === 0) {
				setResults(prevResults => {
					const result = prevResults.find(r => r.id === requestId);
					if (result) {
						if (calcState === CalculatorState.Done) {
							result.name = formatTime(reqResult.estimate.refills[0].result, t);
							result.calcState = CalculatorState.Done;
						}
						result.result = reqResult;
					}
					return [...prevResults];
				});
				// Send telemetry pre-render (first recommendation only)
				if (userPrefs.telemetryOptIn && calcState === CalculatorState.Done)
					sendCalcResultTelemetry(reqResult, requestId);
			}
			// Add new panes if multiple results generated by this request
			else {
				setResults(prevResults => [...prevResults, {
					id: requestId+'-'+idx,
					requestId,
					name: formatTime(reqResult.estimate.refills[0].result, t),
					calcState: CalculatorState.Done,
					result: reqResult
				}]);
			}
		});
		if (calcState === CalculatorState.Done) scrollToAnchor();
	}

	function handleError(requestId: string, errorMessage: string): void {
		setResults(prevResults => {
			const result = prevResults.find(r => r.id === requestId);
			if (result) {
				result.name = 'Error!';
				result.calcState = CalculatorState.Error;
				result.errorMessage = errorMessage;
			}
			return [...prevResults];
		});
	}

	function sendCalcResultTelemetry(result: CalcResult, requestId: string): void {
		if (!result) return;

		const request = requests.find(r => r.id === requestId);
		if (!request) return;

		if (rosterType !== 'myCrew') return;
		if (request.calcOptions.strategy === 'peak-antimatter') return;

		const estimatedDuration = result.estimate.refills[0].result*60*60;

		let allGolds = globalContext.core.crew.filter(f => f.max_rarity === 5)?.map(c => c.symbol) ?? [];
		let maxxedGolds = [ ... new Set(playerData?.player.character.crew.filter(f => f.max_rarity === 5 && f.immortal && f.immortal < 0)?.map(c => c.symbol) ?? []) ];
		let frozenGolds = [ ... new Set(playerData?.player.character.crew.filter(f => f.max_rarity === 5 && f.immortal && f.immortal > 0)?.map(c => c.symbol) ?? []) ];

		let goldCount = allGolds.length;
		let frozenCount = frozenGolds.filter(c => !maxxedGolds.includes(c)).length;
		let maxxedCount = maxxedGolds.length;

		const immortalRatio = maxxedCount / goldCount;
		const frozenRatio = frozenCount / goldCount;

		const quipment = result.entries.map(entry => entry.choice).map(rc => {
			const pc = playerData?.player.character.crew.find(crew => crew.id === rc.id);
			if (pc) return pc;
			return rc;
		}).map(c => {
			if (!c.kwipment) return 0;
			if (typeof c.kwipment[0] === 'number') {
				return c.kwipment;
			}
			else {
				return c.kwipment.map(q => q[1]);
			}
		});

		const telemetryData = {
			voyagers: result.entries.map(entry => entry.choice.symbol),
			estimatedDuration,
			calculator: request.calculator,
			am_traits: request.voyageConfig.crew_slots.map(cs => cs.trait),
			ship_trait: request.voyageConfig.ship_trait,
			... request.voyageConfig.skills,
			extra_stats: {
				immortalRatio,
				frozenRatio,
				quipment,
				buffs: shrinkBuffs(globalContext.player.buffConfig)
			}
		};

		try {
			fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry`, {
				method: 'post',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: 'voyageCalc',
					data: telemetryData
				})
			});
		}
		catch (err) {
			console.log('An error occurred while sending telemetry', err);
		}
	}

	function shrinkBuffs(buffs?: BuffStatTable) {
		if (!buffs) return undefined;
		let output = {} as { [key: string]: { core: number, min: number, max: number } };

		CONFIG.SKILLS_SHORT.forEach((skill) => {
			output[skill.short] = {
				core: buffs[`${skill.name}_core`].percent_increase,
				max: buffs[`${skill.name}_range_max`].percent_increase,
				min: buffs[`${skill.name}_range_min`].percent_increase,
			}
		})

		return output;
	}
};

type BestShipCardProps = {
	voyageConfig: IVoyageInputConfig;
	bestShip: VoyageConsideration | undefined;
};

// BestShipCard to be deprecated. The game should automatically select the best ship for your voyage
const BestShipCard = (props: BestShipCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig, bestShip } = props;

	if (!bestShip) return (<></>);

	// const direction = bestShip.ship.index ? (bestShip.ship.index.right < bestShip.ship.index.left ? 'right' : 'left') : '';
	// const index = bestShip.ship.index ? bestShip.ship.index[direction] : 0;

	return (
		<Card fluid>
			<Card.Content>
				<Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${bestShip.ship.icon?.file.slice(1).replace('/', '_')}.png`} style={{ height: '4em' }} />
				<Card.Header>{bestShip.ship.name}</Card.Header>
				<p>best ship{bestShip.traited && (<span style={{ marginLeft: '1em' }}>{` +`}{SHIP_TRAIT_NAMES[voyageConfig.ship_trait]}</span>)}</p>
				{bestShip.ship.index && (
					<p style={{ marginTop: '.5em' }}>
						The game should automatically select {bestShip.ship.name} for your voyage.
						{/* Tap <Icon name={`arrow ${direction}` as SemanticICONS} />{index} time{index !== 1 ? 's' : ''} on your voyage ship selection screen to select {bestShip.ship.name}. */}
					</p>
				)}
			</Card.Content>
		</Card>
	);
};

type CrewOptionsProps = {
	updateConsideredCrew: (crew: IVoyageCrew[]) => void;
};

const CrewOptions = (props: CrewOptionsProps) => {
	const calculatorContext = React.useContext(CalculatorContext);
	const globalContext = React.useContext(GlobalContext);
	const { ephemeral } = globalContext.player;
	const { rosterType, voySymbol } = calculatorContext;

	const [preConsideredCrew, setPreConsideredCrew] = React.useState<IVoyageCrew[]>(calculatorContext.crew);
	const [considerActive, setConsiderActive] = React.useState(false);
	const [considerFrozen, setConsiderFrozen] = React.useState(false);
	const [preExcludedCrew, setPreExcludedCrew] = React.useState<IVoyageCrew[]>([] as IVoyageCrew[]);
	const [excludedCrewIds, internalSetExcludedCrewIds] = React.useState<number[]>([] as number[]);
	const [consideredCount, setConsideredCount] = React.useState(0);

	const setExcludedCrewIds = (ids: number[]) => {
		internalSetExcludedCrewIds([ ... new Set(ids) ]);
	}

	React.useEffect(() => {
		setPreConsideredCrew([...calculatorContext.crew]);
	}, [calculatorContext.crew]);

	React.useEffect(() => {
		const preExcludedCrew = preExcludeCrew(preConsideredCrew);
		setPreExcludedCrew([...preExcludedCrew]);
		const consideredCrew = preExcludedCrew.filter(crewman => {
			if (excludedCrewIds.includes(crewman.id))
				return false;
			return true;
		});
		setConsideredCount(consideredCrew.length);
		props.updateConsideredCrew(consideredCrew);
	}, [preConsideredCrew, considerActive, considerFrozen, excludedCrewIds]);

	const otherVoyages = ephemeral?.voyage?.filter(f => f.name !== voySymbol);
	const activeCount = calculatorContext.crew.filter(crew => crew.active_status === 2 || otherVoyages?.some(voy => voy.crew_slots?.some(cs => cs.crew.id === crew.id))).length;

	return (
		<Grid stackable columns={2} style={{ marginBottom: '1em' }}>
			<Grid.Row>
				<Grid.Column>
					<Message attached>
						<Message.Header>
							Crew to Consider
						</Message.Header>
						<p>A total of <b>{consideredCount} crew</b> will be considered for this voyage.</p>
					</Message>
					<Segment attached='bottom'>
						{rosterType === 'myCrew' && (
							<Form.Group grouped style={{ marginBottom: '1em' }}>
								<React.Fragment>
									{activeCount > 0 && (
										<>
										<Form.Field
											control={Checkbox}
											label='Consider crew on active shuttles or other voyages'
											checked={considerActive}
											onChange={(e, { checked }) => setConsiderActive(checked)}
										/>
										</>
									)}
									<Form.Field
										control={Checkbox}
										label='Consider frozen crew'
										checked={considerFrozen}
										onChange={(e, { checked }) => setConsiderFrozen(checked)}
									/>
								</React.Fragment>
							</Form.Group>
						)}
						<CrewThemes
							rosterType={rosterType}
							rosterCrew={calculatorContext.crew}
							preExcludeCrew={preExcludeCrew}
							considerActive={considerActive}
							considerFrozen={considerFrozen}
							setPreConsideredCrew={setPreConsideredCrew}
						/>
					</Segment>
				</Grid.Column>
				<Grid.Column>
					<CrewExcluder
						considerFrozen={considerFrozen}
						rosterCrew={calculatorContext.crew}
						preExcludedCrew={preExcludedCrew}
						excludedCrewIds={excludedCrewIds}
						updateExclusions={setExcludedCrewIds}
					/>
				</Grid.Column>
			</Grid.Row>
		</Grid>
	);

	function preExcludeCrew(preConsideredCrew: IVoyageCrew[]): IVoyageCrew[] {

		if (!considerActive && ephemeral?.voyage?.length) {
			let list = [...new Set(ephemeral.voyage.filter((f, idx) => f.name !== voySymbol).map(m => m.crew_slots.map(m2 => m2.crew.id)).flat()) ]
			preConsideredCrew = preConsideredCrew.filter(f => !list.includes(f.id));
		}

		return preConsideredCrew.filter(crewman => {
			if (!considerActive && crewman.active_status === 2)
				return false;



			if (!considerFrozen && crewman.immortal > 0)
				return false;

			return true;
		});
	}
};

type ResultsGroupProps = {
	requests: Helper[];
	results: Calculation[];
	setResults: (results: Calculation[]) => void;
};

const ResultsGroup = (props: ResultsGroupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const calculatorContext = React.useContext(CalculatorContext);
	const userPrefs = React.useContext(UserPrefsContext);

	const { requests, results, setResults } = props;

	const [trackerId, setTrackerId] = React.useState(0);

	const analyses = [] as string[];

	// In-game voyage crew picker ignores frozen crew and crew active on shuttles
	const availableRoster = calculatorContext.crew.filter(c => c.immortal <= 0 && c.active_status !== 2);

	if (results.length === 0)
		return (<></>);

	// Compare best values among ALL results
	interface IBestValues {
		median: number;
		minimum: number;
		moonshot: number;
		antimatter: number;
		dilemma: {
			hour: number;
			chance: number;
		};
	};
	const bestValues = {
		median: 0,
		minimum: 0,
		moonshot: 0,
		antimatter: 0,
		dilemma: {
			hour: 0,
			chance: 0
		}
	} as IBestValues;
	results.forEach(result => {
		if (result.calcState === CalculatorState.Done && result.result) {
			const values = flattenEstimate(result.result.estimate);
			Object.keys(bestValues).forEach((valueKey) => {
				if (valueKey === 'antimatter') {
					bestValues.antimatter = Math.max(bestValues.antimatter, result.result?.estimate.antimatter ??  0);
				}
				else if (valueKey === 'dilemma') {
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
		let analysis = '';
		if (result.calcState === CalculatorState.Done && result.result) {
			const recommended = getRecommendedList(result.result.estimate, bestValues);
			if (results.length === 1)
				analysis = 'Recommended for all criteria';
			else {
				if (recommended.length > 0)
					analysis = ' Recommended for ' + recommended.map((method) => getRecommendedValue(method, bestValues)).join(', ');
				else
					analysis = ' Proposed alternative';
			}
		}
		analyses.push(analysis);
	});

	const panes = results.map((result, resultIndex) => ({
		menuItem: { key: result.id, content: renderMenuItem(result.name, analyses[resultIndex]) },
		render: () => {
			if (result.calcState === CalculatorState.Error) {
				return (
					<ErrorPane
						errorMessage={result.errorMessage} resultIndex={resultIndex}
						requests={requests} requestId={result.requestId}
						dismissResult={dismissResult}
					/>
				);
			}
			return (
				<ResultPane result={result.result} resultIndex={resultIndex}
					requests={requests} requestId={result.requestId}
					calcState={result.calcState} abortCalculation={abortCalculation}
					analysis={analyses[resultIndex]}
					trackState={result.trackState ?? 0} trackResult={trackResult}
					confidenceState={result.confidenceState ?? 0} estimateResult={estimateResult}
					dismissResult={dismissResult}
					roster={availableRoster}
				/>
			);
		}
	}));

	function renderMenuItem(name: string, analysis: string): JSX.Element {
		if (analysis !== '') {
			return (
				<Popup position='top center'
					content={<p>{analysis}</p>}
					trigger={<p>{name}</p>}
				/>
			);
		}
		else {
			return <p>{name}</p>;
		}
	}

	function getRecommendedList(estimate: Estimate, bestValues: IBestValues): string[] {
		const recommended = [] as string[];
		const values = flattenEstimate(estimate);
		Object.keys(bestValues).forEach((method) => {
			if ((method === 'antimatter' && bestValues.antimatter === estimate.antimatter) ||
				(method === 'dilemma' && bestValues.dilemma.hour === values.dilemma.hour && bestValues.dilemma.chance === values.dilemma.chance) ||
				bestValues[method] === values[method])
					recommended.push(method);
		});
		return recommended;
	};

	function getRecommendedValue(method: string, bestValues: IBestValues): string {
		let sortName = '', sortValue: string | number = '';
		switch (method) {
			case 'median':
				sortName = 'estimated runtime';
				sortValue = formatTime(bestValues.median, t);
				break;
			case 'minimum':
				sortName = 'guaranteed minimum';
				sortValue = formatTime(bestValues.minimum, t);
				break;
			case 'moonshot':
				sortName = 'moonshot';
				sortValue = formatTime(bestValues.moonshot, t);
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
		if (sortValue !== '') sortValue = ' ('+sortValue+')';
		return sortName+sortValue;
	}

	function abortCalculation(requestId: string): void {
		const request = requests.find(r => r.id === requestId);
		if (request) {
			request.abort();
			const result = results.find(prev => prev.id === requestId);
			if (result && result.result) {
				result.name = formatTime(result.result.estimate.refills[0].result, t);
				result.calcState = CalculatorState.Done;
			}
			else {
				const index = results.findIndex(prev => prev.id === requestId);
				results.splice(index, 1);
			}
			setResults([...results]);
		}
	}

	function trackResult(resultIndex: number, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate): void {
		// Remove previous tracked voyage and associated crew assignments
		//	(in case user tracks a different recommendation from same request)
		if (trackerId > 0) removeVoyageFromHistory(userPrefs.history, trackerId);

		const newTrackerId = addVoyageToHistory(userPrefs.history, voyageConfig, shipSymbol, estimate);
		addCrewToHistory(userPrefs.history, newTrackerId, voyageConfig);
		userPrefs.setHistory({...userPrefs.history});
		setTrackerId(newTrackerId);
		results.forEach((result, idx) => {
			result.trackState = idx === resultIndex ? 1 : 0;
		});
		setResults([...results]);
	}

	function estimateResult(resultIndex: number, voyageConfig: IVoyageCalcConfig, numSims: number): void {
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
				const result = results[resultIndex];
				result.name = formatTime(estimate.refills[0].result, t);
				if (result.result) result.result.estimate = estimate;
				result.confidenceState = 2;
				setResults([...results]);
			}
		});
		worker.postMessage(VoyageEstConfig);
		const result = results[resultIndex];
		result.name = 'Calculating...';
		result.confidenceState = 1;
		setResults([...results]);
	}

	function dismissResult(resultIndex: number): void {
		results.splice(resultIndex, 1);
		setResults([...results]);
	}

	return (
		<React.Fragment>
			<Header as='h3'>Recommended Lineups</Header>
			<Tab menu={{ pointing: true }} panes={panes} />
		</React.Fragment>
	);
};

type ResultPaneProps = {
	result: CalcResult | undefined;
	resultIndex: number;
	requests: Helper[];
	requestId: string;
	calcState: number;
	abortCalculation: (requestId: string) => void;
	analysis: string;
	trackState: number;
	confidenceState: number;
	trackResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, shipSymbol: string, estimate: Estimate) => void;
	estimateResult: (resultIndex: number, voyageConfig: IVoyageCalcConfig, numSums: number) => void;
	dismissResult: (resultIndex: number) => void;
	roster: IVoyageCrew[];
};

const ResultPane = (props: ResultPaneProps) => {
	const calculatorContext = React.useContext(CalculatorContext);
	const { t } = React.useContext(GlobalContext).localized;
	const { rosterType, activeVoyageId } = calculatorContext;
	const {
		result, resultIndex,
		requests, requestId,
		calcState, abortCalculation,
		analysis,
		trackState, trackResult,
		confidenceState, estimateResult,
		dismissResult,
		roster
	} = props;

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

	const iconTrack = ['flag outline', 'flag'] as SemanticICONS[];
	const iconConfidence = ['hourglass outline', 'hourglass half', 'hourglass end'] as SemanticICONS[];

	// resultToVoyageData
	let data = {...request.voyageConfig} as IVoyageCalcConfig;
	if (result.entries) {
		result.entries.forEach((entry, idx) => {
			let acrew = request.consideredCrew.find(c => c.id === entry.choice.id);
			data.crew_slots[entry.slotId].crew = acrew ?? {} as IVoyageCrew;
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
							Estimate: <b>{formatTime(result.estimate.refills[0].result, t)}</b>{` `}
							(expected range: {formatTime(result.estimate.refills[0].saferResult, t)} to{` `}
								{formatTime(result.estimate.refills[0].moonshotResult, t)})
							{analysis !== '' && (<div style={{ marginTop: '1em' }}>{analysis}</div>)}
						</div>
						<div>
							<Button.Group>
								{rosterType === 'myCrew' && activeVoyageId === 0 &&
									<Popup position='top center'
										content={<>Track this recommendation</>}
										trigger={
											<Button icon onClick={() => trackResult(resultIndex, data, request.bestShip.ship.symbol, result.estimate)}>
												<Icon name={iconTrack[trackState]} color={trackState === 1 ? 'green' : undefined} />
											</Button>
										}
									/>
								}
								<Popup position='top center'
									content={<>Get more confident estimate</>}
									trigger={
										<Button icon onClick={() => { if (confidenceState !== 1) estimateResult(resultIndex, data, 30000); }}>
											<Icon name={iconConfidence[confidenceState]} color={confidenceState === 2 ? 'green' : undefined} />
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
					voyageData={data as Voyage}
					estimate={result.estimate}
					ships={[request.bestShip.ship]}
					roster={roster}
					rosterType={rosterType}
					showPanels={['crew']}
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

type ErrorPaneProps = {
	errorMessage?: string;
	resultIndex: number;
	requests: Helper[];
	requestId: string;
	dismissResult: (resultIndex: number) => void;
};

const ErrorPane = (props: ErrorPaneProps) => {
	const { errorMessage, resultIndex, requests, requestId, dismissResult } = props;

	const request = requests.find(r => r.id === requestId);
	if (!request) return (<></>);

	const renderInputOptions = () => {
		const inputs = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (<>{inputs.join(', ')}</>);
	};

	return (
		<React.Fragment>
			<Message attached negative>
				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
					<div>
						{errorMessage ?? 'The voyage calculator encountered an error!'}
					</div>
					<div>
						<Button.Group>
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
			<Tab.Pane>
				<p>The voyage calculator is unable to recommend lineups for the requested options ({renderInputOptions()}). Please try again using different options.</p>
			</Tab.Pane>
		</React.Fragment>
	);
}
