import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';

import { RetrievalEnergy } from '../components/retrieval/energy';
import { RetrievalKeystones } from '../components/retrieval/keystones';
import { GlobalContext } from '../context/globalcontext';

const RetrievalPage = () => {
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<DataPageLayout
			pageTitle={t('menu.tools.crew_retrieval')}
			pageDescription={t('retrieval.description')}
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
