import React from 'react';
import { printISM, printCredits, printDilithium, printHonor, printMerits, printChrons, printQuantum } from '../retrieval/context';
import { TranslateMethod } from '../../model/player';
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
    total_change_pct: number,
    day: string,
    week: string
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

export function printResourceValue(row: ResourceData, t?: TranslateMethod, label?: boolean) {
    if (row.resource === 'ism') {
        return (
            printISM(row.amount, t, label)
        );
    }
    else if (row.resource === 'money') {
        return (
            printCredits(row.amount, t, label)
        );
    }
    else if (row.resource === 'premium_purchasable') {
        return (
            printDilithium(row.amount, t, label)
        );
    }
    else if (row.resource === 'honor') {
        return (
            printHonor(row.amount, t, label)
        );
    }
    else if (row.resource === 'premium_earnable') {
        return (
            printMerits(row.amount, t, label)
        );
    }
    else if (row.resource === 'shuttle_rental_tokens') {
        if (t && label) {
            return (
                <>{(row.amount)} {t(`global.item_types.${transKeys[row.resource]}`)}</>
            );
        }

        return (
            <>{(row.amount)}</>
        );
    }
    else if (row.resource === 'chrons') {
        return (
            printChrons(row.amount, t, label)
        );
    }
    else if (row.resource === 'quantum') {
        return (
            printQuantum(row.amount, t, label)
        );
    }
    else {
        if (t && label) {
            return (
                <>{(row.amount)} {t(`global.item_types.${transKeys[row.resource]}`)}</>
            );
        }
        else {
            return (
                <>{(row.amount)}</>
            );
        }
    }
}

export function resVal(value: number) {
    if (value < 1) return Math.ceil(value * 100);
    return value;
}


export function printTipRecord(rec: ResourceData, t: TranslateMethod) {

    return (
        <div
            className='ui segment'
            style={{
                display: 'grid',
                gridTemplateAreas: `'left1 right1' 'left2 right2' 'left3 right3'`,
                gap: '1em'
            }}
            >
            <div style={{gridArea:'left1'}}>
                {printResourceValue(rec, t, true)}
            </div>
            <div style={{gridArea: 'right1'}}>
                {rec.timestamp.toLocaleString()}
            </div>
            <div style={{gridArea: 'left2'}}>
                {t('resource_tracker.graphs.view.change_pct{{:}}')}
            </div>
            <div style={{gridArea: 'right2'}}>
                {(rec.change_pct * 100).toFixed(2)}%
            </div>
            <div style={{gridArea: 'left3'}}>
                {t('resource_tracker.graphs.view.total_change_pct{{:}}')}
            </div>
            <div style={{gridArea: 'right3'}}>
                {(rec.total_change_pct * 100).toFixed(2)}%
            </div>
        </div>
    )
}