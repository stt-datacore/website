import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';

import { UnneededItems } from '../components/unneededitems';

const UnneededItemsPage = () => {
	return (
		<DataPageLayout
			pageTitle='Unneeded Items'
			pageDescription='Use this tool to help identify items you can safely discard to free up space in your inventory.'
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
