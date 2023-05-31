import React, { PureComponent, ReactNode, useRef } from "react";
import { CrewMember } from "../model/crew";
import { PlayerCrew, PlayerData } from "../model/player";
import { Label } from "semantic-ui-react";


export interface HoverStatProps {
    crew?: CrewMember;
    playerCrew?: PlayerCrew;
    showMaxed?: boolean;
    addBuffs?: boolean;
    children: JSX.Element;
    popOver: JSX.Element | HTMLElement | string;
}
class HoverStat extends React.Component<HoverStatProps> {

    render() {
		const { crew, children, popOver } = this.props;
        const addBuffs = this.props.addBuffs ?? true;
        
        let el: HTMLElement | null = null;
        let jxl: JSX.Element | null = null;

        if (typeof popOver === 'string') {
            el = document.getElementById(popOver);            
        }
        else if ("innerHTML" in popOver) {
            el = popOver;
        }
        else {
            jxl = popOver;
        }
        const mo = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            let elo = document.getElementById("meager__popover");
            if (elo) {
                elo.style.left = e.currentTarget.offsetLeft + "px";
                elo.style.top = e.currentTarget.offsetTop + "px";
                elo.style.zIndex = "100";
                elo.style.display = "block";
            }
        }
        const mot = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            let elo = document.getElementById("meager__popover");
            if (elo) {
                elo.style.zIndex = "-100";
                elo.style.display = "none";
            }
        }

        return (
            <div id="meager__" onMouseOver={(e) => mo(e)} onMouseOut={(e) => mot(e)}>
                {children}
                <div id="meager__popover" style={{position: "absolute", "display": "none", left: 0, top: 0, zIndex: -100, border: "1px solid gray", borderRadius: "8px", padding: "8px"}}>
                    {el && el.outerHTML}
                    {jxl}
                </div>
            </div>
		);
	}
    
    componentDidMount(): void {
        var el = document.getElementById("meager__");
        if (el) {
            el = el.children[0] as HTMLDivElement;
            el.innerHTML += "Hello World!";
        }
    }
    
}

export default HoverStat;