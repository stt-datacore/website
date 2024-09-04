import React from 'react';
import { Card, Image, Button } from 'semantic-ui-react';

import { Voyage } from '../../model/player';
import { IVoyageCrew, IVoyageHistory, ITrackedCheckpoint } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import CONFIG from '../CONFIG';
import { formatTime } from '../../utils/voyageutils';

import { CIVASMessage } from './civas';
import { VoyageStats } from './voyagestats';
import { rosterizeMyCrew } from './rosterpicker';

import { getRuntime, estimateTrackedVoyage, createCheckpoint, addVoyageToHistory, addCrewToHistory } from '../../components/voyagehistory/utils';

type ActiveVoyageProps = {
	history?: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
	showDetails: boolean;
	actionButtons: JSX.Element[];
	voySymbol?: string;
};

export const ActiveVoyage = (props: ActiveVoyageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { SHIP_TRAIT_NAMES } = globalContext.localized;

	const { playerData, ephemeral } = globalContext.player;
	const { showDetails, actionButtons } = props;

	const voySymbol = props.voySymbol ?? 'test_voyage_1';

	const [myCrew, setMyCrew] = React.useState<IVoyageCrew[] | undefined>(undefined);

	React.useEffect(() => {
		if (!playerData || !ephemeral) return;
		const rosterCrew = rosterizeMyCrew(playerData.player.character.crew, ephemeral.activeCrew ?? []);
		setMyCrew([...rosterCrew]);
	}, [playerData]);

	if (!playerData || !ephemeral || ephemeral.voyage.length === 0)
		return (<></>);

	const voyageConfig = ephemeral.voyage.find(f => f.name === voySymbol) ?? ephemeral.voyage[0];

	const ship = playerData.player.character.ships.find(s => s.id === voyageConfig.ship_id);
	const shipIcon = ship?.icon ? `${ship.icon.file.slice(1).replace('/', '_')}.png` : '';

	let header = '';
	if (voyageConfig.ship_name) header = voyageConfig.ship_name;
	if (ship?.name && header !== '') header += ` (${ship.name})`
	else if (ship?.name) header = ship.name;

	const msgTypes = {
		started: 'voyage.calc.msg_type.started',
		failed: 'voyage.calc.msg_type.failed',
		recalled: 'voyage.calc.msg_type.recalled', // voyage.calc.msg_type.ran_for
		completed: 'voyage.calc.msg_type.completed' // voyage.calc.msg_type.ran_for
	};

	// const msgTypes = {
	// 	started: 'has been running for',
	// 	failed: 'failed at',
	// 	recalled: 'ran for',
	// 	completed: 'ran for'
	// };

	const voyageDuration = formatTime(getRuntime(voyageConfig));

	// Active details to pass independently to CIVAS
	const activeDetails = {
		created_at: voyageConfig.created_at,
		log_index: voyageConfig.log_index,
		hp: voyageConfig.hp
	};

	return (
		<React.Fragment>
			<Card fluid>
				<Card.Content>
					{shipIcon !== '' && <Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${shipIcon}`} style={{ height: '5em' }} />}
					{header !== '' && (
						<Card.Header>
							{header}
						</Card.Header>
					)}
					<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
						<div>
							<p>
								{t('voyage.active.active_voyage_colon')}&nbsp;<b>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</b> / <b>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</b> / <b>{SHIP_TRAIT_NAMES[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</b>
							</p>
							<p style={{ marginTop: '.5em' }}>
								{tfmt(msgTypes[voyageConfig.state], {
									time: <b><span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span></b>
								})}
								{/* Your voyage {msgTypes[voyageConfig.state]} <b><span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span></b>. */}
								{props.history && ship &&
									<ActiveVoyageTracker
										history={props.history} setHistory={props.setHistory}
										voyageConfig={voyageConfig} shipSymbol={ship.symbol}
									/>
								}
							</p>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '.5em' }}>
							{actionButtons}
						</div>
					</div>
				</Card.Content>
			</Card>
			{showDetails && myCrew && (
				<React.Fragment>
					<VoyageStats
						voyageData={voyageConfig}
						ships={ship ? [ship] : []}
						showPanels={voyageConfig.state === 'started' ? ['estimate'] : ['rewards']}
						playerItems={playerData.player.character.items}
						roster={myCrew}
						rosterType={'myCrew'}
						allCrew={globalContext.core.crew}
						allItems={globalContext.core.items}
						playerData={playerData}
					/>
					<CIVASMessage voyageConfig={voyageConfig} activeDetails={activeDetails} />
					<CrewHoverStat targetGroup='voyageRewards_crew' />
					<ItemHoverStat targetGroup='voyageRewards_item' />
				</React.Fragment>
			)}
		</React.Fragment>
	);
};

type ActiveVoyageTrackerProps = {
	history: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
	voyageConfig: Voyage;
	shipSymbol: string;
};

export const ActiveVoyageTracker = (props: ActiveVoyageTrackerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { history, setHistory, voyageConfig, shipSymbol } = props;

	const [voyageReconciled, setVoyageReconciled] = React.useState(false);

	React.useEffect(() => {
		reconcileVoyage();
		return function cleanup() {
			// Cancel active calculations when leaving page (TODO)
		}
	}, []);

	if (voyageReconciled) {
		const tracked = history.voyages.find(voyage => voyage.voyage_id === voyageConfig.id);
		if (!tracked) return (
			<span>
				{` `}{t('voyage.tracking.not_tracking')}
				{` `}<Button compact content={t('voyage.tracking.start_tracking')} onClick={initializeTracking} />
			</span>
		);
		return (
			<span>
				{` `}
				{tfmt('voyage.other_msg.initial_estimate', {
					time: <b><span style={{ whiteSpace: 'nowrap' }}>{formatTime(tracked.estimate.median)}</span></b>
				})}
				{/* Your initial estimate was <b><span style={{ whiteSpace: 'nowrap' }}>{formatTime(tracked.estimate.median)}</span></b>. */}
			</span>
		);
	}
	return (<></>);

	function reconcileVoyage(): void {
		if (!voyageConfig || !voyageConfig.state) return;	// Voyage not yet set or not active
		// No tracked voyages in history
		if (history.voyages.length === 0) {
			setVoyageReconciled(true);
			return;
		}

		const activeConfig = {...voyageConfig} as Voyage;
		const trackedVoyage = history.voyages.find(voyage => voyage.voyage_id === activeConfig.id);
		if (trackedVoyage) {
			createCheckpoint(activeConfig).then((checkpoint) => {
				trackedVoyage.checkpoint = checkpoint;
				setHistory({...history});
				setVoyageReconciled(true);
			}).catch(e => console.log('reconcileExisting', e));
		}
		else {
			// Voyages don't get a proper voyageId until started in-game, so try to reconcile history
			//	by testing last tracked voyage against active voyage skills and ship_trait
			const lastTracked = history.voyages[history.voyages.length-1];
			// Active voyage doesn't match last tracked or already reconciled
			if (lastTracked.voyage_id > 1
				|| lastTracked.skills.primary_skill !== activeConfig.skills.primary_skill
				|| lastTracked.skills.secondary_skill !== activeConfig.skills.secondary_skill
				|| lastTracked.ship_trait !== activeConfig.ship_trait) {
				setVoyageReconciled(true);
				return;
			}
			createCheckpoint(activeConfig).then((checkpoint) => {
				lastTracked.voyage_id = activeConfig.id;
				lastTracked.created_at = Date.parse(activeConfig.created_at);
				lastTracked.ship = globalContext.core.ships.find(s => s.id === activeConfig.ship_id)?.symbol ?? lastTracked.ship;
				// If the lineup sent out doesn't match the tracked recommendation, maybe reconcile crew and max_hp here or show a warning?
				lastTracked.checkpoint = checkpoint;
				setHistory({...history});
				setVoyageReconciled(true);
			}).catch(e => console.log('reconcileNew', e));
		}
	}

	function initializeTracking(): void {
		// Add to history with both initial and checkpoint estimates
		estimateTrackedVoyage(voyageConfig, 0, voyageConfig.max_hp).then((initial: Estimate) => {
			createCheckpoint(voyageConfig).then((checkpoint: ITrackedCheckpoint) => {
				const newTrackerId = addVoyageToHistory(history, voyageConfig, shipSymbol, initial);
				addCrewToHistory(history, newTrackerId, voyageConfig);
				const trackedVoyage = history.voyages.find(voyage => voyage.tracker_id === newTrackerId);
				if (trackedVoyage) {
					trackedVoyage.voyage_id = voyageConfig.id;
					trackedVoyage.created_at = Date.parse(voyageConfig.created_at);
					trackedVoyage.checkpoint = checkpoint;
					setHistory({...history});
				}
			}).catch(e => console.log('initializeTracking', e));
		});
	}
};
