import React from "react";
import { Link } from "react-router-dom";
import { Checkbox, Icon, Rating, Step, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { CrewMember, QuippedPower } from "../../model/crew";
import { Filter } from "../../model/game-elements";
import { Quest, QuestFilterConfig } from "../../model/missions";
import { PlayerCrew } from "../../model/player";
import { IQuestCrew, QuestSolverCacheItem, QuestSolverResult } from "../../model/worker";
import { UnifiedWorker } from "../../typings/worker";
import { crewMatchesSearchFilter } from "../../utils/crewsearch";
import { applyCrewBuffs, minSkillSum, missionsToNext, oneCrewCopy } from "../../utils/crewutils";
import { NavMapItem, getNodePaths, makeNavMap } from "../../utils/episodes";
import { getItemWithBonus } from "../../utils/itemutils";
import { useStateWithStorage } from "../../utils/storage";
import CONFIG from "../CONFIG";
import { CrewTraitFilter, RarityFilter } from "../crewtables/commonoptions";
import { PowerMode, QuipmentToolsFilter } from "../crewtables/filters/quipmenttools";
import { ICrewFilter, IRosterCrew } from "../crewtables/model";
import { ShipSeatPicker } from "../crewtables/shipoptions";
import { TopQuipmentScoreCells, getTopQuipmentTableConfig } from "../crewtables/views/topquipment";
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat";
import { CrewItemsView } from "../item_presenters/crew_items";
import CrewStat from "../item_presenters/crewstat";
import { Notification } from "../page/notification";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { QuipmentProspectList } from "../voyagecalculator/quipment/quipmentprospects";
import { ChallengeError } from "./challenge_node";
import { HighlightItem, MissionMapComponent, cleanTraitSelection } from "./mission_map";
import { QuestImportComponent } from "./quest_importer";
import { QuestSelector } from "./quest_selector";
import { TraitSelection } from "./trait_selector";

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
    /* Global Data Check & Initialization */

    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;
    const { continuum_missions } = context.core;
    const dbid = playerData?.player.dbid ?? 0;
    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionId = continuum_missions[continuum_missions.length - 1].id;
    const missionUrl = `/structured/continuum/${missionId}.json`;

    /* Missions Data Initialization & Persistence */

    const [remoteQuests, setRemoteQuests] = useStateWithStorage<RemoteQuestStore[]>(`${dbid}/continuum/remoteQuests`, [], { rememberForever: true, compress: true, avoidSessionStorage: true });
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
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [clearInc, setClearInc] = React.useState(0);
    const [missionPool, setMissionPool] = React.useState([] as IQuestCrew[]);
    const [selCrew, setSelCrew] = useStateWithStorage('continuum/selCrew', [] as number[] | undefined);

    const [questId, internalSetQuestId] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);

    const [selectedTraits, setSelectedTraits] = useStateWithStorage('continuum/selectedTraits', [] as TraitSelection[]);
    const [highlighted, setHighlighted] = useStateWithStorage<HighlightItem[]>('continuum/selected', []);

    const [missionConfig, setMissionConfig] = useStateWithStorage<QuestFilterConfig>('continuum/missionConfig', { mastery: 0, idleOnly: true, showAllSkills: false, includeCurrentQp: true }, { rememberForever: true });

    const [internalSolverResults, internalSetSolverResults] = React.useState<QuestSolverCacheItem[]>([]);
    const [challengeErrors, setChallengeErrors] = React.useState<{[key:string]: ChallengeError}>({});

    const setQuestId = (callerDebug: string, value?: number) => {
        if (value !== undefined && !!mission?.quests?.length && value > mission?.quests.length) {
            value = mission.quests.findIndex(q => q.id === value);
        }
        //console.log(`setQuestId called from ${callerDebug} with value of ${value}`);
        internalSetQuestId(value);
    }
    const getCurrentKey = () => {
        return `${mission?.id}/${quest?.id}/${mastery}`;
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

    const { mastery, considerUnowned, qpOnly } = missionConfig;
    const setMastery = (value: number) => {
        setMissionConfig({ ...missionConfig, mastery: value });
    }

    /* Component Initialization & State Management */

    React.useEffect(() => {
        let crew = context.player.playerData?.player.character.crew;
        if (crew?.length) {
            crew = crew.filter(f => {
                f.q_bits ??= 0;
                if (!f.immortal) return false;
                //if (!considerFrozen && f.immortal > 0) return false;
                else if (f.immortal > 0) {
                    f.kwipment = [0, 0, 0, 0];
                    f.kwipment_expiration = [0, 0, 0, 0];
                }
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
    }, [playerData]);

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
            setTimeout(() => {
                if (mission?.quests?.length && (questId === undefined)) {
                    setQuestId("mission changed", mission.quests[0].id);
                }
            });
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
        setTimeout(() => {
            setQuestId("set remote quest", quest?.id);
        });
    }

    React.useEffect(() => {
        if (!mission || !quest || !remoteQuests) return;
        const hasRemote = !!mission?.quests?.find((q, idx) => q.id === quest?.id && remoteQuests && remoteQuests.some(rq => rq.id === q.id))
        setCurrentHasRemote(hasRemote);
    }, [mission, quest, remoteQuests]);

    /* Render */

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

                {!!mission &&
                    <div style={{ display: showPane !== 0 ? 'none' : undefined }}>
                        <MissionMapComponent
                            showOwnedQuantities={true}
                            autoTraits={true}
                            pageId={'continuum'}
                            mission={mission}
                            showChainRewards={true}
                            isRemote={getRemoteQuestFlags()}
                            questId={questId}
                            setQuestId={(questId) => setQuestId('mission map', questId)}
                            mastery={mastery}
                            setMastery={setMastery}
                            selectedTraits={selectedTraits}
                            setSelectedTraits={setSelectedTraits}
                            highlighted={highlighted}
                            setHighlighted={setHighlighted}
                            challengeErrors={challengeErrors}
                        />

                    </div>}

                {!!quest && (
                    <QpCrew
                        crew={missionPool}
                        quest={quest}
                        highlighted={highlighted}
                        mastery={mastery}
                        challengeErrors={challengeErrors}
                        setChallengeErrors={setChallengeErrors}
                    />
                )}
            </div>
        </>
    );
};

type QpCrewProps = {
    crew: PlayerCrew[];
    quest: Quest
    mastery: number,
    highlighted: HighlightItem[]
    challengeErrors: {[key:string]: ChallengeError}
    setChallengeErrors: (value: {[key:string]: ChallengeError}) => void;
}

const QpCrew = (props: QpCrewProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const { crew, quest, highlighted, mastery, challengeErrors, setChallengeErrors } = props;
    const quipment = globalContext.core.items.filter(i => i.type === 14).map(q => getItemWithBonus(q));
    const [questFilter, setQuestFilter] = useStateWithStorage<string[] | undefined>('/quipmentTools/questFilter', undefined);
    const [pstMode, setPstMode] = useStateWithStorage<boolean | 2 | 3>('/quipmentTools/pstMode', false, { rememberForever: true });
    const [powerMode, setPowerMode] = useStateWithStorage<PowerMode>('/quipmentTools/powerMode', 'all', { rememberForever: true });
    const [slots, setSlots] = useStateWithStorage<number | undefined>('/quipmentTools/slots', undefined, { rememberForever: true });
    const [traitsOnly, setTraitsOnly] = useStateWithStorage<boolean>('/quipmentTools/traitsOnly', false, { rememberForever: true });
    const [primaryOnly, setPrimaryOnly] = useStateWithStorage<boolean>('/quipmentTools/primaryOnly', false, { rememberForever: true });
    const [crewFilters, setCrewFilters] = React.useState<ICrewFilter[]>([]);
    const [currentWorker, setCurrentWorker] = React.useState<UnifiedWorker | undefined>();
    const [displayCrew, setDisplayCrew] = React.useState<IRosterCrew[]>([]);
    const [running, setRunning] = React.useState(false);
    const [showIdle, setShowIdle] = useStateWithStorage('/quipmentTools/idleCrew', false, { rememberForever: true });
    const [prospects, setProspects] = useStateWithStorage('/quipmentTools/quipProspects', {} as {[key:string]: number[]})
    const [rarities, setRarities] = useStateWithStorage('/quipmentTools/rarities', [] as number[], { rememberForever: true });
    const [traits, setTraits] = useStateWithStorage('/quipmentTools/selTraits', [] as string[], { rememberForever: true });
    const [minTraits, setMinTraits] = useStateWithStorage('/quipmentTools/minTraits', 1, { rememberForever: true });
    const [unclaimed, setUnclaimed] = useStateWithStorage('/quipment/onlyUnclaimedQuippers', false, { rememberForever: true });
    const [frozens, setFrozens] = useStateWithStorage('/quipment/frozens', false, { rememberForever: true });
    const [activePlace, setActivePlace] = React.useState("crew");
    const [selSkills, setSelSkills] = useStateWithStorage('/quipmentTools/selSkills', [] as string[]);

    const tableConfig = [
        { width: 3, column: 'name', title: t('base.crew'), sticky: true,
            pseudocolumns: ['name', 'kwipment', 'power'], translatePseudocolumn: (c) => {
                if (c === 'kwipment') c = 'quipment';
                return t(`base.${c}`) || t(`global.${c}`);
            },
            customCompare: (a: PlayerCrew, b: PlayerCrew, config) => {
                if (config.direction === 'descending') {
                    if (a.isSelected && !b.isSelected) return 1;
                    if (b.isSelected && !a.isSelected) return -1;
                }
                else {
                    if (a.isSelected && !b.isSelected) return -1;
                    if (b.isSelected && !a.isSelected) return 1;
                }
                if (config.field === 'kwipment')
                    return a.kwipment.filter(f => !!f).length - b.kwipment.filter(f => !!f).length || powerOf(a) - powerOf(b);
                if (config.field === 'power')
                    return powerOf(a) - powerOf(b);
                return a.name.localeCompare(b.name);
            }
        },
        ... getTopQuipmentTableConfig(t, pstMode, false)
    ] as ITableConfigRow[];

    const availSkills = React.useMemo(() => {
        if (!quest?.challenges?.length) return Object.keys(CONFIG.SKILLS);
        const skills = [] as string[];
        for (let ch of quest.challenges) {
            if (highlighted.length && !highlighted.some(ch2 => ch2.challenge === ch.id && !ch2.excluded)) continue;
            if (!skills.includes(ch.skill))
                skills.push(ch.skill);
        }
        if (selSkills.length) {
            setTimeout(() => {
                setSelSkills(selSkills.filter(f => skills.includes(f)));
            });
        }
        return skills;
    }, [quest, highlighted]);

    React.useEffect(() => {
        let mpro = {...prospects};
        let challenges: number[] = [];
        if (quest?.challenges?.length) {
            challenges = highlighted.filter(h => h.quest === quest.id && !h.excluded).map(h => h.challenge);
            if (!challenges?.length) {
                challenges = quest.challenges.map(ch => ch.id);
            }
        }
        if (Object.values(mpro).some(p => !p?.length || p.some(pe => !pe))) {
            setTimeout(() => {
                setProspects({});
            });
            return;
        }

        const allowedSkills = !selSkills.length ? Object.keys(CONFIG.SKILLS) : availSkills.filter(f => selSkills.includes(f));
        const cast = Object.values(globalContext.core.maincast).flat();
        const ttraits = traits?.filter(t => !['maincast', 'notmaincast'].includes(t));
        const newcrew = crew.filter(c =>
            (!rarities?.length || rarities.includes(c.max_rarity)) &&
            (!unclaimed || c.q_bits < 1300) &&
            (frozens || c.immortal <= 0) &&
            (!crewFilters.length || crewFilters.every(cf => cf.filterTest(c as IRosterCrew))) &&
            (
                (!primaryOnly && c.skill_order.some(sko => allowedSkills.includes(sko))) ||
                (primaryOnly && allowedSkills.includes(c.skill_order[0]))
            ) &&
            (
                (!traits.includes('maincast') || cast.some(trait => c.traits_hidden.includes(trait))) &&
                (!traits.includes('notmaincast') || cast.every(trait => !c.traits_hidden.includes(trait))) &&
                (!ttraits.length || (c.traits.filter(t => ttraits.includes(t)).length + c.traits_hidden.filter(t => ttraits.includes(t)).length) >= minTraits)
            )
        ).map(qc => {
            let isActive = globalContext.player.ephemeral?.activeCrew?.find(f => f.id === qc.id)?.active_status;
            qc = oneCrewCopy(qc);
            if (isActive) {
                qc.active_status = isActive;
            }
            qc.kwipment_prospects = false;
            if (prospects[qc.id]) {
                qc.skills = applyCrewBuffs(qc, globalContext.player.buffConfig ?? globalContext.core.all_buffs, false, quipment.filter(f => prospects[qc.id].includes(Number(f.item.id))).map(be => be.bonusInfo))!;
                qc.kwipment_expiration = [0, 0, 0, 0];
                qc.kwipment = prospects[qc.id];
            }
            else {
                qc.skills = applyCrewBuffs(qc, globalContext.player.buffConfig ?? globalContext.core.all_buffs, false)!;
            }
            return qc;
        }).filter(qc => {
            if (showIdle && (qc.active_status || qc.immortal > 0)) return false;

            if (challenges?.length) {
                let chmatch = quest.challenges!.filter(ch => challenges.includes(ch.id));
                if (chmatch?.length) {
                    let power_matched = false;
                    let skill_matched = chmatch.reduce((prev, ch) => {
                        if (qc.skill_order.includes(ch.skill) && qc.skills[ch.skill]) {
                            // if (qc.symbol === 'mbenga_king_ridley_crew') {
                            //     console.log('here');
                            // }
                            if (minSkillSum(qc.skills[ch.skill]) >= ch.difficulty_by_mastery[mastery]) power_matched = true;
                            return true;
                        }
                        return prev;
                    }, false);
                    qc.isSelected = power_matched;
                    return skill_matched;
                }
            }
            delete qc.isSelected;
            return true;
        });

        const errors = {} as {[key:string]: ChallengeError};

        if (challenges?.length && highlighted.length) {
            for (let ch of quest.challenges!.filter(f => highlighted.some(h => h.challenge === f.id))) {
                if (!newcrew.some(qc => qc.isSelected && qc.skill_order.includes(ch.skill) && (minSkillSum(qc.skills[ch.skill]) >= ch.difficulty_by_mastery[mastery]))) {
                    errors[ch.id] = {
                        message: t('crew_picker.no_results')
                    }
                }
            }
        }
        calculate(newcrew).then((results) => {
            setRunning(false);
            setDisplayCrew(results);
            setChallengeErrors(errors);
        });
        setTimeout(() => {
            setRunning(true);
        });
    }, [crewFilters, slots, crew, powerMode, quest, highlighted, mastery, prospects, showIdle, rarities, unclaimed, frozens, selSkills, primaryOnly, traits, minTraits]);

    const prospectList = React.useMemo(() => {
        const newProspects = [] as PlayerCrew[];
        for(let [id, items] of Object.entries(prospects)) {
            let c = displayCrew.find(f => f.id === Number(id)) as PlayerCrew;
            if (!c) continue;
            c = oneCrewCopy(c);
            c.kwipment_prospects = true;
            newProspects.push(c);
        }
        return newProspects;
    }, [displayCrew]);

    return (
        <div style={{
            marginTop:'2em',
            display: 'flex',
            flexDirection: 'column',
            gap: '1em'
        }}>
            <CrewHoverStat targetGroup="quipment_hover" />
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
            <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '1em',
                flexWrap: 'wrap'
            }}>
                <RarityFilter rarityFilter={rarities} setRarityFilter={setRarities} />
                <CrewTraitFilter
                    minTraitMatches={minTraits}
                    setMinTraitMatches={setMinTraits}
                    traitFilter={traits}
                    setTraitFilter={setTraits} />
                <div style={{display: 'grid', gridTemplateAreas: `'thing1' 'thing2'`, gap: '0.5em', marginRight: '0.5em'}}>
                    <Checkbox
                        style={{ gridArea: 'thing1' }}
                        label={t('options.crew_status.idle')}
                        checked={showIdle}
                        onChange={(e, { checked }) => setShowIdle(!!checked)}
                    />
                    <Checkbox
                        style={{ gridArea: 'thing2' }}
                        label={t('options.roster_maintenance.advanceable')}
                        checked={unclaimed}
                        onChange={(e, { checked }) => setUnclaimed(!!checked)}
                    />
                </div>
                <div style={{display: 'grid', gridTemplateAreas: `'thing1' 'thing2'`, gap: '0.5em', margin: '0.5em'}}>
                    <Checkbox
                        style={{ gridArea: 'thing1' }}
                        disabled={showIdle}
                        label={t('voyage.picker_options.frozen')}
                        checked={frozens}
                        onChange={(e, { checked }) => setFrozens(!!checked)}
                    />
                    <div style={{ gridArea: 'thing2'}}>
                        &nbsp;
                    </div>
                </div>
            </div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: '1em'}}>
                <div style={{ gridArea: 'thing1'}}>
                    <ShipSeatPicker
                        availableSeats={availSkills}
                        setSelectedSeats={setSelSkills}
                        selectedSeats={selSkills}
                        />
                </div>
                <div style={{ gridArea: 'thing2'}}>
                    <Checkbox
                        checked={primaryOnly}
                        onChange={(e, { checked }) => setPrimaryOnly(!!checked)}
                        label={t('base.primary')}
                        />
                </div>
            </div>
            {!!running && <div style={{height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}> {globalContext.core.spin()}</div>}
            {!running && !!prospectList.length && (<>
            <Step.Group fluid>
				<Step active={activePlace === 'crew'} onClick={() => setActivePlace('crew')}>
					<Icon name='users' />
					<Step.Content>
						<Step.Title>{t('base.crew')}</Step.Title>
					</Step.Content>
				</Step>
				<Step active={activePlace === 'prospectDetail'} onClick={() => setActivePlace('prospectDetail')}>
					<Icon name='shopping bag' />
					<Step.Content>
						<Step.Title>{t('voyage.quipment.title')}</Step.Title>
					</Step.Content>
				</Step>
			</Step.Group>
            </>)}
            <div style={{
                display: running || (!!prospectList.length && activePlace === 'prospectDetail') ? 'none' : undefined
            }}>
                <SearchableTable
                    id="continuum_helper_crew"
                    showSortDropdown
                    initOptions={{
                        column: 'power',
                        direction: 'descending'
                    }}
                    config={tableConfig}
                    renderTableRow={renderTableRow}
                    filterRow={filterTableRows}
                    data={displayCrew as IRosterCrew[]}
                />
            </div>
            {!!prospectList.length && <div style={{
                display: activePlace !== 'prospectDetail' ? 'none' : undefined
            }}>
                <QuipmentProspectList
                    crew={prospectList}
                    no_voyage={true}
                />
            </div>}
        </div>
    );

    function filterTableRows(crew: CrewMember, filter: Filter[], searchParams?: string) {
        return crewMatchesSearchFilter(crew, filter, searchParams);
    }

    function renderTableRow(crew: PlayerCrew, idx?: number) {
        let ownedbg = '';
        let cellcrew = crew;
		if (crew.have) {
			let kwip = crew.kwipment;
			if (kwip?.length === 4 && kwip?.every((qs) => typeof qs === 'number' ? !!qs : !!qs[1])) {
				ownedbg = `url(${process.env.VITE_ASSETS_URL}collection_vault_vault_item_bg_postimmortalized_256.png)`;
			}
			else if (crew.immortal && (crew.immortal === -1 || crew.immortal > 0)) {
				ownedbg = `url(${process.env.VITE_ASSETS_URL}collection_vault_vault_item_bg_immortalized_256.png)`;
			}
		}
        if (prospects[crew.id]) {
            cellcrew = {...crew, kwipment_prospects: true };
        }
        return (
            <Table.Row>
                <Table.Cell className='ui segment'
                    style={{
                        position: 'sticky', left: 0,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage:
                            `linear-gradient(to left, ${CONFIG.RARITIES[crew.max_rarity].rgb.replace(", 1)", ", 0.1)")}, rgba(127,127,127,0))` +
                            (ownedbg ? ", " + ownedbg : '') ,
                        }}>
                    <div style={{ display: 'flex', justifyContent: 'center'}}>
                            <div style={{
                                width: '22em',
                                display: 'grid',
                                gridTemplateAreas: `'img name check' 'img rating rating' 'traits traits traits' 'quipment quipment quipment'`,
                                gridTemplateColumns: '84px auto auto',
                                alignItems: 'center',
                                justifyContent: 'stretch',
                                gap: '1em',
                                }}>
                                <div style={{gridArea: 'img', margin: '1em'}}>
                                    <CrewTarget inputItem={crew} targetGroup="quipment_hover">
                                        <img src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlPortrait}`}
                                            style={{height:'64px'}} />
                                    </CrewTarget>
                                </div>
                                <div style={{gridArea: 'check', display: 'inline-flex', justifyContent:'flex-end'}}>
                                    {!!crew.isSelected && <Icon size='large' name= 'check' color='green' />}
                                </div>
                                <div style={{gridArea: 'name', display: 'flex', alignItems: 'center'}}>
                                    <Link to={`/crew/${crew.symbol}`} style={{fontWeight: 'bold', fontSize: '1.2em'}}>
                                        {crew.name}
                                    </Link>
                                    {!!crew.immortal && crew.immortal > 0 && <Icon name='snowflake' style={{margin:'0.5em'}} />}
                                    {!!crew.active_status && <Icon name='space shuttle' style={{margin:'0.5em'}}  />}
                                </div>
                                <div style={{gridArea: 'rating', width: '5em', margin: 0, padding: 0}}>
                                    <Rating size={'tiny'} icon="star" rating={crew.max_rarity} maxRating={crew.max_rarity} />
                                </div>
                                <div style={{gridArea: 'traits', fontStyle: 'italic', margin: '0 0.5em'}}>
                                    {Object.entries(getTraitBoosts(crew)).map(([trait, score]) => {
                                        return (<span key={`${crew.symbol}_trait_${trait}_power`}>
                                            {TRAIT_NAMES[trait]} +{score}
                                        </span>)
                                    }).reduce((p, n) => p !== undefined ? <>{p}, {n}</> : <>{n}</>, undefined as React.ReactNode | undefined)}
                                </div>
                                <div className='ui segment' style={{gridArea: 'quipment', marginBottom: '0.5em'}}>
                                    <CrewItemsView altProspectText={t('global.clear')} crew={cellcrew} quipment={true} prospectsClicked={(c) => clearIt(c)} />
                                    <div style={{marginLeft:'2em', marginTop: '0.5em'}}>
                                        {crew.skill_order.map(skill => {
                                            return (<CrewStat scale={0.8} key={`${crew.symbol}_${skill}_qmpv`} skill_name={skill} data={crew.skills[skill]} />)
                                        })}
                                    </div>
                                </div>
                            </div>
                    </div>
                </Table.Cell>
                <TopQuipmentScoreCells
                    showButtonClick={(lot) => {
                        addLot(crew, lot);
                    }}
                    showButtonText={t('global.apply')}
                    showButtonColor="green"
                    pstMode={pstMode}
                    crew={crew as IRosterCrew}
                    top={crew}
                    targetGroup='quipment_hover'
                    quipment={quipment}
                />
            </Table.Row>
        )
    }

    function clearIt(c?: PlayerCrew) {
        if (c) {
            let mpro = {...prospects};
            delete mpro[c.id];
            setRunning(true);
            setProspects(mpro);
        }
    }

    function addLot(crew: PlayerCrew, lot: QuippedPower) {
        let mpro = {...prospects};
        mpro[crew.id] = Object.values(lot.skill_quipment).flat().map(e => Number(e.id));
        setRunning(true);
        setProspects(mpro);
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

    function getTraitBoosts(crew: PlayerCrew) {
        const boosts = {} as {[key:string]: number};
        if (!quest?.challenges?.length || !quest.challenges.every(ch => ch.trait_bonuses?.length)) return {};
        let elig = quest.challenges.filter(ch => crew.traits.some(tr => ch.trait_bonuses.some(bs => bs.trait === tr)));
        for (let ch of elig) {
            for (let bonus of ch.trait_bonuses) {
                if (crew.traits.includes(bonus.trait)) {
                    boosts[bonus.trait] ??= 0;
                    if (boosts[bonus.trait] < bonus.bonuses[mastery]) {
                        boosts[bonus.trait] = bonus.bonuses[mastery];
                    }
                }
            }
        }
        return boosts;
    }

    function boostSum(boost: {[key:string]:number}) {
        return Object.values(boost).reduce((p, n) => p + n, 0);
    }

    function powerOf(crew: PlayerCrew) {
        return minSkillSum(Object.values(crew.skills)) + boostSum(getTraitBoosts(crew));
    }
}

