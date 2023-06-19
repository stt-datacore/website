import * as React from "react";
import { CrewMember, Skill } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH, HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { StatLabelProps } from "../commoncrewdata";
import { Label } from "semantic-ui-react";
import { applySkillBuff } from "../../utils/crewutils";
import { BuffStatTable } from "../../utils/voyageutils";
import { CrewPresenter } from "../item_presenters/crew_presenter";
import CONFIG from "../CONFIG";
import { navigate } from "gatsby";

export class StatLabel extends React.Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size={window.innerWidth < DEFAULT_MOBILE_WIDTH ? "small" : "medium"} style={{ marginBottom: '0.5em', marginLeft: 0, width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "12.5em" : "14em" }}>
				{title}
				<Label.Detail>{value}</Label.Detail>
			</Label>
		);
	}
}

export interface CrewHoverStatProps extends HoverStatProps {
    crew: CrewMember | PlayerCrew | undefined;
    disableBuffs?: boolean;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
}

export interface CrewHoverStatState extends HoverStatState {
}

export interface CrewTargetProps extends HoverStatTargetProps<PlayerCrew | CrewMember | undefined> {
    allCrew: (CrewMember | PlayerCrew)[]
    buffConfig?: BuffStatTable;
}

export interface CrewTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class CrewTarget extends HoverStatTarget<PlayerCrew | CrewMember | undefined, CrewTargetProps, CrewTargetState> {
    
    constructor(props: CrewTargetProps){
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
    protected prepareDisplayItem(dataIn: PlayerCrew | CrewMember | undefined): PlayerCrew | CrewMember | undefined {
        const { buffConfig } = this.props;

        const applyBuffs = this.showPlayerBuffs;
        const showImmortal = this.showImmortalized;

        if (dataIn) {            
            let item: PlayerCrew = dataIn as PlayerCrew;

            if (showImmortal === true || (applyBuffs === true && buffConfig)) {
                let cm: CrewMember | undefined = undefined;
                if (showImmortal === true && !item.immortal) {
                    cm = this.props.allCrew.find(c => c.symbol === dataIn.symbol);
                }
    
                if (cm && showImmortal === true) {
                    item = JSON.parse(JSON.stringify(cm)) as PlayerCrew;
                    if (item.immortal === 0) item.immortal = -2;
                }
                else {
                    item = JSON.parse(JSON.stringify(dataIn)) as PlayerCrew;
                }
    
                if (buffConfig && applyBuffs === true) {
                    for (let key of Object.keys(item.base_skills)) {
                        let sb = applySkillBuff(buffConfig, key, item.base_skills[key]);
                        item.base_skills[key] = {
                            core: sb.core,
                            range_max: sb.max,
                            range_min: sb.min
                        } as Skill;
                    }
                }
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
    constructor(props: CrewHoverStatProps) {
        super(props);                
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        };
        window.setTimeout(() => {
            let imgs = Object.values(CONFIG.CREW_SHIP_BATTLE_BONUS_ICON);
            imgs = [... imgs, ... Object.values(CONFIG.CREW_SHIP_BATTLE_BONUS_ICON)];
            imgs = [... imgs, ... Object.values(CONFIG.SHIP_BATTLE_TRIGGER_ICON)];

            for (let img of imgs) {
                let loader = new Image();
                loader.src = "/media/ship/" + img;
            }
        });
    }    

    protected checkBorder = () => {
        const { crew } = this.props;
        const { boxStyle } = this.state;

        if (crew) {
            let mr = crew.max_rarity;
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
        const { targetGroup, crew, openCrew } = this.props;
        const { mobileWidth } = this.state;
        const compact = true;    

        // if (!crew) {
        //     // console.log("Deactivating empty popover");
        //     try {
        //         this.cancelled = false;
        //         this.deactivate();
        //     }
        //     catch {

        //     }
        // } 

        var me = this;
        const shipToggle = () => {
            let ct = me.currentTarget;
            window.setTimeout(() => {
                me.deactivate(ct);
                window.setTimeout(() => {
                    if (ct) me.activate(ct);
                }, 0);
            }, 0);            
        }
        
        const navClick = () => {
            if (!crew) return;

            if (openCrew) {
                openCrew(crew)
            }
            else {
                navigate("/crew/" + crew.symbol);                
            }
        }

        const closeClick = () => {
            this.deactivate();
        }   
        
        return crew ? (<CrewPresenter 
                        close={() => closeClick()} 
                        openCrew={(crew) => navClick()} 
                        crew={crew} 
                        storeName={targetGroup} 
                        hover={true} 
                        mobileWidth={mobileWidth}
                        onShipToggle={() => shipToggle()} 
                        />) : <></>
        
    }

    protected get canActivate(): boolean {
        return !!this.props.crew;
    }
}