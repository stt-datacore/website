import React from 'react';
import { Icon, Form, Button, Grid, Message, Segment, Checkbox, Select, Header, Image, Tab, Card, Popup, SemanticICONS, DropdownItemProps } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { PlayerCrew, Voyage } from '../../model/player';
import { IVoyageInputConfig, IVoyageCalcConfig, IVoyageCrew, ITrackedVoyage, IFullPayloadAssignment } from '../../model/voyage';
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

import { HistoryContext } from '../voyagehistory/context';
import { addVoyageToHistory, addCrewToHistory, removeVoyageFromHistory, SyncState, deleteTrackedData, createTrackableVoyage, NEW_TRACKER_ID, createTrackableCrew, postTrackedData } from '../voyagehistory/utils';
import CONFIG from '../CONFIG';
import { getShipTraitBonus } from './utils';
import { VPGraphAccordion } from './vpgraph';
import { applyCrewBuffs, oneCrewCopy, qbitsToSlots, skillSum } from '../../utils/crewutils';
import { calcQLots } from '../../utils/equipment';
import { getItemWithBonus, ItemWithBonus } from '../../utils/itemutils';
import { BaseSkills, QuippedPower, Skill } from '../../model/crew';
import { QuipmentProspectConfig, QuipmentProspects } from './quipmentprospects';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';

// These preferences are per-user, so they need separate handlers when there's no player data
interface IUserPrefsContext {
	calculator: string;
	setCalculator: (calculator: string) => void;
	calcOptions: GameWorkerOptions;
	setCalcOptions: (calcOptions: GameWorkerOptions) => void;
	telemetryOptIn: boolean;
	setTelemetryOptIn: (telemetryOptIn: boolean) => void;
};

const UserPrefsContext = React.createContext<IUserPrefsContext>({} as IUserPrefsContext);

export const Calculator = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { voyage_type } = React.useContext(CalculatorContext).voyageConfig;

	return (
		<React.Fragment>
			{playerData && (
				<PlayerCalculator
					key={voyage_type}
					dbid={`${playerData.player.dbid}`}
					voyageType={voyage_type}
				/>
			)}
			{!playerData && <NonPlayerCalculator />}
		</React.Fragment>
	);
};

type PlayerCalculatorProps = {
	dbid: string;
	voyageType: string;
};

const PlayerCalculator = (props: PlayerCalculatorProps) => {
	const voyageType: string = props.voyageType === 'encounter' ? '/encounter' : '';
	const defaultCalculator: string = props.voyageType === 'encounter' ? 'ussjohnjay-mvam' : 'iampicard';
	const [calculator, setCalculator] = useStateWithStorage(`${props.dbid}/voyage/calculator${voyageType}`, defaultCalculator, { rememberForever: true });
	const [calcOptions, setCalcOptions] = useStateWithStorage<GameWorkerOptions>(`${props.dbid}/voyage/calcOptions${voyageType}`, {} as GameWorkerOptions, { rememberForever: true });
	const [telemetryOptIn, setTelemetryOptIn] = useStateWithStorage(props.dbid+'/voyage/telemetryOptIn', true, { rememberForever: true });

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};

const NonPlayerCalculator = () => {
	const [calculator, setCalculator] = React.useState('iampicard');
	const [calcOptions, setCalcOptions] = React.useState<GameWorkerOptions>({} as GameWorkerOptions);
	const [telemetryOptIn, setTelemetryOptIn] = React.useState(false);

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};

const CalculatorForm = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const calculatorContext = React.useContext(CalculatorContext);
	const { configSource, voyageConfig } = calculatorContext;
	const userPrefs = React.useContext(UserPrefsContext);

	const [consideredCrew, setConsideredCrew] = React.useState<IVoyageCrew[]>([]);

	const [requests, setRequests] = React.useState<Helper[]>([]);
	const [results, setResults] = React.useState<Calculation[]>([]);

	const bestShip = React.useMemo(() => {
		let bestShip: VoyageConsideration | undefined;
		const consideredShips: VoyageConsideration[] = [];
		calculatorContext.ships.filter(ship => ship.owned).forEach(ship => {
			const shipBonus: number = getShipTraitBonus(voyageConfig, ship);
			const entry: VoyageConsideration = {
				ship: ship,
				score: ship.antimatter + shipBonus,
				traited: shipBonus > 0,
				bestIndex: Math.min(ship.index?.left ?? 0, ship.index?.right ?? 0),
				archetype_id: ship.archetype_id ?? 0
			};
			consideredShips.push(entry);
		});
		if (consideredShips.length > 0) {
			consideredShips.sort((a, b) => {
				if (a.score === b.score) return a.archetype_id - b.archetype_id;
				return b.score - a.score;
			});
			// Recommend best non-running ship (exception: custom input should recommend best ship, even if already running)
			for (let i = 0; i < consideredShips.length; i++) {
				if (!calculatorContext.runningShipIds.includes(consideredShips[i].ship.id) || configSource === 'custom') {
					bestShip = consideredShips[i];
					break;
				}
			}
		}
		return bestShip;
	}, [configSource, voyageConfig, calculatorContext.ships, calculatorContext.runningShipIds]);

	React.useEffect(() => {
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
	const topAnchor = React.useRef<HTMLDivElement>(null);

	const calculators: DropdownItemProps = CALCULATORS.helpers.map(helper => {
		return { key: helper.id, value: helper.id, text: helper.name };
	});
	calculators.push({ key: 'all', value: 'all', text: 'All calculators (slower)' });

	if (!bestShip) return (<></>);

	return (
		<React.Fragment>
			<div ref={topAnchor} />
			{/* <BestShipCard voyageConfig={voyageConfig} bestShip={bestShip} /> */}
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
			{configSource === 'player' && (
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

		if (configSource !== 'player') return;
		if (voyageConfig.voyage_type !== 'dilemma') return;
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
	const flexRow = OptionsPanelFlexRow;
	const flexCol = OptionsPanelFlexColumn;
	const calculatorContext = React.useContext(CalculatorContext);
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { rosterType, voyageConfig } = calculatorContext;

	const [preConsideredCrew, setPreConsideredCrew] = React.useState<IVoyageCrew[]>(calculatorContext.crew);
	const [considerVoyagers, setConsiderVoyagers] = React.useState<boolean>(false);
	const [considerShuttlers, setConsiderShuttlers] = React.useState<boolean>(false);
	const [considerFrozen, setConsiderFrozen] = React.useState<boolean>(false);
	const [computeETRatio, setComputeETRatio] = React.useState<boolean>(false);
	const [preExcludedCrew, setPreExcludedCrew] = React.useState<IVoyageCrew[]>([]);
	const [excludedCrewIds, internalSetExcludedCrewIds] = React.useState<number[]>([]);
	const [consideredCount, setConsideredCount] = React.useState<number>(0);

	const DefaultQuipmentConfig: QuipmentProspectConfig = {
		mode: 'best',
		voyage: 'voyage',
		current: false,
		enabled: false,
		slots: 0,
		calc: 'all'
	}
	const dbid = globalContext.player.playerData ? globalContext.player.playerData.player.dbid + "/" : '';
	const [qpConfig, setQPConfig] = useStateWithStorage(`${dbid}${voyageConfig.voyage_type}/voyage_quipment_prospect_config`, DefaultQuipmentConfig, { rememberForever: true });

	const setExcludedCrewIds = (ids: number[]) => {
		internalSetExcludedCrewIds([ ... new Set(ids) ]);
	};

	React.useEffect(() => {
		const quipment = qpConfig.enabled ? globalContext.core.items.filter(f => f.type === 14).map(m => getItemWithBonus(m)) : [];
		const crew = calculatorContext.crew.map(c => applyQuipmentProspect(c, quipment));
		setPreConsideredCrew(crew);
	}, [calculatorContext.crew, qpConfig]);

	React.useEffect(() => {
		const preExcludedCrew: IVoyageCrew[] = preExcludeCrew(preConsideredCrew);
		setPreExcludedCrew([...preExcludedCrew]);
		const consideredCrew: IVoyageCrew[] = preExcludedCrew.filter(crewman => {
			if (excludedCrewIds.includes(crewman.id))
				return false;
			return true;
		});
		setConsideredCount(consideredCrew.length);
		props.updateConsideredCrew(consideredCrew);
	}, [preConsideredCrew, considerVoyagers, considerShuttlers, considerFrozen, excludedCrewIds, computeETRatio]);

	const activeVoyagers: number = calculatorContext.crew.filter(crew =>
		crew.active_status === 3
	).length;
	const activeShuttlers: number = calculatorContext.crew.filter(crew =>
		crew.active_status === 2
	).length;

	return (
		<Grid stackable columns={2} style={{ marginBottom: '1em' }}>
			<Grid.Row>
				<Grid.Column>
					<Message attached>
						<Message.Header>
							{t('voyage.picker_options.title')}
						</Message.Header>
						<p>
							{tfmt('voyage.picker_options.sub_title', {
								n: <b>{consideredCount} crew</b>
							})}
						</p>
					</Message>
					<Segment attached='bottom'>
						{rosterType === 'myCrew' && (
							<Form.Group grouped style={{ marginBottom: '1em' }}>
								<React.Fragment>
									{activeVoyagers > 0 && (
										<Form.Field
											control={Checkbox}
											label={t('voyage.picker_options.voyage')}
											checked={considerVoyagers}
											onChange={(e, { checked }) => setConsiderVoyagers(checked)}
										/>
									)}
									{activeShuttlers > 0 && (
										<Form.Field
											control={Checkbox}
											label={t('voyage.picker_options.shuttle')}
											checked={considerShuttlers}
											onChange={(e, { checked }) => setConsiderShuttlers(checked)}
										/>
									)}
									<Form.Field
										control={Checkbox}
										label={t('voyage.picker_options.frozen')}
										checked={considerFrozen}
										onChange={(e, { checked }) => setConsiderFrozen(checked)}
									/>
									{!!voyageConfig.event_content?.encounter_traits?.length &&
									<Form.Field
										control={Checkbox}
										label={t('voyage.picker_options.encounter_traits')}
										checked={computeETRatio}
										onChange={(e, { checked }) => setComputeETRatio(checked)}
									/>
									}
								</React.Fragment>
							</Form.Group>
						)}
						<div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
							<CrewThemes
								rosterType={rosterType}
								rosterCrew={calculatorContext.crew}
								preExcludeCrew={preExcludeCrew}
								considerActive={considerShuttlers}
								considerFrozen={considerFrozen}
								setPreConsideredCrew={setPreConsideredCrew}
							/>

							<QuipmentProspects
								config={qpConfig}
								setConfig={setQPConfig}
								/>
						</div>
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

		const limit = 0.25;

		let maxprof = -1;
		let minprof = -1;

		const cprofs = {} as {[key: string]: number}
		const etl = voyageConfig.event_content?.encounter_traits?.length ?? 0;

		let preExcluded = preConsideredCrew.filter(crewman => {
			if (computeETRatio && voyageConfig.event_content?.encounter_traits?.length) {
				const profs = skillSum(Object.values(crewman.skills), 'proficiency');
				cprofs[crewman.id] = profs;
				if (maxprof == -1 || maxprof < profs) maxprof = profs;
				if (minprof == -1 || minprof > profs) minprof = profs;
			}
			if (crewman.expires_in)
				return false;

			if (!considerVoyagers && crewman.active_status === 3)
				return false;

			if (!considerShuttlers && crewman.active_status === 2)
				return false;

			if (!considerFrozen && crewman.immortal > 0)
				return false;

			return true;
		});

		if (computeETRatio && voyageConfig.event_content?.encounter_traits?.length) {
			preExcluded.forEach((crewman) => {
				const ctl = voyageConfig!.event_content!.encounter_traits!.filter(trait => crewman.traits.includes(trait))?.length;
				let ca = ctl / etl;
				let cb = cprofs[crewman.id] / maxprof;
				crewman.pickerId = (ca + cb) * 0.5;
			});
			preExcluded.sort((a, b) => b.pickerId! - a.pickerId!);
			preExcluded = preExcluded.filter(c => c.pickerId && c.pickerId >= limit);
		}

		return preExcluded;
	}

	function applyQuipmentProspect(c: PlayerCrew, quipment: ItemWithBonus[]) {
		if (qpConfig.enabled && c.immortal === -1 && c.q_bits >= 100) {
			if (qpConfig.current && c.kwipment.some(q => typeof q === 'number' ? q : q[1])) {
				return c;
			}
			let newcopy = oneCrewCopy(c);
			let oldorder = newcopy.skill_order;
			let order = [...oldorder];
			let nslots = qbitsToSlots(newcopy.q_bits);

			if (qpConfig.voyage !== 'none') {
				order.sort((a, b) => {
					if (['voyage', 'voyage_1'].includes(qpConfig.voyage)) {
						if (voyageConfig.skills.primary_skill === a) return -1;
						if (voyageConfig.skills.primary_skill === b) return 1;
					}
					if (['voyage', 'voyage_2'].includes(qpConfig.voyage)) {
						if (voyageConfig.skills.secondary_skill === a) return -1;
						if (voyageConfig.skills.secondary_skill === b) return 1;
					}
					return oldorder.indexOf(a) - oldorder.indexOf(b);
				});
			}

			newcopy.skill_order = order;

			if (qpConfig.slots && qpConfig.slots < nslots) nslots = qpConfig.slots;

			calcQLots(newcopy, quipment, globalContext.player.buffConfig, false, nslots, qpConfig.calc);

			newcopy.skill_order = oldorder;

			let useQuipment: QuippedPower | undefined = undefined;
			if (qpConfig.mode === 'all') {
				useQuipment = newcopy.best_quipment_3!;
			}
			else if (qpConfig.mode === 'best') {
				useQuipment = newcopy.best_quipment!;
			}
			else if (qpConfig.mode === 'best_2') {
				useQuipment = newcopy.best_quipment_1_2!;
			}
			if (!useQuipment) return c;


			if (qpConfig.mode === 'best') {
				newcopy.kwipment = Object.values(useQuipment.skill_quipment[order[0]]).map(q => Number(q.kwipment_id));
				let skill = useQuipment.skills_hash[order[0]];
				newcopy[skill.skill] = {
					core: skill.core,
					min: skill.range_min,
					max: skill.range_max
				}
				newcopy.skills[skill.skill] = {
					...skill
				}
			}
			else {
				newcopy.kwipment = Object.entries(useQuipment.skill_quipment).map(([skill, quip]) => quip.map(q => Number(q.kwipment_id))).flat();
				Object.entries(useQuipment.skills_hash).forEach(([key, skill]) => {
					newcopy[key] = {
						core: skill.core,
						min: skill.range_min,
						max: skill.range_max
					}
					newcopy.skills[key] = {
						...skill
					}
				});
			}


			while (newcopy.kwipment.length < 4) newcopy.kwipment.push(0);
			newcopy.kwipment_expiration = [0, 0, 0, 0];
			newcopy.kwipment_prospects = true;
			return newcopy;
		}
		else {
			return c;
		}
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
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { voyageConfig } = calculatorContext;

	const { requests, results, setResults } = props;

	const [trackerId, setTrackerId] = React.useState<number>(NEW_TRACKER_ID);

	const analyses: string[] = [];

	// In-game voyage crew picker ignores frozen crew, active shuttlers, and active voyagers
	const availableRoster: IVoyageCrew[] = calculatorContext.crew.filter(
		c => c.immortal <= 0 && c.active_status !== 2 && c.active_status !== 3
	);

	if (results.length === 0)
		return (<></>);

	// Compare best values among ALL results
	interface IBestValues {
		median: number;
		minimum: number;
		moonshot: number;
		dilemma: {
			hour: number;
			chance: number;
		};
		antimatter: number;
		total_vp: number;
		vp_per_min: number;
	};
	const bestValues: IBestValues = {
		median: 0,
		minimum: 0,
		moonshot: 0,
		dilemma: {
			hour: 0,
			chance: 0
		},
		antimatter: 0,
		total_vp: 0,
		vp_per_min: 0
	};
	results.forEach(result => {
		if (result.calcState === CalculatorState.Done && result.result) {
			const values = {
				...flattenEstimate(result.result.estimate),
				antimatter: result.result.estimate.antimatter ?? 0,
				total_vp: result.result.estimate.vpDetails?.total_vp ?? 0,
				vp_per_min: result.result.estimate.vpDetails?.vp_per_min ?? 0
			};
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
		let analysis: string = '';
		if (result.calcState === CalculatorState.Done && result.result) {
			const recommended: string[] = getRecommendedList(result.result.estimate, bestValues);
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
		const recommended: string[] = [];
		const values = {
			...flattenEstimate(estimate),
			antimatter: estimate.antimatter ?? 0,
			total_vp: estimate.vpDetails?.total_vp ?? 0,
			vp_per_min: estimate.vpDetails?.vp_per_min ?? 0
		};
		Object.keys(bestValues).forEach(method => {
			let canRecommend: boolean = false;
			if (method === 'dilemma') {
				if (voyageConfig.voyage_type === 'dilemma') {
					canRecommend = bestValues.dilemma.hour === values.dilemma.hour
						&& bestValues.dilemma.chance === values.dilemma.chance;
				}
			}
			else if ((method === 'total_vp' || method === 'vp_per_min')) {
				if (voyageConfig.voyage_type === 'encounter') {
					canRecommend = bestValues[method] === values[method];
				}
			}
			else {
				canRecommend = bestValues[method] === values[method];
			}
			if (canRecommend) recommended.push(method);
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
			case 'total_vp':
				sortName = 'projected VP';
				sortValue = bestValues.total_vp.toLocaleString();
				break;
			case 'vp_per_min':
				sortName = 'projected VP per minute';
				sortValue = Math.floor(bestValues.vp_per_min);
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
		// First remove previous tracked voyage and associated crew assignments
		//	(in case user tracks a different recommendation from same request)
		const trackableVoyage: ITrackedVoyage = createTrackableVoyage(
			voyageConfig, shipSymbol, estimate, trackerId
		);
		const trackableCrew: IFullPayloadAssignment[] = createTrackableCrew(voyageConfig, trackerId);
		if (syncState === SyncState.RemoteReady) {
			deleteTrackedData(dbid, trackerId).then((success: boolean) => {
				if (success) {
					removeVoyageFromHistory(history, trackerId);
					postTrackedData(dbid, trackableVoyage, trackableCrew).then(result => {
						if (result.status < 300 && result.trackerId && result.inputId === trackerId) {
							const newRemoteId: number = result.trackerId;
							addVoyageToHistory(history, newRemoteId, trackableVoyage);
							addCrewToHistory(history, newRemoteId, trackableCrew);
							setHistory({...history});
							updateTrackedResults(resultIndex, newRemoteId);
						}
						else {
							throw('Failed trackResult -> postTrackedData');
						}
					})
				}
				else {
					throw('Failed trackResult -> deleteTrackedData');
				}
			}).catch(e => {
				setMessageId('voyage.history_msg.failed_to_track');
				console.log(e);
			});
		}
		else if (syncState === SyncState.LocalOnly) {
			removeVoyageFromHistory(history, trackerId);
			const newLocalId: number = history.voyages.reduce((prev, curr) => Math.max(prev, curr.tracker_id), 0) + 1;
			addVoyageToHistory(history, newLocalId, trackableVoyage);
			addCrewToHistory(history, newLocalId, trackableCrew);
			setHistory({...history});
			updateTrackedResults(resultIndex, newLocalId);
		}
		else {
			setMessageId('voyage.history_msg.invalid_sync_state');
			console.log(`Failed trackResult (invalid syncState: ${syncState})`);
		}
	}

	function updateTrackedResults(resultIndex: number, trackerId: number): void {
		results.forEach((result, idx) => {
			result.trackState = idx === resultIndex ? 1 : 0;
		});
		setResults([...results]);
		setTrackerId(trackerId);
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
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { syncState } = React.useContext(HistoryContext);
	const calculatorContext = React.useContext(CalculatorContext);
	const { configSource, rosterType } = calculatorContext;
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

	const iconTrack: SemanticICONS[] = ['flag outline', 'flag'];
	const iconConfidence: SemanticICONS[] = ['hourglass outline', 'hourglass half', 'hourglass end'];

	// Create new voyageConfig based on input and calc results
	const voyageConfig: IVoyageCalcConfig = {
		...request.voyageConfig,
		state: 'pending',
		max_hp: result.startAM,
		skill_aggregates: result.aggregates,
		crew_slots: request.voyageConfig.crew_slots.map(slot => {
			return ({
				...slot,
				crew: {} as IVoyageCrew
			});
		})
	};
	if (result.entries) {
		result.entries.forEach(entry => {
			const crew: IVoyageCrew | undefined = request.consideredCrew.find(c => c.id === entry.choice.id);
			if (crew) voyageConfig.crew_slots[entry.slotId].crew = crew;
		});
	}

	const renderCalculatorMessage = () => {
		if (calcState !== CalculatorState.Done) {
			return (
				<React.Fragment>
					<Image inline size='mini' src='/media/voyage-wait-icon.gif' />
					Calculation in progress. Please wait...{` `}
					<Button compact style={{ marginLeft: '1em' }}
						content='Abort' onClick={() => abortCalculation(request.id)} />
				</React.Fragment>
			);
		}
		const inputs: string[] = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (
			<React.Fragment>
				Calculated by <b>{request.calcName}</b> calculator ({inputs.join(', ')}){` `}
				in {((request.perf.end-request.perf.start)/1000).toFixed(2)} seconds!
			</React.Fragment>
		);
	};

	return (
		<React.Fragment>
			{calcState === CalculatorState.Done && (
				<Message attached>
					<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
						<div>
							{tfmt('voyage.estimate.estimate_time', {
								time: <b>{formatTime(result.estimate.refills[0].result, t)}</b>
							})}
							{` `}
							{t('voyage.estimate.expected_range', {
								a: formatTime(result.estimate.refills[0].saferResult, t),
								b: formatTime(result.estimate.refills[0].moonshotResult, t)
							})}
							{analysis !== '' && (<div style={{ marginTop: '1em' }}>{analysis}</div>)}
						</div>
						<div>
							<Button.Group>
								{configSource === 'player' && voyageConfig.voyage_type === 'dilemma' &&
									<Popup position='top center'
										content={<>Track this recommendation</>}
										trigger={
											<Button icon onClick={() => trackResult(resultIndex, voyageConfig, request.bestShip.ship.symbol, result.estimate)} disabled={syncState === SyncState.ReadOnly}>
												<Icon name={iconTrack[trackState]} color={trackState === 1 ? 'green' : undefined} />
											</Button>
										}
									/>
								}
								<Popup position='top center'
									content={<>Get more confident estimate</>}
									trigger={
										<Button icon onClick={() => { if (confidenceState !== 1) estimateResult(resultIndex, voyageConfig, 30000); }}>
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
				{result.estimate.vpDetails && (
					<VPGraphAccordion voyageConfig={voyageConfig} estimate={result.estimate} />
				)}
				<VoyageStats
					configSource={configSource}
					voyageData={voyageConfig as Voyage}
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
					<CIVASMessage voyageConfig={voyageConfig} estimate={result.estimate} />
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
