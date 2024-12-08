import React, { useState } from 'react';

import { InitialOptions } from '../model/game-elements';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { initSearchableOptions, initCustomOption } from '../components/searchabletable';

import { IRosterCrew, RosterType } from '../components/crewtables/model';
import { RosterPicker } from '../components/crewtables/rosterpicker';
import { RosterTable } from '../components/crewtables/rostertable';
import { TinyStore } from '../utils/tiny';
import { navigate } from 'gatsby';
import { useStateWithStorage } from '../utils/storage';
import { PlayerBuffMode } from '../model/player';

type IndexPageProps = {
	location: any;
};

const IndexPage = (props: IndexPageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;

	const [initOptions, setInitOptions] = React.useState<InitialOptions | undefined>(undefined);
	const [initHighlight, setInitHighlight] = React.useState('');

	//const [rosterType, setRosterType] = useStateWithStorage<RosterType>(`roster/rosterType`, playerData ? 'myCrew' : 'allCrew');
	const [rosterType, setRosterType] = React.useState<RosterType>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [searchExtra, setSearchExtra] = React.useState<string | undefined>(undefined);

	const [playerBuffMode, setPlayerBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>("roster/buffMode/player", 'player', { rememberForever: true });
	const [buffMode, setBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>("roster/buffMode/static", 'none', { rememberForever: true });

	const tiny = TinyStore.getStore("index");

	tiny.subscribe((name) => {
		if (name === "search") {
			let search = tiny.getRapid<string>('search') ?? '';
			history.pushState({}, "", "/?search=" + search);
			window.setTimeout(() => {
				setSearchExtra(search);
			});
		}
	});

	React.useEffect(() => {
		// Check for custom initial table options from URL or <Link state>
		const initOptions = initSearchableOptions(props.location, searchExtra);
		// Check for custom initial index options from URL or <Link state>
		const initHighlight = initCustomOption(props.location, 'highlight', '');
		// Clear history state now so that new stored values aren't overriden by outdated parameters
		if (props.location.state && (initOptions || initHighlight) && window)
			window.history.replaceState(null, '');

		setInitOptions(initOptions);
		setInitHighlight(initHighlight);
	}, [searchExtra]);

	return (
		<DataPageLayout pageTitle={t('pages.crew_stats')} playerPromptType='recommend' demands={['continuum_missions']}>
			<React.Fragment>
				<RosterPicker
					buffMode={playerData ? playerBuffMode : buffMode}
					rosterType={rosterType} setRosterType={setRosterType}
					setRosterCrew={setRosterCrew}
				/>
				{rosterCrew &&
					<RosterTable key={playerData ? 'playerViews' : 'singleView'}
						buffMode={playerData ? playerBuffMode : buffMode}
						setBuffMode={playerData ? setPlayerBuffMode : setBuffMode}
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
