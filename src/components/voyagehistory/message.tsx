import React from 'react';
import {
	Message,
	SemanticICONS
} from 'semantic-ui-react';

import { HistoryContext } from './context';

interface IHistoryMessages {
	[key: string]: IHistoryMessage;
};

interface IHistoryMessage {
	icon?: SemanticICONS;
	negative?: boolean;
	content: string;
};

export const HistoryMessage = () => {
	const { messageId, setMessageId } = React.useContext(HistoryContext);
	if (messageId === '') return <></>;

	const retryMessage: string = 'Please try again. If the error persists, contact the DataCore support team.';
	const unsupportedMessage: string = 'This action may not be supported yet.';

	const messages: IHistoryMessages = {};
	messages['voyage.history_msg.read_only'] = {
		icon: 'warning sign',
		content: `Warning! Unable to sychronize remote voyage history. You can view tracked voyages from the most recent sync, but you will not be able to track any new voyages. Please reload this page to try synchronizing again.`
	};
	messages['voyage.history_msg.failed_transition'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Unable to enable remote sync. ${retryMessage}`
	};
	messages['voyage.history_msg.failed_to_connect'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Unable to connect to remote sync. ${retryMessage}`
	};
	messages['voyage.history_msg.failed_to_track'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Unable to track voyage. ${retryMessage}`
	};
	messages['voyage.history_msg.failed_to_update'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Unable to update voyage history. ${retryMessage}`
	};
	messages['voyage.history_msg.failed_to_delete'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Unable to delete voyage history. ${retryMessage}`
	};
	messages['voyage.history_msg.invalid_sync_state'] = {
		icon: 'warning sign',
		negative: true,
		content: `Error! Invalid sync state. ${retryMessage}`
	};

	messages['_default'] = {
		icon: 'question circle',
		content: `Unspecified error. ${retryMessage}`
	};

	const message: IHistoryMessage = messages[messageId] ?? messages['_default'];
	return (
		<Message
			icon={message.icon}
			negative={message.negative}
			content={message.content}
			onDismiss={() => setMessageId('')}
		/>
	);
};
