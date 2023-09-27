import React from 'react';

import { BossCrew, ExportPreferences, SoloPreferences, SpotterPreferences, UserPreferences } from '../model/boss';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import { crewCopy } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';

import { userDefaults, exportDefaults, soloDefaults, spotterDefaults } from '../components/fleetbossbattles/fbbdefaults';
import { IUserContext, UserContext } from '../components/fleetbossbattles/context';
import { ChainPicker } from '../components/fleetbossbattles/chainpicker';

const FleetBossBattlesPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const dbid = playerData?.player.dbid ?? '';

	return (
		<DataPageLayout
			pageTitle='Fleet Boss Battles'
			pageDescription='Use this tool to help activate combo chain bonuses in a fleet boss battle.'
			playerPromptType='require'
		>
			<React.Fragment>
				{playerData && <PlayerFBB dbid={`${dbid}`} />}
			</React.Fragment>
		</DataPageLayout>
	);
};

type PlayerFBBProps = {
	dbid: string;
};

const PlayerFBB = (props: PlayerFBBProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [bossCrew, setBossCrew] = React.useState<BossCrew[] | undefined>(undefined);
	const [userPrefs, setUserPrefs] = useStateWithStorage<UserPreferences>(props.dbid+'/fbb/prefs', userDefaults, { rememberForever: true });
	const [spotterPrefs, setSpotterPrefs] = useStateWithStorage<SpotterPreferences>(props.dbid+'/fbb/filtering', spotterDefaults, { rememberForever: true });
	const [soloPrefs, setSoloPrefs] = useStateWithStorage<SoloPreferences>(props.dbid+'/fbb/soloing', soloDefaults, { rememberForever: true });
	const [exportPrefs, setExportPrefs] = useStateWithStorage<ExportPreferences>(props.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	React.useEffect(() => {
		// Calculate highest owned rarities
		const bossCrew = crewCopy(globalContext.core.crew) as BossCrew[];
		bossCrew.forEach(crew => {
			const owned = playerData?.player.character.crew.filter(oc => oc.symbol === crew.symbol) ?? [];
			crew.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
			crew.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal > 0).length === owned.length;
		});
		setBossCrew([...bossCrew]);
	}, [playerData]);

	if (!playerData) return <></>;

	const providerValue = {
		userType: 'player',
		bossCrew,
		userPrefs, setUserPrefs,
		spotterPrefs, setSpotterPrefs,
		soloPrefs, setSoloPrefs,
		exportPrefs, setExportPrefs
	} as IUserContext;

	return (
		<React.Fragment>
			<UserContext.Provider value={providerValue}>
				<ChainPicker />
			</UserContext.Provider>
		</React.Fragment>
	);
};

export default FleetBossBattlesPage;
