import React from 'react';
import { Label, Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew, RosterType } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import CABExplanation from '../../explanations/cabexplanation';
import { formatTierLabel, gradeToColor, printPortalStatus, qbitsToSlots, qbProgressToNext, skillSum, skillToShort } from '../../../utils/crewutils';
import { TinyStore } from '../../../utils/tiny';
import VoyageExplanation from '../../explanations/voyexplanation';
import { PlayerCrew } from '../../../model/player';
import { ComputedSkill, CrewMember } from '../../../model/crew';
import { GlobalContext } from '../../../context/globalcontext';
import { TranslateMethod } from '../../../model/player';
import { appelate } from '../../../utils/misc';
import CrewStat from '../../crewstat';
import { printFancyPortal } from '../../base/utils';

export const getBaseTableConfig = (tableType: RosterType, t: TranslateMethod) => {
	const tableConfig = [] as ITableConfigRow[];
	tableConfig.push(
		// { width: 1, column: 'bigbook_tier', title: t('base.bigbook_tier'), tiebreakers: ['cab_ov_rank'], tiebreakers_reverse: [false] },
		{ width: 1, column: 'cab_ov', title: <span>{t('base.cab_power')} <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{
			width: 1, column: 'blank', title: t('rank_names.datacore_rating'), reverse: true,
			customCompare: (a: IRosterCrew, b: IRosterCrew) => {
				if (a.ranks.scores?.overall === undefined && b.ranks.scores?.overall === undefined) return 0;
				else if (a.ranks.scores?.overall === undefined) return 1;
				else if (b.ranks.scores?.overall === undefined) return -1;
				let r = a.ranks.scores.overall - b.ranks.scores.overall;
				if (!r) r = (b.cab_ov_rank ?? 0) - (a.cab_ov_rank ?? 0);
				return r;
			}
		 },
	);
	if (tableType !== 'offers') {
		tableConfig.push({ width: 1, column: 'ranks.voyRank', title: <span>{t('base.voyage')} <VoyageExplanation /></span> })
	}
	else {
		tableConfig.push(
			{
				width: 1,
				column: 'skills',
				title: t('base.skills'),
				reverse: true,
				customCompare: (a: IRosterCrew, b: IRosterCrew) => {
					return skillSum(a.skill_order.map(sko => a[sko] as ComputedSkill)) - skillSum(b.skill_order.map(sko => b[sko] as ComputedSkill))
				}
			}
		)
		tableConfig.push({
			width: 4,
			pseudocolumns: ['offer', 'cost'],
			column: 'offer',
			title: t('base.offers'),
			translatePseudocolumn: (field) => {
				if (field === 'offer') return t('global.name');
				if (field === 'cost') return t('retrieval.price.price');
				return field;
			},
			customCompare: (a: IRosterCrew, b: IRosterCrew, config) => {
				if (!a.offers && !b.offers) return 0;
				else if (!a.offers) return 1;
				else if (!b.offers) return -1;
				else {
					if (config.field === 'offer') {
						return a.offers[0].name.localeCompare(b.offers[0].name);
					}
					else if (config.field === 'cost') {
						let afiat = (a.offers.some(offer => offer.drop_info.some(di => di.currency === 'fiat')));
						let bfiat = (b.offers.some(offer => offer.drop_info.some(di => di.currency === 'fiat')));
						if (afiat === bfiat) {
							return a.offers[0].drop_info[0].cost - b.offers[0].drop_info[0].cost;
						}
						else if (afiat) {
							return 1;
						}
						else if (bfiat) {
							return -1;
						}

					}
					return 0;
				}
			}
		});
		tableConfig.push(
			{
				width: 1,
				column: 'in_portal',
				title: t('base.in_portal'),
				customCompare: (a: PlayerCrew | CrewMember, b: PlayerCrew | CrewMember) => {
					return printPortalStatus(a, t, true, true, false, true).localeCompare(printPortalStatus(b, t, true, true, false, true));
				}
			}
		)
	}

	if (tableType !== 'offers') {
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
	const tierColor = crew.ranks.scores?.overall ? gradeToColor(crew.ranks.scores.overall / 100) ?? undefined : undefined;
	const gradeColor = gradeToColor(crew.cab_ov_grade) ?? undefined;
	return (
		<React.Fragment>
			{/* <Table.Cell textAlign='center'>
				<b style={{color: tierColor}}>{formatTierLabel(crew)}</b>
			</Table.Cell> */}
			<Table.Cell textAlign='center'>
				<b style={{color: gradeColor}}>{crew.cab_ov}</b><br />
				<small><span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>{rarityLabels[crew.max_rarity]}</span><br />{crew.cab_ov_rank ? "#" + crew.cab_ov_rank : "?" }</small>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b style={{color: tierColor}}>{crew.ranks.scores?.overall ?? 0}</b><br />
				<small><span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>{rarityLabels[crew.max_rarity]}</span><br />{crew.ranks.scores?.overall_rank ? "#" + crew.ranks.scores.overall_rank : "?" }</small>
			</Table.Cell>
			{tableType !== 'offers' &&
			<Table.Cell textAlign='center'>
				<div style={{cursor:"pointer"}} onClick={(e) => navToSearch(crew)} title={crew.skill_order.map(sk => skillToShort(sk)).reduce((p, n) => p ? `${p}/${n}` : n)}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>{CONFIG.TRIPLET_TEXT} #{crew.ranks.voyTriplet.rank}</small>}
				</div>
			</Table.Cell>}
			{tableType === 'offers' && <>
			<Table.Cell textAlign='center' width={1}>
				{crew.skill_order.map(skill => {

					return <div key={`crew_${crew.symbol}_sko_${skill}`}>
						<CrewStat data={crew[skill] as any} skill_name={skill} scale={0.8} />
					</div>
				})}
			</Table.Cell>
			<Table.Cell textAlign='center' width={1}>
				{renderOffers(crew)}
			</Table.Cell>
			<Table.Cell>
				<b title={printPortalStatus(crew, t, true, true, true)}>{printFancyPortal(crew, t, true)}</b>
			</Table.Cell>
			</>}
			{tableType !== 'offers' && CONFIG.SKILLS_SHORT.map(skill =>
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

	function renderOffers(crew: IRosterCrew) {
		const labelStyle: React.CSSProperties = {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '0.5em'
		};
		const divStyle: React.CSSProperties = {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			width: '100%',
			justifyContent: 'space-between',
			gap: '0.5em'
		};

		return (<div style={{
			height: '100%',
			fontWeight: 'bold',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: '1em',
			textAlign: 'left'
		}}>
			{crew.offers?.map((offer) => {
			return offer.drop_info.map(di => {
				if (di.currency === 'fiat') {
					return (<div key={`offer_cost_${di.cost}_${di.currency}`} style={divStyle}>
							<span>{appelate(offer.name)}</span>
							<Label style={{...labelStyle, backgroundColor: 'darkgreen'}}>
								{di.cost}
							</Label>
						</div>)
				}
				else {
					return (
					<div key={`offer_cost_${di.cost}_${di.currency}`} style={divStyle}>
						<span>{appelate(offer.name)}</span>
						<div
							className='ui label'
							style={labelStyle}
						>
						{di.cost}
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`} style={{height: '16px', padding: '0.5em 0'}} />
						</div>
					</div>
					)
				}
			});
		})}
		</div>
	)
	}
};
