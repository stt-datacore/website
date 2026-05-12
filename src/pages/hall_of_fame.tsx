import React, { PureComponent } from 'react';

import VoyageHOF from '../components/hof/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { Navigate, NavigateFunction, NavigateOptions, To } from 'react-router-dom';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
	navLink?: string,
	navOptions?: NavigateOptions;
};

class HallOfFamePage extends PureComponent<HallOfFamePageProps, HallOfFamePageState> {

	navigate(link: string, options?: NavigateOptions) {
		this.setState({...this.state, navLink: link, navOptions: options });
	}

	render() {
		const { navLink, navOptions } = this.state;

		if (navLink) {
			return (
				<Navigate to={navLink} replace={navOptions?.replace} />
			)
		}
		return (
			<DataPageLayout>
				<React.Fragment>
					<CrewHoverStat targetGroup='voyagehof' />
					<ItemHoverStat activationDelay={250} compact targetGroup='voyagehofitem' />
					<VoyageHOF navigate={this.navigate as NavigateFunction} />
				</React.Fragment>
			</DataPageLayout>
		);
	}


}

export default HallOfFamePage;
