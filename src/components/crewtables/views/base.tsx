import React from 'react';
import { Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew, RosterType } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import CABExplanation from '../../explanations/cabexplanation';
import { formatTierLabel, gradeToColor, printPortalStatus, qbitsToSlots, qbProgressToNext, skillToShort } from '../../../utils/crewutils';
import { TinyStore } from '../../../utils/tiny';
import VoyageExplanation from '../../explanations/voyexplanation';
import { PlayerCrew } from '../../../model/player';
import { CrewMember } from '../../../model/crew';
import { GlobalContext } from '../../../context/globalcontext';
import { TranslateMethod } from '../../../model/player';

export const getBaseTableConfig = (tableType: RosterType, t: TranslateMethod) => {
	const tableConfig = [] as ITableConfigRow[];
	tableConfig.push(
		// { width: 1, column: 'bigbook_tier', title: t('base.bigbook_tier'), tiebreakers: ['cab_ov_rank'], tiebreakers_reverse: [false] },
		{ width: 1, column: 'cab_ov', title: <span>{t('base.cab_power')} <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },

	);
	if (tableType !== 'offers') {
		tableConfig.push({ width: 1, column: 'ranks.voyRank', title: <span>{t('base.voyage')} <VoyageExplanation /></span> })
	}
	else {
		tableConfig.push({ width: 1, column: 'cost_text', title: t('base.offer_cost') })
		tableConfig.push({ width: 1, column: 'offer', title: t('base.offers') })
	}

	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});
	if (tableType !== 'offers') {
		tableConfig.push(
			{
				width: 1,
				column: 'in_portal',
				title: t('base.in_portal'),
				customCompare: (a: PlayerCrew | CrewMember, b: PlayerCrew | CrewMember) => {
					return printPortalStatus(a, t, true, true, false, true).localeCompare(printPortalStatus(b, t, true, true, false, true));
				}
			},
		);
	}
	if (['allCrew', 'offers', 'buyBack'].includes(tableType)) {
		tableConfig.push(
			{ width: 1, column: 'date_added', title: t('base.release_date'), reverse: true },
		);

	}
	else {
		tableConfig.push(
			{ width: 2, column: 'q_bits', title: t('base.qp'), reverse: true },
		);
	}
	return tableConfig;
};

type CrewCellProps = {
	pageId: string;
	crew: IRosterCrew;
	tableType: RosterType
};

export const CrewBaseCells = (props: CrewCellProps) => {
	const { crew, pageId, tableType } = props;
	const { t } = React.useContext(GlobalContext).localized;
	const rarityLabels = CONFIG.RARITIES.map(m => m.name);
	const tiny = TinyStore.getStore("index");

	const navToSearch = (crew: IRosterCrew) => {
		let sko = crew.skill_order.map(sk => skillToShort(sk)).join("/").toUpperCase();
		tiny.setRapid("search", "skill_order:" + sko);
	};
	const qbslots = qbitsToSlots(crew.q_bits);
	//const tierColor = crew.bigbook_tier ? gradeToColor(crew.bigbook_tier) ?? undefined : undefined;
	const gradeColor = gradeToColor(crew.cab_ov_grade) ?? undefined;
	return (
		<React.Fragment>
			{/* <Table.Cell textAlign='center'>
				<b style={{color: tierColor}}>{formatTierLabel(crew)}</b>
			</Table.Cell> */}
			<Table.Cell textAlign='center'>
				<b style={{color:gradeColor}}>{crew.cab_ov}</b><br />
				<small><span  style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>{rarityLabels[crew.max_rarity]}</span><br />{crew.cab_ov_rank ? "#" + crew.cab_ov_rank : "?" }</small>
			</Table.Cell>
			{tableType !== 'offers' &&
			<Table.Cell textAlign='center'>
				<div style={{cursor:"pointer"}} onClick={(e) => navToSearch(crew)} title={crew.skill_order.map(sk => skillToShort(sk)).reduce((p, n) => p ? `${p}/${n}` : n)}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>{CONFIG.TRIPLET_TEXT} #{crew.ranks.voyTriplet.rank}</small>}
				</div>
			</Table.Cell>}
			{tableType === 'offers' &&
			<Table.Cell textAlign='center' width={1}>
				<b>{crew.cost_text}</b>
			</Table.Cell>}
			{tableType === 'offers' &&
			<Table.Cell textAlign='center' width={3}>
				<b>{crew.offer}</b>
			</Table.Cell>}
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
			{tableType !== 'offers' &&
			<Table.Cell textAlign='center'>
				<b title={printPortalStatus(crew, t, true, true, true)}>{printPortalStatus(crew, t, true, true)}</b>
			</Table.Cell>}
			<Table.Cell textAlign='center' width={2}>
				{(['allCrew', 'offers', 'buyBack'].includes(tableType)) && new Date(crew.date_added).toLocaleDateString()}
				{!['allCrew', 'offers', 'buyBack'].includes(tableType) &&
					<div title={
						crew.immortal !== -1 ? 'Frozen, unfinished or unowned crew do not have q-bits' : qbslots + " Slot(s) Open"
						}>
						<div>
							{crew.immortal !== -1 ? 'N/A' : crew.q_bits}
						</div>
						{crew.immortal === -1 &&
						<div style={{fontSize:"0.8em", minWidth: '4em'}}>
							({qbslots === 1 && t('base.one_slot')}{qbslots !== 1 && t('base.n_slots', { n: qbitsToSlots(crew.q_bits).toString() })})
						</div>}
						{crew.immortal === -1 && qbslots < 4 &&
						<div style={{fontSize:"0.8em", minWidth: '6em'}}>
							({t('base.n_to_next', { n: qbProgressToNext(crew.q_bits)[0].toString() })})
						</div>}
					</div>}
			</Table.Cell>
		</React.Fragment>
	);
};
