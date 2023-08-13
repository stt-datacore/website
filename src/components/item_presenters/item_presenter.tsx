import React, { Component } from "react";
import { CompletionState } from "../../model/player";
import { Header, Rating } from "semantic-ui-react";
import { isImmortal, printImmoText } from "../../utils/crewutils";
import { TinyStore } from "../../utils/tiny";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { EquipmentItem } from "../../model/equipment";
import ItemDisplay from "../itemdisplay";
import ItemSources from "../itemsources";
import { MergedContext } from "../../context/mergedcontext";
import { navigate } from "gatsby";
import { PresenterProps } from "./ship_presenter";


export interface ItemPresenterProps extends PresenterProps {
    item: EquipmentItem;
    openItem?: (item: EquipmentItem) => void;
    crewTargetGroup?: string;
}

export interface ItemPresenterState {
    mobileWidth: number;
}

export class ItemPresenter extends Component<ItemPresenterProps, ItemPresenterState> {
    static contextType = MergedContext;
    context!: React.ContextType<typeof MergedContext>;

    tiny: TinyStore;

    constructor(props: ItemPresenterProps) {
        super(props);        
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }

        this.tiny = TinyStore.getStore(props.storeName)
    }    

    render(): JSX.Element {
        const { item: item, touched, tabs, showIcon } = this.props;
        const { playerData } = this.context;
        const { mobileWidth } = this.state;
        const compact = this.props.hover;    
        const roster = playerData?.player?.character?.crew;

        if (!item) {
            return <></>
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
        
        const navClick = (e) => {
            if (!item) return;
            if (this.props.openItem) {
                this.props.openItem(item);
            }
        }
        
        let mt = true;
        const dcrew = item.demandCrew?.map(sym => {
            const crew = roster.find(f => f.symbol === sym && !isImmortal(f));
            if (crew) mt = false;
            return (<>
                {crew && <div 
                    onClick={(e) => navigate("/crew/"+crew.symbol)}
                    style={{
                        cursor: "pointer", 
                        textAlign:"center",
                        display:"flex", 
                        width:"96px", 
                        margin: "1em", 
                        flexDirection: "column", 
                        justifyContent: "center", 
                        alignItems: "center"}}>
                        <ItemDisplay
                            targetGroup={this.props.crewTargetGroup}
                            playerData={playerData}
                            allCrew={this.context.allCrew}
                            itemSymbol={sym}
                            rarity={crew.rarity}
                            maxRarity={crew.max_rarity}
                            size={64}
                            src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                        />
                        <i>{crew?.name}</i>
                    </div> || <></>}
            </>)
        });

        const empty = mt;
 
        return item ? (<div style={{ 
                        fontSize: "12pt", 
                        display: "flex", 
                        flexDirection: window.innerWidth < mobileWidth ? "column" : "row",
                        //width: window.innerWidth < mobileWidth ? "calc(100vw - 16px)" : undefined
                        
                        }}>
                            <div style={{display: "flex", flexDirection:"row", justifyContent:"flex-start"}}>
                        {touched && <>
                            <i className='close icon' style={{cursor: "pointer"}} onClick={(e) => this.props.close ? this.props.close() : undefined} />
                        </>}    
                    </div> 
                <div style={{ display: "flex", flexDirection: "column"}}>                    
                    <div style={{flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection:"row"}}>
                        <ItemDisplay
                            src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
                            size={compact ? 128 : 128}
                            rarity={item.rarity}
                            maxRarity={item.rarity}
                            style={{ maxWidth: "calc(100vw - 32px)", marginRight: "8px"}}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom:"8px"}}>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
                            
                        </div>
                    </div>
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
                        <h3 style={{margin:"2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px"}}>
                            <a onClick={(e) => navClick(e)} style={{cursor: "default"}} title={item.name}>
                                {item.name}
                            </a>
                        </h3>
                        <div style={{margin: "4px", marginLeft: 0, display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <Rating
                                icon='star' 
                                rating={item.rarity} 
                                maxRating={item.rarity} 
                                size='large' 
                                disabled />
                        </div>
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
                       <i>{item.flavor}</i>
                    </div>
                    <div>
                    {!!(item.item_sources.length > 0) && (
                            <div style={{fontSize: "8pt"}}>
                                <Header as="h3">Item sources:</Header>
                                <ItemSources refItem={item.symbol} brief={true} item_sources={item.item_sources} />
                                <br />
                            </div>
                        )}
                    </div>
                    <div style={{display: "flex", flexDirection: "column", marginBottom:"1em"}}>
                    {!empty && (<>
                        <Header as="h3">Current Roster Demands:</Header>
                            <div style={{
                                display: "flex", 
                                flexDirection: "row", 
                                justifyContent: "flex-start", 
                                alignItems: "flex-start", 
                                maxHeight: "450px",
                                overflow: "auto",
                                flexWrap: "wrap"}}>

                                {dcrew}                                
                            </div>
                            </>)}
                    </div>
                </div>
            </div>) : <></>
        
    }
    
}