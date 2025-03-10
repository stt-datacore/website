import * as React from "react";
import { CrewMember } from "../../model/crew";
import { CompletionState, PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { navToCrewPage } from "../../utils/nav";
import { CrewPlugins, CrewPresenter } from "../item_presenters/crew_presenter";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";
import { GlobalContext } from "../../context/globalcontext";
import { CrewPreparer } from "../item_presenters/crew_preparer";
import { toDataURL } from "../item_presenters/shipskill";

const isWindow = typeof window !== 'undefined';

export interface CrewHoverStatProps extends HoverStatProps, CrewPlugins {
    disableBuffs?: boolean;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
}

export interface CrewHoverStatState extends HoverStatState<PlayerCrew | CrewMember> {
}

export interface CrewTargetProps extends HoverStatTargetProps<PlayerCrew | CrewMember | undefined> {
    ensureOwnedState?: boolean;
    passDirect?: boolean;
}

export interface CrewTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class CrewTarget extends HoverStatTarget<PlayerCrew | CrewMember | undefined, CrewTargetProps, CrewTargetState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    constructor(props: CrewTargetProps){
        super(props);
        this.tiny.subscribe(this.propertyChanged);
    }

    protected get playerBuffMode(): PlayerBuffMode {
        let key = "buffmode";
        let def = "max" as PlayerBuffMode;
        if (this.context.player.playerData) {
            key += "_player";
            def = 'player';
        }
        let result = this.tiny.getValue<PlayerBuffMode>(key, def) ?? def;
        if (result === 'quipment' && !(this.props.inputItem as PlayerCrew)?.immortal) result = 'player';

        return result;
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
        let key = "buffmode";
        if (this.context.player.playerData) key += "_player";
        this.tiny.setValue<PlayerBuffMode>(key, value, true);
    }

    protected get immortalMode(): PlayerImmortalMode {
        let key = "immomode";
        let mode = "full" as PlayerImmortalMode;

        if (this.context.player.playerData) {
            key += "_player";
            mode = 'owned';
        }

        let value: PlayerImmortalMode;
        if (this.props.inputItem) {
            value =
                this.tiny.getValue<PlayerImmortalMode>(
                    key + "/" + this.props.inputItem.symbol,
                    mode
                ) ?? mode;
        } else {
            value =
                this.tiny.getValue<PlayerImmortalMode>(key, mode) ?? mode;
        }

        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        let key = "immomode";
        if (this.context.player.playerData) key += "_player";

        if (value == this.immortalMode) return;
        if (this.props.inputItem) {
            this.tiny.setValue<PlayerImmortalMode>(
                key + "/" + this.props.inputItem.symbol,
                value,
                true
            );
        } else {
            this.tiny.setValue<PlayerImmortalMode>(key, value, true);
        }
    }


    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.props.inputItem) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.inputItem.symbol, ['owned']) ?? ['owned'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['owned']) ?? ['owned'];
        }
         // console.log("immortal-mode")
         // console.log(value);
        return value;
    }

    protected set validImmortalModes(value: PlayerImmortalMode[]) {
        if (this.props.inputItem) {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.inputItem.symbol, value, false);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, false);
        }
    }

    protected propertyChanged = (key: string) => {
        if (key === 'cancelled') return;
        if (key === 'buffmode' || key === 'buffmode_player' || key.startsWith('immomode/') || key.startsWith('immomode_player/') || key === 'immomode') {
            const { targetId } = this.state;
            if (this.current === targetId) {
                this.tiny.setRapid('displayItem', this.prepareDisplayItem(this.props.inputItem ?? undefined));
            }
        }
    };

    // private tick(){
    //     this.tiny.setValue<number>('tick', this.tiny.getValue<number>('tick', 0) ?? 0 + 1);
    // }
    protected prepareDisplayItem(dataIn: PlayerCrew | CrewMember | undefined): PlayerCrew | CrewMember | undefined {
        if (this.props.passDirect) {
            if (dataIn && "immortal" in dataIn) {
                if (dataIn.immortal === CompletionState.DisplayAsImmortalOpponent) {
                    if (dataIn.rarity === dataIn.max_rarity) {
                        this.validImmortalModes = ['full']
                    }
                    else {
                        this.validImmortalModes = [dataIn.rarity as PlayerImmortalMode];
                    }
                }
            }
            return dataIn;
        }
        const buffMode = this.playerBuffMode;
        const immortalMode = this.immortalMode;
        const hasQuipment = !!dataIn?.kwipment?.some(q => typeof q === 'number' ? q !== 0 : q[0] !== 0);
        let [crewResult, immoResult] = CrewPreparer.prepareCrewMember(dataIn, buffMode, immortalMode, this.context, hasQuipment);

        this.validImmortalModes = immoResult ?? ['full'];
        return crewResult;
    }

    componentDidUpdate(): void {
        const di = this.tiny.getRapid<PlayerCrew | undefined>('displayItem', undefined);
        if (di) {
            const url = `${process.env.GATSBY_ASSETS_URL}${di.imageUrlFullBody}`;
            toDataURL(url, () => {});
        }
    }

    componentDidMount(): void {
        const di = this.props.inputItem;
        if (di) {
            const url = `${process.env.GATSBY_ASSETS_URL}${di.imageUrlFullBody}`;
            window.setTimeout(() => {
                const img = new Image()
                img.src = url;
            });
        }
    }

    componentWillUnmount(): void {
        this.tiny.unsubscribe(this.propertyChanged);
    }
}

export class CrewHoverStat extends HoverStat<PlayerCrew | CrewMember, CrewHoverStatProps, CrewHoverStatState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    constructor(props: CrewHoverStatProps) {
        super(props);
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        };
    }

    protected checkBorder = (crew?: PlayerCrew | CrewMember, setState?: boolean) => {
        crew ??= this.state.displayItem;
        const { boxStyle } = this.state;

        if (crew) {
            let mr = crew.max_rarity;
            let clr = CONFIG.RARITIES[mr].color;
            if (boxStyle.borderColor !== clr) {
                if (setState) this.setState({ ... this.state, boxStyle: { ... boxStyle, borderWidth: "2px", borderColor: clr }});
                return true;
            }
        }

        return false;
    }

    protected get playerBuffMode(): PlayerBuffMode {
        let key = "buffmode";
        let def = "max" as PlayerBuffMode;
        if (this.context.player.playerData) {
            key += "_player";
            def = 'player';
        }
        let result = this.tiny.getValue<PlayerBuffMode>(key, def) ?? def;
        if (result === 'quipment' && !(this.state.displayItem as PlayerCrew)?.immortal) result = 'player';

        return result;
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
        let key = "buffmode";
        if (this.context.player.playerData) key += "_player";
        this.tiny.setValue<PlayerBuffMode>(key, value, true);
    }

    protected get immortalMode(): PlayerImmortalMode {
        let key = "immomode";
        let mode = "full" as PlayerImmortalMode;

        if (this.context.player.playerData) {
            key += "_player";
            mode = 'owned';
        }

        let value: PlayerImmortalMode;
        if (this.state.displayItem) {
            value =
                this.tiny.getValue<PlayerImmortalMode>(
                    key + "/" + this.state.displayItem.symbol,
                    mode
                ) ?? mode;
        } else {
            value =
                this.tiny.getValue<PlayerImmortalMode>(key, mode) ?? mode;
        }

        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        let key = "immomode";
        if (this.context.player.playerData) key += "_player";

        if (value == this.immortalMode) return;
        if (this.state.displayItem) {
            this.tiny.setValue<PlayerImmortalMode>(
                key + "/" + this.state.displayItem.symbol,
                value,
                true
            );
        } else {
            this.tiny.setValue<PlayerImmortalMode>(key, value, true);
        }
    }

    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.state.displayItem) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + this.state.displayItem.symbol, ['owned']) ?? ['owned'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['owned']) ?? ['owned'];
        }
         // console.log("immortal-mode")
         // console.log(value);
        return value;
    }

    protected set validImmortalModes(value: PlayerImmortalMode[]) {
        if (this.state.displayItem) {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + this.state.displayItem.symbol, value, false);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, false);
        }
    }

    protected renderContent = (): JSX.Element => {
        if (this.checkBorder()) {
            if (isWindow) window.setTimeout(() => this.checkBorder(undefined, true));
        }
        const { targetGroup, openCrew, plugins, pluginData } = this.props;
        const { mobileWidth, displayItem, touchToggled } = this.state;
        const compact = true;

        if (!displayItem) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            if (isWindow) window.setTimeout(() => this.deactivate());
        }

        const navClick = () => {
            if (!displayItem) return;

            if (openCrew) {
                openCrew(displayItem)
            }
            else {
                const { buffConfig, playerData } = this.context.player;
                const { crew: allCrew } = this.context.core;
                if (playerData && "player" in playerData) {
                    navToCrewPage(displayItem);
                }
                else {
                    navigate("/crew/" + displayItem.symbol);
                }

            }
        }

        const closeClick = () => {
            this.deactivate();
        }

        return displayItem ? (<CrewPresenter
                        plugins={plugins}
                        pluginData={pluginData}
                        close={() => closeClick()}
                        openCrew={(crew) => navClick()}
                        crew={displayItem}
                        storeName={targetGroup}
                        hover={true}
                        touched={touchToggled}
                        mobileWidth={mobileWidth}
                        />) : <></>

    }

    protected get canActivate(): boolean {
        return true; // return !!this.state.displayItem;
    }
}