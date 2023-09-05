import React, { PureComponent } from 'react';

import Layout from '../components/layout';
import VoyageHOF from '../components/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	render() {
			return (
				<DataPageLayout title='Hall of Fame'>
					<VoyageHOF />
				</DataPageLayout>
			);
	}
}

export default HallOfFamePage;
