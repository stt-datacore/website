import React, { PureComponent } from 'react';

import Layout from '../components/layout';
import VoyageHOF from '../components/voyagehof';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	render() {
			return (
				<Layout title='Hall of Fame'>
					<VoyageHOF />
				</Layout>
			);
	}
}

export default HallOfFamePage;
