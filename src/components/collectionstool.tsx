import React from 'react';
import { Table, Icon, Rating, Form, Checkbox, Dropdown, Header, Grid, Popup } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import ItemDisplay from '../components/itemdisplay';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { useStateWithStorage } from '../utils/storage';
import { CrewMember } from '../model/crew';
import { Collection, Filter } from '../model/game-elements';
import { BuffBase, CompletionState, CryoCollection, ImmortalReward, Milestone, PlayerCollection, PlayerCrew, PlayerData } from '../model/player';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { calculateBuffConfig } from '../utils/voyageutils';
import { crewCopy, navToCrewPage, oneCrewCopy } from '../utils/crewutils';
import { MergedContext } from '../context/mergedcontext';
import { ItemHoverStat } from './hovering/itemhoverstat';
import { TinyStore } from '../utils/tiny';

const CollectionsTool = () => {
	const { playerData, allCrew: crew } = React.useContext(MergedContext);
	const [allCollections, setAllCollections] = React.useState<Collection[] | null>(null);

	if (!allCollections) {
		fetch('/structured/collections.json')
			.then(response => response.json())
			.then((collections: Collection[]) => {
				setAllCollections(collections);
			});
		return (<><Icon loading name='spinner' /> Loading...</>);
	}

	const allCrew = JSON.parse(JSON.stringify(crew)) as PlayerCrew[];
	const myCrew = crewCopy(playerData.player.character.crew);

	const collectionCrew = [...new Set(allCollections.map(ac => ac.crew).flat())].map(acs => {
		const crew = oneCrewCopy(allCrew.find(ac => ac.symbol == acs) as PlayerCrew) as PlayerCrew;
		crew.highest_owned_rarity = 0;
		crew.highest_owned_level = 0;
		crew.immortal = CompletionState.DisplayAsImmortalUnowned;
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
			crew.action = { ... owned[0].action };
			crew.ship_battle = { ... owned[0].ship_battle };
			crew.immortal = owned[0].immortal;
			if ((owned[0].level == 100 && owned[0].rarity == owned[0].max_rarity && (!owned[0].equipment || owned[0].equipment?.length == 4))) {
				crew.immortal = CompletionState.Immortalized;
			}
			crew.rarity = owned[0].rarity;
			crew.level = owned[0].level;
			crew.base_skills = {...owned[0].base_skills};

			crew.highest_owned_rarity = owned[0].rarity;
			crew.highest_owned_level = owned[0].level;
		}
		return crew;
	});

	const playerCollections = allCollections.map(ac => {
		let collection: PlayerCollection = { id: ac.id, name: ac.name, progress: 0, milestone: { goal: 0 }, owned: 0 };
		if (playerData.player.character.cryo_collections) {
			const pc = playerData.player.character.cryo_collections.find((pc) => pc.name === ac.name);
			if (pc) collection = JSON.parse(JSON.stringify(pc));
		}
		collection.id = ac.id; // Use allCollections ids instead of ids in player data
		collection.crew = ac.crew;
		collection.simpleDescription = collection.description ? simplerDescription(collection.description) : '';

		if (collection.milestone.goal != 'n/a' && collection.progress != 'n/a') {
			collection.progressPct = collection.milestone.goal > 0 ? collection.progress / collection.milestone.goal : 1;
			collection.neededPct = 1 - collection.progressPct;
			collection.needed = collection.milestone.goal > 0 ? Math.max(collection.milestone.goal - collection.progress, 0) : 0;
		}

		collection.totalRewards = (collection.milestone.buffs?.length ?? 0) + (collection.milestone.rewards?.length ?? 0);
		collection.owned = 0;

		ac.crew?.forEach(acs => {
			let cc = collectionCrew.find(crew => crew.symbol === acs);
			if (!cc) return;
			if (!cc.collectionIds) cc.collectionIds = [] as number[];
			cc.collectionIds.push(collection.id);
			if (collection.milestone.goal != 'n/a' && collection.milestone.goal > 0) {
				if (!cc.unmaxedIds) cc.unmaxedIds = [];
				if (!cc.immortalRewards) cc.immortalRewards = [];
				cc.unmaxedIds.push(collection.id);
				if (collection.progress != 'n/a' && collection.milestone.goal - collection.progress <= 1) {
					mergeRewards(cc.immortalRewards, collection.milestone.buffs);
					mergeRewards(cc.immortalRewards, collection.milestone.rewards);
				}
			}
			if ((cc.highest_owned_rarity ?? 0) > 0) collection.owned++;
		});
		return collection;
	});

	return (
		<CollectionsUI playerData={playerData} allCrew={allCrew} playerCollections={playerCollections} collectionCrew={collectionCrew} />
	);

	function mergeRewards(current: ImmortalReward[], rewards: BuffBase[] | null | undefined): void {
		if (!rewards || rewards.length == 0) return;
		rewards.forEach(reward => {
			const existing = current.find(c => c.symbol === reward.symbol);
			if (existing) {
				existing.quantity += reward.quantity ?? 1;
			}
			else {
				current.push(JSON.parse(JSON.stringify(reward)));
			}
		});
	}

	function simplerDescription(description: string): string {
		let simple = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>') /* Webarchive import fix */
			.replace(/(<([^>]+)>)/g, '')
			.replace('Immortalize ', '')
			.replace(/^the /i, '')
			.replace(/\.$/, '');
		return simple.substr(0, 1).toUpperCase() + simple.substr(1);
	}
};

type CollectionsUIProps = {
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	allCrew: PlayerCrew[];
	playerData: PlayerData;
};

const CollectionsUI = (props: CollectionsUIProps) => {
	const { allCrew, playerCollections, collectionCrew } = props;
	const tinyCol = TinyStore.getStore('collections');   

	const offsel = tinyCol.getValue<string | undefined>("selectedCollection");
	const selColId = playerCollections.find(f => f.name === offsel)?.id;

	tinyCol.removeValue("selectedCollection");

	const [collectionsFilter, setCollectionsFilter] = useStateWithStorage('collectionstool/collectionsFilter', selColId !== undefined ? [selColId] : [] as number[]);
	const crewAnchor = React.useRef<HTMLDivElement>(null);


	if (selColId !== undefined && !collectionsFilter?.includes(selColId)) {
		
		if (playerCollections?.some(c => c.id === selColId && !!c.milestone?.goal && !!c.needed)) {
			setCollectionsFilter([...collectionsFilter, selColId]);
			window.setTimeout(() => {
				crewAnchor?.current?.scrollIntoView({
					behavior: 'smooth',
				});	
			});			
		}
		// else {
		// 	window.setTimeout(() => {
		// 		navigate("/collections#" + encodeURIComponent(offsel ?? ""));
		// 	});			
		// }
	}

	console.log("Collections")
	console.log(playerCollections);

	return (
		<React.Fragment>
			<ProgressTable playerCollections={playerCollections} filterCrewByCollection={filterCrewByCollection} />
			<div ref={crewAnchor} />
			<CrewTable playerData={props.playerData} allCrew={allCrew} playerCollections={playerCollections} collectionCrew={collectionCrew} collectionsFilter={collectionsFilter} setCollectionsFilter={setCollectionsFilter} />
		</React.Fragment>
	);

	function filterCrewByCollection(collectionId: number): void {
		if (!crewAnchor.current) return;
		setCollectionsFilter([collectionId]);
		let opt: ScrollOptions
		crewAnchor.current.scrollIntoView({
			behavior: 'smooth',
		});
	}
};

type ProgressTableProps = {
	playerCollections: PlayerCollection[];
	filterCrewByCollection: (collectionId: number) => void;
};

const ProgressTable = (props: ProgressTableProps) => {
	const { playerCollections, filterCrewByCollection } = props;

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
			let re;
			if (rewardFilter == '*buffs') {
				if (collection.milestone?.buffs?.length == 0) return false;
			}
			else if (rewardFilter.substr(0, 1) == '=') {
				re = new RegExp(rewardFilter.substr(1));
				if (!collection.milestone.rewards?.find(reward => re.test(reward.symbol))) return false;
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

type CrewTableProps = {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	collectionsFilter: number[];
	setCollectionsFilter: (collectionIds: number[]) => void;
	playerData: PlayerData;
};

const CrewTable = (props: CrewTableProps) => {
	const { allCrew, playerCollections, collectionCrew, collectionsFilter, setCollectionsFilter } = props;

	const [ownedFilter, setOwnedFilter] = useStateWithStorage('collectionstool/ownedFilter', '');
	const [fuseFilter, setFuseFilter] = useStateWithStorage('collectionstool/fuseFilter', '');
	const [rarityFilter, setRarityFilter] = useStateWithStorage('collectionstool/rarityFilter', [] as number[]);

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: 'Crew', pseudocolumns: ['name', 'level', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'unmaxedIds.length', title: 'Collections', reverse: true },
		{ width: 3, column: 'immortalRewards.length', title: <span>Immortal Rewards <Popup trigger={<Icon name='help' />} content='Rewards you can claim if you immortalize this crew right now' /></span>, reverse: true }
	];

	const collectionsOptions = playerCollections.filter(collection => collection.milestone.goal != 'n/a' && collection.milestone.goal > 0).sort((a, b) => a.name.localeCompare(b.name)).map(collection => {
		return {
			key: collection.id,
			value: collection.id,
			text: collection.name + ' (' + collection.progress + ' / ' + collection.milestone.goal + ')'
		};
	});

	const ownedFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'unowned', value: 'unowned', text: 'Only show unowned crew' },
		{ key: 'owned', value: 'owned', text: 'Only show owned crew' },
		{ key: 'owned-impact', value: 'owned-impact', text: 'Only show crew needing 1 fuse' },
		{ key: 'owned-ff', value: 'owned-ff', text: 'Only show fully fused crew' }
	];

	const fuseFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'portal', value: 'portal', text: 'Only show retrievable crew' },
		{ key: 'portal-unique', value: 'portal-unique', text: 'Only show uniquely retrievable crew' },
		{ key: 'portal-nonunique', value: 'portal-nonunique', text: 'Only show non-uniquely retrievable crew' },
		{ key: 'nonportal', value: 'nonportal', text: 'Only show non-retrievable crew' }
	];

	const rarityFilterOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];
	const buffConfig = calculateBuffConfig(props.playerData.player);
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
					onChange={(e, { value }) => setCollectionsFilter(value)}
					closeOnChange
				/>
			</div>
			<div style={{ margin: '1em 0' }}>
				<Form>
					<Form.Group inline>
						<Form.Field
							placeholder='Filter by owned status'
							control={Dropdown}
							clearable
							selection
							options={ownedFilterOptions}
							value={ownedFilter}
							onChange={(e, { value }) => setOwnedFilter(value)}
						/>
						<Form.Field
							placeholder='Filter by retrieval option'
							control={Dropdown}
							clearable
							selection
							options={fuseFilterOptions}
							value={fuseFilter}
							onChange={(e, { value }) => setFuseFilter(value)}
						/>
						<Form.Field
							placeholder='Filter by rarity'
							control={Dropdown}
							clearable
							multiple
							selection
							options={rarityFilterOptions}
							value={rarityFilter}
							onChange={(e, { value }) => setRarityFilter(value)}
							closeOnChange
						/>
					</Form.Group>
				</Form>
			</div>
			<SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>
			<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew, props.playerData.player.character.crew, buffConfig)} targetGroup='collectionsTarget' />
			<ItemHoverStat targetGroup='collectionsTarget_item' />
		</React.Fragment>
	);

	function showThisCrew(crew: PlayerCrew, filters: Filter[], filterType: string | null | undefined): boolean {

		if (crew.immortal === -1 || crew.immortal > 0) {
			return false;
		}

		if (!filterType) return true;

		if (collectionsFilter.length > 0) {
			let hasAllCollections = true;
			for (let i = 0; i < collectionsFilter.length; i++) {
				if (!crew.unmaxedIds?.includes(collectionsFilter[i])) {
					hasAllCollections = false;
					break;
				}
			}
			if (!hasAllCollections) return false;
		}
		if (ownedFilter === 'unowned' && (crew.highest_owned_rarity ?? 0) > 0) return false;
		if (ownedFilter.substr(0, 5) === 'owned' && crew.highest_owned_rarity === 0) return false;
		if (ownedFilter === 'owned-impact' && (crew.max_rarity - (crew.highest_owned_rarity ?? 0)) > 1) return false;
		if (ownedFilter === 'owned-ff' && crew.max_rarity !== crew.highest_owned_rarity) return false;
		if (rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (fuseFilter.substr(0, 6) === 'portal' && !crew.in_portal) return false;
		if (fuseFilter === 'portal-unique' && !crew.unique_polestar_combos?.length) return false;
		if (fuseFilter === 'portal-nonunique' && crew.unique_polestar_combos?.length !== 0) return false;
		if (fuseFilter === 'nonportal' && crew.in_portal) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderCrewRow(crew: PlayerCrew, idx: number): JSX.Element {
		const unmaxed = crew.unmaxedIds?.map(id => { return playerCollections.find(pc => pc.id === id) });
		const tabledProgress = unmaxed?.sort((a, b) => (a?.needed ?? 0) - (b?.needed ?? 0)).map(collection => {
			if (!collection) return <></>
			return (
				<tr key={collection.id}>
					<td style={{ whiteSpace: 'nowrap', fontSize: '.95em' }}>{collection.name}</td>
					<td style={{ textAlign: 'right', fontSize: '.95em' }}>{collection.progress} / {collection.milestone.goal}</td>
				</tr>
			);
		});
		const buffConfig = calculateBuffConfig(props.playerData.player);

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
							<CrewTarget inputItem={crew}  targetGroup='collectionsTarget'>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
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
		if (crew.immortal > 0) {
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
	const context = React.useContext(MergedContext);
	const { playerData, items, allCrew } = context;

	if (rewards.length == 0) return (<></>);

	const getImageName = (reward) => {
		let img = reward.icon?.file.replace(/\//g, '_');
		if (img.substr(0, 1) === '_') img = img.substr(1); else img = '/atlas/' + img;
		if (img.substr(-4) !== '.png') img += '.png';
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
							targetGroup={reward.type === 1 ? 'collectionsTarget' : 'collectionsTarget_item'}
							itemSymbol={reward.symbol}
							allCrew={allCrew}
							allItems={items}
							playerData={playerData}
							src={`${process.env.GATSBY_ASSETS_URL}${img}`}
							size={32}
							maxRarity={reward.rarity}
							rarity={reward.rarity}
						/>
						{reward.quantity > 1 && (<div><small>{quantityLabel(reward.quantity)}</small></div>)}
					</Grid.Column>
				);
			})}
		</Grid>
	);
};

export default CollectionsTool;
