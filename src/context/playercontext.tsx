import React from 'react';
import { PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataProviderProperties } from './datacontext';

export interface PlayerContextData {
	playerData?: PlayerData;
	setPlayerData: (playerData: PlayerData | undefined) => void; 
}

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

export const PlayerProvider = (props: DataProviderProperties) => {
	const { children } = props;
	const [strippedPlayerData, setStrippedPlayerData] = useStateWithStorage<PlayerData | undefined>('tools/playerData', undefined);

	const context = {
		playerData: strippedPlayerData,
		setPlayerData: setStrippedPlayerData
	} as PlayerContextData;

	return (
		<PlayerContext.Provider value={context}>
			{children}
		</PlayerContext.Provider>
	);
};