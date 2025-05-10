import React from 'react';
import { Table, Rating } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { CrewMember } from '../../model/crew';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';
import CABExplanation from '../explanations/cabexplanation';
import CONFIG from '../../components/CONFIG';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { formatTierLabel } from '../../utils/crewutils';
import { GlobalContext } from '../../context/globalcontext';
import { renderMainDataScore } from '../crewtables/views/base';

type TableViewProps = {
	selectedCrew: string[];
	crewList: CrewMember[];
};

export const TableView = (props: TableViewProps) => {
	const { selectedCrew } = props;
	const { t, tfmt } = React.useContext(GlobalContext).localized;

	const data = [] as CrewMember[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		// Add dummy fields for sorting to work
		CONFIG.SKILLS_SHORT.forEach(skill => {
			crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
		});
		crew.unique_polestar_combos = crew.unique_polestar_combos ?? [];
		data.push(crew);
	});

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: t('base.crew'), pseudocolumns: ['name', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: t('base.rarity'), reverse: true },
		{ width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true },
		// { width: 1, column: 'bigbook_tier', title: t('base.bigbook_tier'), tiebreakers: ['cab_ov_rank'], tiebreakers_reverse: [false] },
		{ width: 1, column: 'cab_ov', title: <span>{t('base.cab_power')} <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: t('base.voyage') },
		{ width: 1, column: 'ranks.gauntletRank', title: t('base.gauntlet') },
		{ width: 1, column: 'collections.length', title: t('base.collections'), reverse: true },
		//{ width: 1, column: 'events', title: 'Events', reverse: true },
		{ width: 1, column: 'unique_polestar_combos.length', title: <>{tfmt('behold_helper.columns.unique_retrievals')}</>, reverse: true, tiebreakers: ['in_portal'] },
		{ width: 1, column: 'factionOnlyTotal', title: <>{tfmt('behold_helper.columns.faction_items')}<br /><small>{tfmt('behold_helper.columns.build_cost')}</small></> },
		{ width: 1, column: 'totalChronCost', title: <><img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} alt='Chroniton' style={{ height: '1em' }} /><br /><small>{tfmt('behold_helper.columns.build_cost')}</small></> },
		{ width: 1, column: 'craftCost', title: <><img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} alt='Credit' style={{ height: '1.1em' }} /><br /><small>{tfmt('behold_helper.columns.build_cost')}</small></> }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	const rarityLabels = CONFIG.RARITIES.map(r => r.name);

	return (
		<div style={{ marginTop: '2em' }}>
			<SearchableTable
				id='behold'
				data={data}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx ?? -1)}
				filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
				showFilterOptions={true}
			/>
			<CrewHoverStat targetGroup='beholdsPage' />
		</div>
	);

	function renderTableRow(crew: CrewMember, idx: number): JSX.Element {
		let bestGPair = '', bestGRank = 1000;
		Object.keys(crew.ranks).forEach(key => {
			if (key.slice(0, 1) === 'G') {
				if (crew.ranks[key] < bestGRank) {
					bestGPair = key.slice(2).replace('_', '/');
					bestGRank = crew.ranks[key];
				}
			}
		});

		return (
			<Table.Row key={crew.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget targetGroup='beholdsPage' inputItem={crew}>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{renderMainDataScore(crew)}
				</Table.Cell>
				{/* <Table.Cell textAlign='center'>
					<b>{formatTierLabel(crew)}</b>
				</Table.Cell> */}
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>{crew.cab_ov}</b><br />
					<small>{rarityLabels[crew.max_rarity-1]} #{crew.cab_ov_rank}</small>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>{CONFIG.TRIPLET_TEXT} #{crew.ranks.voyTriplet.rank}</small>}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.gauntletRank}</b>
					{bestGPair !== '' && <><br /><small>{bestGPair} #{bestGRank}</small></>}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.collections.length}
				</Table.Cell>
				{/* <Table.Cell style={{ textAlign: 'center' }}>
					{crew.events}
				</Table.Cell> */}
				<Table.Cell style={{ textAlign: 'center' }}>
					{!crew.in_portal ? 'N/A' : (crew.unique_polestar_combos?.length ?? 0)}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.factionOnlyTotal}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.totalChronCost}
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					{crew.craftCost}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew.base_skills[skill.name].core}</b>
							<br />
							+({crew.base_skills[skill.name].range_min}-{crew.base_skills[skill.name].range_max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}
};
