
/**
 * The object number fields configuration
 */
export interface ObjectNumberSortConfig {
    props: NumberSortConfigItem[];
}

/**
 * Stats object number fields configuration item.
 */
export interface NumberSortConfigItem {
    /**
     * Property paths to one or more a numeric field (use '/' to reference nested objects) separated by &
     */
    props: string;

    /**
     * The operation to perform on a compound property.
     */
    compoundOperator?: string;

    /**
     * The sort direction for this item
     */
    direction?: 'ascending' | 'descending' | undefined;

    /**
     * Null sort direction
     * (Ascending: null comes before not-null)
     */
    nullDirection?: 'ascending' | 'descending' | undefined;

    /**
     * The order of precedence for this value to be evaulated.
     * If no precedence is specified, the order of definition is used.
     * If a precedence already exists, the new one will be pushed up
     * to the next available position.
     */
    precedence?: number;
    
    /**
     * Optional custom comparison method
     * @param a 
     * @param b 
     * @returns 
     */
    customComp?: (a: any, b: any) => number;
}

/**
 * Stats sorter configuration
 */
export interface StatsSorterConfig {
    objectConfig: ObjectNumberSortConfig;
}

/**
 * Sorts an array of objects based on the numeric fields of the objects and their nested objects using a configuration map
 */
export class StatsSorter {
    public readonly objectConfig: ObjectNumberSortConfig;

    constructor(props: StatsSorterConfig) {
        this.objectConfig = props.objectConfig;

        let prec = 0;
        let seeprec = [] as number[];

        for (let conf of this.objectConfig.props){
            if (conf.precedence) {    
                let sp = conf.precedence;
                while (seeprec.includes(sp)) {
                    sp++;
                }
                conf.precedence = sp;
                seeprec.push(sp);
            }
        }

        for (let conf of this.objectConfig.props){
            if (!conf.precedence) {    
                while (seeprec.includes(prec)) {
                    prec++;
                }                            
                conf.precedence = prec;
                seeprec.push(prec);
                prec++;
            }
        }

        this.objectConfig.props.sort((a, b) => (a?.precedence ?? 0) - (b?.precedence ?? 0));
    }

    /**
     * Group objects by the specified property
     * @param stats The stats
     * @param prop The property path to group by
     * @param unknownGroup The group to assign to objects with no such property
     * @returns An object map of key/value pairs, where the key is the property value, and the value is a sub-array of the input array.
     */
    public groupBy<T extends Object>(stats: T[], prop: string, unknownGroup?: string): { [key: string]: T[] } {
        unknownGroup ??= 'unknown';
        let result = {} as { [key: string]: T[] };
        let newstats = this.sortStats(stats);

        for (let stat of newstats) {
            let val = this.getValue(stat, prop);
            if (val !== undefined) {      
                result[val] ??= [];
                result[val].push(stat);
            }
            else {
                result[unknownGroup] ??= [];
                result[unknownGroup].push(stat);
            }
        }

        if (result)  {
            for (let stat in result) {
                this.sortStats(result[stat], true);
            }
        }
        
        return result;

    }

    /**
     * Run the rules on the stats
     * @param stats The input data
     * @param inPlace True to sort in place, false to make a copy
     * @returns The sorted array.
     */
    public sortStats<T extends Object>(stats: T[], inPlace?: boolean): T[] {
        let tstats: T[];
        if (inPlace) {
            tstats = stats ?? [];
        }
        else {
            tstats = [ ... stats ?? [] ];
        }

        tstats.sort((a,b) => this.compareObjects(a, b));
        return tstats;
    }

    /**
     * Compare two objects based on the current configuration.
     * @param a 
     * @param b 
     * @returns -1 if a comes first, 1 if b comes first, and 0 if equal.
     */
    public compareObjects<T extends Object>(a: T, b: T) {
        let r: number = 0;

        for (let prop of this.objectConfig.props) {
            if (prop.customComp) {
                r = prop.customComp(a, b);
            }
            else {
                r = this.numbersComp(a, b, prop.props, prop.direction, prop.nullDirection, prop.compoundOperator);
            }
            if (r) return r;
        }

        return r;
    }
    
    /**
     * Get the value at the specified (non-compound) property path on the specified object
     * @param target 
     * @param prop 
     * @returns 
     */
    public getValue<T extends Object>(target: T, prop: string | number): number | undefined {
        if (typeof prop === 'string') {
            let x = prop.indexOf('/');
            if (x !== -1) {
                let path = prop.slice(x + 1);
                prop = prop.slice(0, x);
                
                let idx = Number.parseInt(prop);

                if (!Number.isNaN(idx)) {
                    if (idx in target) {
                        return this.getValue(target[idx], path);
                    }
                    else {
                        return undefined;
                    }
                }

                if (prop in target) {
                    return this.getValue(target[prop], path);
                }
                else {
                    return undefined;
                }
            }
            else {
                if (prop in target){
                    return target[prop];
                }
                else {
                    return undefined;
                }
            }
        }
        else {
            if (prop in target) {
                return target[prop];
            }
            else {
                return undefined;
            }
        }
    }

    /**
     * Get a compound value.
     * @param target The object to operate on
     * @param props The property paths separated by &
     * @param operation The operation to perform ('+' is default)
     * @returns Numeric expression or undefined.
     */
    public getCompoundValue<T extends Object>(target: T, props: string | number, operation?: string): number | undefined {
        if (typeof props === 'number') return this.getValue(target, props);

        operation ??= '+';
        let ps = props.split("&");
        let result: number | undefined = undefined;

        for (let key of ps) {
            let val = this.getValue(target, key);

            if (val !== undefined) {
                if (result === undefined) result = val;
                else {
                    result = eval(`${result} ${operation} ${val}`) as number;
                }
            }
        }

        return result;
    }

    /**
     * The inner logic engine for the sorter
     * @param a 
     * @param b 
     * @param props 
     * @param direction 
     * @param null_direction 
     * @returns 
     */
    private numbersComp<T extends Object | Object[]>(a: T, b: T, props: string | number, direction?: 'ascending' | 'descending' | undefined, null_direction?: 'ascending' | 'descending' | undefined, operation?: string) {
        let val1 = this.getCompoundValue(a, props, operation);
        let val2 = this.getCompoundValue(b, props, operation);
        
        if (val1 !== undefined && val2 !== undefined) {
            if (direction === 'descending') {
                return val2 - val1;
            }
            else {
                return val1 - val2;
            }
        }
        else if (val1 !== undefined) {
            return null_direction === 'descending' ? -1 : 1;
        }
        else if (val2 !== undefined) {
            return null_direction === 'descending' ? 1 : -1;
        }
        else {
            return 0;
        }
    }
}
