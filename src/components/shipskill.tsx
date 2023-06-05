import React from "react";
import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";
import CONFIG from "./CONFIG";
import { getShipBonus, getShipChargePhases } from "../utils/crewutils";
import { ShipAction, Ship, ShipBonus } from "../model/ship";

export interface ShipSkillProps {
    actions: ShipAction[];    
    ship_battle: ShipBonus | Ship;
    withBorder?: boolean;
}

export class ShipSkill extends React.Component<ShipSkillProps> {
    constructor(props: ShipSkillProps) {
        super(props);
    }

    render() {
        const { actions, ship_battle } = this.props;

        const getActionIcon = (action: number) => {
            if (action === 0) return "/media/ship/attack-icon.png";
            if (action === 2) return "/media/ship/accuracy-icon.png";
            if (action === 1) return "/media/ship/evasion-icon.png";
        };

        const getActionColor = (action: number) => {
            return CONFIG.CREW_SHIP_BATTLE_BONUS_COLORS[action];
        };

        const drawBullets = (actions: number): JSX.Element[] => {
            let elems: JSX.Element[] = [];
            for (let i = 0; i < actions; i++) {
                elems.push(
                    <img
                        src="/media/ship/usage-bullet.png"
                        style={{ paddingLeft: "5px", height: "12px" }}
                    />
                );
            }
            return elems;
        };

        return (
            <div style={{ marginBottom: "8px", fontSize: "0.75em" }}>
                {actions.length && actions.map((action) => 
                    <div style={{marginTop: "4px", border: this.props.withBorder ? "1px solid " + getActionColor(action.bonus_type) : "none", padding: this.props.withBorder ? "2px" : "0px"}}>
                        <div
                            style={{                                
                                display: "flex",
                                flexDirection:
                                    window.innerWidth < 512 ? "column" : "row",
                                justifyContent: "space-between",
                                alignItems:
                                    window.innerWidth < 512 ? "flex-start" : "center",
                            }}
                        >
                            <h4 style={{ marginBottom: ".25em", maxWidth: "75%" }}>
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
                                            fontSize: "1.5em",
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
                                            height: "12px",
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
                                Boosts{" "}
                                {
                                    CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[
                                        action.bonus_type
                                    ]
                                }{" "}
                                by {action.bonus_amount}
                            </li>
                            {"status" in action && (action.status ?? 0 > 0) && (
                                <li>
                                    Grants<b>{" "}
                                    {
                                        CONFIG.SHIP_BATTLE_GRANTS[
                                            action.status ?? 0
                                        ]
                                    }{" "}</b>status:<br />
                                    {
                                        CONFIG.SHIP_BATTLE_GRANT_DESC[
                                            action.status ?? 0
                                        ]
                                    }
                                </li>
                            )}
                            {action.penalty && (
                                <li>
                                    Decrease{" "}
                                    {
                                        CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[
                                            action.penalty.type
                                        ]
                                    }{" "}
                                    by {action.penalty.amount}
                                </li>
                            )}
                            <li style={{ color: "white" }}>
                                <b>Initialize</b>: {action.initial_cooldown}s,{" "}
                                <b>Cooldown</b>: {action.cooldown}s,{" "}
                                <b>Duration</b>: {action.duration}s
                            </li>
                            {action.limit && (
                                <li style={{ color: "white" }}>
                                    <b>Uses Per Battle</b>: {action.limit}{" "}
                                    {drawBullets(action.limit)}
                                </li>
                            )}
                        </ul>

                        {action.ability && action.ability.type && (
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
                                        padding: "0px 2px",
                                        fontFamily: "arial",
                                        display: "flex",
                                        flexDirection:
                                            window.innerWidth < 512 ? "column" : "row",
                                        justifyContent: "space-between",
                                        backgroundColor: getActionColor(
                                            action.bonus_type
                                        ),
                                    }}
                                >
                                    <div style={{ marginTop: "-4px" }}>
                                        Bonus Ability
                                    </div>
                                    {action.ability.condition > 0 && (
                                        <li style={{ marginTop: "-4px" }}>
                                            <b>Trigger</b>:{" "}
                                            {
                                                CONFIG.CREW_SHIP_BATTLE_TRIGGER[
                                                    action.ability.condition
                                                ]
                                            }
                                        </li>
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
                                    <div>{getShipBonus(action)}</div>
                                </div>
                            </div>
                        )}

                        {action.charge_phases && action.charge_phases.length && (
                            <div>
                                <div style={{ marginBottom: ".25em" }}>
                                    Charge Phases
                                </div>
                                <ol
                                    style={{
                                        marginTop: "0",
                                        listStylePosition: "inside",
                                        paddingLeft: "0",
                                    }}
                                >
                                    {getShipChargePhases(action).map((phase, idx) => (
                                        <li key={idx}>{phase}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>)
                    }
                    
                <div>
                    <div style={{ marginBottom: ".25em" }}>Equipment Bonus</div>
                    <p>
                        {ship_battle.accuracy && (
                            <span>
                                <b>Accuracy:</b> +{ship_battle.accuracy}
                                {` `}
                            </span>
                        )}
                        {ship_battle.crit_bonus && (
                            <span>
                                <b>Crit Bonus:</b> +
                                {ship_battle.crit_bonus}
                                {` `}
                            </span>
                        )}
                        {ship_battle.crit_chance && (
                            <span>
                                <b>Crit Rating:</b> +
                                {ship_battle.crit_chance}
                                {` `}
                            </span>
                        )}
                        {ship_battle.evasion && (
                            <span>
                                <b>Evasion:</b> +{ship_battle.evasion}
                                {` `}
                            </span>
                        )}
                    </p>
                </div>
            </div>
        );
    }
}
