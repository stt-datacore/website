import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow, prettyCrewColumnTitle } from '../../../components/searchabletable';
import { TranslateMethod } from '../../../model/player';
import { gradeToColor } from '../../../utils/crewutils';
import { formatShipScore } from '../../ship/utils';
import { GlobalContext } from '../../../context/globalcontext';
import CABExplanation from '../../explanations/cabexplanation';

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
]

export const getDataCoreRanksTableConfig = (t: TranslateMethod) => {
	const tableConfig = [] as ITableConfigRow[];
    ScoreFields.forEach(field => {
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
};

export const CrewDataCoreRankCells = (props: CrewRankCellsProps) => {
	const { crew } = props;
    const { t } = React.useContext(GlobalContext).localized;
    const datacoreColor = crew.ranks.scores?.overall ? gradeToColor(crew.ranks.scores.overall / 100) ?? undefined : undefined;
	const dcGradeColor = crew.ranks.scores?.overall_grade ? gradeToColor(crew.ranks.scores.overall_grade) ?? undefined : undefined;
    const rarityLabels = CONFIG.RARITIES.map(m => m.name);
    const gradeColor = gradeToColor(crew.cab_ov_grade) ?? undefined;
    const cabColor = gradeToColor(Number(crew.cab_ov) / 16) ?? undefined;

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
			{ScoreFields.slice(2).map((field, idx) => {
                let val = 0;
                let rank = 0;
                if (field === 'ship') {
                    val = Number((crew.ranks.scores.ship.overall).toFixed(4));
                    rank = crew.ranks.scores.ship.overall_rank;
                }
                else {
                    val = Number(((crew.ranks.scores[field])).toFixed(4));
                    rank = crew.ranks[RankFields[idx + 2]] || crew.ranks.scores[RankFields[idx + 2]];
                }
                if (typeof val !== 'number') return <></>

                return (<Table.Cell key={`scores.${field}`} textAlign='center'>
                    <span style={{color: gradeToColor(val / 100)}}>
                        {field === 'ship' && !!crew.ranks.scores.ship && formatShipScore(crew.ranks.scores.ship?.kind, crew.ranks.scores.ship.overall, t)}
					    {field !== 'ship' && val}
                    </span>
                    <p style={{fontSize: '0.8em'}}>
                        #{rank}
                    </p>
				</Table.Cell>)
			})}
		</React.Fragment>
	)
};

