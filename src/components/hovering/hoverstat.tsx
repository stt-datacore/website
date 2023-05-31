import React, { PureComponent, ReactNode, useRef } from "react";
import { CrewMember } from "../../model/crew";
import { PlayerCrew, PlayerData } from "../../model/player";
import { Label } from "semantic-ui-react";
import * as uuid from 'uuid';

/**
 * Default HoverStatProps
 */
export interface HoverStatProps {
    
    /**
     * The target group (required to bind)
     */
    targetGroup: string;
}

/**
 * Default HoverStatTargetProps
 */
export interface HoverStatTargetProps<T> {

    /**
     * The item to be displayed (or null)
     */
    displayItem: T | null;
    
    /**
     * The function that is used to set the display item to the value of the displayItem property.
     * 
     * _When the hover is hit for a particular item, that item will call this function_
     * _to set the stateful property that is bound to the main hover component._
     * 
     * _When the hover over is exited, this function will be called with __null__._
     */
    setDisplayItem: React.Dispatch<React.SetStateAction<T | null>>;

    /**
     * The wrapped content
     */
    children: JSX.Element;

    /**
     * The target group (required to bind)
     */
    targetGroup: string;
}

/**
 * Default HoverStatState
 */
export interface HoverStatState {
    divId: string;
    touchToggled: boolean;
}

/**
 * HoverStatTarget abstract class
 * 
 * Use this to wrap a hover target element
 */
export abstract class HoverStatTarget<T, TProps extends HoverStatTargetProps<T>> extends React.Component<TProps> {
    constructor(props: TProps) {
        super(props);
    }

    /**
     * Optionally override this method to do data transformations on the display item
     * before the setDisplayItem function is called.
     * 
     * _This method will be called even if the displayItem is null, so that a default value may be provided
     * when required._
     * 
     * _(The default behavior is to return the input item)_
     * @param displayItem The displayItem to transform
     * @returns The transformed displayItem
     */
    protected prepareDisplayItem(displayItem: T | null): T | null {
        return displayItem;
    }

    render(): React.ReactNode {
        const { targetGroup, children, setDisplayItem } = this.props;
        const displayItem = this.prepareDisplayItem(this.props.displayItem);

        return (<>        
            <div className={targetGroup} onMouseOver={(e) => setDisplayItem(displayItem)} onMouseOut={(e) => setDisplayItem(null)} style={{padding:"0px",margin:"0px",background:"transparent", display: "inline-block"}}>
                {children}
            </div>            
        </>)        
    }
}

/**
 * HoverStat abstract hover window class
 */
export abstract class HoverStat<TProps extends HoverStatProps, TState extends HoverStatState> extends React.Component<TProps, TState> {
    protected _elems: HTMLElement[] | undefined = undefined;
    protected readonly observer = new MutationObserver((e) => { this.doWireup(); });

    /**
     * Override this abstract method to render the content of the hover window 
     * 
     * _(Optionally, you can attach a children property to a HoverStatProps derived object and pass that through, here)_
     */
    protected abstract renderContent(): JSX.Element;

    constructor(props: TProps) {
        super(props);
        this.state = {
            divId: "hoverstat__popover_" + uuid.v4().replace(/-/g, ""),
            touchToggled: false
        } as TState;
    }

    render() {
        const { divId } = this.state;
        
        return (
            <div id={divId} className="ui segment" style={{position: "fixed", "display": "none", left: 0, top: 0, zIndex: -100, border: "1px solid gray", borderRadius: "8px", padding: "8px"}}>
                {this.renderContent()}
            </div>
		);
	}
    
    /**
     * This method is an event listener for the window.resize event that is only
     * wired up while the hover box is showing
     * @param e Event
     */
    protected resizer = (e: any) => {
        this.state = { ... this.state };
    }	

    /**
     * Custom function to determine the correct offset of the hover box relative to the visible portion of the page
     * @param fromEl 
     * @returns top and left
     */
    protected getOffset(fromEl: HTMLElement) {
        var el: HTMLElement | null = fromEl;

        var _x = 0;
        var _y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent as HTMLElement ?? null;
        }

        return { top: _y, left: _x };
    }        

    /**
     * Activate the hover window
     * @param target the hover target that initiated the activation
     */
    protected activate = (target: HTMLElement): void => {
        const { divId } = this.state;

        console.log("HoverStat Target Enter");
        console.log(divId);

        let hoverstat = document.getElementById(divId);        

        if (hoverstat) {
            let rect = target.getBoundingClientRect();
            let { top , left } = this.getOffset(target);
            let x = left + rect.width;
            let y = top - 128;

            x -= window.scrollX;
            y -= window.scrollY;

            hoverstat.style.display = "block";
            
            hoverstat.style.left = x + "px";
            hoverstat.style.top = y + "px";
            hoverstat.style.zIndex = "100";

            window.addEventListener("resize", this.resizer);
        }

    }

    /**
     * Deactivate the hover window
     * @param target The current target
     */
    protected deactivate = (target: HTMLElement) => {
        const { divId } = this.state;
        let hoverstat = document.getElementById(divId);
        if (hoverstat) {
            hoverstat.style.zIndex = "-100";        
            hoverstat.style.display = "none";
            window.removeEventListener("resize", this.resizer);
        }
    }

    /**
     * Target mouseOver
     * @param e 
     * @returns 
     */
    protected targetEnter = (e: MouseEvent) => {
        const { divId } = this.state;

        console.log("HoverStat Target Enter");
        console.log(divId);

        let hoverstat = document.getElementById(divId);        

        if (hoverstat) {
            console.log("Found Correct HoverStat");

            let target = e.target as HTMLElement;
            if (!target) return;

            if (target.children.length !== 0) {
                return;
            }
            this.activate(target);
        }
    }

    /**
     * Target mouseOut
     * @param e 
     * @returns 
     */
    protected targetLeave = (e: MouseEvent) => {        
        let target = e.target as HTMLElement;
        if (!target) return;

        if (target.children.length !== 0) {
            return;
        }
        this.deactivate(target);
    }

    /**
     * Target touchEnd
     * @param e 
     * @returns 
     */
    protected touchEnd = (e: TouchEvent) => {
        let target = e.target as HTMLElement;
        console.log("touchEnd");
        if (!target) return;

        if (target.children.length !== 0) {
            console.log(target.className);
            return;
        }

        if (this.state.touchToggled) {					
            this.deactivate(target);
            this.state = { ...this.state, touchToggled: false };
        }
        else {
            if (target) this.activate(target);
            this.state = { ...this.state, touchToggled: true };
        }		
    }

    componentDidMount(): void {
        console.log("componentDidMount");
        this.doWireup();
        this.observer.observe(document, { subtree: true, childList: true });
    }

    doWireup(): void {
        var els = document.getElementsByClassName(this.props.targetGroup);
        this._elems ??= [];
        for (let pl of els) {
            let el = pl as HTMLElement;            

            if (el) {
                if (this._elems.includes(el)) continue;
                this._elems.push(el);
                console.log("Wiring up element " + el.id ?? el.tagName);
                el.addEventListener("mouseover", this.targetEnter);
                el.addEventListener("mouseout", this.targetLeave);
                el.addEventListener("touchend", this.touchEnd);
            }
        }
    }
 
    componentWillUnmount(): void {
        console.log("componentWillUnmount");
        this.observer.disconnect();
        if (!this._elems) return;
        for (let pl of this._elems) {
            let el = pl as HTMLElement;
            if (el) {
                console.log("Unwiring element " + el.id ?? el.tagName);
                el.removeEventListener("mouseover", this.targetEnter);
                el.removeEventListener("mouseout", this.targetLeave);
                el.removeEventListener("touchend", this.touchEnd);
            }
        }
        this._elems = undefined;
    }
}

