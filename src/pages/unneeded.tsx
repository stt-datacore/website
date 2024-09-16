import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';

import { UnneededItems } from '../components/unneededitems';
import { GlobalContext } from '../context/globalcontext';

const UnneededItemsPage = () => {
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<DataPageLayout
			pageTitle={t("items_unneeded.title")}
			pageDescription={t("items_unneeded.description")}
			playerPromptType='require'
			demands={['episodes']}
		>
			<React.Fragment>
				<UnneededItems />
			</React.Fragment>
		</DataPageLayout>
	);
};

export default UnneededItemsPage;
