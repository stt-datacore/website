import React from "react";
import { PathInfo } from "../../utils/episodes";
import { GlobalContext } from "../../context/globalcontext";
import { IQuestCrew, PathGroup } from "../../model/worker";
import { MissionChallenge, Quest } from "../../model/missions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import ItemDisplay from "../itemdisplay";
import { Skill } from "../../model/crew";
import CrewStat from "../crewstat";
import { appelate } from "../../utils/misc";

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
                const pathCrew = crew.filter(c => c.challenges?.some(ch => ch.challenge.id === challenge.id));


                return (<React.Fragment key={'path_challenge_crew_group' + challenge.id.toString()}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                        <h3>{challenge.name}</h3>
                        {pathCrew.map((c) => {
                        
                        let crewChallenge = c.challenges?.find(ch => ch.challenge.id === challenge.id);

                        return (
                            <React.Fragment key={'path_challenge_crew_group' + challenge.id.toString() + c.symbol}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: "center",
                                    alignItems: "center",
                                    margin: "0.5em"
                                }}>
                                <ItemDisplay
                                    targetGroup={targetGroup}
                                    itemSymbol={c.symbol}
                                    playerData={context.player.playerData}
                                    allCrew={context.core.crew}
                                    src={`${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}`}
                                    size={64}
                                    rarity={c.rarity}
                                    maxRarity={c.max_rarity}
                                    />
                                    {c.challenges && Object.values(c.challenges?.find(ch => ch.challenge.id === challenge.id)?.skills ?? {}).map(((skill: Skill) => {
                                        const key = skill.skill ?? '';
                                        if (key !== challenge.skill) return <></>
                                        return (
                                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}>
                                                <h4>{c.name}</h4>
                                                <CrewStat
                                                    style={{
                                                        color: ((!!crewChallenge?.max_solve && !!crewChallenge?.power_decrease)) ? 'orange' : (crewChallenge?.max_solve ? 'aqua' : (!!crewChallenge?.power_decrease ? 'yellow' : 'lightgreen'))
                                                    }}
                                                    quipmentMode={true}
                                                    key={"continuum_crew_" + key}
                                                    skill_name={key}
                                                    data={skill}
                                                    scale={0.75}
                                                />
                                                {challenge.skill === skill.skill && !!challenge.trait_bonuses?.length &&
                                                    <div style={{ color: 'lightgreen', textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: "0.75em" }}>
                                                        +&nbsp;{challenge.trait_bonuses?.map(ct => ct.bonuses[mastery]).reduce((p, n) => p + n, 0)}&nbsp;({challenge.trait_bonuses?.map(ct => <>{appelate(ct.trait)}</>).reduce((p, n) => p ? <>{p}, {n}</> : n)})
                                                    </div>}

                                            </div>
                                        )

                                    })).reduce((p, n) => p ? <>{p}{n}</> : n, <></>)}
                                </div>
                            </React.Fragment>)
                        })}
                        
                    </div>

                </React.Fragment>)
            })}

        </div>

    </React.Fragment>
}