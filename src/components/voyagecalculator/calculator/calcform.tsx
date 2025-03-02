import React from 'react';
import {
	Button,
	DropdownItemProps,
	Form,
	Header,
	Select
} from 'semantic-ui-react';

import { IBestVoyageShip, IResultProposal, IVoyageCrew, IVoyageRequest, IVoyageResult } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';

import { CalculatorContext } from '../context';
import { getShipTraitBonus } from '../utils';
import { Helper, HelperProps } from '../helpers/Helper';
import { CalculatorState, CALCULATORS } from '../helpers/calchelpers';

import { CrewOptions } from './crewoptions';
import { ResultsGroup } from './resultsgroup';
import { sendCalcResultTelemetry, TelemetryOptions } from './telemetry';
import { UserPrefsContext } from './userprefs';

export const CalculatorForm = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData, buffConfig } = globalContext.player;
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

	return (
		<React.Fragment>
			<div ref={topAnchor} />
			{/* <BestShipCard voyageConfig={voyageConfig} bestShip={bestShip} /> */}
			<ResultsGroup requests={requests} setRequests={setRequests} results={results} setResults={setResults} />
			<div style={{ marginTop: '1em' }}>
				{requests.length > 0 && (
					<Header	/* Options */
						as='h3'
					>
						{t('global.options')}
					</Header>
				)}
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
					<Button fluid size='big' color='green' onClick={() => startCalculation()} disabled={!bestShip || consideredCrew.length < 12}>
						{t('global.recommend_crew')}
					</Button>
				</Form>
			</div>
			{configSource === 'player' && (
				<div style={{ marginTop: '2em' }}>
					<TelemetryOptions />
				</div>
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

		const helperConfig: HelperProps = {
			calcOptions: userPrefs.calcOptions,
			resultsCallback: handleCalcResults,
			errorCallback: handleCalcError
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
					consideredCrew,
					calcHelper
				};
				requests.push(request);
				results.push({
					id: request.id,
					requestId: request.id,
					name: t('spinners.calculating'),
					calcState: CalculatorState.InProgress
				});
				calcHelper.start(request);
			}
		});
		setRequests([...requests]);
		setResults([...results]);
		scrollToAnchor();
	}

	function handleCalcResults(requestId: string, calcResults: IResultProposal[], calcState: number): void {
		calcResults.forEach((calcResult, idx) => {
			// Update existing pane with results
			if (idx === 0) {
				setResults(prevResults => {
					const result: IVoyageResult | undefined = prevResults.find(r => r.id === requestId);
					if (result) {
						if (calcState === CalculatorState.Done) {
							result.name = formatTime(calcResult.estimate.refills[0].result, t);
							result.calcState = CalculatorState.Done;
						}
						result.proposal = calcResult;
					}
					return [...prevResults];
				});
				// Send telemetry pre-render (first recommendation only)
				if (userPrefs.telemetryOptIn && calcState === CalculatorState.Done) {
					if (configSource !== 'player' || !playerData) return;
					if (voyageConfig.voyage_type !== 'dilemma') return;

					const request: IVoyageRequest | undefined = requests.find(r => r.id === requestId);
					if (!request || !request.calcHelper) return;
					if (request.calcHelper.calcOptions.strategy === 'peak-antimatter') return;

					sendCalcResultTelemetry(
						voyageConfig, request.calcHelper.calculator, calcResult,
						globalContext.core.crew, playerData, buffConfig
					);
				}
			}
			// Add new panes if multiple results generated by this request
			else {
				setResults(prevResults => [...prevResults, {
					id: requestId+'-'+idx,
					requestId,
					name: formatTime(calcResult.estimate.refills[0].result, t),
					calcState: CalculatorState.Done,
					proposal: calcResult
				}]);
			}
		});
		if (calcState === CalculatorState.Done) scrollToAnchor();
	}

	function handleCalcError(requestId: string, errorMessage: string): void {
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
};
