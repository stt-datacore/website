import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow, prettyCrewColumnTitle } from '../../../components/searchabletable';
import { TranslateMethod } from '../../../model/player';
import { gradeToColor } from '../../../utils/crewutils';
import { formatShipScore } from '../../ship/utils';
import { GlobalContext } from '../../../context/globalcontext';

const ScoreFields = [
    "overall",
    "rarity_overall",
    "voyage",
    "shuttle",
    "gauntlet",
    "crit",
    "ship",
    "quipment",
    "collections",
    "trait",
    "main_cast",
    "potential_cols",
    "skill_rarity",
    "am_seating",
    "tertiary_rarity",
    "velocity",
]

const RankFields = [
    "overall_rank",
    "rarity_overall_rank",
    "voyRank",
    "shuttleRank",
    "gauntletRank",
    "crit_rank",
    "ship_rank",
    "quipment_rank",
    "collections_rank",
    "traitRank",
    "main_cast_rank",
    "potential_cols_rank",
    "skill_rarity_rank",
    "am_seating_rank",
    "tertiary_rarity_rank",
    "velocity_rank",
]

export const getDataCoreRanksTableConfig = (t: TranslateMethod) => {
	const tableConfig = [] as ITableConfigRow[];
    ScoreFields.forEach(field => {
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

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
            <b style={{color: datacoreColor}}>{crew.ranks.scores?.overall ?? 0}</b><br />
				<small><span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>{rarityLabels[crew.max_rarity]}</span><br />{crew.ranks.scores?.overall_rank ? "#" + crew.ranks.scores.overall_rank : "?" }</small>
				<small style={{color: dcGradeColor}}>&nbsp;&nbsp;&nbsp;&nbsp;{crew.ranks.scores?.overall_grade ? crew.ranks.scores?.overall_grade : "?" }</small>
			</Table.Cell>
			{ScoreFields.slice(1).map((field, idx) => {
                let val = 0;
                let rank = 0;
                if (field === 'ship') {
                    val = Number((crew.ranks.scores.ship.overall).toFixed(4));
                    rank = crew.ranks.scores.ship.overall_rank;
                }
                else {
                    val = Number(((crew.ranks.scores[field])).toFixed(4));
                    rank = crew.ranks[RankFields[idx + 1]] || crew.ranks.scores[RankFields[idx + 1]];
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

