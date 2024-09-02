import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';
import { VoyageHome } from '../components/voyagecalculator/home';

const VoyagePage = () => {
	return (
		<DataPageLayout
			pageTitle='Voyage Calculator'
			pageDescription='Find the best crew for your voyages and get estimates on how long they will run.'
			playerPromptType='recommend'
			demands={['collections', 'event_instances']}
		>
			<VoyageHome />
		</DataPageLayout>
	);
};

export default VoyagePage;
