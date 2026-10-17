import { Link } from 'react-router-dom';
import React from 'react';
import { Popup, Icon, Form, Dropdown, Checkbox, Table } from 'semantic-ui-react';
import { GlobalContext } from '../../../context/globalcontext';
import { Filter } from '../../../model/game-elements';
import { PlayerCollection, PlayerCrew } from '../../../model/player';
import { useStateWithStorage } from '../../../utils/storage';
import { makeRewards, RewardsGrid } from '../../crewtables/rewards';
import { ITableConfigRow, SearchableTable } from '../../searchabletable';
import { CollectionsContext } from '../context';
import { RewardFilter } from '../rewardfilter';
import { DEFAULT_MOBILE_WIDTH } from '../../hovering/hoverstat';
import { compareRewards, rewardsFilterPassFail } from '../../../utils/collectionutils';

export interface ProgressTableProps {
	playerCollections: PlayerCollection[];
	filterCrewByCollection: (collectionId: number) => void;
	workerRunning: boolean;
};

export const ProgressTable = (props: ProgressTableProps) => {
	const { workerRunning, playerCollections, filterCrewByCollection } = props;
	const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const { playerData } = context.player;
	const { crew: allCrew } = context.core;
	//const [rewardFilter, setRewardFilter] = useStateWithStorage<string | undefined>('collectionstool/rewardFilter', undefined);
	const [showMaxed, setShowMaxed] = useStateWithStorage('collectionstool/showMaxed', false);
	const [showScores, setShowScores] = useStateWithStorage('collectionstool/showScores', true, { rememberForever: true });
	const colContext = React.useContext(CollectionsContext);
	const { hardFilter, setHardFilter, setShort, short, searchFilter, setSearchFilter, mapFilter, setMapFilter } = colContext;

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: t('base.collection') },
		{ width: 1, column: 'score.score', title: t('base.score'), reverse: true },
		{ width: 1, column: 'score.details.difficulty', title: t('global.difficulty'), reverse: false },
		{ width: 1, column: 'score.details.loot_score', title: t('global.loot'), reverse: true },
		{ width: 1, column: 'owned', title: t('collections.columns.total_owned'), reverse: true },
		{ width: 1, column: 'progressPct', title: t('collections.columns.progress'), reverse: true },
		{ width: 1, column: 'needed', title: t('collections.columns.needed'), tiebreakers: ['neededPct'] },
		{ width: 3, column: 'totalRewards', title: <span>{t('collections.milestone_rewards')} <Popup trigger={<Icon name='help' />} content={t('collections.milestone_rewards_desc')} /></span>, reverse: true }
	];
	if (!showScores) {
		tableConfig.splice(1, 3);
	}

	const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	const crewSource = React.useMemo(() => {
		if (playerData) {
			return playerData.player.character.crew;
		}
		else {
			return allCrew as PlayerCrew[];
		}
	}, [playerData, allCrew]);

	return (
		<React.Fragment>
			<div style={{ margin: '.5em 0' }}>
				<RewardFilter
					hideCrew={true}
					hardFilter={hardFilter}
					setHardFilter={setHardFilter}
					narrow={narrow}
					grouped={short}
					setGrouped={setShort}
					searchFilter={searchFilter}
					setSearchFilter={setSearchFilter}
					collectionSource={playerCollections}
					crewSource={crewSource}
					selection={mapFilter?.rewardFilter}
					setSelection={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
				/>
				<Form>
					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label={t('collections.options.show_maxed_collections')}
							checked={showMaxed}
							onChange={(e, { checked }) => setShowMaxed(checked)}
						/>
						<Form.Field
							control={Checkbox}
							label={t('collections.options.show_scoring_columns')}
							checked={showScores}
							onChange={(e, { checked }) => setShowScores(checked)}
						/>
					</Form.Group>
				</Form>
			</div>
			{!!mapFilter && <SearchableTable
				id='collections/progress'
				data={playerCollections}
				config={tableConfig}
				renderTableRow={(collection, idx) => renderCollectionRow(collection, idx ?? -1)}
				filterRow={(collection, filter) => showCollectionRow(collection, filter)}
				explanation={
					<div>
						<p>{t('collections.options.search_by_name_or_trait')}</p>
					</div>
				}
			/>}
		</React.Fragment>
	);

	function showCollectionRow(collection: PlayerCollection, filters: Filter[]): boolean {
		if (!rewardsFilterPassFail(mapFilter, [collection], short, true)) return false;
		if (!showMaxed && collection.milestone.goal == 0) return false;
		if (filters.length == 0) return true;

		const matchesFilter = (input: string, searchString: string) =>
			input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let meetsAnyCondition = false;

		for (let filter of filters) {
			let meetsAllConditions = true;
			if (filter.conditionArray?.length === 0) {
				// text search only
				for (let segment of filter.textSegments ?? []) {
					let segmentResult =
						matchesFilter(collection.name, segment.text) ||
						matchesFilter(collection.simpleDescription ?? "", segment.text) ||
						collection.traits?.some(t => matchesFilter(t, segment.text));
					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult ?? false);
				}
			}
			if (meetsAllConditions) {
				meetsAnyCondition = true;
				break;
			}
		}

		return meetsAnyCondition;
	}

	function renderCollectionRow(collection: any, idx: number): React.ReactNode {
		const rewards = collection.totalRewards > 0 ? collection.milestone.buffs.concat(collection.milestone.rewards) : [];

		return (
			<Table.Row key={collection.id} style={{ cursor: 'zoom-in' }} onClick={() => filterCrewByCollection(collection.id)}>
				<Table.Cell>
					<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/collections/#${encodeURI(collection.name)}`}>{collection.name}</Link></span>
					<br/>{collection.simpleDescription}
				</Table.Cell>
				{showScores && <>
					<Table.Cell>{Math.ceil(collection.score.score).toLocaleString()}</Table.Cell>
					<Table.Cell>{collection.score.details.difficulty}</Table.Cell>
					<Table.Cell>{collection.score.details.loot_score}</Table.Cell>
				</>}
				<Table.Cell textAlign='center'>{collection.owned} / {collection.crew.length}</Table.Cell>
				<Table.Cell textAlign='center'>{collection.milestone.goal > 0 ? `${collection.progress} / ${collection.milestone.goal}` : 'MAX'}</Table.Cell>
				<Table.Cell textAlign='center'>{collection.needed}</Table.Cell>
				<Table.Cell textAlign='center'>
					<RewardsGrid
						wrap
						maxCols={4}
						rewards={rewards}
					/>
				</Table.Cell>
			</Table.Row>
		);
	}
};
