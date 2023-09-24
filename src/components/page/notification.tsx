import React from 'react';
import { Message, Icon, SemanticICONS } from 'semantic-ui-react';

type NotificationProps = {
	header: string;
	content: JSX.Element;
	icon?: SemanticICONS;
	warning?: boolean;
	negative?: boolean;
	onClick?: () => void;
	onDismiss?: () => void;
};

export const Notification = (props: NotificationProps) => {
	return (
		<Message
			icon={props.icon ? true : undefined}
			warning={props.warning}
			negative={props.negative}
			onClick={() => { if (props.onClick) props.onClick(); }}
			onDismiss={props.onDismiss ? (e) => { if (props.onDismiss) { props.onDismiss(); e.preventDefault(); e.stopPropagation(); } } : undefined}
			style={{ cursor: props.onClick ? 'pointer' : 'auto' }}
		>
			{props.icon && <Icon name={props.icon} />}
			<Message.Content>
				<Message.Header>
					{props.header}
				</Message.Header>
				{props.content}
			</Message.Content>
		</Message>
	);
};
