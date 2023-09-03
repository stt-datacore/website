import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { PlayerData } from '../../model/player';

import { PlayerCard } from './playercard';
import { PlayerShare } from './playershare';
import { PlayerInputForm } from './playerinputform';
import { PlayerMessage } from './playermessage';

import { useStateWithStorage } from "../../utils/storage";

type PlayerHeaderProps = {
	promptType: 'require' | 'recommend' | 'none';
	playerPanel: string | undefined;
	setPlayerPanel: (panel: string | undefined) => void;
};

const PlayerHeader = (props: PlayerHeaderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { player } = globalContext;
	const { promptType, playerPanel, setPlayerPanel } = props;

	const [dismissed, setDismissed] = useStateWithStorage('player/dismissedMessages', [] as string[]);

	// If crew not loaded, assume core is not ready and player header shouldn't be shown
	if (globalContext.core.crew.length === 0) return (<></>);

	const receiveInput = (playerData: PlayerData | undefined) => {
		if (player.setInput) {
			player.setInput(playerData);
			setPlayerPanel(undefined);
		}
	};

	const enforceInput = !player.loaded && promptType === 'require';
	const showRequireMessage = enforceInput;

	const showRecommendMessage = !player.loaded && promptType === 'recommend' && (!dismissed.includes('recommend') || playerPanel === 'input');

	let isStale = false;
	if (player.playerData?.calc?.lastModified) {
		const STALETHRESHOLD = 3;	// in hours
		const dtNow = new Date().getTime();
		const dtModified = player.playerData.calc.lastModified.getTime();
		isStale = dtNow - dtModified > STALETHRESHOLD*60*60*1000;
	}
	const showStaleMessage = isStale && (!dismissed.includes('stale') || playerPanel === 'input');

	return (
		<React.Fragment>
			{showRequireMessage && (
				<PlayerMessage
					header='Player Data Required'
					content={<p>This page requires player data. Follow the instructions below to upload your player data.</p>}
					icon='user outline'
					warning={true}
				/>
			)}
			{showRecommendMessage && (
				<PlayerMessage
					header='Player Data Recommended'
					content={<p>This page is better with player data.{playerPanel !== 'input' && <>{` `}Click here to upload your player data now.</>}</p>}
					icon='user outline'
					onClick={() => setPlayerPanel('input')}
					onDismiss={() => { dismissMessage('recommend'); setPlayerPanel(undefined); }}
				/>
			)}
			{showStaleMessage &&
				<PlayerMessage
					header='Update Your Player Data'
					content={<p>It's been a few hours since you last updated your player data. We recommend that you update now to make sure our tools are providing you recent information about your crew.</p>}
					icon='clock'
					warning={true}
					onClick={() => setPlayerPanel('input')}
					onDismiss={() => { dismissMessage('stale'); setPlayerPanel(undefined); }}
				/>
			}
			{playerPanel === 'card' && <PlayerCard />}
			{(playerPanel === 'input' || enforceInput) && <PlayerInputForm setValidInput={receiveInput} />}
			{player.loaded &&
				<PlayerShare
					showPanel={playerPanel === 'share'}
					dismissPanel={() => setPlayerPanel(undefined)}
				/>
			}
		</React.Fragment>
	);

	function dismissMessage(messageType: string): void {
		setDismissed(prev => {
			if (!prev.includes(messageType)) prev.push(messageType);
			return [...prev];
		});
	}
};

export default PlayerHeader;