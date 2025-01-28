import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { PlayerData } from '../../model/player';
import { Notification } from '../../components/page/notification';

import { JsonInputForm } from '../base/jsoninputform';

type PlayerHeaderProps = {
	promptType: 'require' | 'recommend' | 'none';
	activePanel: string | undefined;
	setActivePanel: (panel: string | undefined) => void;
};

const PlayerHeader = (props: PlayerHeaderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { promptType, activePanel, setActivePanel } = props;

	// Dismissed player-input messages are reset on every page load
	const [dismissed, setDismissed] = React.useState([] as string[]);

	// If crew not loaded, assume core is not ready and content header shouldn't be shown
	if (globalContext.core.crew.length === 0) return (<></>);

	const receiveInput = (playerData: PlayerData | undefined) => {
		if (globalContext.player.setInput) {
			globalContext.player.setInput(playerData);
			setActivePanel(undefined);
		}
	};

	if (typeof window !== 'undefined') {
		// for potential thin clients
		window["playerDataSetter"] = (text: string) => {
			receiveInput(JSON.parse(text));
		}
	}

	const enforceInput = !playerData && promptType === 'require';
	const showRequireMessage = enforceInput;

	const showRecommendMessage = !playerData && promptType === 'recommend' && !dismissed.includes('recommend');

	let isStale = false;
	if (playerData?.calc?.lastModified) {
		const STALETHRESHOLD = 3;	// in hours
		const dtNow = new Date().getTime();
		const dtModified = playerData.calc.lastModified.getTime();
		isStale = dtNow - dtModified > STALETHRESHOLD*60*60*1000;
	}
	const showStaleMessage = isStale && !dismissed.includes('stale');

	const showAnyMessage = showRequireMessage || showRecommendMessage || showStaleMessage;
	if (!activePanel && !showAnyMessage) return (<></>);

	return (
		<div style={{ margin: '1em 0' }}>
			{showRequireMessage && (
				<Notification
					header={t('header.require.title')}
					content={<p>{t('header.require.description')}</p>}
					icon='user outline'
					warning={true}
				/>
			)}
			{showRecommendMessage && (
				<Notification
					header={t('header.recommend.title')}
					content={<p>{t('header.recommend.description')}{activePanel !== 'input' && <>{` `}{t('header.recommend.tap_here')}</>}</p>}
					icon='user outline'
					onClick={activePanel !== 'input' ? () => setActivePanel('input') : undefined}
					onDismiss={() => { dismissMessage('recommend'); if (activePanel === 'input') setActivePanel(undefined); }}
				/>
			)}
			{showStaleMessage &&
				<Notification
					header='Update Your Player Data'
					content={<p>It's been a few hours since you last imported your player data. We recommend that you update now to make sure our tools are providing you recent information about your crew.</p>}
					icon='clock'
					warning={true}
					onClick={activePanel !== 'input' ? () => setActivePanel('input') : undefined}
					onDismiss={() => { dismissMessage('stale'); if (activePanel === 'input') setActivePanel(undefined); }}
				/>
			}
			{(activePanel === 'input' || enforceInput) &&
				<JsonInputForm
					config={{
						dataUrl: 'https://app.startrektimelines.com/player?client_api=24&only_read_state=true',
						dataName: t('json_types.player_data'),
						jsonHint: '{"action":"update","player":',
						androidFileHint: 'player.json',
						iOSFileHint: 'player?client_api'
					}}
					validateInput={validateInput}
					setValidInput={receiveInput}
					requestDismiss={!enforceInput ? () => { setActivePanel(undefined); } : undefined}
				/>
			}
		</div>
	);

	function validateInput(testData: PlayerData): string | true {
		if (testData.player && testData.player.display_name) {
			if (testData.player.character && testData.player.character.crew && (testData.player.character.crew.length > 0)) {
				return true;
			} else {
				return ('Failed to parse player data from the text you pasted. Make sure you are logged in with the correct account.');
			}
		}
		else {
			return ('Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!');
		}
	}

	function dismissMessage(messageType: string): void {
		setDismissed(prev => {
			if (!prev.includes(messageType)) prev.push(messageType);
			return [...prev];
		});
	}
};

export default PlayerHeader;