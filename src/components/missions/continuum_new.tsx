import React, { useState } from "react";
import { PlayerCrew } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { MissionChallenge, Quest, QuestFilterConfig } from "../../model/missions";
import { Notification } from "../page/notification";
import { useStateWithStorage } from "../../utils/storage";
import { QuestImportComponent } from "./quest_importer";
import { NavMapItem, getNodePaths, makeNavMap } from "../../utils/episodes";
import { HighlightItem, MissionMapComponent, cleanTraitSelection } from "./mission_map";
import { QuestSolverComponent } from "./solver_component";
import { IQuestCrew, QuestSolverCacheItem, QuestSolverResult } from "../../model/worker";
import { Checkbox, Dropdown, Message, Step, Table } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { QuestCrewTable } from "./quest_crew_table";
import { v4 } from "uuid";
import { QuestSelector } from "./quest_selector";
import { TraitSelection } from "./trait_selector";
import { PathTable } from "./path_table";
import { CrewDropDown } from "../base/crewdropdown";
import ItemDisplay from "../itemdisplay";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { CrewBaseCells, getBaseTableConfig } from "../crewtables/views/base";
import { getTopQuipmentTableConfig, TopQuipmentScoreCells } from "../crewtables/views/topquipment";
import { Filter } from "../../model/game-elements";
import { ICrewFilter, IRosterCrew } from "../crewtables/model";
import { getItemWithBonus } from "../../utils/itemutils";
import { PowerMode, QuipmentToolsFilter } from "../crewtables/filters/quipmenttools";
import { CrewConfigTable } from "../crewtables/crewconfigtable";
import { oneCrewCopy } from "../../utils/crewutils";
import { UnifiedWorker } from "../../typings/worker";

export interface RemoteQuestStore {
    id: number,
    quest: Quest
}

export interface ContinuumComponentProps {
    roster: (PlayerCrew | CrewMember)[];
}

export interface DiscoveredMissionInfo {
    mission: ContinuumMission;
    remoteQuests: boolean[];
}

export const ContinuumComponentNew = (props: ContinuumComponentProps) => {

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    /* Global Data Check & Initialization */

    const context = React.useContext(GlobalContext);

    const { t } = context.localized;
    const { continuum_missions } = context.core;

    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionId = continuum_missions[continuum_missions.length - 1].id;
    const missionUrl = `/structured/continuum/${missionId}.json`;

    const [running, setRunning] = React.useState(false);

    /* Missions Data Initialization & Persistence */

    const [remoteQuests, setRemoteQuests] = useStateWithStorage<RemoteQuestStore[]>('continuum/remoteQuests', [], { rememberForever: true, compress: true });
    const [mission, internalSetMission] = React.useState<ContinuumMission | undefined>();
    const [currentHasRemote, setCurrentHasRemote] = React.useState(false);

    const getRemoteQuestFlags = () => {
        if (mission?.quests?.length) {
            let b = [] as boolean[];
            for (let i = 0; i < mission.quests.length; i++) {
                if (mission.quests[i]) {
                    b[i] = remoteQuests.some(rq => rq.id === (mission.quests as Quest[])[i].id);
                }
            }
            return b;
        }
        return mission?.quests?.map(q => false);
    }

    const setMission = (value?: ContinuumMission) => {
        if (!value) {
            internalSetMission(undefined);
            return;
        }

        if (!value.discover_date) {
            value.discover_date = mostRecentDate;
        }
        else if (typeof value.discover_date === 'string') {
            value.discover_date = new Date(value.discover_date);
        }

        if (remoteQuests.length) {
            if (value.quests) {
                for (let rem of remoteQuests) {
                    let f = value.quests?.findIndex(q => q.id === rem.id);
                    if (f !== -1) {
                        value.quests[f] = rem.quest;
                    }
                }
            }
        }

        internalSetMission(value);
   }

    /* Component State */

    const [showPane, setShowPane] = useStateWithStorage('continuum/showPane', 0);
    const [showResults, setShowResults] = useStateWithStorage('continuum/showResults', 0);
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [clearInc, setClearInc] = React.useState(0);
    const [missionPool, setMissionPool] = React.useState([] as IQuestCrew[]);
    const [selCrew, setSelCrew] = useStateWithStorage('continuum/selCrew', [] as number[] | undefined);

    const [questId, setQuestId] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);

    const [selectedTraits, setSelectedTraits] = useStateWithStorage('continuum/selectedTraits', [] as TraitSelection[]);
    const [highlighted, setHighlighted] = useStateWithStorage<HighlightItem[]>('continuum/selected', []);

    const [missionConfig, setMissionConfig] = useStateWithStorage<QuestFilterConfig>('continuum/missionConfig', { mastery: 0, idleOnly: true, showAllSkills: false, includeCurrentQp: true }, { rememberForever: true });
    const [activeConfig, setActiveConfig] = React.useState<QuestFilterConfig>(missionConfig);

    const [internalSolverResults, internalSetSolverResults] = React.useState<QuestSolverCacheItem[]>([]);

    const getCurrentKey = () => {
        return `${mission?.id}/${quest?.id}/${mastery}`;
    }

    const getSolverResults = () => {
        let key = getCurrentKey();
        if (Array.isArray(internalSolverResults) === false) {
            internalSetSolverResults([]);
            return undefined;
        }
        return internalSolverResults?.find(r => r.key === key);
    }

    const setSolverResults = (value?: QuestSolverResult) => {

        if (!value && showPane === 1) {
            setShowPane(0);
        }
        else if (value && showPane === 0) {
            setShowPane(1);
        }

        let sr = [...internalSolverResults];
        let key = getCurrentKey();
        let idx = sr.findIndex(r => r.key === key);

        if (idx !== -1) {
            if (value) {
                sr[idx].result = value;
            }
            else {
                sr.splice(idx, 1);
            }
        }
        else if (value) {
            sr.push({
                key: key,
                result: value
            })
        }

        internalSetSolverResults(sr);
    }

    const { includePartials, noTraitBonus, alwaysCrit, buildableOnly, cheapestFirst, showAllSkills, mastery, idleOnly, considerUnowned, considerFrozen, qpOnly, ignoreQpConstraint, includeCurrentQp } = missionConfig;

    const setIncludePartials = (value: boolean) => {
        setMissionConfig({ ...missionConfig, includePartials: value });
    }

    const setIdleOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, idleOnly: value });
    }

    const setConsiderFrozen = (value: boolean) => {
        setMissionConfig({ ...missionConfig, considerFrozen: value });
    }

    const setConsiderUnowned = (value: boolean) => {
        setMissionConfig({ ...missionConfig, considerUnowned: value });
    }

    const setQpOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, qpOnly: value });
    }

    const setIncludeCurrentQp = (value: boolean) => {
        setMissionConfig({ ...missionConfig, includeCurrentQp: value });
    }

    const setIgnoreQpConstraint = (value: boolean) => {
        setMissionConfig({ ...missionConfig, ignoreQpConstraint: value });
    }

    const setMastery = (value: number) => {
        setMissionConfig({ ...missionConfig, mastery: value });
    }

    const setShowAllSkills = (value: boolean) => {
        setMissionConfig({ ...missionConfig, showAllSkills: value });
    }

    const setCheapestFirst = (value: boolean) => {
        setMissionConfig({ ...missionConfig, cheapestFirst: value });
    }

    const setBuildableOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, buildableOnly: value });
    }

    const setAlwaysCrit = (value: boolean) => {
        setMissionConfig({ ...missionConfig, alwaysCrit: value });
    }

    const setNoTraitBonus = (value: boolean) => {
        setMissionConfig({ ...missionConfig, noTraitBonus: value });
    }

    /* Component Initialization & State Management */

    React.useEffect(() => {
        let crew = context.player.playerData?.player.character.crew;
        if (crew?.length) {
            crew = crew.filter(f => {
                f.q_bits ??= 0;
                if (!f.immortal) return false;
                if (!considerFrozen && f.immortal > 0) return false;
                if (qpOnly && f.q_bits < 100) return false;
                return true;
            }).sort((a, b) => a.immortal - b.immortal);

            if (considerUnowned) {
                crew = crew.concat(context.player.playerData?.player.character.unOwnedCrew ?? []);
            }

            crew = crew.filter((c, i) => crew?.findIndex(c2 => c2.id === c.id) === i);

            crew.sort((a, b) => {
                let an = a.q_bits ?? 0;
                let bn = b.q_bits ?? 0;
                let r = bn - an;
                if (r) return r;
                return a.name.localeCompare(b.name);
            })

            setMissionPool(crew);
            setSelCrew(selCrew?.filter(f => crew?.some(c => c.id === f)));
        }
    }, [missionConfig, context]);

    React.useEffect(() => {
        if (!!mission?.quests?.length && questId !== undefined && questId >= 0 && questId < (mission?.quests?.length ?? 0)) {
            const mquest = remoteQuests?.find(f => f.id === questId)?.quest ?? mission.quests[questId];

            const navmap = makeNavMap(mquest);
            const pathInfo = getNodePaths(navmap[0], navmap);

            let stages = {} as { [key: number]: NavMapItem[] };

            for (let item of navmap) {
                stages[item.stage] ??= [];
                stages[item.stage].push(item);
            }

            setQuest(mquest);
        }
        else if (quest !== undefined) {
            setQuest(undefined);
        }
    }, [questId]);

    React.useEffect(() => {
        if (!!mission?.quests?.length) {
            setQuestId(undefined);
            setTimeout(() => setQuestId(questId ?? 0));
        }
    }, [mission]);

    React.useEffect(() => {
        if (mission) {
            setMission({ ...mission });
        }
    }, [remoteQuests]);

    React.useEffect(() => {
        fetch(missionUrl)
            .then((response) => response.json())
            .then((result: ContinuumMission) => {
                const rq = {} as { [key: number]: Quest };
                const challenges = context.core.missionsfull
                    .filter((mission) =>
                        mission.quests.some((q) => result.quest_ids.includes(q.id))
                    )
                    .map((mission) =>
                        mission.quests.filter((q) => result.quest_ids.includes(q.id))
                    )
                    .flat()
                    .map((q) => {
                        rq[q.id] = q;
                        return q.challenges ?? [];
                    });

                let selTraits = cleanTraitSelection(result?.quests ?? [], selectedTraits);

                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        let quests = result.quests;
                        let fremote = remoteQuests.find(f => f.id === quests[i].id)
                        if (!fremote || !fremote.quest.challenges?.length) {
                            result.quests[i].challenges = rq[quests[i].id].challenges;
                            challenges[i].forEach(ch => {
                                ch.trait_bonuses = [];
                                ch.difficulty_by_mastery = [];
                            });
                        }
                        else if (fremote && mission?.quests) {
                            result.quests[i] = fremote.quest;
                        }
                    }
                }
                if (!result?.discover_date) {
                    result.discover_date = mission?.discover_date ?? mostRecentDate;
                }

                if (typeof result.discover_date === 'string') {
                    result.discover_date = new Date(result.discover_date);
                }

                setMission(result);
                setSelectedTraits(selTraits ?? []);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
    }, [clearInc]);

    /* Remote */

    const clearRemote = () => {
        setRemoteQuests([]);
        setSolverResults(undefined);
        setTimeout(() => {
            setClearInc(clearInc + 1);
        });
    }

    const setRemoteQuest = (quest?: Quest) => {
        if (!quest) {
            if (mission) {
                setMission({ ...mission })
            };
            return;
        }

        let rq = [ ...remoteQuests ];
        let fi = rq.findIndex(f => f.id === quest.id);

        if (fi !== -1) {
            rq[fi].quest.challenges = quest.challenges;
            rq[fi].quest = quest;
            rq[fi].id = quest.id;
        }
        else {
            rq.push({
                id: quest.id,
                quest
            });
        }

        setRemoteQuests([ ...rq ]);
        if (questId && !rq.some(r => r.id === questId)) {
            setQuestId(quest?.id);
        }
    }

    React.useEffect(() => {
        if (!mission || !quest || !remoteQuests) return;
        const hasRemote = !!mission?.quests?.find((q, idx) => q.id === quest?.id && remoteQuests && remoteQuests.some(rq => rq.id === q.id))
        setCurrentHasRemote(hasRemote);
    }, [mission, quest, remoteQuests]);

    /* Render */

    React.useEffect(() => {
        setActiveConfig({
            ...missionConfig,
            challenges: (highlighted.map(h => quest?.challenges?.filter(ch => h.quest === quest?.id && ch.id === h.challenge))?.flat() ?? []) as MissionChallenge[],
            ignoreChallenges: (highlighted.map(h => quest?.challenges?.filter(ch => h.quest === quest?.id && ch.id === h.challenge && h.excluded)?.map(q2 => q2.id ?? 0) ?? [])?.flat() ?? []) as number[],
            quest,
            mastery,
        } as QuestFilterConfig);
    }, [missionConfig, quest, highlighted]);

    if (!context.player.playerData) return <></>;

    return (
        <>
            <div>
                <Notification
                    header={t('global.work_in_progress.title')}
                    content={
                        <p>
                            {t('global.work_in_progress.heading')}
                        </p>
                    }
                    icon="bitbucket"
                    warning={true}
                />

                <QuestImportComponent
                    currentHasRemote={currentHasRemote}
                    setQuest={setRemoteQuest}
                    quest={quest}
                    questId={quest?.id}
                    setError={setErrorMsg}
                    clearQuest={clearRemote}
                />

                Current Continuum Mission: {mission?.discover_date?.toDateString()}

                <br />
                <div style={{ color: "tomato" }}>{errorMsg}</div>
                <br />
                <QuestSelector
                    masteryPlacement="bottom"
                    pageId={'continuum'}
                    mission={mission}
                    questId={questId}
                    setQuestId={setQuestId}
                    mastery={mastery}
                    setMastery={setMastery}
                    highlighted={getRemoteQuestFlags()}
                />
                <Step.Group fluid>
                    <Step
                        onClick={(e) => setShowPane(0)}
                        active={showPane === 0}
                    >
                        <Step.Content>
                            <Step.Title>Mission Board</Step.Title>
                            <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Show the mission map and select which challenges to solve.</Step.Description>
                        </Step.Content>
                    </Step>
                    <Step
                        onClick={(e) => setShowPane(1)}
                        active={showPane === 1}
                    >
                        <Step.Content>
                            <Step.Title>Quest Solver Results</Step.Title>
                            <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Show the crew and quipment calculated by the quest solver.</Step.Description>
                        </Step.Content>
                    </Step>
                </Step.Group>
                {!!mission &&
                    <div style={{ display: showPane !== 0 ? 'none' : undefined }}>
                        <MissionMapComponent
                            autoTraits={true}
                            pageId={'continuum'}
                            mission={mission}
                            showChainRewards={true}
                            isRemote={getRemoteQuestFlags()}
                            questId={questId}
                            setQuestId={setQuestId}
                            mastery={mastery}
                            setMastery={setMastery}
                            selectedTraits={selectedTraits}
                            setSelectedTraits={setSelectedTraits}
                            highlighted={highlighted}
                            setHighlighted={setHighlighted}
                        />

                    </div>}
                <CrewHoverStat targetGroup="quipment_hover" />

                <QpCrew crew={missionPool} />
            </div>
        </>
    );
};

type QpCrewProps = {
    crew: PlayerCrew[];
}
const QpCrew = (props: QpCrewProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = props;
    const quipment = globalContext.core.items.filter(i => i.type === 14).map(q => getItemWithBonus(q));
    const [questFilter, setQuestFilter] = useStateWithStorage<string[] | undefined>('/quipmentTools/questFilter', undefined);
    const [pstMode, setPstMode] = useStateWithStorage<boolean | 2 | 3>('/quipmentTools/pstMode', false, { rememberForever: true });
    const [powerMode, setPowerMode] = useStateWithStorage<PowerMode>('/quipmentTools/powerMode', 'all', { rememberForever: true });
    const [slots, setSlots] = useStateWithStorage<number | undefined>('/quipmentTools/slots', undefined, { rememberForever: true });
    const [traitsOnly, setTraitsOnly] = useStateWithStorage<boolean>('/quipmentTools/traitsOnly', false, { rememberForever: true });
    const [crewFilters, setCrewFilters] = React.useState<ICrewFilter[]>([]);
    const [currentWorker, setCurrentWorker] = React.useState<UnifiedWorker | undefined>();
    const [displayCrew, setDisplayCrew] = React.useState<IRosterCrew[]>([]);
    const [running, setRunning] = React.useState(false);
    const tableConfig = [
        ... getTopQuipmentTableConfig(t, pstMode, false)
    ] as ITableConfigRow[];

    React.useEffect(() => {
        const newcrew = crew.filter(c => {
            return !crewFilters.length || crewFilters.every(cf => cf.filterTest(c as IRosterCrew))
        });
        calculate(newcrew).then((results) => {
            setRunning(false);
            setDisplayCrew(results);
        });
        setTimeout(() => {
            setRunning(true);
        });
    }, [crewFilters, slots, crew, pstMode, powerMode]);

    return (
        <div style={{
            marginTop:'2em',
            display: 'flex',
            flexDirection: 'column',
            gap: '1em'
        }}>
            <QuipmentToolsFilter
                traitsOnly={traitsOnly}
                setTraitsOnly={setTraitsOnly}
                questFilter={questFilter}
                setQuestFilter={setQuestFilter}
                immortalOnly={true}
                maxxed={false}
                quipment={quipment}
                pstMode={pstMode}
                setPstMode={setPstMode}
                powerMode={powerMode}
                setPowerMode={setPowerMode}
                slots={slots}
                setSlots={setSlots}
                key='qpbest_tool_quests'
                pageId={'continuum_new'}
                crewFilters={crewFilters}
                setCrewFilters={setCrewFilters}
                />
                {!!running && globalContext.core.spin()}
                {!running && <CrewConfigTable
                    tableConfig={tableConfig}
                    renderTableCells={renderTableRow}
                    crewFilters={crewFilters}
                    pageId='item_info'
                    rosterCrew={displayCrew as IRosterCrew[]}
                    rosterType={'myCrew'}
                />}
        </div>
    );


    function filterTableRows(crew: CrewMember, filter: Filter[], searchParams?: string) {
        return true;
    }

    function renderTableRow(crew: CrewMember, idx?: number) {
        return (<>
            <TopQuipmentScoreCells pstMode={pstMode} crew={crew as IRosterCrew} top={crew} targetGroup='quipment_hover' quipment={quipment} />
        </>)
    }

    function calculate(crew: PlayerCrew[]): Promise<IRosterCrew[]> {
        return new Promise((resolve, reject) => {
            // immortalize the stats for quipment
            let c = crew.length;
            for (let i = 0; i < c; i++) {
                if (!crew[i].immortal) {
                    const work_crew = oneCrewCopy(crew[i]);
                    const ref_crew = globalContext.core.crew.find(f => f.symbol === work_crew.symbol);
                    if (ref_crew) {
                        work_crew.base_skills = structuredClone(ref_crew.base_skills);
                    }
                    crew[i] = work_crew;
                }
            }

            if (currentWorker) {
                currentWorker.terminate();
            }

            let worker = new UnifiedWorker('lots-worker.ts');
            worker.addEventListener('message', (result) => {
                resolve(result.data.result as IRosterCrew[]);
            });

            worker.postMessage({
                worker: 'qpower',
                config: {
                    crew,
                    quipment,
                    buffs: getActiveBuffs(),
                    max_qbits: false,
                    slots,
                    mode: powerMode
                }
            });

            setCurrentWorker(worker);
        });
    }

    function getActiveBuffs() {
        return globalContext.player.buffConfig ?? globalContext.core.all_buffs;
    }
}



