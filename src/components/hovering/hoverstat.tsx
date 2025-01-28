import React from "react";
import * as uuid from 'uuid';
import { TinyStore } from "../../utils/tiny";

const isWindow = typeof window !== 'undefined';

export const DEFAULT_MOBILE_WIDTH = 1024;

export interface Coord {
    x: number;
    y: number;
    centerX?: boolean;
}

/**
 * Default HoverStatProps
 */
export interface HoverStatProps {
    
    /**
     * The target group (required to bind)
     */
    targetGroup: string;
    offset?: Coord;
    windowEdgeMinPadding?: Coord;
    boxStyle?: React.CSSProperties;
    mobileWidth?: number;

    /** @deprecated Don't use this anymore */
    useBoundingClient?: boolean;

    /** True if the hover is going to be used in a modal. */
    modalPositioning?: boolean;
    customOffset?: Coord;

    /**
     * Time in milliseconds to wait before activating the window
     */
    activationDelay?: number;
}

/**
 * Default HoverStatTargetProps
 */
export interface HoverStatTargetProps<T> {

    /**
     * The item to be displayed (or null)
     */
    inputItem: T | null;

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
export interface HoverStatState<T> {
    divId: string;
    touchToggled: boolean;
    boxStyle: React.CSSProperties;
    mobileWidth: number;
    displayItem?: T;
}

export interface HoverStatTargetState {
    targetId: string;
}

/**
 * HoverStatTarget abstract class
 * 
 * Use this to wrap a hover target element
 */
export abstract class HoverStatTarget<T, TProps extends HoverStatTargetProps<T>, TState extends HoverStatTargetState> extends React.Component<TProps, TState> {
    protected readonly tiny: TinyStore;

    constructor(props: TProps) {
        super(props);
        this.tiny = TinyStore.getStore(props.targetGroup);        
        this.state = { targetId: uuid.v4() } as TState;
    }

    protected get current(): string {
        return this.tiny.getValue<string>('current', "") ?? "";
    }

    protected set current(value: string) {
        this.tiny.setValue<string>('current', value, false);
    }

    protected abstract propertyChanged: (key: string) => void;

    protected get cancelled(): boolean {
        return this.tiny.getValue('cancelled', false) ?? false;
    }

    protected set cancelled(value: boolean) {
        this.tiny.setValue('cancelled', value);
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

    protected containerLeave = (e) => {
        if (this.cancelled) {
            this.cancelled = false;
            return;
        }
        this.current = "";
        this.tiny.setRapid('displayItem', null);
    };
    
    protected containerEnter = (e) => {
        const displayItem = this.prepareDisplayItem(this.props.inputItem);

        this.current = this.state.targetId;
        this.tiny.setRapid('displayItem', displayItem);
    };

    render(): React.ReactNode {
        const { targetGroup, children } = this.props;

        return (    
            <div className={targetGroup} 
                 onDoubleClick={(e) => this.containerEnter(e)} 
                 // onTouchEnd={(e) => this.containerEnter(e)} 
                 onMouseOver={(e) => this.containerEnter(e)} 
                 onMouseOut={(e) => this.containerLeave(e)} 
                 style={{padding:"0px",margin:"0px",background:"transparent", display: "inline-block"}}>

                {children}
            </div>)         
    }

    componentWillUnmount(): void {
        this.tiny.unsubscribe(this.propertyChanged);
    }
}

/**
 * HoverStat abstract hover window class
 */
export abstract class HoverStat<T, TProps extends HoverStatProps, TState extends HoverStatState<T>> extends React.Component<TProps, TState> {

    private _unmounted: boolean = false;
    private _nodismiss: boolean = false;

    protected readonly hoverDelay: number;

    protected _elems: HTMLElement[] | undefined = undefined;
    protected readonly observer = new MutationObserver((e) => { this.doWireup(); });

    protected readonly tiny: TinyStore;
    protected readonly targetOffset: Coord;
    protected readonly windowEdgeMinPadding: Coord;

    protected get cancelled(): boolean {
        return this.tiny.getValue('cancelled', false) ?? false;
    }

    protected set cancelled(value: boolean) {
        this.tiny.setValue('cancelled', value);
    }

    /**
     * Override this abstract method to render the content of the hover window 
     * 
     * _(Optionally, you can attach a children property to a HoverStatProps derived object and pass that through, here)_
     */
    protected abstract renderContent(): JSX.Element;

    constructor(props: TProps) {
        super(props);
        this.tiny = TinyStore.getStore(props.targetGroup);
        this.tiny.subscribe(this.propertyChanged);
        this.targetOffset = props.offset ?? { x: 12, y: 12 };
        this.windowEdgeMinPadding = props.windowEdgeMinPadding ?? { x: 8, y: 8 };

        this.state = {
            divId: "hoverstat__popover_" + uuid.v4().replace(/-/g, ""),
            touchToggled: false,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH,
            boxStyle: { position: "fixed", "display": "none", left: 0, top: 0, zIndex: -100, border: "1px solid gray", borderRadius: "8px", padding: "8px", ... this.props.boxStyle ?? {}} as React.CSSProperties
        } as TState;

        this.hoverDelay = props.activationDelay ?? 0;
        // if (navigator.userAgent.includes("Firefox")) {
        //     this.hoverDelay = 0;
        // }
        // else {
        //     this.hoverDelay = 0;
        // }
    }

    protected propertyChanged = (key: string): void => {
        if (key === 'cancelled') return;
        else if (key === 'displayItem') {
            this.setState({ ... this.state, displayItem: this.tiny.getRapid('displayItem')});
        }
        else {
            this.forceUpdate();
        }    
    }

    render() {
        const { divId, boxStyle } = this.state;
        const renderContent = this.renderContent;
        const me = this;

        const containerOver = (e) => {
            if (me._unmounted) return;
            this.cancelled = true;
        }

        const containerOut = (e) => {
            if (me._unmounted) return;
            this.cancelled = false; 
            this._nodismiss = false;
            this.deactivate();
        }

        // console.log("Render HoverStat")
        return (
            <div id={divId} onMouseOver={(e) => containerOver(e)} onMouseOut={(e) => containerOut(e)} className="ui segment" style={boxStyle}>                
                {renderContent()}
            </div>
		);
	}
    
    /**
     * This method is an event listener for the window.resize event that is only
     * wired up while the hover box is showing
     * @param e Event
     */
    protected resizer = (e: any) => {
        this.forceUpdate();
        // this.state = { ... this.state };
        // if (this.currentTarget) {
        //     this.activate(this.currentTarget);
        // }
    }	

    /**
     * Custom function to determine the correct offset of the hover box relative to the visible portion of the page
     * @param fromEl 
     * @returns top and left
     */
    protected getOffset(fromEl: HTMLElement, stopAt: HTMLElement | undefined = undefined) {
        var el: HTMLElement | null = fromEl;

        var x = 0;
        var y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
            if (el.scrollTop) {
                console.log("Scroll");
                console.log(el.offsetTop);
                console.log(el.scrollTop);
            }
            if (el === stopAt) break;
            el = el.offsetParent as HTMLElement ?? null;
        }

        return { top: y, left: x };
    }        
    
    protected currentTarget?: HTMLElement = undefined;

    private findCommonAncestor(el1: HTMLElement, el2: HTMLElement): HTMLElement | undefined {

        let t1: HTMLElement | null = el1;
        let a1: HTMLElement[] = [];

        while(t1) {
            if (t1.parentElement) {
                a1.push(t1.parentElement);                
            }
            t1 = t1.parentElement;
        }

        let t2: HTMLElement | null = el2;
        let a2: HTMLElement[] = [];

        while(t2) {
            if (t2.parentElement) {
                a2.push(t2.parentElement);                
            }
            t2 = t2.parentElement;
        }

        if (a2.includes(el1)) return el1;
        else if (a1.includes(el2)) return el2;

        for (let et1 of a1) {
            for (let et2 of a2) {
                if (et1 === et2) {
                    return et1;
                }
            }
        }

        return undefined;
    }

    protected abstract get canActivate(): boolean;
    
    protected realignTarget = (target?: HTMLElement) => {

        const { useBoundingClient, modalPositioning, customOffset } = this.props;
        const { divId } = this.state;  
        const hoverstat = document.getElementById(divId);    
        
        target ??= this.currentTarget;  
        
        let modal: HTMLElement | undefined = undefined;

        if (modalPositioning) {
            let modals = document.getElementsByClassName("ui modal transition visible active");
            if (modals && modals.length) {
                modal = modals[0] as HTMLElement;
            }
        }

        if (!target || !hoverstat) return;

        let rect = target.getBoundingClientRect();
        let ancestor = useBoundingClient ? undefined : (modal ?? this.findCommonAncestor(target, hoverstat));
        this.currentTarget = target;

        let { top , left } = useBoundingClient || !!modal ? rect : this.getOffset(target, ancestor);
        let { left: tx, top: ty } = this.getOffset(target, ancestor);

        let x = left + rect.width;
        let y = top - rect.height / 4;
        let modalBounds: DOMRect | undefined = undefined;
        if (modal) {
            modalBounds = modal.getBoundingClientRect();
            x -= modalBounds.x;
            y -= modalBounds.y;
        }

        let off = { ... this.targetOffset };             
        let pad = { ... this.windowEdgeMinPadding };
        if (target.clientWidth >= 64) {
            off.x += ((target.clientWidth / 2));
        }
        if (!ancestor && !useBoundingClient) {
            x -= window.scrollX;
            y -= window.scrollY;   
        }

        if (!ancestor || modal) {
            hoverstat.style.position = "fixed";
        }
        else {
            hoverstat.style.position = "absolute";
        }            
        if (customOffset) {
            x += customOffset.x;
            y += customOffset.y;
        }
        hoverstat.style.display = "flex";
        hoverstat.style.opacity = "0";
        hoverstat.style.zIndex = "1000000";
        if (isWindow) window.setTimeout(() => {
            let hoverstat = document.getElementById(divId);     
            // console.log("Activate " + divId);

            if (!hoverstat) return;   

            y -= (hoverstat.clientHeight - off.y);
            x -= off.x;

            let scrolly = useBoundingClient || !!modal ? 0 : window.scrollY;

            if (y < scrolly + pad.y) {
                y = scrolly + pad.y;
            }

            const widthCheck = modalBounds?.width ?? window.innerWidth;
            const heightCheck = modalBounds?.height ?? window.innerHeight;
            
            if (x + hoverstat.clientWidth > window.scrollX + widthCheck - pad.x) {
                x = window.scrollX + widthCheck - pad.x - hoverstat.clientWidth - 16;
            }

            if (y + hoverstat.clientHeight + (pad.y * 2) > scrolly + heightCheck) {
                y = (scrolly + heightCheck) - (hoverstat.clientHeight + (pad.y * 2));
            }                

            if (x < pad.x || x + hoverstat.clientWidth > widthCheck - pad.x) {
                x = pad.x;
                hoverstat.style.width = widthCheck - (pad.x * 2) + 'px';
            }                
            
            if (useBoundingClient) {
                hoverstat.style.left = x + "px";
                hoverstat.style.top = y + "px";    
            }
            else {
                hoverstat.style.left = x + "px";
                hoverstat.style.top = y + "px";    
            }

            hoverstat.style.zIndex = "1009";

            hoverstat.style.opacity = "1";
            hoverstat.style.transition = "opacity 0.25s";
            if (isWindow) window.addEventListener("resize", this.resizer);       
        }, this.hoverDelay)
    }

    /**
     * Activate the hover window
     * @param target the hover target that initiated the activation
     */
    protected activate = (target: HTMLElement): void => {
        if (!this.canActivate) return;
        const { divId } = this.state;        
        let hoverstat = document.getElementById(divId);        
        this._nodismiss = false;
        
        if (hoverstat) {
            setTimeout(() => this.realignTarget(target));
        }
    }

    /**
     * Deactivate the hover window
     * @param target The current target
     */
    protected deactivate = (target: HTMLElement | undefined = undefined) => {
        let metarget = this.currentTarget;
        this._nodismiss = false;

        if (isWindow) window.setTimeout(() => {
            if (this.cancelled || this.currentTarget !== metarget) {
                this.cancelled = false;
                return;
            }
            const { divId } = this.state;
            // console.log("Deactivate " + divId);
            const hoverstat = document.getElementById(divId);
            if (hoverstat) {
                hoverstat.style.zIndex = "-100";        
                hoverstat.style.opacity = "0";
                hoverstat.style.transition = "opacity 0.25s";
                
                this.currentTarget = undefined;                
                if (isWindow) window.removeEventListener("resize", this.resizer);
                if (isWindow) window.setTimeout(() => hoverstat.style.display = "none", 0.25);
            }
        }, 0);
    }

    /**
     * Target mouseOver
     * @param e 
     * @returns 
     */
    protected targetEnter = (e: MouseEvent) => {
        const { divId } = this.state;

        // console.log("Target Enter");

        let hoverstat = document.getElementById(divId);        
        this.cancelled = true;

        if (hoverstat) {
            let target = e.target as HTMLElement;
            if (!target) return;

            if (target.children.length !== 0 || !(target instanceof HTMLImageElement)) {                
                return;
            }
            if (target.src.includes("atlas/")) return;
            if (target.src.includes("star_reward")) return;            
            if (target.src.includes("Continuum")) return;
            this.activate(target);
        }
    }

    /**
     * Target mouseOut
     * @param e 
     * @returns 
     */
    protected targetLeave = (e: MouseEvent | TouchEvent) => {        
        // console.log("Target Leave");
        let target = e.target as HTMLElement;
        if (!target || this._nodismiss) return;

        if (target.children.length !== 0) {
            return;
        }
        this.deactivate(target);
    }

    /**
     * Target tap elsewhere
     * @param e 
     * @returns 
     */
    protected touchTargetLeave = (e: MouseEvent | TouchEvent) => {        
        let target = e.target as HTMLElement;
        if (!target) return;
        // console.log("Touch Target Leave");
        let hoverstat = document.getElementById(this.state.divId);   
        if (hoverstat) {
            let ancestor = this.findCommonAncestor(target, hoverstat);
            if (ancestor === hoverstat) return;
        }
        this.deactivate(target);
    }
    
    private touching?: boolean;

    /**
     * Target touchEnd
     * @param e 
     * @returns 
     */
    protected touchEnd = (e: TouchEvent) => {
        let target = e.target as HTMLElement;
        const me = this;
        if (!target) return;

        if (target.children.length !== 0) {
            return;
        }

        if (!me.touching) return;
        me.touching = false;
    
        if (me.state.touchToggled) {					
            me.deactivate(target);
        }
        else {
            if (target || me.currentTarget) {
                e.preventDefault();
                me.setState({ ...me.state ?? {}, touchToggled: true });
                me.activate(target ?? me.currentTarget);
            }
        }		
    }
    protected touchStart = (e: TouchEvent) => {
        this.touching = true;
    };
    protected touchMove = (e: TouchEvent) => {
        this.touching = false;
        //this.tiny.setValue('touching', false);
    };
    protected onClick = (e: MouseEvent) => {
        //if (this.touching) return;
        this._nodismiss = true;
    }

    componentDidMount(): void {
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
                el.addEventListener("mouseover", this.targetEnter);
                el.addEventListener("mouseout", this.targetLeave);
                el.addEventListener("touchend", this.touchEnd);
                el.addEventListener("touchstart", this.touchStart);
                el.addEventListener("touchmove", this.touchMove);
                el.addEventListener("mouseup", this.onClick);
            }
        }
    }
 
    componentWillUnmount(): void {
        this._unmounted = true;
        this.observer.disconnect();
        if (!this._elems) return;
        for (let pl of this._elems) {
            let el = pl as HTMLElement;
            if (el) {
                el.removeEventListener("mouseover", this.targetEnter);
                el.removeEventListener("mouseout", this.targetLeave);
                el.removeEventListener("touchend", this.touchEnd);
                el.removeEventListener("touchstart", this.touchStart);
                el.removeEventListener("touchmove", this.touchMove);
                el.removeEventListener("mouseup", this.onClick);
            }
        }
        this._elems = undefined;
    }
}

