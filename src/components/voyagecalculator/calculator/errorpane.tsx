import React from 'react';
import {
	Button,
	Message,
	Popup,
	Tab
} from 'semantic-ui-react';

import { IVoyageRequest } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

export type ErrorPaneProps = {
	resultId: string;
	errorMessage?: string;
	requests: IVoyageRequest[];
	requestId: string;
	dismissResult: (resultId: string) => void;
};

export const ErrorPane = (props: ErrorPaneProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { resultId, errorMessage, requests, requestId, dismissResult } = props;

	const request = requests.find(r => r.id === requestId);
	if (!request) return <></>;

	const renderInputOptions = () => {
		if (!request.calcHelper) return <></>;
		const inputs = Object.entries(request.calcHelper.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return <>{inputs.join(', ')}</>;
	};

	return (
		<React.Fragment>
			<Message attached negative>
				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
					<div>
						{errorMessage ?? t('voyage.results.messages.generic_error')}
					</div>
					<div>
						<Button.Group>
							<Popup position='top center'
								content={<>{t('voyage.results.actions.dismiss')}</>}
								trigger={
									<Button icon='ban' onClick={() => dismissResult(resultId)} />
								}
							/>
						</Button.Group>
					</div>
				</div>
			</Message>
			<Tab.Pane>
				<p>{tfmt('voyage.results.messages.failed_with_inputs', { inputs: renderInputOptions() })}</p>
			</Tab.Pane>
		</React.Fragment>
	);
}
