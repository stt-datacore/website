import React from "react";
import * as uuid from 'uuid';

/**
 * A Tiny Store
 */
export class TinyStore {
    private static readonly notify: Map<string, TinyStore> = new Map<string, TinyStore>();

    private readonly targetGroup: string;
    private readonly prefix = "___tinyhover_";

    private mapCounter: number = 0;
    private readonly subscribers = new Map<string, (key: string) => void>();

    
    /**
     * Fire this to execute all listeners on a property changed
     * @param name 
     */
    protected onPropertyChanged(name: string): void {
        for (let [, func] of this.subscribers) {
            func(name);
        }
    }

    /**
     * Compose the internal key used to store the values
     * @param key 
     * @returns 
     */
    protected composeKey(key: string): string {
        //console.log("Tiny Store ComposeKey: " + `${this.prefix}_${this.targetGroup}_${key}`);
        return `${this.prefix}_${this.targetGroup}_${key}`;
    }
    
    /**
     * Create a new store
     * @param targetGroup The target group that is associated 
     * @param defaultSticky The default stickiness of new values
     */
    private constructor(targetGroup: string, defaultSticky: boolean = false) {
        this.targetGroup = targetGroup;
        this.defaultSticky = defaultSticky ?? false;
    }

    /**
     * Returns true if this store defaults to creating sticky properties
     */
    public readonly defaultSticky: boolean;

    /**
     * Get or create a tiny store for the specified targetGroup. You must use this 
     * static method to get a store. There is no public constructor for this class.
     * @param targetGroup The name of the targetGroup
     * @param defaultSticky The default stickiness of new values. defaultSticky will only be set for new stores, and is immutable.
     * @returns A new or existing TinyStore
     */
    static getStore(targetGroup: string, defaultSticky: boolean = false): TinyStore {        
        if (this.notify.has(targetGroup)) {
            let ts = this.notify.get(targetGroup);
            if (!ts) {
                ts = new TinyStore(targetGroup, defaultSticky);
                this.notify.set(targetGroup, ts);
            }
            return ts;
        }
        else {
            let ts = new TinyStore(targetGroup, defaultSticky);
            this.notify.set(targetGroup, ts);
            return ts;
        }
    }

    /**
     * Check if the store for a targetGroup exists
     * @param targetGroup The targetGroup to check
     * @returns true if the store exists, otherwise false.
     */
    static storeExists(targetGroup: string): boolean {
        return this.notify.has(targetGroup) && this.notify.get(targetGroup) !== undefined;
    }

    /**
     * Create a new store from an existing store, and copies all values from the old store to the new store
     * @param targetGroup The new target group to create.
     * @param store The source store
     * @param defaultSticky The default stickiness of new values. defaultSticky will only be set for new stores, and is immutable.
     * @returns A new store or false if the targetGroup already exists, the store has the same targetGroup, or any other error condition.
     */
    static createFrom(targetGroup: string, store: TinyStore, defaultSticky: boolean = false) {
        if (!store || !targetGroup) return false;
        if (store.targetGroup === targetGroup) return false;
        if (this.storeExists(targetGroup)) return false;
        
        let newStore = this.getStore(targetGroup, defaultSticky);
        if (newStore){
            let pfxa = store.composeKey("");
            let pfxb = newStore.composeKey("");

            let keys = store.getKeys();
            for (let key of keys) {
                let value = window.localStorage.getItem(pfxa + key);
                if (!value) value = window.sessionStorage.getItem(pfxa + key);

                if (value) {
                    if (defaultSticky) {
                        window.localStorage.setItem(pfxb + key, value);
                    }
                    else {
                        window.sessionStorage.setItem(pfxb + key, value);
                    }                    
                }
            }

            return newStore;
        }

        return false;
    }

    /**
     * Destroys all values in and deletes the store for the specified targetGroup and removes the static reference.
     * @param targetGroup The targetGroup to delete
     */
    static destroy(targetGroup: string) {
        if (this.notify.has(targetGroup)) {
            this.notify.get(targetGroup)?.innerDestroy();
            this.notify.delete(targetGroup);
        }
    }

    /**
     * Called by destroy() and clear() to delete all values
     */
    private innerDestroy() {
        let keys = this.getKeys();
        for (let key of keys) {
            this.removeValue(key);
        }
    }

    /**
     * Subscribe to property changed events
     * @param func The callback
     * @returns A subscription token that can be used to unsubscribe
     */
    public subscribe(func: (key: string) => void): number {
        this.subscribers.set(this.mapCounter.toString(), func);
        return this.mapCounter++;
    }

    /**
     * Unsubscribe from property changed events
     * @param subscriber Either the subscription token or the function, itself, can be used.
     * @returns True if successfully unsubscribed, false for all other conditions (including not found)
     */
    public unsubscribe(subscriber: number | ((key: string) => void)): boolean {
        if (typeof subscriber === 'number') {
            let key = subscriber.toString();
            if (this.subscribers.has(key)){
                this.subscribers.delete(key);
                return true;
            }
        }
        else {
            for (let key of this.subscribers.keys()) {
                if (this.subscribers.get(key) === subscriber) {
                    this.subscribers.delete(key);
                    return true;
                }
            }
        }

        return false;
    }
    
    /**
     * Get all keys owned by this store
     * @returns 
     */
    public getKeys(): string[] {
        let keys = [] as string[];
        let c = window.sessionStorage.length;
        let pfx = this.composeKey("");
        for (let i = 0; i < c; i++) {
            let key = window.sessionStorage.key(i);
            if (key && key.startsWith(pfx)) {
                key = key.replace(pfx, "");                
                if (!(key in keys)) keys.push(key);
            }
        }

        c = window.localStorage.length;
        for (let i = 0; i < c; i++) {
            let key = window.localStorage.key(i);
            if (key && key.startsWith(pfx)) {
                key = key.replace(pfx, "");                               
                if (!(key in keys)) keys.push(key);
            }
        }

        return keys;
    }

    /**
     * Get all values owned by this store
     * @returns 
     */
    public getValues(): string[] {
        let keys = this.getKeys();
        let objs = [] as string[];
        let pfx = this.composeKey("");
        for (let key of keys){
            let v = window.sessionStorage.getItem(pfx + key);
            if (v) {
                objs.push(v);
            }
            else {
                v = window.localStorage.getItem(pfx + key);
                if (v) {
                    objs.push(v);
                }
            }
        }

        return objs;
    }

    /**
     * Returns true if the key refers to a sticky value
     * @param key 
     * @returns 
     */
    public isSticky(key: string): boolean {
        let tkey = this.composeKey(key);
        let t2 = window.localStorage.getItem(tkey);
        return (t2 !== null);
    }

    /**
     * Make the value for the specified key sticky
     * @param key 
     * @returns 
     */
    public makeSticky(key: string): boolean {
        if (!this.containsKey(key)) return false;
        if (!this.isSticky(key)) return false;
        let tkey = this.composeKey(key);
        window.localStorage.setItem(tkey, window.sessionStorage.getItem(tkey) as string);
        window.sessionStorage.removeItem(tkey);
        return true;
    }

    /**
     * Make the value for the specified key not sticky
     * @param key 
     * @returns 
     */
    public makeUnsticky(key: string): boolean {
        if (!this.containsKey(key)) return false;
        if (this.isSticky(key)) return false;
        let tkey = this.composeKey(key);
        window.sessionStorage.setItem(tkey, window.localStorage.getItem(tkey) as string);
        window.localStorage.removeItem(tkey);
        return true;
    }

    /**
     * Check if this store owns a value with the specified key
     * @param key 
     * @returns 
     */
    public containsKey(key: string): boolean {
        let tkey = this.composeKey(key);
        let t1 = window.sessionStorage.getItem(tkey);
        let t2 = window.localStorage.getItem(tkey);
        return t1 !== null || t2 !== null;
    }

    /**
     * Remove the key from store
     * @param key 
     */
    public removeValue(key: string) {
        let tkey = this.composeKey(key);
        window.sessionStorage.removeItem(tkey);
        window.localStorage.removeItem(tkey);
    }

    /**
     * Clear and delete all values in the store
     */
    public clear() {
        this.innerDestroy();
    }

    /**
     * Set a value to the store
     * @param key The key of the value to set
     * @param value The value to set
     * @param sticky Create/Set sticky (if not specified, the defaultSticky value is used)
     */
    public setValue<T>(key: string, value: T, sticky: boolean | undefined = undefined): void {
        let tkey = this.composeKey(key);
        sticky ??= this.defaultSticky;
        if (sticky) {
            window.localStorage.setItem(tkey, JSON.stringify(value));
            window.sessionStorage.removeItem(tkey);
        }
        else {
            window.sessionStorage.setItem(tkey, JSON.stringify(value));
            window.localStorage.removeItem(tkey);
        }
        this.onPropertyChanged(key);
    }

    /**
     * Get a value from the store
     * @param key The key of the value to get
     * @param defaultValue A default value if no value is present
     * @returns A value or the defaultValue or undefined
     */
    public getValue<T>(key: string, defaultValue: T | undefined = undefined): T | undefined {
        let tkey = this.composeKey(key);
        let item: string | null;

        if (this.defaultSticky){
            item = window.localStorage.getItem(tkey);
        }
        else {
            item = window.sessionStorage.getItem(tkey);
        }

        if (!item) {
            if (!this.defaultSticky){
                item = window.localStorage.getItem(tkey);
            }
            else {
                item = window.sessionStorage.getItem(tkey);
            }                
        }

        if (item) {
            return JSON.parse(item) as T;
        }

        if (defaultValue !== undefined) this.setValue(key, defaultValue as T);
        return defaultValue as T;
    }
}


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
    inputItem: T | null;
    
    /**
     * The function that is used to set the display item to the value of the displayItem property.
     * 
     * _When the hover is hit for a particular item, that item will call this function_
     * _to set the stateful property that is bound to the main hover component._
     * 
     * _When the hover over is exited, this function will be called with __null__._
     */
    setDisplayItem: React.Dispatch<React.SetStateAction<T | null>> | ((value: T | null) => void);

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
        this.props.setDisplayItem(null);
    };
    
    protected containerEnter = (e) => {
        const displayItem = this.prepareDisplayItem(this.props.inputItem);

        this.current = this.state.targetId;
        this.props.setDisplayItem(displayItem);            
    };

    render(): React.ReactNode {
        const { targetGroup, children } = this.props;

        return (    
            <div className={targetGroup} onMouseOver={(e) => this.containerEnter(e)} onMouseOut={(e) => this.containerLeave(e)} style={{padding:"0px",margin:"0px",background:"transparent", display: "inline-block"}}>
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
export abstract class HoverStat<TProps extends HoverStatProps, TState extends HoverStatState> extends React.Component<TProps, TState> {
    protected _elems: HTMLElement[] | undefined = undefined;
    protected readonly observer = new MutationObserver((e) => { this.doWireup(); });

    protected readonly tiny: TinyStore;

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

        this.state = {
            divId: "hoverstat__popover_" + uuid.v4().replace(/-/g, ""),
            touchToggled: false
        } as TState;
    }

    protected propertyChanged = (key: string): void => {
        if (key === 'cancelled') return;
        this.forceUpdate();
    }

    render() {
        const { divId } = this.state;
        const containerOver = (e) => {
            this.cancelled = true;
        }
        return (
            <div id={divId} onMouseOver={(e) => containerOver(e)} onMouseOut={(e) => { this.cancelled = false; this.deactivate();}} className="ui segment" style={{position: "fixed", "display": "none", left: 0, top: 0, zIndex: -100, border: "1px solid gray", borderRadius: "8px", padding: "8px"}}>
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
    protected getOffset(fromEl: HTMLElement, stopAt: HTMLElement | undefined = undefined) {
        var el: HTMLElement | null = fromEl;

        var x = 0;
        var y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
            if (el === stopAt) break;
            el = el.offsetParent as HTMLElement ?? null;
        }

        return { top: y, left: x };
    }        
    
    protected currentTarget: HTMLElement;

    /**
     * Activate the hover window
     * @param target the hover target that initiated the activation
     */
    protected activate = (target: HTMLElement): void => {
        const { divId } = this.state;
        let hoverstat = document.getElementById(divId);        

        if (hoverstat) {
            let rect = target.getBoundingClientRect();
            let ancestor = this.findCommonAncestor(target, hoverstat);

            let { top , left } = this.getOffset(target, ancestor);
            let x = left + rect.width;
            let y = top;

            if (!ancestor) {
                x -= window.scrollX;
                y -= window.scrollY;   
            }

            if (!ancestor) {
                hoverstat.style.position = "fixed";
            }
            else {
                hoverstat.style.position = "absolute";
            }            

            hoverstat.style.display = "block";
            window.setTimeout(() => {
                let hoverstat = document.getElementById(divId);     
                if (!hoverstat) return;   
                y -= (hoverstat.clientHeight - 8);
                x -= 8;
                
                hoverstat.style.left = x + "px";
                hoverstat.style.top = y + "px";
                hoverstat.style.zIndex = "100";
                this.currentTarget = target;
                window.addEventListener("resize", this.resizer);
            }, 0)
        }
    }

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

        for (let et1 of a1) {
            for (let et2 of a2) {
                if (et1 === et2) {
                    return et1;
                }
            }
        }

        return undefined;
    }

    /**
     * Deactivate the hover window
     * @param target The current target
     */
    protected deactivate = (target: HTMLElement | undefined = undefined) => {

        window.setTimeout(() => {
            if (this.cancelled) {
                this.cancelled = false;
                return;
            }

            const { divId } = this.state;
            let hoverstat = document.getElementById(divId);
            if (hoverstat) {
                hoverstat.style.zIndex = "-100";        
                hoverstat.style.display = "none";

                window.removeEventListener("resize", this.resizer);
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

        let hoverstat = document.getElementById(divId);        
        this.cancelled = true;

        if (hoverstat) {
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
        if (!target) return;

        if (target.children.length !== 0) {
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
            }
        }
    }
 
    componentWillUnmount(): void {
        this.observer.disconnect();
        if (!this._elems) return;
        for (let pl of this._elems) {
            let el = pl as HTMLElement;
            if (el) {
                el.removeEventListener("mouseover", this.targetEnter);
                el.removeEventListener("mouseout", this.targetLeave);
                el.removeEventListener("touchend", this.touchEnd);
            }
        }
        this._elems = undefined;
    }
}

