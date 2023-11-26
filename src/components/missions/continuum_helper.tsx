import React from "react";
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
import { QuestSolverCacheItem, QuestSolverResult } from "../../model/worker";
import { Checkbox, Message, Step } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { QuestCrewTable } from "./quest_crew_table";
import { v4 } from "uuid";
import { QuestSelector } from "./quest_selector";
import { TraitSelection } from "./trait_selector";

export interface ContinuumComponentProps {
    roster: (PlayerCrew | CrewMember)[];
}

export interface DiscoveredMissionInfo {
    mission: ContinuumMission;
    remoteQuests: boolean[];
}

export const ContinuumComponent = (props: ContinuumComponentProps) => {

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    /* Global Data Check & Initialization */

    const context = React.useContext(GlobalContext);
    if (!context.player.playerData) return <></>

    const { continuum_missions } = context.core;

    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionUrl = `/structured/continuum/${continuum_missions[continuum_missions.length - 1].id}.json`;
    const [running, setRunning] = React.useState(false);

    /* Missions Data Initialization & Persistence */

    const [groupedMissions, internalSetGroupedMissions] = useStateWithStorage('continuum/discoveredMissions', [] as DiscoveredMissionInfo[], { rememberForever: true });
    const setGroupedMissions = (value: DiscoveredMissionInfo[]) => {
        value = value.filter(f => f.mission.discover_date.getTime() === mostRecentDate.getTime());
        internalSetGroupedMissions(value);
    }
    const getMissionData = () => {
        return groupedMissions.find(f => f.mission.discover_date?.getTime() === mostRecentDate?.getTime()) ?? (groupedMissions.length ? groupedMissions[groupedMissions.length - 1] : undefined);
    }

    groupedMissions?.forEach(m => {
        if (typeof m.mission.discover_date === 'string') {
            m.mission.discover_date = new Date(m.mission.discover_date);
        }
        if (m.remoteQuests?.length !== m.mission.quests?.length) {
            m.remoteQuests = m.mission.quests?.map(q => false) ?? [];
        }
    })

    const mlookup = getMissionData();
    const startMission = mlookup?.mission;

    const [remoteQuestFlags, internalSetRemoteQuestFlags] = React.useState<boolean[] | undefined>(mlookup?.remoteQuests);
    const [mission, internalSetMission] = React.useState<ContinuumMission | undefined>(startMission);

    const setRemoteQuestFlags = (value: boolean[]) => {
        let x = 0;
        let data = getMissionData();
        if (!data) return;

        data.remoteQuests ??= [];

        for (let q of mission?.quests ?? []) {
            if (data.remoteQuests.length < x) data.remoteQuests.push(false);
            if (value.length < x) value.push(false);
            data.remoteQuests[x] = value[x];
            x++;
        }

        setGroupedMissions([...groupedMissions]);
        internalSetRemoteQuestFlags(data.remoteQuests);
    }

    const setMissionAndRemotes = (value?: ContinuumMission, remotes?: boolean[]) => {
        if (!value) {
            internalSetMission(undefined);
            setRemoteQuestFlags([]);
            return;
        }

        if (!value.discover_date) {
            value.discover_date = mostRecentDate;
        }
        else if (typeof value.discover_date === 'string') {
            value.discover_date = new Date(value.discover_date);
        }

        let ng = [...groupedMissions];
        const f = groupedMissions.findIndex(f => f.mission.discover_date?.getTime() === value.discover_date?.getTime());

        if (f === -1) {
            ng.push({
                mission: value,
                remoteQuests: remotes ?? value.quests?.map(q => false) ?? []
            });
        }
        else {
            ng[f].mission = value;
            ng[f].remoteQuests = remotes ?? ng[f].remoteQuests ?? value.quests?.map(q => false) ?? [];
        }

        ng.sort((a, b) => {
            if (!a.mission.discover_date) a.mission.discover_date = mostRecentDate;
            if (!b.mission.discover_date) b.mission.discover_date = mostRecentDate;
            return a.mission.discover_date.getTime() - b.mission.discover_date.getTime()
        });

        ng = ng.filter((t, idx) => ng.findIndex(q => q.mission.discover_date?.getTime() === t.mission.discover_date?.getTime()) === idx)
        setGroupedMissions(ng);
    }

    React.useEffect(() => {
        if (!groupedMissions.length) return;

        let fmission = groupedMissions.find(f => f.mission.discover_date?.getTime() === mostRecentDate?.getTime());

        if (!fmission) {
            fmission = groupedMissions[groupedMissions.length - 1];
        }
        if (!!fmission.mission.quests?.length && fmission.mission.quests.length !== fmission?.remoteQuests?.length) {
            fmission.remoteQuests = fmission.mission.quests.map(q => false);
        }
        internalSetRemoteQuestFlags(fmission.remoteQuests);
        internalSetMission(fmission.mission);
    }, [groupedMissions]);

    /* Component State */

    const [showPane, setShowPane] = useStateWithStorage('continuum/showPane', 0);
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [clearInc, setClearInc] = React.useState(0);

    const [questId, setQuestId] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);

    const [selectedTraits, setSelectedTraits] = useStateWithStorage('continuum/selectedTraits', [] as TraitSelection[]);
    const [highlighted, setHighlighted] = useStateWithStorage<HighlightItem[]>('continuum/selected', []);

    const [missionConfig, setMissionConfig] = useStateWithStorage<QuestFilterConfig>('continuum/missionConfig', { mastery: 0, idleOnly: true, showAllSkills: false });

    const { alwaysCrit, buildableOnly, cheapestFirst, showAllSkills, mastery, idleOnly, considerFrozen, qpOnly, ignoreQpConstraint, includeCurrentQp } = missionConfig;

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
        
        let sr = [ ... internalSolverResults ];
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

    const setIdleOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, idleOnly: value });
    }

    const setConsiderFrozen = (value: boolean) => {
        setMissionConfig({ ...missionConfig, considerFrozen: value });
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

    /* Component Initialization & State Management */

    React.useEffect(() => {
        if (!!mission?.quests?.length && questId !== undefined && questId >= 0 && questId < (mission?.quests?.length ?? 0)) {
            const mquest = mission.quests[questId];
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
                let remotes = result?.quests?.map(q => false) ?? [] as boolean[];
                let current = getMissionData();

                if (result.quests?.length && !!quest && !!remoteQuestFlags?.length && remoteQuestFlags.length === result.quests.length) {
                    remotes = remoteQuestFlags;
                }

                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        if (!remotes[i] ||
                            (current?.mission.quests && rq[result.quests[i].id].challenges?.length !== current.mission.quests[i].challenges?.length)) {

                            result.quests[i].challenges = rq[result.quests[i].id].challenges;
                            challenges[i].forEach(ch => {
                                ch.trait_bonuses = [];
                                ch.difficulty_by_mastery = [];
                            });
                            remotes[i] = false;
                        }
                        else if (remotes[i] && current?.mission?.quests) {
                            result.quests[i] = current.mission.quests[i];
                        }
                    }
                }
                if (!result?.discover_date) {
                    result.discover_date = current?.mission?.discover_date ?? mostRecentDate;
                }

                if (typeof result.discover_date === 'string') {
                    result.discover_date = new Date(result.discover_date);
                }

                setMissionAndRemotes(result, remotes);
                setSelectedTraits(selTraits ?? []);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
    }, [clearInc]);

    /* Remote */

    const clearRemote = () => {
        setRemoteQuestFlags([]);
        setSolverResults(undefined);
        setTimeout(() => {
            setClearInc(clearInc + 1);
        });
    }

    const setRemoteQuest = (quest?: Quest) => {
        if (!quest) {
            if (mission) {
                setMissionAndRemotes({ ...mission }, [])
            };
            return;
        }
        if (mission?.quests?.length && remoteQuestFlags?.length === mission?.quests?.length) {
            for (let i = 0; i < mission.quests.length; i++) {
                if (mission.quests[i].id === quest.id) {
                    mission.quests[i] = quest;
                    remoteQuestFlags[i] = true;
                    setMissionAndRemotes({ ...mission }, [...remoteQuestFlags]);
                    return;
                }
            }
        }
    }

    /* Render */
    const solverResults = getSolverResults()?.result;
    const boardFail = solverResults?.failed?.some(fid => quest?.challenges?.find(ch => ch.id === fid)?.children?.length === 0);

    type SolverOption = {
        title: string,
        description: string,
        value: boolean,
        setValue: (value: boolean) => void;
        type: string;
    }

    const solverOptions = [
        {
            title: "Only Idle Crew",
            description: "Only consider crew that are idle (not on shuttles or voyages.)",
            value: idleOnly,
            setValue: setIdleOnly,
            type: 'checkbox'
        },
        {
            title: "Quippable Only (>= 100 QBits)",
            description: "Consider crew with at least 1 quipment slot unlocked.",
            value: qpOnly,
            setValue: setQpOnly,
            type: 'checkbox'
        },
        {
            title: "Consider Frozen Crew",
            description: "Consider frozen crew (frozen crew are considered with all 4 quipment slots)",
            value: considerFrozen,
            setValue: setConsiderFrozen,
            type: 'checkbox'
        },
        {
            title: "Assume Max QBits (Ignore Limit)",
            description: "Assume all eligible crew have all 4 quipment slots unlocked.",
            value: ignoreQpConstraint,
            setValue: setIgnoreQpConstraint,
            type: 'checkbox'
        },
        {
            title: "Use Current Quipment on Crew",
            description: "Keep current quipment on crew. If this option is not checked, current quipment is ignored and overwritten.",
            value: includeCurrentQp,
            setValue: setIncludeCurrentQp,
            type: 'checkbox'
        },
        {
            title: "Show All Skills",
            description: "Show all crew skills.",
            value: showAllSkills,
            setValue: setShowAllSkills,
            type: 'checkbox'
        },
        {
            title: "Use Cheapest Quipment First",
            description: "Normally, the quipment with the greatest boost is used, first. Check this box to sort quipment by cheapest to build, instead. Note that this is not optimal for crew with fewer crew slots as less-powerful components will use slots, first.",
            value: cheapestFirst,
            setValue: setCheapestFirst,
            type: 'checkbox'
        },
        {
            title: "Consider Only Buildable Quipment",
            description: "Only consider Quipment that you can currently build. Items will be deducted as the calculations are made.",
            value: buildableOnly,
            setValue: setBuildableOnly,
            type: 'checkbox'
        },
        {
            title: "Always Calculate Crit",
            description: "Calculate crit even if the challenges are solved.",
            value: alwaysCrit,
            setValue: setAlwaysCrit,
            type: 'checkbox'
        }

    ] as SolverOption[];

    const SolverOptionComponent = (props: { config: SolverOption }) => {
        const { title, description, value, setValue, type } = props.config;
        const id = v4();
        return (
            <React.Fragment>
                <div
                    title={description}
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: "0.5em" }}>
                    <Checkbox id={id} checked={value} onChange={(e, { checked }) => setValue(!!checked)} />
                    <label htmlFor={id}>&nbsp;&nbsp;{title}</label>
                </div>
            </React.Fragment>
        )
    }

    return (
        <>
            <div>
                <Notification
                    header="Work In Progress"
                    content={
                        <p>
                            This page is a work in progress. Some functions and features may
                            be non-functional, incomplete, or missing.
                        </p>
                    }
                    icon="bitbucket"
                    warning={true}
                />

                {questId !== undefined && !!remoteQuestFlags &&
                    <QuestImportComponent
                        defaultCollapsed={remoteQuestFlags[questId]}
                        setQuest={setRemoteQuest}
                        quest={quest}
                        questId={quest?.id}
                        setError={setErrorMsg}
                        clearQuest={clearRemote}
                    />
                }
                Current Continuum Mission: {mission?.discover_date?.toDateString()}
                <br />
                <div style={{ color: "tomato" }}>{errorMsg}</div>
                <br />

                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "1em",
                    flexWrap: "wrap",
                    gap: "0.5em"
                }}>

                    <div style={{ display: "inline-block" }}>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            {solverOptions.map((opt, idx) => (
                                <div key={`solveopt_${idx}`} style={{
                                    width: isMobile ? '100%' : '25%',
                                    margin: "1em 0em"
                                }}>
                                    <SolverOptionComponent config={opt} />
                                </div>
                            ))}
                        </div>
                        <div style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
                            <QuestSolverComponent
                                setResults={setSolverResults}
                                setConfig={setMissionConfig}
                                clearResults={() => setSolverResults(undefined)}
                                setRunning={setRunning}
                                disabled={!quest?.challenges?.some(ch => ch.difficulty_by_mastery?.some(d => !!d))}
                                config={{
                                    quest,
                                    challenges: (highlighted.map(h => quest?.challenges?.filter(ch => ch.id === h.challenge))?.flat() ?? []) as MissionChallenge[],
                                    idleOnly,
                                    considerFrozen,
                                    qpOnly,
                                    ignoreQpConstraint,
                                    mastery,
                                    includeCurrentQp,
                                    buildableOnly,
                                    cheapestFirst,
                                    alwaysCrit
                                }}
                            />
                        </div>
                    </div>
                </div>
                {running &&
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {context.core.spin()}
                    </div>}

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
                <QuestSelector
                    pageId={'continuum'}
                    mission={mission}
                    questId={questId}
                    setQuestId={setQuestId}
                    mastery={mastery}
                    setMastery={setMastery}
                    highlighted={remoteQuestFlags}
                />

                {mission &&
                    <div style={{ display: showPane === 1 ? 'none' : undefined }}>
                        <MissionMapComponent
                            autoTraits={true}
                            pageId={'continuum'}
                            mission={mission}
                            showChainRewards={true}
                            isRemote={remoteQuestFlags}
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

                {showPane === 1 && !!solverResults && !solverResults?.fulfilled && (
                    <Message warning={!boardFail} error={boardFail}>
                        <Message.Header>
                            Quest Solve Incomplete
                        </Message.Header>
                        <Message.Content>
                            {boardFail && <><b>Final challenges failed.</b></> || <>Could not find crew to complete all challenges.</>}
                            Try adjusting your calculation options, and try again.<br />
                            {!!solverResults?.failed?.length && <>Failed Challenges: <b>{solverResults?.failed?.map(fid => quest?.challenges?.find(ch => ch.id === fid)?.name)?.reduce((p, n) => p ? `${p}, ${n}` : n, '')}</b></>}

                        </Message.Content>
                    </Message>
                )}

                <div style={{ display: showPane === 0 ? 'none' : undefined }}>
                    <ItemHoverStat targetGroup={'continuum_items_1'} />
                    <QuestCrewTable
                        quest={quest}
                        solverResults={solverResults}
                        pageId={'continuum'}
                        config={missionConfig} />
                </div>
                {!solverResults && <div style={{ height: '50vh' }}>&nbsp;</div>}
            </div>
        </>
    );
};
