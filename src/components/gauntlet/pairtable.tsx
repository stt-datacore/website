import React from "react";
import { shortToSkill, skillToShort } from "../../utils/crewutils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GauntletPairCard } from "./paircard";
import { Gauntlet, PairGroup } from "../../model/gauntlets";
import { Skill } from "../../model/crew";
import { GauntletPlayerBuffMode, PlayerBuffMode } from "../../model/player";
import CONFIG from "../CONFIG";


export interface GauntletPairTableProps {
    pairGroup: PairGroup;
    currContest: boolean;
    gauntlet: Gauntlet;
    boostMode: GauntletPlayerBuffMode;
    onlyActiveRound?: boolean;
}

export const GauntletPairTable = (props: GauntletPairTableProps) => {

    const { boostMode, onlyActiveRound, pairGroup, currContest, gauntlet } = props;


    const getSkillUrl = (skill: string | Skill): string => {
        let skilluse: string | undefined = undefined;

        if (typeof skill === 'string' && skill.length === 3 && skill.toUpperCase() === skill) {
            skilluse = shortToSkill(skill, true);
        }
        else if (typeof skill === 'string') {
            skilluse = skill;
        }
        else {
            skilluse = skill.skill;
        }

        return `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skilluse}.png`;
    }


    return (<div

        style={{
            padding: 0,
            margin: 0,
            display: "flex",
            width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : undefined,
            flexDirection: "column",
            justifyContent: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "center" : "stretch",
        }}>

        <div
            className='ui segment'
            style={{
                textAlign: "center",
                display: "flex",
                flexDirection: "row",
                fontSize: "18pt",
                marginTop: "1em",
                marginBottom: "0.5em",
                justifyContent: "center",
                paddingTop: "0.6em",
                paddingBottom: "0.5em",
                backgroundColor:
                    currContest ? 'royalblue' : (pairGroup.pair.includes(skillToShort(gauntlet.contest_data?.featured_skill as string) as string) ? "slateblue" : undefined),

            }}>
            {pairGroup.pair.map((p, ik) => {
                return (
                    <div key={ik} style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
                        <img src={getSkillUrl(p)} style={{ height: "1em", maxWidth: "1em", marginLeft: "0.25em", marginRight: "0.25em" }} /> {skillToShort(shortToSkill(p, true)!)} {ik === 0 && <span>&nbsp;/&nbsp;</span>}
                    </div>
                )
            })}
        </div>
        {pairGroup.crew.map((crew) => (
            <GauntletPairCard
                key={`pairCardCrew_${crew.id}_${pairGroup.pair.join("_")}`}
                crew={crew}
                gauntlet={gauntlet}
                pair={pairGroup.pair}
                boostMode={boostMode}
                onlyActiveRound={onlyActiveRound}
            />
        ))}
    </div>)
}