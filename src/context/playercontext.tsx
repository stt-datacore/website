import React from 'react';

import { DataContext } from './datacontext';

import { prepareProfileData } from '../utils/crewutils';
import { stripPlayerData } from '../utils/playerutils';

const defaultPlayer = {
	loaded: false,
	profile: undefined,
	ephmeral: undefined,
	stripped: undefined,
	setInput: undefined,
	reset: undefined
};

export const PlayerContext = React.createContext(defaultPlayer);

export const PlayerProvider = (props) => {
	const { children } = props;
	const coreData = React.useContext(DataContext);

	const [loaded, setLoaded] = React.useState(false);
	const [profile, setProfile] = React.useState(undefined);

	// Can store stripped and ephemeral in sessionStorage to remember playerData across reloads
	//	OR store stripped in localStorage to remember across tabs and sessions
	const [stripped, setStripped] = React.useState(undefined);
	const [ephemeral, setEphemeral] = React.useState(undefined);

	const [input, setInput] = React.useState(undefined);

	const providerValue = {
		loaded,
		profile,
		ephemeral,
		stripped,
		setInput,
		reset
	};

	React.useEffect(() => {
		if (!input) return;

		// ephemeral data (e.g. active crew, active shuttles, voyage data, and event data)
		//	can be misleading when outdated, so keep a copy for the current session only
		const activeCrew = [];
		input.player.character.crew.forEach(crew => {
			if (crew.active_status > 0) {
				activeCrew.push({ symbol: crew.symbol, rarity: crew.rarity, level: crew.level, equipment: crew.equipment.map((eq) => eq[0]), active_status: crew.active_status });
			}
		});
		setEphemeral({
			activeCrew,
			events: [...input.player.character.events],
			fleetBossBattlesRoot: input.fleet_boss_battles_root,
			shuttleAdventures: [...input.player.character.shuttle_adventures],
			voyage: [...input.player.character.voyage],
			voyageDescriptions: [...input.player.character.voyage_descriptions]
		});

		const dtImported = new Date();

		// stripped is used for any storage purpose, i.e. sharing profile and keeping in session
		//	Ephmeral data is stripped from playerData here
		const strippedData = stripPlayerData(coreData.items, {...input});
		strippedData.calc = { 'lastImported': dtImported };
		setStripped(JSON.parse(JSON.stringify(strippedData)));

		// preparedProfileData is expanded with useful data and helpers for DataCore and hopefully generated once
		//	so other components don't have to keep calculating the same data
		// Pass playerData.profile as playerData to existing player tools
		let preparedProfileData = {...strippedData};
		prepareProfileData(coreData.crew, preparedProfileData, dtImported);
		setProfile(preparedProfileData);

		setLoaded(true);
	}, [input]);

	return (
		<PlayerContext.Provider value={providerValue}>
			{children}
		</PlayerContext.Provider>
	);

	function reset(): void {
		setStripped(undefined);
		setEphemeral(undefined);
		setProfile(undefined);
		setLoaded(false);
	}
};