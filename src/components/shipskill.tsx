import React from "react";
import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";
import CONFIG from "./CONFIG";
import { getShipBonus, getShipChargePhases } from "../utils/crewutils";

export interface ShipSkillProps {
    crew: PlayerCrew | CrewMember | null | undefined;
}

export class ShipSkill extends React.Component<ShipSkillProps> {
    constructor(props: ShipSkillProps) {
        super(props);
    }

    render() {
        const { crew } = this.props;
        if (!crew) return <span></span>;
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
            <div style={{ marginBottom: "4px", fontSize: "0.75em" }}>
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
                        {crew.action.name}
                    </h4>
                    <div
                        style={{
                            width: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            alignContent: "center",
                            backgroundColor: getActionColor(
                                crew.action.bonus_type
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
                                + {crew.action.bonus_amount}
                            </span>
                            <img
                                src={getActionIcon(crew.action.bonus_type)}
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
                        color: getActionColor(crew.action.bonus_type),
                    }}
                >
                    <li>
                        Boosts{" "}
                        {
                            CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[
                                crew.action.bonus_type
                            ]
                        }{" "}
                        by {crew.action.bonus_amount}
                    </li>

                    {crew.action.penalty && (
                        <li>
                            Decrease{" "}
                            {
                                CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[
                                    crew.action.penalty.type
                                ]
                            }{" "}
                            by {crew.action.penalty.amount}
                        </li>
                    )}
                    <li style={{ color: "white" }}>
                        <b>Initialize</b>: {crew.action.initial_cooldown}s,{" "}
                        <b>Cooldown</b>: {crew.action.cooldown}s,{" "}
                        <b>Duration</b>: {crew.action.duration}s
                    </li>
                    {crew.action.limit && (
                        <li style={{ color: "white" }}>
                            <b>Uses Per Battle</b>: {crew.action.limit}{" "}
                            {drawBullets(crew.action.limit)}
                        </li>
                    )}
                </ul>

                {crew.action.ability && (
                    <div
                        style={{
                            border:
                                "2px solid " +
                                getActionColor(crew.action.bonus_type),
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
                                    crew.action.bonus_type
                                ),
                            }}
                        >
                            <div style={{ marginTop: "-4px" }}>
                                Bonus Ability
                            </div>
                            {crew.action.ability.condition > 0 && (
                                <li style={{ marginTop: "-4px" }}>
                                    <b>Trigger</b>:{" "}
                                    {
                                        CONFIG.CREW_SHIP_BATTLE_TRIGGER[
                                            crew.action.ability.condition
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
                            <div>{getShipBonus(crew)}</div>
                        </div>
                    </div>
                )}

                {crew.action.charge_phases && crew.action.charge_phases.length && (
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
                            {getShipChargePhases(crew).map((phase, idx) => (
                                <li key={idx}>{phase}</li>
                            ))}
                        </ol>
                    </div>
                )}

                <div>
                    <div style={{ marginBottom: ".25em" }}>Equipment Bonus</div>
                    <p>
                        {crew.ship_battle.accuracy && (
                            <span>
                                <b>Accuracy:</b> +{crew.ship_battle.accuracy}
                                {` `}
                            </span>
                        )}
                        {crew.ship_battle.crit_bonus && (
                            <span>
                                <b>Crit Bonus:</b> +
                                {crew.ship_battle.crit_bonus}
                                {` `}
                            </span>
                        )}
                        {crew.ship_battle.crit_chance && (
                            <span>
                                <b>Crit Rating:</b> +
                                {crew.ship_battle.crit_chance}
                                {` `}
                            </span>
                        )}
                        {crew.ship_battle.evasion && (
                            <span>
                                <b>Evasion:</b> +{crew.ship_battle.evasion}
                                {` `}
                            </span>
                        )}
                    </p>
                </div>
            </div>
        );
    }
}
