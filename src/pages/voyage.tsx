import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';
import { VoyageHome } from '../components/voyagecalculator/home';
import { GlobalContext } from '../context/globalcontext';

const VoyagePage = () => {
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<DataPageLayout
			pageTitle={t('menu.tools.voyage_calculator')}
			pageDescription={t('menu.descriptions.voyage_calculator')}
			playerPromptType='recommend'
			demands={['collections', 'event_instances', 'dilemmas']}
		>
			<VoyageHome />
		</DataPageLayout>
	);
};

export default VoyagePage;
