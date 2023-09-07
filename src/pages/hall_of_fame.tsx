import React, { PureComponent } from 'react';

import VoyageHOF from '../components/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	render() {
			return (
				<DataPageLayout pageTitle='Hall of Fame'>
					<VoyageHOF />
				</DataPageLayout>
			);
	}
}

export default HallOfFamePage;
