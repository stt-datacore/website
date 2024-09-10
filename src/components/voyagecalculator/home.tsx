import React from 'react';
import {
	Button,
	Header
} from 'semantic-ui-react';

import { GameEvent, Voyage, VoyageDescription } from '../../model/player';
import { Ship } from '../../model/ship';
import { ITrackedVoyage, IVoyageCrew, IVoyageEventContent, IVoyageHistory, IVoyageInputConfig } from '../../model/voyage';
import { IEventData } from '../eventplanner/model';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { getEventData, getRecentEvents } from '../../utils/events';
import { useStateWithStorage } from '../../utils/storage';

import { ICalculatorContext, CalculatorContext } from './context';
import { Calculator } from './calculator';
import { CIVASMessage } from './civas';
import { ConfigCard } from './configcard';
import { ConfigEditor } from './configeditor';
import { rosterizeMyCrew, RosterPicker } from './rosterpicker';
import { VoyageStats } from './voyagestats';

import { HistoryContext, IHistoryContext } from '../voyagehistory/context';
import { CrewTable } from '../voyagehistory/crewtable';
import { VoyagesTable } from '../voyagehistory/voyagestable';
import { DataManagement } from '../voyagehistory/manage';
import { createCheckpoint, defaultHistory, NEW_VOYAGE_ID } from '../voyagehistory/utils';

export const VoyageHome = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	return (
		<React.Fragment>
			{!playerData && <NonPlayerHome />}
			{playerData && <PlayerHome dbid={`${playerData.player.dbid}`} />}
		</React.Fragment>
	);
};

const NonPlayerHome = () => {
	const globalContext = React.useContext(GlobalContext);

	const [voyageConfig, setVoyageConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);
	const [eventData, setEventData] = React.useState<IEventData[]>([]);

	React.useEffect(() => {
		getEvents();
	}, []);

	if (voyageConfig) {
		// Calculator requires prime skills
		if (voyageConfig.skills.primary_skill !== '' && voyageConfig.skills.secondary_skill !== '') {
			const historyContext: IHistoryContext = {
				history: defaultHistory,
				setHistory: () => {}
			};

			return (
				<HistoryContext.Provider value={historyContext}>
					<React.Fragment>
						<ConfigCard
							configSource='custom'
							voyageConfig={voyageConfig}
							renderToggle={renderCancelButton}
						/>
						<CalculatorSetup
							configSource='custom'
							voyageConfig={voyageConfig}
							eventData={eventData}
						/>
					</React.Fragment>
				</HistoryContext.Provider>
			);
		}
	}

	return (
		<React.Fragment>
			<Header as='h3'>
				No Voyage Configuration Available
			</Header>
			<p>Import your player data to help tailor this tool to your current voyage and roster. Otherwise, you can manually create a voyage and view the best crew in the game for any possible configuration.</p>
			<ConfigEditor voyageConfig={voyageConfig} updateConfig={setVoyageConfig} />
		</React.Fragment>
	);

	function getEvents(): void {
		// Guess event from autosynced events
		getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, globalContext.core.ship_schematics.map(m => m.ship)).then(recentEvents => {
			setEventData([...recentEvents]);
		});
	}

	function renderCancelButton(): JSX.Element {
		return (
			<Button
				size='large'
				icon='backward'
				content='Back'
				onClick={() => setVoyageConfig(undefined)}
			/>
		);
	}
};

interface IVoyageView {
	source: 'player' | 'custom';
	config: IVoyageInputConfig;
};

type PlayerHomeProps = {
	dbid: string;
};

const PlayerHome = (props: PlayerHomeProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(
		props.dbid+'/voyage/history',
		defaultHistory,
		{
			rememberForever: true,
			compress: true,
			onInitialize: () => setHistoryReady(true)
		}
	);
	const [historyReady, setHistoryReady] = React.useState<boolean>(false);
	const [eventData, setEventData] = React.useState<IEventData[]>([]);
	const [playerConfigs, setPlayerConfigs] = React.useState<IVoyageInputConfig[]>([]);
	const [customConfig, setCustomConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);
	const [activeView, setActiveView] = React.useState<IVoyageView | undefined>(undefined);

	React.useEffect(() => {
		if (!playerData) return;
		getEvents();
		getPlayerConfigs();
	}, [playerData]);

	if (!historyReady)
		return <></>;

	const historyContext: IHistoryContext = {
		history,
		setHistory
	};

	return (
		<HistoryContext.Provider value={historyContext}>
			<React.Fragment>
				{!activeView && renderVoyagePicker()}
				{activeView && renderActiveView()}
			</React.Fragment>
		</HistoryContext.Provider>
	);

	function getEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents: IEventData[] = ephemeral.events.map(ev => getEventData(ev, globalContext.core.crew))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setEventData([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, globalContext.core.ship_schematics.map(m => m.ship)).then(recentEvents => {
				setEventData([...recentEvents]);
			});
		}
	}

	function getPlayerConfigs(): void {
		const playerConfigs: IVoyageInputConfig[] = [];
		const runningVoyageIds: number[] = [];

		// Always include dilemma voyage
		const dilemmaConfig: Voyage | VoyageDescription | undefined = getPlayerConfigByType('dilemma');
		if (dilemmaConfig) {
			playerConfigs.push(dilemmaConfig as IVoyageInputConfig);
			if (dilemmaConfig.id > NEW_VOYAGE_ID) runningVoyageIds.push(dilemmaConfig.id);

			// Make a copy of dilemma config to use as default custom config
			const customConfig: IVoyageInputConfig = JSON.parse(JSON.stringify(dilemmaConfig));
			setCustomConfig(customConfig);
		}

		// Only include event voyage config when voyage event phase is ongoing
		const voyagePhase: GameEvent | undefined = ephemeral?.events?.find(ev =>
			ev.content.content_type === 'voyage'
				&& ev.seconds_to_start === 0
				&& ev.seconds_to_end > 0
		);
		if (voyagePhase) {
			const voyageEventContent: IVoyageEventContent = voyagePhase.content as IVoyageEventContent;
			// Use voyage_symbol to match voyage and event, in case voyage events expand in the future
			const eventConfig: Voyage | VoyageDescription | undefined = getPlayerConfigByType(voyageEventContent.voyage_symbol.replace('_voyage', ''));
			if (eventConfig) {
				// Rewrite config from event info
				eventConfig.skills = {
					primary_skill: voyageEventContent.primary_skill,
					secondary_skill: voyageEventContent.secondary_skill,
				};
				eventConfig.ship_trait = '';
				eventConfig.crew_slots.forEach(slot => { slot.trait = ''; });
				playerConfigs.push({...eventConfig, event_content: voyageEventContent} as IVoyageInputConfig);
				if (eventConfig.id > NEW_VOYAGE_ID) runningVoyageIds.push(eventConfig.id);
			}
		}

		setPlayerConfigs([...playerConfigs]);

		// Reconcile running voyages with tracked voyages
		runningVoyageIds.forEach(voyageId => reconcileVoyage(voyageId));

		// Bypass home if only 1 pending voyage
		setActiveView(playerConfigs.length === 1 && runningVoyageIds.length === 0 ?
			{ source: 'player', config: playerConfigs[0] } : undefined
		);
	}

	function getPlayerConfigByType(voyageType: string): Voyage | VoyageDescription | undefined {
		if (ephemeral) {
			const { voyage, voyageDescriptions } = ephemeral;

			// Config is full voyage data for running voyage
			const running: Voyage | undefined = voyage.find(v => v.voyage_type === voyageType);
			if (running) {
				return running;
			}
			// Otherwise config is description for pending voyage
			else {
				const pending: VoyageDescription | undefined = voyageDescriptions.find(description => description.voyage_type === voyageType);
				if (pending) {
					// Rewrite pending voyage ids to 0 for consistency (otherwise ids are voyage archetype ids)
					return {...pending, id: NEW_VOYAGE_ID};
				}
			}
		}
		return undefined;
	}

	function reconcileVoyage(voyageId: number): void {
		if (!history || history.voyages.length === 0)
			return;

		if (!ephemeral) return;

		const running: Voyage | undefined = ephemeral.voyage.find(voyage => voyage.id === voyageId);
		if (!running) return;

		const trackedVoyage: ITrackedVoyage | undefined = history.voyages.find(voyage => voyage.voyage_id === running.id);
		if (trackedVoyage) {
			const trackedId: number = trackedVoyage.tracker_id;
			createCheckpoint(running).then(checkpoint => {
				setHistory(history => {
					const trackedVoyage: ITrackedVoyage | undefined = history.voyages.find(voyage => voyage.tracker_id === trackedId);
					if (trackedVoyage) trackedVoyage.checkpoint = checkpoint;
					return history;
				});
			})
			.catch(e => console.log('reconcileExisting', e))
		}
		else {
			// Voyages don't get a proper voyageId until started in-game, so try to reconcile history
			//	by testing last tracked voyage against active voyage skills and ship_trait
			const lastTracked: ITrackedVoyage = history.voyages[history.voyages.length-1];
			// Active voyage doesn't match last tracked or already reconciled
			if (lastTracked.voyage_id > 0
				|| lastTracked.skills.primary_skill !== running.skills.primary_skill
				|| lastTracked.skills.secondary_skill !== running.skills.secondary_skill
				|| lastTracked.ship_trait !== running.ship_trait) {
				return;
			}
			const trackedId: number = lastTracked.tracker_id;
			createCheckpoint(running).then(checkpoint => {
				setHistory(history => {
					const trackedVoyage: ITrackedVoyage | undefined = history.voyages.find(voyage => voyage.tracker_id === trackedId);
					if (trackedVoyage) {
						trackedVoyage.voyage_id = running.id;
						trackedVoyage.created_at = Date.parse(running.created_at);
						trackedVoyage.ship = globalContext.core.ships.find(s => s.id === running.ship_id)?.symbol ?? lastTracked.ship;
						// If the lineup sent out doesn't match the tracked recommendation, maybe reconcile crew and max_hp here or show a warning?
						trackedVoyage.checkpoint = checkpoint;
					}
					return history;
				});
			})
			.catch(e => console.log('reconcileNew', e))
		}

		return;
	}

	function renderVoyagePicker(): JSX.Element {
		return (
			<React.Fragment>
				<Header as='h3'>Current Voyages</Header>
				{playerConfigs.map(voyageConfig => (
					<ConfigCard
						key={voyageConfig.voyage_type}
						configSource='player'
						voyageConfig={voyageConfig}
						renderToggle={() => renderViewButton(voyageConfig)}
					/>
				))}

				<Header as='h3'>Custom Voyage</Header>
				<p>You can manually create a voyage and view the best crew in the game for any possible configuration.</p>
				<ConfigEditor voyageConfig={customConfig} updateConfig={loadCustomConfig} />

				{history.voyages.length > 0 && (
					<React.Fragment>
						<VoyagesTable />
						<CrewTable />
						<DataManagement />
					</React.Fragment>
				)}
			</React.Fragment>
		);
	}

	function loadCustomConfig(voyageConfig: IVoyageInputConfig): void {
		setCustomConfig({...voyageConfig});
		// Calculator requires prime skills
		if (voyageConfig.skills.primary_skill !== '' && voyageConfig.skills.secondary_skill !== '') {
			setActiveView({
				source: 'custom',
				config: voyageConfig
			});
		}
	}

	function renderViewButton(voyageConfig: IVoyageInputConfig): JSX.Element {
		const running: Voyage | undefined = ephemeral?.voyage?.find(voyage => voyage.voyage_type === voyageConfig.voyage_type);
		return (
			<Button
				size='large'
				color='blue'
				icon={running ? 'rocket' : 'users'}
				content={running ? 'View running voyage' : 'View crew calculator'}
				onClick={() => setActiveView({ source: 'player', config: voyageConfig })}
			/>
		);
	}

	function renderActiveView(): JSX.Element {
		if (!activeView) return <></>;

		return (
			<React.Fragment>
				<ConfigCard
					configSource={activeView.source}
					voyageConfig={activeView.config}
					renderToggle={renderCancelButton}
				/>
				<PlayerVoyage
					configSource={activeView.source}
					voyageConfig={activeView.config}
					eventData={eventData}
				/>
			</React.Fragment>
		);
	}

	function renderCancelButton(): JSX.Element {
		return (
			<Button
				size='large'
				icon='backward'
				content='All voyages'
				onClick={() => setActiveView(undefined)}
			/>
		);
	}
};

type PlayerVoyageProps = {
	configSource: 'player' | 'custom';
	voyageConfig: IVoyageInputConfig;
	eventData: IEventData[];
};

const PlayerVoyage = (props: PlayerVoyageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { configSource, voyageConfig, eventData } = props;

	if (!playerData || !ephemeral)
		return <></>;

	const running: Voyage | undefined = ephemeral.voyage.find(voyage =>
		configSource === 'player' && voyage.voyage_type === voyageConfig.voyage_type
	);

	if (!running) {
		return (
			<CalculatorSetup
				key={configSource}
				configSource={configSource}
				voyageConfig={voyageConfig}
				eventData={eventData}
			/>
		);
	}

	const myCrew: IVoyageCrew[] = rosterizeMyCrew(playerData.player.character.crew, ephemeral.activeCrew, ephemeral.voyage);
	const ship: Ship | undefined = playerData.player.character.ships.find(s => s.id === running.ship_id);

	// Active details to pass independently to CIVAS
	const activeDetails = {
		created_at: running.created_at,
		log_index: running.log_index,
		hp: running.hp
	};

	return (
		<React.Fragment>
			<VoyageStats
				voyageData={running}
				ships={ship ? [ship] : []}
				showPanels={running.state === 'started' ? ['estimate'] : ['rewards']}
				playerItems={playerData.player.character.items}
				roster={myCrew}
				rosterType={'myCrew'}
				allCrew={globalContext.core.crew}
				allItems={globalContext.core.items}
				playerData={playerData}
			/>
			<CIVASMessage voyageConfig={running} activeDetails={activeDetails} />
			<CrewHoverStat targetGroup='voyageRewards_crew' />
			<ItemHoverStat targetGroup='voyageRewards_item' />
		</React.Fragment>
	);
};

type CalculatorSetupProps = {
	configSource: 'player' | 'custom';
	voyageConfig: IVoyageInputConfig;
	eventData: IEventData[];
};

const CalculatorSetup = (props: CalculatorSetupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { configSource, voyageConfig, eventData } = props;

	const [rosterType, setRosterType] = React.useState<'myCrew' | 'allCrew'>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IVoyageCrew[]>([]);
	const [rosterShips, setRosterShips] = React.useState<Ship[]>([]);

	const calculatorContext: ICalculatorContext = {
		configSource,
		voyageConfig,
		rosterType,
		crew: rosterCrew,
		ships: rosterShips,
		events: eventData
	};

	return (
		<React.Fragment>
			<CrewHoverStat targetGroup='voyageLineup' />
			<RosterPicker
				configSource={configSource}
				rosterType={rosterType} setRosterType={setRosterType}
				setRosterCrew={setRosterCrew}
				setRosterShips={setRosterShips}
			/>
			<CalculatorContext.Provider value={calculatorContext}>
				<Calculator />
			</CalculatorContext.Provider>
		</React.Fragment>
	);
};
