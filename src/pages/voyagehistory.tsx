import React from 'react';
import { Link } from 'gatsby';
import { Message } from 'semantic-ui-react';

import { IVoyageHistory } from '../model/voyage';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { useStateWithStorage } from '../utils/storage';

import { IHistoryContext, HistoryContext } from '../components/voyagehistory/context';
import { VoyagesTable } from '../components/voyagehistory/voyagestable';
import { CrewTable } from '../components/voyagehistory/crewtable';
import { defaultHistory } from '../components/voyagehistory/utils';

const VoyageHistoryPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	return (
		<DataPageLayout
			pageTitle='Voyage History'
			pageDescription='Keep track of your voyages, see how your runtimes compare to your initial estimates, and identify the crew you use most often.'
			playerPromptType='require'
		>
			<React.Fragment>
				{playerData && <PlayerVoyageHistory dbid={`${playerData.player.dbid}`} />}
			</React.Fragment>
		</DataPageLayout>
	);
};

type PlayerVoyageHistoryProps = {
	dbid: string;
};

const PlayerVoyageHistory = (props: PlayerVoyageHistoryProps) => {
	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true } );

	const historyContext = {
		history, setHistory
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
