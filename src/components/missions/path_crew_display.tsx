import React from "react";
import { PathInfo } from "../../utils/episodes";
import { GlobalContext } from "../../context/globalcontext";
import { IQuestCrew, PathGroup } from "../../model/worker";
import { MissionChallenge, Quest } from "../../model/missions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

export interface PathCrewDisplayProps {
    pathGroup: PathGroup,
    quest: Quest,
    targetGroup?: string;
    compact?: boolean;
}

export const PathCrewDisplay = (props: PathCrewDisplayProps) => {

    const context = React.useContext(GlobalContext);

    const { pathGroup, compact, targetGroup, quest } = props;
    const { crew, mastery } = pathGroup;    
    
    const path = pathGroup.path.split("_").map(t => quest.challenges?.find(f => f.id.toString() === t)) as MissionChallenge[];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    
    return <React.Fragment>

        <div style={{
            display: "flex",
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly'
        }}>

            {path.map((challenge) => {
                return (<React.Fragment>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                        <h3>{challenge.name}</h3>
                    </div>

                </React.Fragment>)
            })}

        </div>

    </React.Fragment>
}