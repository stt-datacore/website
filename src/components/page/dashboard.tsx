import React from 'react';

import { Notification } from './notification';
import { GlobalContext } from '../../context/globalcontext';
import Announcement from '../../components/announcement';

import { PlayerInfo } from '../../components/playerdata/playerinfo';
import { PlayerShareNotifications, PlayerSharePanel } from '../../components/playerdata/playershare';
import { PlayerGlance } from './playerglance';

type DashboardProps = {
	openInputPanel: () => void;
	activePanel: string | undefined;
	setActivePanel: (panel: string | undefined) => void;
	narrow: boolean;
};

const Dashboard = (props: DashboardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const [dbidHash, setDbidHash] = React.useState<string | undefined>(undefined);
	const isMobile = globalContext.isMobile;
	const { playerData, showPlayerGlance, setShowPlayerGlance } = globalContext.player;
	const { t } = globalContext.localized;
	const { activePanel, setActivePanel, narrow, openInputPanel } = props;
	const [mobileHideOverride, setMobileHideOverride] = React.useState(false);
	const [hideOverrideHidden, setHideOverrideHidden] = React.useState(false);

	return (
		<React.Fragment>
			<Announcement />

			{!!playerData && showPlayerGlance && (!isMobile || mobileHideOverride) &&
				<PlayerGlance
					openPlayerPanel={() => openInputPanel()}
					t={t}
					narrow={narrow}
					requestDismiss={() => { setShowPlayerGlance(false) }} />}

			{!!playerData && showPlayerGlance && (isMobile && !mobileHideOverride) && !hideOverrideHidden &&
			<Notification
				header='Player info hidden on mobile'
				content={
					<p>
						Tap here to see it.
					</p>
				}
				icon='unhide'
				onClick={() => setMobileHideOverride(true)}
				onDismiss={() => setHideOverrideHidden(true)}
			/>
			}
			{playerData && showPlayerGlance && (isMobile && mobileHideOverride) && !hideOverrideHidden &&
			<Notification
				header='Hide player info'
				content={
					<p>
						Tap here to collapse the panel above.
					</p>
				}
				icon='hide'
				onClick={() => setMobileHideOverride(false)}
				//onDismiss={() => setHideOverrideHidden(true)}
			/>
			}
			{playerData &&
				<PlayerShareNotifications
					dbidHash={dbidHash}
					setDbidHash={setDbidHash}
					dbid={`${playerData.player.dbid}`}
					activePanel={activePanel}
					setActivePanel={setActivePanel}
				/>
			}

			{activePanel === 'share' &&
				<PlayerSharePanel
					dbidHash={dbidHash}
					requestDismiss={() => { setActivePanel(undefined); }}
				/>
			}
			{activePanel === 'info' &&
				<PlayerInfo
					requestDismiss={() => { setActivePanel(undefined); }}
				/>
			}


		</React.Fragment>
	);
};

export default Dashboard;