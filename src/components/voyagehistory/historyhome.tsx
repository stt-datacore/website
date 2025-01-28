import React from 'react';
import {
	Menu
} from 'semantic-ui-react';

import { HistoryContext } from './context';
import { VoyagesTable } from './voyagestable';
import { CrewTable } from './crewtable';
import { DataManagement } from './manage';
import { SyncState } from './utils';
import { GlobalContext } from '../../context/globalcontext';

type HistoryHomeProps = {
	postRemote: boolean;
	setPostRemote: (postRemote: boolean) => void;
	setSyncState: (syncState: SyncState) => void;
};

export const HistoryHome = (props: HistoryHomeProps) => {
	const { history } = React.useContext(HistoryContext);
	const [activeItem, setActiveItem] = React.useState<string>('voyages');
	const { t } = React.useContext(GlobalContext).localized;
	if (history.voyages.length === 0) {
		return (
			<React.Fragment>
				<p>{t('voyage.history.not_yet')}</p>
				{/* <p>You don't have any voyage history yet. Start tracking voyages from the crew calculator. You can also import voyage history from remote sync or from a saved file.</p> */}
				<DataManagement
					postRemote={props.postRemote}
					setPostRemote={props.setPostRemote}
					setSyncState={props.setSyncState}
				/>
			</React.Fragment>
		);
	}

	return (
		<React.Fragment>
			<Menu secondary>
				<Menu.Item
					content='Voyages'
					active={activeItem === 'voyages'}
					onClick={() => setActiveItem('voyages')}
				/>
				<Menu.Item
					content='Crew'
					active={activeItem === 'crew'}
					onClick={() => setActiveItem('crew')}
				/>
				<Menu.Item
					content='Manage History'
					active={activeItem === 'manage'}
					onClick={() => setActiveItem('manage')}
				/>
			</Menu>
			{activeItem === 'voyages' && <VoyagesTable />}
			{activeItem === 'crew' && <CrewTable />}
			{activeItem === 'manage' && (
				<DataManagement
					postRemote={props.postRemote}
					setPostRemote={props.setPostRemote}
					setSyncState={props.setSyncState}
				/>
			)}
		</React.Fragment>
	);
}