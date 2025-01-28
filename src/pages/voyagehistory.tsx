import React from 'react';
import { Link } from 'gatsby';

import DataPageLayout from '../components/page/datapagelayout';

const VoyageHistoryPage = () => {
	return (
		<DataPageLayout
			pageTitle='Voyage History'
			pageDescription='Keep track of your voyages, see how your runtimes compare to your initial estimates, and identify the crew you use most often.'
		>
			<React.Fragment>
				<p>The Voyage History tool has moved to the <Link to='/voyage/'>Voyage Calculator</Link>. Please update your bookmarks as needed.</p>
			</React.Fragment>
		</DataPageLayout>
	);
};

export default VoyageHistoryPage;
