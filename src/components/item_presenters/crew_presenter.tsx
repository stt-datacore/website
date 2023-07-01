import * as React from "react";
import { CrewMember, SkillData } from "../../model/crew";
import { CompletionState, PlayerCrew } from "../../model/player";
import { Dropdown, Rating } from "semantic-ui-react";
import CrewStat from "../crewstat";
import { formatTierLabel, gradeToColor } from "../../utils/crewutils";
import { printImmoText } from "../../utils/crewutils";
import { ShipSkill } from "./shipskill";
import { TinyStore } from "../../utils/tiny";
import { PresenterProps } from "./ship_presenter";
import { StatLabelProps } from "../commoncrewdata";
import { Label } from "semantic-ui-react";

import { Image } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { PlayerBuffMode, PlayerImmortalMode, nextImmortalState, nextBuffState, getAvailableBuffStates, BuffNames, getAvailableImmortalStates, ImmortalNames } from "../hovering/crewhoverstat";
import { MergedContext } from "../../context/mergedcontext";


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

export class StatLabel extends React.Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size={window.innerWidth < DEFAULT_MOBILE_WIDTH ? "small" : "medium"} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: '0.5em', marginLeft: 0, width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "12.5em" : "12.75em" }}>
				{title}
				<Label.Detail>{value}</Label.Detail>
			</Label>
		);
	}
}

export interface HoverSelectorConfig<T> {
    key: T,
    value: T,
    text?: string,
    content?: JSX.Element
}

export interface BuffSelectorProps {
    buff: PlayerBuffMode;
    setBuff: (value: PlayerBuffMode) => void;
    style?: React.CSSProperties | undefined;    
    available: HoverSelectorConfig<PlayerBuffMode>[]
}

export interface ImmortalSelectorProps {
    immortalMode: PlayerImmortalMode;
    setImmortalMode: (value: PlayerImmortalMode) => void;
    style?: React.CSSProperties | undefined;
    available: HoverSelectorConfig<PlayerImmortalMode>[]
}

function drawBuff(data: PlayerBuffMode, buffClick?: (value: PlayerBuffMode) => void): JSX.Element {
    const buffclick = (e: React.MouseEvent<HTMLElement, MouseEvent>, buff: PlayerBuffMode) => {
        if (buffClick) {
            e.preventDefault();
            buffClick(buff);
        }
    }
    if (data === 'none') {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => buffclick(e, 'none')} className="arrow alternate circle down icon" title="No Boosts Applied" style={{...dormantStyle, fontSize: "0.8em", marginRight: "0.5em"}} />
                {BuffNames[data]}
            </div>)
    }
    else if (data === 'player') {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => buffclick(e, 'player')}  className="arrow alternate circle up icon" title="Player Boosts Applied" style={{...activeStyle, fontSize: "0.8em", marginRight: "0.5em"}} />
                {BuffNames[data]}
            </div>)
    }
    else if (data === 'max') {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => buffclick(e, 'max')}  className="arrow alternate circle up icon" title="Max Boosts Applied" style={{...activeStyle, fontSize: "1em", marginRight: "0.5em"}} />
                {BuffNames[data]}
            </div>)
    }
    return <></>;
}

function drawImmo(data: PlayerImmortalMode, immoClick?: (value: PlayerImmortalMode) => void): JSX.Element {
    const immoclick = (e: React.MouseEvent<HTMLElement, MouseEvent>, immo: PlayerImmortalMode) => {
        if (immoClick) {
            e.preventDefault();
            immoClick(immo);
        }
    }

    if (data === 'full') {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => immoclick(e, data)}  className="star icon" title="Player Boosts Applied" style={{...activeStyle, fontSize: "0.8em", marginRight: "0.5em"}} />
                {ImmortalNames[data]}
            </div>)
    }
    else if (data === 'frozen') {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => immoclick(e, data)}  className="snowflake icon" title="Player Boosts Applied" style={{...frozenStyle, fontSize: "0.8em", marginRight: "0.5em"}} />
                {ImmortalNames[data]}
            </div>)
    }
    else {
        return (
            <div style={{display: "inline-flex"}}>
                <i onClick={(e) => immoclick(e, data)} className="star icon" title="No Boosts Applied" style={{...dormantStyle, fontSize: "0.8em", marginRight: "0.5em"}} />
                {ImmortalNames[data]}
            </div>)
    }
}



export class BuffSelector extends React.Component<BuffSelectorProps> {
    render() {

        return <div style={this.props.style}>
            <Dropdown            
                    inline                    
                    trigger={drawBuff(this.props.buff)}
                    placeholder={'Display Buffs'} 
                    options={this.props.available}                
                    value={this.props.buff}
                    onChange={(e, { value }) => this.props.setBuff(value as PlayerBuffMode)}
                    closeOnChange
                >
                    
            </Dropdown>
        </div>
    }
}

export class ImmortalSelector extends React.Component<ImmortalSelectorProps> {
    render() {
        return <div style={this.props.style}>
        <Dropdown
                inline
				placeholder={'Crew Level'} 
                trigger={drawImmo(this.props.immortalMode)}
				options={this.props.available}
				value={this.props.immortalMode}
				onChange={(e, { value }) => this.props.setImmortalMode(value as PlayerImmortalMode)}
				closeOnChange
			/>
        </div>
    }
}

export interface CrewPresenterProps extends PresenterProps {
    crew: CrewMember | PlayerCrew;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
    onBuffToggle?: (state: PlayerBuffMode) => void;
    onImmoToggle?: (state: PlayerImmortalMode) => void;
}

export interface CrewPresenterState {
    mobileWidth: number;
}

export class CrewPresenter extends React.Component<CrewPresenterProps, CrewPresenterState> {
    static contextType = MergedContext;
    context!: React.ContextType<typeof MergedContext>;

    tiny: TinyStore;
    constructor(props: CrewPresenterProps) {
        super(props);        
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }

        this.tiny = TinyStore.getStore(props.storeName);
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
        console.log("immortal-mode")
        console.log(value);
        return value;
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
   
    render(): JSX.Element {
        const { crew, openCrew, touched } = this.props;
        
        const { mobileWidth } = this.state;
        const compact = this.props.hover;                

        if (!crew) {
            return <></>
        } 

        var me = this;
        const availmodes = me.validImmortalModes;

        if (availmodes?.includes(me.immortalMode) !== true) {
            me.immortalMode = availmodes[availmodes.length - 1];
        }
        
        const availstates = getAvailableBuffStates(this.context.playerData, this.context.buffConfig);

        if (availstates?.includes(me.playerBuffMode) !== true) {
            me.playerBuffMode = availstates[0];
        }

        const clickImmo = (e) => {
            me.immortalMode = e;
        }

        const clickBuff = (e) => {
            me.playerBuffMode = e;
        }

        const nextImmo = (e) => {
            if (crew && "immortal" in crew && crew.immortal != 0 && crew.immortal >= -1) {
                return;
            }
            me.immortalMode = nextImmortalState(me.immortalMode, crew);
            if (this.props.onImmoToggle) {
                this.props.onImmoToggle(me.immortalMode);
            }
        }

        const nextBuff = (e) => {
            me.playerBuffMode = nextBuffState(me.playerBuffMode, me.context.playerData, me.context.maxBuffs);
            if (this.props.onBuffToggle) {
                this.props.onBuffToggle(me.playerBuffMode);
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

        const availBuffs = availstates
                .map((data) => {

                    let buff = {
                        key: data,
                        value: data,
                        text: BuffNames[data]
                    } as HoverSelectorConfig<PlayerBuffMode>;

                    buff.content = drawBuff(data, clickBuff);
                    return buff;
                });

        const availImmos = me.validImmortalModes          
            .map((data) => {

                let immo = {
                    key: data,
                    value: data,
                    text: ImmortalNames[data]
                } as HoverSelectorConfig<PlayerImmortalMode>;

                immo.content = drawImmo(data, clickImmo);
                return immo;
            });

        let immo = me.immortalMode;
        let sd = crew as SkillData;

        if (typeof immo === 'number') {
            let i = immo - 1;
            sd = crew.skill_data[i];
        }

        const skillData = sd;

        const getStars = () => {
            if (me.immortalMode === 'min') return 1;
            else if (me.immortalMode === 'full' || !("immortal" in crew)) return crew?.max_rarity;
            else return skillData.rarity;
        }

        return crew ? (<div style={{ 
                            fontSize: window.innerWidth < mobileWidth ? "10pt" : "11pt", 
                            display: "flex", 
                            flexDirection: "row" // window.innerWidth < mobileWidth ? "column" : "row" 
                            }}>
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
                        {touched && <>
                            <i className='close icon' style={{cursor: "pointer"}} onClick={(e) => this.props.close ? this.props.close() : undefined} />
                        </>}    
                    </div>        
                    <div style={{flexGrow: 1, display: "flex", alignItems: "center", flexDirection:"row"}}>                        
                        <img
                            src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`}
                            style={{ height: compact ? (window.innerWidth < mobileWidth ? "15em" : "19em") : "25em", marginRight: "8px" }}
                        />
                    </div>
                    {crew.in_portal &&  window.innerWidth >= mobileWidth &&
                                    (<div style={{alignSelf: "center"}}><img style={{
                                        maxHeight: "1.5em",
                                        margin: "0.5em"
                                        }} 
                                        title={"Available in the Premium Portal"}
                                        src={"/media/portal.png"} 
                                        /></div>
                                    )
                                }
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "8em",
                        justifyContent: "space-between",
                        width: window.innerWidth < mobileWidth ? "15m" : "32em",
                    }}
                >
                    <div style={{display: "flex", flexDirection: window.innerWidth < mobileWidth ? "column" : "row", justifyContent: "space-between"}}>
                        <div style={{display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                            <h3 style={{
                                    margin:"2px 8px", 
                                    padding: "8px", 
                                    marginLeft: "0px", 
                                    paddingLeft: "0px"
                                    }}>
                                <a onClick={(e) => navClick(e)} style={{cursor: "pointer"}} title={"Go To Crew Page For '" + crew.name + "'"}>
                                    {crew.name}
                                </a>
                            </h3>
                            <div style={{margin: "4px", marginLeft: 0, display: "flex", flexDirection: "row", alignItems: "center"}}>                                
                                <Rating
                                    onClick={(e) => nextImmo(e)}
                                    icon='star' 
                                    rating={getStars()} 
                                    maxRating={crew.max_rarity} 
                                    size='large' 
                                    disabled />
                                    {crew.in_portal &&  window.innerWidth < mobileWidth &&
                                    (<div><img style={{
                                        maxHeight: "1.25em",
                                        margin: "0.5em",
                                        }} 
                                        title={"Available in the Premium Portal"}
                                        src={"/media/portal.png"} 
                                        /></div>
                                    )
                                }
                                <h4 style={{margin:"2px 8px", padding: "8px"}} className="ui segment" title={"immortal" in crew ? printImmoText(crew.immortal) : "Crew Is Shown Immortalized"}>
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
                               
                            </div>
                        </div>
                        <div style={{
                            display: "flex", 
                            flexDirection: "column", 
                            justifyContent: "space-evenly",
                            fontSize: "0.9em",
                            fontStyle: "italic"

                            }}>
                            <div style={{display:"flex", flexDirection: "row", justifyContent: "flex-end"}}>
                                <BuffSelector available={availBuffs} buff={me.playerBuffMode} setBuff={(e) => clickBuff(e)} />
                            </div>
                            <div style={{display:"flex", flexDirection: "row", justifyContent: "flex-end"}}>
                                <ImmortalSelector available={availImmos} immortalMode={me.immortalMode} setImmortalMode={(e) => clickImmo(e)} />
                            </div>
                        </div>                        
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            flexDirection:
                            window.innerWidth < mobileWidth ? "column" : "row",
                            justifyContent: "flex-start",
                            marginTop: "4px",
                            marginBottom: "2px",
                        }}
                    >
                        {skillData.base_skills.security_skill && <CrewStat
                            skill_name="security_skill"
                            data={skillData.base_skills.security_skill}
                            scale={compact ? 0.75 : 1}
                        />}
                        
                        {skillData.base_skills.command_skill && <CrewStat
                            skill_name="command_skill"
                            data={skillData.base_skills.command_skill}
                            scale={compact ? 0.75 : 1}
                        />}
                        
                        {skillData.base_skills.diplomacy_skill && <CrewStat
                            skill_name="diplomacy_skill"
                            data={skillData.base_skills.diplomacy_skill}
                            scale={compact ? 0.75 : 1}
                        />}

                        {skillData.base_skills.science_skill && <CrewStat
                            skill_name="science_skill"
                            data={skillData.base_skills.science_skill}
                            scale={compact ? 0.75 : 1}
                        />}

                        {skillData.base_skills.medicine_skill && <CrewStat
                            skill_name="medicine_skill"
                            data={skillData.base_skills.medicine_skill}
                            scale={compact ? 0.75 : 1}
                        />}

                        {skillData.base_skills.engineering_skill && <CrewStat
                            skill_name="engineering_skill"
                            data={skillData.base_skills.engineering_skill}
                            scale={compact ? 0.75 : 1}
                        />}
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
                        <ShipSkill isShip={false} fontSize="0.8em" actions={crew.action ? [crew.action] : []} shipInfo={crew.ship_battle} />
                    </div>
                    <div>
                        <div
                            style={{
                                textAlign: "center",
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection: window.innerWidth < mobileWidth ? "column" : "row",
                                justifyContent: window.innerWidth < mobileWidth ? "left" : "space-between",
                            }}
                        >
                            <StatLabel
                                title="Big Book Tier"
                                value={<div
                                    style={{
                                        fontWeight: "bold",
                                        color: gradeToColor(
                                            crew.bigbook_tier
                                        ) ?? undefined,
                                    }}
                                >
                                    {formatTierLabel(crew)}
                                </div>}
                            />
                           
                           <StatLabel
                                title="Voyage Rank"
                                value={"" + crew.ranks.voyRank}
                            />

                            <StatLabel
                                title="CAB Rating"
                                value={crew.cab_ov ?? 'None'}
                            />
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                textAlign: "center",
                                display: "flex",
                                flexWrap: "wrap",
                                flexDirection: window.innerWidth < mobileWidth ? "column" : "row",
                                justifyContent: window.innerWidth < mobileWidth ? "left" : "space-between",
                            }}
                        >
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
                                        {crew.cab_ov_grade ?? 'None'}
                                    </div>
                                }
                            />
                            <StatLabel
                                title="Gauntlet Rank"
                                value={"" + crew.ranks.gauntletRank}
                            />                            
    
                            <StatLabel
                                title="CAB Rank"
                                value={crew.cab_ov_rank ?? 'None'}
                            />

                        </div>
                    </div>
                   
                </div>
            </div>) : <></>
        
    }
    
}