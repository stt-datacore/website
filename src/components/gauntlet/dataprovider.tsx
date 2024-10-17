import React from "react";
import { Gauntlet, GauntletViewMode } from "../../model/gauntlets";
import { DefaultAdvancedGauntletSettings, GauntletPane, GauntletSettings, GauntletUserPrefs } from "../../utils/gauntlet";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import moment from "moment";
import { TinyStore } from "../../utils/tiny";
import { skillToShort } from "../../utils/crewutils";

export interface IGauntletContext {
    viewMode: GauntletViewMode;
    pane: GauntletPane;
    gauntlets: Gauntlet[];
    uniqueGauntlets: Gauntlet[];
    setViewMode: (viewMode: GauntletViewMode) => void;
    setPane: (pane: GauntletPane) => void;
    refreshApiGauntlet: () => void;
    config: GauntletUserPrefs;
    setConfig: (config: GauntletUserPrefs) => void;
    setTops: (value: number) => void;
    tops: number;
    setSettings: (settings: GauntletSettings) => void;
}

const DefaultUserPrefs: GauntletUserPrefs = {
	settings: { ... DefaultAdvancedGauntletSettings },
	buffMode: 'player',
	range_max: 0,
	filter: {
        maxResults: 10,
        ownedStatus: 'any',
    },
	textFilter: '',
	hideOpponents: false,
	onlyActiveRound: true
}

const DefaultGauntletContext: IGauntletContext = {
    pane: 'today',
    viewMode: 'pair_cards',
    gauntlets: [],
    uniqueGauntlets: [],
    config: { ...DefaultUserPrefs },
    tops: 100,
    setConfig: () => false,
    setViewMode: () => false,
    setSettings: () => false,
    setPane: () => false,
    setTops: () => false,
    refreshApiGauntlet: () => false,
}

export const GauntletContext = React.createContext(DefaultGauntletContext);

export interface GauntletContextProviderProps {
    children: JSX.Element;
}

export const GauntletDataProvider = (props: GauntletContextProviderProps) => {
    const { children } = props;
    const tiny = TinyStore.getStore('gauntlets');
    const settings = tiny.getValue<GauntletSettings>('gauntletSettings', DefaultAdvancedGauntletSettings);
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const dbid = playerData ? `${playerData.player.dbid}/` : '';
    const { TRAIT_NAMES } = globalContext.localized;
    const [apiGauntlet, setApiGauntlet] = React.useState<Gauntlet | undefined>(undefined);
    const [pane, setPane] = useStateWithStorage<GauntletPane>(`${dbid}gauntletPane`, 'today', { rememberForever: true });

    const [config, setConfig] = useStateWithStorage<GauntletUserPrefs>(`${dbid}${pane}/gauntletConfig`, DefaultUserPrefs, { rememberForever: true });
    const [viewMode, setViewMode] = useStateWithStorage<GauntletViewMode>(`${dbid}${pane}/gauntletViewMode`, 'pair_cards', { rememberForever: true });

    const { gauntlets: outerGauntlets } = globalContext.core;
    const [gauntlets, setGauntlets] = React.useState<Gauntlet[]>(globalContext.core.gauntlets);
    const [uniqueGauntlets, setUniqueGauntlets] = React.useState<Gauntlet[]>(globalContext.core.gauntlets);

    const [tops, setTops] = useStateWithStorage<number>(`${dbid}gauntletTops`, 100, { rememberForever: true });

    React.useEffect(() => {
        refreshApiGauntlet();
    }, []);

    React.useEffect(() => {
        if (outerGauntlets?.length) {
            if (apiGauntlet && !compGauntlet(outerGauntlets[0], apiGauntlet)) {
                setGauntlets([apiGauntlet, ...outerGauntlets]);
            }
            else {
                setGauntlets([...outerGauntlets]);
            }
        }
    }, [apiGauntlet, outerGauntlets]);

    React.useEffect(() => {
        if (gauntlets?.length) {
            setUniqueGauntlets(createUniques());
        }
    }, [gauntlets]);

    const context = {
        tops,
        setTops,
        pane,
        setPane,
        viewMode,
        gauntlets,
        uniqueGauntlets,
        refreshApiGauntlet: refreshApiGauntlet,
        setViewMode,
        setConfig,
        setSettings,
        config: {
            ...config,
            settings: {
                ... (settings ? settings : config.settings)
            }
        }
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


    function setSettings(settings: GauntletSettings) {
        tiny.setValue('gauntletSettings', settings, true);
        setConfig({ ...config, settings });
    }

    function createUniques() {
        let uniques = [...gauntlets];

        let contstr = uniques.map((g, idx) => {
            if (!g || !g.contest_data) return undefined;
            return {
                text: JSON.stringify(g.contest_data),
                index: idx
            }
        });

        contstr = contstr.filter((q, idx) => q && contstr.findIndex(v => v?.text === q.text) === idx);

        let pass2 = [] as Gauntlet[];

        for (let q of contstr) {
            if (!q) continue;
            let qparse = uniques[q.index];
            if (qparse) {
                qparse = JSON.parse(JSON.stringify(qparse)) as Gauntlet;
                qparse.template = true;
                pass2.push(qparse);
            }
        }

        uniques = [{
            gauntlet_id: 0,
            state: "POWER",
            jackpot_crew: "",
            seconds_to_join: 0,
            contest_data: {
                primary_skill: "",
                secondary_skill: "",
                featured_skill: "",
                traits: [] as string[]
            },
            date: (new Date()).toISOString()
        }] as Gauntlet[];

        uniques = uniques.concat(pass2.sort((a, b) => {
            let astr = `${a.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(a.contest_data?.featured_skill ?? "")}`;
            let bstr = `${b.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(b.contest_data?.featured_skill ?? "")}`;
            return astr.localeCompare(bstr);
        }) as Gauntlet[]);

        uniques.forEach((unique, idx) => {
            unique.date = "gt_" + idx;
        })

        return uniques;
    }
}

