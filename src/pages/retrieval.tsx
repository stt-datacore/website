import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';

import { RetrievalEnergy } from '../components/retrieval/energy';
import { RetrievalKeystones } from '../components/retrieval/keystones';

const RetrievalPage = () => {
	return (
		<DataPageLayout
			pageTitle='Crew Retrieval'
			pageDescription='Find the best options for adding crew to your roster via crew retrieval.'
			playerPromptType='recommend'
			demands={['keystones', 'collections']}
		>
			<React.Fragment>
				<RetrievalEnergy />
				<RetrievalKeystones />
			</React.Fragment>
		</DataPageLayout>
	);
};

export default RetrievalPage;
