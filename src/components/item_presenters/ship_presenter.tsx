import { navigate } from "gatsby";
import React, { Component } from "react";
import { Rating } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { CompletionState } from "../../model/player";
import { Ship } from "../../model/ship";
import { printImmoText } from "../../utils/crewutils";
import { TinyStore } from "../../utils/tiny";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { ShipSkill } from "./shipskill";

export interface PresenterProps {
    hover: boolean;
    storeName: string;
    disableBuffs?: boolean;
    mobileWidth?: number;
    forceVertical?: boolean;
    verticalLayout?: 0 | 1 | 2;
    close?: () => void;
    touched?: boolean;
    width?: string;
    imageWidth?: string;
    showIcon?: boolean;
    tabs?: boolean;
}

export interface ShipPresenterProps extends PresenterProps {
    ship: Ship;
    openShip?: (ship: Ship) => void;
}

export interface ShipPresenterState {
    mobileWidth: number;
}

export class ShipPresenter extends Component<ShipPresenterProps, ShipPresenterState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    tiny: TinyStore;

    constructor(props: ShipPresenterProps) {
        super(props);
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }

        this.tiny = TinyStore.getStore(props.storeName)
    }

    protected get showPlayerBuffs(): boolean {
        return this.tiny.getValue<boolean>('buff', true) ?? false;
    }

    protected set showPlayerBuffs(value: boolean) {
        this.tiny.setValue<boolean>('buff', value, true);
    }

    protected get showImmortalized(): boolean {
        return this.tiny.getValue<boolean>('immo', true) ?? false;
    }

    protected set showImmortalized(value: boolean) {
        this.tiny.setValue<boolean>('immo', value, true);
    }

    protected get showShipAbility(): boolean {
        return this.tiny.getValue<boolean>('ship', true) ?? false;
    }

    protected set showShipAbility(value: boolean) {
        this.tiny.setValue<boolean>('ship', value, true);
    }

    render(): JSX.Element {
        const { ship: ship, touched, tabs, showIcon } = this.props;
        const { mobileWidth } = this.state;
        const { SHIP_TRAIT_NAMES } = this.context.localized;

        const compact = this.props.hover;

        if (!ship) {
            return <></>
        }

        const { t } = this.context.localized;

        const frozenStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'white',
            cursor: "default",
            marginRight: "0px"
        }

        const checkedStyle: React.CSSProperties = {
            color: "lightgreen",
            marginRight: "0px"
        }

        var me = this;
        const immoToggle = (e) => {
            if (ship && "immortal" in ship && ship.immortal !== undefined && ship.immortal != 0 && ship.immortal > -2) {
                return;
            }
            me.showImmortalized = !me.showImmortalized;
        }

        const navClick = (e) => {
            if (!ship) return;
            if (this.props.openShip) {
                this.props.openShip(ship);
            }
        }

        let keys = [ "attack", "accuracy", "evasion", "shields", "hull", "antimatter"]
        let icons = [ "attack-color.png", "accuracy-color.png", "evasion-color.png", "shield-color.png", "hull-color.png", "antimatter-icon.png"]
        let names = [ t('ship.attack'), t('ship.accuracy'), t('ship.evasion'), t('ship.shields'), t('ship.hull'), t('ship.antimatter')]

        let stats1: { name: string, value: number, icon: string }[]=[];
        let stats2: { name: string, value: number, icon: string }[]=[];

        if (ship) {
            for (let i = 0; i < 6; i++) {
                let stat = {
                    name: names[i],
                    value: ship[keys[i]] as number,
                    icon: icons[i]
                }
                if (i <= 2) {
                    stats1.push(stat);
                }
                else {
                    stats2.push(stat);
                }

            }
        }

        const stats = [stats1, stats2];

        return ship ? (<div style={{
                        fontSize: "12pt",
                        display: "flex",
                        textAlign: 'left',
                        flexDirection: window.innerWidth < mobileWidth ? "column" : "row",
                        //width: window.innerWidth < mobileWidth ? "calc(100vw - 16px)" : undefined

                        }}>
                            <div style={{display: "flex", flexDirection:"row", justifyContent:"flex-start"}}>
                        {touched && <>
                            <i className='close icon' style={{cursor: "pointer"}} onClick={(e) => this.props.close ? this.props.close() : undefined} />
                        </>}
                    </div>
                <div style={{ display: "flex", flexDirection: "column"}}>
                    <div style={{flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection:"row"}}>
                        <img
                            src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
                            style={{ height: compact ? "15em" : "25em", maxWidth: "calc(100vw - 32px)", marginRight: "8px"}}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom:"16px"}}>
                        {!showIcon && <div
                            onClick={() => navigate(`/ship_info/?ship=${ship.symbol}`)}
                            style={{
                                cursor: 'pointer',
                                display: "flex", flexDirection: "row", justifyContent: "space-evenly", alignItems: 'center' }}>
                            {ship.battle_stations?.map((bs, idx) => {
                                return <img
                                    key={`${bs.skill}_key_${ship.symbol}_${idx}`}
                                    style={{height: '1em'}}
                                    src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} />
                            })}
                            {/* {(!this.props.disableBuffs) &&
                            <i className="arrow alternate circle up icon" title="Toggle Personal Buffs" style={this.showPlayerBuffs ? activeStyle : dormantStyle} onClick={(e) => buffToggle(e)} />
                            ||
                            <i className="arrow alternate circle up icon" title="Buffs not Available" style={disableStyle} />
                            }

                            {("immortal" in ship && (ship.immortal === CompletionState.DisplayAsImmortalUnowned || ship.immortal === CompletionState.DisplayAsImmortalStatic) &&
                            <i className="lock icon"
                                title={printImmoText(ship.immortal, "Ship", "Max Level")}
                                style={frozenStyle}
                                />)
                            ||
                            <i className="star icon"
                                title={("immortal" in ship && ship.immortal) ? printImmoText(ship.immortal, "Ship", "Max Level") : (this.showImmortalized ? "Show Owned Rank" : "Show Immortalized")}
                                style={("immortal" in ship && ship.immortal != 0 && (ship.immortal ?? 0) > -2) ? completeStyle : this.showImmortalized ? activeStyle : dormantStyle}
                                onClick={(e) => immoToggle(e)} />
                            } */}
                        </div>}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "8em",
                        justifyContent: "space-between",
                        width: window.innerWidth < mobileWidth ? "15m" : "32em",
                    }}
                >
                    <div style={{display: "flex", flexDirection: window.innerWidth < mobileWidth ? "column" : "row", justifyContent: "space-between"}}>
                        <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>
                            <a onClick={(e) => navClick(e)} style={{cursor: "default"}} title={ship.name}>
                                {ship.name}
                            </a>
                            <p style={{fontSize: '0.8em', fontStyle: 'italic'}}>
                                {ship.flavor}
                            </p>
                        </h3>
                        <div style={{margin: "4px", marginLeft: 0, display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <h4 style={{margin:"2px 8px", marginLeft: 0, padding: "8px"}} className="ui segment" title={"immortal" in ship ? printImmoText(ship.immortal ?? CompletionState.DisplayAsImmortalStatic, t('ship.ship'), t('ship.max_level'), t) : t('item_state.item_is_shown', { item: 'base.ship', level: 'ship.max_level'})}>
                                {
                                    "immortal" in ship && (
                                        ((ship.immortal === 0)) ?
                                        (<b>{ship.level}/{ship.max_level}</b>) :
                                        (((ship.immortal ?? 0) > 0)) ?
                                        (<i className="snowflake icon" style={frozenStyle} />) :
                                        (<i className="check icon" style={checkedStyle} />)
                                    ) || (<i className="check icon" style={checkedStyle} />)
                                }
                            </h4>
                            <Rating
                                onClick={(e) => immoToggle(e)}
                                icon='star'
                                rating={ship.rarity}
                                maxRating={ship.rarity}
                                size='large'
                                disabled />
                        </div>
                    </div>
                    {stats?.map((statline, index) =>
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection: "row",
                                //window.innerWidth < mobileWidth ? "column" : "row",
                                justifyContent: "space-between",
                                marginTop: "4px",
                                marginBottom: "2px",
                            }}
                        >
                            {statline?.map((stat, index) =>
                                <div key={index} style={{
                                        width: window.innerWidth < mobileWidth ? "30vw" : "9em", display: "flex", flexDirection: "row", alignItems: "center" }}>
                                    <img src={"/media/ship/" + stat.icon} style={{height: "1.5em", marginRight: "6px"}} />
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <div>{stat?.name}</div>
                                        <div>{stat?.value?.toLocaleString()}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    <div
                        style={{
                            textAlign: "left",
                            fontStyle: "italic",
                            fontSize: "0.85em",
                            marginTop: "2px",
                            marginBottom: "4px",
                        }}
                    >
                        {ship.traits?.map(t => SHIP_TRAIT_NAMES[t]).join(", ")}
                    </div>
                    {!!ship.traits_hidden?.length && <div
                        style={{
                            textAlign: "left",
                            fontStyle: "italic",
                            fontSize: "0.85em",
                            marginTop: "2px",
                            opacity: 0.50,
                            marginBottom: "4px",
                        }}
                    >
                        {ship.traits_hidden?.join(", ")}
                    </div>}
                    <div>
                        {!!ship.actions?.length && <ShipSkill
                                withActionIcons={showIcon}
                                grouped={tabs}
                                context={ship}
                                fontSize="0.8em" />}
                    </div>
                </div>
            </div>) : <></>

    }

}