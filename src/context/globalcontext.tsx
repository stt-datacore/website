import React from 'react';

import { DataContext, ICoreContext, ValidDemands, defaultCore } from './datacontext';
import { PlayerContext, PlayerContextData, defaultPlayer } from './playercontext';
import { DefaultLocalizedData, LocalizedContext, ILocalizedData, TranslatedCore } from './localizedcontext';
import { BuffStatTable } from "../utils/voyageutils";
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';

const DEBUG_MODE = false;

interface GlobalProviderProperties {
	children: JSX.Element;
};

interface ILocalizationTrigger {
	triggered: boolean;
	onReady: () => void;
};

export interface IDefaultGlobal {
    core: ICoreContext;
    player: PlayerContextData;
	localized: ILocalizedData;
    maxBuffs: BuffStatTable | undefined;
	data?: any;
	isMobile: boolean;
	readyLocalizedCore: (demands: ValidDemands[], onReady: () => void) => void;
};

const defaultGlobal: IDefaultGlobal = {
    core: defaultCore,
    player: defaultPlayer,
	localized: DefaultLocalizedData,
    maxBuffs: undefined,
	isMobile: false,
	readyLocalizedCore: () => {}
};

export const GlobalContext = React.createContext<IDefaultGlobal>(defaultGlobal);

export const GlobalProvider = (props: GlobalProviderProperties) => {
    const core = React.useContext(DataContext);
    const player = React.useContext(PlayerContext);
	const localized = React.useContext(LocalizedContext);
	const { children } = props;

	const [localizedCore, setLocalizedCore ] = React.useState<ICoreContext>(core);
	const [localizedPlayer, setLocalizedPlayer] = React.useState<PlayerContextData>(player);
	const [localizationTrigger, setLocalizationTrigger] = React.useState<ILocalizationTrigger | undefined>(undefined);
	const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH);

	React.useEffect(() => {
		if (!localizationTrigger) return;
		const translatedCore: TranslatedCore = localized.translateCore();
		setLocalizedCore({ ...core, ...translatedCore });
		if (DEBUG_MODE) console.log("localizationTrigger.onReady()");
		localizationTrigger.onReady();
	}, [localizationTrigger]);

	React.useEffect(() => {
		if (DEBUG_MODE) console.log("Effect for: localizedCore or player updated.");
		const translatedPlayer: PlayerContextData = localized.translatePlayer();
		setLocalizedPlayer(translatedPlayer);
	}, [localizedCore, player]);

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

	const providerValue: IDefaultGlobal = {
		core: localizedCore,
		player: localizedPlayer,
		localized,
        maxBuffs,
		isMobile,
		readyLocalizedCore
	};

	return (
		<GlobalContext.Provider value={providerValue}>
			{children}
		</GlobalContext.Provider>
	);

	function readyLocalizedCore(demands: ValidDemands[], onReady: () => void): void {
		if (DEBUG_MODE) console.log("enter readyLocalizedCore");

		core.ready(demands, () => {
			if (DEBUG_MODE) console.log("setLocalizationTrigger");
			setLocalizationTrigger({
				triggered: true,
				onReady
			});
		});
	}
};
