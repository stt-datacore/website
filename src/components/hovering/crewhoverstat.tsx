import * as React from "react";
import { CrewMember, Skill } from "../../model/crew";
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
import { CrewPresenter } from "../item_presenters/crew_presenter";

export class StatLabel extends React.Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size="small" style={{ marginBottom: '0.5em', width: "12em" }}>
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
        const { crew, openCrew } = this.props;
        const compact = true;    

        if (!crew) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        } 

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
                window.location.href = "/crew/" + crew.symbol;
            }
        }

        return crew ? (<CrewPresenter openCrew={(crew) => navClick()} crew={crew} storeName={this.props.targetGroup} hover={true} onShipToggle={() => shipToggle()} />) : <></>
        
    }
    
}