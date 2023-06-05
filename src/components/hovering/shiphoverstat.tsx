import React from "react";
import { CompletionState, Player, PlayerCrew } from "../../model/player";
import { HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { StatLabelProps } from "../commoncrewdata";
import { Label, Rating, Segment } from "semantic-ui-react";
import CrewStat from "../crewstat";
import { applySkillBuff, formatTierLabel, getShipBonus, getShipChargePhases, gradeToColor } from "../../utils/crewutils";
import { BuffStatTable } from "../../utils/voyageutils";
import * as uuid from 'uuid';
import CONFIG from "../CONFIG";
import { printImmoText } from "../../utils/crewutils";
import { ShipSkill, ShipSkillProps } from "../shipskill";
import { Ship } from "../../model/ship";

export interface ShipHoverStatProps extends HoverStatProps {
    ship: Ship | undefined | null;
    disableBuffs?: boolean;
}

export interface ShipHoverStatState extends HoverStatState {
}

export interface ShipTargetProps extends HoverStatTargetProps<Ship | undefined> {
    allShips: Ship[]
    buffConfig?: BuffStatTable;
}

export interface ShipTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class ShipTarget extends HoverStatTarget<Ship | undefined, ShipTargetProps, ShipTargetState> {
    
    constructor(props: ShipTargetProps){
        super(props);        
        this.tiny.subscribe(this.propertyChanged);                
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

    protected propertyChanged = (key: string) => {
        if (key === 'cancelled') return;
        if (key === 'buff' || key === 'immo') {
            const { targetId } = this.state;
            if (this.current === targetId) {
                this.props.setDisplayItem(this.prepareDisplayItem(this.props.inputItem ?? undefined));
            }            
        }
    };

    // private tick(){
    //     this.tiny.setValue<number>('tick', this.tiny.getValue<number>('tick', 0) ?? 0 + 1);
    // }
    protected prepareDisplayItem(dataIn: Ship | undefined): Ship | undefined {
        const { buffConfig } = this.props;

        const applyBuffs = this.showPlayerBuffs;
        const showImmortal = this.showImmortalized;

        if (dataIn) {            
            let item: Ship = dataIn as Ship;
            let cm: Ship | undefined = undefined;

            if (item.owned) {
                item = JSON.parse(JSON.stringify(dataIn)) as Ship;
                if (item.level === item.max_level) {
                    item.immortal = CompletionState.Immortalized;
                }
                else {
                    item.immortal = CompletionState.NotComplete;
                }
            }
            else {
                item.immortal = CompletionState.DisplayAsImmortalUnowned;
            }

            return item;
         
        }        
        return dataIn;
    }
    
    componentDidUpdate(): void {
        if (this.props.inputItem) {
            const url = `${process.env.GATSBY_ASSETS_URL}${this.props.inputItem.icon?.file.slice(1).replace('/', '_')}.png`;
            window.setTimeout(() => {
                for (let i = 0; i < 1; i++) {
                    let img = new Image();
                    img.src = url;                    
                }
            });
        }
    }

    componentWillUnmount(): void {
        this.tiny.unsubscribe(this.propertyChanged);
    }
}

export class ShipHoverStat extends HoverStat<ShipHoverStatProps, ShipHoverStatState> {
    constructor(props: ShipHoverStatProps) {
        super(props);        
        this.state = {
            ... this.state
        }
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

    protected renderContent = (): JSX.Element =>  {
        const { ship: ship } = this.props;
        const compact = true;    

        if (!ship) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        } 

        const dormantStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'gray',
            cursor: "pointer"
        }

        const disableStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'gray'
        }

        const activeStyle: React.CSSProperties = {
            background: 'transparent',
            color: '#FFE623',
            cursor: "pointer"
        }

        const completeStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'lightgreen',            
            cursor: "default"
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
        const buffToggle = (e) => {
            me.showPlayerBuffs = !me.showPlayerBuffs;
        }
        const shipToggle = (e) => {
            me.showShipAbility = !me.showShipAbility;
            let ct = me.currentTarget;
            window.setTimeout(() => {
                me.deactivate(ct);
                window.setTimeout(() => {
                    if (ct) me.activate(ct);
                }, 0);
            }, 0);            
        }
        
        const navClick = (e) => {
            if (!ship) return;
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
                        <a onClick={(e) => navClick(e)} style={{cursor: "pointer"}} title={"Go To Crew Page For '" + ship.name + "'"}>
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
                                style={{ height: this.showShipAbility ? "15em" : "9.5em", marginRight: "8px" }}
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
                                        (<b>{ship.level}</b>) : 
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