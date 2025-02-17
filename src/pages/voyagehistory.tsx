import React from 'react';
import { Link } from 'gatsby';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

const VoyageHistoryPage = () => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	return (
		<DataPageLayout
			pageTitle={t('menu.tools.voyage_history')}
			pageDescription={t('voyage.history.description')}
		>
			<React.Fragment>
				<p>
					{tfmt('voyage.history.moved', {
						link: <Link to='/voyage/'>{t('menu.tools.voyage_calculator')}</Link>
					})}
				</p>
			</React.Fragment>
		</DataPageLayout>
	);
};

export default VoyageHistoryPage;
