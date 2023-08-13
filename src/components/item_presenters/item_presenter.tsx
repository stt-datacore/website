import React, { Component } from "react";
import { CompletionState } from "../../model/player";
import { Header, Rating } from "semantic-ui-react";
import { printImmoText } from "../../utils/crewutils";
import { TinyStore } from "../../utils/tiny";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { EquipmentItem } from "../../model/equipment";
import ItemDisplay from "../itemdisplay";
import ItemSources from "../itemsources";

export interface PresenterProps {
    hover: boolean;
    storeName: string;
    disableBuffs?: boolean;
    mobileWidth?: number;
    forceVertical?: boolean;
    verticalLayout?: 0 | 1 | 2;
    close?: () => void;
    touched?: boolean;
    width?: string;
    imageWidth?: string;
    showIcon?: boolean;
    tabs?: boolean;
}

export interface ItemPresenterProps extends PresenterProps {
    item: EquipmentItem;
    openItem?: (item: EquipmentItem) => void;
}

export interface ItemPresenterState {
    mobileWidth: number;
}

export class ItemPresenter extends Component<ItemPresenterProps, ItemPresenterState> {

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
        const { mobileWidth } = this.state;
        const compact = this.props.hover;    

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
                            <div>
                                <Header as="h3">Item sources:</Header>
                                <ItemSources item_sources={item.item_sources} />
                                <br />
                            </div>
                        )}
                    </div>
                </div>
            </div>) : <></>
        
    }
    
}