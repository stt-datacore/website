import React from 'react';
import { Link } from 'gatsby';
import { Card, Image, Button } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';
import { Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageCrew, IVoyageHistory, ITrackedCheckpoint } from '../../model/voyage';
import { Estimate } from '../../model/worker';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import CONFIG from '../CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { formatTime } from '../../utils/voyageutils';

import { CIVASMessage } from './civas';
import { VoyageStats } from './voyagestats';
import { rosterizeMyCrew, rosterizeMyShips } from './rosterpicker';

import { getRuntime, defaultHistory, estimateTrackedVoyage, createCheckpoint, addVoyageToHistory, addCrewToHistory } from '../../components/voyagehistory/utils';

type ActiveVoyageProps = {
	showCalculator: boolean;
	setShowCalculator: (showCalculator: boolean) => void;
};

export const ActiveVoyage = (props: ActiveVoyageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, playerShips, ephemeral } = globalContext.player;
	const { showCalculator, setShowCalculator } = props;

	const [myCrew, setMyCrew] = React.useState<IVoyageCrew[] | undefined>(undefined);
	const [myShips, setMyShips] = React.useState<Ship[] | undefined>(undefined);

	React.useEffect(() => {
		if (!playerData || !ephemeral) return;
		const rosterCrew = rosterizeMyCrew(playerData.player.character.crew, ephemeral.activeCrew ?? []);
		const rosterShips = rosterizeMyShips(playerShips ?? []);
		setMyCrew([...rosterCrew]);
		setMyShips([...rosterShips]);
	}, []);

	if (!playerData || !ephemeral || ephemeral.voyage.length === 0)
		return (<></>);

	const voyageConfig = ephemeral.voyage[0];
	const ship = playerData.player.character.ships.find(s => s.id === voyageConfig.ship_id);

	const msgTypes = {
		started: 'has been running for',
		failed: 'failed at',
		recalled: 'ran for',
		completed: 'ran for'
	};
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
					{ship && <Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} style={{ height: '4em' }} />}
					{ship && <Card.Header>{voyageConfig.ship_name ? `${voyageConfig.ship_name} (${ship.name})` : `${ship.name}`}</Card.Header>}
					<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', rowGap: '1em' }}>
						<div>
							<p>
								Active voyage: <b>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</b> / <b>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</b> / <b>{allTraits.ship_trait_names[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</b>
							</p>
							<p style={{ marginTop: '.5em' }}>
								Your voyage {msgTypes[voyageConfig.state]} <b><span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span></b>.
								{ship && <ActiveVoyageTracker voyageConfig={voyageConfig} shipSymbol={ship.symbol} dbid={`${playerData.player.dbid}`} />}
							</p>
						</div>
						<div>
							<Button content={showCalculator ? 'View active voyage' : 'View crew calculator'}
								icon='exchange'
								size='large'
								onClick={()=> setShowCalculator(showCalculator ? false : true)}
							/>
						</div>
					</div>
				</Card.Content>
			</Card>
			{!showCalculator && myCrew && myShips && (
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
	voyageConfig: Voyage;
	shipSymbol: string;
	dbid: string;
};

export const ActiveVoyageTracker = (props: ActiveVoyageTrackerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { voyageConfig, shipSymbol, dbid } = props;

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true, onInitialize: reconcileVoyage } );
	const [voyageReconciled, setVoyageReconciled] = React.useState(false);

	React.useEffect(() => {
		return function cleanup() {
			// Cancel active calculations when leaving page (TODO)
		}
	}, []);

	if (voyageReconciled) {
		const tracked = history.voyages.find(voyage => voyage.voyage_id === voyageConfig.id);
		if (!tracked) return (
			<span>
				{` `}You are not tracking this voyage.
				{` `}<Button compact content='Start tracking' onClick={initializeTracking} />
				{history.voyages.length > 0 && <>{` `}<Link to='/voyagehistory/'>View history</Link></>}
			</span>
		);
		return (
			<span>
				{` `}Your initial estimate was <b><span style={{ whiteSpace: 'nowrap' }}>{formatTime(tracked.estimate.median)}</span></b>.
				{` `}<Link to='/voyagehistory/'>View history</Link>
			</span>
		);
	}
	return (<></>);

	function reconcileVoyage(): void {
		if (!voyageConfig || !voyageConfig.state) return;	// Voyage not yet set or not active
		if (history.voyages.length === 0) return;	// No tracked voyages in history

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
