import React, { PureComponent } from 'react';

import VoyageHOF from '../components/hof/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	render() {
			return (
				<DataPageLayout>
					<React.Fragment>
						<CrewHoverStat targetGroup='voyagehof' />
						<ItemHoverStat activationDelay={250} compact targetGroup='voyagehofitem' />
						<VoyageHOF />
					</React.Fragment>
				</DataPageLayout>
			);
	}
}

export default HallOfFamePage;
