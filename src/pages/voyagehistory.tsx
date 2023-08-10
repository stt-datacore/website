import React from 'react';
import { Link } from 'gatsby';
import { Header, Message } from 'semantic-ui-react';

import { DataContext } from '../context/datacontext';
import { PlayerContext } from '../context/playercontext';

import Layout from '../components/layout';
import { IHistoryContext, IVoyageHistory } from '../components/voyagehistory/model';
import { defaultHistory } from '../components/voyagehistory/utils';
import { HistoryContext } from '../components/voyagehistory/context';
import { VoyagesTable } from '../components/voyagehistory/voyagestable';
import { CrewTable } from '../components/voyagehistory/crewtable';

import { useStateWithStorage } from '../utils/storage';

const VoyageHistoryPage = () => {
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

	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items', 'ship_schematics']) : false;

	return (
		<Layout title='Voyage History'>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<Header as='h2'>Voyage History</Header>
					<p>Keep track of your voyages, see how your runtimes compare to your initial estimates, and identify the crew you use most often.</p>
					{!playerContext.loaded &&
						<Message>
							This page requires player data. <b><Link to='/playertools?tool=voyage'>Upload your player data now</Link></b>.
						</Message>
					}
					{playerContext.loaded && <PlayerVoyageHistory dbid={playerContext.playerData.player.dbid as string} />}
				</React.Fragment>
			}
		</Layout>
	);
};

type PlayerVoyageHistoryProps = {
	dbid: string;
};

const PlayerVoyageHistory = (props: PlayerVoyageHistoryProps) => {
	const coreData = React.useContext(DataContext);
	//const playerContext = React.useContext(PlayerContext);

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true } );

	const historyContext = {
		history, setHistory,
		dbid: props.dbid
	} as IHistoryContext;

	return (
		<HistoryContext.Provider value={historyContext}>
			<div style={{ marginTop: '2em' }}>
				{history.voyages.length === 0 &&
					<Message>
						You have no tracked voyages yet. <b><Link to='/playertools?tool=voyage'>Use the voyage calculator</Link></b> to start tracking now.
					</Message>
				}
				{history.voyages.length > 0 &&
					<React.Fragment>
						<VoyagesTable />
						<CrewTable />
					</React.Fragment>
				}
			</div>
		</HistoryContext.Provider>
	);
};

export default VoyageHistoryPage;
