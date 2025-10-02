import React from 'react';
import { Label, Message, Rating, Table } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { GlobalContext } from '../../context/globalcontext';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { formatTierLabel } from '../../utils/crewutils';
import { getCoolStats } from '../../utils/misc';
import { navToCrewPage } from '../../utils/nav';
import { gradeToColor, numberToGrade } from "../../utils/crewutils";

import { IRosterCrew, RetrievableState } from './model';
import { CombosModal } from './combos';
import CONFIG from '../CONFIG';
import { PlayerCrew } from '../../model/player';
import { RetrievalContext } from './context';
import { renderAnyDataScore, renderCabColumn, renderMainDataScore } from '../crewtables/views/base';

type RetrievalCrewTableProps = {
 	filteredCrew: IRosterCrew[];
};

export const RetrievalCrewTable = (props: RetrievalCrewTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const retrievalContext = React.useContext(RetrievalContext);
	const { market } = retrievalContext;
	const { t, tfmt } = globalContext.localized;
	const { buffConfig } = globalContext.player;
	const { filteredCrew } = props;

	const topQuipmentScore = globalContext.core.crew.reduce((prev, curr) => Math.max(curr.ranks.scores.quipment ?? 0, prev), 0);

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: t('base.crew'), pseudocolumns: ['name', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: t('base.rarity'), reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true },
		{ width: 1, column: 'cab_ov', title: t('base.cab_power'), reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: t('base.voyage') },
		{ width: 1, column: 'ranks.gauntletRank', title: t('base.gauntlet') },
		{ width: 1, column: 'ranks.scores.quipment', title: t('base.quipment'), reverse: true },
		{ width: 1, column: 'progressable_collections.length', title: t('base.collections'), reverse: true },
		{
			width: 1,
			column: 'retrievable',
			title: t('base.retrieval'),
			//tiebreakers: ['actionable', 'alt_source'],
			pseudocolumns: ['retrievable', 'price', 'sell_count'],
			customCompare: (a: PlayerCrew, b: PlayerCrew, conf) => {
				let r = 0;
				if (conf.field === 'retrievable' || !market) {
					r = (a.unique_polestar_combos?.length ?? 0) - (b.unique_polestar_combos?.length ?? 0);
				}
				else if (conf.field === 'price') {
					a.price ??= 0;
					b.price ??= 0;
					r = a.price! - b.price!;
				}
				else if (conf.field === 'sell_count') {
					a.sell_count ??= 0;
					b.sell_count ??= 0;
					r = a.sell_count! - b.sell_count!;
				}
				if (!r) r = a.name.localeCompare(b.name);
				return r;
			}
		}
	];

	return (
		<React.Fragment>
			<SearchableTable
				id='crewretrieval'
				data={filteredCrew}
				config={tableConfig}
				renderTableRow={(crew) => <CrewRow key={crew.symbol} crew={crew} topQuipmentScore={topQuipmentScore} />}
				filterRow={(crew, filters, filterType) => crewMatchesSearchFilter(crew, filters, filterType ?? null)}
				showFilterOptions={true}
			/>
			<CrewHoverStat openCrew={(crew) => navToCrewPage(crew)} targetGroup='retrievalGroup' />
		</React.Fragment>
	);
};

type CrewRowProps = {
	crew: IRosterCrew;
	topQuipmentScore: number;
};

const CrewRow = (props: CrewRowProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { crew, topQuipmentScore } = props;

	const [detailedView, setDetailedView] = React.useState<string>('');

	const rarityLabels = CONFIG.RARITIES.map(r => r.name);

	return (
		<Table.Row key={crew.symbol}>
			<Table.Cell>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '60px auto',
						gridTemplateAreas: `'icon stats' 'icon description'`,
						gridGap: '1px'
					}}
				>
					<div style={{ gridArea: 'icon' }}>
						<CrewTarget inputItem={crew}  targetGroup='retrievalGroup'>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</CrewTarget>
					</div>
					<div style={{ gridArea: 'stats' }}>
						<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
					</div>
					<div style={{ gridArea: 'description' }}>{getCoolStats(t, crew, false, false)}</div>
				</div>
			</Table.Cell>
			<Table.Cell>
				<Rating icon='star' rating={playerData ? crew.highest_owned_rarity : crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
			</Table.Cell>
			{detailedView === '' && renderDefaultCells()}
			{detailedView === 'collections' && <CollectionsExpanded crew={crew} onDismiss={() => setDetailedView('')} />}
			<Table.Cell textAlign='center'>
				{renderRetrieval(crew)}
			</Table.Cell>
		</Table.Row>
	);

	function renderDefaultCells(): React.JSX.Element {
		return (
			<React.Fragment>
				<Table.Cell textAlign='center'>
					{renderMainDataScore(crew)}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{renderCabColumn(crew)}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>#{crew.ranks.voyRank}</b>
					<br />{crew.ranks.voyTriplet && <small>{CONFIG.TRIPLET_TEXT} #{crew.ranks.voyTriplet.rank}</small>}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>#{crew.ranks.gauntletRank}</b>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{renderQuipment(crew)}
				</Table.Cell>
				<Table.Cell
					textAlign='center'
					style={{ cursor: crew.progressable_collections.length > 0 ? 'zoom-in' : undefined }}
					onClick={() => { if (crew.progressable_collections.length > 0) setDetailedView('collections'); }}
				>
					<b>{crew.progressable_collections.length}</b>
				</Table.Cell>
			</React.Fragment>
		);
	}

	function renderQuipment(crew: IRosterCrew): React.JSX.Element {
		return renderAnyDataScore(crew, 'quipment', t);
	}

	function renderRetrieval(crew: IRosterCrew): React.JSX.Element {
		if (crew.retrievable === RetrievableState.Never)
			return <Label color='red'>{crew.alt_source}</Label>;
		else if (crew.retrievable === RetrievableState.InFuture)
			return <Label color='red'>{t('base.not_yet_in_portal')}</Label>;
		else if (crew.retrievable === RetrievableState.NonUnique)
			return <Label color='red'>{t('base.not_uniquely_retrievable')}</Label>;

		return <CombosModal crew={crew} />;
	}
};

type CollectionsExpandedProps = {
	crew: IRosterCrew;
	onDismiss: () => void;
};

const CollectionsExpanded = (props: CollectionsExpandedProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { crew, onDismiss } = props;

	interface ICollectionData {
		name: string;
		progress: number;
		goal: number;
		needed: number;
	};

	const data: ICollectionData[] = crew.progressable_collections.map(collectionName => {
		const newData: ICollectionData = {
			name: collectionName,
			progress: 0,
			goal: 0,
			needed: 0
		};

		if (playerData) {
			const cryoCollection = playerData.player.character.cryo_collections.find(cc => cc.name === collectionName);
			if (cryoCollection) {
				newData.progress = cryoCollection.progress !== 'n/a' ? cryoCollection.progress : 0;
				newData.goal = cryoCollection.milestone.goal !== 'n/a' ? cryoCollection.milestone.goal : 0;
				newData.needed = newData.goal - newData.progress;
			}
		}
		return newData;
	});

	return (
		<Table.Cell colSpan={6}>
			<Message onDismiss={onDismiss}>
				<Message.Content style={{ width: '98%', textAlign: 'center' }}>
					<Table compact>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell>
									{crew.name} Collections
								</Table.HeaderCell>
								{playerData && (
									<React.Fragment>
										<Table.HeaderCell textAlign='center'>
											Progress
										</Table.HeaderCell>
										<Table.HeaderCell textAlign='center'>
											Needed
										</Table.HeaderCell>
									</React.Fragment>
								)}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{data.sort(sortCollections).map((collectionData, idx) => (
								<Table.Row key={idx}>
									<Table.Cell>
										{collectionData.name}
									</Table.Cell>
									{playerData && (
										<React.Fragment>
											<Table.Cell textAlign='center'>
												{collectionData.progress} / {collectionData.goal}
											</Table.Cell>
											<Table.Cell textAlign='center'>
												{collectionData.needed}
											</Table.Cell>
										</React.Fragment>
									)}
								</Table.Row>
							))}
						</Table.Body>
					</Table>
				</Message.Content>
			</Message>
		</Table.Cell>
	);

	function sortCollections(a: ICollectionData, b: ICollectionData): number {
		if (a.needed === b.needed) {
			if (a.goal === b.goal)
				return a.name.localeCompare(b.name);
			return b.goal - a.goal;
		}
		return a.needed - b.needed;
	}
};
