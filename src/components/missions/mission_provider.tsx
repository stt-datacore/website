import React from "react";
import { ContinuumMission } from "../../model/continuum";
import { RemoteQuestStore } from "./continuum_helper";
import { GlobalContext } from "../../context/globalcontext";
import { Quest } from "../../model/missions";
import { Notification } from "../page/notification";
import { QuestImportComponent } from "./quest_importer";
import { useStateWithStorage } from "../../utils/storage";




export interface MissionProviderData {
    mission?: ContinuumMission;
    remoteQuests: RemoteQuestStore[];
    errorMsg?: string;
    quest?: Quest;
    setQuest: (value?: Quest) => void;
    currentHasRemote: boolean;
    setCurrentHasRemote: (value: boolean) => void,
    getRemoteQuestFlags: () => boolean[] | undefined
}

const DefaultMissionProviderData = {
    remoteQuests: [],
    setQuest: () => false,
    setCurrentHasRemote: () => false,
    currentHasRemote: false,
    getRemoteQuestFlags: () => undefined
} as MissionProviderData;

export const ContinuumMissionContext = React.createContext(DefaultMissionProviderData);

interface ContinuumMissionProviderProps {
    children: React.ReactNode;
}

export const ContinuumMissionProvider = (props: ContinuumMissionProviderProps) => {
    const { children } = props;

    const globalContext = React.useContext(GlobalContext);

    const [mission, internalSetMission] = React.useState<ContinuumMission | undefined>();
    const [remoteQuests, setRemoteQuests] = useStateWithStorage<RemoteQuestStore[]>('continuum/remoteQuests', [], { rememberForever: true, compress: true });
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [questId, setQuestId] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);

    const [currentHasRemote, setCurrentHasRemote] = React.useState<boolean>(false);

    const { t } = globalContext.localized;
    const { continuum_missions } = globalContext.core;

    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionId = continuum_missions[continuum_missions.length - 1].id;
    const missionUrl = `/structured/continuum/${missionId}.json`;

    React.useEffect(() => {
        fetchRemoteMission();
    }, [])

    const data: MissionProviderData = {
        mission,
        remoteQuests,
        errorMsg,
        quest,
        setQuest,
        currentHasRemote,
        setCurrentHasRemote,
        getRemoteQuestFlags
    }

    return (
        <ContinuumMissionContext.Provider value={data}>
            <React.Fragment>
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

                {!mission ? globalContext.core.spin(t('spinners.please_wait')) : children}
            </React.Fragment>
        </ContinuumMissionContext.Provider>
    )

    function fetchRemoteMission() {
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
                    result.discover_date = mission?.discover_date ?? mostRecentDate;
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

    function clearRemote() {
        setRemoteQuests([]);
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

    function setMission(value?: ContinuumMission) {
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



}