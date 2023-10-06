import React, { PureComponent } from 'react';

import VoyageHOF from '../components/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	render() {
			return (
				<DataPageLayout pageTitle='Hall of Fame'>
					<React.Fragment>
						<CrewHoverStat targetGroup='voyagehof' />
						<VoyageHOF />
					</React.Fragment>					
				</DataPageLayout>
			);
	}
}

export default HallOfFamePage;
