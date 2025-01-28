import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { BetaTachyonRunnerConfig, BetaTachyonSettings, CiteData, SkillOrderRarity } from "../../model/worker";
import BetaTachyonSettingsPopup, {
    DefaultBetaTachyonSettings,
} from "./btsettings";
import { Segment, Dropdown, Checkbox } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CiteMode, PlayerData } from "../../model/player";
import { UnifiedWorker } from "../../typings/worker";
import { CiteOptContext } from "./context";
import { RarityFilter } from "../crewtables/commonoptions";

export type CiteEngine = "original" | "beta_tachyon_pulse";

export interface EngineRunnerProps {
    pageId: string;
}

export interface IEngineRunnerContext {

}

export const EngineRunnerContext = React.createContext<IEngineRunnerContext>({});

export const EngineRunner = (props: EngineRunnerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { pageId } = props;
    const dbid = globalContext.player.playerData?.player.dbid ?? '';

    const [currentConfig, setCurrentConfig] = useStateWithStorage(`${dbid}/${pageId}/bt_config`, DefaultBetaTachyonSettings, { rememberForever: true });

    const citeContext = React.useContext(CiteOptContext);

    const { t } = globalContext.localized;

    const { citeConfig, setCiteConfig } = citeContext;
    const { engine, setEngine } = citeContext;
    const { results, setResults } = citeContext;

    const { appliedProspects } = citeContext;

    const { showEV } = citeConfig;

    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [currentWorker, setCurrentWorker] = React.useState<UnifiedWorker | undefined>();

    const builtIn = createBuiltInPresets();
    const playerData = globalContext.player.playerData ? JSON.parse(JSON.stringify(globalContext.player.playerData)) as PlayerData : undefined;

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


    React.useEffect(() => {
        if (currentWorker) {
            currentWorker.removeEventListener('message', workerResponse);
            currentWorker.terminate();
        }
        setResults(undefined);
        runWorker();
    }, [currentConfig, engine, citeConfig.rarities, appliedProspects]);

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
                            config={{
                                current: currentConfig,
                                setCurrent: (value) => {
                                    setResults(undefined);
                                    setTimeout(() => setCurrentConfig(value));
                                },
                                defaultOptions: DefaultBetaTachyonSettings,
                            }}
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
        </Segment>
        </React.Fragment>
    );

    function createBuiltInPresets(): BetaTachyonSettings[] {
        return [
            {
                ...DefaultBetaTachyonSettings,
            },
        ];
    }

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
            let retrievable = result.crewToCite.filter(f => playerData?.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
            result.crewToRetrieve = retrievable.map((r, i) => ({ ...JSON.parse(JSON.stringify(r)), pickerId: i + 1 }));
            setResults({ citeData: result, skoMap: undefined });
        }
    }

    function getImmortalSymbols() {
        if (!globalContext.player.playerData) return [];
        const { crew } = globalContext.player.playerData.player.character;
        let m = crew.filter(c => !!c.immortal).map(m => m.symbol);
        return [ ... new Set(m) ];
    }

	function runWorker() {
		const worker = new UnifiedWorker();
		const { buffConfig } = globalContext.player;
        const { crew: allCrew, collections } = globalContext.core;

		if (!globalContext.player.playerData || !worker) return;

		const workerName = engine === 'original' ? 'citeOptimizer' : 'ironywrit';

        worker.addEventListener('message', workerResponse);

		if (engine === 'original') {
			worker.postMessage({
				worker: workerName,
				playerData,
				allCrew,
				collections,
				buffs: buffConfig
			});
		}
		else {
			worker.postMessage({
				worker: workerName,
				config: {
					playerData,
					inputCrew: allCrew,
					collections,
                    immortalizedSymbols: getImmortalSymbols(),
					buffs: buffConfig,
					settings: currentConfig,
					coreItems: globalContext.core.items
				} as BetaTachyonRunnerConfig
			});
		}

        setCurrentWorker(worker);
	}
};
