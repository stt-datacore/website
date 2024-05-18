import React from 'react';

import { DataContext, ICoreContext, defaultCore } from './datacontext';
import { PlayerContext, PlayerContextData, defaultPlayer } from './playercontext';
import { BuffStatTable } from "../utils/voyageutils";
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';

interface GlobalProviderProperties {
	children: JSX.Element;
};

export interface IDefaultGlobal {
    core: ICoreContext;
    player: PlayerContextData;
    maxBuffs: BuffStatTable | undefined;
	data?: any;
	currentLang: string;
	isMobile: boolean;
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
	const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH);
	const { children } = props;

	if (typeof window !== 'undefined') {
		window.addEventListener('resize', (e) => {
			let mobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
			if (isMobile !== mobile) {
				setIsMobile(mobile);
			}
		});
	}

	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = player.maxBuffs;
	
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && core.all_buffs) {
		maxBuffs = core.all_buffs;
	}

	const providerValue = {
        core,
        player,
        maxBuffs,
		isMobile
	} as IDefaultGlobal;

	return (
		<GlobalContext.Provider value={providerValue}>
			{children}
		</GlobalContext.Provider>
	);
};
