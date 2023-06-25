import React from 'react';
import { PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataContext, DataProviderProperties } from './datacontext';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { prepareProfileData } from '../utils/crewutils';
import { Ship } from '../model/ship';
import { mergeShips } from '../utils/shiputils';

export interface PlayerContextData {
	strippedPlayerData?: PlayerData;
	setStrippedPlayerData: (playerData: PlayerData | undefined) => void; 
	buffConfig?: BuffStatTable;
	preparedPlayerData?: PlayerData;
	mergedShips?: Ship[];
}

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

export const PlayerProvider = (props: DataProviderProperties) => {
	const dataContext = React.useContext(DataContext);

	const { children } = props;
	const [strippedPlayerData, setStrippedPlayerData] = useStateWithStorage<PlayerData | undefined>('tools/playerData', undefined);
	
	const buffConfig = strippedPlayerData ? calculateBuffConfig(strippedPlayerData.player) : undefined;
	let prep: PlayerData | undefined = undefined;
	let ships: Ship[] | undefined = undefined;

	// PlayerContext will never demand the data. It will only use it if it's there.
	if (strippedPlayerData && dataContext && dataContext.crew?.length) {
		prep = JSON.parse(JSON.stringify(strippedPlayerData)) as PlayerData;
		prepareProfileData('PROFILE_CONTEXT', dataContext.crew, prep, new Date());

		if (dataContext.ship_schematics) {
			ships = mergeShips(dataContext.ship_schematics, prep.player.character.ships);				
		}
	}

	const context = {
		strippedPlayerData,
		setStrippedPlayerData,
		buffConfig,
		preparedPlayerData: prep,
		mergedShips: ships
	} as PlayerContextData;

	return (
		<PlayerContext.Provider value={context}>
			{children}
		</PlayerContext.Provider>
	);
};