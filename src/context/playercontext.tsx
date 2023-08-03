import React from 'react';
import { PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataContext, DataProviderProperties } from './datacontext';
import { BuffStatTable, calculateBuffConfig, calculateMaxBuffs } from '../utils/voyageutils';
import { prepareProfileData } from '../utils/crewutils';
import { Ship } from '../model/ship';
import { mergeShips } from '../utils/shiputils';

export interface PlayerContextData {
	strippedPlayerData?: PlayerData;
	setStrippedPlayerData: (playerData: PlayerData | undefined) => void; 
	buffConfig?: BuffStatTable;
	maxBuffs?: BuffStatTable;
}

const defaultPlayer = {
};

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

export const PlayerProvider = (props: DataProviderProperties) => {
	const dataContext = React.useContext(DataContext);

	const { children } = props;
	const [strippedPlayerData, setStrippedPlayerData] = useStateWithStorage<PlayerData | undefined>('tools/playerData', undefined, { compress: true });
	
	const buffConfig = strippedPlayerData ? calculateBuffConfig(strippedPlayerData.player) : undefined;
	const maxBuffs = strippedPlayerData ? calculateMaxBuffs(strippedPlayerData.player?.character?.all_buffs_cap_hash) : (dataContext.all_buffs ?? undefined);
	// if (strippedPlayerData?.player?.character?.all_buffs_cap_hash) {
	// 	console.log(strippedPlayerData.player?.character?.all_buffs_cap_hash);
	// 	console.log(JSON.stringify(strippedPlayerData.player?.character?.all_buffs_cap_hash));
	// }
	const context = {
		strippedPlayerData,
		setStrippedPlayerData,
		buffConfig,
		maxBuffs
	} as PlayerContextData;

	return (
		<PlayerContext.Provider value={context}>
			{children}
		</PlayerContext.Provider>
	);
};