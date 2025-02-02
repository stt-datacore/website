import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow, prettyCrewColumnTitle } from '../../../components/searchabletable';
import { TranslateMethod } from '../../../model/player';
import { gradeToColor } from '../../../utils/crewutils';

const RankFields = [
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

export const getDataCoreRanksTableConfig = (t: TranslateMethod) => {
	const tableConfig = [] as ITableConfigRow[];
    RankFields.forEach(field => {
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
			{RankFields.slice(1).map(field => {
                let val = 0;
                if (field === 'ship')
                    val = Number((crew.ranks.scores.ship.overall * 10).toFixed(2));
                else
                    val = Number(((crew.ranks.scores[field])).toFixed(2));
                if (typeof val !== 'number') return <></>
                return (<Table.Cell key={`scores.${field}`} textAlign='center'>
                    <span style={{color: gradeToColor(val / 100)}}>
					    {val}
                    </span>
				</Table.Cell>)
			})}
		</React.Fragment>
	)
};

