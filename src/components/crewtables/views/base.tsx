import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import CABExplanation from '../../explanations/cabexplanation';
import { formatTierLabel, printPortalStatus, qbitsToSlots, skillToShort } from '../../../utils/crewutils';
import { TinyStore } from '../../../utils/tiny';
import VoyageExplanation from '../../explanations/voyexplanation';
import { PlayerCrew } from '../../../model/player';
import { CrewMember } from '../../../model/crew';

export const getBaseTableConfig = (tableType: 'allCrew' | 'myCrew' | 'profileCrew' | 'buyBack') => {
	const tableConfig = [] as ITableConfigRow[];
	tableConfig.push(
		{ width: 1, column: 'bigbook_tier', title: 'Tier' },
		{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: <span>Voyage <VoyageExplanation /></span> }
	);
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});
	tableConfig.push(
		{ 
			width: 1, 
			column: 'in_portal', 
			title: 'In Portal',
			customCompare: (a: PlayerCrew | CrewMember, b: PlayerCrew | CrewMember) => {				
				return printPortalStatus(a, true, true, false, true).localeCompare(printPortalStatus(b, true, true, false, true));
			}
		},
	);
	if (tableType === 'allCrew' || tableType === 'buyBack') {
		tableConfig.push(
			{ width: 1, column: 'date_added', title: 'Release Date' },
		);
	
	}
	else {
		tableConfig.push(
			{ width: 1, column: 'q_bits', title: 'QP' },
		);
	}
	return tableConfig;
};

type CrewCellProps = {
	pageId: string;
	crew: IRosterCrew;
	tableType: 'allCrew' | 'myCrew' | 'profileCrew' | 'buyBack'
};

export const CrewBaseCells = (props: CrewCellProps) => {
	const { crew, pageId, tableType } = props;
	const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];
	const tiny = TinyStore.getStore("index");
	
	const navToSearch = (crew: IRosterCrew) => {
		let sko = crew.skill_order.map(sk => skillToShort(sk)).join("/").toUpperCase();
		tiny.setRapid("search", "skill_order:" + sko);
	};
	const qbslots = qbitsToSlots(crew.q_bits);

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<b>{formatTierLabel(crew)}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>{crew.cab_ov}</b><br />
				<small>{rarityLabels[crew.max_rarity-1]} #{crew.cab_ov_rank}</small>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<div style={{cursor:"pointer"}} onClick={(e) => navToSearch(crew)} title={crew.skill_order.map(sk => skillToShort(sk)).reduce((p, n) => p ? `${p}/${n}` : n)}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
				</div>
			</Table.Cell>
			{CONFIG.SKILLS_SHORT.map(skill =>
				crew[skill.name].core > 0 ? (
					<Table.Cell key={skill.name} textAlign='center'>
						<b>{crew[skill.name].core}</b>
						<br />
						+({crew[skill.name].min}-{crew[skill.name].max})
					</Table.Cell>
				) : (
					<Table.Cell key={skill.name} />
				)
			)}
			<Table.Cell textAlign='center'>
				<b title={printPortalStatus(crew, true, true, true)}>{printPortalStatus(crew, true, true)}</b>
			</Table.Cell>
			<Table.Cell textAlign='center' width={2}>
				{(tableType === 'allCrew' || tableType === 'buyBack') && new Date(crew.date_added).toLocaleDateString()}
				{tableType !== 'allCrew' && tableType !== 'buyBack' &&
					<div title={
						crew.immortal !== -1 ? 'Frozen, unfinished or unowned crew do not have q-bits' : qbslots + " Slot(s) Open"
						}>
						<div>
							{crew.immortal !== -1 ? 'N/A' : crew.q_bits}
						</div>
						{crew.immortal === -1 &&
						<div style={{fontSize:"0.8em"}}>
							({qbitsToSlots(crew.q_bits)} Slot{qbslots != 1 ? 's' : ''})
						</div>}
					</div>}
			</Table.Cell>
		</React.Fragment>
	);
};
