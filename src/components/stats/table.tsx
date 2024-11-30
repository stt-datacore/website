import React from 'react';
import { Table, Label } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import CONFIG from "../CONFIG";
import { AvatarView } from "../item_presenters/avatarview";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { findHigh, formatElapsedDays, skillIcon } from "./utils";
import { EpochDiff, Highs } from "./model";
import { CrewMember } from '../../model/crew';
import { StatsContext } from './dataprovider';

export interface StatTrendsTableProps {
}

export const StatTrendsTable = (props: StatTrendsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { epochDiffs, allHighs } = statsContext;

    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { playerData } = globalContext.player;

    const gameEpoch = new Date("2016-01-01T00:00:00Z");
    const nowDate = new Date();
    const daysFromEpoch = Math.floor((nowDate.getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const sortAg = (a: EpochDiff, b: EpochDiff, idx: number) => a.aggregates[idx].reduce((p, n) => p + n, 0) - b.aggregates[idx].reduce((p, n) => p + n, 0);
    const tableConfig = [
        { width: 1, column: 'symbol[0]', title: t('stat_trends.columns.recent_crew'), customCompare: (a, b) => sortAg(a, b, 0) },
        { width: 1, column: 'symbol[1]', title: t('stat_trends.columns.prior_crew'), customCompare: (a, b) => sortAg(a, b, 1) },
        {
            width: 1,
            column: 'epoch_day',
            title: t('stat_trends.columns.epoch_day'),
            reverse: true,
            customCompare: (a: EpochDiff, b: EpochDiff) => {
                let r = a.epoch_days[0] - b.epoch_days[0];
                if (!r) r = a.epoch_days[1] - b.epoch_days[1];
                return r;
            }
        },
        { width: 1, column: 'day_diff', title: t('stat_trends.columns.day_diff') },
        { width: 1, column: 'velocity', title: t('stat_trends.columns.velocity') },

    ] as ITableConfigRow[]

    tableConfig.push({
        width: 1,
        column: 'skill_diffs',
        title: t('stat_trends.columns.skill_diffs'),
        customCompare: (a: EpochDiff, b: EpochDiff) => {
            return a.skill_diffs.reduce((p, n) => p + n, 0) - b.skill_diffs.reduce((p, n) => p + n, 0)
        }
    });

    return (<SearchableTable
                config={tableConfig}
                data={epochDiffs}
                renderTableRow={(row, idx) => renderTableRow(row, idx!)}
                filterRow={filterRow}
                />)

    function getOwnedMaxRarity(crew: string | CrewMember) {
        if (!playerData) {
            if (typeof crew === 'string') {
                return globalContext.core.crew.find(f => f.symbol === crew)?.max_rarity
            }
            else {
                return crew.max_rarity;
            }
        }

        if (!(typeof crew === 'string')) crew = crew.symbol;
        let pc = playerData?.player?.character.crew.find(f => f.symbol === crew);
        if (pc) return pc.highest_owned_rarity ?? 0;
        return 0;
    }

    function filterRow(row: any, filter: any, filterType?: string) {
        return true;
    }

    function renderTableRow(diff: EpochDiff, idx: number) {

        const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
        const fhigh = findHigh(diff.epoch_days[0], diff.skills.slice(0, diff.aggregates[0].length), allHighs, diff.rarity);
        const newhigh = fhigh?.epoch_day === diff.epoch_days[0];

        return <Table.Row key={`passIdf_${idx}`} style={{textAlign: 'center'}}>
            {[crews[0], crews[1]].map((crew, idx) => (
                <Table.Cell key={`passIdf_crew_${idx}_${crew}`} style={{textAlign: 'center'}}>
                <div style={flexRow}>
                    <div style={{ ...flexCol, width: '15em'}}>
                        <AvatarView
                            item={{...crew, rarity: getOwnedMaxRarity(crew)}}
                            mode='crew'
                            symbol={crew.symbol}
                            size={64}
                            targetGroup="stat_trends_crew"
                            />
                        <span>
                            {crew.name}
                        </span>
                        {newhigh && !idx && <Label style={{margin: '0.5em 0'}} color='blue'>{t('stat_trends.new_high')}</Label>}
                        <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                            {diff.skills.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                        </div>
                        <i>({t('stat_trends.released_duration_ago', {
                            duration: formatElapsedDays((daysFromEpoch - diff.epoch_days[idx]), t)
                        })})</i>
                    </div>
                </div>
                </Table.Cell>
            ))}
            <Table.Cell>
                {diff.epoch_days[0].toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {formatElapsedDays(diff.day_diff, t)}
                {diff.day_diff > 7 && <><br />({t('duration.n_days', { days: diff.day_diff.toLocaleString() })})</>}
            </Table.Cell>
            <Table.Cell>
                {!diff.day_diff ? 'N/A' : ''}
                {!!diff.day_diff ? diff.velocity.toFixed(2) : ''}
            </Table.Cell>
            {<Table.Cell>
            <div style={flexRow}>
                {diff.skill_diffs.map((n, idx) => {
                    return <div style={flexCol}>
                        <img src={`${skillIcon(diff.skills[idx])}`} style={{height: '1em'}} />
                        <span>{CONFIG.SKILLS_SHORT.find(sk => sk.name === diff.skills[idx])?.short}</span>
                        <span>{n}</span>
                    </div>
                })}
            </div>
            </Table.Cell>}
        </Table.Row>

    }

}
