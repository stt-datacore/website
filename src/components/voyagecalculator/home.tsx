import React from 'react';
import {
	Button,
	Header,
	Loader
} from 'semantic-ui-react';

import { GameEvent, Voyage, VoyageDescription } from '../../model/player';
import { Ship } from '../../model/ship';
import { ITrackedVoyage, IVoyageCrew, IVoyageEventContent, IVoyageHistory, IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { getEventData, getRecentEvents, guessEncounterTimes } from '../../utils/events';
import { useStateWithStorage } from '../../utils/storage';

import { IEventData } from '../eventplanner/model';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { HistoryContext, IHistoryContext } from '../voyagehistory/context';
import { HistoryHome } from '../voyagehistory/historyhome';
import { HistoryMessage } from '../voyagehistory/message';
import { createCheckpoint, defaultHistory, getTrackedData, InitState, mergeHistories, NEW_VOYAGE_ID, postVoyage, SyncState, updateVoyageInHistory } from '../voyagehistory/utils';

import { ICalculatorContext, CalculatorContext } from './context';
import { CIVASMessage } from './civas';
import { ConfigCard } from './configcard';
import { ConfigEditor } from './configeditor';
import { rosterizeMyCrew, RosterPicker } from './rosterpicker';
import { DEFAULT_ENCOUNTER_TRAITS } from './utils';
import { Calculator } from './calculator/calc_main';
import { EncounterHelperAccordion } from './encounters/encounterhelper/encounterhelper';
import { LineupViewerAccordion } from './lineupviewer/lineup_accordion';
import { StatsRewardsAccordion } from './rewards/rewards_accordion';
import { SkillCheckAccordion } from './skillcheck/accordion';
import { VoyageStatsAccordion } from './stats/stats_accordion';
import { refShips } from '../../utils/shiputils';

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
	const { all_ships } = globalContext.core;
	const { t } = globalContext.localized;

	const [voyageConfig, setVoyageConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);
	const [eventData, setEventData] = React.useState<IEventData[]>([]);

	React.useEffect(() => {
		getEvents();
	}, []);

	if (voyageConfig) {
		// Calculator requires prime skills
		if (voyageConfig.skills.primary_skill !== '' && voyageConfig.skills.secondary_skill !== '') {
			const historyContext: IHistoryContext = {
				dbid: '',
				history: defaultHistory,
				setHistory: () => {},
				syncState: SyncState.ReadOnly,
				messageId: '',
				setMessageId: () => {}
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
							runningShipIds={[]}
						/>
					</React.Fragment>
				</HistoryContext.Provider>
			);
		}
	}

	return (
		<React.Fragment>
			<Header	/* No Voyage Configuration Available */
				as='h3'
			>
				{t('voyage.nonplayer.title')}
			</Header>
			<p>{t('voyage.nonplayer.description')}</p>
			<ConfigEditor presetConfigs={[]} updateConfig={setVoyageConfig} />
		</React.Fragment>
	);

	function getEvents(): void {
		// Guess event from autosynced events
		getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, refShips(all_ships)).then(recentEvents => {
			setEventData([...recentEvents]);
		});
	}

	function renderCancelButton(): JSX.Element {
		return (
			<Button	/* All Voyages */
				size='large'
				icon='backward'
				content={t('voyage.voyages.all')}
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
	const { playerData, ephemeral, playerShips } = globalContext.player;
	const { t } = globalContext.localized;
	const { all_ships } = globalContext.core;
	const { TRAIT_NAMES } = globalContext.localized.english;
	const { dbid } = props;

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(
		dbid+'/voyage/history',
		defaultHistory,
		{
			rememberForever: true,
			compress: true,
			onInitialize: () => setHistoryInitState(prev => prev + 1)
		}
	);
	const [postRemote, internalSetPostRemote] = useStateWithStorage<boolean>(
		dbid+'/voyage/postRemote',
		false,
		{
			rememberForever: true,
			onInitialize: () => setHistoryInitState(prev => prev + 1)
		}
	);
	const [historyInitState, setHistoryInitState] = React.useState<InitState>(InitState.Initializing);
	const [historySyncState, setHistorySyncState] = React.useState<SyncState>(SyncState.ReadOnly);
	const [historyMessageId, setHistoryMessageId] = React.useState<string>('');

	const [eventData, setEventData] = React.useState<IEventData[]>([]);
	const [playerConfigs, setPlayerConfigs] = React.useState<IVoyageInputConfig[]>([]);
	const [upcomingConfigs, setUpcomingConfigs] = React.useState<IVoyageInputConfig[]>([]);
	const [runningVoyageIds, setRunningVoyageIds] = React.useState<number[]>([]);
	const [runningShipIds, setRunningShipIds] = React.useState<number[]>([]);

	const [activeView, setActiveView] = React.useState<IVoyageView | undefined>(undefined);

	React.useEffect(() => {
		if (!playerData) return;
		getEvents();
		getPlayerConfigs();
		// Queue history for re-sync, if history already initialized
		if (historyInitState === InitState.Initialized)
			setHistoryInitState(InitState.VarsLoaded);
	}, [playerData]);

	React.useEffect(() => {
		if (historyInitState === InitState.VarsLoaded) {
			if (postRemote) {
				getTrackedData(dbid).then(async (remoteHistory) => {
					if (!!remoteHistory) setHistory(mergeHistories(history, remoteHistory));
					setHistorySyncState(SyncState.RemoteReady);
					setHistoryInitState(InitState.HistoryLoaded);
				}).catch(e => {
					setHistorySyncState(SyncState.ReadOnly);
					setHistoryInitState(InitState.Initialized);
					setHistoryMessageId('voyage.history_msg.read_only');
					console.log(e);
				});
			}
			else {
				setHistorySyncState(SyncState.LocalOnly);
				setHistoryInitState(InitState.HistoryLoaded);
			}
		}
		else if (historyInitState === InitState.HistoryLoaded) {
			setHistoryInitState(InitState.Reconciling);
			Promise.all(
				runningVoyageIds.map(voyageId => reconcileVoyage(voyageId))
			).finally(() => {
				setHistoryInitState(InitState.Initialized);
			});
		}
	}, [historyInitState]);

	// Only show throbber if no existing active view
	if (!activeView && historyInitState < InitState.Initialized)
		return <Loader active inline='centered' content={t('voyage.loading_voyage_tool_ellipses')} />;

	const historyContext: IHistoryContext = {
		dbid,
		history,
		setHistory,
		syncState: historySyncState,
		messageId: historyMessageId,
		setMessageId: setHistoryMessageId
	};

	return (
		<HistoryContext.Provider value={historyContext}>
			<React.Fragment>
				<CrewHoverStat targetGroup='voyageLineupHover' />
				<ItemHoverStat targetGroup='voyage_prospect_summary' />

				<HistoryMessage />
				{!activeView && renderVoyagePicker()}
				{activeView && renderActiveView()}
			</React.Fragment>
		</HistoryContext.Provider>
	);

	function setPostRemote(value: boolean) {
		internalSetPostRemote(value);
		setHistoryInitState(InitState.VarsLoaded);
	}

	function getEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents: IEventData[] = ephemeral.events.map(ev => getEventData(ev, globalContext.core.crew, playerShips))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setEventData([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances, refShips(all_ships)).then(recentEvents => {
				setEventData([...recentEvents]);
			});
		}
	}

	function getPlayerConfigs(): void {
		const playerConfigs: IVoyageInputConfig[] = [];
		const upcomingConfigs: IVoyageInputConfig[] = [];
		const runningVoyageIds: number[] = [];
		const runningShipIds: number[] = [];

		// Always include dilemma voyage
		const dilemmaConfig: Voyage | VoyageDescription | undefined = getPlayerConfigByType('dilemma');
		if (dilemmaConfig) {
			playerConfigs.push(dilemmaConfig as IVoyageInputConfig);
			if (dilemmaConfig.id > NEW_VOYAGE_ID) {
				runningVoyageIds.push(dilemmaConfig.id);
				if ('ship_id' in dilemmaConfig) runningShipIds.push(dilemmaConfig.ship_id);
			}
		}

		// Look for voyage events
		const voyageEvents: GameEvent[] = ephemeral?.events?.filter(ev => ev.content.content_type === 'voyage') ?? [];
		voyageEvents.forEach(voyageEvent => {
			const voyageEventContent: IVoyageEventContent = voyageEvent.content as IVoyageEventContent;
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

				// Add encounter traits to voyage event content
				voyageEventContent.encounter_traits = DEFAULT_ENCOUNTER_TRAITS; //guessEncounterTraits(voyageEvent, TRAIT_NAMES);
				voyageEventContent.encounter_times = guessEncounterTimes(voyageEvent, 'minutes');
				// Include as a player config when voyage event phase is ongoing
				if (voyageEvent.seconds_to_start === 0 && voyageEvent.seconds_to_end > 0) {
					playerConfigs.push({...eventConfig, event_content: voyageEventContent} as IVoyageInputConfig);
					if (eventConfig.id > NEW_VOYAGE_ID) {
						runningVoyageIds.push(eventConfig.id);
						if ('ship_id' in eventConfig) runningShipIds.push(eventConfig.ship_id);
					}
				}
				// Otherwise include as an upcoming (custom) config
				else {
					upcomingConfigs.push({...eventConfig, event_content: voyageEventContent} as IVoyageInputConfig);
				}
			}
		});

		setPlayerConfigs([...playerConfigs]);
		setUpcomingConfigs([...upcomingConfigs]);

		// Queue running voyages for reconciliation with tracked voyages
		setRunningVoyageIds([...runningVoyageIds]);

		// Calculator should account for ships on already running voyages
		setRunningShipIds([...runningShipIds]);

		// Bypass home if only 1 voyage
		setActiveView(playerConfigs.length === 1 ?
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

	async function reconcileVoyage(voyageId: number): Promise<boolean> {
		if (history.voyages.length === 0)
			return true;

		const running: Voyage | undefined = ephemeral?.voyage.find(voyage => voyage.id === voyageId);
		if (!running) return true;

		// Found running voyage in history; add new checkpoint to history
		const trackedRunningVoyage: ITrackedVoyage | undefined = history.voyages.find(voyage => voyage.voyage_id === running.id);
		if (trackedRunningVoyage) {
			const updatedVoyage: ITrackedVoyage = JSON.parse(JSON.stringify(trackedRunningVoyage));
			updatedVoyage.lootcrew = running.pending_rewards.loot.filter(f => f.type === 1).map(m => m.symbol);

			return createCheckpoint(running).then(checkpoint => {
				if (historySyncState === SyncState.RemoteReady) {
					return postVoyage(dbid, {...updatedVoyage, checkpoint}).then(result => {
						if ((!result.status || result.status < 300) && result.trackerId && result.inputId === updatedVoyage.tracker_id) {
							setHistory(history => {
								updateVoyageInHistory(history, {...updatedVoyage, checkpoint});
								return history;
							});
							return true;
						}
						else {
							throw('Failed reconciling running voyage -> postRemoteVoyage');
						}
					});
				}
				else if (historySyncState === SyncState.LocalOnly) {
					setHistory(history => {
						updateVoyageInHistory(history, {...updatedVoyage, checkpoint});
						return history;
					});
					return true;
				}
				else {
					throw(`Failed reconciling running voyage (invalid syncState: ${historySyncState})`);
				}
			}).catch(e => {
				setHistoryMessageId('voyage.history_msg.failed_to_update');
				console.log(e);
				return false;
			});
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
				return true;
			}
			return createCheckpoint(running).then(checkpoint => {
				const updatedVoyage: ITrackedVoyage = JSON.parse(JSON.stringify(lastTracked));
				updatedVoyage.voyage_id = running.id;
				updatedVoyage.created_at = Date.parse(running.created_at);
				updatedVoyage.ship = globalContext.core.ships.find(s => s.id === running.ship_id)?.symbol ?? lastTracked.ship;
				updatedVoyage.lootcrew = running.pending_rewards.loot.filter(f => f.type === 1).map(m => m.symbol);
				// If the lineup sent out doesn't match the tracked recommendation, maybe reconcile crew and max_hp here or show a warning?
				if (historySyncState === SyncState.RemoteReady) {
					return postVoyage(dbid, {...updatedVoyage, checkpoint}).then(result => {
						if (result.status < 300 && result.trackerId && result.inputId === updatedVoyage.tracker_id) {
							setHistory(history => {
								updateVoyageInHistory(history, {...updatedVoyage, checkpoint});
								return history;
							});
							return true;
						}
						else {
							throw('Failed reconciling last tracked voyage -> postRemoteVoyage');
						}
					});
				}
				else if (historySyncState === SyncState.LocalOnly) {
					setHistory(history => {
						updateVoyageInHistory(history, {...updatedVoyage, checkpoint});
						return history;
					});
					return true;
				}
				else {
					throw(`Failed reconciling last tracked voyage (invalid syncState: ${historySyncState})`);
				}
			}).catch(e => {
				setHistoryMessageId('voyage.history_msg.failed_to_update');
				console.log(e);
				return false;
			});
		}
	}

	function renderVoyagePicker(): JSX.Element {
		return (
			<React.Fragment>
				<Header	/* Current Voyages */
					as='h3'
				>
					{t('voyage.voyages.current')}
				</Header>
				{playerConfigs.map(voyageConfig => (
					<ConfigCard
						key={voyageConfig.voyage_type}
						configSource='player'
						voyageConfig={voyageConfig}
						renderToggle={() => renderViewButton(voyageConfig)}
					/>
				))}

				{upcomingConfigs.length > 0 && (
					<React.Fragment>
						<Header	/* Upcoming Voyages */
							as='h3'
						>
							{t('voyage.voyages.upcoming')}
						</Header>
						{upcomingConfigs.map(voyageConfig => (
							<ConfigCard
								key={voyageConfig.voyage_type}
								configSource='custom'
								voyageConfig={voyageConfig}
								renderToggle={() => renderViewButton(voyageConfig, 'custom')}
							/>
						))}
					</React.Fragment>
				)}

				<Header	/* Custom Voyages */
					as='h3'
				>
					{t('voyage.custom_voyage')}
				</Header>
				<p>{t('voyage.custom_voyage_description')}</p>
				<ConfigEditor
					presetConfigs={playerConfigs.concat(upcomingConfigs)}
					updateConfig={loadCustomConfig}
				/>

				<Header	/* Voyage History */
					as='h3'
				>
					{t('voyage.history.title')}
				</Header>
				<p>{t('voyage.history.description')}</p>
				<HistoryHome
					postRemote={postRemote}
					setPostRemote={setPostRemote}
					setSyncState={setHistorySyncState}
				/>
			</React.Fragment>
		);
	}

	function loadCustomConfig(voyageConfig: IVoyageInputConfig): void {
		// Calculator requires prime skills
		if (voyageConfig.skills.primary_skill !== '' && voyageConfig.skills.secondary_skill !== '') {
			setActiveView({
				source: 'custom',
				config: voyageConfig
			});
		}
	}

	function renderViewButton(voyageConfig: IVoyageInputConfig, configSource: 'player' | 'custom' = 'player'): JSX.Element {
		const runningVoyage: Voyage | undefined = ephemeral?.voyage?.find(voyage => voyage.voyage_type === voyageConfig.voyage_type);
		return (
			<Button	/* View running voyage OR View crew calculator */
				size='large'
				color='blue'
				icon={runningVoyage ? 'rocket' : 'users'}
				content={runningVoyage ? t('voyage.view.active_voyage') : t('voyage.view.crew_calculator')}
				onClick={() => setActiveView({ source: configSource, config: voyageConfig })}
			/>
		);
	}

	function renderActiveView(): JSX.Element {
		if (!activeView) return <></>;

		const runningVoyage: Voyage | undefined = ephemeral?.voyage.find(voyage =>
			activeView.source === 'player' && voyage.voyage_type === activeView.config.voyage_type
		);
		// Attach voyage event data, if available
		if (runningVoyage?.voyage_type === 'encounter') {
			const activeVoyageEvent: IEventData | undefined = eventData.find(evt =>
				evt.content_types.includes('voyage') && evt.seconds_to_start === 0 && evt.seconds_to_end > 0
			);
			if (activeVoyageEvent) runningVoyage.event_content = activeVoyageEvent.activeContent as IVoyageEventContent;
		}

		return (
			<React.Fragment>
				<ConfigCard
					configSource={activeView.source}
					voyageConfig={activeView.config}
					renderToggle={renderCancelButton}
				/>
				{!runningVoyage && (
					<CalculatorSetup
						key={activeView.source}
						configSource={activeView.source}
						voyageConfig={activeView.config}
						eventData={eventData}
						runningShipIds={runningShipIds}
					/>
				)}
				{runningVoyage && (
					<RunningVoyage
						voyage={runningVoyage}
					/>
				)}
			</React.Fragment>
		);
	}

	function renderCancelButton(): JSX.Element {
		return (
			<Button	/* All Voyages */
				size='large'
				icon='backward'
				content={t('voyage.voyages.all')}
				onClick={() => setActiveView(undefined)}
			/>
		);
	}
};

type RunningVoyageProps = {
	voyage: Voyage;
};

const RunningVoyage = (props: RunningVoyageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { voyage } = props;

	const [highlightedSkills, setHighlightedSkills] = React.useState<string[]>([]);

	// Memoize this since we're adding a hook, above.
	const myCrew: IVoyageCrew[] = React.useMemo<IVoyageCrew[]>(() => {
		if (!playerData || !ephemeral) return [];
		return rosterizeMyCrew(playerData.player.character.crew, ephemeral.activeCrew, ephemeral.voyage);
	}, [playerData, ephemeral?.activeCrew, ephemeral?.voyage]);

	if (!playerData || !ephemeral)
		return <></>;

	const ship: Ship | undefined = playerData.player.character.ships.find(s => s.id === voyage.ship_id);

	// Active details to pass independently to CIVAS
	const activeDetails = {
		created_at: voyage.created_at,
		log_index: voyage.log_index,
		hp: voyage.hp
	};

	const recalled: boolean = voyage.state === 'recalled';

	return (
		<React.Fragment>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
				<VoyageStatsAccordion
					voyageData={voyage}
					roster={myCrew}
					rosterType={'myCrew'}
					playerData={playerData}
					initialExpand={!recalled}
				/>
				<LineupViewerAccordion
					voyageConfig={voyage}
					ship={ship}
					roster={myCrew}
					rosterType={'myCrew'}
					highlightedSkills={highlightedSkills}
				/>
				<SkillCheckAccordion
					voyageConfig={voyage}
					roster={myCrew}
					highlightedSkills={highlightedSkills}
					setHighlightedSkills={setHighlightedSkills}
				/>
				<StatsRewardsAccordion
					voyage={voyage}
					roster={myCrew}
					initialExpand={recalled}
				/>
				{voyage.voyage_type === 'encounter' && (
					<EncounterHelperAccordion
						voyageConfig={voyage}
					/>
				)}
			</div>
			<CIVASMessage voyageConfig={voyage} activeDetails={activeDetails} />
			<CrewHoverStat targetGroup='voyageRewards_crew' />
			<ItemHoverStat targetGroup='voyageRewards_item' />
		</React.Fragment>
	);
};

type CalculatorSetupProps = {
	configSource: 'player' | 'custom';
	voyageConfig: IVoyageInputConfig;
	eventData: IEventData[];
	runningShipIds: number[];
};

const CalculatorSetup = (props: CalculatorSetupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { configSource, voyageConfig, eventData, runningShipIds } = props;

	const [rosterType, setRosterType] = React.useState<'myCrew' | 'allCrew'>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IVoyageCrew[]>([]);
	const [rosterShips, setRosterShips] = React.useState<Ship[]>([]);

	const calculatorContext: ICalculatorContext = {
		configSource,
		voyageConfig,
		rosterType,
		crew: rosterCrew,
		ships: rosterShips,
		events: eventData,
		runningShipIds
	};

	return (
		<React.Fragment>
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
