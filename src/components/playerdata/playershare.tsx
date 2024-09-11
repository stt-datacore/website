import React from 'react';
import { Link, navigate } from 'gatsby';
import { Card, Label, Icon, Button, Form, Checkbox, Popup } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { Notification } from '../../components/page/notification';
import { useStateWithStorage } from '../../utils/storage';
import { exportCrew, downloadData } from '../../utils/crewutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { PlayerCrew } from '../../model/player';

interface ShortCrew {
	lastUpdate: Date,
	shortCrewList: {
		crew: [{
			id: number,
			rarity: number
		}],
		c_stored_immortals: number[],
		stored_immortals: [{
			id: number,
			quantity: number
		}]
	}
}

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
	setDbidHash: (value?: string) => void;
	dbidHash?: string;
};

export const PlayerShareNotifications = (props: PlayerShareNotificationsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { dbid, activePanel, setActivePanel, dbidHash, setDbidHash } = props;

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
						header={t('share_profile.share.nag.title')}
						content={
							<p>
								{activePanel !== 'share' && <>{t('share_profile.share.nag.nag_panel_not_share')}</>}
								{activePanel === 'share' && <>{t('share_profile.share.nag.nag_panel_share')}</>}
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
				setDbidHash={setDbidHash}
				dbidHash={dbidHash}
				activePanel={activePanel}
				setActivePanel={setActivePanel}
			/>
		</React.Fragment>
	);
};

type PlayerSharePanelProps = {
	requestDismiss: () => void;
	dbidHash?: string;
};

export const PlayerSharePanel = (props: PlayerSharePanelProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { requestDismiss, dbidHash } = props;

    const dbid = playerData?.player.dbid ?? '';

	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(dbid + '/tools/profileAutoUpdate', false, { rememberForever: true });
	const [copied, setCopied] = React.useState(false);
	const [dbidCopied, setDBIDCopied] = React.useState(false);
    if (!playerData) return (<></>);

	const PROFILE_LINK = typeof window !== 'undefined' ? window.location.origin + (!!dbidHash ? `/profile?hash=${dbidHash}` : `/profile?dbid=${dbid}`) : (!!dbidHash ? `${process.env.GATSBY_DATACORE_URL}profile/?hash=${dbidHash}` : `${process.env.GATSBY_DATACORE_URL}profile/?dbid=${dbid}`);
	const isUploading = uploadState === ProfileUploadState.AutoUpdate || uploadState === ProfileUploadState.ManualUpdate;

	return (
		<React.Fragment>
			<Card fluid>
				<Card.Content>
					<Label title={'Close player share panel'} as='a' corner='right' onClick={requestDismiss}>
						<Icon name='delete' style={{ cursor: 'pointer' }} />
					</Label>
					<Card.Header>
						{t('share_profile.share.title')}
					</Card.Header>
					<div style={{ margin: '1em 0' }}>
						<p>{t('share_profile.share.header')}</p>
						<p style={{ margin: '1.25em 0', textAlign: 'center' }}>
							<span style={{ fontWeight: 'bold', fontSize: '1.25em', marginRight: '1em' }}>
								<Link to={!!dbidHash ? `/profile?hash=${dbidHash}` : `/profile?dbid=${dbid}`}>{PROFILE_LINK}</Link>
							</span>
							<Popup
								content={t('clipboard.copied_exclaim')}
								on='click'
								position='right center'
								size='tiny'
								trigger={
									<Button compact icon='clipboard' onClick={() => copyProfileLink()} />
								}
							/>
						</p>
						<p>
							{t('share_profile.share.instructions.line_1')}
						</p>
						<p>{t('share_profile.share.instructions.line_2')}</p>
						<p>
							{tfmt('share_profile.share.instructions.line_3', { list: <b>{t('share_profile.share.info_list')}</b>})}
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
							{t('share_profile.share.post_profile')}
						</Button>
					)}
					{uploadState === ProfileUploadState.Success && (
						<div style={{ margin: '2em 0' }}>
							<Form>
								<Form.Field
									control={Checkbox}
									label={t('share_profile.share.check_auto_share')}
									checked={profileAutoUpdate}
									onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
								/>
								{/* TODO: Include option to delete public profile here */}
							</Form>
						</div>
					)}

					<div style={{
						display: 'flex',
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
						marginTop: "0.5em",
						gap: "0.25em",
						alignItems: 'center'}}>
						<Button
								onClick={() => exportCrewTool()}
								content={t('share_profile.export.export_csv')}
								icon='table'
								size='large'
							/>
						<Popup content={t('share_profile.export.exported_clipboard')}
							openOnTriggerClick={false}
							openOnTriggerMouseEnter={false}
							open={copied}
							trigger={
								<Button
								onClick={() => exportCrewToClipboard()}
								content={t('share_profile.export.export_clipboard')}
								icon='clipboard'
								size='large'
							/>
							}
						/>
						<Popup content={t('clipboard.copied_exclaim')}
							openOnTriggerClick={false}
							openOnTriggerMouseEnter={false}
							open={dbidCopied}
							trigger={
								<Button
								onClick={() => dbidToClipboard()}
								content={t('share_profile.export.copy_dbid')}
								icon='clipboard'
								size='large'
							/>
							}
						/>
					</div>
				</Card.Content>
			</Card>
		</React.Fragment>
	);

	function copyProfileLink(): void {
		navigator.clipboard.writeText(PROFILE_LINK);
	}

	function exportCrewTool(): void {
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(t, globalContext.player.playerData.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard(): void {
		let text = globalContext.player.playerData?.player.character.unOwnedCrew ? exportCrew(t, globalContext.player.playerData!.player.character.crew.concat(globalContext.player.playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 3500);
	}

	function dbidToClipboard(): void {
		let text = globalContext.player.playerData?.player.dbid?.toString();
		if (!text) return;
		navigator.clipboard.writeText(text);
		setDBIDCopied(true);
		setTimeout(() => setDBIDCopied(false), 3500);
	}
};

type PlayerProfileUploaderProps = {
	dbid: string;
	activePanel: string | undefined;
	setActivePanel: (activePanel: string | undefined) => void;
	setDbidHash: (value: string) => void;
	dbidHash?: string;
}

const PlayerProfileUploader = (props: PlayerProfileUploaderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { strippedPlayerData, sessionStates, updateSessionState } = globalContext.player;
	const uploadState = sessionStates?.profileUpload ?? ProfileUploadState.Idle;
	const { dbid, activePanel, setActivePanel } = props;
	const { dbidHash, setDbidHash } = props;
	const [showResponse, setShowResponse] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

	const { setNewCrew } = globalContext.player;

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
					header={t('share_profile.shared.title')}
					content={
						<p>
							{t('share_profile.shared.description')}
						</p>
					}
					icon='share alternate'
					onClick={() => navigate(!!dbidHash ? `/profile?hash=${dbidHash}` : `/profile?dbid=${dbid}`)}
					onDismiss={() => { setShowResponse(false); if (activePanel === 'share') setActivePanel(undefined); }}
				/>
			}
			{showFailure &&
				<Notification
					header={t('share_profile.share.error.error_header')}
					content={
						<React.Fragment>
							<p>{t('share_profile.share.error.error_title')}</p>
							<p>
								{activePanel !== 'share' && <>{t('share_profile.share.error.error_panel_not_share')}</>}
								{activePanel === 'share' && <>{t('share_profile.share.error.error_panel_share')}</>}
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
		let dbid = strippedPlayerData?.player.dbid;
		if (dbid) {
			fetch(`${process.env.GATSBY_DATACORE_URL}api/profile?dbid=${dbid}&short_crew=1`)
				.then((result) => result.json())
				.then((short_crew: ShortCrew) => {
					if (setNewCrew) {
						let changedCrew = strippedPlayerData?.player.character.crew.filter(f => !short_crew.shortCrewList.crew.find(cf => cf.id === f.archetype_id && cf.rarity === f.rarity));
						setNewCrew(changedCrew);
					}
				})
				.then(() => {
					setTimeout(() => continueUpload());
				})
				.catch(() => {
					setTimeout(() => continueUpload());
				});
		}
	}

	function continueUpload(): void {
		let jsonBody = JSON.stringify(strippedPlayerData);

		fetch(`${process.env.GATSBY_DATACORE_URL}api/postProfile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody

		})
		.then((response) => response.json())
		.then((data) => {
			// if (uploadState === ProfileUploadState.ManualUpdate)
			// 	if (typeof window !== 'undefined') window.open(profileLink, '_blank');
			if (data.hash && !!setDbidHash) {
				setDbidHash(data.hash as string);
			}
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
