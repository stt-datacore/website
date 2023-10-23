import React from 'react';

import { InitialOptions } from '../model/game-elements';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { initSearchableOptions, initCustomOption } from '../components/searchabletable';

import { IRosterCrew, RosterType } from '../components/crewtables/model';
import { RosterPicker } from '../components/crewtables/rosterpicker';
import { RosterTable } from '../components/crewtables/rostertable';
import { TinyStore } from '../utils/tiny';
import { navigate } from 'gatsby';

type IndexPageProps = {
	location: any;
};

const IndexPage = (props: IndexPageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [initOptions, setInitOptions] = React.useState<InitialOptions | undefined>(undefined);
	const [initHighlight, setInitHighlight] = React.useState('');

	const [rosterType, setRosterType] = React.useState<RosterType>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [searchExtra, setSearchExtra] = React.useState("");

	const tiny = TinyStore.getStore("index");

	tiny.subscribe((name) => {
		if (name === "search") {			
			let search = tiny.getRapid<string>('search') ?? '';
			navigate("/?search=" +  search)
			setSearchExtra(search);
		}
	});
	
	React.useEffect(() => {
		// Check for custom initial table options from URL or <Link state>
		const initOptions = initSearchableOptions(props.location);
		// Check for custom initial index options from URL or <Link state>
		const initHighlight = initCustomOption(props.location, 'highlight', '');
		// Clear history state now so that new stored values aren't overriden by outdated parameters
		if (props.location.state && (initOptions || initHighlight) && window)
			window.history.replaceState(null, '');

		setInitOptions(initOptions);
		setInitHighlight(initHighlight);
	}, [searchExtra]);

	return (
		<DataPageLayout pageTitle='Crew Stats' playerPromptType='recommend'>
			<React.Fragment>
				<RosterPicker
					rosterType={rosterType} setRosterType={setRosterType}
					setRosterCrew={setRosterCrew}
				/>
				{rosterCrew &&
					<RosterTable key={playerData ? 'playerViews' : 'singleView'}
						pageId='index'
						rosterCrew={rosterCrew} rosterType={rosterType}
						initOptions={initOptions} initHighlight={initHighlight}
					/>
				}
			</React.Fragment>
		</DataPageLayout>
	);
};

export default IndexPage;
