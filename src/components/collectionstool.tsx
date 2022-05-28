import React from 'react';
import { Table, Icon, Rating, Form, Checkbox, Dropdown, Header, Grid, Popup } from 'semantic-ui-react';
import { Link } from 'gatsby';

import ItemDisplay from '../components/itemdisplay';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { useStateWithStorage } from '../utils/storage';

type CollectionsToolProps = {
	playerData: any;
	allCrew: any[];
};

const CollectionsTool = (props: CollectionsToolProps) => {
	const { playerData } = props;

	const [allCollections, setAllCollections] = React.useState(undefined);

	if (!allCollections) {
		fetch('/structured/collections.json')
			.then(response => response.json())
			.then(collections => {
				setAllCollections(collections);
			});
		return (<><Icon loading name='spinner' /> Loading...</>);
	}

	const allCrew = JSON.parse(JSON.stringify(props.allCrew));
	const myCrew = JSON.parse(JSON.stringify(playerData.player.character.crew));

	const collectionCrew = [...new Set(allCollections.map(ac => ac.crew).flat())].map(acs => {
		const crew = JSON.parse(JSON.stringify(allCrew.find(ac => ac.symbol == acs)));
		crew.highest_owned_rarity = 0;
		crew.highest_owned_level = 0;
		crew.immortal = false;
		crew.collectionIds = [];
		crew.unmaxedIds = [];
		crew.immortalRewards = [];
		const owned = myCrew.filter(mc => mc.symbol === acs).sort((a, b) => {
			if (a.rarity == b.rarity) {
				if (a.level == b.level) return b.equipment.length - a.equipment.length;
				return b.level - a.level;
			}
			return b.rarity - a.rarity;
		});
		if (owned.length > 0) {
			crew.immortal = owned[0].level == 100 && owned[0].rarity == owned[0].max_rarity && owned[0].equipment.length == 4;
			crew.highest_owned_rarity = owned[0].rarity;
			crew.highest_owned_level = owned[0].level;
		}
		return crew;
	});

	const playerCollections = allCollections.map(ac => {
		let collection = { name: ac.name, progress: 0, milestone: { goal: 0 } };
		if (playerData.player.character.cryo_collections) {
			const pc = playerData.player.character.cryo_collections.find((pc) => pc.name === ac.name);
			if (pc) collection = JSON.parse(JSON.stringify(pc));
		}
		collection.id = ac.id; // Use allCollections ids instead of ids in player data
		collection.crew = ac.crew;
		collection.simpleDescription = collection.description ? simplerDescription(collection.description) : '';
		collection.progressPct = collection.milestone.goal > 0 ? collection.progress / collection.milestone.goal : 1;
		collection.neededPct = 1 - collection.progressPct;
		collection.needed = collection.milestone.goal > 0 ? Math.max(collection.milestone.goal - collection.progress, 0) : 0;
		collection.totalRewards = collection.milestone.buffs?.length + collection.milestone.rewards?.length;
		collection.owned = 0;
		ac.crew.forEach(acs => {
			let cc = collectionCrew.find(crew => crew.symbol === acs);
			cc.collectionIds.push(collection.id);
			if (collection.milestone.goal > 0) {
				cc.unmaxedIds.push(collection.id);
				if (collection.milestone.goal - collection.progress <= 1) {
					mergeRewards(cc.immortalRewards, collection.milestone.buffs);
					mergeRewards(cc.immortalRewards, collection.milestone.rewards);
				}
			}
			if (cc.highest_owned_rarity > 0) collection.owned++;
		});
		return collection;
	});

	return (
		<CollectionsUI playerCollections={playerCollections} collectionCrew={collectionCrew} />
	);

	function mergeRewards(current: any[], rewards: any[]): void {
		if (rewards.length == 0) return;
		rewards.forEach(reward => {
			const existing = current.find(c => c.symbol === reward.symbol);
			if (existing) {
				existing.quantity += reward.quantity;
			}
			else {
				current.push(JSON.parse(JSON.stringify(reward)));
			}
		});
	}

	function simplerDescription(description: string): string {
		let simple = description.replace(/(<([^>]+)>)/g, '')
			.replace('Immortalize ', '')
			.replace(/^the /i, '')
			.replace(/\.$/, '');
		return simple.substr(0, 1).toUpperCase() + simple.substr(1);
	}
};

type CollectionsUIProps = {
	playerCollections: any[];
	collectionCrew: any[];
};

const CollectionsUI = (props: CollectionsUIProps) => {
	const { playerCollections, collectionCrew } = props;

	const [collectionsFilter, setCollectionsFilter] = useStateWithStorage('collectionstool/collectionsFilter', []);

	const crewAnchor = React.useRef(null);

	return (
		<React.Fragment>
			<ProgressTable playerCollections={playerCollections} filterCrewByCollection={filterCrewByCollection} />
			<div ref={crewAnchor} />
			<CrewTable playerCollections={playerCollections} collectionCrew={collectionCrew} collectionsFilter={collectionsFilter} setCollectionsFilter={setCollectionsFilter} />
		</React.Fragment>
	);

	function filterCrewByCollection(collectionId: number): void {
		if (!crewAnchor.current) return;
		setCollectionsFilter([collectionId]);
		crewAnchor.current.scrollIntoView({
			behavior: 'smooth'
		}, 500);
	}
};

type ProgressTableProps = {
	playerCollections: any[];
	filterCrewByCollection: (collectionId: number) => void;
};

const ProgressTable = (props: ProgressTableProps) => {
	const { playerCollections, filterCrewByCollection } = props;

	const [rewardFilter, setRewardFilter] = useStateWithStorage('collectionstool/rewardFilter', undefined);
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
	const rewardOptions = [
		{ key: 'roAnyr', value: '*any', text: 'Any reward' },
		{ key: 'roBuff', value: '*buffs', text: 'Buffs' },
		{ key: 'roEner', value: 'energy', text: 'Chronitons' },
		{ key: 'roCred', value: 'nonpremium', text: 'Credits' },
		{ key: 'roCrew', value: '=_crew$', text: 'Crew' },
		{ key: 'roDili', value: 'premium_purchasable', text: 'Dilithium' },
		{ key: 'roHono', value: 'honor', text: 'Honor' },
		{ key: 'roMeri', value: 'premium_earnable', text: 'Merits' },
		{ key: 'roPort', value: '=premium_\\d+x_bundle', text: 'Portals' },
		{ key: 'roRepl', value: '=^replicator_fuel', text: 'Replicator Fuel' },
		{ key: 'roSche', value: '=_ship_schematic$', text: 'Ship schematics' },
		{ key: 'roBoos', value: '=minor_consumables_\\d+x_bundle', text: 'Shuttle boosts' },
		{ key: 'roTrai', value: '=_production_training$', text: 'Training' }
	];

	return (
		<React.Fragment>
			<p>Search for collections by name or description. You can also filter collections by milestone reward types. Click a row to view crew that will help you make progress on that collection.</p>
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
				renderTableRow={(collection, idx) => renderCollectionRow(collection, idx)}
				filterRow={(collection, filter) => showCollectionRow(collection, filter)}
				explanation={
					<div>
						<p>Search for collections by name or trait.</p>
					</div>
				}
			/>
		</React.Fragment>
	);

	function showCollectionRow(collection: any, filters: []): boolean {
		if (!showMaxed && collection.milestone.goal == 0) return false;

		if (rewardFilter && rewardFilter != '*any') {
			let re;
			if (rewardFilter == '*buffs') {
				if (collection.milestone.buffs.length == 0) return false;
			}
			else if (rewardFilter.substr(0, 1) == '=') {
				re = new RegExp(rewardFilter.substr(1));
				if (!collection.milestone.rewards.find(reward => re.test(reward.symbol))) return false;
			}
			else if (!collection.milestone.rewards.find(reward => reward.symbol == rewardFilter)) {
				return false;
			}
		}

		if (filters.length == 0) return true;

		const matchesFilter = (input: string, searchString: string) =>
			input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		let meetsAnyCondition = false;

		for (let filter of filters) {
			let meetsAllConditions = true;
			if (filter.conditionArray.length === 0) {
				// text search only
				for (let segment of filter.textSegments) {
					let segmentResult =
						matchesFilter(collection.name, segment.text) ||
						matchesFilter(collection.simpleDescription, segment.text) ||
						collection.traits?.some(t => matchesFilter(t, segment.text));
					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
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

type CrewTableProps = {
	playerCollections: any[];
	collectionCrew: any[];
	collectionsFilter: number[];
	setCollectionsFilter: (collectionIds: number[]) => void;
};

const CrewTable = (props: CrewTableProps) => {
	const { playerCollections, collectionCrew, collectionsFilter, setCollectionsFilter } = props;

	const [showPortalOnly, setShowPortalOnly] = useStateWithStorage('collectionstool/showPortalOnly', false);

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: 'Crew' },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'unmaxedIds.length', title: 'Collections', reverse: true },
		{ width: 3, column: 'immortalRewards.length', title: <span>Immortal Rewards <Popup trigger={<Icon name='help' />} content='Rewards you can claim if you immortalize this crew right now' /></span>, reverse: true }
	];

	const collectionsOptions = playerCollections.filter(collection => collection.milestone.goal > 0).sort((a, b) => a.name.localeCompare(b.name)).map(collection => {
		return {
			key: collection.id,
			value: collection.id,
			text: collection.name + ' (' + collection.progress + ' / ' + collection.milestone.goal + ')'
		};
	});

	return (
		<React.Fragment>
			<Header as='h4'>Collection Crew</Header>
			<p>Search for crew that will help you make progress on collections and see what rewards you could claim by immortalizing certain crew right now. Note: maxed collections and immortalized crew will not be shown in this table.</p>
			<div style={{ margin: '1em 0' }}>
				<Form.Field
					placeholder='Filter by collections'
					control={Dropdown}
					clearable
					multiple
					search
					selection
					options={collectionsOptions}
					value={collectionsFilter}
					onChange={(e, { value }) => setCollectionsFilter(value) }
					closeOnChange
				/>
			</div>
			<div style={{ margin: '1em 0' }}>
				<Form.Group inline>
					<Form.Field
						control={Checkbox}
						label='Only show crew in portal'
						checked={showPortalOnly}
						onChange={(e, { checked }) => setShowPortalOnly(checked)}
					/>
				</Form.Group>
			</div>
			<SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>
		</React.Fragment>
	);

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (crew.immortal) return false;
		if (showPortalOnly && !crew.in_portal) return false;
		if (collectionsFilter.length > 0) {
			let hasAllCollections = true;
			for (let i = 0; i < collectionsFilter.length; i++) {
				if (!crew.unmaxedIds.includes(collectionsFilter[i])) {
					hasAllCollections = false;
					break;
				}
			}
			if (!hasAllCollections) return false;
		}
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderCrewRow(crew: any, idx: number): JSX.Element {
		const unmaxed = crew.unmaxedIds.map(id => { return playerCollections.find(pc => pc.id === id) });
		const tabledProgress = unmaxed.sort((a, b) => a.needed - b.needed).map(collection => {
			return (
				<tr key={collection.id}>
					<td style={{ whiteSpace: 'nowrap', fontSize: '.95em' }}>{collection.name}</td>
					<td style={{ textAlign: 'right', fontSize: '.95em' }}>{collection.progress} / {collection.milestone.goal}</td>
				</tr>
			);
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
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell>
					{tabledProgress && (
						<table style={{ width: '100%' }}>
							<tbody>{tabledProgress}</tbody>
						</table>
					)}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<RewardsGrid rewards={crew.immortalRewards} />
				</Table.Cell>
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		if (crew.immortal) {
			return (
				<div>
					<Icon name='snowflake' /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			return (
				<div>
					{crew.highest_owned_rarity > 0 && (<span>Level {crew.highest_owned_level}</span>)}
				</div>
			);
		}
	}
};

const RewardsGrid = (props: any) => {
	const { rewards } = props;

	if (rewards.length == 0) return (<></>);

	const getImageName = (reward) => {
		let img = reward.icon?.file.replace(/\//g, '_');
		if (img.substr(0, 1) == '_') img = img.substr(1); else img = '/atlas/' + img;
		if (img.substr(-4) != '.png') img += '.png';
		return img;
	};

	const quantityLabel = (quantity) => {
		if (quantity >= 10000)
			return quantity/1000+'K';
		return quantity;
	};

	return (
		<Grid columns={rewards.length}>
			{rewards.map((reward, idx) => {
				const img = getImageName(reward);
				return (
					<Grid.Column key={idx}>
						<ItemDisplay
							src={`${process.env.GATSBY_ASSETS_URL}${img}`}
							size={32}
							maxRarity={reward.rarity}
						/>
						{reward.quantity > 1 && (<div><small>{quantityLabel(reward.quantity)}</small></div>)}
					</Grid.Column>
				);
			})}
		</Grid>
	);
};

export default CollectionsTool;
