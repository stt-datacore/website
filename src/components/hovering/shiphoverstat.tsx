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
import { ShipPresenter } from "../item_presenters/ship_presenter";

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
        
        const navClick = () => {
            if (!ship) return;
            window.location.href = '/ship?ship=' + ship.symbol;
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

        return ship ? (<ShipPresenter openShip={(ship) => navClick()} hover={true} storeName={this.props.targetGroup} ship={ship} />) : <></>
        
    }
    
}