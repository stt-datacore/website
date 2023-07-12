import * as React from "react";
import { CrewMember, Skill } from "../../model/crew";
import { CompletionState, PlayerCrew, PlayerData } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { applyCrewBuffs, applySkillBuff, getSkills, navToCrewPage, prepareOne, prepareProfileData } from "../../utils/crewutils";
import { BuffStatTable } from "../../utils/voyageutils";
import { CrewPlugins, CrewPresenter } from "../item_presenters/crew_presenter";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";
import { MergedContext } from "../../context/mergedcontext";
import { PlayerBuffMode, PlayerImmortalMode, getAvailableImmortalStates, applyImmortalState, CrewPreparer } from "../item_presenters/crew_preparer";

const isWindow = typeof window !== 'undefined';

export interface CrewHoverStatProps extends HoverStatProps, CrewPlugins {
    crew: CrewMember | PlayerCrew | undefined;
    disableBuffs?: boolean;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
}

export interface CrewHoverStatState extends HoverStatState {
}

export interface CrewTargetProps extends HoverStatTargetProps<PlayerCrew | CrewMember | undefined> {
    ensureOwnedState?: boolean;
}

export interface CrewTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class CrewTarget extends HoverStatTarget<PlayerCrew | CrewMember | undefined, CrewTargetProps, CrewTargetState> {
    static contextType = MergedContext;
    context!: React.ContextType<typeof MergedContext>;

    constructor(props: CrewTargetProps){
        super(props);        
        this.tiny.subscribe(this.propertyChanged);                
    }
    
    protected get playerBuffMode(): PlayerBuffMode {
        return this.tiny.getValue<PlayerBuffMode>('buffmode', 'player') ?? 'player';
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
        this.tiny.setValue<PlayerBuffMode>('buffmode', value, true);
    }

    protected get immortalMode(): PlayerImmortalMode {
        let value: PlayerImmortalMode;
        if (this.props.inputItem) {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode/' + this.props.inputItem.symbol, 'owned') ?? 'owned';
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode', 'owned') ?? 'owned';
        }
             
        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        if (value == this.immortalMode) return;
        if (this.props.inputItem) {
            this.tiny.setValue<PlayerImmortalMode>('immomode/' + this.props.inputItem.symbol, value, false);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode>('immomode', value, false);
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
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.inputItem.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, true);
        }        
    }

    protected propertyChanged = (key: string) => {
        if (key === 'cancelled') return;
        if (key === 'buffmode' || key.startsWith('immomode/') || key === 'immomode') {
            const { targetId } = this.state;
            if (this.current === targetId) {
                this.props.setDisplayItem(this.prepareDisplayItem(this.props.inputItem ?? undefined));
            }            
        }
    };

    // private tick(){
    //     this.tiny.setValue<number>('tick', this.tiny.getValue<number>('tick', 0) ?? 0 + 1);
    // }
    protected prepareDisplayItem(dataIn: PlayerCrew | CrewMember | undefined): PlayerCrew | CrewMember | undefined {
        const buffMode = this.playerBuffMode;
        const immortalMode = this.immortalMode;
        
        let [crewResult, immoResult] = CrewPreparer.prepareCrewMember(dataIn, buffMode, immortalMode, this.context);

        this.validImmortalModes = immoResult ?? ['full'];
        return crewResult;
    }
    
    componentDidUpdate(): void {
        if (this.props.inputItem) {
            const url = `${process.env.GATSBY_ASSETS_URL}${this.props.inputItem.imageUrlFullBody}`;
            if (isWindow)  window.setTimeout(() => {
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

export class CrewHoverStat extends HoverStat<CrewHoverStatProps, CrewHoverStatState> {
    static contextType = MergedContext;
    context!: React.ContextType<typeof MergedContext>;

    constructor(props: CrewHoverStatProps) {
        super(props);                
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        };        
    }    
    
    protected checkBorder = (crew?: PlayerCrew | CrewMember, setState?: boolean) => {
        crew ??= this.props.crew;
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
        return this.tiny.getValue<PlayerBuffMode>('buffmode', 'player') ?? 'player';
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
        this.tiny.setValue<PlayerBuffMode>('buffmode', value, true);
    }

    protected get immortalMode(): PlayerImmortalMode {
        let value: PlayerImmortalMode;
        if (this.props.crew) {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode/' + this.props.crew.symbol, 'owned') ?? 'owned';
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode', 'owned') ?? 'owned';
        }
             
        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        if (value == this.immortalMode) return;
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode>('immomode/' + this.props.crew.symbol, value, false);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode>('immomode', value, false);
        }
    }

    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.props.crew) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.crew.symbol, ['owned']) ?? ['owned'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['owned']) ?? ['owned'];
        }
         // console.log("immortal-mode")
         // console.log(value);
        return value;
    }

    protected set validImmortalModes(value: PlayerImmortalMode[]) {        
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.crew.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, true);
        }        
    }

    protected renderContent = (): JSX.Element => {
        if (this.checkBorder()) {
            if (isWindow) window.setTimeout(() => this.checkBorder(undefined, true));
        }
        const { targetGroup, crew: displayItem, openCrew, plugins, pluginData } = this.props;
        const { mobileWidth, touchToggled } = this.state;
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
                const { buffConfig, allCrew, playerData } = this.context;
                if (playerData && "player" in playerData) {
                    navToCrewPage(displayItem, playerData.player.character.crew, buffConfig, allCrew);
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
        return true; // return !!this.props.crew;
    }
}