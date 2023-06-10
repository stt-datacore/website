import React, { Component } from "react";
import { CompletionState } from "../../model/player";
import { Rating } from "semantic-ui-react";
import { printImmoText } from "../../utils/crewutils";
import { ShipSkill } from "../shipskill";
import { Ship } from "../../model/ship";
import { TinyStore } from "../../utils/tiny";

export interface PresenterProps {
    hover: boolean;
    storeName: string;
    disableBuffs?: boolean;
}

export interface ShipPresenterProps extends PresenterProps {
    ship: Ship;
    openShip?: (ship: Ship) => void;
}

export interface ShipPresenterState {

}

export class ShipPresenter extends Component<ShipPresenterProps, ShipPresenterState> {

    tiny: TinyStore;

    constructor(props: ShipPresenterProps) {
        super(props);        
        this.state = {
            ... this.state
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
        const { ship: ship } = this.props;
        const compact = this.props.hover;    

        if (!ship) {
            return <></>
        } 
       
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
        let names = [ "Attack", "Accuracy", "Evasion", "Shields", "Hull", "Antimatter"]
        
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

        return ship ? (<div style={{ display: "flex", flexDirection: "row" }}>
                <div style={{ display: "flex", flexDirection: "column"}}>                    
                    <div style={{flexGrow: 1, display: "flex", alignItems: "center", flexDirection:"row"}}>
                        <a onClick={(e) => navClick(e)} style={{cursor: "pointer"}} title={"Go To Ship Page For '" + ship.name + "'"}>
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
                                style={{ height: compact ? "15em" : "25em", marginRight: "8px" }}
                            />
                        </a>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom:"8px"}}>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                            
                            {/* {(!this.props.disableBuffs) &&
                            <i className="arrow alternate circle up icon" title="Toggle Buffs" style={this.showPlayerBuffs ? activeStyle : dormantStyle} onClick={(e) => buffToggle(e)} />
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
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "8em",
                        justifyContent: "space-between",
                        width: window.innerWidth <= 768 ? "15m" : "32em",
                    }}
                >
                    <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                        <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>{ship.name}</h3>
                        <div style={{margin: "4px", display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <h4 style={{margin:"2px 8px", padding: "8px"}} className="ui segment" title={"immortal" in ship ? printImmoText(ship.immortal ?? CompletionState.DisplayAsImmortalStatic, "Ship", "Max Level") : "Crew Is Shown Immortalized"}>
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
                    {stats.map((statline, index) => 
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection:
                                window.innerWidth <= 512 ? "column" : "row",
                                justifyContent: "space-between",
                                marginTop: "4px",
                                marginBottom: "2px",
                            }}
                        >
                            {statline.map((stat, index) =>                             
                                <div style={{ width: "9em", display: "flex", flexDirection: "row", alignItems: "center" }}>
                                    <img src={"/media/ship/" + stat.icon} style={{height: "1.5em", marginRight: "6px"}} />
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <div>{stat.name}</div>
                                        <div>{stat.value.toLocaleString()}</div>
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
                        {ship.traits_named?.join(", ")}
                    </div>
                    <div>
                        {ship.actions && <ShipSkill withBorder={true} actions={ship.actions} ship_battle={ship} />}
                    </div>
                </div>
            </div>) : <></>
        
    }
    
}