import React from 'react';
import { Card, Label, Icon, Button, Form, Checkbox, Message } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { PlayerMessage } from './playermessage';

import { useStateWithStorage } from '../../utils/storage';
import { exportCrew, downloadData } from '../../utils/crewutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

type PlayerShareProps = {
	activePanel: string | undefined;
	setActivePanel: (activePanel: string | undefined) => void;
};

export const PlayerShare = (props: PlayerShareProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, strippedPlayerData } = globalContext.player;
	const { activePanel, setActivePanel } = props;

    const dbid = playerData?.player.dbid ?? '';

	const [showInvite, setShowInvite] = useStateWithStorage(dbid + '/tools/showShare', true, { rememberForever: true, onInitialize: variableReady });
	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(dbid + '/tools/profileAutoUpdate', false, { rememberForever: true, onInitialize: variableReady });
	const [varsReady, setVarsReady] = React.useState(0);
	const [shareState, setShareState] = useStateWithStorage('player/shareState', 0);
	const [showSuccess, setShowSuccess] = useStateWithStorage('player/showShareSuccess', true);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
	const [copied, setCopied] = React.useState(false);

	React.useEffect(() => {
		if (varsReady < 2) return;
		//if (profileAutoUpdate) shareProfile();
	}, [strippedPlayerData, varsReady]);

    if (!playerData || !strippedPlayerData) return (<></>);
	if (varsReady < 2) return (<></>);	// Escape here if localStorage vars not ready to avoid possibly rendering, then un-rendering messages

	const PROFILELINK = (typeof window !== 'undefined') ? window.location.origin + `/profile?dbid=${dbid}` : `${process.env.GATSBY_DATACORE_URL}profile/?dbid=${dbid}`;

	return (
		<React.Fragment>
			{showInvite &&
				<PlayerMessage
					header='Share Your Player Profile'
					content={<p>You can upload your profile to DataCore so you can easily share some data with other players.{activePanel !== 'share' && <>{` `}Tap here to learn more.</>}</p>}
					icon='share alternate'
					onClick={activePanel !== 'share' ? () => setActivePanel('share') : undefined}
					onDismiss={() => { setShowInvite(false); if (activePanel === 'share') setActivePanel(undefined); }}
				/>
			}
			{shareState === 2 && showSuccess &&
				<PlayerMessage
					header='Player Profile Shared!'
					content={
						<p>
							Your profile was uploaded successfully. Share the link:
							<br /><a href={PROFILELINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{PROFILELINK}</a>
						</p>
					}
					icon='share alternate'
					onDismiss={() => { setShowSuccess(false); if (activePanel === 'share') setActivePanel(undefined); }}
				/>
			}
			{activePanel === 'share' && (
				<Card fluid>
					<Card.Content>
						<Label as='a' corner='right' onClick={() => setActivePanel(undefined)}>
							<Icon name='delete' />
						</Label>
						<Card.Header>
							Share Profile
						</Card.Header>
						<ul>
							<li>
								You can upload your profile to DataCore so you can easily share some data with other players. Once shared, your public profile will be accessible by anyone with this link:
								{` `}<a href={PROFILELINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{PROFILELINK}</a>.
							</li>
							<li>Some pages on DataCore, notably fleet pages and event pages, may also link to your public profile.</li>
							<li>
								There is no private information included in the player profile; information being shared is limited to:{' '}
								<b>DBID, captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
							</li>
						</ul>
						{shareState < 2 && (
							<Button
								onClick={() => shareProfile()}
								content='Share your profile'
								icon='share alternate'
								size='large'
								color='blue'
							/>
						)}
						{shareState === 2 && (
							<Form.Group>
								<Form.Field
									control={Checkbox}
									label='Automatically share profile after every import (Currently not functioning)'
									checked={profileAutoUpdate}
									onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
								/>
							</Form.Group>
						)}
						{errorMessage && (
							<Message negative style={{ marginTop: '2em' }}>
								<Message.Header>Error</Message.Header>
								<p>{errorMessage}</p>
							</Message>
						)}

						<div style={{display:'flex', 
							flexDirection: 
								window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row', 
							marginTop: "0.5em", 
							alignItems: 
								window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'flex-start' : 'center'}}>
									
						<Button
								onClick={() => exportCrewTool()}
								content='Export CSV'
								icon='table alternate'
								size='large'								
							/>
						<Button
								onClick={() => exportCrewToClipboard()}
								content='Copy to Clipboard'
								icon='clipboard alternate'
								size='large'								
							/>
						{copied && <div>Profile copied to clipboard!</div>}
						</div>
					</Card.Content>
				</Card>
			)}
		</React.Fragment>
	);

	function variableReady(keyName: string): void {
		setVarsReady(prev => prev + 1);
	}
	function exportCrewTool() {		
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(globalContext.player.playerData.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard() {
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(globalContext.player.playerData.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
		setCopied(true);
		window.setTimeout(() => {
			setCopied(false);
		}, 3500);
	}
	function shareProfile(): void {
		if (shareState !== 0) return;

		setShareState(1);
		
		let jsonBody = JSON.stringify(strippedPlayerData);
		// this is a comment
		fetch(`${process.env.GATSBY_DATACORE_URL}api/postProfile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			if (!profileAutoUpdate) window.open(PROFILELINK, '_blank');
			setShareState(2);
			setErrorMessage(undefined);
		}).catch((error: any) => {
			setShareState(0);
			setErrorMessage(`${error}`);
		});
	}
};
