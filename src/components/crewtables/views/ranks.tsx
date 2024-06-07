import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow, prettyCrewColumnTitle } from '../../../components/searchabletable';

export const getRanksTableConfig = (gameMode: string) => {
	const tableConfig = [] as ITableConfigRow[];
	if (gameMode === 'gauntlet')
		tableConfig.push({ width: 1, column: 'ranks.gauntletRank', title: 'Gauntlet' });
	if (gameMode === 'voyage')
		tableConfig.push({ width: 1, column: 'ranks.voyRank', title: 'Voyage' });
	const prefix =  gameMode === 'gauntlet' ? 'G_' : 'V_';
	getRankKeysList().forEach(rank => {
		tableConfig.push({
			width: 1,
			column: `ranks.${prefix}${rank}`,
			title: prettyCrewColumnTitle(`ranks.${prefix}${rank}`)
		});
	});
	return tableConfig;
};

type CrewRankCellsProps = {
	crew: IRosterCrew;
	prefix: string;
};

export const CrewRankCells = (props: CrewRankCellsProps) => {
	const { crew, prefix } = props;
	const totalRank = prefix === 'G_' ? 'gauntletRank' : 'voyRank';	
	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				#{crew.ranks[totalRank]}
			</Table.Cell>
			{getRankKeysList().map(rank => (
				<Table.Cell key={`${prefix}${rank}`} textAlign='center'>
					{crew.ranks[`${prefix}${rank}`]}
				</Table.Cell>
			))}
		</React.Fragment>
	)
};

const getRankKeysList = () => {
	const rankKeys = [] as string[];
	for (let i = 0; i < 6; i++) {
		for (let j = i + 1; j < 6; j++) {
			rankKeys.push(`${CONFIG.SKILLS_SHORT_ENGLISH[i].short}_${CONFIG.SKILLS_SHORT_ENGLISH[j].short}`);
		}
	}
	return rankKeys;
};
