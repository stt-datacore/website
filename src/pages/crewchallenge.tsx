import React from 'react';

import DataPageLayout from '../components/page/datapagelayout';

import { Worfle } from '../components/worfle/worfle';

const PAGE_TITLE = 'Worfle Crew Challenge';

const CrewChallenge = () => {
	return (
		<DataPageLayout pageTitle={PAGE_TITLE}>
			<Worfle />
		</DataPageLayout>
	);
};

export default CrewChallenge;
