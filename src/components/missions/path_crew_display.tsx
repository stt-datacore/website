import React from "react";
import { PathInfo } from "../../utils/episodes";
import { GlobalContext } from "../../context/globalcontext";
import { CrewChallengeInfo, IQuestCrew, PathGroup } from "../../model/worker";
import {
    MissionChallenge,
    Quest,
    QuestFilterConfig,
} from "../../model/missions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import ItemDisplay from "../itemdisplay";
import { BaseSkills, Skill } from "../../model/crew";
import CrewStat from "../item_presenters/crewstat";
import { appelate } from "../../utils/misc";
import { CrewItemsView } from "../item_presenters/crew_items";
import { GradeSwatch, gradeCrew } from "../explanations/powerexplanation";
import { Icon } from "semantic-ui-react";
import CONFIG from "../CONFIG";
import { AvatarView } from "../item_presenters/avatarview";
import { checkIsProspect } from "../../utils/quipment_tools";

export interface PathCrewDisplayProps {
    pathGroup: PathGroup;
    config: QuestFilterConfig;
    quest: Quest;
    targetGroup?: string;
    itemTargetGroup?: string;
    compact?: boolean;
}

export const PathCrewDisplay = (props: PathCrewDisplayProps) => {
    const context = React.useContext(GlobalContext);

    const { pathGroup, compact, targetGroup, itemTargetGroup, quest, config } =
        props;

    const { crew, mastery } = pathGroup;

    const path = pathGroup.path
        .split("_")
        .map((t) =>
            quest.challenges?.find((f) => f.id.toString() === t)
    ) as MissionChallenge[];

    if (path.some((p) => p === undefined)) return <></>;

    const isMobile =
        typeof window !== "undefined" && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "flex-start",
                justifyContent: "space-evenly",
                width: "100%"
            }}
        >
            {path.map((challenge, pathIdx) => {
                const pathCrew = crew.filter((c) =>
                    c.challenges?.some((ch) => ch.challenge?.id === challenge?.id)
                );

                return (
                    <div
                        key={"path_challenge_crew_group" + challenge.id.toString()}
                        style={{
                            width: (1000 / path.length).toFixed() + "px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            alignItems: "center",
                        }}
                    >
                        <h3
                            style={{
                                margin: "0.5em",
                                marginBottom: 0,
                                textAlign: "center",
                            }}
                        >
                            {challenge.name}
                        </h3>
                        <div
                            style={{
                                fontSize: "0.8em",
                                margin: "0.5em",
                                marginTop: "0",
                                fontStyle: "italic",
                            }}
                        >
                            {challenge.difficulty_by_mastery[mastery]} (Crit:{" "}
                            <span style={{ color: CONFIG.RARITIES[5].color }}>
                                {challenge.difficulty_by_mastery[mastery] +
                                    [150, 275, 300][mastery]}
                                )
                            </span>
                        </div>
                        {!pathCrew?.length && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Icon
                                    style={{ margin: "0.5em" }}
                                    name="ban"
                                    color="red"
                                    size="large"
                                />
                                <img
                                    src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`}
                                    style={{ height: `1.5em`, margin: "0.25em" }}
                                />
                                {(config.ignoreChallenges?.includes(challenge.id) && (
                                    <h4>(Challenge Ignored)</h4>
                                )) || <h4>(Challenge Failed)</h4>}
                            </div>
                        )}

                        {pathCrew.map((c) => {
                            let crewChallenge = c.challenges?.find((ch) => ch.challenge.id === challenge.id) ?? null;
                            let crewpaths = c.associated_paths?.find((ap) => ap.path === pathGroup.path);
                            let displaycrew: IQuestCrew = {
                                ...c,
                                kwipment: crewpaths?.needed_kwipment ?? c.added_kwipment ?? [],
                                kwipment_expiration: crewpaths?.needed_kwipment_expiration ?? c.added_kwipment_expiration ?? [],
                            };
                            displaycrew.kwipment_prospects = checkIsProspect(displaycrew);
                            return (
                                <div
                                    key={
                                        "path_challenge_crew_group" +
                                        challenge.id.toString() +
                                        c.symbol
                                    }
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: "0.5em",
                                    }}
                                >
                                    <AvatarView
                                        mode='crew'
                                        targetGroup={targetGroup}
                                        crewBackground="rich"
                                        partialItem={true}
                                        item={displaycrew}
                                        size={64}
                                        />
                                    {/* <ItemDisplay
                                        crewBackground="rich"
                                        substitute_kwipment={crewpaths?.needed_kwipment ?? c.added_kwipment}
                                        targetGroup={targetGroup}
                                        itemSymbol={c.symbol}
                                        playerData={context.player.playerData}
                                        allCrew={context.core.crew}
                                        src={`${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}`}
                                        size={64}
                                        rarity={c.rarity}
                                        maxRarity={c.max_rarity}
                                    /> */}
                                    <h4 style={{ margin: "0" }}>{c.name}</h4>

                                    <CrewItemsView
                                        locked={true}
                                        targetGroup={itemTargetGroup}
                                        printNA={
                                            config.includeCurrentQp ? (
                                                <span style={{ color: "cyan" }}>Need</span>
                                            ) : (
                                                <br />
                                            )
                                        }
                                        crew={displaycrew}
                                        quipment={true}
                                    />

                                    {c.challenges &&
                                        crewChallenge &&
                                        Object.values(getCrewPower(c, pathIdx, crewChallenge, pathCrew))
                                            .map((skill: Skill) => {
                                                const key = skill.skill ?? "";
                                                if (key !== challenge.skill) return <></>;
                                                return (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            justifyContent: "flex-start",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "0.5em",
                                                                flexDirection: "row",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            {crewChallenge && (
                                                                <GradeSwatch
                                                                    grade={gradeCrew(crewChallenge)}
                                                                />
                                                            )}
                                                            <CrewStat
                                                                style={{
                                                                    color:
                                                                        !!crewChallenge?.max_solve &&
                                                                            !!crewChallenge?.power_decrease
                                                                            ? "orange"
                                                                            : crewChallenge?.max_solve
                                                                                ? "aqua"
                                                                                : !!crewChallenge?.power_decrease
                                                                                    ? "yellow"
                                                                                    : "lightgreen",
                                                                }}
                                                                quipmentMode={true}
                                                                key={"continuum_crew_" + key}
                                                                skill_name={key}
                                                                data={skill}
                                                                scale={0.75}
                                                            />
                                                        </div>
                                                        {challenge.skill === skill.skill &&
                                                            !!crewChallenge?.trait_bonuses?.length && (
                                                                <div
                                                                    style={{
                                                                        color: "lightgreen",
                                                                        textAlign: "center",
                                                                        fontWeight: "bold",
                                                                        fontStyle: "italic",
                                                                        fontSize: "0.75em",
                                                                    }}
                                                                >
                                                                    +&nbsp;
                                                                    {crewChallenge.trait_bonuses
                                                                        ?.map((ct) => ct.bonuses[mastery])
                                                                        .reduce((p, n) => p + n, 0)}
                                                                    &nbsp;(
                                                                    {crewChallenge.trait_bonuses
                                                                        ?.map((ct) => <>{appelate(ct.trait)}</>)
                                                                        .reduce((p, n) =>
                                                                            p ? (
                                                                                <>
                                                                                    {p}, {n}
                                                                                </>
                                                                            ) : (
                                                                                n
                                                                            )
                                                                        )}
                                                                    )
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            })
                                            .reduce((p, n) => p ? (<>{p}{n}</>) : (n), <></>)}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );

    function getCrewPower(
        calcCrew: IQuestCrew, stage: number, challenge: CrewChallengeInfo, pathCrew: IQuestCrew[]
    ) {
        let newskill = {} as BaseSkills;

        try {
            let assoc = calcCrew.associated_paths?.find(
                (a) => a.path === pathGroup.path
            )?.skills;
            Object.keys(assoc ?? calcCrew.skills).forEach((skill) => {
                if (assoc) {
                    newskill[skill] = JSON.parse(JSON.stringify(assoc[skill]));
                } else {
                    newskill[skill] = {
                        core: Math.round(calcCrew[skill].core),
                        range_min: Math.round(calcCrew[skill].min),
                        range_max: Math.round(calcCrew[skill].max),
                        skill,
                    };
                }
            });

            if (
                stage === 0 ||
                !calcCrew.challenges?.some((c) => c.challenge.id === path[stage - 1].id) ||
                pathCrew.some((c) => c.id !== calcCrew.id && c.challenges?.some(e => e.challenge.id === path[stage - 1].id))
            ) {
                challenge.power_decrease = 0;
            } else {
                challenge.power_decrease = 0.2;
                Object.keys(calcCrew.skills).forEach((skill) => {
                    newskill[skill].core = Math.round(
                        newskill[skill].core - newskill[skill].core * 0.2
                    );
                    newskill[skill].range_max = Math.round(
                        newskill[skill].range_max - newskill[skill].range_max * 0.2
                    );
                    newskill[skill].range_min = Math.round(
                        newskill[skill].range_min - newskill[skill].range_min * 0.2
                    );
                });
            }
        } catch (e) {
            console.log(e);
            return calcCrew.skills;
        }

        let cm =
            newskill[challenge.challenge.skill].core +
            newskill[challenge.challenge.skill].range_min;
        //let cx = newskill[challenge.challenge.skill].core + newskill[challenge.challenge.skill].max;

        let ct =
            challenge.challenge.difficulty_by_mastery[mastery] +
            [150, 275, 300][mastery];

        challenge.max_solve = cm < ct;

        return newskill;
    };

};
