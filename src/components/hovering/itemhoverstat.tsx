import { navigate } from "gatsby";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentItem } from "../../model/equipment";
import { mergeItems } from "../../utils/itemutils";
import CONFIG from "../CONFIG";
import { ItemPresenter } from "../item_presenters/item_presenter";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";

const isWindow = typeof window !== 'undefined';

export interface ItemHoverStatProps extends HoverStatProps {
    disableBuffs?: boolean;
    navigate?: (symbol: string) => void;
    crewTargetGroup?: string;
    compact?: boolean;
}

export interface ItemHoverStatState extends HoverStatState<EquipmentItem> {
}

export interface ItemTargetProps extends HoverStatTargetProps<EquipmentItem | undefined> {
}

export interface ItemTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class ItemTarget extends HoverStatTarget<EquipmentItem | undefined, ItemTargetProps, ItemTargetState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    constructor(props: ItemTargetProps){
        super(props);
        this.tiny.subscribe(this.propertyChanged);
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
    protected prepareDisplayItem(dataIn: EquipmentItem | undefined): EquipmentItem | undefined {
        if (this.props.passDirect) return dataIn;
        const { playerData } = this.context.player;
        const { items } = this.context.core;

        let dataOut: EquipmentItem | undefined = dataIn;

        if (playerData?.player?.character?.items?.length && dataIn && !dataIn.isReward) {
            const fi = playerData?.player?.character?.items?.find(f => f.symbol === dataIn?.symbol);
            const ci = items?.find(f => f.symbol === dataIn.symbol);
            if (fi && ci) {
                dataOut = { ... ci, ... mergeItems([fi],[ci])[0] as EquipmentItem };
            }
            else if (ci) {
                if (dataOut) {
                    dataOut = { ...dataOut, ... mergeItems([dataOut], [ci])[0] as EquipmentItem };
                }
                else {
                    dataOut = ci;
                }
            }

            if (dataIn && dataOut && !dataOut?.demandCrew?.length && !!dataIn?.demandCrew?.length) {
                dataOut.demandCrew = [ ... dataIn.demandCrew ];
            }
        }
        if (dataIn?.needed && dataOut){
            dataOut.needed = dataIn.needed;
        }
        const { ITEM_ARCHETYPES } = this.context.localized;
        if (dataOut && ITEM_ARCHETYPES) {
            dataOut.name = ITEM_ARCHETYPES[dataOut.symbol]?.name ?? dataOut.name;
            dataOut.flavor = ITEM_ARCHETYPES[dataOut.symbol]?.flavor ?? dataOut.flavor;
        }
        return dataOut;
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

export class ItemHoverStat extends HoverStat<EquipmentItem, ItemHoverStatProps, ItemHoverStatState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    constructor(props: ItemHoverStatProps) {
        super(props);
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }
    }

    protected checkBorder = (item?: EquipmentItem, setState?: boolean) => {
        item ??= this.state.displayItem ?? undefined;
        const { boxStyle } = this.state;

        if (item) {
            let mr = item.rarity ?? 0;
            let clr = CONFIG.RARITIES[mr].color ?? 'gray';
            if (boxStyle.borderColor !== clr) {
                if (setState) this.setState({ ... this.state, boxStyle: { ... boxStyle, borderWidth: "2px", borderColor: clr }});
                return true;
            }
        }

        return false;
    }

    protected renderContent = (): JSX.Element =>  {
        if (this.checkBorder()) {
            window.setTimeout(() => this.checkBorder(undefined, true));
        }

        const { crewTargetGroup, targetGroup } = this.props;
        const { mobileWidth, displayItem, touchToggled } = this.state;

        const compact = this.props.compact ?? true;

        if (!displayItem) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        }

        const navClick = (altItem?: EquipmentItem) => {
            altItem ??= displayItem;
            if (!altItem) return;
            if (this.props.navigate) {
                this.props.navigate(altItem.symbol);
            }
            else {
                navigate('/item_info?symbol=' + altItem.symbol, { replace: false });
            }
            this.deactivate();

            //window.location.href = 'playertools?tool=item&item=' + item.symbol;
        }

        const onClose = () => {
            this.deactivate();
        }

        return displayItem ? (<ItemPresenter
            compact={compact}
            crewTargetGroup={crewTargetGroup}
            mobileWidth={mobileWidth}
            close={() => onClose()}
            openItem={(item) => navClick(item)}
            hover={true}
            storeName={targetGroup}
            touched={touchToggled}
            item={displayItem} />) : <></>

    }

    protected get canActivate(): boolean {
        return true; // return !!this.props.item;
    }

}