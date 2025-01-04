import React from 'react';
import {
	Button,
	Checkbox,
	DropdownItemProps,
	Form,
	Header,
	Message,
	Select
} from 'semantic-ui-react';
import { Link } from 'gatsby';

import { IBestVoyageShip, IResultProposal, IVoyageCrew, IVoyageRequest, IVoyageResult } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime, BuffStatTable } from '../../../utils/voyageutils';

import CONFIG from '../../CONFIG';

import { CalculatorContext } from '../context';
import { getShipTraitBonus } from '../utils';
import { Helper } from '../helpers/Helper';
import { CalculatorState, CALCULATORS } from '../helpers/calchelpers';

import { CrewOptions } from './crewoptions';
import { ResultsGroup } from './resultsgroup';
import { UserPrefsContext } from './userprefs';

export const CalculatorForm = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const calculatorContext = React.useContext(CalculatorContext);
	const { configSource, voyageConfig } = calculatorContext;
	const userPrefs = React.useContext(UserPrefsContext);

	const [consideredCrew, setConsideredCrew] = React.useState<IVoyageCrew[]>([]);

	const [requests, setRequests] = React.useState<IVoyageRequest[]>([]);
	const [results, setResults] = React.useState<IVoyageResult[]>([]);

	const bestShip = React.useMemo(() => {
		let bestShip: IBestVoyageShip | undefined;
		const consideredShips: IBestVoyageShip[] = [];
		calculatorContext.ships.filter(ship => ship.owned).forEach(ship => {
			const shipBonus: number = getShipTraitBonus(voyageConfig, ship);
			const entry: IBestVoyageShip = {
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
				if (request.calcHelper?.calcState === CalculatorState.InProgress)
					request.calcHelper.abort();
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
			<ResultsGroup requests={requests} setRequests={setRequests} results={results} setResults={setResults} />
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
				const requestId: string = 'request-' + Date.now();
				const calcHelper: Helper = helper.helper(helperConfig);
				const request: IVoyageRequest = {
					id: requestId,
					type: 'calculation',
					voyageConfig,
					bestShip,
					calcHelper
				};
				requests.push(request);
				results.push({
					id: requestId,
					requestId,
					name: 'Calculating...',
					calcState: CalculatorState.InProgress
				});
				calcHelper.start(requestId);
			}
		});
		setRequests([...requests]);
		setResults([...results]);
		scrollToAnchor();
	}

	function handleResults(requestId: string, reqResults: IResultProposal[], calcState: number): void {
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
						result.proposal = reqResult;
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
					proposal: reqResult
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

	function sendCalcResultTelemetry(result: IResultProposal, requestId: string): void {
		if (!result) return;

		const request = requests.find(r => r.id === requestId);
		if (!request) return;
		if (!request.calcHelper) return;

		if (configSource !== 'player') return;
		if (voyageConfig.voyage_type !== 'dilemma') return;
		if (request.calcHelper.calcOptions.strategy === 'peak-antimatter') return;

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
			calculator: request.calcHelper.calculator,
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
