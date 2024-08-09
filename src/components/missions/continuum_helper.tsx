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
import { Checkbox, Dropdown, Message, Step } from "semantic-ui-react";
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

export const ContinuumComponent = (props: ContinuumComponentProps) => {

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    /* Global Data Check & Initialization */

    const context = React.useContext(GlobalContext);
    if (!context.player.playerData) return <></>
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
    
    const solverResults = getSolverResults()?.result;
    const boardFail = solverResults?.failed?.filter(fid => quest?.challenges?.find(ch => ch.id === fid)?.children?.length === 0)?.length === quest?.challenges?.filter(ch => !ch.children?.length)?.length;

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
            title: "Consider Unowned Crew",
            description: "Consider unowned crew (unowned crew are considered with all 4 quipment slots)",
            value: considerUnowned,
            setValue: setConsiderUnowned,
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
        },
        {
            title: "Exclude Trait Bonuses",
            description: "Exclude incorporating trait bonus numbers into the crew solver calculation.",
            value: noTraitBonus,
            setValue: setNoTraitBonus,
            type: 'checkbox'
        },
        {
            title: "Include Partial Solves",
            description: "Include partial solves even if complete solves are found.",
            value: includePartials,
            setValue: setIncludePartials,
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

    React.useEffect(() => {
        setActiveConfig({
            ...missionConfig,
            challenges: (highlighted.map(h => quest?.challenges?.filter(ch => h.quest === quest?.id && ch.id === h.challenge))?.flat() ?? []) as MissionChallenge[],
            ignoreChallenges: (highlighted.map(h => quest?.challenges?.filter(ch => h.quest === quest?.id && ch.id === h.challenge && h.excluded)?.map(q2 => q2.id ?? 0) ?? [])?.flat() ?? []) as number[],
            quest,
            mastery,
        } as QuestFilterConfig);
    }, [missionConfig, quest, highlighted]);

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

                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "1em",
                    flexWrap: "wrap",
                    gap: "0.5em"
                }}>
                    <div style={{ display: "inline-block", textAlign: 'center' }}>
                        <h3>Crew Finder Options</h3>
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
                                    margin: "1em 0em 0.5em 0em"
                                }}>
                                    <SolverOptionComponent config={opt} />
                                </div>
                            ))}
                        </div>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center"
                        }}>
                            
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                gap:"1em"
                            }}>
                            {selCrew?.map((cn) => {

                                const crew = missionPool.find(f => f.id === cn);
                                if (!crew) return <></>
                                return <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center"
                                    }}
                                >
                                    
                                <ItemDisplay
                                        src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                        size={64}
                                        rarity={crew.rarity ?? crew.max_rarity}
                                        maxRarity={crew.max_rarity}
                                        targetGroup={'continuum_quest_crew'}
                                        allCrew={context.core.crew}
                                        />
                                    <i style={{marginTop: "0.25em"}}>{crew.name}</i>
                                </div>
                            })                            
                            }
                            </div>
                            <CrewDropDown pool={missionPool}
                                style={{
                                    margin: "0.5em",
                                    maxWidth: isMobile ? "100%" : "50%",
                                    minWidth: isMobile ? "100%" : "25%"
                                }}
                                placeholder={"Select up to 3 quest crew..."}
                                setSelection={setSelCrew}
                                selection={selCrew}
                                multiple={true}
                                maxSelection={3}
                                />
                            
                        </div>
                        
                        <div style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
                            <QuestSolverComponent
                                setResults={setSolverResults}
                                setConfig={setMissionConfig}
                                clearResults={() => setSolverResults(undefined)}
                                setRunning={setRunning}
                                disabled={!quest?.challenges?.some(ch => ch.difficulty_by_mastery?.some(d => !!d))}
                                config={{ ...activeConfig, requiredCrew: selCrew }}
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

                {showPane === 1 && !!solverResults && (!solverResults?.fulfilled || solverResults?.pathspartial) && (
                    <Message warning={!boardFail} error={boardFail}>
                        <Message.Header>
                            {!!boardFail && <>Quest Solve Failed</>}
                            {!boardFail && <>Quest Solve Incomplete</>}
                        </Message.Header>
                        <Message.Content>
                            {(!boardFail && solverResults?.fulfilled && solverResults?.pathspartial &&
                            <p>No combinations of 3 crew could be found to completely succeed at every challenge in the selected paths.</p>
                            ) || <>
                            {boardFail && <p><b>Final challenges failed.</b></p> || <p>Could not find crew to complete all selected challenges.</p>}
                            <p>Try adjusting your challenge selections and/or finder options, and try again.</p>
                            {!highlighted?.length && <p><b><i>(Hint: Try narrowing your scope by selecting a path from the mission board)</i></b></p>}
                            {!!solverResults?.failed?.length && <>Failed Challenges: <p>{solverResults?.failed?.map(fid => quest?.challenges?.find(ch => ch.id === fid)?.name)?.reduce((p, n) => p ? `${p}, ${n}` : n, '')}</p></>}
                            </>}
                        </Message.Content>
                    </Message>
                )}

                <div style={{ display: showPane !== 1 ? 'none' : undefined }}>
                    <ItemHoverStat targetGroup={'continuum_quest_crew_items'} />
                    <CrewHoverStat targetGroup={'continuum_quest_crew'} />

                    <Step.Group fluid>
                        <Step
                            onClick={(e) => setShowResults(0)}
                            active={showResults === 0}
                        >
                            <Step.Content>
                                <Step.Title>Path Results</Step.Title>
                                <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Show crew and quipment solutions for distinct paths.</Step.Description>
                            </Step.Content>
                        </Step>
                        <Step
                            onClick={(e) => setShowResults(1)}
                            active={showResults === 1}
                        >
                            <Step.Content>
                                <Step.Title>All Crew Results</Step.Title>
                                <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Show all crew solutions with maximum possible usable quipment.</Step.Description>
                            </Step.Content>
                        </Step>
                    </Step.Group>

                    <div style={{ display: showResults !== 0 ? 'none' : undefined }}>
                        <PathTable
                            quest={quest}
                            solverResults={solverResults}
                            config={activeConfig}
                            pageId={'continuum'}
                        />
                    </div>

                    <div style={{ display: showResults !== 1 ? 'none' : undefined }}>
                        <QuestCrewTable
                            quest={quest}
                            config={activeConfig}
                            solverResults={solverResults}
                            pageId={'continuum'}
                            />
                    </div>

                    {!solverResults && <div style={{ height: '50vh' }}>&nbsp;</div>}
                </div>

            </div>
        </>
    );
};
