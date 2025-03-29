import React from 'react';
import { Table, Label, Checkbox } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import CONFIG from "../../CONFIG";
import { AvatarView } from "../../item_presenters/avatarview";
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { canGauntlet, canShuttle, canVoyage, dateToEpoch, filterEpochDiffs, filterHighs, findHigh, formatElapsedDays, GameEpoch, OptionsPanelFlexColumn, OptionsPanelFlexRow, skillIcon } from "../utils";
import { EpochDiff, Highs } from "../model";
import { CrewMember } from '../../../model/crew';
import { StatsContext } from '../dataprovider';
import { useStateWithStorage } from '../../../utils/storage';
import SearchString from 'search-string/src/searchString';
import { crewMatchesSearchFilter } from '../../../utils/crewsearch';

export interface StatTrendsTableProps {
    prefilteredHighs?: Highs[];
    prefilteredDiffs?: EpochDiff[];
}

export const StatTrendsTable = (props: StatTrendsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { prefilteredDiffs, prefilteredHighs } = props;
    const { epochDiffs: outerDiffs, allHighs: outerHighs, filterConfig } = statsContext;
    const [epochDiffs, setEpochDiffs] = React.useState<EpochDiff[]>([]);
    const [allHighs, setAllHighs] = React.useState<Highs[]>([]);
    const [exactOnly, setExactOnly] = useStateWithStorage('stat_trends_table_exact_skil_order_only', false, { rememberForever: true });
    const [newHighOnly, setNewHighOnly] = useStateWithStorage('stat_trends_table_new_high_only', false, { rememberForever: true });

    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { playerData } = globalContext.player;

    React.useEffect(() => {
        if (prefilteredDiffs) {
            setEpochDiffs(prefilteredDiffs);
        }
        else {
            setEpochDiffs(filterEpochDiffs(filterConfig, outerDiffs));
        }
    }, [outerDiffs, prefilteredDiffs, filterConfig]);

    React.useEffect(() => {
        if (prefilteredHighs) {
            setAllHighs(prefilteredHighs);
        }
        else {
            setAllHighs(filterHighs(filterConfig, outerHighs));
        }
    }, [outerHighs, prefilteredHighs, filterConfig]);

    React.useEffect(() => {
        if (epochDiffs?.length) {
            setEpochDiffs([...epochDiffs]);
        }
    }, [exactOnly]);

    const nowDate = new Date();
    const daysFromEpoch = dateToEpoch();

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const sortAg = (a: EpochDiff, b: EpochDiff, idx: number) => a.aggregates[idx].reduce((p, n) => p + n, 0) - b.aggregates[idx].reduce((p, n) => p + n, 0);
    const tableConfig = [
        { width: 3, column: 'symbol[0]', title: t('stat_trends.columns.recent_crew'), customCompare: (a, b) => sortAg(a, b, 0) },
        { width: 3, column: 'symbol[1]', title: t('stat_trends.columns.prior_crew'), customCompare: (a, b) => sortAg(a, b, 1) },
        {
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
        width: 3,
        column: 'skill_diffs',
        title: t('stat_trends.columns.skill_diffs'),
        customCompare: (a: EpochDiff, b: EpochDiff) => {
            return a.skill_diffs.reduce((p, n) => p + n, 0) - b.skill_diffs.reduce((p, n) => p + n, 0)
        }
    });

    return (
        <div style={{...flexCol, alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', overflowX: 'auto' }}>
            <div style={flexRow}>
                <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1em', margin: '1em 0'}}>
                    <Checkbox label={t('stat_trends.exact_skill_order_only')}
                        checked={exactOnly}
                        onChange={(e, { checked }) => setExactOnly(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.new_highs_only')}
                        checked={newHighOnly}
                        onChange={(e, { checked }) => setNewHighOnly(!!checked) }
                    />
                </div>
            </div>
            <SearchableTable
                config={tableConfig}
                data={epochDiffs}
                renderTableRow={(row, idx) => renderTableRow(row, idx!)}
                filterRow={filterRow}
                />
        </div>)

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

    function filterRow(row: EpochDiff, filters: SearchString[], filterType?: string) {

        if (exactOnly) {
            let pass = row.crew[0].skill_order.join("") === row.crew[1].skill_order.join("") &&
                row.skills.join() === row.crew[0].skill_order.join();
            if (!pass) return false;
        }

        if (newHighOnly) {
            const fhigh = findHigh(row.epoch_days[0], row.skills.slice(0, row.aggregates[0].length), allHighs, row.rarity);
            const newhigh = fhigh?.epoch_day === row.epoch_days[0];
            if (!newhigh) return false;
        }

        if (filters?.length) {
            return row.crew.some(c => crewMatchesSearchFilter(c, filters, filterType));
        }

        return true;
    }

    function renderTableRow(diff: EpochDiff, idx: number) {

        const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
        const fhigh = findHigh(diff.epoch_days[0], diff.skills.slice(0, diff.aggregates[0].length), allHighs, diff.rarity);
        const newhigh = fhigh?.epoch_day === diff.epoch_days[0];

        return <Table.Row key={`passIdf_${idx}`} style={{textAlign: 'center'}}>
            {[crews[0], crews[1]].map((crew, idx) => {
                    const daydiff = daysFromEpoch - diff.epoch_days[idx];

                    return (
                        <Table.Cell key={`passIdf_crew_${idx}_${crew}`} style={{textAlign: 'center'}}>
                        <div style={{...flexRow, margin: '1em 0.5em', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
                            <div style={{...flexCol, width: '10em'}}>
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
                                {!crew.preview && <>
                                    {daydiff > 1 && <i>({t('stat_trends.released_duration_ago', {
                                    duration: formatElapsedDays(daydiff, t)
                                })})</i>}
                                {daydiff === 1 && <i>({t('stat_trends.released_duration', {
                                    duration: formatElapsedDays(daydiff, t, true)
                                })})</i>}
                                {!daydiff && <i>({t('stat_trends.released_duration', {
                                    duration: formatElapsedDays(0, t, true)
                                })})</i>}
                                </>}

                                {!!crew.preview && <i>({t('global.pending_release')})</i>}

                                <div style={flexRow}>
                                    {canGauntlet(diff.crew[idx]) && <img src={`/media/gauntlet.png`} style={{height: '24px'}} />}
                                    {canVoyage(diff.crew[idx]) && <img src={`/media/voyage.png`} style={{height: '24px'}} />}
                                    {canShuttle(diff.crew[idx]) && <img src={`/media/faction.png`} style={{height: '24px'}} />}
                                </div>

                            </div>
                        </div>
                        </Table.Cell>
                    )}
                )}
            <Table.Cell>
                {diff.epoch_days[0].toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {formatElapsedDays(diff.day_diff, t)}
                {diff.day_diff > 7 && <><br />({t('duration.n_days', { days: diff.day_diff.toLocaleString() })})</>}
            </Table.Cell>
            <Table.Cell>
                {!diff.day_diff ? 'N/A' : ''}
                {!!diff.day_diff && <span style={{color: diff.velocity < 0 ? 'orange' : 'lightgreen'}}>{diff.velocity.toFixed(2)}</span>}
            </Table.Cell>
            {<Table.Cell>
            <div style={flexRow}>
                {diff.skill_diffs.map((n, idx) => {
                    return <div style={flexCol}>
                        <img src={`${skillIcon(diff.skills[idx])}`} style={{height: '1em'}} />
                        <span>{CONFIG.SKILLS_SHORT.find(sk => sk.name === diff.skills[idx])?.short}</span>
                        <span style={{color: n < 0 ? 'orange' : 'lightgreen'}}>{n}</span>
                    </div>
                })}
            </div>
            </Table.Cell>}
        </Table.Row>

    }

}
