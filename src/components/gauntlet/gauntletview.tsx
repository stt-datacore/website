import React from "react"
import { GauntletCalcConfig, GauntletPane, getPairGroups } from "../../utils/gauntlet"
import { Gauntlet, Opponent } from "../../model/gauntlets";
import { GauntletContext } from "./dataprovider";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { EquipmentItem } from "../../model/equipment";
import { ItemBonusInfo } from "../../utils/itemutils";
import { GauntletHeader } from "./gauntletheader";
import { GauntletPrefsPanel } from "./gauntletprefspanel";
import { shortToSkill } from "../../utils/crewutils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GauntletPairTable } from "./pairtable";
import { GauntletCrewTable } from "./gauntlettable";
import { PlayerCrew } from "../../model/player";
import { GauntletTileView } from "./gauntlettileview";
import { OpponentTable } from "./opponenttable";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { GauntletSkill } from "../item_presenters/gauntletskill";


export interface GauntletViewProps {
    gauntlet: Gauntlet;
    gauntlets: Gauntlet[];
    browseGauntlet?: string;
    dateGauntlet?: string;
    opponentCache?: Opponent[];
}

export const GauntletView = (props: GauntletViewProps) => {
    const gauntletContext = React.useContext(GauntletContext);
    const workerContext = React.useContext(WorkerContext);
    const globalContext = React.useContext(GlobalContext);
    const { runWorker, running, cancel } = workerContext;
    const { config, pane, viewMode, tops, setConfig } = gauntletContext;
    const { textFilter, filter, buffMode, range_max, settings } = config;

    const { t } = globalContext.localized;
    const { gauntlet: outerGauntlet, opponentCache } = props;

    const [gauntlet, setGauntlet] = React.useState(outerGauntlet);

    let bonusCache: { [key: string]: ItemBonusInfo } = {}
    let equipmentCache: { [key: string]: EquipmentItem[] } = {}

    const currContest = [gauntlet?.contest_data?.primary_skill ?? "", gauntlet?.contest_data?.secondary_skill ?? ""].sort().join()
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    React.useEffect(() => {
        if (outerGauntlet) {
            const workconf = {
                ...config,
                gauntlet: outerGauntlet,
                context: {
                    player: {
                        buffConfig: globalContext.player.buffConfig,
                        maxBuffs: globalContext.player.maxBuffs,
                        playerData: {
                            player: {
                                character: {
                                    crew: globalContext.player.playerData?.player.character.crew,
                                    unOwnedCrew: globalContext.player.playerData?.player.character.unOwnedCrew
                                }
                            }
                        }
                    },
                    core: {
                        crew: globalContext.core.crew,
                        items: globalContext.core.items
                    },
                    localized: {
                        TRAIT_NAMES: globalContext.localized.TRAIT_NAMES
                    },
                },
                bonusCache,
                equipmentCache
            } as GauntletCalcConfig;

            cancel();
            runWorker('gauntlet', workconf, workerResults);
        }
    }, [settings, outerGauntlet, filter, buffMode, range_max]);

    React.useEffect(() => {
        if (!gauntlet?.allCrew) return;
        setGauntlet({
            ...gauntlet,
            searchCrew: getTextCrew()
        })
    }, [textFilter])

    return <React.Fragment>

        <div style={{
            marginBottom: "2em",
            overflowX: "auto",
            minHeight: "50vh"
        }}>
            {pane === 'today' && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{t('gauntlet.pages.today_gauntlet.title')}</h1>}
            {pane === 'yesterday' && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{t('gauntlet.pages.yesterday_gauntlet.title')}</h1>}
            {pane === 'live' && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{t('gauntlet.pages.live_gauntlet.title')}</h1>}

            {!!gauntlet && <GauntletHeader gauntlet={gauntlet} />}

            <GauntletPrefsPanel />

            {(running || !gauntlet) && <div style={{ margin: '2em', textAlign: 'center', height: "50vh" }}>
                {globalContext.core.spin(t('spinners.default'))}
            </div>}

            {!running && !!gauntlet && viewMode === 'pair_cards' && !!gauntlet && renderPairTableView()}
            {!running && !!gauntlet && viewMode === 'table' && !!gauntlet && renderTable()}
            {!running && !!gauntlet && viewMode === 'big' && !!gauntlet && renderBigCards()}
            {!running && !!gauntlet && viewMode === 'small' && !!gauntlet && renderSmallCards()}
            {!running && !!gauntlet && pane === 'live' && viewMode === 'opponent_table' && !!opponentCache && renderOpponentTable()}

        </div>
    </React.Fragment>

    function workerResults(response: any) {
        console.log("Gauntlet Worker Results");
        setGauntlet(response.data.result.gauntlet);
        bonusCache = response.data.result.bonusCache;
        equipmentCache = response.data.result.equpmentCache;
    }

    function renderOpponentTable() {
        if (!opponentCache?.length) return <></>;
        return <OpponentTable opponents={opponentCache} gauntlet={gauntlet} />
    }

    function renderPairTableView() {
        if (!gauntlet) return <></>;
        return <div style={{
            margin: 0,
            marginTop: "0em",
            marginBottom: "2em",
            display: "flex",
            flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
            justifyContent: "space-between",
            flexWrap: "wrap"
        }}>
            {getPairGroups(gauntlet.searchCrew ?? [], gauntlet, config.settings, config.hideOpponents, config.onlyActiveRound, gauntlet.contest_data?.featured_skill, tops, config.filter?.maxResults)
                .map((pairGroup, pk) => {
                    return (<GauntletPairTable gauntlet={gauntlet}
                        key={"pairGroup_" + pk}
                        currContest={currContest === pairGroup.pair.map(e => shortToSkill(e)).sort().join()}
                        pairGroup={pairGroup}
                        boostMode={config.buffMode}
                        onlyActiveRound={config.onlyActiveRound}
                    />)
                })}
        </div>
    }

    function renderTable() {
        const data = gauntlet?.searchCrew;
        if (!data) return <></>;

        const { textFilter, filter } = config;

        return <GauntletCrewTable
            pageId={`gauntletPage_table`}
            mode={pane === 'live' ? 'live' : 'normal'}
            gauntlets={pane === 'browse' && gauntlet.state === 'POWER' ? globalContext.core.gauntlets : undefined}
            gauntlet={gauntlet}
            data={data.map(d => d as PlayerCrew)}
            textFilter={textFilter ?? ''}
            setTextFilter={(value) => setTextFilter(value)}
            rankByPair={[config.rankByPair ?? '']}
            filter={filter!}
            setRankByPair={(value) => setRankByPair(value)}
        />
    }

    function renderBigCards() {
        if (!gauntlet) return <></>;
        return <GauntletTileView gauntlet={gauntlet} viewMode="big" textFilter={textFilter ?? ''}
            setTextFilter={(value) => setTextFilter(value)}
        />
    }

    function renderSmallCards() {
        if (!gauntlet) return <></>;
        return <GauntletTileView gauntlet={gauntlet} viewMode="small" textFilter={textFilter ?? ''}
            setTextFilter={(value) => setTextFilter(value)}
        />
    }

    function setTextFilter(textFilter?: string) {
        setConfig({
            ...config,
            textFilter
        })
    }

    function setRankByPair(rankByPair?: string[]) {
        if (!rankByPair?.length) rankByPair = undefined;
        setConfig({
            ...config,
            rankByPair: rankByPair ? rankByPair[0] : undefined
        })
    }

    function getTextCrew() {
        if (!gauntlet?.allCrew) return [];
        let trimFilter = textFilter?.trim()?.toLowerCase();
        if (!trimFilter) return [...gauntlet.allCrew];
        return gauntlet.allCrew.filter(crew => {
            if (crew.name.toLowerCase().includes(trimFilter)) return true;
            if (crew.traits.some(t => t.includes(trimFilter))) return true;
            if (crew.traits_hidden.some(t => t.includes(trimFilter))) return true;
            return false;
        });
    }

}