
import React from 'react';
import { gradeToColor } from '../../utils/crewutils';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { TranslateMethod } from '../../model/player';

export function formatShipScore(kind: string, score: number | undefined, t: TranslateMethod, divisor = 100) {
    if (!score) return <></>;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    kind = kind.slice(0, 1).toLowerCase();
    let clr = undefined as string | undefined;
    if (kind === 'd') clr = 'dodgerblue';
    else if (kind === 'o') clr = 'lightcoral';
    if (kind === 's') {
        return <div style={{...flexCol, justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left'}}>
            <span style={{color: clr, fontWeight: 'bold'}}>{t(`rank_names.advantage.${kind}`)}</span>
            <span style={{color: gradeToColor(score / divisor) || undefined}}>{Number(score.toFixed(4))}</span>
        </div>
    }
    else {
        return <div style={{...flexRow, justifyContent: 'space-between'}}>
            <span style={{color: clr, fontWeight: 'bold'}}>{t(`rank_names.advantage.${kind}`)}</span>
            <span style={{color: gradeToColor(score / divisor) || undefined}}>{Number(score.toFixed(4))}</span>
        </div>
    }

}
