import * as React from "react";
import { CrewMember } from "../../model/crew";
import { CompletionState, PlayerCrew } from "../../model/player";
import { Rating } from "semantic-ui-react";
import CrewStat from "../crewstat";
import { formatTierLabel, gradeToColor } from "../../utils/crewutils";
import { printImmoText } from "../../utils/crewutils";
import { ShipSkill } from "../shipskill";
import { TinyStore } from "../../utils/tiny";
import { PresenterProps } from "./ship_presenter";
import { StatLabel } from "../hovering/crewhoverstat";
import { Image } from "semantic-ui-react";

export interface CrewPresenterProps extends PresenterProps {
    crew: CrewMember | PlayerCrew;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
    onShipToggle?: (state: boolean) => void;
    onBuffToggle?: (state: boolean) => void;
    onImmoToggle?: (state: boolean) => void;
}

export interface CrewPresenterState {
}

export class CrewPresenter extends React.Component<CrewPresenterProps, CrewPresenterState> {
    tiny: TinyStore;
    constructor(props: CrewPresenterProps) {
        super(props);        
        this.state = {
            ... this.state
        }

        this.tiny = TinyStore.getStore(props.storeName);
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

    render(): JSX.Element {
        const { crew, openCrew } = this.props;
        const compact = this.props.hover;    

        if (!crew) {
            return <></>
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
            if (crew && "immortal" in crew && crew.immortal != 0 && crew.immortal > -2) {
                return;
            }
            me.showImmortalized = !me.showImmortalized;
            if (this.props.onImmoToggle) {
                this.props.onImmoToggle(me.showImmortalized);
            }
        }
        const buffToggle = (e) => {
            me.showPlayerBuffs = !me.showPlayerBuffs;
            if (this.props.onBuffToggle) {
                this.props.onBuffToggle(me.showPlayerBuffs);
            }
        }

        const shipToggle = (e) => {
            me.showShipAbility = !me.showShipAbility;
            if (this.props.onShipToggle) {
                this.props.onShipToggle(me.showShipAbility);
            }
        }
        
        const navClick = (e) => {
            if (!crew) return;

            if (openCrew) {
                openCrew(crew)
            }
            else {
                window.location.href = "/crew/" + crew.symbol;
            }
        }
        
        return crew ? (<div style={{ display: "flex", flexDirection: "row" }}>
                    <div style={{ 
                        zIndex: -1, 
                        position: "absolute", 
                        left: "0", 
                        top: "0", 
                        width: "100%", 
                        height: "100%", 
                        opacity: 0.025,
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "center", 
                        padding: "2.5em",
                        alignItems: "center"}}>
                    
                    {compact && crew.series && <Image src={`/media/series/${crew.series}.png`}  />}
                    </div>
                <div style={{ display: "flex", flexDirection: "column"}}>            
                    <div style={{display: "flex", flexDirection:"row", justifyContent:"flex-start"}}>
                        {window.innerWidth < 1024 && <>
                            <i className='close icon' style={{cursor: "pointer"}} onClick={(e) => this.props.close ? this.props.close() : undefined} />
                        </>}    
                    </div>        
                    <div style={{flexGrow: 1, display: "flex", alignItems: "center", flexDirection:"row"}}>                        
                        <a onClick={(e) => navClick(e)} style={{cursor: "pointer"}} title={"Go To Crew Page For '" + crew.name + "'"}>
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`}
                                style={{ height: compact ? (this.showShipAbility ? "15em" : "9.5em") : "25em", marginRight: "8px" }}
                            />
                        </a>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom:"8px"}}>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                            
                            {(!this.props.disableBuffs) &&
                            <i className="arrow alternate circle up icon" title="Toggle Buffs" style={this.showPlayerBuffs ? activeStyle : dormantStyle} onClick={(e) => buffToggle(e)} />
                            || 
                            <i className="arrow alternate circle up icon" title="Buffs not Available" style={disableStyle} />
                            }
                            <i className="fighter jet icon" title="Toggle Ship Stats" style={this.showShipAbility ? activeStyle : dormantStyle} onClick={(e) => shipToggle(e)} />

                            {("immortal" in crew && crew.immortal >= 1 && 
                            <i className="snowflake icon" 
                                title={printImmoText(crew.immortal)} 
                                style={frozenStyle} 
                                />)
                            ||
                            ("immortal" in crew && (crew.immortal === CompletionState.DisplayAsImmortalUnowned || crew.immortal === CompletionState.DisplayAsImmortalStatic) && 
                            <i className="lock icon" 
                                title={printImmoText(crew.immortal)} 
                                style={frozenStyle} 
                                />)
                            ||
                            <i className="star icon" 
                                title={("immortal" in crew && crew.immortal) ? printImmoText(crew.immortal) : (this.showImmortalized ? "Show Owned Rank" : "Show Immortalized")} 
                                style={("immortal" in crew && crew.immortal != 0 && crew.immortal > -2) ? completeStyle : this.showImmortalized ? activeStyle : dormantStyle} 
                                onClick={(e) => immoToggle(e)} />
                            }
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
                    <div style={{display: "flex", flexDirection: window.innerWidth < 725 ? "column" : "row", justifyContent: "space-between"}}>
                        <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>{crew.name}</h3>
                        <div style={{margin: "4px", marginLeft: 0, display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <h4 style={{margin:"2px 8px", marginLeft: 0, padding: "8px"}} className="ui segment" title={"immortal" in crew ? printImmoText(crew.immortal) : "Crew Is Shown Immortalized"}>
                                {
                                    "immortal" in crew && (
                                        ((crew.immortal === 0)) ? 
                                        (<b>{crew.level}</b>) : 
                                        ((crew.immortal > 0)) ? 
                                        (<i className="snowflake icon" style={frozenStyle} />) : 
                                        (<i className="check icon" style={checkedStyle} />) 
                                    ) || (<i className="check icon" style={checkedStyle} />)
                                }
                            </h4>
                            <Rating
                                onClick={(e) => immoToggle(e)}
                                title={("immortal" in crew && crew.immortal) ? printImmoText(crew.immortal) : (this.showImmortalized ? "Show Owned Rank" : "Show Immortalized")} 
                                icon='star' 
                                rating={!this.showImmortalized && "rarity" in crew ? crew.rarity : crew.max_rarity} 
                                maxRating={crew.max_rarity} 
                                size='large' 
                                disabled />
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
                        {this.showShipAbility && <ShipSkill fontSize="0.80em" actions={crew.action ? [ crew.action] : []} ship_battle={crew.ship_battle} />}
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