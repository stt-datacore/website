import React from 'react';
import { PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataProviderProperties } from './datacontext';

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerData | undefined>(defaultPlayer as PlayerData);

export const PlayerProvider = (props: DataProviderProperties) => {
	const { children } = props;
	const [strippedPlayerData, ] = useStateWithStorage<PlayerData | undefined>('tools/playerData', undefined);

	return (
		<PlayerContext.Provider value={strippedPlayerData}>
			{children}
		</PlayerContext.Provider>
	);
};