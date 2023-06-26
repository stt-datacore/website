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
}

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

export const PlayerProvider = (props: DataProviderProperties) => {
	const dataContext = React.useContext(DataContext);

	const { children } = props;
	const [strippedPlayerData, setStrippedPlayerData] = useStateWithStorage<PlayerData | undefined>('tools/playerData', undefined);
	
	const buffConfig = strippedPlayerData ? calculateBuffConfig(strippedPlayerData.player) : undefined;

	const context = {
		strippedPlayerData,
		setStrippedPlayerData,
		buffConfig
	} as PlayerContextData;

	return (
		<PlayerContext.Provider value={context}>
			{children}
		</PlayerContext.Provider>
	);
};