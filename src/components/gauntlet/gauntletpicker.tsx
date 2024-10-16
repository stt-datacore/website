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
import { Gauntlet, GauntletRoot } from "../../model/gauntlets";
import { GauntletView } from "./gauntletview";
import { BrowsableGauntletView } from "./browsableview";

export const GauntletPicker = () => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);
    const { gauntlets, pane, setPane, config, setConfig, refreshApiGauntlet } = gauntletContext;
    const { settings } = config;
    const { playerData } = globalContext.player;
    const hasPlayer = !!playerData;
    const dbid = hasPlayer ? `${playerData.player.dbid}/` : "";

    const [liveGauntlet, setLiveGauntlet] = useStateWithStorage<Gauntlet | undefined>(`${dbid}liveGauntlet`, undefined);
    const [liveGauntletRoot, setLiveGauntletRoot] = React.useState<GauntletRoot | undefined>();
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const { tfmt } = globalContext.localized;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    if (!gauntlets?.length) return <></>

    const today = gauntlets[0];
    const yesterday = gauntlets[1];

    const fs = isMobile ? "0.75em" : "1em";
    const tDateStr = moment(today?.date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y");
    const yDateStr = moment(yesterday?.date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y");
    const tabPanes = [
        {
            pane: 'today',
            //menuItem: today?.fromApi ? tDateStr : (isMobile ? tfmt('gauntlet.pages.today_gauntlet.short') : tfmt('gauntlet.pages.today_gauntlet.title')),
            menuItem: tDateStr,
            render: () => <div style={{ fontSize: fs }}><GauntletView pane={pane} gauntlet={yesterday} /></div>,
            description: "",
            refresh: true
            //description: !today?.fromApi ? tfmt('gauntlet.pages.today_gauntlet.title') : ""
        },
        {
            pane: 'yesterday',
            //				menuItem: isMobile ? tfmt('gauntlet.pages.yesterday_gauntlet.short') : tfmt('gauntlet.pages.yesterday_gauntlet.title'),
            menuItem: yDateStr,
            render: () => <div style={{ fontSize: fs }}><GauntletView pane={pane} gauntlet={yesterday} /></div>,
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
            render: () => <div style={{ fontSize: fs }}><GauntletView pane={pane} gauntlet={liveGauntlet} /></div>,
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
                        <Step active={tabPane.pane === pane} onClick={() => setPane(tabPane.pane as GauntletPane)}>
                            <Step.Content>
                                <Step.Title>{tabPane.menuItem}</Step.Title>
                                {!!tabPane.refresh &&
                                    <Label title={'Refresh'} as='a' corner='right' onClick={() => refreshApiGauntlet()}>
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
                this.inited = false;
                if (pane === 'live') setPane('today');
                setLiveGauntlet(undefined);
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
            // const curroppos = [ ... gauntlet.opponents ?? [] ];
            // const prevoppos = [ ... prevGauntlet?.opponents ?? [] ];

            // for (let oppo of curroppos) {
            // 	let po = prevoppos.find(fo => fo.player_id === oppo.player_id);
            // 	if (po) {
            // 		const crewdata = [ ... po.crew_contest_data.crew ];
            // 		for (let pcrew of crewdata) {
            // 			let fo = oppo.crew_contest_data.crew.find(foppo => foppo.archetype_symbol === pcrew.archetype_symbol);
            // 			if (fo) {
            // 				let pcopy = [ ... pcrew.skills, ...fo.skills];
            // 				pcopy = pcopy.filter((pf, idx) => pcopy.findIndex(t => t.skill === pf.skill) === idx);
            // 				pcrew.skills = pcopy;
            // 			}
            // 			else {
            // 				po.crew_contest_data.crew.push(pcrew);
            // 			}
            // 		}
            // 	}
            // 	else {
            // 		prevoppos.push(oppo);
            // 	}
            // }

            // gauntlet.opponents = prevoppos;

            setLiveGauntlet(gauntlet);
            setLiveGauntletRoot(live);
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

    function setSettings(settings: GauntletSettings) {
        setConfig({ ...config, settings });
    }
}