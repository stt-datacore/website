// This file can be deleted when all pages have transitioned from layout to datapagelayout
import React from 'react';
import { Message, Icon, Button, Form, Checkbox, Progress, Header, Menu, Dropdown, Popup, Accordion } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { EphemeralData } from "../../context/playercontext";
import { EquipmentItem } from "../../model/equipment";
import { PlayerData, PlayerCrew } from "../../model/player";
import { Ship } from "../../model/ship";
import { playerTools } from "../../pages/playertools";
import { exportCrew, downloadData } from "../../utils/crewutils";
import { useStateWithStorage } from "../../utils/storage";
import { BuffStatTable } from "../../utils/voyageutils";

export interface PlayerPanelProps {
	requestShowForm: (showForm: boolean) => void;
	requestClearData: () => void;
};

export const PlayerPanel = (props: PlayerPanelProps) => {
	const context = React.useContext(GlobalContext);

	const {
		requestShowForm,
		requestClearData,
	} = props;

	const playerData = context.player.playerData ?? {} as PlayerData;
	const strippedPlayerData = context.player.strippedPlayerData ?? {} as PlayerData;

	const [showIfStale, setShowIfStale] = useStateWithStorage('tools/showStale', true);

	const [showShare, setShowShare] = useStateWithStorage(playerData.player.dbid + '/tools/showShare', true, { rememberForever: true, onInitialize: variableReady });
	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(playerData.player.dbid + '/tools/profileAutoUpdate', false, { rememberForever: true });
	const [profileUploaded, setProfileUploaded] = React.useState(false);
	const [profileUploading, setProfileUploading] = React.useState(false);
	const [profileShared, setProfileShared] = useStateWithStorage('tools/profileShared', false);

	const [varsReady, setVarsReady] = React.useState(false);

    const StaleMessage = () => {
		const STALETHRESHOLD = 3;	// in hours
		if (showIfStale && new Date().getTime() - (playerData.calc?.lastModified?.getTime() ?? 0) > STALETHRESHOLD * 60 * 60 * 1000) {
			return (
				<Message
					warning
					icon='clock'
					header='Update your player data'
					content="It's been a few hours since you last updated your player data. We recommend that you update now to make sure our tools are providing you recent information about your crew."
					onDismiss={() => setShowIfStale(false)}
				/>
			);
		}
		else {
			return (<></>);
		}
	};

	const ShareMessage = () => {
		if (!showShare) return (<></>);

		// The option to auto-share profile only appears after a profile is uploaded or if previously set to auto-update
		const bShowUploaded = profileUploaded || profileAutoUpdate;
		const [shareExpanded, setShareExpanded] = useStateWithStorage("player/shareExpanded", true, { rememberForever: true });

		return (

			<Accordion
					defaultActiveIndex={(shareExpanded || bShowUploaded) ? 0 : -1}
					onTitleClick={(e, { active }) => {
						setShareExpanded(!shareExpanded);
					}}
					panels={[
						{
							active: shareExpanded || bShowUploaded,
							index: 0,
							key: 0,
							title: 'Share Form Data (Click Here)',
							content: {
								content: (
									<Message icon onDismiss={() => setShowShare(false)}>
									<Icon name='share alternate' />
									<Message.Content>
										<Message.Header>Share your player profile!</Message.Header>
										{!bShowUploaded && (
											<div>
												<p>
													Click here to{' '}
													<Button size='small' color='green' onClick={() => shareProfile()}>
														{profileUploading && <Icon loading name='spinner' />}share your profile
													</Button>{' '}
													and unlock more tools and export options for items and ships. More details:
												</p>
												<Message.List>
													<Message.Item>
														Once shared, the profile will be publicly accessible, will be accessible by your DBID link, and linked on related pages (such as fleet pages & event pages)
													</Message.Item>
													<Message.Item>
														There is no private information included in the player profile; information being shared is limited to:{' '}
														<b>captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
													</Message.Item>
												</Message.List>
											</div>
										)}
										{bShowUploaded && (
											<Form.Group>
												<p>
													Your profile was uploaded. Share the link:{' '}
													<a
														href={`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}
														target='_blank'>{`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}</a>
												</p>
												<Form.Field
													control={Checkbox}
													label='Automatically share profile after every import'
													checked={profileAutoUpdate}
													onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
												/>
											</Form.Group>
										)}
									</Message.Content>
								</Message>
								)
							}
						}
					]}
				/>

		);
	};

	// if (!varsReady)
	// 	return (<PlayerToolsLoading />);

	const PlayerLevelProgress = () => {
		const endingValue = playerData.player.character.xp_for_next_level - playerData.player.character.xp_for_current_level;
		const currentValue = playerData.player.character.xp - playerData.player.character.xp_for_current_level;
		const percent = (currentValue / endingValue) * 100;
		return (
			<Progress
				percent={percent.toPrecision(3)}
				label={`Level ${playerData.player.character.level}: ${playerData.player.character.xp} / ${playerData.player.character.xp_for_next_level}`}
				progress
			/>
		);
	};

	return (
		<>
			<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>
			<PlayerLevelProgress />
			<StaleMessage />
			<Menu compact stackable>
				<Menu.Item>
					Last imported: {playerData.calc?.lastModified?.toLocaleString()}
				</Menu.Item>
				<Dropdown item text='Profile options'>
					<Dropdown.Menu>
						<Dropdown.Item onClick={() => requestShowForm(true)}>Update now...</Dropdown.Item>
						{!showShare && (<Dropdown.Item onClick={() => setShowShare(true)}>Share profile...</Dropdown.Item>)}
						<Dropdown.Item onClick={() => requestClearData()}>Clear player data</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
				<Dropdown item text='Export'>
					<Dropdown.Menu>
						<Popup basic content='Download crew data as traditional comma delimited CSV file' trigger={
							<Dropdown.Item onClick={() => exportCrewTool()} content='Download CSV...' />
						} />
						<Popup basic content='Copy crew data to clipboard in Google Sheets format' trigger={
							<Dropdown.Item onClick={() => exportCrewToClipboard()} content='Copy to clipboard' />
						} />
					</Dropdown.Menu>
				</Dropdown>
			</Menu>

			<React.Fragment>
				<ShareMessage />
			</React.Fragment>
		</>
	);

	function variableReady(keyName: string) {
		setVarsReady(true);
	}

	function shareProfile() {
		setProfileUploading(true);

		let jsonBody = JSON.stringify({
			dbid: playerData.player.dbid,
			player_data: strippedPlayerData
		});

		fetch(`${process.env.GATSBY_DATACORE_URL}api/post_profile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			if (!profileAutoUpdate) window.open(`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`, '_blank');
			setProfileUploading(false);
			setProfileUploaded(true);
			setProfileShared(true);
		});
	}

	function exportCrewTool() {
		let text = playerData.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard() {
		let text = playerData.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
	}
}