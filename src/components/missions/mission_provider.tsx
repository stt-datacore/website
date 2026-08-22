import React from "react";
import { ContinuumMission } from "../../model/continuum";
import { RemoteQuestStore } from "./continuum_helper";
import { GlobalContext } from "../../context/globalcontext";
import { Mission, Quest } from "../../model/missions";
import { Notification } from "../page/notification";
import { QuestImportComponent } from "./quest_importer";
import { useStateWithStorage } from "../../utils/storage";

export interface MissionProviderData {
    mission?: Mission | ContinuumMission;
    remoteQuests: RemoteQuestStore[];
    errorMsg?: string;
    quest?: Quest;
    setQuest: (value?: Quest) => void;
    clearRemoteQuests: () => void;
    setErrorMsg: (value?: string) => void;
    currentHasRemote: boolean;
    setCurrentHasRemote: (value: boolean) => void,
    getRemoteQuestFlags: () => boolean[] | undefined
}

export const DefaultMissionProviderData = {
    remoteQuests: [],
    setQuest: () => false,
    clearRemoteQuests: () => false,
    setErrorMsg: () => false,
    setCurrentHasRemote: () => false,
    currentHasRemote: false,
    getRemoteQuestFlags: () => undefined
} as MissionProviderData;

export const MissionContext = React.createContext(DefaultMissionProviderData);

export interface MissionProviderProps {
    continuum?: boolean;
    mission?: Mission | ContinuumMission;
    children: React.ReactNode;
}

export const MissionProvider = (props: MissionProviderProps) => {
    const { children } = props;
    const { mission: externalMission, continuum } = props;

    const is_continuum = React.useMemo(() => {
        let is_continuum = !!continuum;
        if (externalMission && ("discover_date" in externalMission)) {
            is_continuum = true;
        }
        else if (externalMission && !("discover_date" in externalMission)) {
            is_continuum = false;
        }
        return is_continuum;
    }, [externalMission, continuum]);

    const prefix = `${is_continuum ? 'continuum' : 'mission'}`;

    const globalContext = React.useContext(GlobalContext);

    const [mission, internalSetMission] = React.useState<Mission | ContinuumMission | undefined>(externalMission);
    const [remoteQuests, setRemoteQuests] = useStateWithStorage<RemoteQuestStore[]>(`${prefix}/remoteQuests`, [], { rememberForever: true, compress: true });
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [questId, setQuestId] = useStateWithStorage(`${prefix}/questIndex`, undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>(`${prefix}/currentQuest`, undefined);

    const [currentHasRemote, setCurrentHasRemote] = React.useState<boolean>(false);

    const { t } = globalContext.localized;
    const { continuum_missions } = globalContext.core;

    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    React.useEffect(() => {
        if (is_continuum) {
            fetchRemoteMission();
        }
    }, [])

    const data: MissionProviderData = {
        mission,
        remoteQuests,
        errorMsg,
        quest,
        setQuest,
        setErrorMsg,
        currentHasRemote,
        setCurrentHasRemote,
        getRemoteQuestFlags,
        clearRemoteQuests
    }

    if (!globalContext.player.playerData) return <></>;

    return (
        <MissionContext.Provider value={data}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', gap: '1em'}}>
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
                    clearQuest={clearRemoteQuests}
                />

                {!mission ? globalContext.core.spin(t('spinners.please_wait')) : children}
            </div>
        </MissionContext.Provider>
    )

    function fetchRemoteMission() {
        if (!is_continuum) return;

        const missionId = continuum_missions[continuum_missions.length - 1].id;
        const missionUrl = `/structured/continuum/${missionId}.json`;

        fetch(missionUrl)
            .then((response) => response.json())
            .then((result: ContinuumMission) => {
                const rq = {} as { [key: number]: Quest };
                const challenges = globalContext.core.missionsfull
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
                    result.discover_date = (mission as ContinuumMission)?.discover_date ?? mostRecentDate;
                }

                if (typeof result.discover_date === 'string') {
                    result.discover_date = new Date(result.discover_date);
                }

                setMission(result);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
   }

    function clearRemoteQuests() {
        setRemoteQuests([].slice());
    }

    function setRemoteQuest(quest?: Quest) {
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

    function getRemoteQuestFlags() {
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

    function setMission(value?: Mission | ContinuumMission) {

        if (!value) {
            internalSetMission(undefined);
            return;
        }

        if ("discover_date" in value) {
            if (!value.discover_date) {
                value.discover_date = mostRecentDate;
            }
            else if (typeof value.discover_date === 'string') {
                value.discover_date = new Date(value.discover_date);
            }
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
        setQuest(value.quests![0]);
   }

}