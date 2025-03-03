import React from 'react';
import {
	Menu
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { HistoryContext } from './context';
import { CrewTable } from './crewtable';
import { DataManagement } from './manage';
import { SyncState } from './utils';
import { VoyagesTable } from './voyagestable';

type HistoryHomeProps = {
	postRemote: boolean;
	setPostRemote: (postRemote: boolean) => void;
	setSyncState: (syncState: SyncState) => void;
};

export const HistoryHome = (props: HistoryHomeProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { history } = React.useContext(HistoryContext);

	const [activeItem, setActiveItem] = React.useState<string>('voyages');

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
				<Menu.Item	/* Voyages */
					content={t('voyage.history.menu.voyages')}
					active={activeItem === 'voyages'}
					onClick={() => setActiveItem('voyages')}
				/>
				<Menu.Item	/* Crew */
					content={t('voyage.history.menu.crew')}
					active={activeItem === 'crew'}
					onClick={() => setActiveItem('crew')}
				/>
				<Menu.Item	/* Manage History */
					content={t('voyage.history.menu.manage')}
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