import React from 'react';
import {
	Button,
	Message
} from 'semantic-ui-react';

import { downloadData } from '../../utils/crewutils';

import { HistoryContext } from './context';

export const DataManagement = () => {
	const { history } = React.useContext(HistoryContext);

	return (
		<Message style={{ marginTop: '3em' }}>
			<Message.Content>
				<Message.Header>Data Management</Message.Header>
				<p>Voyage history is currently not synchronizing across multiple devices. You can only view and update past voyages on the device where you initially tracked them.</p>
				<p>Remote sync and import options are in development.</p>
				<Button icon='download' content='Save history to device' onClick={() => exportHistory()} />
			</Message.Content>
		</Message>
	);

	function exportHistory(clipboard?: boolean): void {
		const text: string = JSON.stringify(history);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(`data:text/json;charset=utf-8,${encodeURIComponent(text)}`, 'history.json');
	}
};
