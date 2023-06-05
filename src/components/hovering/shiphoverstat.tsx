// import React from "react";
// import { CrewMember, Skill } from "../../model/ship";
// import { CompletionState, Player, PlayerCrew } from "../../model/player";
// import { HoverStat, HoverStatProps, HoverStatState, HoverStatTarget, HoverStatTargetProps, HoverStatTargetState } from "./hoverstat";
// import { StatLabelProps } from "../commoncrewdata";
// import { Label, Rating, Segment } from "semantic-ui-react";
// import CrewStat from "../crewstat";
// import { applySkillBuff, formatTierLabel, getShipBonus, getShipChargePhases, gradeToColor } from "../../utils/crewutils";
// import { BuffStatTable } from "../../utils/voyageutils";
// import * as uuid from 'uuid';
// import CONFIG from "../CONFIG";
// import { printImmoText } from "../../utils/crewutils";
// import { ShipSkill, ShipSkillProps } from "../shipskill";
// import { Ship } from "../../model/ship";

// export interface ShipHoverStatProps extends HoverStatProps {
//     ship: Ship | undefined;
//     disableBuffs?: boolean;
// }

// export interface ShipHoverStatState extends HoverStatState {
// }

// export interface ShipTargetProps extends HoverStatTargetProps<Ship | undefined> {
//     allShips: Ship[]
//     buffConfig?: BuffStatTable;
// }

// export interface ShipTargetState extends HoverStatTargetState {
//     applyBuffs?: boolean;
//     showImmortal?: boolean;
// }

// export class ShipTarget extends HoverStatTarget<Ship | undefined, ShipTargetProps, ShipTargetState> {
    
//     constructor(props: ShipTargetProps){
//         super(props);        
//         this.tiny.subscribe(this.propertyChanged);                
//     }
    
//     protected get showPlayerBuffs(): boolean {
//         return this.tiny.getValue<boolean>('buff', true) ?? false;
//     }

//     protected set showPlayerBuffs(value: boolean) {
//         this.tiny.setValue<boolean>('buff', value, true);
//     }

//     protected get showImmortalized(): boolean {
//         return this.tiny.getValue<boolean>('immo', true) ?? false;
//     }

//     protected set showImmortalized(value: boolean) {
//         this.tiny.setValue<boolean>('immo', value, true);
//     }

//     protected get showShipAbility(): boolean {
//         return this.tiny.getValue<boolean>('ship', true) ?? false;
//     }

//     protected set showShipAbility(value: boolean) {
//         this.tiny.setValue<boolean>('ship', value, true);
//     }

//     protected propertyChanged = (key: string) => {
//         if (key === 'cancelled') return;
//         if (key === 'buff' || key === 'immo') {
//             const { targetId } = this.state;
//             if (this.current === targetId) {
//                 this.props.setDisplayItem(this.prepareDisplayItem(this.props.inputItem ?? undefined));
//             }            
//         }
//     };

//     // private tick(){
//     //     this.tiny.setValue<number>('tick', this.tiny.getValue<number>('tick', 0) ?? 0 + 1);
//     // }
//     protected prepareDisplayItem(dataIn: Ship | undefined): Ship | undefined {
//         const { buffConfig } = this.props;

//         const applyBuffs = this.showPlayerBuffs;
//         const showImmortal = this.showImmortalized;

//         if (dataIn) {            
//             let item: Ship = dataIn as Ship;

//             if (showImmortal === true || (applyBuffs === true && buffConfig)) {
//                 let cm: CrewMember | undefined = undefined;
//                 if (showImmortal === true && item?.level !== item?.max_level) {
//                     cm = this.props.allShips.find(c => c.symbol === dataIn.symbol);
//                 }
    
//                 if (cm && showImmortal === true) {
//                     item = JSON.parse(JSON.stringify(cm)) as Ship;                    
//                 }
//                 else {
//                     item = JSON.parse(JSON.stringify(dataIn)) as Ship;
//                 }
    
//                 if (buffConfig && applyBuffs === true) {
//                     for (let key of Object.keys(item.base_skills)) {
//                         let sb = applySkillBuff(buffConfig, key, item.base_skills[key]);
//                         item.base_skills[key] = {
//                             core: sb.core,
//                             range_max: sb.max,
//                             range_min: sb.min
//                         } as Skill;
//                     }
//                 }
//             }
//             return item;
         
//         }        
//         return dataIn;
//     }
    
//     componentDidUpdate(): void {
//         if (this.props.inputItem) {
//             const url = `${process.env.GATSBY_ASSETS_URL}${this.props.inputItem.imageUrlFullBody}`;
//             window.setTimeout(() => {
//                 for (let i = 0; i < 1; i++) {
//                     let img = new Image();
//                     img.src = url;                    
//                 }
//             });
//         }
//     }

//     componentWillUnmount(): void {
//         this.tiny.unsubscribe(this.propertyChanged);
//     }
// }

// export class ShipHoverStat extends HoverStat<ShipHoverStatProps, ShipHoverStatState> {
//     constructor(props: ShipHoverStatProps) {
//         super(props);        
//         this.state = {
//             ... this.state
//         }
//     }    

//     protected get showPlayerBuffs(): boolean {
//         return this.tiny.getValue<boolean>('buff', true) ?? false;
//     }

//     protected set showPlayerBuffs(value: boolean) {
//         this.tiny.setValue<boolean>('buff', value, true);
//     }

//     protected get showImmortalized(): boolean {
//         return this.tiny.getValue<boolean>('immo', true) ?? false;
//     }

//     protected set showImmortalized(value: boolean) {
//         this.tiny.setValue<boolean>('immo', value, true);
//     }
    
//     protected get showShipAbility(): boolean {
//         return this.tiny.getValue<boolean>('ship', true) ?? false;
//     }

//     protected set showShipAbility(value: boolean) {
//         this.tiny.setValue<boolean>('ship', value, true);
//     }

//     protected renderContent = (): JSX.Element =>  {
//         const { ship: ship } = this.props;
//         const compact = true;    

//         if (!ship) {
//             // console.log("Deactivating empty popover");
//             this.cancelled = false;
//             this.deactivate();
//         } 

//         const dormantStyle: React.CSSProperties = {
//             background: 'transparent',
//             color: 'gray',
//             cursor: "pointer"
//         }

//         const disableStyle: React.CSSProperties = {
//             background: 'transparent',
//             color: 'gray'
//         }

//         const activeStyle: React.CSSProperties = {
//             background: 'transparent',
//             color: '#FFE623',
//             cursor: "pointer"
//         }

//         const completeStyle: React.CSSProperties = {
//             background: 'transparent',
//             color: 'lightgreen',            
//             cursor: "default"
//         }

//         const frozenStyle: React.CSSProperties = {
//             background: 'transparent',
//             color: 'white',            
//             cursor: "default",
//             marginRight: "0px"
//         }

//         const checkedStyle: React.CSSProperties = {
//             color: "lightgreen",
//             marginRight: "0px"
//         }

//         var me = this;
//         const immoToggle = (e) => {
//             if (ship && "immortal" in ship && ship.immortal != 0 && ship.immortal > -2) {
//                 return;
//             }
//             me.showImmortalized = !me.showImmortalized;
//         }
//         const buffToggle = (e) => {
//             me.showPlayerBuffs = !me.showPlayerBuffs;
//         }
//         const shipToggle = (e) => {
//             me.showShipAbility = !me.showShipAbility;
//             let ct = me.currentTarget;
//             window.setTimeout(() => {
//                 me.deactivate(ct);
//                 window.setTimeout(() => {
//                     if (ct) me.activate(ct);
//                 }, 0);
//             }, 0);            
//         }
        
//         const navClick = (e) => {
//             if (!ship) return;

//             if (openCrew) {
//                 openCrew(ship)
//             }
//             else {
//                 window.location.href = "/ship/" + ship.symbol;
//             }
//         }

        
//         return ship ? (<div style={{ display: "flex", flexDirection: "row" }}>
//                 <div style={{ display: "flex", flexDirection: "column"}}>                    
//                     <div style={{flexGrow: 1, display: "flex", alignItems: "center", flexDirection:"row"}}>
//                         <a onClick={(e) => navClick(e)} style={{cursor: "pointer"}} title={"Go To Crew Page For '" + ship.name + "'"}>
//                             <img
//                                 src={`${process.env.GATSBY_ASSETS_URL}${ship.imageUrlFullBody}`}
//                                 style={{ height: this.showShipAbility ? "15em" : "9.5em", marginRight: "8px" }}
//                             />
//                         </a>
//                     </div>
//                     <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom:"8px"}}>
//                         <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                            
//                             {(!this.props.disableBuffs) &&
//                             <i className="arrow alternate circle up icon" title="Toggle Buffs" style={this.showPlayerBuffs ? activeStyle : dormantStyle} onClick={(e) => buffToggle(e)} />
//                             || 
//                             <i className="arrow alternate circle up icon" title="Buffs not Available" style={disableStyle} />
//                             }
//                             <i className="fighter jet icon" title="Toggle Ship Stats" style={this.showShipAbility ? activeStyle : dormantStyle} onClick={(e) => shipToggle(e)} />

//                             {("immortal" in ship && ship.immortal >= 1 && 
//                             <i className="snowflake icon" 
//                                 title={printImmoText(ship.immortal)} 
//                                 style={frozenStyle} 
//                                 />)
//                             ||
//                             ("immortal" in ship && (ship.immortal === CompletionState.DisplayAsImmortalUnowned || ship.immortal === CompletionState.DisplayAsImmortalStatic) && 
//                             <i className="lock icon" 
//                                 title={printImmoText(ship.immortal)} 
//                                 style={frozenStyle} 
//                                 />)
//                             ||
//                             <i className="star icon" 
//                                 title={("immortal" in ship && ship.immortal) ? printImmoText(ship.immortal) : (this.showImmortalized ? "Show Owned Rank" : "Show Immortalized")} 
//                                 style={("immortal" in ship && ship.immortal != 0 && ship.immortal > -2) ? completeStyle : this.showImmortalized ? activeStyle : dormantStyle} 
//                                 onClick={(e) => immoToggle(e)} />
//                             }
//                         </div>
//                     </div>
//                 </div>
//                 <div
//                     style={{
//                         display: "flex",
//                         flexDirection: "column",
//                         minHeight: "8em",
//                         justifyContent: "space-between",
//                         width: window.innerWidth <= 768 ? "15m" : "32em",
//                     }}
//                 >
//                     <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
//                         <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>{ship.name}</h3>
//                         <div style={{margin: "4px", display: "flex", flexDirection: "row", alignItems: "center"}}>
//                             <h4 style={{margin:"2px 8px", padding: "8px"}} className="ui segment" title={"immortal" in ship ? printImmoText(ship.immortal) : "Crew Is Shown Immortalized"}>
//                                 {
//                                     "immortal" in ship && (
//                                         ((ship.immortal === 0)) ? 
//                                         (<b>{ship.level}</b>) : 
//                                         ((ship.immortal > 0)) ? 
//                                         (<i className="snowflake icon" style={frozenStyle} />) : 
//                                         (<i className="check icon" style={checkedStyle} />) 
//                                     ) || (<i className="check icon" style={checkedStyle} />)
//                                 }
//                             </h4>
//                             <Rating
//                                 onClick={(e) => immoToggle(e)}
//                                 title={("immortal" in ship && ship.immortal) ? printImmoText(ship.immortal) : (this.showImmortalized ? "Show Owned Rank" : "Show Immortalized")} 
//                                 icon='star' 
//                                 rating={!this.showImmortalized && "rarity" in ship ? ship.rarity : ship.max_rarity} 
//                                 maxRating={ship.max_rarity} 
//                                 size='large' 
//                                 disabled />
//                         </div>
//                     </div>
//                     <div
//                         style={{
//                             display: "flex",
//                             flexWrap: "wrap",
//                             flexDirection:
//                             window.innerWidth <= 512 ? "column" : "row",
//                             justifyContent: "flex-start",
//                             marginTop: "4px",
//                             marginBottom: "2px",
//                         }}
//                     >
//                         <CrewStat
//                             skill_name="security_skill"
//                             data={ship.base_skills.security_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                         <CrewStat
//                             skill_name="command_skill"
//                             data={ship.base_skills.command_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                         <CrewStat
//                             skill_name="diplomacy_skill"
//                             data={ship.base_skills.diplomacy_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                         <CrewStat
//                             skill_name="science_skill"
//                             data={ship.base_skills.science_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                         <CrewStat
//                             skill_name="medicine_skill"
//                             data={ship.base_skills.medicine_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                         <CrewStat
//                             skill_name="engineering_skill"
//                             data={ship.base_skills.engineering_skill}
//                             scale={compact ? 0.75 : 1}
//                         />
//                         <div style={{ width: "4px" }} />
//                     </div>
//                     <div
//                         style={{
//                             textAlign: "left",
//                             fontStyle: "italic",
//                             fontSize: "0.85em",
//                             marginTop: "2px",
//                             marginBottom: "4px",
//                         }}
//                     >
//                         {ship.traits_named.join(", ")}
//                     </div>
//                     <div>
//                         {this.showShipAbility && <ShipSkill ship={ship} />}
//                     </div>
//                     <div>
//                         <div
//                             style={{
//                                 textAlign: "center",
//                                 display: "flex",
//                                 flexWrap: "wrap",
//                                 flexDirection: "row",
//                                 justifyContent: "space-between",
//                             }}
//                         >
//                             <StatLabel
//                                 title="CAB Rating"
//                                 value={ship.cab_ov as string}
//                             />
//                             <StatLabel
//                                 title="CAB Grade"
//                                 value={
//                                     <div
//                                         style={{
//                                             fontWeight: "bold",
//                                             color: gradeToColor(
//                                                 ship.cab_ov_grade as string
//                                             ) ?? undefined,
//                                         }}
//                                     >
//                                         {ship.cab_ov_grade}
//                                     </div>
//                                 }
//                             />
//                             <StatLabel
//                                 title="CAB Rank"
//                                 value={"" + ship.cab_ov_rank}
//                             />
//                         </div>
//                     </div>
//                     <div>
//                         <div
//                             style={{
//                                 textAlign: "center",
//                                 display: "flex",
//                                 flexWrap: "wrap",
//                                 flexDirection: "row",
//                                 justifyContent: "space-between",
//                             }}
//                         >
//                             <StatLabel
//                                 title="Voyage Rank"
//                                 value={"" + ship.ranks.voyRank}
//                             />
//                             <StatLabel
//                                 title="Gauntlet Rank"
//                                 value={"" + ship.ranks.gauntletRank}
//                             />
//                             <StatLabel
//                                 title="Big Book Tier"
//                                 value={formatTierLabel(ship)}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             </div>) : <></>
        
//     }
    
// }