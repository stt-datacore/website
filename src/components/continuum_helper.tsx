import React from "react"
import { PlayerCrew } from "../model/player"
import { CrewMember } from "../model/crew";
import { GlobalContext } from "../context/globalcontext";
import { ContinuumMission } from "../model/continuum";
import { Mission, MissionChallenge, Quest } from "../model/missions";
import { Notification } from "./page/notification";
import CONFIG from "./CONFIG";
import { appelate } from "../utils/misc";

export interface ContinuumComponentProps {

    roster: (PlayerCrew | CrewMember)[];
}

export const ContinuumComponent = (props: ContinuumComponentProps) => {

    const context = React.useContext(GlobalContext);
    const [mission, setMission] = React.useState<ContinuumMission | undefined>(undefined);
    const [challenges, setChallenges] = React.useState<MissionChallenge[][] | undefined>(undefined);
    const [discoverDate, setDiscoverDate] = React.useState<Date | undefined>(undefined);
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const { continuum_missions } = context.core;

    let disc = new Date(continuum_missions[continuum_missions.length - 1].discover_date);

    let url = `structured/continuum/${continuum_missions.length}.json`;

    React.useEffect(() => {
        fetch(url).then((response) => response.json()).then((result: ContinuumMission) => {
            const challenges = context.core.missionsfull
                        .filter((mission) => mission.quests.some(q => result.quest_ids.includes(q.id)))
                        .map((mission) => mission.quests.filter(q => result.quest_ids.includes(q.id)))
                        .flat()
                        .map(q => q.challenges ?? []);

            setChallenges(challenges);
            setMission(result);
            setDiscoverDate(disc);
            setErrorMsg("");
        })
        .catch((e) => {
            setErrorMsg(e?.toString() + " : " + url);
    
        });
    }, []);


    return (<>
        <div>
        <Notification
					header='Work In Progress'
					content={<p>This page is a work in progress. Some functions and features may be non-functional, incomplete, or missing.</p>}
					icon='bitbucket'
					warning={true}
					
				/>

            Current Continuum Mission: {discoverDate?.toDateString()}
            <br />
            <div style={{color:"tomato"}}>{errorMsg}</div>

            {/*             
            
            {mission?.quests?.map((quest, idx) => (
                <div key={"quest_" + idx + "_" + quest.id}>
                    <h3>{quest.name}</h3>
                    <h4>Traits</h4>
                    {quest.traits_used?.map(t => <div key={"trait_" + t}>{appelate(t)}</div>)}

                    {!!challenges?.length && challenges[idx].map((challenge) => (
                        <div>&nbsp;&nbsp;&nbsp;&nbsp;{challenge.name}<br/><sub>{CONFIG.SKILLS[challenge.skill]}</sub></div>
                        
                    ))}
                </div>
            ))} */}

        </div>
    </>)
}