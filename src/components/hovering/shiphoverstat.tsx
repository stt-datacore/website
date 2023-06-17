import React from "react";
import { CompletionState } from "../../model/player";
import { HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { BuffStatTable } from "../../utils/voyageutils";
import { Ship } from "../../model/ship";
import { ShipPresenter } from "../item_presenters/ship_presenter";
import CONFIG from "../CONFIG";

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

    protected checkBorder = () => {
        const { ship } = this.props;
        const { boxStyle } = this.state;

        if (ship) {
            let mr = ship.rarity;
            let clr = CONFIG.RARITIES[mr].color;
            if (boxStyle.borderColor !== clr) {
                this.setState({ ... this.state, boxStyle: { ... boxStyle, borderWidth: "2px", borderColor: clr }});
                return true;
            }
        }

        return false;
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
        if (this.checkBorder()) return <></>;
        const { ship: ship } = this.props;
        const compact = true;    

        if (!ship) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        } 
        
        const navClick = () => {
            if (!ship) return;
            //window.location.href = 'playertools?tool=ship&ship=' + ship.symbol;
        }

        const onClose = () => {
            this.deactivate();
        }

        return ship ? (<ShipPresenter close={() => onClose()} openShip={(ship) => navClick()} hover={true} storeName={this.props.targetGroup} ship={ship} />) : <></>
        
    }
    
}