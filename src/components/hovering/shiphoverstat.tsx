import { navigate } from "gatsby";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { CompletionState } from "../../model/player";
import { Ship } from "../../model/ship";
import CONFIG from "../CONFIG";
import { ShipPresenter } from "../item_presenters/ship_presenter";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";

const isWindow = typeof window !== 'undefined';

export interface ShipHoverStatProps extends HoverStatProps {
    disableBuffs?: boolean;
}

export interface ShipHoverStatState extends HoverStatState<Ship> {
}

export interface ShipTargetProps extends HoverStatTargetProps<Ship | undefined> {
}

export interface ShipTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class ShipTarget extends HoverStatTarget<Ship | undefined, ShipTargetProps, ShipTargetState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

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
                this.tiny.setRapid('displayItem', this.prepareDisplayItem(this.props.inputItem ?? undefined));
            }
        }
    };

    // private tick(){
    //     this.tiny.setValue<number>('tick', this.tiny.getValue<number>('tick', 0) ?? 0 + 1);
    // }
    protected prepareDisplayItem(dataIn: Ship | undefined): Ship | undefined {
        const { buffConfig } = this.context.player;
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
            if (isWindow) window.setTimeout(() => {
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

export class ShipHoverStat extends HoverStat<Ship, ShipHoverStatProps, ShipHoverStatState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    constructor(props: ShipHoverStatProps) {
        super(props);
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }
    }

    protected checkBorder = (ship?: Ship, setState?: boolean) => {
        ship ??= this.state.displayItem ?? undefined;
        const { boxStyle } = this.state;

        if (ship) {
            let mr = ship.rarity;
            let clr = CONFIG.RARITIES[mr].color;
            if (boxStyle.borderColor !== clr) {
                if (setState) this.setState({ ... this.state, boxStyle: { ... boxStyle, borderWidth: "2px", borderColor: clr }});
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
        if (this.checkBorder()) {
            window.setTimeout(() => this.checkBorder(undefined, true));
        }

        const { targetGroup } = this.props;
        const { mobileWidth, displayItem, touchToggled } = this.state;

        const compact = true;

        if (!displayItem) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        }

        const navClick = () => {
            if (!displayItem) return;
            navigate('/ship_info?ship=' + displayItem.symbol);
        }

        const onClose = () => {
            this.deactivate();
        }

        return displayItem ? (<ShipPresenter
                        mobileWidth={mobileWidth}
                        close={() => onClose()}
                        openShip={(ship) => navClick()}
                        hover={true}
                        storeName={targetGroup}
                        touched={touchToggled}
                        ship={displayItem} />) : <></>

    }

    protected get canActivate(): boolean {
        return true; // return !!this.props.ship;
    }

}