import React from 'react';
import { navigate } from 'gatsby';
import { Button } from 'semantic-ui-react';

import { IEventData } from '../model/events';
import { Ship } from '../model/ship';
import { IVoyageInputConfig, IVoyageCrew, IVoyageHistory } from '../model/voyage';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { getRecentEvents, getEventData } from '../utils/events';
import { useStateWithStorage } from '../utils/storage';

import { ICalculatorContext, CalculatorContext } from '../components/voyagecalculator/context';
import { ActiveVoyage } from '../components/voyagecalculator/activevoyage';
import { RosterPicker } from '../components/voyagecalculator/rosterpicker';
import { ConfigInput } from '../components/voyagecalculator/configinput';

import { defaultHistory } from '../components/voyagehistory/utils';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';

const VOYAGE_DEBUGGING: boolean = true;

const VoyagePage = () => {
	return (
		<DataPageLayout
			pageTitle='Voyage Calculator'
			pageDescription='Find the best crew for your voyage and get estimates on how long it will run.'
			playerPromptType='recommend'
			demands={['collections', 'event_instances']}
		>
			<React.Fragment>
				<VoyageSetup />
			</React.Fragment>
		</DataPageLayout>
	);
};

const VoyageSetup = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [initialConfig, setInitialConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);
	const [activeVoyageId, setActiveVoyageId] = React.useState<number>(0);
	const [activeEvents, setActiveEvents] = React.useState<IEventData[]>([]);

	const [showCalculator, setShowCalculator] = React.useState<boolean>(false);

	React.useEffect(() => {
		getInitialConfig();
		getEvents();
	}, [playerData]);

	React.useEffect(() => {
		setShowCalculator(activeVoyageId === 0);
	}, [activeVoyageId]);

	// Still loading player data, don't render anything yet
	if (playerData && !initialConfig) return <></>;

	return (
		<React.Fragment>
			{playerData && (
				<ActiveVoyageSetup
					key={`${playerData.player.dbid}`}
					dbid={`${playerData.player.dbid}`}
					activeVoyageId={activeVoyageId}
					showCalculator={showCalculator}
					setShowCalculator={setShowCalculator}
				/>
			)}
			{showCalculator && (
				<CalculatorSetup
					initialConfig={initialConfig}
					activeVoyageId={activeVoyageId}
					activeEvents={activeEvents}
				/>
			)}
		</React.Fragment>
	);

	function getInitialConfig(): void {
		const printDebug = (): void => {
			if (!VOYAGE_DEBUGGING) return;
			console.log(debug.reduce((prev, curr) => prev + '\n\n' + curr, '***** VOYAGE PAGE *****'));
		};

		const debug: string[] = [];
		if (initialConfig)
			debug.push(`Existing config: ${initialConfig.skills.primary_skill}, ${initialConfig.skills.secondary_skill}, ${initialConfig.ship_trait}`);
		else
			debug.push('Existing config: None');

		// If voyageData not found, initial config will be blank voyage
		if (!playerData || !ephemeral) {
			debug.push('No player data found. Initial config will be blank voyage.');
			printDebug();
			setInitialConfig(undefined);
			setActiveVoyageId(0);
			return;
		}

		const { voyage, voyageDescriptions } = ephemeral;

		const newActiveVoyageId: number = ephemeral.voyage.length > 0 ? ephemeral.voyage[0].id : 0;

		let newVoyageConfig: IVoyageInputConfig | undefined;
		// Voyage started, config will be full voyage data
		if (voyage.length > 0) {
			debug.push('Voyage started. Initial config will be full voyage data.');
			debug.push(`Active voyage id: ${newActiveVoyageId}`);
			newVoyageConfig = voyage[0];
		}
		// Voyage awaiting input, config will be input parameters only
		else if (voyageDescriptions.length > 0) {
			debug.push('Voyage awaiting input. Initial config will be input parameters only.');
			newVoyageConfig = voyageDescriptions[0];
		}

		if (newVoyageConfig)
			debug.push(`New config: ${newVoyageConfig.skills.primary_skill}, ${newVoyageConfig.skills.secondary_skill}, ${newVoyageConfig.ship_trait}`);

		printDebug();

		if (newVoyageConfig) setInitialConfig({...newVoyageConfig});
		setActiveVoyageId(newActiveVoyageId);
	}

	function getEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setActiveEvents([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, globalContext.core.ship_schematics.map(m => m.ship)).then(recentEvents => {
				setActiveEvents([...recentEvents]);
			});
		}
	}
};

type ActiveVoyageSetupProps = {
	dbid: string;
	activeVoyageId: number;
	showCalculator: boolean;
	setShowCalculator: (showCalculator: boolean) => void;
};

const ActiveVoyageSetup = (props: ActiveVoyageSetupProps) => {
	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true, onInitialize: () => setHistoryReady(true) } );
	const [telemetryOptIn, setTelemetryOptIn] = useStateWithStorage(props.dbid+'/voyage/telemetryOptIn', false, { rememberForever: true });
	const [historyReady, setHistoryReady] = React.useState<boolean>(false);

	const actionButtons: JSX.Element[] = [
		<Button key='toggler'
			content={!props.showCalculator ? 'View crew calculator' : 'View active voyage'}
			icon='exchange'
			size='large'
			onClick={()=> props.setShowCalculator(props.showCalculator ? false : true)}
		/>
	];
	if (history.voyages.length > 0) {
		actionButtons.unshift(
			<Button key='history'
				content='View voyage history'
				icon='history'
				size='large'
				onClick={() => navigate('/voyagehistory')}
			/>
		);
	}

	return (
		<React.Fragment>
			{props.activeVoyageId > 0 &&
				<ActiveVoyage
					setTelemetryOptIn={setTelemetryOptIn}
					telemetryOptIn={telemetryOptIn}
					history={historyReady ? history : undefined}
					setHistory={setHistory}
					showDetails={!props.showCalculator}
					actionButtons={actionButtons}
				/>
			}
		</React.Fragment>
	);
};

type CalculatorSetupProps = {
	initialConfig: IVoyageInputConfig | undefined;
	activeVoyageId: number;
	activeEvents: IEventData[];
};

const CalculatorSetup = (props: CalculatorSetupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { initialConfig, activeVoyageId, activeEvents } = props;

	const [rosterType, setRosterType] = React.useState<'myCrew' | 'allCrew'>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IVoyageCrew[]>([]);
	const [rosterShips, setRosterShips] = React.useState<Ship[]>([]);

	const calculatorContext: ICalculatorContext = {
		rosterType,
		crew: rosterCrew,
		ships: rosterShips,
		events: activeEvents,
		activeVoyageId
	};

	return (
		<React.Fragment>
			<CrewHoverStat targetGroup='voyageLineup' />
			<RosterPicker
				rosterType={rosterType} setRosterType={setRosterType}
				setRosterCrew={setRosterCrew}
				setRosterShips={setRosterShips}
			/>
			<CalculatorContext.Provider value={calculatorContext}>
				<ConfigInput key={`${rosterType}_${activeVoyageId}`} voyageConfig={initialConfig} />
			</CalculatorContext.Provider>
		</React.Fragment>
	);
};

export default VoyagePage;
