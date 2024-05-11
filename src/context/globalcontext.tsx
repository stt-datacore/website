import React from 'react';

import { DataContext, ICoreContext, defaultCore } from './datacontext';
import { PlayerContext, PlayerContextData, defaultPlayer } from './playercontext';
import { BuffStatTable } from "../utils/voyageutils";

interface GlobalProviderProperties {
	children: JSX.Element;
};

export interface IDefaultGlobal {
    core: ICoreContext;
    player: PlayerContextData;
    maxBuffs: BuffStatTable | undefined;
	data?: any;
};

const defaultGlobal = {
    core: defaultCore,
    player: defaultPlayer,
    maxBuffs: undefined,
	currentLang: 'en'
} as IDefaultGlobal;

export const GlobalContext = React.createContext<IDefaultGlobal>(defaultGlobal as IDefaultGlobal);

export const GlobalProvider = (props: GlobalProviderProperties) => {
    const core = React.useContext(DataContext);
    const player = React.useContext(PlayerContext);
	const { children } = props;

	let maxBuffs: BuffStatTable | undefined;
	maxBuffs = player.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && core.all_buffs) {
		maxBuffs = core.all_buffs;
	}

	const providerValue = {
        core,
        player,
        maxBuffs
	} as IDefaultGlobal;

	return (
		<GlobalContext.Provider value={providerValue}>
			{children}
		</GlobalContext.Provider>
	);
};
