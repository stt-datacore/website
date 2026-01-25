import React from 'react';
import { printISM, printCredits, printDilithium, printHonor, printMerits, printChrons, printQuantum } from '../retrieval/context';
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

export function printResourceValue(row: ResourceData) {
    if (row.resource === 'ism') {
        return (
            printISM(row.amount)
        );
    }
    else if (row.resource === 'money') {
        return (
            printCredits(row.amount)
        );
    }
    else if (row.resource === 'premium_purchasable') {
        return (
            printDilithium(row.amount)
        );
    }
    else if (row.resource === 'honor') {
        return (
            printHonor(row.amount)
        );
    }
    else if (row.resource === 'premium_earnable') {
        return (
            printMerits(row.amount)
        );
    }
    else if (row.resource === 'shuttle_rental_tokens') {
        return (
            <>{(row.amount)}</>
        );
    }
    else if (row.resource === 'chrons') {
        return (
            printChrons(row.amount)
        );
    }
    else if (row.resource === 'quantum') {
        return (
            printQuantum(row.amount)
        );
    }
    else {
        return (
            <>{(row.amount)}</>
        );
    }
}

export function resVal(value: number) {
    if (value < 1) return Math.ceil(value * 100);
    return value;
}