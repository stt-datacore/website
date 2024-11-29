import React from 'react';
import { Table, Label } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import CONFIG from "../CONFIG";
import { AvatarView } from "../item_presenters/avatarview";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { PassDiff, Highs, findHigh, skillIcon } from "./model";
import { CrewMember } from '../../model/crew';

export interface StatTrendsTableProps {
    passDiffs: PassDiff[];
    allHighs: Highs[];
    skillKey: string;
}

export const StatTrendsTable = (props: StatTrendsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { playerData } = globalContext.player;
    const { passDiffs, allHighs, skillKey } = props;

    const gameEpoch = new Date("2016-01-01T00:00:00Z");
    const nowDate = new Date();
    const daysFromEpoch = Math.floor((nowDate.getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const sortAg = (a: PassDiff, b: PassDiff, idx: number) => a.aggregates[idx].reduce((p, n) => p + n, 0) - b.aggregates[idx].reduce((p, n) => p + n, 0);
    const tableConfig = [
        { width: 1, column: 'symbol[0]', title: t('stat_trends.columns.recent_crew'), customCompare: (a, b) => sortAg(a, b, 0) },
        { width: 1, column: 'symbol[1]', title: t('stat_trends.columns.prior_crew'), customCompare: (a, b) => sortAg(a, b, 1) },
        {
            width: 1,
            column: 'epoch_day',
            title: t('stat_trends.columns.epoch_day'),
            customCompare: (a: PassDiff, b: PassDiff) => {
                let r = a.epoch_days[0] - b.epoch_days[0];
                if (!r) r = a.epoch_days[1] - b.epoch_days[1];
                return r;
            }
        },
        { width: 1, column: 'day_diff', title: t('stat_trends.columns.day_diff') },
        { width: 1, column: 'velocity', title: t('stat_trends.columns.velocity') },

    ] as ITableConfigRow[]
    if (skillKey) {
        tableConfig.push({
            width: 1,
            column: 'skill_diffs',
            title: t('stat_trends.columns.skill_diffs'),
            customCompare: (a: PassDiff, b: PassDiff) => {
                return a.skill_diffs.reduce((p, n) => p + n, 0) - b.skill_diffs.reduce((p, n) => p + n, 0)
            }
        });
    }
    return (<SearchableTable
                config={tableConfig}
                data={passDiffs}
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

    function renderTableRow(diff: PassDiff, idx: number) {

        const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
        const fhigh = findHigh(diff.epoch_days[0], skillKey ? diff.skills.slice(0, diff.aggregates[0].length) : [], allHighs, !skillKey);
        const newhigh = fhigh?.epoch_day === diff.epoch_days[0];

        return <Table.Row key={`passIdf_${idx}`}>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView
                        item={{...crews[0], rarity: getOwnedMaxRarity(crews[0])}}
                        mode='crew'
                        symbol={diff.symbols[0]}
                        size={64}
                        targetGroup="stat_trends_crew"
                        />
                    <span>
                        {crews[0].name}
                    </span>
                    {newhigh && <Label style={{margin: '0.5em 0'}} color='blue'>{t('stat_trends.new_high')}</Label>}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[0].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>({t('stat_trends.released_n_days_ago', {
                        n: (daysFromEpoch - diff.epoch_days[0]).toLocaleString()
                    })})</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView
                        item={{...crews[1], rarity: getOwnedMaxRarity(crews[1])}}
                        mode='crew'
                        symbol={diff.symbols[1]}
                        size={64}
                        targetGroup="stat_trends_crew"
                        />
                    {crews[1].name}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[1].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>({t('stat_trends.released_n_days_ago', {
                        n: (daysFromEpoch - diff.epoch_days[1]).toLocaleString()
                    })})</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell>
                {diff.epoch_days[0].toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {t('duration.n_days', { days: diff.day_diff.toLocaleString() })}
            </Table.Cell>
            <Table.Cell>
                {diff.velocity.toFixed(4)}
            </Table.Cell>
            {!!skillKey && <Table.Cell>
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
