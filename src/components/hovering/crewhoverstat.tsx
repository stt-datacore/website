import React from "react";
import { CrewMember, Skill } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
import { StatLabelProps } from "../commoncrewdata";
import { Label, Rating } from "semantic-ui-react";
import CrewStat from "../crewstat";
import { applySkillBuff, formatTierLabel, gradeToColor } from "../../utils/crewutils";
import { BuffStatTable } from "../../utils/voyageutils";
import * as uuid from 'uuid';
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
}

export interface CrewHoverStatState extends HoverStatState {
}

export interface CrewTargetProps extends HoverStatTargetProps<PlayerCrew | CrewMember | undefined> {
    allCrew: CrewMember[] | PlayerCrew[]
    buffConfig: BuffStatTable;
}

export interface CrewTargetState extends HoverStatTargetState {
    applyBuffs?: boolean;
    showImmortal?: boolean;
}

export class CrewTarget extends HoverStatTarget<PlayerCrew | CrewMember | undefined, CrewTargetProps, CrewTargetState> {
    
    constructor(props: CrewTargetProps){
        super(props);        
        this.tiny.subscribe(this.propertyChanged);        
        if (props.inputItem) {
            const url = `${process.env.GATSBY_ASSETS_URL}${props.inputItem.imageUrlFullBody}`;
            for (let i = 0; i < 1; i++) {
                let img = new Image();
                img.src = url;                    
            }
        }
    }
    
    protected get showBuffs(): boolean {
        return this.tiny.getValue<boolean>('buff', true) ?? false;
    }

    protected set showBuffs(value: boolean) {
        this.tiny.setValue<boolean>('buff', value, true);
    }

    protected get showImmo(): boolean {
        return this.tiny.getValue<boolean>('immo', true) ?? false;
    }

    protected set showImmo(value: boolean) {
        this.tiny.setValue<boolean>('immo', value, true);
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

        const applyBuffs = this.showBuffs;
        const showImmortal = this.showImmo;

        if (dataIn) {            
            let item: PlayerCrew = dataIn as PlayerCrew;

            if (showImmortal === true || (applyBuffs === true && buffConfig)) {
                let cm: CrewMember | undefined = undefined;
    
                if (showImmortal === true) {
                    cm = this.props.allCrew.find(c => c.symbol === dataIn.symbol);
                }
    
                if (cm && showImmortal === true) {
                    item = JSON.parse(JSON.stringify(cm)) as PlayerCrew;
                    item.immortal = -2;
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

    protected get showBuffs(): boolean {
        return this.tiny.getValue<boolean>('buff', true) ?? false;
    }

    protected set showBuffs(value: boolean) {
        this.tiny.setValue<boolean>('buff', value, true);
    }

    protected get showImmo(): boolean {
        return this.tiny.getValue<boolean>('immo', true) ?? false;
    }

    protected set showImmo(value: boolean) {
        this.tiny.setValue<boolean>('immo', value, true);
    }

    protected renderContent = (): JSX.Element =>  {
        const { crew } = this.props;
        const compact = true;    

        if (!crew) {
            // console.log("Deactivating empty popover");
            this.cancelled = false;
            this.deactivate();
        } 

        const dormantStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'gray',
            cursor: "pointer"
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

        const checkedStyle: React.CSSProperties = {
            color: "lightgreen",
            marginRight: "0px"
        }

        var me = this;
        const immoToggle = (e) => {
            if (crew && "immortal" in crew && crew.immortal != 0 && crew.immortal > -2) {
                return;
            }
            me.showImmo = !me.showImmo;
        }
        const buffToggle = (e) => {
            me.showBuffs = !me.showBuffs;
        }

        return crew ? (<div style={{ display: "flex", flexDirection: "row" }}>
                <div style={{ display: "flex", flexDirection: "column"}}>                    
                    <img
                        src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`}
                        style={{ height: "9.5em", marginRight: "8px" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: "1"}}>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                            <i className="arrow alternate circle up icon" title="Apply Buffs" style={this.showBuffs ? activeStyle : dormantStyle} onClick={(e) => buffToggle(e)} />
                            <i className="star icon" 
                                title={("immortal" in crew && crew.immortal > -2 && crew.immortal != 0) ? "Crew Is Immortalized" : "Show Immortalized"} 
                                style={("immortal" in crew && crew.immortal != 0 && crew.immortal > -2) ? completeStyle : this.showImmo ? activeStyle : dormantStyle} 
                                onClick={(e) => immoToggle(e)} />
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
                        <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>{crew.name}</h3>
                        <div style={{margin: "4px", display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <h4 style={{margin:"2px 8px", padding: "8px"}} className="ui segment">
                                {(("immortal" in crew && crew.immortal === 0) ) ? (<b>{crew.level}</b>) : (<i title={"immortal" in crew && crew.immortal <= -2 ? "Crew Is Shown Immortalized" : "Crew Is Immortalized"} className="check icon" style={checkedStyle} />)}
                            </h4>
                            <Rating icon='star' rating={!this.showImmo && "rarity" in crew ? crew.rarity : crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            flexDirection:
                                window.innerWidth <= 512 ? "column" : "row",
                            justifyContent: "flex-start",
                            marginTop: "4px",
                            marginBottom: "2px",
                        }}
                    >
                        <CrewStat
                            skill_name="security_skill"
                            data={crew.base_skills.security_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                        <CrewStat
                            skill_name="command_skill"
                            data={crew.base_skills.command_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                        <CrewStat
                            skill_name="diplomacy_skill"
                            data={crew.base_skills.diplomacy_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                        <CrewStat
                            skill_name="science_skill"
                            data={crew.base_skills.science_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                        <CrewStat
                            skill_name="medicine_skill"
                            data={crew.base_skills.medicine_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                        <CrewStat
                            skill_name="engineering_skill"
                            data={crew.base_skills.engineering_skill}
                            scale={compact ? 0.75 : 1}
                        />
                        <div style={{ width: "4px" }} />
                    </div>
                    <div
                        style={{
                            textAlign: "left",
                            fontStyle: "italic",
                            fontSize: "0.85em",
                            marginTop: "2px",
                            marginBottom: "4px",
                        }}
                    >
                        {crew.traits_named.join(", ")}
                    </div>
                    <div>
                        <div
                            style={{
                                textAlign: "center",
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection: "row",
                                justifyContent: "space-between",
                            }}
                        >
                            <StatLabel
                                title="CAB Rating"
                                value={crew.cab_ov as string}
                            />
                            <StatLabel
                                title="CAB Grade"
                                value={
                                    <div
                                        style={{
                                            fontWeight: "bold",
                                            color: gradeToColor(
                                                crew.cab_ov_grade as string
                                            ) ?? undefined,
                                        }}
                                    >
                                        {crew.cab_ov_grade}
                                    </div>
                                }
                            />
                            <StatLabel
                                title="CAB Rank"
                                value={"" + crew.cab_ov_rank}
                            />
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                textAlign: "center",
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection: "row",
                                justifyContent: "space-between",
                            }}
                        >
                            <StatLabel
                                title="Voyage Rank"
                                value={"" + crew.ranks.voyRank}
                            />
                            <StatLabel
                                title="Gauntlet Rank"
                                value={"" + crew.ranks.gauntletRank}
                            />
                            <StatLabel
                                title="Big Book Tier"
                                value={formatTierLabel(crew)}
                            />
                        </div>
                    </div>
                </div>
            </div>) : <></>
        
    }
    
}