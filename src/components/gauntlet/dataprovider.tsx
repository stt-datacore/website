import moment from "moment";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { Gauntlet, GauntletViewMode, PairGroup } from "../../model/gauntlets";
import { skillToShort } from "../../utils/crewutils";
import { DefaultAdvancedGauntletSettings, GauntletPane, GauntletSettings, GauntletUserPrefs } from "../../utils/gauntlet";
import { TinyStore } from "../../utils/tiny";

export interface IGauntletContext {
    config: GauntletUserPrefs;
    featuredGauntlet?: Gauntlet;
    gauntlets: Gauntlet[];
    initialized: boolean;
    pairGroups?: PairGroup[];
    pane: GauntletPane;
    tops: number;
    uniqueGauntlets: Gauntlet[];
    viewMode: GauntletViewMode;
    refreshApiGauntlet: () => void;
    setConfig: (config: GauntletUserPrefs) => void;
    setFeaturedGauntlet: (value?: Gauntlet) => void;
    setPairGroups: (value?: PairGroup[]) => void;
    setPane: (pane: GauntletPane) => void;
    setSettings: (settings: GauntletSettings) => void;
    setTops: (value: number) => void;
    setViewMode: (viewMode: GauntletViewMode) => void;
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
	onlyActiveRound: true,
    natural: true
}

const DefaultGauntletContext: IGauntletContext = {
    initialized: false,
    pane: 'today',
    viewMode: 'pair_cards',
    gauntlets: [],
    uniqueGauntlets: [],
    config: { ...DefaultUserPrefs },
    tops: 100,
    pairGroups: [],
    setConfig: () => false,
    setViewMode: () => false,
    setSettings: () => false,
    setPane: () => false,
    setTops: () => false,
    refreshApiGauntlet: () => false,
    setFeaturedGauntlet: () => false,
    setPairGroups: () => false,
}

export const GauntletContext = React.createContext(DefaultGauntletContext);

export interface GauntletContextProviderProps {
    children: JSX.Element;
}

export const GauntletDataProvider = (props: GauntletContextProviderProps) => {
    const { children } = props;
    const tiny = TinyStore.getStore('gauntlets');
    const globalContext = React.useContext(GlobalContext);

    const { playerData } = globalContext.player;
    const { gauntlets: outerGauntlets } = globalContext.core;
    const { TRAIT_NAMES } = globalContext.localized;

    const dbid = playerData ? `${playerData.player.dbid}/` : '';

    const savedPane = tiny.getValue<GauntletPane>(`${dbid}/gauntletConfig`, 'today') || 'today';
    const savedConfig = tiny.getValue<GauntletUserPrefs>(`${dbid}${savedPane}/gauntletConfig`, DefaultUserPrefs) || DefaultUserPrefs;
    const savedView = tiny.getValue<GauntletViewMode>(`${dbid}${savedPane}/gauntletViewMode`, 'pair_cards') || 'pair_cards';
    const savedTops = tiny.getValue<number>(`${dbid}${savedPane}/gauntletTops`, 100) || 100;

    const [settings, internalSetSettings] = React.useState<GauntletSettings>(DefaultAdvancedGauntletSettings);
    const [pane, internalSetPane] = React.useState<GauntletPane>(savedPane);
    const [config, internalSetConfig] = React.useState<GauntletUserPrefs>({ ...savedConfig });
    const [viewMode, internalSetViewMode] = React.useState<GauntletViewMode>(savedView);
    const [tops, internalSetTops] = React.useState<number>(savedTops);
    const [featuredGauntlet, setFeaturedGauntlet] = React.useState<Gauntlet | undefined>(undefined);

    const [apiGauntlet, setApiGauntlet] = React.useState<Gauntlet | undefined>(undefined);

    const [gauntlets, setGauntlets] = React.useState<Gauntlet[]>(globalContext.core.gauntlets);
    const [uniqueGauntlets, setUniqueGauntlets] = React.useState<Gauntlet[]>(globalContext.core.gauntlets);
    const [pairGroups, setPairGroups] = React.useState<PairGroup[] | undefined>(undefined);

    React.useEffect(() => {
        refreshApiGauntlet();
    }, []);

    React.useEffect(() => {
        const savedSettings = tiny.getValue<GauntletSettings>(`${dbid}gauntletSettings`, DefaultAdvancedGauntletSettings) || DefaultAdvancedGauntletSettings;
        const savedConfig = tiny.getValue<GauntletUserPrefs>(`${dbid}${pane}/gauntletConfig`, DefaultUserPrefs) || DefaultUserPrefs;
        const savedView = tiny.getValue<GauntletViewMode>(`${dbid}${pane}/gauntletViewMode`, 'pair_cards') || 'pair_cards';
        const savedTops = tiny.getValue<number>(`${dbid}${pane}/gauntletTops`, 100) || 100;
        internalSetConfig(savedConfig);
        internalSetSettings(savedSettings);
        internalSetViewMode(savedView);
        internalSetTops(savedTops);
    }, [pane, playerData]);

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

    const context: IGauntletContext = {
        initialized: true,
        featuredGauntlet,
        gauntlets,
        pairGroups,
        pane,
        tops,
        uniqueGauntlets,
        viewMode,
        refreshApiGauntlet,
        setConfig,
        setFeaturedGauntlet,
        setPairGroups,
        setPane,
        setSettings,
        setTops,
        setViewMode,
        config: {
            ...DefaultUserPrefs,
            ...config,
            settings
        }
    };

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

    function setPane(pane: GauntletPane) {
        tiny.setValue<GauntletPane>(`${dbid}/gauntletConfig`, pane);
        internalSetPane(pane);
    }

    function setViewMode(viewMode: GauntletViewMode) {
        tiny.setValue<GauntletViewMode>(`${dbid}${pane}/gauntletViewMode`, viewMode, true);
        internalSetViewMode(viewMode);
    }

    function setConfig(config: GauntletUserPrefs) {
        tiny.setValue<GauntletUserPrefs>(`${dbid}${pane}/gauntletConfig`, config, true);
        internalSetConfig(config);
    }

    function setTops(value: number) {
        tiny.setValue<number>(`${dbid}${pane}/gauntletTops`, value, true);
        internalSetTops(value);
    }

    function setSettings(settings: GauntletSettings) {
        tiny.setValue<GauntletSettings>(`${dbid}gauntletSettings`, settings, true);
        internalSetSettings(settings);
        //setConfig({ ...config, settings });
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
                qparse = structuredClone(qparse) as Gauntlet;
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

