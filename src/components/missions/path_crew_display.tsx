import React from "react";
import { PathInfo } from "../../utils/episodes";
import { GlobalContext } from "../../context/globalcontext";
import { CrewChallengeInfo, IQuestCrew, PathGroup } from "../../model/worker";
import { MissionChallenge, Quest, QuestFilterConfig } from "../../model/missions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import ItemDisplay from "../itemdisplay";
import { BaseSkills, Skill } from "../../model/crew";
import CrewStat from "../crewstat";
import { appelate } from "../../utils/misc";
import { CrewItemsView } from "../item_presenters/crew_items";

export interface PathCrewDisplayProps {
    pathGroup: PathGroup,
    config: QuestFilterConfig;
    quest: Quest,
    targetGroup?: string;
    itemTargetGroup?: string;
    compact?: boolean;
}

export const PathCrewDisplay = (props: PathCrewDisplayProps) => {

    const context = React.useContext(GlobalContext);

    const { pathGroup, compact, targetGroup, itemTargetGroup, quest, config } = props;

    const { crew, mastery } = pathGroup;

    const path = pathGroup.path.split("_").map(t => quest.challenges?.find(f => f.id.toString() === t)) as MissionChallenge[];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const getCrewPower = (crew: IQuestCrew, stage: number, challenge: CrewChallengeInfo) => {
        let newskill = {} as BaseSkills;
        
        try {
            if (stage === 0 || !crew.challenges?.some(c => c.challenge.id === path[stage - 1].id)) {
                challenge.power_decrease = 0;
                Object.keys(crew.skills).forEach((skill) => {
                    newskill[skill] = {
                        core: Math.round(crew[skill].core),
                        range_min: Math.round(crew[skill].min),
                        range_max: Math.round(crew[skill].max),
                        skill
                    }
                });
            }
            else {               
                challenge.power_decrease = 0.2;
                Object.keys(crew.skills).forEach((skill) => {
                    newskill[skill] = {
                        core: Math.round(crew[skill].core - (crew[skill].core * 0.2)),
                        range_min: Math.round(crew[skill].min - (crew[skill].min * 0.2)),
                        range_max: Math.round(crew[skill].max - (crew[skill].max * 0.2)),
                        skill
                    }
                });
            }
        }
        catch {
            return crew.skills;
        }

        let cm = newskill[challenge.challenge.skill].core + newskill[challenge.challenge.skill].min;
        let cx = newskill[challenge.challenge.skill].core + newskill[challenge.challenge.skill].max;

        let ct = challenge.challenge.difficulty_by_mastery[mastery] + [250, 275, 300][mastery];

        challenge.max_solve = cm < ct;

        return newskill;
    }

    return <React.Fragment>

        <div style={{
            display: "flex",
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly'
        }}>

            {path.map((challenge, pathIdx) => {
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
                            let crewpaths = c.associated_paths?.find(ap => ap.path === pathGroup.path);
                            
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

                                        <CrewItemsView
                                            targetGroup={itemTargetGroup}
                                            printNA={config.includeCurrentQp ? <span style={{ color: 'cyan' }}>New</span> : <br />}
                                            crew={{ ...c, kwipment: crewpaths?.needed_kwipment ?? c.added_kwipment ?? [], kwipment_expiration: c.added_kwipment_expiration ?? [] }}
                                            quipment={true} />

                                        {c.challenges && crewChallenge && Object.values(getCrewPower(c, pathIdx, crewChallenge)).map(((skill: Skill) => {
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