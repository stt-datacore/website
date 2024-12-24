import React from "react";
import { Helper } from "../helpers/Helper";
import { Message, Button, Popup, Tab } from "semantic-ui-react";


export type ErrorPaneProps = {
	errorMessage?: string;
	resultIndex: number;
	requests: Helper[];
	requestId: string;
	dismissResult: (resultIndex: number) => void;
};

export const ErrorPane = (props: ErrorPaneProps) => {
	const { errorMessage, resultIndex, requests, requestId, dismissResult } = props;

	const request = requests.find(r => r.id === requestId);
	if (!request) return (<></>);

	const renderInputOptions = () => {
		const inputs = Object.entries(request.calcOptions).map(entry => entry[0]+': '+entry[1]);
		inputs.unshift('considered crew: '+request.consideredCrew.length);
		return (<>{inputs.join(', ')}</>);
	};

	return (
		<React.Fragment>
			<Message attached negative>
				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '1em' }}>
					<div>
						{errorMessage ?? 'The voyage calculator encountered an error!'}
					</div>
					<div>
						<Button.Group>
							<Popup position='top center'
								content={<>Dismiss this recommendation</>}
								trigger={
									<Button icon='ban' onClick={() => dismissResult(resultIndex)} />
								}
							/>
						</Button.Group>
					</div>
				</div>
			</Message>
			<Tab.Pane>
				<p>The voyage calculator is unable to recommend lineups for the requested options ({renderInputOptions()}). Please try again using different options.</p>
			</Tab.Pane>
		</React.Fragment>
	);
}
