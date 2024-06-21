import { Link } from 'gatsby';
import React from 'react';
import { Popup, Icon, Form, Dropdown, Checkbox, Table } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { Filter } from '../../model/game-elements';
import { PlayerCollection } from '../../model/player';
import { useStateWithStorage } from '../../utils/storage';
import { rewardOptions, RewardsGrid } from '../crewtables/rewards';
import { ITableConfigRow, SearchableTable } from '../searchabletable';

export interface ProgressTableProps {
	playerCollections: PlayerCollection[];
	filterCrewByCollection: (collectionId: number) => void;
	workerRunning: boolean;
};

export const ProgressTable = (props: ProgressTableProps) => {
	const { workerRunning, playerCollections, filterCrewByCollection } = props;
	const context = React.useContext(GlobalContext);

	const [rewardFilter, setRewardFilter] = useStateWithStorage<string | undefined>('collectionstool/rewardFilter', undefined);
	const [showMaxed, setShowMaxed] = useStateWithStorage('collectionstool/showMaxed', false);

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: 'Collection' },
		{ width: 1, column: 'owned', title: 'Total Owned', reverse: true },
		{ width: 1, column: 'progressPct', title: 'Progress', reverse: true },
		{ width: 1, column: 'needed', title: 'Needed', tiebreakers: ['neededPct'] },
		{ width: 3, column: 'totalRewards', title: <span>Milestone Rewards <Popup trigger={<Icon name='help' />} content='Rewards you can claim after immortalizing the needed number of crew to reach the next milestone' /></span>, reverse: true }
	];

	// Rewards will test value against literal symbol string, except when prefixed by:
	//	= Regular expression against symbol, * Special test case
	
	if (workerRunning) {
		return context.core.spin("Calculating Collection Progress...");
	}
	return (
		<React.Fragment>
			<div style={{ margin: '.5em 0' }}>
				<Form>
					<Form.Group inline>
						<Form.Field
							control={Dropdown}
							placeholder='Filter by reward'
							selection
							clearable
							options={rewardOptions}
							value={rewardFilter}
							onChange={(e, { value }) => setRewardFilter(value)}
						/>
						<Form.Field
							control={Checkbox}
							label='Show maxed collections'
							checked={showMaxed}
							onChange={(e, { checked }) => setShowMaxed(checked)}
						/>
					</Form.Group>
				</Form>
			</div>
			<SearchableTable
				id='collections/progress'
				data={playerCollections}
				config={tableConfig}
				renderTableRow={(collection, idx) => renderCollectionRow(collection, idx ?? -1)}
				filterRow={(collection, filter) => showCollectionRow(collection, filter)}
				explanation={
					<div>
						<p>Search for collections by name or trait.</p>
					</div>
				}
			/>
		</React.Fragment>
	);

	function showCollectionRow(collection: PlayerCollection, filters: Filter[]): boolean {
		if (!showMaxed && collection.milestone.goal == 0) return false;

		if (rewardFilter && rewardFilter != '*any') {
			let re: RegExp;
			if (rewardFilter == '*buffs') {
				if (collection.milestone?.buffs?.length == 0) return false;
			}
			else if (rewardFilter.slice(0, 1) == '=') {
				re = new RegExp(rewardFilter.slice(1));
				if (!collection.milestone.rewards?.find(reward => reward.symbol && re.test(reward.symbol))) return false;
			}
			else if (!collection.milestone.rewards?.find(reward => reward.symbol == rewardFilter)) {
				return false;
			}
		}

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

	function renderCollectionRow(collection: any, idx: number): JSX.Element {
		const rewards = collection.totalRewards > 0 ? collection.milestone.buffs.concat(collection.milestone.rewards) : [];

		return (
			<Table.Row key={collection.id} style={{ cursor: 'zoom-in' }} onClick={() => filterCrewByCollection(collection.id)}>
				<Table.Cell>
					<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/collections/#${encodeURI(collection.name)}`}>{collection.name}</Link></span>
					<br/>{collection.simpleDescription}
				</Table.Cell>
				<Table.Cell textAlign='center'>{collection.owned} / {collection.crew.length}</Table.Cell>
				<Table.Cell textAlign='center'>{collection.milestone.goal > 0 ? `${collection.progress} / ${collection.milestone.goal}` : 'MAX'}</Table.Cell>
				<Table.Cell textAlign='center'>{collection.needed}</Table.Cell>
				<Table.Cell textAlign='center'>
					<RewardsGrid rewards={rewards} />
				</Table.Cell>
			</Table.Row>
		);
	}
};
