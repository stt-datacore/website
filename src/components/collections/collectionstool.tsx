import { Link } from 'gatsby';
import React from 'react';
import { Checkbox, Dropdown, DropdownItemProps, Form, Header, Icon, Popup, Rating, Step, Table } from 'semantic-ui-react';

import { UnifiedWorker } from '../../typings/worker';
import { ITableConfigRow, SearchableTable } from '../searchabletable';

import { GlobalContext } from '../../context/globalcontext';
import { CollectionGroup, CollectionMap, CollectionWorkerConfig, CollectionWorkerResult, ComboCostMap } from '../../model/collectionfilter';
import { CrewMember } from '../../model/crew';
import { Filter } from '../../model/game-elements';
import { BuffBase, CompletionState, ImmortalReward, MilestoneBuff, PlayerCollection, PlayerCrew, PlayerData, Reward } from '../../model/player';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { crewCopy, gradeToColor, numberToGrade, oneCrewCopy } from '../../utils/crewutils';
import { useStateWithStorage } from '../../utils/storage';
import { TinyStore } from '../../utils/tiny';
import { calculateBuffConfig } from '../../utils/voyageutils';
import { RewardsGrid, rewardOptions } from '../crewtables/rewards';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { CollectionGroupTable } from './groupview';
import { CollectionOptimizerTable } from './optimizerview';
import CollectionsOverviewComponent from './overview';
import { CollectionFilterContext, CollectionFilterProvider } from './filtercontext';
import { RewardFilter } from './rewardfilter';
import { compareRewards, rewardsFilterPassFail, starCost } from '../../utils/collectionutils';
import { navToCrewPage } from '../../utils/nav';
import { ICrewFilter, IRosterCrew } from '../crewtables/model';
import { CrewMaintenanceFilter } from '../crewtables/filters/crewmaintenance';

const CollectionsTool = () => {
	const context = React.useContext(GlobalContext);	
	const { playerData } = context.player;
	const { crew, collections: allCollections } = context.core;

	if (!context.core.ready(['collections'])) {	
		return context.core.spin ? context.core.spin() : <></>;
	}

	if (!playerData) return <CollectionsOverviewComponent />;
	// ... etc ...

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
		let collection: PlayerCollection = { id: ac.id, name: ac.name, progress: 0, milestone: { goal: 0 }, owned: 0, milestones: ac.milestones };
		if (playerData.player.character.cryo_collections) {
			const pc = playerData.player.character.cryo_collections.find((pc) => pc.name === ac.name);
			if (pc) collection = { ...collection, ...JSON.parse(JSON.stringify(pc)) };
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
		return simple.slice(0, 1).toUpperCase() + simple.slice(1);
	}
};

export interface CollectionsUIProps {
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	allCrew: PlayerCrew[];
	playerData: PlayerData;
};

const CollectionsUI = (props: CollectionsUIProps) => {
	const colContext = React.useContext(CollectionFilterContext);
	const { allCrew, playerCollections, collectionCrew } = props;
	const tinyCol = TinyStore.getStore('collections');   

	// TODO: Getting then immediately removing. must be transient. figure out where this goes.
	const offsel = tinyCol.getValue<string | undefined>("collectionsTool/selectedCollection");
	tinyCol.removeValue("collectionsTool/selectedCollection");

	const selColId = playerCollections.find(f => f.name === offsel)?.id;


	const { setSearchFilter, mapFilter, setMapFilter } = colContext;
	const crewAnchor = React.useRef<HTMLDivElement>(null);

	if (selColId !== undefined && !mapFilter?.collectionsFilter?.includes(selColId)) {
		
		if (playerCollections?.some(c => c.id === selColId && !!c.milestone?.goal && !!c.needed)) {
			setMapFilter({...mapFilter, collectionsFilter: [...mapFilter?.collectionsFilter ?? [], ...[selColId]]});
			window.setTimeout(() => {
				crewAnchor?.current?.scrollIntoView({
					behavior: 'smooth',
				});	
			});			
		}
	}

	return (
		<React.Fragment>
			<div ref={crewAnchor} />
			<CollectionFilterProvider pageId='collectionTool' playerCollections={playerCollections}>
				<CollectionsViews 
					filterCrewByCollection={filterCrewByCollection}
					allCrew={allCrew} 
					playerCollections={playerCollections} 
					collectionCrew={collectionCrew} />
			</CollectionFilterProvider>
		</React.Fragment>
	);

	function filterCrewByCollection(collectionId: number): void {
		setSearchFilter(''); 
		setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collectionId]});
	}
};

export interface ProgressTableProps {
	playerCollections: PlayerCollection[];
	filterCrewByCollection: (collectionId: number) => void;
	workerRunning: boolean;
};

const ProgressTable = (props: ProgressTableProps) => {
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

function mergeTiers(col: PlayerCollection, startTier: number, endTier: number): PlayerCollection {
	let result = JSON.parse(JSON.stringify(col)) as PlayerCollection;
	

	let mergedRewards = {} as { [key: number]: Reward };
	let mergedBuffs = {} as { [key: number]: MilestoneBuff };
	let mergedCount = 0;

	result.milestones?.forEach((m, idx) => {
		if (idx >= startTier && idx <= endTier) {
			mergedCount = m.goal;

			m.rewards.forEach((reward) => {
				if (!(reward.id in mergedRewards)) {
					mergedRewards[reward.id] = JSON.parse(JSON.stringify(reward));
				}
				else {
					mergedRewards[reward.id].quantity += reward.quantity;
				}
			});

			m.buffs.forEach((buff) => {
				if (!(buff.id in mergedBuffs)) {
					mergedBuffs[buff.id] = JSON.parse(JSON.stringify(buff));
				}	
				else {
					mergedBuffs[buff.id].quantity ??= 1;
					(mergedBuffs[buff.id].quantity as number) += buff.quantity ?? 1;
				}
			})
		}
	});

	result.milestone = { 
		... result.milestone,
		goal: mergedCount,
		buffs: Object.values(mergedBuffs),
		rewards: Object.values(mergedRewards)
	};
	
	if (result.milestone.goal != 'n/a' && result.progress != 'n/a') {
		result.progressPct = result.milestone.goal > 0 ? result.progress / result.milestone.goal : 1;
		result.neededPct = 1 - result.progressPct;		
		result.needed = result.milestone.goal > 0 ? Math.max(result.milestone.goal - result.progress, 0) : 0;
	}

	result.totalRewards = (result.milestone.buffs?.length ?? 0) + (result.milestone.rewards?.length ?? 0);

	return result;
}


export interface CollectionsViewsProps {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	filterCrewByCollection: (collectionId: number) => void;
};

const CollectionsViews = (props: CollectionsViewsProps) => {

	const context = React.useContext(GlobalContext);

	const { playerData } = context.player;
	if (!playerData) return <></>;

	const colContext = React.useContext(CollectionFilterContext);

	const [workerRunning, setWorkerRunning] = React.useState(false);
	const [colGroups, setColGroups] = React.useState<CollectionMap[]>([]);
	const [colOptimized, setColOptimized] = React.useState<CollectionGroup[]>([]);
	const [costMap, setCostMap] = React.useState<ComboCostMap[]>([]);

	const { playerCollections: tempCol, collectionCrew } = props;
	const { favorited, hardFilter, setHardFilter, tierFilter, setTierFilter, byCost, showIncomplete, matchMode, checkCommonFilter, costMode, setShort, short, mapFilter, setSearchFilter, setMapFilter, ownedFilter, setOwnedFilter, rarityFilter, setRarityFilter, searchFilter, fuseFilter, setFuseFilter } = colContext;
	
	const playerCollections = tempCol.filter((col) => {
		if (hardFilter && mapFilter?.rewardFilter) {
			return rewardsFilterPassFail(mapFilter, [col], short);
		}
		else {
			return true;
		}
	});
	
	const costs = [0, 0, 500, 4500, 18000, costMode === 'sale' ? 40000 : 50000];

	let tscore = 0;
	let tscoren = 0;
	let tstars = [1,1,1,1,1,1];

	collectionCrew.forEach((crew) => {
		crew.collectionScore = 0;
		crew.collectionScoreN = 0;
		if (!showThisCrew(crew, [], 'Exact')) return;
		crew.collectionIds = crew.collectionIds?.filter(c => playerCollections.some(col => col.id === c));
		crew.collections = crew.collections?.filter(c => playerCollections.some(col => col.name === c));
		
		let crare = crew.rarity;
		let max_rare = crew.max_rarity;
		if (crare === undefined) {
			crare = 1;
		}
		
		let pfilter = playerCollections.filter((col) => crew.collectionIds?.some(nid => nid === col.id) && !!col.needed);
		if (!pfilter.length) {
			return;
		}
		let ascores = [] as number[];
		pfilter.forEach((col) => {
			if (col.milestone.goal === 'n/a') return;
			if (!col.needed) return;

			ascores.push(1 / col.needed);
		})
		
		let cscore = ascores.reduce((p, n) => p + n, 0);
		crew.collectionScore = Math.round(cscore * 10000);

		if (crew.collectionScore > tscore) {
			tscore = crew.collectionScore;
		}

		if (max_rare !== crare) {
			
			if (tstars[max_rare] < crare) {
				tstars[max_rare] = crare;
			}

			crew.collectionScoreN = Math.round(cscore / ((costs[max_rare] * (max_rare - crare))) * 1000000000);
			if (crew.collectionScoreN > tscoren) {
				tscoren = crew.collectionScoreN;
			}
		}
		else {
			crew.collectionScoreN = -1;
		}
		
	});

	const topscore = (tscore);
	const topscoren = (tscoren);
		
	const tierOpts = [] as DropdownItemProps[];

	if (mapFilter.collectionsFilter?.length === 1) {
		let idx = playerCollections.findIndex(fc => fc.id === (!!mapFilter.collectionsFilter ? mapFilter.collectionsFilter[0] : null));

		if (idx >= 0) {
			let n = playerCollections[idx].claimable_milestone_index ?? -1;
			
			if (n !== -1 && n != ((playerCollections[idx].milestones?.length ?? 0) - 1)) {
				let l = (!!playerCollections[idx].milestones ? playerCollections[idx].milestones?.length ?? 0 : 0);
				let mi = playerCollections[idx].milestones ?? [];
				let crew = 0;
				for (let i = n; i < l; i++) {
					crew = mi[i].goal;
					tierOpts.push({
						key: i,
						value: i,
						text: `${i + 1} (${crew} Crew)`
					});
				}
	
				if (tierFilter > 1 && mapFilter.collectionsFilter?.length === 1) {
					playerCollections[idx] = mergeTiers(playerCollections[idx], playerCollections[idx].claimable_milestone_index ?? 0, tierFilter);
				}
			}
		}
	
	}

	const [tabIndex, setTabIndex] = useStateWithStorage('collectionstool/tabIndex', 0, { rememberForever: true });

	const compareCrewRewards = (a: PlayerCrew, b: PlayerCrew): number => {
		if (!!a.immortalRewards?.length != !!b.immortalRewards?.length) {
			if (a.immortalRewards?.length) return 1;
			else if (b.immortalRewards?.length) return -1;
		}
		let acol = a.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let bcol = b.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let r = compareRewards(mapFilter, acol, bcol, short);		
		return -r;
	}

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: 'Crew', pseudocolumns: ['name', 'level', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 2, column: 'unmaxedIds.length', title: 'Collections', reverse: true },
		{ 
			width: 1, 
			column: 'collectionScore', 
			title: <span>Grade <Popup trigger={<Icon name='help' />} content={"A metric of a crew's usefulness in completing the most number of collections approaching a milestone"} /></span>, 
			reverse: true
		},
		{ 
			width: 1, 
			column: 'collectionScoreN', 
			title: <span>Star Grade <Popup trigger={<Icon name='help' />} content='A metric based off of Grade that takes into account highest owned rarity' /></span>, 
			reverse: true,
			customCompare: (a: PlayerCrew, b: PlayerCrew) => {
				if (a.collectionScoreN !== undefined && b.collectionScoreN !== undefined) {
					if (a.collectionScoreN === -1 && b.collectionScoreN === -1) {
						if (a.collectionScore !== undefined && b.collectionScore !== undefined) {
							return a.collectionScore - b.collectionScore;
						}	
					}	
					else if (a.collectionScoreN === -1) {
						return 1;
					}
					else if (b.collectionScoreN === -1) {
						return -1;
					}
					else {
						return a.collectionScoreN - b.collectionScoreN;
					}
				}
				return 0;
			}
		},
		{ 
			width: 3, 
			column: 'immortalRewards.length', 
			title: <span>Immortal Rewards <Popup trigger={<Icon name='help' />} content='Rewards you can claim if you immortalize this crew right now' /></span>, 
			reverse: true,
			customCompare: !!mapFilter?.rewardFilter?.length ? compareCrewRewards : undefined
		}
	];

	const collectionsOptions = playerCollections.filter(collection => collection.milestone.goal != 'n/a' && collection.milestone.goal > 0).sort((a, b) => a.name.localeCompare(b.name)).map(collection => {
		return {
			key: collection.id,
			value: collection.id,
			text: collection.name + ' (' + collection.progress + ' / ' + collection.milestone.goal + ')'
		};
	});

	const ownedFilterOptions = [] as DropdownItemProps;

	if (((tabIndex === 0 || !!mapFilter?.collectionsFilter?.length) && tabIndex !== 3)) {
		ownedFilterOptions.push({ key: 'none', value: '', text: 'Show all crew' })
		ownedFilterOptions.push({ key: 'unowned', value: 'unowned', text: 'Only show unowned crew' });
	}

	ownedFilterOptions.push({ key: 'owned', value: 'owned', text: 'Only show owned crew' })
	ownedFilterOptions.push({ key: 'owned-impact', value: 'owned-impact', text: 'Only show crew needing 1 fuse' });
	ownedFilterOptions.push({ key: 'owned-threshold', value: 'owned-threshold', text: 'Only show crew needing 1 or 2 fuses' });
	ownedFilterOptions.push({ key: 'owned-ff', value: 'owned-ff', text: 'Only show fully fused crew' });

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
	
	let selnum = undefined as number | undefined;

	if (typeof window !== 'undefined' && !!window.location.search?.length) {
		if (context.player.playerData) {
			let params = new URLSearchParams(window.location.search);
			let sel = params.get("select");
			let findcol = playerCollections?.find(f => f.name === sel);
			if (findcol) {
				const msel = selnum = findcol.id;
				if (!mapFilter?.collectionsFilter?.includes(msel)) {				
					setMapFilter({ ... (mapFilter ?? {}), collectionsFilter: [msel]});
					window.setTimeout(() => {
						window.history.replaceState({}, document.title, "/collections");
						setTabIndex(3);
					});
				}			
			}
		}
	}

	const offPageSelect = selnum;

	const processWorkerResult = (result: CollectionWorkerResult) => {
		setColGroups(result.maps);
		setColOptimized(result.groups);
		setCostMap(result.costMap);
		setTimeout(() => {
			setWorkerRunning(false);
		});		
	}

	const runWorker = () => {
		if (workerRunning) return;

		const worker = new UnifiedWorker();
		worker.addEventListener('message', (message: { data: { result: CollectionWorkerResult; }; }) => processWorkerResult(message.data.result));
		const workerName = 'colOptimizer2';

		worker.postMessage({
			worker: workerName,
			config: {
				playerCollections,
				playerData: context.player.playerData,
				filterProps: {
					mapFilter: offPageSelect ? { ... mapFilter, collectionsFilter: [offPageSelect] } : mapFilter,
					searchFilter,
					rarityFilter,
					fuseFilter,
					ownedFilter,
					short,
					costMode,
					favorited,
					showIncomplete
				},
				collectionCrew,
				matchMode: matchMode,
				byCost: byCost
			} as CollectionWorkerConfig
		});
	}
	
	const buffConfig = calculateBuffConfig(playerData.player);

	const renderTable = (workerRunning: boolean) => {		
		return (
		
		<React.Fragment>

			<RewardFilter
					hardFilter={hardFilter}		
					setHardFilter={setHardFilter}
					grouped={short}
					setGrouped={setShort}
					searchFilter={searchFilter}
					setSearchFilter={setSearchFilter}
					collectionSource={playerCollections}
					crewSource={collectionCrew}
					selection={mapFilter?.rewardFilter}
					setSelection={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
				/>

			{workerRunning && context.core.spin("Calculating Crew...")}
			{!workerRunning && <SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>}
		</React.Fragment>
)
	}

	const tabPanes = [
		{ 
			menuItem: 'Overview',
			longTitle: 'Collections Overview',
			description: 'Collections Overview',
			longDescription: "Overview of All Collections",
			showFilters: false,
			requirePlayer: false,
			render: (workerRunning: boolean) => <CollectionsOverviewComponent
				onClick={(col) => {
					if (!context.player.playerData) return;
					if (typeof window !== 'undefined') {
						window.scrollTo({
							top: 0,
							left: 0,
							behavior: "smooth",
						  });
					}
					setTabIndex(3);					
					setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [col]});
					setSearchFilter(''); 
				}}
			/>
		},
		{ 
			menuItem: 'Progress', 
			longTitle: 'Collection Milestone Progress',
			description: 'Collection Progress',
			longDescription: "Search for collections by name or description. You can also filter collections by milestone reward types. Click a row to view crew that will help you make progress on that collection.",
			showFilters: false,
			requirePlayer: true,
			render: (workerRunning: boolean) => <ProgressTable workerRunning={workerRunning} playerCollections={playerCollections} 
				filterCrewByCollection={(collection) => {
					setTabIndex(2);
					setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collection]});
					setSearchFilter(''); 					
				}} />
		},
		{ 
			menuItem: 'Crew', 
			longTitle: 'Crew Table',
			description: 'Collections Grouped by Crew', 
			longDescription: 'Search for crew that will help you make progress on collections and see what rewards you could claim by immortalizing certain crew right now. Note: maxed collections and immortalized crew will not be shown in this table.',
			showFilters: true,
			requirePlayer: true,
			render: (workerRunning: boolean) => renderTable(workerRunning)
		},
		{ 
			menuItem: 'Collections', 
			longTitle: 'Collections Crew Groups',
			description: <>Visualize crew grouped into<br/>collections, and sorted by cost</>, 
			longDescription: <>Show crew grouped into collections sorted by closest to max. Crew marked by a green star <Icon name='star' color='green' size='small' /> are required to reach the next milestone. Crew are sorted in ascending order of rarity, level, and equipment slots. Use the search box to search for specific crew. Clicking on a crew will append the crew name to the search box.</>,
			showFilters: true,
			requirePlayer: true,
			render: (workerRunning: boolean) => <CollectionGroupTable workerRunning={workerRunning} playerCollections={playerCollections} colGroups={colGroups} />
		},
		{ 
			menuItem: 'Optimizer', 
			longTitle: 'Collections Milestone Optimizer',
			description: <>See which crew can complete the<br/>most collections, at once.</>, 
			longDescription: 'Optimize collection crew to reach multiple milestones, at once. If there is more than one combination available, they will be listed in the \'Variations\' dropdown, sorted by most collections to fewest collections. Variations that completely fill the remaining crew needed for the primary collection are marked with an asterisk *.',
			showFilters: true,
			requirePlayer: true,
			render: (workerRunning: boolean) => <CollectionOptimizerTable 
				workerRunning={workerRunning} 
				playerCollections={playerCollections} 
				colOptimized={colOptimized}
				costMap={costMap}
				/>
		}
	];

	React.useEffect(() => {
		setWorkerRunning(true);
	}, [context, mapFilter, showIncomplete, rarityFilter, fuseFilter, ownedFilter, searchFilter, matchMode, tierFilter]);

	React.useEffect(() => {
		setTimeout(() => {
			runWorker();
		});		
	}, [context, colContext]);

	return (
		<React.Fragment>
			<div style={{margin: "1em 0"}}>
				<Step.Group fluid>
					{tabPanes.map((pane, idx) => {
						return (
							<Step active={(tabIndex === idx)} onClick={() => setTabIndex(idx)}>								
								<Step.Content>
									<Step.Title>{pane.menuItem}</Step.Title>
									<Step.Description>{pane.description}</Step.Description>
								</Step.Content>
							</Step>
						)
					})}						
				</Step.Group>
			</div>
			<Header as='h4'>{tabPanes[tabIndex ?? 0].longTitle}</Header>
				<p>{tabPanes[tabIndex ?? 0].longDescription}</p>

			{tabPanes[tabIndex ?? 0].showFilters && 
			<React.Fragment>
				<div style={{ 
						margin: '1em 0',
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: "1em"
						}}>
					<Form.Field
						placeholder='Filter by collections'
						control={Dropdown}
						clearable
						multiple
						search
						selection
						options={collectionsOptions}
						value={mapFilter.collectionsFilter}
						onChange={(e, { value }) => setMapFilter({ ...mapFilter ?? {}, collectionsFilter: value })}
						closeOnChange
					/>
					{mapFilter.collectionsFilter?.length === 1 && !!tierOpts.length &&
					<Form.Field
						placeholder='Tiers'
						control={Dropdown}
						clearable
 						selection
						options={tierOpts}
						value={tierFilter}
						onChange={(e, { value }) => setTierFilter(value as number)}
						closeOnChange
					/>}
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
			</React.Fragment>}
				{tabPanes[tabIndex ?? 0].render(workerRunning)}	
			<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew, playerData.player.character.crew, buffConfig)} targetGroup='collectionsTarget' />
			<ItemHoverStat targetGroup='collectionsTarget_item' />
		</React.Fragment>
	);

	function showThisCrew(crew: PlayerCrew, filters: Filter[], filterType: string | null | undefined): boolean {

		if (crew.immortal === -1 || crew.immortal > 0) {
			return false;
		}

		if (!filterType) return true;

		if (mapFilter.collectionsFilter && mapFilter.collectionsFilter.length > 0) {
			let hasAllCollections = true;
			for (let i = 0; i < mapFilter.collectionsFilter.length; i++) {
				if (!crew.unmaxedIds?.includes(mapFilter.collectionsFilter[i])) {
					hasAllCollections = false;
					break;
				}
			}
			if (!hasAllCollections) return false;
		}
		if (!checkCommonFilter(colContext, crew)) return false;
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

		const pctgrade = crew.collectionScore! / topscore;
		const pctgradeN = crew.collectionScoreN === -1 ? 1 : crew.collectionScoreN! / topscoren;
		const lettergrade = numberToGrade(pctgrade);
		const lettergradeN = numberToGrade(pctgradeN);
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
				<Table.Cell>
					<div style={{color: gradeToColor(pctgrade) ?? undefined, textAlign: 'center' }}>
						<div>{lettergrade}</div>
						<sub>{crew.collectionScore?.toLocaleString() ?? ''}</sub>
					</div>
				</Table.Cell>
				<Table.Cell>
					<div style={{color: gradeToColor(pctgradeN) ?? undefined, textAlign: 'center' }}>
						{crew.collectionScoreN === -1 && <Icon name='check' color='green' />}
						{crew.collectionScoreN !== -1 && 
						<div style={{textAlign: 'center'}}>
							<div>{lettergradeN}</div>
							<sub>{crew.collectionScoreN?.toLocaleString() ?? ''}</sub>
						</div>}
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<div style={{
						margin: "1em",
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'center',
						alignItems: 'center'
					}}>
						<RewardsGrid wrap={true} rewards={crew.immortalRewards as Reward[]} />
					</div>
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

export default CollectionsTool;
