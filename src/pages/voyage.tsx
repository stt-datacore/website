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

const VoyagePage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [activeVoyageId, setActiveVoyageId] = React.useState(0);
	const [showCalculator, setShowCalculator] = React.useState(false);
			
	React.useEffect(() => {
		const activeVoyageId = ephemeral?.voyage?.length ? ephemeral.voyage[0].id : 0;
		setActiveVoyageId(activeVoyageId);
		setShowCalculator(activeVoyageId === 0);
	}, [playerData, ephemeral]);

	return (
		<DataPageLayout
			pageTitle='Voyage Calculator'
			pageDescription='Find the best crew for your voyage and get estimates on how long it will run.'
			playerPromptType='recommend'
			demands={['collections', 'event_instances']}
		>
			<React.Fragment>
				<CrewHoverStat targetGroup='voyageLineup' />

				{playerData && ephemeral &&
					<PlayerActiveVoyage
						key={`${playerData.player.dbid}`}
						dbid={`${playerData.player.dbid}`}
						activeVoyageId={activeVoyageId}
						showCalculator={showCalculator}
						setShowCalculator={setShowCalculator}
					/>
				}
				{showCalculator &&
					<VoyageCalculator activeVoyageId={activeVoyageId} />
				}
			</React.Fragment>
		</DataPageLayout>
	);
};

type PlayerActiveVoyageProps = {
	dbid: string;
	activeVoyageId: number;
	showCalculator: boolean;
	setShowCalculator: (showCalculator: boolean) => void;
};

const PlayerActiveVoyage = (props: PlayerActiveVoyageProps) => {
	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true, onInitialize: () => setHistoryReady(true) } );
	const [historyReady, setHistoryReady] = React.useState(false);
	const [telemetryOptIn, setTelemetryOptIn] = useStateWithStorage(props.dbid+'/voyage/telemetryOptIn', false, { rememberForever: true });

	const actionButtons = [
		<Button key='toggler'
			style={{margin:"0.25em"}}
			content={!props.showCalculator ? 'View crew calculator' : 'View active voyage'}
			icon='exchange'
			size='large'
			onClick={()=> props.setShowCalculator(props.showCalculator ? false : true)}
		/>
	] as JSX.Element[];
	if (history.voyages.length > 0) {
		actionButtons.unshift(
			<Button key='history'
				style={{margin:"0.25em"}}
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

type VoyageCalculatorProps = {
	activeVoyageId: number;
}

const VoyageCalculator = (props: VoyageCalculatorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [voyageConfig, setVoyageConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);
	const [rosterType, setRosterType] = React.useState(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IVoyageCrew[] | undefined>(undefined);
	const [rosterShips, setRosterShips] = React.useState<Ship[] | undefined>(undefined);
	const [activeEvents, setActiveEvents] = React.useState<IEventData[] | undefined>(undefined);

	React.useEffect(() => {
		getDefaultConfig();
		getEvents();
	}, [playerData, ephemeral]);

	const calculatorContext = {
		rosterType,
		crew: rosterCrew,
		ships: rosterShips,
		events: activeEvents,
		activeVoyageId: props.activeVoyageId
	} as ICalculatorContext;

	return (
		<React.Fragment>
			<RosterPicker
				rosterType={rosterType} setRosterType={setRosterType}
				setRosterCrew={setRosterCrew}
				setRosterShips={setRosterShips}
			/>
			<CalculatorContext.Provider value={calculatorContext}>
				{rosterCrew && <ConfigInput key={rosterType} voyageConfig={voyageConfig} />}
			</CalculatorContext.Provider>
		</React.Fragment>
	);

	function getDefaultConfig(): void {
		if (playerData && ephemeral) {
			const { voyage, voyageDescriptions } = ephemeral;
			const voyageData = { voyage, voyage_descriptions: voyageDescriptions };
			if (voyageData.voyage_descriptions) {
				// Voyage started, config will be full voyage data
				if (voyageData.voyage && voyageData.voyage.length > 0) {
					setVoyageConfig(voyageData.voyage[0]);
				}
				// Voyage awaiting input, config will be input parameters only
				else {
					setVoyageConfig(voyageData.voyage_descriptions[0]);
				}
			}
		}
		// If voyageData not found, initial config will be blank voyage
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
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances).then(recentEvents => {
				setActiveEvents([...recentEvents]);
			});
		}
	}
};

export default VoyagePage;
