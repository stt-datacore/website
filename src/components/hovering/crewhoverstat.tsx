import * as React from "react";
import { CrewMember, Skill } from "../../model/crew";
import { CompletionState, PlayerCrew, PlayerData } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { applySkillBuff, getSkills, navToCrewPage, prepareOne, prepareProfileData } from "../../utils/crewutils";
import { BuffStatTable } from "../../utils/voyageutils";
import { CrewPresenter } from "../item_presenters/crew_presenter";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";
import { MergedContext } from "../../context/mergedcontext";

export type PlayerBuffMode = 'none' | 'player' | 'max';

export type PlayerImmortalMode = 'owned' | 'min' | 2 | 3 | 4 | 'full'

export const BuffNames = {
    'none': "None",
    'player': "Player",
    'max': "Max"
}

export const ImmortalNames = {
    "owned": "Owned",
    "min": "Unfused",
    "full": "Immortalized",
    2: "2x Fused", 
    3: "3x Fused", 
    4: "4x Fused", 
}

export function getAvailableBuffStates(playerData?: PlayerData, buffConfig?: BuffStatTable): PlayerBuffMode[] {
    if (!buffConfig && !playerData) return ['none'];
    else if (!playerData) return ['none', 'max'];
    else return ['none', 'player', 'max'];
}

export function getAvailableImmortalStates(crew: PlayerCrew | CrewMember): PlayerImmortalMode[] {
    let v: PlayerImmortalMode[];
    
    if (!("rarity" in crew) || !crew.have) {
        if (crew.max_rarity === 5) v = ['min', 2, 3, 4, 'full'];
        else if (crew.max_rarity === 4) v = ['min', 2, 3, 'full'];
        else if (crew.max_rarity === 3) v = ['min', 2, 'full'];
        else if (crew.max_rarity === 2) v = ['min', 'full'];
        else v = ['full'];
    }
    else if (crew.immortal > 0 || crew.immortal === -1) {
        return ['owned'];
    }
    else if (crew.immortal < -1) {
        return[ 'full'];
    }
    else if (crew.rarity === crew.max_rarity && crew.immortal === 0) {
        v = ['owned', 'full'];
    }
    else {
        v ??= [];
        v.push('owned');

        for (let f = crew.rarity + 1; f < crew.max_rarity; f++) {
            if (f === 2 || f === 3 || f === 4) {
                v.push(f);
            }
        }

        v.push('full');
    }

    return v;
}

export function nextBuffState(current: PlayerBuffMode, playerData?: PlayerData, buffConfig?: BuffStatTable, backward?: boolean): PlayerBuffMode {
    if (!buffConfig) return 'none';
    if (!playerData) return 'max';

    if (backward) {
        if (current === 'none') return 'max';
        else if (current === 'player') return 'none';
        if (current === 'max') return 'player';
    }
    else {
        if (current === 'none') return 'player';
        else if (current === 'player') return 'max';
        if (current === 'max') return 'none';
    }

    return current;
}

export function nextImmortalState(current: PlayerImmortalMode, crew: PlayerCrew | CrewMember, backward?: boolean): PlayerImmortalMode {
    
    let v = getAvailableImmortalStates(crew);
    let z = v.indexOf(current);
    
    if (z !== -1) {
        if (backward) z--;
        else z++;
        
        if (z < 0) z = v.length - 1;
        else if (z >= v.length) z = v.length - 1;

        return v[z];
    }

    return current;
}

export function applyImmortalState(state: PlayerImmortalMode, reference: CrewMember, playerData?: PlayerData, buffConfig?: BuffStatTable) {
    let pres: PlayerCrew[];
    if (state === 'owned') {
        pres = prepareOne(reference, playerData, buffConfig);
    }
    else if (state === 'full') {
        pres = prepareOne(reference, playerData, buffConfig, 6);
    }
    else if (state === 'min') {
        pres = prepareOne(reference, playerData, buffConfig, 1);
    }
    else {
        pres = prepareOne(reference, playerData, buffConfig, state);
    }
    
    return pres[0];
}

export interface CrewHoverStatProps extends HoverStatProps {
    crew: CrewMember | PlayerCrew | undefined;
    disableBuffs?: boolean;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
}

export interface CrewHoverStatState extends HoverStatState {
}

export interface CrewTargetProps extends HoverStatTargetProps<PlayerCrew | CrewMember | undefined> {
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

    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.props.inputItem) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.inputItem.symbol, ['full']) ?? ['full'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['full']) ?? ['full'];
        }
        console.log("immortal-mode")
        console.log(value);
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
            this.tiny.setValue<PlayerImmortalMode>('immomode/' + this.props.inputItem.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode>('immomode', value, true);
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
        const { buffConfig, maxBuffs } = this.context;

        const buffMode = this.playerBuffMode;
        const immortalMode = this.immortalMode;

        if (dataIn) {            
            let item: PlayerCrew = dataIn as PlayerCrew;
            this.validImmortalModes = getAvailableImmortalStates(item);
            
            if (immortalMode !== 'owned' || (buffMode !== 'none' && buffConfig)) {
                let cm: CrewMember | undefined = undefined;
                cm = this.context.allCrew.find(c => c.symbol === dataIn.symbol);
                if (cm) {
                    item = applyImmortalState(immortalMode, cm, this.context.playerData, buffConfig ?? maxBuffs);
                    if (buffMode === 'max' && maxBuffs) {
                        getSkills(item).forEach(skill => {
                           let sb = applySkillBuff(maxBuffs, skill, item.base_skills[skill]);
                           item.base_skills[skill] = {
                                core: sb.core,
                                range_min: sb.min,
                                range_max: sb.max
                           }
                        })
                    }
                    else if (buffMode === 'player' && buffConfig) {
                        getSkills(item).forEach(skill => {
                            let sb = applySkillBuff(buffConfig, skill, item.base_skills[skill]);
                            item.base_skills[skill] = {
                                 core: sb.core,
                                 range_min: sb.min,
                                 range_max: sb.max
                            }
                          })
                     }
                }
            }
            else {
                item = JSON.parse(JSON.stringify(item));
            }

            return item;
        }        

        return dataIn;
    }
    
    componentDidUpdate(): void {
        if (this.props.inputItem) {
            const url = `${process.env.GATSBY_ASSETS_URL}${this.props.inputItem.imageUrlFullBody}`;
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

    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.props.crew) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + this.props.crew.symbol, ['full']) ?? ['full'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['full']) ?? ['full'];
        }
        console.log("immortal-mode")
        console.log(value);
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

    protected get immortalMode(): PlayerImmortalMode {
        if (this.props.crew) {
            return this.tiny.getValue<PlayerImmortalMode>('immomode/' + this.props.crew.symbol, 'owned') ?? 'owned';
        }
        else {
            return this.tiny.getValue<PlayerImmortalMode>('immomode', 'owned') ?? 'owned';
        }        
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        if (value == this.immortalMode) return;
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode>('immomode/' + this.props.crew.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode>('immomode', value, true);
        }
    }

    protected renderContent = (): JSX.Element => {
        if (this.checkBorder()) {
            window.setTimeout(() => this.checkBorder(undefined, true));
        }
        const { targetGroup, crew: displayItem, openCrew } = this.props;
        const { mobileWidth, touchToggled } = this.state;
        const compact = true;    
        
        if (!displayItem) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            window.setTimeout(() => this.deactivate());
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