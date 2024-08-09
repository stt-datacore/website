import * as lz from 'lz-string';

/**
 * A Tiny Store
 */

export class TinyStore {
    private static readonly notify: Map<string, TinyStore> = new Map<string, TinyStore>();

    private readonly targetGroup: string;
    private readonly prefix = "___tinystore_";

    private mapCounter: number = 0;
    private readonly subscribers = new Map<string, (key: string) => void>();
    private readonly rapid = new Map<string, any>();

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
        return `${this.prefix}_${this.targetGroup}_${key}`;
    }

    /**
     * Create a new store
     * @param targetGroup The target group that is associated
     * @param defaultSticky The default stickiness of new values
     */
    private constructor(targetGroup: string, defaultSticky: boolean, compression: boolean) {
        if (!targetGroup || targetGroup === "") {
            throw new Error("targetGroup is undefined and TinyStore cannot function. Crashing...");
        }

        this.defaultSticky = defaultSticky ?? false;
        this.isCompressed = compression ?? false;
        this.targetGroup = targetGroup;
    }

    /**
     * True if this store defaults to creating sticky properties
     */
    public readonly defaultSticky: boolean;

    /**
     * True if the store is compressed
     */
    public readonly isCompressed: boolean;

    /**
     * Get or create a tiny store for the specified targetGroup. You must use this
     * static method to get a store. There is no public constructor for this class.
     * @param targetGroup The name of the targetGroup
     * @param defaultSticky The default stickiness of new values. defaultSticky will only be set for new stores, and is immutable.
     * @param compression True to create a compressed store
     * @returns A new or existing TinyStore
     */
    static getStore(targetGroup: string, defaultSticky: boolean = false, compression: boolean = false): TinyStore {
        let ts: TinyStore | undefined = undefined;

        if (this.notify.has(targetGroup)) {
            ts = this.notify.get(targetGroup);
        }

        if (!ts) {
            ts = new TinyStore(targetGroup, defaultSticky, compression);
            this.notify.set(targetGroup, ts);
        }

        return ts;
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
     * @param compression True to create a compressed store
     * @returns A new store or false if the targetGroup already exists, the store has the same targetGroup, or any other error condition.
     */
    static createFrom(targetGroup: string, store: TinyStore, defaultSticky: boolean = false, compression: boolean = false) {
        if (!store || !targetGroup)
            return false;
        if (store.targetGroup === targetGroup)
            return false;
        if (this.storeExists(targetGroup))
            return false;

        let newStore = this.getStore(targetGroup, defaultSticky, compression);
        if (newStore) {
            let pfxa = store.composeKey("");
            let pfxb = newStore.composeKey("");

            let keys = store.getKeys();
            for (let key of keys) {
                let value = window?.localStorage.getItem(pfxa + key);

                if (!value)
                    value = window?.sessionStorage.getItem(pfxa + key);

                if (value) {

                    if (!store.isCompressed && compression) {
                        value = lz.compressToBase64(value);
                    }
                    else if (store.isCompressed && !compression) {
                        value = lz.decompressFromBase64(value);
                    }

                    if (defaultSticky) {
                        window?.localStorage.setItem(pfxb + key, value);
                    }
                    else {
                        window?.sessionStorage.setItem(pfxb + key, value);
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
            if (this.subscribers.has(key)) {
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
        if (typeof window === 'undefined') return [];
        let keys = [] as string[];
        let c = window?.sessionStorage.length;
        let pfx = this.composeKey("");
        for (let i = 0; i < c; i++) {
            let key = window?.sessionStorage.key(i);
            if (key && key.startsWith(pfx)) {
                key = key.replace(pfx, "");
                if (!(key in keys))
                    keys.push(key);
            }
        }

        c = window?.localStorage.length;
        for (let i = 0; i < c; i++) {
            let key = window?.localStorage.key(i);
            if (key && key.startsWith(pfx)) {
                key = key.replace(pfx, "");
                if (!(key in keys))
                    keys.push(key);
            }
        }

        return keys;
    }

    /**
     * Get all values owned by this store
     * @returns
     */
    public getValues(): string[] {
        if (typeof window === 'undefined') return [];
        let keys = this.getKeys();
        let objs = [] as string[];
        let pfx = this.composeKey("");
        for (let key of keys) {
            let v = window?.sessionStorage.getItem(pfx + key);
            if (v) {
                objs.push(v);
            }
            else {
                v = window?.localStorage.getItem(pfx + key);
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
        if (typeof window === 'undefined') return false;
        let tkey = this.composeKey(key);
        let t2 = window?.localStorage.getItem(tkey);
        return (t2 !== null);
    }

    /**
     * Make the value for the specified key sticky
     * @param key
     * @returns
     */
    public makeSticky(key: string): boolean {
        if (typeof window === 'undefined') return false;
        if (!this.containsKey(key))
            return false;
        if (!this.isSticky(key))
            return false;
        let tkey = this.composeKey(key);
        window?.localStorage.setItem(tkey, window?.sessionStorage.getItem(tkey) as string);
        window?.sessionStorage.removeItem(tkey);
        return true;
    }

    /**
     * Make the value for the specified key not sticky
     * @param key
     * @returns
     */
    public makeUnsticky(key: string): boolean {
        if (typeof window === 'undefined') return false;
        if (!this.containsKey(key))
            return false;
        if (this.isSticky(key))
            return false;
        let tkey = this.composeKey(key);
        window?.sessionStorage.setItem(tkey, window?.localStorage.getItem(tkey) as string);
        window?.localStorage.removeItem(tkey);
        return true;
    }

    /**
     * Check if this store owns a value with the specified key
     * @param key
     * @returns
     */
    public containsKey(key: string): boolean {
        if (typeof window === 'undefined') return false;
        let tkey = this.composeKey(key);
        let t1 = window?.sessionStorage.getItem(tkey);
        let t2 = window?.localStorage.getItem(tkey);
        return t1 !== null || t2 !== null;
    }

    /**
     * Remove the key from store
     * @param key
     */
    public removeValue(key: string) {
        if (typeof window === 'undefined') return;
        let tkey = this.composeKey(key);
        window?.sessionStorage.removeItem(tkey);
        window?.localStorage.removeItem(tkey);
    }

    /**
     * Clear and delete all values in the store
     */
    public clear() {
        this.innerDestroy();
    }
    
    //public readonly spoot = <T>(value: T) => {}

    /**
     * Set a value to the store
     * @param key The key of the value to set
     * @param value The value to set
     * @param sticky Create/Set sticky (if not specified, the defaultSticky value is used)
     */
    public setValue<T>(key: string, value: T, sticky: boolean | undefined = undefined): void {
        if (typeof window === 'undefined') return;
        let tkey = this.composeKey(key);
        sticky ??= this.defaultSticky;

        if (value === undefined || value === null){ 
            this.removeValue(key);
            return;
        }

        let json = JSON.stringify(value);
        
        if (this.isCompressed) {
            json = lz.compressToBase64(json);
        }

        if (sticky) {
            window?.localStorage.setItem(tkey, json);
            window?.sessionStorage.removeItem(tkey);
        }
        else {
            window?.sessionStorage.setItem(tkey, json);
            window?.localStorage.removeItem(tkey);
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
        let json: string | null;
        if (typeof window === 'undefined') return undefined;
        if (this.defaultSticky) {
            json = window?.localStorage.getItem(tkey) ?? window?.sessionStorage.getItem(tkey);
        }
        else {
            json = window?.sessionStorage.getItem(tkey) ?? window?.localStorage.getItem(tkey);
        }

        if (json) {            
            if (this.isCompressed) {
                json = lz.decompressFromBase64(json);
            }
            return JSON.parse(json) as T;
        }

        return defaultValue as T;
    }

    public getRapid<T>(key: string, defaultValue: T | undefined = undefined): T | undefined {        
        return this.rapid.get(key) ?? defaultValue;
    }

    public setRapid<T>(key: string, value: T) {
        if (!this.rapid.has(key) || this.getRapid(key) !== value) {
            this.rapid.set(key, value);
            this.onPropertyChanged(key);
        }
    }
}
