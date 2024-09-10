import React from 'react';
import {
	Button,
	Message,
	Popup
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { downloadData } from '../../utils/crewutils';

import { HistoryContext } from './context';
import { mergeHistories } from './utils';

export const DataManagement = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { history, setHistory } = React.useContext(HistoryContext);

	return (
		<Message style={{ marginTop: '3em' }}>
			<Message.Content>
				<Message.Header>Data Management</Message.Header>
				<p>Voyage history is currently not synchronizing across multiple devices. You can only view and update past voyages on the device where you initially tracked them.</p>
				{/* <Button icon='download' content='Save history to device' onClick={() => exportHistory()} />
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='upload' content='Import history' onClick={() => mergeHistories(history, history)}/>
					}
				/> */}
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
