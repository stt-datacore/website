import React from 'react';
import {
	Accordion,
	Icon,
	Message,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { Estimate, IVoyageCalcConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

type VPGraphProps = {
	voyageConfig: IVoyageCalcConfig;
	estimate: Estimate;
};

export const VPGraphAccordion = (props: VPGraphProps) => {
	const { voyageConfig, estimate } = props;
	const { t } = React.useContext(GlobalContext).localized;
	const [isActive, setIsActive] = React.useState<boolean>(false);

	if (!estimate.vpDetails) return <></>;

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage.estimate.projected_vp')}: {estimate.vpDetails.total_vp.toLocaleString()} <span style={{ margin: '0 .5em' }}>/</span> {Math.floor(estimate.vpDetails.vp_per_min)} per minute
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && renderContent()}
			</Accordion.Content>
		</Accordion>
	);

	function renderContent(): React.JSX.Element {
		return (
			<Segment>
				<VPGraph voyageConfig={voyageConfig} estimate={estimate} />
			</Segment>
		);
	}
};

export const VPGraph = (props: VPGraphProps) => {
	return (
		<React.Fragment>
			<Message>
				<Message.Content>
					<Message.Header>
						Disclaimers
					</Message.Header>
					<p>VP calculations are based on assumptions from the test voyage event and may not be accurate for this event or events going forward.</p>
					<p>DataCore currently estimates an encounter voyage's runtime as if it were a dilemma voyage. It is not yet known how accurate this is.</p>
				</Message.Content>
			</Message>
		</React.Fragment>
	);
}