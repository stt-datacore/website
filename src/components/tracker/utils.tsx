export type ResourceViewMode = 'resource' | 'update';

export interface ResourceData {
    resource: string,
    amount: number,
    moving_average: number,
    difference: number,
    timestamp: Date,
    average_difference: number,
    total_difference: number
    amount_pct: number,
    change_pct: number,
    total_change_pct: number
}

export const transKeys = {
    money: 'credits',
    premium_purchasable: 'dilithium',
    honor: 'honor',
    premium_earnable: 'merits',
    shuttle_rental_tokens: 'shuttle_token',
    chrons: 'chronitons',
    ism: 'ism',
    quantum: 'quantum',

}