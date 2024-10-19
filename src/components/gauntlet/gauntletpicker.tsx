import React from "react"
import { useStateWithStorage } from "../../utils/storage"
import { GlobalContext } from "../../context/globalcontext"
import { DefaultAdvancedGauntletSettings, GauntletPane, GauntletSettings } from "../../utils/gauntlet";
import { GauntletContext, GauntletDataProvider } from "./dataprovider";
import moment from "moment";
import { Step, Label, Icon } from "semantic-ui-react";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GauntletImportComponent } from "./gauntletimporter";
import GauntletSettingsPopup from "./settings";
import { Gauntlet, GauntletRoot, Opponent } from "../../model/gauntlets";
import { GauntletView } from "./gauntletview";
import { BrowsableGauntletView } from "./browseableview";

export const GauntletPicker = () => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);
    const { gauntlets, pane, setPane, config, setSettings, refreshApiGauntlet, viewMode, setViewMode } = gauntletContext;
    const { settings } = config;
    const { playerData } = globalContext.player;
    const hasPlayer = !!playerData;
    const dbid = hasPlayer ? `${playerData.player.dbid}/` : "";

    const [liveGauntlet, setLiveGauntlet] = useStateWithStorage<Gauntlet | undefined>(`${dbid}liveGauntlet`, undefined);
    const [liveGauntletRoot, setLiveGauntletRoot] = React.useState<GauntletRoot | undefined>();
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const [opponentCache, setOpponentCache] = useStateWithStorage<Opponent[]>(`${dbid}opponentCache`, []);

    const { tfmt } = globalContext.localized;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    React.useEffect(() => {
        if (pane === 'live') {
            if (viewMode === 'opponent_table' && !liveGauntlet?.opponents?.length) {
                setViewMode('pair_cards');
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
        {
            pane: 'yesterday',
            menuItem: yDateStr,
            render: () => <div style={{ fontSize: fs }}><GauntletView gauntlets={gauntlets} gauntlet={yesterday} /></div>,
            description: ''
        },
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
            render: () => <div style={{ fontSize: fs }}><GauntletView gauntlets={gauntlets} gauntlet={liveGauntlet} /></div>,
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
                currentHasRemote={!!liveGauntletRoot}
            />}
        <div style={{ margin: "1em 0" }}>
            <Step.Group fluid>
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
        <CrewHoverStat targetGroup='gauntletsHover' />
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
                setLiveGauntlet(undefined);
                if (pane === 'live') setPane('today');
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

            // TODO: Dormant Code to merge previous rounds!
            //
            // let json = this.tiny.getValue<string>('liveGauntlet');

            // const prevGauntlet = json ? JSON.parse(json) as Gauntlet : {} as Gauntlet;
            const curroppos = [ ... gauntlet.opponents ?? [] ];
            const prevoppos = getCleanOpponents(gauntlet.bracket_id);

            for (let oppo of curroppos) {
                oppo.bracket_id = gauntlet.bracket_id;
            	let po = prevoppos.find(fo => fo.player_id === oppo.player_id);
            	if (po) {
            		const crewdata = [ ... po.crew_contest_data.crew ];
            		for (let pcrew of crewdata) {
            			let fo = oppo.crew_contest_data.crew.find(foppo => foppo.archetype_symbol === pcrew.archetype_symbol);
            			if (fo) {
            				let pcopy = [ ... pcrew.skills, ...fo.skills];
            				pcopy = pcopy.filter((pf, idx) => pcopy.findIndex(t => t.skill === pf.skill) === idx);
            				pcrew.skills = pcopy;
            			}
            			else {
            				po.crew_contest_data.crew.push(pcrew);
            			}
            		}
            	}
            	else {
            		prevoppos.push(oppo);
            	}
            }

            // gauntlet.opponents = prevoppos;

            setLiveGauntlet(gauntlet);
            setLiveGauntletRoot(live);
            setOpponentCache(prevoppos);
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