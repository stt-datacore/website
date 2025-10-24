import React from 'react';
import { Label, Table } from 'semantic-ui-react';

import CONFIG from '../../../components/CONFIG';

import { IRosterCrew, RosterType } from '../../../components/crewtables/model';
import { ITableConfigRow } from '../../../components/searchabletable';
import CABExplanation from '../../explanations/cabexplanation';
import { gradeToColor, numberToGrade, printPortalStatus, qbitsToSlots, qbProgressToNext, skillSum, skillToShort } from '../../../utils/crewutils';
import { TinyStore } from '../../../utils/tiny';
import VoyageExplanation from '../../explanations/voyexplanation';
import { PlayerCrew } from '../../../model/player';
import { ComputedSkill, CrewMember, Ranks, RankScoring } from '../../../model/crew';
import { GlobalContext } from '../../../context/globalcontext';
import { TranslateMethod } from '../../../model/player';
import { appelate } from '../../../utils/misc';
import CrewStat from '../../item_presenters/crewstat';
import { printFancyPortal } from '../../base/utils';
import { OfferCrew } from '../../../model/offers';
import { formatShipScore } from '../../ship/utils';
import { printChrons, printCredits } from '../../retrieval/context';

export const getBaseTableConfig = (tableType: RosterType, t: TranslateMethod, alternativeLayout?: boolean, cheap?: boolean) => {
	const tableConfig = [] as ITableConfigRow[];
	tableConfig.push(
		// { width: 1, column: 'bigbook_tier', title: t('base.bigbook_tier'), tiebreakers: ['cab_ov_rank'], tiebreakers_reverse: [false] },
		{
			width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true,
			customCompare: (a: IRosterCrew, b: IRosterCrew) => {
				if (a.ranks?.scores?.overall === undefined && b.ranks?.scores?.overall === undefined) return 0;
				else if (a.ranks?.scores?.overall === undefined) return 1;
				else if (b.ranks?.scores?.overall === undefined) return -1;
				let r = a.ranks.scores.overall - b.ranks.scores.overall;
				if (!r) r = (b.cab_ov_rank ?? 0) - (a.cab_ov_rank ?? 0);
				return r;
			}
		 },
		 { width: 1, column: 'cab_ov', title: <span>{t('base.cab_power')} <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		 //  {
		// 	width: 1, column: 'ranks.scores.tuvix', title: t('rank_names.tuvix'), reverse: true,
		// 	customCompare: (a: IRosterCrew, b: IRosterCrew) => {
		// 		if (a.ranks.scores?.tuvix === undefined && b.ranks.scores?.tuvix === undefined) return 0;
		// 		else if (a.ranks.scores?.tuvix === undefined) return 1;
		// 		else if (b.ranks.scores?.tuvix === undefined) return -1;
		// 		let r = a.ranks.scores.tuvix - b.ranks.scores.tuvix;
		// 		if (!r) r = (b.cab_ov_rank ?? 0) - (a.cab_ov_rank ?? 0);
		// 		return r;
		// 	}
		//  },
	);
	if (tableType !== 'offers') {
		tableConfig.push({ width: 1, column: 'ranks.voyRank', title: <span>{t('base.voyage')} <VoyageExplanation /></span> })
	}

	if (cheap) {
		tableConfig.push(
			{
				width: 1,
				column: "requiredChronCost",
				title: t('global.item_types.chronitons')
			},
			{
				width: 1,
				column: "requiredFactionItems",
				title: t('behold_helper.columns.faction_items')
			},
			{
				width: 1,
				column: "craftCost",
				title: t('behold_helper.columns.build_cost')
			}
		)
	}
	if (tableType === 'offers' || alternativeLayout) {
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
		if (tableType === 'offers') {
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
	}

	if (tableType !== 'offers' && tableType !== 'no_skills' && !alternativeLayout) {
		CONFIG.SKILLS_SHORT.forEach((skill) => {
			tableConfig.push({
				width: 1,
				column: `${skill.name}.core`,
				title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
				reverse: true
			});
		});
	}
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
	if (['allCrew', 'offers', 'buyBack', 'no_skills'].includes(tableType)) {
		tableConfig.push(
			{
				width: 1,
				column: 'date_added',
				title: t('base.release_date'),
				reverse: true,
				customCompare: (a: CrewMember, b: CrewMember) => {
					a.date_added ??= new Date();
					b.date_added ??= new Date();
					if (!!a.preview != !!b.preview) return a.preview ? 1 : -1;
					if (typeof a.date_added === 'string') a.date_added = new Date(a.date_added);
					if (typeof b.date_added === 'string') b.date_added = new Date(b.date_added);
					let m = a.date_added.getTime() - b.date_added.getTime();
					if (!m) m = a.name.localeCompare(b.name);
					return m;
				}
			},
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
	alternativeLayout?: boolean
	absRank?: boolean,
	cheap?: boolean
};

export const CrewBaseCells = (props: CrewCellProps) => {
	const { crew, tableType, absRank, alternativeLayout, cheap } = props;
	const { t } = React.useContext(GlobalContext).localized;
	const tiny = TinyStore.getStore("index");

	const navToSearch = (crew: IRosterCrew) => {
		let sko = crew.skill_order.map(sk => skillToShort(sk)).join("/").toUpperCase();
		tiny.setRapid("search", "skill_order:" + sko);
	};
	const qbslots = qbitsToSlots(crew.q_bits);
	//const tuvixColor = crew.ranks.scores?.tuvix ? gradeToColor(crew.ranks.scores.tuvix / 100) ?? undefined : undefined;

	const voyPower = Math.ceil(skillSum(Object.entries(crew).filter(([key, val]) => key.endsWith("_skill")).map(([key, val]) => val)));

	return (
		<React.Fragment>
			{/* <Table.Cell textAlign='center'>
				<b style={{color: tierColor}}>{formatTierLabel(crew)}</b>
			</Table.Cell> */}
			<Table.Cell textAlign='center'>
				{renderMainDataScore(crew, absRank)}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{renderCabColumn(crew)}
			</Table.Cell>
			{/* <Table.Cell textAlign='center'>
				<b style={{color: tuvixColor}}>{crew.ranks.scores?.tuvix ?? 0}</b><br />
			</Table.Cell> */}
			{tableType !== 'offers' &&
			<Table.Cell textAlign='center'>
				<div style={{cursor:"pointer"}} onClick={(e) => navToSearch(crew)} title={crew.skill_order.map(sk => skillToShort(sk)).reduce((p, n) => p ? `${p}/${n}` : n)}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>{CONFIG.TRIPLET_TEXT} #{crew.ranks.voyTriplet.rank}</small>}
					{crew.ranks.voyTriplet && <><br /><small style={{color: 'lightblue', fontStyle: 'italic'}}>{voyPower.toLocaleString()}</small></>}
				</div>
			</Table.Cell>}
			{(!!cheap) && (<>
				<Table.Cell textAlign='left' width={1}>
					{printChrons(Math.ceil(crew.requiredChronCost || 0))}
				</Table.Cell>
				<Table.Cell textAlign='left' width={1}>
					{crew.requiredFactionItems?.toLocaleString() || '0'}
				</Table.Cell>
				<Table.Cell textAlign='left' width={1}>
					{printCredits(crew.craftCost)}
				</Table.Cell>
			</>)}
			{(tableType === 'offers' || alternativeLayout) && <>
				<Table.Cell textAlign='left' width={1}>
					{crew.skill_order.map(skill => {
						return <div key={`crew_${crew.symbol}_sko_${skill}`}>
							<CrewStat data={crew[skill] as any} skill_name={skill} scale={0.8} />
						</div>
					})}
				</Table.Cell>
			</>}
			{(tableType === 'offers') && <>
			<Table.Cell textAlign='center' width={1}>
				{renderOffers(crew)}
			</Table.Cell>
			<Table.Cell>
				<b title={printPortalStatus(crew, t, true, true, true)}>{printFancyPortal(crew, t, true)}</b>
			</Table.Cell>
			</>}
			{!['offers', 'no_skills'].includes(tableType) && !alternativeLayout && CONFIG.SKILLS_SHORT.map(skill =>
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
				{(['allCrew', 'offers', 'buyBack', 'no_skills'].includes(tableType)) && (crew.preview ? t('global.pending_release') : new Date(crew.date_added).toLocaleDateString())}
				{!['allCrew', 'offers', 'buyBack', 'no_skills'].includes(tableType) &&
					<div title={
						crew.immortal !== -1 ? 'Frozen, unfinished or unowned crew do not have q-bits' : qbslots + " Slot(s) Open"
						}>
						<div>
							{!!crew.immortal && crew.immortal >= -1 ? crew.q_bits : 'N/A' }
						</div>
						{!!crew.immortal && crew.immortal >= -1 &&
						<div style={{fontSize:"0.8em", minWidth: '4em'}}>
							({qbslots === 1 && t('base.one_slot')}{qbslots !== 1 && t('base.n_slots', { n: qbitsToSlots(crew.q_bits).toString() })})
						</div>}
						{!!crew.immortal && crew.immortal >= -1 && qbslots < 4 &&
						<div style={{fontSize:"0.8em", minWidth: '6em'}}>
							({t('base.n_to_next', { n: qbProgressToNext(crew.q_bits)[0].toString() })})
						</div>}
					</div>}
			</Table.Cell>
		</React.Fragment>
	);

	function getExpiration(offer: OfferCrew) {
		return ((new Date((offer.seconds_remain! * 1000) + Date.now()).toLocaleDateString()));
	}

	function renderOffers(crew: IRosterCrew) {
		const labelStyle: React.CSSProperties = {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '0.5em'
		};
		const divStyle: React.CSSProperties = {
			display: 'grid',
			gridTemplateAreas: `'a a' 'c b'`,
			//gridTemplateColumns: '7em 4em',
			flexDirection: 'row',
			alignItems: 'center',
			width: '100%',
			margin: '0.5em',
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
			gap: '0em',
			textAlign: 'left'
		}}>
			{crew.offers?.map((offer) => {
			return offer.drop_info.map(di => {
				if (di.currency === 'fiat') {
					return (<div key={`offer_cost_${di.cost}_${di.currency}`} className='ui segment' style={divStyle}>
							<span style={{gridArea: 'a'}}>{appelate(offer.name)}</span>
							<Label style={{...labelStyle, gridArea: 'b', backgroundColor: 'darkgreen'}}>
								{di.cost}
							</Label>
							<div style={{gridArea: 'c'}}><span>{t('base.expiration')}{t('global.colon')}{getExpiration(offer)}</span></div>
						</div>)
				}
				else {
					return (
					<div key={`offer_cost_${di.cost}_${di.currency}`} className='ui segment' style={divStyle}>
						<span style={{gridArea: 'a'}}>{appelate(offer.name)}</span>
						<div
							className='ui label'
							style={{...labelStyle, gridArea: 'b', padding: '0.25em 1em'}}
						>
						{di.cost}
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`} style={{height: '16px', padding: '0.5em 0'}} />
						</div>
						<div style={{gridArea: 'c'}}><span>{t('base.expiration')}{t('global.colon')}{getExpiration(offer)}</span></div>

					</div>
					)
				}
			});
		})}
		</div>
	)
	}
};

export function renderMainDataScore(crew: CrewMember, absRank?: boolean) {
	const rarityLabels = CONFIG.RARITIES.map(m => m.name);
	const datacoreColor = crew.ranks.scores?.overall ? gradeToColor(crew.ranks.scores.overall / 100) ?? undefined : undefined;
	const dcGradeColor = crew.ranks.scores?.overall_grade ? gradeToColor(crew.ranks.scores.overall_grade) ?? undefined : undefined;

	const rank = absRank ? crew.ranks.scores.overall_rank : crew.ranks.scores.rarity_overall_rank;

	return (
		<React.Fragment>
			<b style={{color: datacoreColor}}>{crew.ranks.scores?.overall ?? 0}</b><br />
				<small>
					<span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>
						{rarityLabels[crew.max_rarity]}
					</span>
					<br />
					{!!rank ? "#" + rank : "?" }
				</small>
				<small style={{color: dcGradeColor}}>
					&nbsp;&nbsp;&nbsp;&nbsp;
					{crew.ranks.scores?.overall_grade ? crew.ranks.scores?.overall_grade : "?" }
				</small>
		</React.Fragment>
	)
}

export function renderAnyDataScore(crew: CrewMember, key: keyof (RankScoring & Ranks), t: TranslateMethod, with_rarity = false) {

	if (key === 'ship' || key === 'ship_rank') {
		return formatShipScore(crew.ranks.scores.ship.kind, crew.ranks.scores.ship.overall, t)
	}

	const { score, rank } = (() => {
		let score = crew.ranks.scores[key] || crew.ranks[key];
		let rank_key = `${key}_rank`;
		if (key === 'voyage') rank_key = 'voyRank';
		else if (key === 'gauntlet') rank_key = 'gauntletRank';
		else if (key === 'shuttle') rank_key = 'shuttleRank';
		if (rank_key in crew.ranks.scores) {
			return { score, rank: crew.ranks.scores[rank_key] };
		}
		else if (rank_key in crew.ranks) {
			return { score, rank: crew.ranks[rank_key] };
		}
		return { score: null, rank: null };
	})();

	const rarityLabels = CONFIG.RARITIES.map(m => m.name);
	const datacoreColor = rank ? gradeToColor(score / 100) ?? undefined : undefined;
	const dcGradeColor = score ? gradeToColor(score / 100) ?? undefined : undefined;

	return (
		<React.Fragment>
			<b style={{color: datacoreColor}}>{score}</b><br />
				<small>
					{with_rarity &&
					<>
						<span style={{color: CONFIG.RARITIES[crew.max_rarity].color}}>
							{rarityLabels[crew.max_rarity]}
						</span>
						<br />
					</>}
					{!!rank ? "#" + rank : "?" }
				</small>
				<small style={{color: dcGradeColor}}>
					&nbsp;&nbsp;&nbsp;&nbsp;
					{score ? numberToGrade(score / 100) : "?" }
				</small>
		</React.Fragment>
	)
}

export function renderCabColumn(crew: CrewMember) {
	const rarityLabels = CONFIG.RARITIES.map(m => m.name);
	const gradeColor = gradeToColor(crew.cab_ov_grade) ?? undefined;
	const cabColor = gradeToColor(Number(crew.cab_ov) / 16) ?? undefined;

	return (
		<React.Fragment>
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
		</React.Fragment>
	)
}