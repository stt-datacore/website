import React from 'react';
import { Link, navigate } from 'gatsby';
import { Message, Button } from 'semantic-ui-react';

import { IVoyageHistory } from '../model/voyage';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { useStateWithStorage } from '../utils/storage';

import { IHistoryContext, HistoryContext } from '../components/voyagehistory/context';
import { VoyagesTable } from '../components/voyagehistory/voyagestable';
import { CrewTable } from '../components/voyagehistory/crewtable';
import { defaultHistory } from '../components/voyagehistory/utils';

import { ActiveVoyage } from '../components/voyagecalculator/activevoyage';

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
				{playerData && <PlayerVoyageHistory key={`${playerData.player.dbid}`} dbid={`${playerData.player.dbid}`} />}
			</React.Fragment>
		</DataPageLayout>
	);
};

type PlayerVoyageHistoryProps = {
	dbid: string;
};

const PlayerVoyageHistory = (props: PlayerVoyageHistoryProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [history, setHistory] = useStateWithStorage<IVoyageHistory>(props.dbid+'/voyage/history', defaultHistory, { rememberForever: true, compress: true, onInitialize: () => setHistoryReady(true) } );
	const [historyReady, setHistoryReady] = React.useState(false);
	const [activeVoyageId, setActiveVoyageId] = React.useState(0);

	React.useEffect(() => {
		const activeVoyageId = ephemeral?.voyage?.length ? ephemeral.voyage[0].id : 0;
		setActiveVoyageId(activeVoyageId);
	}, [playerData]);

	const historyContext = {
		history, setHistory, activeVoyageId
	} as IHistoryContext;

	const actionButtons = [
		<Button key='active'
			content='View active voyage'
			icon='exchange'
			size='large'
			onClick={()=> navigate('/voyage')}
		/>
	] as JSX.Element[];

	return (
		<HistoryContext.Provider value={historyContext}>
			<React.Fragment>
				{activeVoyageId > 0 &&
					<ActiveVoyage
						history={historyReady ? history : undefined}
						setHistory={setHistory}
						showDetails={false}
						actionButtons={actionButtons}
					/>
				}
				{history.voyages.length === 0 &&
					<Message>
						You have no tracked voyages yet.{activeVoyageId === 0 && <>{` `}<b><Link to='/voyage'>Use the voyage calculator</Link></b> to start tracking now.</>}
					</Message>
				}
				{history.voyages.length > 0 &&
					<React.Fragment>
						<VoyagesTable activeVoyageId={activeVoyageId} />
						<CrewTable />
					</React.Fragment>
				}
			</React.Fragment>
		</HistoryContext.Provider>
	);
};

export default VoyageHistoryPage;
