import React from "react";
import CONFIG from "../CONFIG";
import { getActionFromItem, getShipBonus, getShipChargePhases } from "../../utils/crewutils";
import { ShipAction, Ship, ShipBonus } from "../../model/ship";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { PresenterPluginProps, PresenterPlugin, PresenterPluginState } from "./presenter_plugin";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { GlobalContext } from "../../context/globalcontext";

const imageMap = new Map<string, string>();

const isWindow = typeof window !== 'undefined';

// For Firefox, we would not need to do this
// But Chrome makes us do this thing
if (isWindow) window.setTimeout(() => {
    let imgs = Object.values(CONFIG.CREW_SHIP_BATTLE_BONUS_ICON);
    imgs = imgs.concat(Object.values(CONFIG.SHIP_BATTLE_ABILITY_ICON));
    imgs = imgs.concat(Object.values(CONFIG.SHIP_BATTLE_TRIGGER_ICON));
    imgs = imgs.concat(["attack-icon.png", "accuracy-icon.png", "evasion-icon.png", "usage-bullet.png"]);

    for (let img of imgs) {
        if (img === '') continue;
        toDataURL("/media/ship/" + img, (data) => {
            imageMap.set(img, data);
        })
    }
});

export function toDataURL(url: string | URL, callback: (dataUrl: string) => void) {
    var xhr = new XMLHttpRequest();
    xhr.onload = () => {
        var reader = new FileReader();
        reader.onloadend = () => {
            callback(reader.result as string);
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}
export const getActionIcon = (action: number) => {
    // if (action === 0) return "/media/ship/attack-icon.png";
    // if (action === 2) return "/media/ship/accuracy-icon.png";
    // if (action === 1) return "/media/ship/evasion-icon.png";

    if (action === 0) return imageMap.get("attack-icon.png");
    if (action === 2) return imageMap.get("accuracy-icon.png");
    if (action === 1) return imageMap.get("evasion-icon.png");
};

export const getTriggerIcon = (trigger: number) => {
    return imageMap.get(CONFIG.SHIP_BATTLE_TRIGGER_ICON[trigger])
}

export const getActionColor = (action: number) => {
    return CONFIG.CREW_SHIP_BATTLE_BONUS_COLORS[action];
};

export const getShipBonusIcon = (item?: ShipAction | Ship, index?: number): string | undefined => {
    if (!item) return undefined;
    let actionIn = getActionFromItem(item, index);
    if (!actionIn) return undefined;
    const action = actionIn;
    if (!action || !action.ability) return undefined;
    if (action.ability.type !== 0)
        return imageMap.get(CONFIG.SHIP_BATTLE_ABILITY_ICON[action.ability.type]);
    else
        return imageMap.get(CONFIG.CREW_SHIP_BATTLE_BONUS_ICON[action.bonus_type]);
}

export const getIconByKey = (key: string): string | undefined => {
    return imageMap.get(key);
}

// interface ShipImageProps {
//     key: string;
//     style?: React.CSSProperties;
// }


export interface ShipSkillProps extends PresenterPluginProps<Ship | PlayerCrew | CrewMember> {
    withActionBorder?: boolean;
    withActionIcons?: boolean;
    grouped?: boolean;
}

export class ShipSkill extends PresenterPlugin<Ship | PlayerCrew | CrewMember, ShipSkillProps, PresenterPluginState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    static title = "Ship Ability";

    constructor(props: ShipSkillProps) {
        super(props);

    }

    render() {
        if (!this.props.context) return <></>
        const { t, tfmt } = this.context.localized;

        const isShip = ("hull" in this.props.context);
        const ship_battle = ("hull" in this.props.context ? this.props.context : this.props.context.ship_battle)
        const actions = ("hull" in this.props.context ? this.props.context.actions ?? [] : [this.props.context.action]);
        const withActionBorder = (this.props as ShipSkillProps).withActionBorder ?? isShip;
        const { withActionIcons, grouped } = this.props;

        const drawBullets = (actions: number): JSX.Element[] => {
            let elems: JSX.Element[] = [];
            for (let i = 0; i < actions; i++) {
                elems.push(
                    <img
                        key={i}
                        src="/media/ship/usage-bullet.png"
                        style={{ paddingLeft: "5px", height: "12px" }}
                    />
                );
            }
            return elems;
        };

        return (
            <div style={{ marginBottom: "8px", fontSize: this.props.fontSize ?? "1em" }}>
                {actions.length && actions.map((action, index) =>
                    <div key={index}
                         style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "stretch"
                         }}
                        >
                        <div
                            style={{
                                flexGrow: 1,
                                marginTop: "4px",
                                border: withActionBorder ? "1px solid " + getActionColor(action.bonus_type) : "none",
                                padding: withActionBorder ? "2px" : "0px"}}>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems:  "center",
                                    flexWrap: "wrap"
                                }}
                            >
                                <h4 style={{ marginBottom: ".25em", maxWidth: "72%", fontSize: "1.25em" }}>
                                    {action.name}
                                </h4>
                                <div
                                    style={{
                                        width: "auto",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        alignContent: "center",
                                        backgroundColor: getActionColor(
                                            action.bonus_type
                                        ),
                                        padding: "2px 4px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            height: "2em",
                                            flexDirection: "row",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                margin: 0,
                                                padding: 0,
                                                marginRight: "2px",
                                                fontSize: "1.25em",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            + {action.bonus_amount}
                                        </span>
                                        <img
                                            src={getActionIcon(action.bonus_type)}
                                            style={{
                                                margin: "auto",
                                                padding: 0,
                                                marginLeft: "2px",
                                                height: "1em",
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <ul
                                style={{
                                    marginTop: "0",
                                    listStyle: "none",
                                    paddingLeft: "0",
                                    color: getActionColor(action.bonus_type),
                                }}
                            >
                                <li>
                                    {t("ship_action.boost_by", {
                                        type: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type],
                                        amount: action.bonus_amount?.toString() ?? ''
                                    })}
                                </li>
                                {"status" in action && ((action.status ?? 0) > 0) && (
                                    <li>
                                        {t("ship_action.grant", {
                                            grant: CONFIG.SHIP_BATTLE_GRANTS[action.status ?? 0],
                                            grant_description: CONFIG.SHIP_BATTLE_GRANT_DESC[action.status ?? 0]
                                        })}
                                    </li>
                                )}
                                {action.penalty && (
                                    <div style={{color: getActionColor(0)}}>
                                        {t("ship_action.handicap", {
                                            type: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.penalty.type],
                                            amount: action.penalty.amount.toString()
                                        })}
                                    </div>
                                )}
                                <li style={{ color: "white" }}>
                                    <b>{t('ship.initialize')}</b>: {action.initial_cooldown}s,{" "}
                                    <b>{t('ship.cooldown')}</b>: {action.cooldown}s,{" "}
                                    <b>{t('ship.duration')}</b>: {action.duration}s
                                </li>
                                {action.limit && (
                                    <li style={{ color: "white" }}>
                                        <b>{t('ship.uses_per_battle')}</b>: {action.limit}{" "}
                                        {drawBullets(action.limit)}
                                    </li>
                                )}
                            </ul>

                            {action.ability && action.ability.type !== undefined && (
                                <div
                                    style={{
                                        border:
                                            "2px solid " +
                                            getActionColor(action.bonus_type),
                                        borderBottomRightRadius: "6px",
                                        padding: "0",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "0.1em 0.2em",
                                            fontFamily: "arial",
                                            display: "flex",
                                            flexDirection: "row",
                                                // window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
                                            justifyContent: "space-between",
                                            backgroundColor: getActionColor(
                                                action.bonus_type
                                            ),
                                        }}
                                    >
                                        <div style={{ marginTop: "0px" }}>
                                            {t('ship.bonus_ability')}
                                        </div>
                                        {action.ability.condition > 0 && (
                                            <div style={{
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "flex-end",
                                                alignItems: "center"
                                            }}>
                                                <b>{t('ship.trigger')}</b>:{" "}
                                                <img style={{margin: "0.25em", height: "1em"}}  src={getTriggerIcon(action.ability.condition)} />
                                                {
                                                    CONFIG.CREW_SHIP_BATTLE_TRIGGER[
                                                        action.ability.condition
                                                    ]
                                                }
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            marginTop: "0",
                                            listStyle: "none",
                                            paddingLeft: "6px",
                                            paddingBottom: "2px",
                                        }}
                                    >
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            alignItems: "center"
                                        }}>

                                        <img style={{
                                                margin: "0.25em 0.5em 0.25em 0.25em",
                                                maxWidth: "2em",
                                                maxHeight: "1.5em"
                                            }}
                                            src={getShipBonusIcon(action)} />

                                        <div style={{ lineHeight: "1.3em"}}>
                                            {getShipBonus(t, action)}
                                        </div>

                                        </div>
                                    </div>
                                </div>
                            )}

                            {action.charge_phases && action.charge_phases.length && (
                                <div>
                                    <div style={{ marginBottom: ".25em" }}>
                                        {t('ship.charge_phases')}
                                    </div>
                                    <ol
                                        style={{
                                            marginTop: "0",
                                            listStylePosition: "inside",
                                            paddingLeft: "0",
                                        }}
                                    >
                                        {getShipChargePhases(action, undefined, t).map((phase, idx) => (
                                            <li key={idx}>{phase}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                        {withActionIcons &&
                            <div
                                style={{
                                width:"72px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center"
                            }}>
                                <div className="ui segment"
                                    style={{
                                        marginLeft: "0.5em",
                                        padding: 0,
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "center"}}>
                                    <img style={{
                                            width: "64px",
                                            padding: 0,
                                            margin: "0"}}
                                            title={action.source}
                                        src={`${process.env.GATSBY_ASSETS_URL}${action.icon?.file?.slice(1).replace(/\//g, "_")}.png`}
                                        />
                                </div>
                            </div>
                        }
                    </div>)
                    }

                <div>
                    <div style={{ marginBottom: ".25em", marginTop: "0.25em" }}>{!isShip && t('ship.equipment_bonus')}</div>
                    <p>
                        {!!ship_battle.crit_bonus && (
                            <span>
                                <b>{t('ship.crit_bonus')}:</b> +
                                {ship_battle.crit_bonus}
                                {` `}
                            </span>
                        )}
                        {!!ship_battle.crit_chance && (
                            <span>
                                <b>{t('ship.crit_rating')}:</b> +
                                {ship_battle.crit_chance}
                                {` `}
                            </span>
                        )}
                        {!isShip && !!ship_battle.accuracy &&
                            <span>
                            <b>{t('ship.accuracy')}:</b> +
                            {ship_battle.accuracy}
                            {` `}
                            </span>
                        }
                        {!isShip && !!ship_battle.evasion &&
                            <span>
                            <b>{t('ship.evasion')}:</b> +
                            {ship_battle.evasion}
                            {` `}
                            </span>
                        }
                    </p>
                </div>
            </div>
        );
    }
}

export interface TinyShipSkillProps {
    crew?: PlayerCrew | CrewMember;
    action?: ShipAction;
    style?: React.CSSProperties;
}

export const TinyShipSkill = (props: TinyShipSkillProps) => {
    const { t } = React.useContext(GlobalContext).localized;
    let { crew, action } = props;
    if (!action && crew) action = crew.action;
    if (!action) return <></>
    return (
            <div style={{ ...(props.style ?? {}), display:"flex",flexDirection:"column",justifyContent:"center", alignItems: "center"}}>
                <div style={{display:"flex", flexDirection: "row", color: getActionColor(action.bonus_type)}}>
                    <span>+ {action.bonus_amount}</span>
                </div>

                {action.ability && <div style={{ lineHeight: "1.3em"}}>
                    {getShipBonus(t, action)} {!!action.limit && <i style={{fontSize:"0.8em"}}> ({action.limit}x)</i>}
                </div>}
                {!!action.ability?.condition && <i style={{fontSize:"0.8em"}}>({
                                    CONFIG.CREW_SHIP_BATTLE_TRIGGER[
                                        action.ability.condition
                                    ]
                                })</i>}

                {!!action.charge_phases?.length && <i style={{fontSize:"0.8em"}}>(+{action.charge_phases.length} charge phases)</i>}
                {!!crew && <p style={{fontSize:"0.75em"}}>
                    {crew.ship_battle.crit_bonus && (
                        <span>
                            <b>CB:</b> +
                            {crew.ship_battle.crit_bonus}
                            {` `}
                        </span>
                    )}
                    {crew.ship_battle.crit_chance && (
                        <span>
                            <b>CR:</b> +
                            {crew.ship_battle.crit_chance}
                            {` `}
                        </span>
                    )}<br/>
                    {crew.ship_battle.accuracy &&
                        <span>
                        <b>AC:</b> +
                        {crew.ship_battle.accuracy}
                        {` `}
                        </span>
                    }
                    {crew.ship_battle.evasion &&
                        <span>
                        <b>EV:</b> +
                        {crew.ship_battle.evasion}
                        {` `}
                        </span>
                    }
                </p>}
            </div>
    )
}
