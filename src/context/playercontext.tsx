import React from 'react';

import { DataContext } from './datacontext';

import { prepareProfileData } from '../utils/crewutils';
import { stripPlayerData } from '../utils/playerutils';

const defaultPlayer = {
	loaded: false,
	profile: undefined,
	strippedPlayerData: undefined,
	voyageData: undefined,
	eventData: undefined,
	fleetbossData: undefined,
	activeCrew: undefined,
	activeShuttles: undefined,
	reset: undefined
};

export const PlayerContext = React.createContext(defaultPlayer);

export const PlayerProvider = (props) => {
	const { children } = props;
	const coreData = React.useContext(DataContext);

	const [loaded, setLoaded] = React.useState(false);

	const [profile, setProfile] = React.useState(undefined);
	const [strippedPlayerData, setStrippedPlayerData] = React.useState(undefined);
	const [voyageData, setVoyageData] = React.useState(undefined);
	const [eventData, setEventData] = React.useState(undefined);
	const [fleetbossData, setFleetbossData] = React.useState(undefined);
	const [activeCrew, setActiveCrew] = React.useState(undefined);
	const [activeShuttles, setActiveShuttles] = React.useState(undefined);

	const [input, setInput] = React.useState(undefined);

	const providerValue = {
		loaded,
		profile,
		voyageData,
		eventData,
		fleetbossData,
		activeCrew,
		activeShuttles,
		setInput,
		reset
	};

	React.useEffect(() => {
		if (!input) return;

		// Active crew, active shuttles, voyage data, and event data will be stripped from playerData,
		//	so store a copy for player tools (i.e. voyage calculator, event planner)
		const activeCrew = [];
		input.player.character.crew.forEach(crew => {
			if (crew.active_status > 0) {
				activeCrew.push({ symbol: crew.symbol, rarity: crew.rarity, level: crew.level, equipment: crew.equipment.map((eq) => eq[0]), active_status: crew.active_status });
			}
		});
		const voyageData = {
			voyage_descriptions: [...input.player.character.voyage_descriptions],
			voyage: [...input.player.character.voyage],
		}
		setVoyageData(voyageData);
		setEventData([...input.player.character.events]);
		setFleetbossData(input.fleet_boss_battles_root);
		setActiveCrew(activeCrew);
		setActiveShuttles([...input.player.character.shuttle_adventures]);

		const dtImported = new Date();

		// strippedPlayerData is used for any storage purpose, i.e. sharing profile and keeping in session
		const strippedData = stripPlayerData(coreData.items, {...input});
		strippedData.calc = { 'lastImported': dtImported };
		setStrippedPlayerData(JSON.parse(JSON.stringify(strippedData)));

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
		setProfile(undefined);
		setLoaded(false);
		// should clear all states here
	}
};