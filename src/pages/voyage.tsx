import React from 'react';

import { IEventData } from '../model/events';
import { Ship } from '../model/ship';
import { IVoyageInputConfig, IVoyageCrew } from '../model/voyage';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { getRecentEvents, getEventData } from '../utils/events';

import { ICalculatorContext, CalculatorContext } from '../components/voyagecalculator/context';
import { ActiveVoyage } from '../components/voyagecalculator/activevoyage';
import { RosterPicker } from '../components/voyagecalculator/rosterpicker';
import { ConfigInput } from '../components/voyagecalculator/configinput';

const VoyagePage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [activeVoyageId, setActiveVoyageId] = React.useState(0);
	const [showCalculator, setShowCalculator] = React.useState(false);

	React.useEffect(() => {
		const activeVoyageId = ephemeral?.voyage?.length ? ephemeral.voyage[0].id : 0;
		setActiveVoyageId(activeVoyageId);
		setShowCalculator(activeVoyageId === 0);
	}, [playerData]);

	return (
		<DataPageLayout
			pageTitle='Voyage Calculator'
			pageDescription='Find the best crew for your voyage and get estimates on how long it will run.'
			playerPromptType='recommend'
			demands={['collections']}
		>
			<React.Fragment>
				{activeVoyageId > 0 &&
					<ActiveVoyage
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
		setRosterType(playerData ? 'myCrew' : 'allCrew');
		getEvents();
	}, [playerData]);

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
			getRecentEvents(globalContext.core.crew).then(recentEvents => {
				setActiveEvents([...recentEvents]);
			});
		}
	}
};

export default VoyagePage;
