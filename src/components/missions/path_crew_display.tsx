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
import { GradeSwatch } from "../explanations/powerexplanation";
import { Icon } from "semantic-ui-react";

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
    if (path.some(p => p === undefined)) return <></>
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const getCrewPower = (crew: IQuestCrew, stage: number, challenge: CrewChallengeInfo) => {
        let newskill = {} as BaseSkills;

        try {            
            let assoc = crew.associated_paths?.find(a => a.path === pathGroup.path)?.skills;
            Object.keys(crew.skills).forEach((skill) => {
                if (assoc) {
                    newskill[skill] = JSON.parse(JSON.stringify(assoc[skill]));
                }
                else {
                    newskill[skill] = {
                        core: Math.round(crew[skill].core),
                        range_min: Math.round(crew[skill].min),
                        range_max: Math.round(crew[skill].max),
                        skill
                    }
                }
            });

            if (stage === 0 || !crew.challenges?.some(c => c.challenge.id === path[stage - 1].id)) {
                challenge.power_decrease = 0;
            }
            else {               
                challenge.power_decrease = 0.2;
                Object.keys(crew.skills).forEach((skill) => {
                    newskill[skill].core = Math.round(newskill[skill].core - newskill[skill].core * 0.2);
                    newskill[skill].range_max = Math.round(newskill[skill].range_max - newskill[skill].range_max * 0.2);
                    newskill[skill].range_min = Math.round(newskill[skill].range_min - newskill[skill].range_min * 0.2); 
                });
            }
        }
        catch {
            return crew.skills;
        }

        let cm = newskill[challenge.challenge.skill].core + newskill[challenge.challenge.skill].range_min;
        //let cx = newskill[challenge.challenge.skill].core + newskill[challenge.challenge.skill].max;

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
                const pathCrew = crew.filter(c => c.challenges?.some(ch => ch.challenge?.id === challenge?.id));

                return (<React.Fragment key={'path_challenge_crew_group' + challenge.id.toString()}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                        <h3>{challenge.name}</h3>
                        {!pathCrew?.length && <Icon name='ban' color='red' size='large' />}
                        {pathCrew.map((c) => {

                            let crewChallenge = c.challenges?.find(ch => ch.challenge.id === challenge.id) ?? null;
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
                                            locked={true}
                                            targetGroup={itemTargetGroup}
                                            printNA={config.includeCurrentQp ? <span style={{ color: 'cyan' }}>Need</span> : <br />}
                                            crew={{ ...c, kwipment: crewpaths?.needed_kwipment ?? c.added_kwipment ?? [], kwipment_expiration: c.added_kwipment_expiration ?? [] }}
                                            quipment={true} />

                                        {c.challenges && crewChallenge && Object.values(getCrewPower(c, pathIdx, crewChallenge)).map(((skill: Skill) => {
                                            const key = skill.skill ?? '';
                                            if (key !== challenge.skill) return <></>
                                            return (
                                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}>
                                                    <h4>{c.name}</h4>
                                                    <div style={{display:'flex', gap: "0.5em", flexDirection: 'row', alignItems: "center"}}>
                                                    <GradeSwatch grade={crewChallenge?.max_solve && crewChallenge.power_decrease ? "D" : crewChallenge?.max_solve ? "C" : crewChallenge?.power_decrease ? "B" : "A"} />
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
                                                    </div>
                                                    {challenge.skill === skill.skill && !!crewChallenge?.trait_bonuses?.length &&
                                                        <div style={{ color: 'lightgreen', textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: "0.75em" }}>
                                                            +&nbsp;{crewChallenge.trait_bonuses?.map(ct => ct.bonuses[mastery]).reduce((p, n) => p + n, 0)}&nbsp;({crewChallenge.trait_bonuses?.map(ct => <>{appelate(ct.trait)}</>).reduce((p, n) => p ? <>{p}, {n}</> : n)})
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