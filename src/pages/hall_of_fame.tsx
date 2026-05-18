import React, { PureComponent } from 'react';

import VoyageHOF from '../components/hof/voyagehof';
import DataPageLayout from '../components/page/datapagelayout';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { Navigate, NavigateFunction, NavigateOptions, To, useNavigate, useParams } from 'react-router-dom';

type HallOfFamePageProps = {};

type HallOfFamePageState = {
	navLink?: string,
	navOptions?: NavigateOptions;
};

const HallOfFamePage = (props: HallOfFamePageProps) => {

	const params = useParams();

	const navigate = useNavigate();

	return (
		<DataPageLayout>
			<React.Fragment>
				<CrewHoverStat targetGroup='voyagehof' />
				<ItemHoverStat activationDelay={250} compact targetGroup='voyagehofitem' />
				<VoyageHOF navigate={(link: any) => innerNavigate(link)} crew_symbols={params?.crew_symbols} />
			</React.Fragment>
		</DataPageLayout>
	);

	function innerNavigate(link: string) {
		navigate(link, { replace: true });
	}
}

export default HallOfFamePage;
