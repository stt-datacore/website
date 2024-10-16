import React from "react";
import { Gauntlet, GauntletViewMode } from "../../model/gauntlets";
import { DefaultAdvancedGauntletSettings, GauntletPane, GauntletUserPrefs } from "../../utils/gauntlet";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import moment from "moment";

export interface IGauntletContext {
    viewMode: GauntletViewMode;
    pane: GauntletPane;
    gauntlets: Gauntlet[];
    setViewMode: (viewMode: GauntletViewMode) => void;
    setPane: (pane: GauntletPane) => void;
    refreshApiGauntlet: () => void;
    config: GauntletUserPrefs;
    setConfig: (config: GauntletUserPrefs) => void;
}

const DefaultUserPrefs: GauntletUserPrefs = {
	settings: { ... DefaultAdvancedGauntletSettings },
	buffMode: 'player',
	range_max: 100,
	filter: {},
	textFilter: '',
	hideOpponents: false,
	onlyActiveRound: true
}

const DefaultGauntletContext: IGauntletContext = {
    pane: 'today',
    viewMode: 'pair_cards',
    gauntlets: [],
    config: { ...DefaultUserPrefs },
    setConfig: () => false,
    setViewMode: () => false,
    setPane: () => false,
    refreshApiGauntlet: () => false,
}

export const GauntletContext = React.createContext(DefaultGauntletContext);

export interface GauntletContextProviderProps {
    children: JSX.Element;
}

export const GauntletDataProvider = (props: GauntletContextProviderProps) => {
    const { children } = props;

    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const dbid = playerData ? `${playerData.player.dbid}/` : '';

    const [apiGauntlet, setApiGauntlet] = React.useState<Gauntlet | undefined>(undefined);
    const [pane, setPane] = useStateWithStorage<GauntletPane>(`${dbid}gauntletPane`, 'today', { rememberForever: true });

    const [config, setConfig] = useStateWithStorage<GauntletUserPrefs>(`${dbid}${pane}/gauntletConfig`, DefaultUserPrefs, { rememberForever: true });
    const [viewMode, setViewMode] = useStateWithStorage<GauntletViewMode>(`${dbid}${pane}/gauntletViewMode`, 'pair_cards', { rememberForever: true });

    const { gauntlets: outerGauntlets } = globalContext.core;
    const [gauntlets, setGauntlets] = React.useState<Gauntlet[]>(globalContext.core.gauntlets);

    React.useEffect(() => {
        refreshApiGauntlet();
    }, [playerData]);

    React.useEffect(() => {
        if (outerGauntlets?.length) {
            if (apiGauntlet && !compGauntlet(outerGauntlets[0], apiGauntlet)) {
                setGauntlets([apiGauntlet, ...gauntlets]);
            }
            else {
                setGauntlets([...outerGauntlets]);
            }
        }
    }, [apiGauntlet, outerGauntlets]);

    const context = {
        pane,
        setPane,
        viewMode,
        gauntlets,
        refreshApiGauntlet: refreshApiGauntlet,
        setViewMode,
        setConfig,
        config
    } as IGauntletContext;

    return <React.Fragment>
        <GauntletContext.Provider value={context}>
            {children}
        </GauntletContext.Provider>
    </React.Fragment>

    function compGauntlet(today: Gauntlet, api?: Gauntlet) {
        if (!api) return true;
        if (today.contest_data && api.contest_data) {
            if (today.contest_data.featured_skill !== api.contest_data.featured_skill) return false;
            if (!today.contest_data.traits.every(t => api.contest_data?.traits.includes(t))) return false;
            if (!api.contest_data.traits.every(t => today.contest_data?.traits.includes(t))) return false;
            if (today.jackpot_crew !== api.jackpot_crew) return false;
        }
        return true;
    }

    async function loadFromApi(): Promise<Gauntlet | undefined> {
        return fetch("https://datacore.app/api/gauntlet_info")
            .then((result) => result.json())
            .then((json) => ({ ...json, fromApi: true, date: moment(new Date()).utc(false).toISOString() } as Gauntlet))
            .catch((e) => undefined);
    }

    function refreshApiGauntlet() {
        loadFromApi().then((gauntlet) => setApiGauntlet(gauntlet));
    }

}

