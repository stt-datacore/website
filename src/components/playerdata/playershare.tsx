import React from 'react';
import { Icon, Button, Form, Checkbox } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { PlayerMessage } from './playermessage';

import { useStateWithStorage } from '../../utils/storage';

type PlayerShareProps = {
	showPanel: boolean;
	dismissPanel: () => void;
};

export const PlayerShare = (props: PlayerShareProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, stripped } = globalContext.player;
	const { showPanel, dismissPanel } = props;

    const dbid = playerData?.player.dbid ?? '';

	const [showMessage, setShowMessage] = useStateWithStorage(dbid + '/tools/showShare', true, { rememberForever: true, onInitialize: variableReady });
	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(dbid + '/tools/profileAutoUpdate', false, { rememberForever: true, onInitialize: variableReady });
	const [varsReady, setVarsReady] = React.useState(0);
	const [shareState, setShareState] = useStateWithStorage('player/shareState', 0);

    if (!playerData || !stripped) return (<></>);
	if (varsReady < 2) return (<></>);	// Escape here if localStorage vars not ready to avoid possibly rendering, then un-rendering shareMessage

	const PROFILELINK = `${process.env.GATSBY_DATACORE_URL}profile/?dbid=${dbid}`;

	return (
		<React.Fragment>
			{(showMessage || showPanel) &&
				<PlayerMessage
					header='Share Your Player Profile!'
					content={<p>You can upload your profile to DataCore so you can easily share some data with other players.</p>}
					icon='share alternate'
					onDismiss={() => { setShowMessage(false); dismissPanel(); }}
				/>
			}
			{showPanel && (
				<React.Fragment>
					<ul>
						<li>Once shared, your public profile will be accessible by anyone with this link: <b><a href={PROFILELINK} target='_blank'>{PROFILELINK}</a></b>.</li>
						<li>Some pages on DataCore, notably fleet pages and event pages, may also link to your public profile.</li>
						<li>
							There is no private information included in the player profile; information being shared is limited to:{' '}
							<b>DBID, captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
						</li>
					</ul>
					{shareState < 2 && (
						<Button color='green' onClick={() => shareProfile()} style={{ marginTop: '1em' }}>
							{shareState === 1 && <Icon loading name='spinner' />}Share your profile
						</Button>
					)}
					{shareState === 2 && (
						<Form.Group>
							<p>
								Your profile was uploaded. Share the link:{' '}
								<b><a href={PROFILELINK} target='_blank'>{PROFILELINK}</a></b>
							</p>
							<Form.Field
								control={Checkbox}
								label='Automatically share profile after every import'
								checked={profileAutoUpdate}
								onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
							/>
						</Form.Group>
					)}
				</React.Fragment>
			)}
		</React.Fragment>
	);

	function variableReady(keyName: string) {
		setVarsReady(prev => prev + 1);
	}

	function shareProfile() {
		setShareState(1);

		let jsonBody = JSON.stringify({
			dbid,
			player_data: stripped
		});

		fetch(`${process.env.GATSBY_DATACORE_URL}api/post_profile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			if (!profileAutoUpdate) window.open(PROFILELINK, '_blank');
			setShareState(2);
		}).catch((e) => {
			console.log(e);
		}).finally(() => {
			setShareState(0);
		});
	}
};
