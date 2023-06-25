import React from 'react';
import { PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataProviderProperties } from './datacontext';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';

export interface PlayerContextData {
	strippedPlayerData?: PlayerData;
	setStrippedPlayerData: (playerData: PlayerData | undefined) => void; 
	buffConfig?: BuffStatTable;
}

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

export const PlayerProvider = (props: DataProviderProperties) => {
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