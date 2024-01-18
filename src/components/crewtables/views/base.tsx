import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import CABExplanation from '../../explanations/cabexplanation';
import { formatTierLabel, getSkillOrder, printPortalStatus, printSkillOrder, qbitsToSlots, skillToRank } from '../../../utils/crewutils';
import { navigate } from 'gatsby';
import { TinyStore } from '../../../utils/tiny';
import VoyageExplanation from '../../explanations/voyexplanation';

export const getBaseTableConfig = (tableType: 'allCrew' | 'myCrew' | 'profileCrew') => {
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
		{ width: 1, column: 'in_portal', title: 'In Portal' },
	);
	if (tableType === 'allCrew') {
		tableConfig.push(
			{ width: 1, column: 'date_added', title: 'Release Date' },
		);
	
	}
	else {
		tableConfig.push(
			{ width: 1, column: 'q_bits', title: 'Q-Bits' },
		);
	}
	return tableConfig;
};

type CrewCellProps = {
	pageId: string;
	crew: IRosterCrew;
	tableType: 'allCrew' | 'myCrew' | 'profileCrew'
};

export const CrewBaseCells = (props: CrewCellProps) => {
	const { crew, pageId, tableType } = props;
	const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];
	const tiny = TinyStore.getStore("index");
	
	const navToSearch = (crew: IRosterCrew) => {
		let sko = getSkillOrder(crew).map(sk => skillToRank(sk)).join("/").toUpperCase();
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
				<div style={{cursor:"pointer"}} onClick={(e) => navToSearch(crew)} title={getSkillOrder(crew).map(sk => skillToRank(sk)).reduce((p, n) => p ? `${p}/${n}` : n)}>
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
				{tableType === 'allCrew' && new Date(crew.date_added).toLocaleDateString()}
				{tableType !== 'allCrew' && 
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
