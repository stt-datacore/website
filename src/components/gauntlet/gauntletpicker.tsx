import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { DefaultAdvancedGauntletSettings, GauntletPane } from "../../utils/gauntlet";
import { GauntletContext } from "./dataprovider";
import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';

import { Step, Label, Icon, SemanticWIDTHS } from "semantic-ui-react";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GauntletImportComponent } from "./gauntletimporter";
import GauntletSettingsPopup from "./settings";
import { Gauntlet, GauntletRoot, Opponent } from "../../model/gauntlets";
import { GauntletView } from "./gauntletview";
import { BrowsableGauntletView } from "./browseableview";
import { TinyStore } from "../../utils/tiny";

export const GauntletPicker = () => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);
    const { gauntlets, pane, setPane, config, setSettings, refreshApiGauntlet, viewMode, setViewMode } = gauntletContext;
    const { settings } = config;
    const { playerData } = globalContext.player;
    const hasPlayer = !!playerData;
    const [dbid, setDbid] = React.useState("");

    const tiny = TinyStore.getStore('gauntlets');

    const [liveGauntlet, internalSetLiveGauntlet] = React.useState<Gauntlet | undefined>(undefined);
    const [liveGauntletRoot, setLiveGauntletRoot] = React.useState<GauntletRoot | undefined>();
    const [opponentCache, internalSetOpponentCache] = React.useState<Opponent[]>([]);

    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const { tfmt } = globalContext.localized;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    React.useEffect(() => {
        const dbid = hasPlayer ? `${playerData.player.dbid}/` : "";
        setDbid(dbid);
    }, [playerData])

    React.useEffect(() => {
        let live = tiny.getValue<Gauntlet>(`${dbid}liveGauntlet`);
        let oppo = tiny.getValue<Opponent[]>(`${dbid}opponentCache`);
        if (live) {
            internalSetLiveGauntlet(live);
            if (oppo?.length) internalSetOpponentCache(oppo);
            if (live && oppo?.length) setTimeout(() => setPane('live'));
        }
        else {
            clearGauntlet();
        }
    }, [dbid]);

    React.useEffect(() => {
        if (liveGauntlet) {
            if (pane === 'live') {
                if (viewMode === 'opponent_table' && !liveGauntlet?.opponents?.length) {
                    setViewMode('pair_cards');
                }
            }
        }
    }, [pane, liveGauntlet]);

    if (!gauntlets?.length) return <></>

    const today = gauntlets[0];
    const yesterday = gauntlets[1];

    const fs = isMobile ? "0.75em" : "1em";
    const tDateStr = moment(today?.date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y");
    const yDateStr = moment(yesterday?.date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y");
    const tabPanes = [
        {
            pane: 'today',
            menuItem: tDateStr,
            render: () => <div style={{ fontSize: fs }}><GauntletView gauntlets={gauntlets} gauntlet={today} /></div>,
            description: "",
            refresh: true
        },
        // {
        //     pane: 'yesterday',
        //     menuItem: yDateStr,
        //     render: () => <div style={{ fontSize: fs }}><GauntletView gauntlets={gauntlets} gauntlet={yesterday} /></div>,
        //     description: ''
        // },
        {
            pane: 'previous',
            menuItem: isMobile ? tfmt('gauntlet.pages.previous_gauntlets.short') : tfmt('gauntlet.pages.previous_gauntlets.title'),
            render: () => <div style={{ fontSize: fs }}><BrowsableGauntletView pane={pane} /></div>,
            description: tfmt('gauntlet.pages.previous_gauntlets.heading')
        },
        {
            pane: 'browse',
            menuItem: isMobile ? tfmt('gauntlet.pages.browse_gauntlets.short') : tfmt('gauntlet.pages.browse_gauntlets.title'),
            render: () => <div style={{ fontSize: fs }}><BrowsableGauntletView pane={pane} /></div>,
            description: tfmt('gauntlet.pages.browse_gauntlets.heading')
        }
    ]

    if (liveGauntlet && hasPlayer) {
        tabPanes.push({
            pane: 'live',
            menuItem: isMobile ? tfmt('gauntlet.pages.live_gauntlet.short') : tfmt('gauntlet.pages.live_gauntlet.title'),
            render: () => <div style={{ fontSize: fs }}><GauntletView opponentCache={opponentCache} gauntlets={gauntlets} gauntlet={liveGauntlet} /></div>,
            description: tfmt('gauntlet.pages.live_gauntlet.heading')
        });
    }

    if (typeof window !== 'undefined' && hasPlayer) {
        window["gauntletDataSetter"] = (value: string) => {
            parseGauntlet(JSON.parse(value));
        }
    }

    return <React.Fragment>
        {hasPlayer &&
            <GauntletImportComponent
                setGauntlet={(g) => parseGauntlet(g)}
                clearGauntlet={() => clearGauntlet()}
                gauntlet={liveGauntletRoot}
                currentHasRemote={!!liveGauntlet}
            />}
        <div style={{ margin: "1em 0" }}>
            <Step.Group fluid widths={tabPanes.length as any}>
                {tabPanes.map((tabPane, idx) => {
                    return (
                        <Step key={`gauntlet_Tab_${idx}`} active={tabPane.pane === pane} onClick={() => setPane(tabPane.pane as GauntletPane)}>
                            <Step.Content>
                                <Step.Title>{tabPane.menuItem}</Step.Title>
                                {!!tabPane.refresh &&
                                    <Label title={'Refresh'} corner='right' onClick={() => refreshApiGauntlet()}>
                                        <Icon name='refresh' style={{ cursor: 'pointer' }} />
                                    </Label>}
                                <Step.Description>{tabPane.description}</Step.Description>
                            </Step.Content>
                        </Step>
                    )
                })}
            </Step.Group>

            {(tabPanes.find(tp => tp.pane === pane) ?? tabPanes[0]).render()}

            <GauntletSettingsPopup
                isOpen={settingsOpen}
                setIsOpen={setSettingsOpen}
                config={{
                    current: settings,
                    setCurrent: setSettings,
                    defaultOptions: DefaultAdvancedGauntletSettings
                }} />
        </div>
        <CrewHoverStat targetGroup='gauntletsHover'  />
    </React.Fragment>

    function parseGauntlet(live?: GauntletRoot) {

        if (!live) {
            setLiveGauntlet(undefined);
            return;
        }

        try {
            const root = live;
            const gauntlet = root.character.gauntlets[0];

            if (gauntlet.state?.includes("ENDED")) {
                clearGauntlet();
                return;
            }

            const dts = gauntlet.bracket_id?.split("_");

            if (dts !== undefined) {
                gauntlet.date = dts[0];
            }

            if (!gauntlet.date && gauntlet.seconds_to_join) {
                let d = new Date((Date.now() + (1000 * gauntlet.seconds_to_join)));
                d = new Date(d.getTime() - (1 * 24 * 60 * 60 * 1000));
                gauntlet.date = d.toISOString();
            }

            const newoppos = [ ... gauntlet.opponents ?? [] ];
            const prevoppos = getCleanOpponents(gauntlet.bracket_id);

            for (let oppo of newoppos) {
                oppo.bracket_id = gauntlet.bracket_id;
            	let prevoppo = prevoppos.find(fo => fo.player_id === oppo.player_id);
            	if (prevoppo) {
            		const newdata = [ ... oppo.crew_contest_data.crew ];
            		for (let newcrew of newdata) {
            			let fcrew = prevoppo.crew_contest_data.crew.find(c => c.archetype_symbol === newcrew.archetype_symbol);
            			if (fcrew) {
            				let ccopy = [ ...newcrew.skills, ...fcrew.skills ];
            				ccopy = ccopy.filter((pf, idx) => ccopy.findIndex(t => t.skill === pf.skill) === idx);
            				fcrew.skills = ccopy;
            			}
            			else {
            				prevoppo.crew_contest_data.crew.push(newcrew);
            			}
            		}
                    prevoppo.rank = oppo.rank;
            	}
            	else {
                    prevoppos.forEach((po) => {
                        if (po.rank === oppo.rank) po.rank = 0;
                    });
            		prevoppos.push(oppo);
            	}
            }

            // gauntlet.opponents = prevoppos;

            setLiveGauntlet(gauntlet);
            setLiveGauntletRoot(live);
            setOpponentCache([...prevoppos]);
            setPane('live');
        }
        catch {
            if (pane === 'live') setPane('today');
            setLiveGauntlet(undefined);
            setLiveGauntletRoot(undefined);
        }
    }

    function clearGauntlet() {
        setLiveGauntlet(undefined);
        setLiveGauntletRoot(undefined);
        setOpponentCache([]);
        setPane('today');
        if (viewMode === 'opponent_table') setTimeout(() => setViewMode('pair_cards'));
    }

    function setLiveGauntlet(liveGauntlet?: Gauntlet) {
        internalSetLiveGauntlet(liveGauntlet);
        tiny.setValue(`${dbid}liveGauntlet`, liveGauntlet, true);
    }

    function setOpponentCache(opponents: Opponent[]) {
        internalSetOpponentCache(opponents);
        tiny.setValue(`${dbid}opponentCache`, opponents, true);
    }

    function getCleanOpponents(bracket_id?: string): Opponent[] {
        let gauntletId = bracket_id ?? liveGauntlet?.bracket_id;
        if (opponentCache.length && gauntletId) {
            const newCache = [] as Opponent[];
            for (let oppo of opponentCache) {
                if (oppo.bracket_id === gauntletId) {
                    newCache.push(oppo);
                }
            }
            return newCache;
        }
        else {
            return [];
        }
    }
}