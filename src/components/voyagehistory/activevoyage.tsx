import React from 'react';
import { Link } from 'gatsby';
import { Button } from 'semantic-ui-react';

import { IVoyageHistory, ITrackedCheckpoint } from './model';
import { Voyage } from '../../model/player';
import { Estimate } from '../../model/worker';

import { DataContext } from '../../context/datacontext';
import { PlayerContext } from '../../context/playercontext';

import { defaultHistory, formatTime, estimateTrackedVoyage, createCheckpoint, addVoyageToHistory, addCrewToHistory } from './utils';
import { useStateWithStorage } from '../../utils/storage';

type ActiveVoyageTrackerProps = {
	voyageConfig: Voyage;
	shipSymbol: string;
};

export const ActiveVoyageTracker = (props: ActiveVoyageTrackerProps) => {
	const coreData = React.useContext(DataContext);
	//const playerContext = React.useContext(PlayerContext);

	// Simulate playerContext from new-context
	const { strippedPlayerData } = React.useContext(PlayerContext);
	const playerContext = {
		loaded: !!strippedPlayerData,
		playerData: {
			player: {
				dbid: strippedPlayerData?.player.dbid ?? ''
			}
		}
	};

	const { voyageConfig, shipSymbol } = props;

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(playerContext.playerData.player.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true, onInitialize: reconcileVoyage } );
	const [voyageReconciled, setVoyageReconciled] = React.useState(false);

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
			});
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
				lastTracked.ship = coreData.ships.find(s => s.id === activeConfig.ship_id)?.symbol ?? lastTracked.ship;
				// If the lineup sent out doesn't match the tracked recommendation, maybe reconcile crew and max_hp here or show a warning?
				lastTracked.checkpoint = checkpoint;
				setHistory({...history});
				setVoyageReconciled(true);
			});
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
			});
		});
	}
};
