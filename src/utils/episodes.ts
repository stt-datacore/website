import { MissionChallenge, Quest } from "../model/missions";

export function getEpisodeName(node: any) {
    let name = '';
    if (node.episode > 0) {
        name = `Episode ${node.episode} - `;
    }
    if (node.cadet) {
        name = 'Cadet - ';
    }
    if (name.length === 0) {
        name = 'Distress Call - ';
    }
    name += node.name || node.episode_title;
    return name;
}

export interface NavMapItem {
    id: number;
    challenge: MissionChallenge;
    stage: number;
    parent?: number;    
    parents?: number[];
    children?: number[];
}


export function makeNavMap(quest: Quest): NavMapItem[] {


    function _internalMakeNavMap(quest: Quest, startId?: number, currentStage?: number, parent?: NavMapItem, currentData?: NavMapItem[]): NavMapItem[] {
        currentData ??= [];
        startId ??= 0;
        currentStage ??= 0;

        if (!quest.challenges?.length || quest.challenges.length - 1 < startId) return currentData;
        let ch = quest.challenges?.find(f => f.id === startId);
        if (!ch) return currentData;

        const item = {
            id: ch.id,
            stage: currentStage,
            challenge: ch,
            parent: parent?.id
        } as NavMapItem;

        currentData.push(item);

        if (item.challenge.children?.length) {
            for (let n of item.challenge.children) {
                currentData = _internalMakeNavMap(quest, n, currentStage + 1, item, currentData);
            }       
        }

        return currentData;
    }


    let map = _internalMakeNavMap(quest);
    map.sort((a, b) => {
        let r = a.stage - b.stage;
        if (r) return r;
        if (a.parent !== undefined && b.parent === undefined) return 1;
        else if (a.parent === undefined && b.parent !== undefined) return -1;
        else if (a.parent !== undefined && b.parent !== undefined) {
            r = a.parent - b.parent;
        }
        if (!r) r = a.id - b.id;
        return r;
    });

    let fmap = [] as NavMapItem[];

    for (let item of map) {
        let found = fmap.find(t => t.id === item.id && t.stage === item.stage);
        if (found && item.parent !== undefined) {
            found.parents ??= [];
            if (item.parent !== found.parent && !found.parents.includes(item.parent)) {
                found.parents.push(item.parent);
            }                    
        }
        else {
            if (item.parent !== undefined) {
                item.parents = [item.parent];
            }
            fmap.push(item);
        }
    }

    fmap.forEach(item => {
        delete item.parent;
        let items = fmap.filter(ch => ch.parents?.includes(item.id));
        if (items?.length) {
            item.children = items.map(i => i.id);
        }
    });

    return fmap;
}

// class Iterator<T> extends Array<T> {

//     private _iter: number = -1;

//     constructor(items: T[]) {
//         super();
//         items.forEach((item) => this.push(item));
//     }

//     reset() {
//         this._iter = -1;
//     }

//     next() {
//         this._iter++;
//     }

//     current() {
//         if (this._iter < 0 || this._iter > length) return undefined;
//         return this[this._iter];
//     }
    
//     nextCurrent() {
//         this.next();
//         return this.current();
//     }
// }

export interface PathInfo {
    ids: number[];
    path: string;
}

export function getNode(item: NavMapItem, stack: NavMapItem[], parentStack?: NavMapItem[]): PathInfo[] {

    parentStack ??= [];
    parentStack.push(item);
    
    if (!item.children?.length) {
        return [{
            ids: parentStack.map(p => p.id),
            path: parentStack.map(p => p.id).join("_")
        }]
    }
    else {
        let stacks = [] as PathInfo[];
        for (let n of item.children) {
            let child = stack.find(s => s.id === n);
            if (child) {
                let result = getNode(child, stack, [ ...parentStack ]);
                stacks = stacks.concat(result);
            }
            
        }
        return stacks;        
    }    
}