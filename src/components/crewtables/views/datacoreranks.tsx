import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import { TranslateMethod } from '../../../model/player';
import { gradeToColor } from '../../../utils/crewutils';
import { formatShipScore } from '../../ship/utils';
import { GlobalContext } from '../../../context/globalcontext';
import CABExplanation from '../../explanations/cabexplanation';
import { CurrentWeighting } from '../../../model/crew';
import { getElevatedBuckets } from '../../../utils/gauntlet';
import { renderElevatedCritTable } from '../../gauntlet/sharedutils';

const ScoreFields = [
    "overall",
    "cab",
    "rarity_overall",
    "voyage",
    "voyage_plus",
    "shuttle",
    "shuttle_plus",
    "gauntlet",
    "gauntlet_plus",
    "greatness",
    "crit",
    "ship",
    "quipment",
    "collections",
    "trait",
    "main_cast",
    "variant",
    "potential_cols",
    "skill_positions",
    "skill_rarity",
    "am_seating",
    "primary_rarity",
    "tertiary_rarity",
    "velocity",
    "sko_absolute",
    "sko_ambivalent"
]

const RankFields = [
    "overall_rank",
    "cab",
    "rarity_overall_rank",
    "voyRank",
    "voyage_plus_rank",
    "shuttleRank",
    "shuttle_plus_rank",
    "gauntletRank",
    "gauntlet_plus_rank",
    "greatness_rank",
    "crit_rank",
    "ship_rank",
    "quipment_rank",
    "collections_rank",
    "traitRank",
    "main_cast_rank",
    "variant_rank",
    "potential_cols_rank",
    "skill_positions_rank",
    "skill_rarity_rank",
    "am_seating_rank",
    "primary_rarity_rank",
    "tertiary_rarity_rank",
    "velocity_rank",
    "sko_absolute_rank",
    "sko_ambivalent_rank"
]

export const getDataCoreRanksTableConfig = (weights: CurrentWeighting, t: TranslateMethod, rarityFilter?: number[]) => {
	const tableConfig = [] as ITableConfigRow[];
    const rarity = rarityFilter?.length === 1 ? rarityFilter[0] : 5;
    let sorter = ScoreFields.slice(3).sort((a, b) => {
        if (typeof weights[rarity][a] !== 'number' && typeof weights[rarity][b] !== 'number') {
            return 0;
        }
        else if (typeof weights[rarity][a] !== 'number') {
            return 1;
        }
        else if (typeof weights[rarity][b] !== 'number') {
            return -1;
        }
        if (weights[rarity][a] && weights[rarity][b]) {
            return weights[rarity][b] - weights[rarity][a];
        }
        return 0;
    });
    sorter = [ ...ScoreFields.slice(0, 3), ... sorter];
    sorter.forEach(field => {
        if (field === 'cab') {
            tableConfig.push(
                { width: 1, column: 'cab_ov', title: <span>{t('base.cab_power')} <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
            )
        }
        else {
            tableConfig.push({
                width: 1,
                column: `ranks.scores.${field}`,
                title: t(`rank_names.scores.${field}`),
                reverse: true
            });
            if (field === 'ship') {
                tableConfig[tableConfig.length - 1].customCompare = ((a: IRosterCrew, b: IRosterCrew) => {
                    return a.ranks.scores.ship.overall - b.ranks.scores.ship.overall
                });
            }
            else {
                tableConfig[tableConfig.length - 1].customCompare = ((a: IRosterCrew, b: IRosterCrew) => {
                    return a.ranks.scores[field] - b.ranks.scores[field] || b.ranks[`${field}_rank`] - a.ranks[`${field}_rank`] || a.max_rarity - b.max_rarity;
                });
            }
        }
	});
	return tableConfig;
};

type CrewRankCellsProps = {
	crew: IRosterCrew;
    weights: CurrentWeighting;
    rarityFilter?: number[];
    critExpanded?: string;
    setCritExpanded: (value?: string) => void;
};

export const CrewDataCoreRankCells = (props: CrewRankCellsProps) => {
	const { crew, weights, rarityFilter, critExpanded, setCritExpanded } = props;
    const rarity = rarityFilter?.length === 1 ? rarityFilter[0] : 5;
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const { gauntlets } = globalContext.core;
    const datacoreColor = crew.ranks.scores?.overall ? gradeToColor(crew.ranks.scores.overall / 100) ?? undefined : undefined;
	const dcGradeColor = crew.ranks.scores?.overall_grade ? gradeToColor(crew.ranks.scores.overall_grade) ?? undefined : undefined;
    const rarityLabels = CONFIG.RARITIES.map(m => m.name);
    const gradeColor = gradeToColor(crew.cab_ov_grade) ?? undefined;
    const cabColor = gradeToColor(Number(crew.cab_ov) / 16) ?? undefined;

    const isExpanded = React.useMemo(() => {
        return critExpanded === crew.symbol;
    }, [critExpanded, crew]);

    let sortedFields = ScoreFields.slice(3).sort((a, b) => {
        if (typeof weights[rarity][a] !== 'number' && typeof weights[rarity][b] !== 'number') {
            return 0;
        }
        else if (typeof weights[rarity][a] !== 'number') {
            return 1;
        }
        else if (typeof weights[rarity][b] !== 'number') {
            return -1;
        }
        if (weights[rarity][a] && weights[rarity][b]) {
            return weights[rarity][b] - weights[rarity][a];
        }
        return 0;
    });

    sortedFields = [ ...ScoreFields.slice(0, 3), ... sortedFields];
    const sortedRanks = [] as string[];

    for (let key of sortedFields) {
        let x = ScoreFields.indexOf(key);
        sortedRanks.push(RankFields[x]);
    }

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
            <b style={{color: datacoreColor}}>{crew.ranks.scores?.overall ?? 0}</b><br />
				<small><span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>{rarityLabels[crew.max_rarity]}</span><br />{crew.ranks.scores?.overall_rank ? "#" + crew.ranks.scores.overall_rank : "?" }</small>
				<small style={{color: dcGradeColor}}>&nbsp;&nbsp;&nbsp;&nbsp;{crew.ranks.scores?.overall_grade ? crew.ranks.scores?.overall_grade : "?" }</small>
			</Table.Cell>
            <Table.Cell textAlign='center'>
                <b style={{color: cabColor}}>{crew.cab_ov}</b><br />
                <small>
                    <span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>
                        {rarityLabels[crew.max_rarity]}
                    </span>
                    <br />
                    {crew.cab_ov_rank ? "#" + crew.cab_ov_rank : "?" }
                </small>
                <small style={{color: gradeColor}}>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {crew.cab_ov_grade ? crew.cab_ov_grade : "?" }
                </small>
            </Table.Cell>
			{sortedFields.slice(2).map((field, idx) => {
                let val = 0;
                let rank = 0;
                if (field === 'ship') {
                    val = Number((crew.ranks.scores.ship.overall).toFixed(4));
                    rank = crew.ranks.scores.ship.overall_rank;
                }
                else {
                    val = Number(((crew.ranks.scores[field])).toFixed(4));
                    rank = crew.ranks[sortedRanks[idx + 2]] || crew.ranks.scores[sortedRanks[idx + 2]];
                }
                if (typeof val !== 'number') return <></>

                return (<Table.Cell key={`scores.${field}`} textAlign='center'
                    style={getCellStyle(field)}
                    onClick={() => clickCell(field)}
                >
                    {(field !== 'crit' || !isExpanded) && (<>
                        <span style={{color: gradeToColor(val / 100)}}>
                            {field === 'ship' && !!crew.ranks.scores.ship && formatShipScore(crew.ranks.scores.ship?.kind, crew.ranks.scores.ship.overall, t)}
                            {field !== 'ship' && val}
                        </span>
                        <p style={{fontSize: '0.8em'}}>
                            #{rank}
                        </p>
                    </>)}
                    {field === 'crit' && isExpanded && (drawCritTable())}
				</Table.Cell>)
			})}
		</React.Fragment>
	);

    function drawCritTable() {
        const buckets = getElevatedBuckets(crew, gauntlets, TRAIT_NAMES);
        return renderElevatedCritTable(crew, buckets, t);
    }

    function getCellStyle(field: string) {
        if (field !== 'crit') return undefined;
        if (critExpanded) return { cursor: 'zoom-out' };
        return { cursor: 'zoom-in' };

    }

    function clickCell(field: string) {
        if (field !== 'crit') return;
        if (critExpanded === crew.symbol) {
            setCritExpanded(undefined);
        }
        else {
            setCritExpanded(crew.symbol);
        }
    }
};

