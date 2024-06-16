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

export type CiteEngine = "original" | "beta_tachyon_pulse";

export interface EngineRunnerProps {
    pageId: string;
}

export interface IEngineRunnerContext {

}

export const EngineRunnerContext = React.createContext<IEngineRunnerContext>({});

export const EngineRunner = (props: EngineRunnerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { pageId } = props;

    if (!globalContext.player.playerData) return <></>;

    const { dbid } = globalContext.player.playerData.player;
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [engine, setEngine] = useStateWithStorage<CiteEngine>(
        `${dbid}/${pageId}/cite_opt_engine`,
        "beta_tachyon_pulse",
        { rememberForever: true }
    );
    const [savedPresets, setSavedPresets] = useStateWithStorage<
        BetaTachyonSettings[]
    >(`${dbid}/${pageId}/bt_engine`, [], { rememberForever: true });
    const [currentConfig, setCurrentConfig] =
        useStateWithStorage<BetaTachyonSettings>(
            `${dbid}/${pageId}/bt_config`,
            DefaultBetaTachyonSettings,
            { rememberForever: true }
        );
    const [showEV, setShowEV] = useStateWithStorage<boolean>(
        `${dbid}/${pageId}/showEV`,
        false,
        { rememberForever: true }
    );

    const builtIn = createBuiltInPresets();

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
                        setEngine(value as CiteEngine);
                    }}
                />

                {engine === "beta_tachyon_pulse" && (
                    <>
                        <BetaTachyonSettingsPopup
                            isOpen={settingsOpen}
                            setIsOpen={setSettingsOpen}
                            config={{
                                current: currentConfig,
                                setCurrent: setCurrentConfig,
                                defaultOptions: DefaultBetaTachyonSettings,
                            }}
                        />
                        <Checkbox
                            label={"Show EV Columns"}
                            checked={showEV}
                            onChange={(e, { checked }) => setShowEV(!!checked)}
                        />
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

    
	function runWorker(citeMode?: CiteMode) {
		const worker = new UnifiedWorker();
		const { buffConfig } = globalContext.player;
        const { crew: allCrew, collections } = globalContext.core;

		if (!globalContext.player.playerData) return;

		let playerData = JSON.parse(JSON.stringify(this.context.player.playerData)) as PlayerData;		

		if (this.state.appliedProspects?.length) {
			playerData.player.character.crew = playerData.player.character.crew.concat(this.state.appliedProspects);
		}

		const engine = this.state.citeMode?.engine ?? "original";
		
		playerData.citeMode = citeMode;

		worker.addEventListener('message', (message: { data: { result: any; }; }) => {
			const result = message.data.result as CiteData;

			if (engine === 'beta_tachyon_pulse') {
				let skmap = {} as { [key: string]: SkillOrderRarity };		
				result.skillOrderRarities.forEach(sko => skmap[sko.skillorder] = sko);
				let retrievable = result.crewToRetrieve.filter(f => playerData.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
				result.crewToRetrieve = retrievable.map((r, i) => ({ ...r, pickerId: i + 1 }));
				this.setState({ citeData: result, skoMap: skmap });	
			}
			else {
				let retrievable = result.crewToCite.filter(f => playerData.player.character.crew.find(fc => fc.name === f.name && fc.unique_polestar_combos?.length))
				result.crewToRetrieve = retrievable.map((r, i) => ({ ...JSON.parse(JSON.stringify(r)), pickerId: i + 1 }));
				this.setState({ citeData: result });	
			}

		});

		const workerName = engine === 'original' ? 'citeOptimizer' : 'ironywrit';

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
					buffs: buffConfig,
					settings: this.state.betaTachyonSettings,
					coreItems: this.context.core.items
				} as BetaTachyonRunnerConfig
			});	
		}
	}

};
