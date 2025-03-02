import React from 'react';
import { Skill, ComputedSkill, CrewMember } from '../../model/crew';
import { Gauntlet, Opponent } from '../../model/gauntlets';
import { PlayerCrew, CompletionState, PlayerBuffMode, GauntletPlayerBuffMode } from '../../model/player';
import { shortToSkill, gradeToColor, getPairScore, getCrewPairScore, dynamicRangeColor, isImmortal, getPlayerPairs } from '../../utils/crewutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import ItemDisplay from '../itemdisplay';
import { GlobalContext } from '../../context/globalcontext';
import { Link } from 'gatsby';
import { AvatarView } from '../item_presenters/avatarview';
import { getIconPath } from '../../utils/assets';

export interface PairCardProps {
    crew: CrewMember | PlayerCrew;
    gauntlet: Gauntlet;
    pair: string[];
    boostMode: GauntletPlayerBuffMode;
    onlyActiveRound?: boolean;
}

export const formatPair = (pair: Skill[], style?: React.CSSProperties, debuff?: boolean, disabled?: boolean): JSX.Element => {
    if (!pair?.length || !pair[0]?.skill) return <></>

    const disabledOpacity = 0.5;

    const orangeColor = 'orange';
    const redColor = '#ff3300';

    return (
        <div style={{
            ...style,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center"
        }}>
            {debuff && <i title={"Crew power is reduced"} className="down arrow icon" style={{ margin: "0.375em 0", fontSize: "10pt", color: orangeColor }} />}
            {disabled && <i title={"Crew is disabled"} className="exclamation circle icon" style={{ margin: "0.375em 0", fontSize: "10pt", color: redColor }} />}
            <div style={{
                display: "flex",
                flexDirection: "row",
                opacity: disabled ? disabledOpacity : undefined
            }}>
                <img style={{ maxHeight: '1.5em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[0].skill}.png`} />
                <div style={{
                    margin: "0.5em"
                }}>
                    {pair[0].range_min}-{pair[0].range_max}
                </div>
            </div>
            {pair.length > 1 &&
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    opacity: disabled ? disabledOpacity : undefined
                }}>
                    <img style={{ maxHeight: '1.5em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[1].skill}.png`} />
                    <div style={{
                        margin: "0.5em"
                    }}>
                        {pair[1].range_min}-{pair[1].range_max}
                    </div>
                </div>}
        </div>

    )
}

export function whyNoPortal(crew: PlayerCrew | CrewMember) {
    if (crew.obtained?.toLowerCase().includes("gauntlet")) return "Unowned (Gauntlet Exclusive)";
    else if (crew.obtained?.toLowerCase().includes("voyage")) return "Unowned (Voyage Exclusive)";
    else if (crew.obtained?.toLowerCase().includes("honor")) return "Unowned (Honor Hall)";
    else if (crew.obtained?.toLowerCase().includes("boss")) return "Unowned (Fleet Boss Exclusive)";
    else
        return "Unowned (Not in Portal)";

}

export const GauntletPairCard = (props: PairCardProps) => {

    const context = React.useContext(GlobalContext);
    const { crew, pair, gauntlet, boostMode, onlyActiveRound } = props;

    const skills = pair.map(m => shortToSkill(m, true));
    const crewpair = [] as Skill[];
    const prettyTraits = gauntlet.prettyTraits;
    const crit = ((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5);
    const critColor = gradeToColor(crit);
    const gmin = getPairScore(gauntlet.pairMin ?? [], pair.join("_"));
    const gmax = getPairScore(gauntlet.pairMax ?? [], pair.join("_"));
    const crewPairScore = getCrewPairScore(crew as PlayerCrew, pair.join("_"));
    const bigNumberColor = dynamicRangeColor("score" in crew ? (crewPairScore?.score ?? 0) : 0, gmax?.score ?? 0, gmin?.score ?? 0);
    const critString = crit + "%";

    const powerColor = ("immortal" in crew && crew.immortal === CompletionState.DisplayAsImmortalOwned) ? 'lightgreen' : undefined;
    const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
    const foreColor = theme === 'dark' ? 'white' : 'black';

    const roundPair = gauntlet?.contest_data?.secondary_skill ? [gauntlet?.contest_data?.primary_skill, gauntlet?.contest_data?.secondary_skill] : []
    const isRound = !onlyActiveRound || (skills.every(s => roundPair.some(e => s === e)));
    const inMatch = !!gauntlet.contest_data?.selected_crew?.some((c) => c.crew_id === crew.id && "isSelected" in crew);
    const isOpponent = "isOpponent" in crew && crew.isOpponent;

    let tempicon = "";

    if (inMatch && context.player.playerData) {
        tempicon = getIconPath(context.player.playerData.player.character.crew_avatar.portrait, true);
    }

    const myIcon = tempicon;

    let tempoppo: Opponent | undefined = undefined;

    if (isOpponent) {
        tempoppo = gauntlet.opponents?.find(o => o.player_id === Number.parseInt(crew?.ssId ?? "0"));
    }

    const opponent = tempoppo;

    let pstr = "G_" + pair.join("_");
    let rnk = 0;

    if (pstr in crew.ranks) {
        rnk = crew.ranks[pstr] as number;
    }

    let spair = pair?.map(p => shortToSkill(p) as string);
    const pairs = crew.pairs ?? getPlayerPairs(crew);

    if (spair[0] in crew && crew[spair[0]].max && spair[1] in crew && crew[spair[1]].max) {
        let p = pairs?.find(pr => spair.includes(pr[0].skill!) && spair.includes(pr[1].skill!));
        if (p) {
            crewpair.push(p[0]);
            crewpair.push(p[1]);
        }
    }
    else if (spair[0] in crew && crew[spair[0]].max) {
        let p = pairs?.find(pr => pr.some(px => px.skill === spair[0]));
        if (p) {
            if (p[0].skill === spair[0])
                crewpair.push(p[0]);
            else
                crewpair.push(p[1]);
        }
    }
    else if (spair[1] in crew && crew[spair[1]].max) {
        let p = pairs?.find(pr => pr.some(px => px.skill === spair[1]));
        if (p) {
            if (p[0].skill === spair[1])
                crewpair.push(p[0]);
            else
                crewpair.push(p[1]);
        }
    }

    return (
        <div
            className="ui segment"
            key={`${crew.id}_${crew.symbol}+${opponent?.player_id}`}
            title={crew.name
                + (("isDisabled" in crew && crew.isDisabled) ? " (Disabled)" : "")
                + (("isDebuffed" in crew && crew.isDebuffed) ? " (Reduced Power)" : "")
                + ((opponent?.name) ? ` (Opponent: ${opponent.name})` : "")
            }
            style={{
                display: "flex",
                flexDirection: "column",
                width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : "28em",
                padding: 0,
                margin: 0,
                marginBottom: "0.5em",
            }}>

            {((inMatch || isOpponent) && isRound) &&
                <div style={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: 0,
                    padding: "2px 4px",
                    backgroundColor: isRound ? (("isDisabled" in crew && crew.isDisabled) ? "#003300" : (isOpponent ? 'darkred' : (inMatch ? 'darkgreen' : undefined))) : undefined
                }}>
                    {isOpponent &&
                        <>
                            <span>
                                {opponent?.rank}
                            </span>
                            <div style={{
                                flexGrow: 1,
                                justifyContent: "center",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center"
                            }}>
                                {opponent?.name}
                                <img className="ui" style={{ margin: "4px 8px", borderRadius: "3px", height: "16px" }} src={`${process.env.GATSBY_ASSETS_URL}${opponent?.icon?.file ? getIconPath(opponent.icon, true) : 'crew_portraits_cm_empty_sm.png'}`} />
                            </div>
                            <span>
                                [{opponent?.level}]
                            </span>
                        </>}

                    {inMatch && !isOpponent &&
                        <>
                            <span>
                                {gauntlet?.rank}
                            </span>
                            <div style={{
                                flexGrow: 1,
                                justifyContent: "center",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center"
                            }}>
                                {context.player.playerData?.player.character.display_name}
                                <img className="ui" style={{ margin: "4px 8px", borderRadius: "3px", height: "16px" }} src={`${process.env.GATSBY_ASSETS_URL}${myIcon}`} />
                            </div>
                            <span>
                                [{context.player.playerData?.player.character.level}]
                            </span>
                        </>}

                </div>}
            <div
                style={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: '0.5em',
                    paddingBottom: 0,
                    margin: 0,
                    // backgroundColor: isRound ? (("isDisabled" in crew && crew.isDisabled) ? "transparent" : (isOpponent ? '#990000' : (inMatch ? '#008800' : undefined))) : undefined,
                }}
            >
                <div style={{
                    width: "2em",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    <div
                        style={{ color: foreColor }}
                        title={`Rank ${rnk} for ${pstr.slice(2).replace("_", "/")}`}
                    >{rnk}</div>
                </div>
                <div style={{ margin: 0, marginRight: "0.25em", width: "68px" }}>
                    <AvatarView
                        partialItem={true}
                        passDirect={inMatch || isOpponent}
                        mode='crew'
                        crewBackground='rich'
                        targetGroup='gauntletsHover'
                        symbol={crew.symbol}
                        item={crew}
                        size={64}
                        />
                </div>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "15em" : "16em",
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: "0"
                    }}>
                        <Link to={`/crew/${crew.symbol}`} style={{fontWeight: 'bold', textDecoration: 'underline'}}>
                        {crew.name}
                        </Link>
                    </div>
                    <div style={{
                        margin: 0,
                        marginLeft: "0.25em",
                        marginBottom: "0.25em",
                    }}>
                        {formatPair(crewpair, {
                            flexDirection: "row",
                            display: "flex",
                            justifyContent: "space-evenly",
                            textDecoration: powerColor ? 'underline' : undefined,
                            color: powerColor,
                            fontSize: "8pt"
                        }, isRound && ("isDebuffed" in crew && crew.isDebuffed),
                            isRound && ("isDisabled" in crew && crew.isDisabled))}
                    </div>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                        margin: 0,
                        fontSize: "10pt",
                        marginLeft: "0.25em",
                        marginRight: "0.25em",
                        marginTop: "0.25em",
                        width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "14em" : "15em",
                        cursor: "default"

                    }}>
                        {"score" in crew && crew.score &&
                            <div
                                title={`${Math.round(crewPairScore?.score ?? 0).toLocaleString()} Overall Estimated Damage for ${pair.join("/")}`}
                                style={{
                                    margin: "0 0.5em",
                                    color: bigNumberColor ?? undefined,
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "center",
                                    width: "4em",
                                    alignItems: "center"
                                }}>
                                <img style={{ margin: "0 0.25em", maxHeight: "1em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/anomally_icon.png`} />
                                {Math.round(crewPairScore?.score ?? 0).toLocaleString()}
                            </div>}

                        <div
                            title={`${crit}% Crit Chance`}
                            style={{
                                fontWeight: crit > 25 ? "bold" : undefined,
                                margin: "0 0.5em",
                                color: critColor ?? undefined
                            }}>
                            {critString}
                        </div>
                    </div>
                </div>
                <div style={{ marginRight: "0.25em" }}>
                    {"immortal" in crew && (crew.immortal > 0 && <i title={"Owned (Frozen, " + crew.immortal + " copies)"} className='snowflake icon' />) ||
                        ("immortal" in crew && crew.have && (isImmortal(crew) && <i title={"Owned (Immortalized)"} style={{ color: "lightgreen" }} className='check icon' />))}
                    {"immortal" in crew && crew.have && (!isImmortal(crew) && <span title={"Owned (Not Immortalized)"}>{crew.level}</span>)}
                    {(isOpponent) &&
                        <span>
                            <img title={"Opponent (" + opponent?.name + ")"} style={{ height: "16px" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/warning_icon.png`} />
                        </span>}

                    {!("immortal" in crew) || !(crew.have) && !(isOpponent) &&
                        <span>
                            {crew.in_portal && <img title={"Unowned (Available in Portal)"} style={{ height: "16px" }} src='/media/portal.png' />}
                            {!crew.in_portal && <i title={whyNoPortal(crew)} className='lock icon' />}
                        </span>}
                </div>
            </div>
        </div>)

}