


export type AlertMode = 'crew' | 'item' | 'ship' | 'any';

export type AlertItemType = 'crew' | 'item' | 'ship';

export interface AlertItem {
    symbol: string;
    type: AlertItemType;
}
export interface IAlert {
    name: string;
    trigger_once: boolean;
    active: boolean;
    items: AlertItem[];
}
