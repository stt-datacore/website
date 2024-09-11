import React from 'react';

import { Estimate } from '../../model/worker';
import { IVoyageCalcConfig } from '../../model/voyage';
import { Accordion, Icon, Segment, SemanticICONS } from 'semantic-ui-react';

type VPGraphProps = {
	voyageConfig: IVoyageCalcConfig;
	estimate: Estimate;
};

export const VPGraphAccordion = (props: VPGraphProps) => {
	const { voyageConfig, estimate } = props;

	const [isActive, setIsActive] = React.useState<boolean>(false);

	if (!estimate.vpDetails) return <></>;

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				Projected VP: {estimate.vpDetails.total_vp.toLocaleString()}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && renderContent()}
			</Accordion.Content>
		</Accordion>
	);

	function renderContent(): JSX.Element {
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
			<p>Explanation and other details to come.</p>
			<p>Note that VP projections rely on a voyage's estimated runtime, which DataCore currently calculates as if this were a dilemma voyage.</p>
		</React.Fragment>
	);
}