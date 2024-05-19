import React from 'react';
import { Link, navigate } from 'gatsby';
import { Card, Label, Icon, Button, Form, Checkbox, Popup } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { Notification } from '../../components/page/notification';
import { useStateWithStorage } from '../../utils/storage';
import { exportCrew, downloadData } from '../../utils/crewutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

const ShareText = "You can post your profile to the DataCore server to utilize personalized features of the discord bot, and let other users see your crew, ships, and items.";

enum ProfileUploadState {
	Idle,
	AutoUpdate,
	ManualUpdate,
	Success,
	Failed
};

type PlayerShareNotificationsProps = {
	dbid: string;
	activePanel: string | undefined;
	setActivePanel: (activePanel: string | undefined) => void;
};

export const PlayerShareNotifications = (props: PlayerShareNotificationsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { dbid, activePanel, setActivePanel } = props;

	const [nagPrefLoaded, setNagPrefLoaded] = React.useState(false);
	const [showShareNagPref, setShowShareNagPref] = useStateWithStorage(dbid + '/tools/showShare', true, { rememberForever: true, onInitialize: () => setNagPrefLoaded(true) });
	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(dbid + '/tools/profileAutoUpdate', false, { rememberForever: true });

	React.useEffect(() => {
		if (profileAutoUpdate && uploadState === ProfileUploadState.Idle) {
			if (updateSessionState) updateSessionState('profileUpload', ProfileUploadState.AutoUpdate);
		}
	}, [profileAutoUpdate, playerData]);

	// Escape here if pref not yet loaded from localStorage to avoid possibly rendering, then un-rendering
    if (!nagPrefLoaded) return (<></>);

	const showShareNag = uploadState === ProfileUploadState.Idle && showShareNagPref && !profileAutoUpdate;

	return (
		<React.Fragment>
			{showShareNag &&
				<div style={{ margin: '1em 0' }}>
					<Notification
						header='Share Your Player Profile'
						content={
							<p>
								{activePanel !== 'share' && <>{ShareText} Tap here to learn more.</>}
								{activePanel === 'share' && <>Follow the instructions below to post your player profile to the DataCore server.</>}
							</p>
						}
						icon='share alternate'
						onClick={activePanel !== 'share' ? () => setActivePanel('share') : undefined}
						onDismiss={() => { setShowShareNagPref(false); if (activePanel === 'share') setActivePanel(undefined); }}
					/>
				</div>
			}
			<PlayerProfileUploader
				dbid={dbid}
				activePanel={activePanel}
				setActivePanel={setActivePanel}
			/>
		</React.Fragment>
	);
};

type PlayerSharePanelProps = {
	requestDismiss: () => void;
};

export const PlayerSharePanel = (props: PlayerSharePanelProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { requestDismiss } = props;

    const dbid = playerData?.player.dbid ?? '';

	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(dbid + '/tools/profileAutoUpdate', false, { rememberForever: true });
	const [copied, setCopied] = React.useState(false);

    if (!playerData) return (<></>);

	const PROFILE_LINK = typeof window !== 'undefined' ? window.location.origin + `/profile?dbid=${dbid}` : `${process.env.GATSBY_DATACORE_URL}profile/?dbid=${dbid}`;
	const isUploading = uploadState === ProfileUploadState.AutoUpdate || uploadState === ProfileUploadState.ManualUpdate;

	return (
		<React.Fragment>
			<Card fluid>
				<Card.Content>
					<Label title={'Close player share panel'} as='a' corner='right' onClick={requestDismiss}>
						<Icon name='delete' style={{ cursor: 'pointer' }} />
					</Label>
					<Card.Header>
						Post Profile to DataCore
					</Card.Header>
					<div style={{ margin: '1em 0' }}>
						<p>{ShareText} Once shared, your public profile will be accessible by anyone with this link:</p>
						<p style={{ margin: '1.25em 0', textAlign: 'center' }}>
							<span style={{ fontWeight: 'bold', fontSize: '1.25em', marginRight: '1em' }}>
								<Link to={`/profile?dbid=${dbid}`}>{PROFILE_LINK}</Link>
							</span>
							<Popup
								content='Copied!'
								on='click'
								position='right center'
								size='tiny'
								trigger={
									<Button compact icon='clipboard' onClick={() => copyProfileLink()} />
								}
							/>
						</p>
						<p>
							Click the link, above, to access data exports for spreadsheets including Take My Chrons and Do Not Airlock.
						</p>
						<p>Some pages on DataCore, notably fleet pages and event pages, may also link to your public profile.</p>
						<p>
							Information being shared is limited to:
							{` `}<b>DBID, captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships</b>.
							{` `}No private information is included in your public profile.
						</p>
					</div>
					{(uploadState !== ProfileUploadState.Success) && (
						<Button
							size='large'
							onClick={() => { if (updateSessionState) updateSessionState('profileUpload', ProfileUploadState.ManualUpdate); }}
							disabled={isUploading}
							color='blue'
						>
							<Icon name='share alternate' />
							Post Profile
						</Button>
					)}
					{uploadState === ProfileUploadState.Success && (
						<div style={{ margin: '2em 0' }}>
							<Form>
								<Form.Field
									control={Checkbox}
									label='Automatically post profile when importing player data'
									checked={profileAutoUpdate}
									onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
								/>
								{/* TODO: Include option to delete public profile here */}
							</Form>
						</div>
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
							icon='table'
							size='large'
						/>
					<Button
							onClick={() => exportCrewToClipboard()}
							content='Copy to Clipboard'
							icon='clipboard'
							size='large'
						/>
					{copied && <div>Profile copied to clipboard!</div>}
					</div>
				</Card.Content>
			</Card>
		</React.Fragment>
	);

	function copyProfileLink(): void {
		navigator.clipboard.writeText(PROFILE_LINK);
	}

	function exportCrewTool(): void {
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(globalContext.player.playerData.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard(): void {
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(globalContext.player.playerData.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
		setCopied(true);
		window.setTimeout(() => {
			setCopied(false);
		}, 3500);
	}
};

type PlayerProfileUploaderProps = {
	dbid: string;
	activePanel: string | undefined;
	setActivePanel: (activePanel: string | undefined) => void;
};

const PlayerProfileUploader = (props: PlayerProfileUploaderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { strippedPlayerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { dbid, activePanel, setActivePanel } = props;

	const [showResponse, setShowResponse] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		if (!strippedPlayerData) return;
		if (globalContext.player.dataSource === 'session') return;
		if (uploadState === ProfileUploadState.AutoUpdate || uploadState === ProfileUploadState.ManualUpdate)
			uploadProfile();
	}, [uploadState, strippedPlayerData]);

	const showSuccess = uploadState === ProfileUploadState.Success && showResponse;
	const showFailure = uploadState === ProfileUploadState.Failed && showResponse;

	const showAnyMessages = showSuccess || showFailure;
	if (!showAnyMessages) return (<></>);

	return (
		<div style={{ margin: '1em 0' }}>
			{showSuccess &&
				<Notification
					header='Player Profile Shared!'
					content={
						<p>
							Your profile was uploaded successfully! Tap here to view your public profile.
						</p>
					}
					icon='share alternate'
					onClick={() => navigate(`/profile?dbid=${dbid}`)}
					onDismiss={() => { setShowResponse(false); if (activePanel === 'share') setActivePanel(undefined); }}
				/>
			}
			{showFailure &&
				<Notification
					header='Failed to share player profile!'
					content={
						<React.Fragment>
							<p>Your profile failed to upload, with the error: "{errorMessage}"</p>
							<p>
								{activePanel !== 'share' && <>Tap here to try again.</>}
								{activePanel === 'share' && <>Follow the instructions below to try again.</>}
							</p>
						</React.Fragment>
					}
					icon='share alternate'
					negative={true}
					onClick={activePanel !== 'share' ? () => setActivePanel('share') : undefined}
					onDismiss={() => { setShowResponse(false); }}
				/>
			}
		</div>
	);

	
	function uploadProfile(): void {
		let jsonBody = JSON.stringify({
			dbid: strippedPlayerData?.player.dbid,
			player_data: strippedPlayerData
		});

		fetch(`${process.env.GATSBY_DATACORE_URL}api/post_profile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			// if (uploadState === ProfileUploadState.ManualUpdate)
			// 	if (typeof window !== 'undefined') window.open(profileLink, '_blank');
			if (updateSessionState) updateSessionState('profileUpload', ProfileUploadState.Success);
			setErrorMessage(undefined);
		}).catch((error: any) => {
			if (updateSessionState) updateSessionState('profileUpload', ProfileUploadState.Failed);
			setErrorMessage(`${error}`);
		}).finally(() => {
			setShowResponse(true);
		});
	}
};
