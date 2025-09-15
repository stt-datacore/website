import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { BetaTachyonRunnerConfig, BetaTachyonSettings, CiteData, SkillOrderRarity } from "../../model/worker";
import BetaTachyonSettingsPopup, {
    DefaultBetaTachyonSettings,
    DefaultPresets,
    NoPortalBiasSettings,
} from "./btsettings";
import { Segment, Dropdown, Checkbox, DropdownItemProps } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CiteMode, PlayerData } from "../../model/player";
import { UnifiedWorker } from "../../typings/worker";
import { CiteOptContext } from "./context";
import { RarityFilter } from "../crewtables/commonoptions";
import { WorkerContext } from "../../context/workercontext";
import { BetaTachyonPresets } from "./btpresets";

export type CiteEngine = "original" | "beta_tachyon_pulse";

export interface EngineRunnerProps {
    pageId: string;
}

export interface IEngineRunnerContext {

}

export const EngineRunnerContext = React.createContext<IEngineRunnerContext>({});

export const EngineRunner = (props: EngineRunnerProps) => {

    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const [requestRun, setRequestRun] = React.useState(false);
    const [initialized, setInitialized] = React.useState(false);

    const { runWorker: internalRunWorker, cancel } = workerContext;

    const { pageId } = props;
    const citeContext = React.useContext(CiteOptContext);

    const { t } = globalContext.localized;

    const { citeConfig, setCiteConfig } = citeContext;
    const { engine, setEngine } = citeContext;
    const { setResults } = citeContext;

    const { appliedProspects } = citeContext;
    const { showEV, rarities } = citeConfig;

    const playerData = globalContext.player.playerData ? structuredClone(globalContext.player.playerData) as PlayerData : undefined;
    const dbid = playerData?.player.dbid ?? '';

    const [currentConfig, setCurrentConfig] = useStateWithStorage(`${dbid}/${pageId}/bt_config`, DefaultBetaTachyonSettings, { rememberForever: true });
    const [presets, setPresets] = useStateWithStorage<BetaTachyonSettings[]>(`${dbid}/${pageId}/bt_settings_presets`, DefaultPresets, { rememberForever: true });

    const [settingsOpen, setSettingsOpen] = React.useState(false);

    React.useEffect(() => {
        if (presets?.length) {
            checkPresets();
        }
    }, [presets]);

    if (playerData) {
        playerData.citeMode = citeConfig;
        if (appliedProspects?.length) {
            playerData.player.character.crew = playerData.player.character.crew.concat(appliedProspects);
        }
        if (citeConfig.rarities?.length) {
            playerData.player.character.crew = playerData.player.character.crew.filter(f => citeConfig.rarities.includes(f.max_rarity))
        }
    }

    const engOptions = [
        {
            key: "original",
            value: "original",
            text: t("cite_opt.original_engine"),
        },
        {
            key: "beta_tachyon_pulse",
            value: "beta_tachyon_pulse",
            text: `${t("cite_opt.btp.name")} (${t("global.experimental")})`,
        },
    ];

    const presetChoices = React.useMemo(() => {
        let col = presets.map(p => {
            return {
                key: `${p.name}+preset`,
                value: p.name,
                text: p.name
            } as DropdownItemProps;
        });
        // col.push({
        //     key: `_new`,
        //     value: `_new`,
        //     text: t('global.new') + " ..."
        // })
        return col;
    }, [presets]);

    React.useEffect(() => {
        if (!initialized) {
            setRequestRun(true);
        }
        else {
            cancel();
            runWorker();
        }
    }, [currentConfig, engine, rarities, appliedProspects]);

    setTimeout(() => {
        if (requestRun) {
            cancel();
            runWorker();
            setRequestRun(false);
        }
    }, 500);

    if (!globalContext.player.playerData) return <></>

    return (
        <React.Fragment>
        <Segment>
            <h3>{t("cite_opt.engine")}</h3>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1em",
                    flexDirection:
                        window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
                }}
            >
                <Dropdown
                    multiple={false}
                    options={engOptions}
                    placeholder={"Select Engine"}
                    value={engine}
                    onChange={(e, { value }) => {
                        setResults(undefined);
                        setTimeout(() => setEngine(value as CiteEngine));
                    }}
                />
                {engine === "beta_tachyon_pulse" && (
                    <>
                        <BetaTachyonSettingsPopup
                            isOpen={settingsOpen}
                            setIsOpen={setSettingsOpen}
                            presets={presets}
                            updatePresets={setPresets}
                            config={{
                                current: currentConfig,
                                setCurrent: (value) => {
                                    setResults(undefined);
                                    setTimeout(() => setCurrentConfig(value));
                                },
                                defaultOptions: DefaultBetaTachyonSettings,
                            }}
                        />
                        <BetaTachyonPresets
                            presets={presets}
                            setPresets={setPresets}
                            activeSettings={currentConfig}
                            setActiveSettings={(settings) => setCurrentConfig(settings)}
                        />
                        <Checkbox
                            label={t('cite_opt.ev_show')}
                            checked={showEV}
                            onChange={(e, { checked }) => setCiteConfig({ ...citeConfig, showEV: !!checked })}
                        />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "left", margin: 0, marginRight: "1em"}}>
                        <RarityFilter
                            altTitle={t('cite_opt.calc_specific_rarity')}
                            multiple={false}
                            rarityFilter={citeConfig?.rarities ?? []}
                            setRarityFilter={(data) => {
                                setResults(undefined);
                                setCiteConfig({ ...citeConfig, rarities: data });
                            }}
                            />
                    </div>
                    </>
                )}

            </div>
            {engine === "beta_tachyon_pulse" && (
                <div>
                    {t('global.preset')}{t('global.colon')}&nbsp;&nbsp;
                    <Dropdown
                        options={presetChoices}
                        value={currentConfig.name}
                        onChange={(e, { value }) => {
                            let choice = presets.find(f => f.name === value);
                            if (choice) {
                                setCurrentConfig(choice);
                            }
                        }}
                    />
                </div>
            )}
        </Segment>
        </React.Fragment>
    );

    function workerResponse(message: { data: { result: any; }; }) {
        const result = message.data.result as CiteData;

        if (engine === 'beta_tachyon_pulse') {
            let skmap = {} as { [key: string]: SkillOrderRarity };
            result.skillOrderRarities.forEach(sko => skmap[sko.skillorder] = sko);
            let retrievable = result.crewToRetrieve.filter(f => playerData?.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
            result.crewToRetrieve = retrievable.map((r, i) => ({ ...r, pickerId: i + 1 }));
            setResults({ citeData: result, skoMap: skmap });
        }
        else {
            result.crewToCite = result.crewToCite.map(c => ({...c,...playerData?.player.character.crew.find(fc => fc.name === c.name)!}));
            result.crewToTrain = result.crewToTrain.map(c => ({...c,...playerData?.player.character.crew.find(fc => fc.name === c.name)!}));
            let retrievable = result.crewToCite.filter(f => ({...f, ...playerData?.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length)}));
            result.crewToRetrieve = retrievable.map((r, i) => ({ ...structuredClone(r), pickerId: i + 1 }));
            setResults({ citeData: result, skoMap: undefined });
        }
        setInitialized(true);
    }

    function getImmortalSymbols() {
        if (!globalContext.player.playerData) return [];
        const { crew } = globalContext.player.playerData.player.character;
        let m = crew.filter(c => !!c.immortal).map(m => m.symbol);
        return [ ... new Set(m) ];
    }

	function runWorker() {
		const { buffConfig } = globalContext.player;
        const { crew: allCrew, collections } = globalContext.core;
		if (!globalContext.player.playerData) return;

        const workerName = engine === 'original' ? 'citeOptimizer' : 'ironywrit';
        setResults(undefined);
        if (engine === 'original') {
            setTimeout(() => {
                internalRunWorker(workerName, {
                    playerData,
                    allCrew
                }, workerResponse);
            });
		}
		else {
            setTimeout(() => {
                internalRunWorker(workerName, {
					playerData,
					inputCrew: allCrew,
					collections,
                    immortalizedSymbols: getImmortalSymbols(),
					buffs: buffConfig,
					settings: { ...DefaultBetaTachyonSettings, ...currentConfig },
					coreItems: globalContext.core.items
				} as BetaTachyonRunnerConfig, workerResponse);
            });
		}
	}

    function checkPresets(force?: boolean) {
        let currkey = presets.map(p => p.name).join();
        let newpre = DefaultPresets.concat(presets.filter(f => !DefaultPresets.some(d => d.name === f.name)));
        let newkey = newpre.map(p => p.name).join();
        if (force || currkey !== newkey) {
            setPresets(newpre);
            return true;
        }
        return false;
    }
};
