
import React from 'react';
import { gradeToColor } from '../../utils/crewutils';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { TranslateMethod } from '../../model/player';

export const SHIP_OFFENSE_COLOR = 'lightcoral';
export const SHIP_DEFENSE_COLOR = 'dodgerblue';

export function formatShipScore(kind: string, score: number | undefined, t: TranslateMethod, divisor = 100, styles?: React.CSSProperties, separator?: string | JSX.Element) {
    if (!score) return <></>;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    kind = kind.slice(0, 1).toLowerCase();
    let clr = undefined as string | undefined;
    if (kind === 'd') clr = SHIP_DEFENSE_COLOR;
    else if (kind === 'o') clr = SHIP_OFFENSE_COLOR;
    if (kind === 's') {
        return <div style={{...flexCol, justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', ...styles}}>
            <span style={{color: clr, fontWeight: 'bold'}}>{t(`rank_names.advantage.${kind}`)}</span>
            {!!separator && <span>{separator}</span>}
            <span style={{color: gradeToColor(score / divisor) || undefined}}>{Number(score.toFixed(4))}</span>
        </div>
    }
    else {
        return <div style={{...flexRow, justifyContent: 'space-between', ...styles}}>
            <span style={{color: clr, fontWeight: 'bold'}}>{t(`rank_names.advantage.${kind}`)}</span>
            {!!separator && <span>{separator}</span>}
            <span style={{color: gradeToColor(score / divisor) || undefined}}>{Number(score.toFixed(4))}</span>
        </div>
    }

}
