import { Link } from 'gatsby';
import React from 'react';
import { Checkbox, Dropdown, DropdownItemProps, Form, Header, Icon, Popup, Rating, Step, Table } from 'semantic-ui-react';

import { ITableConfigRow, SearchableTable } from '../searchabletable';

import { GlobalContext } from '../../context/globalcontext';
import { CrewMember } from '../../model/crew';
import { Filter } from '../../model/game-elements';
import { BuffBase, CompletionState, ImmortalReward, PlayerCollection, PlayerCrew, PlayerData, Reward } from '../../model/player';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { crewCopy, navToCrewPage, neededStars, oneCrewCopy, starCost } from '../../utils/crewutils';
import { makeAllCombos } from '../../utils/misc';
import { useStateWithStorage } from '../../utils/storage';
import { TinyStore } from '../../utils/tiny';
import { calculateBuffConfig } from '../../utils/voyageutils';
import { RewardsGrid, rewardOptions } from '../crewtables/rewards';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { CollectionGroupTable } from './groupview';
import { CollectionOptimizerTable } from './optimizerview';
import CollectionsOverviewComponent from './overview';
import { CollectionFilterContext, CollectionFilterProvider, CollectionGroup, CollectionMap, compareRewards } from './utils';

const CollectionsTool = () => {
	const context = React.useContext(GlobalContext);	
	const { playerData } = context.player;
	const { crew, collections: allCollections } = context.core;

	if (!playerData) return <CollectionsOverviewComponent />;

	if (!context.core.ready(['collections'])) {	
		return context.core.spin ? context.core.spin() : <></>;
	}
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
		let collection: PlayerCollection = { id: ac.id, name: ac.name, progress: 0, milestone: { goal: 0 }, owned: 0 };
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

type CollectionsUIProps = {
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	allCrew: PlayerCrew[];
	playerData: PlayerData;
};

const CollectionsUI = (props: CollectionsUIProps) => {
	const colContext = React.useContext(CollectionFilterContext);
	const { allCrew, playerCollections, collectionCrew } = props;
	const tinyCol = TinyStore.getStore('collections');   

	const offsel = tinyCol.getValue<string | undefined>("collectionsTool/selectedCollection");
	const selColId = playerCollections.find(f => f.name === offsel)?.id;

	tinyCol.removeValue("collectionsTool/selectedCollection");

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
		// else {
		// 	window.setTimeout(() => {
		// 		navigate("/collections#" + encodeURIComponent(offsel ?? ""));
		// 	});			
		// }
	}

	// console.log("Collections")
	// console.log(playerCollections);

	return (
		<React.Fragment>
			<div ref={crewAnchor} />
			<CollectionFilterProvider pageId='collectionTool' playerCollections={playerCollections}>
				<CollectionsViews 
					filterCrewByCollection={filterCrewByCollection}
					playerData={props.playerData} 
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


type CrewTableProps = {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	playerData: PlayerData;
	filterCrewByCollection: (collectionId: number) => void;
};

const CollectionsViews = (props: CrewTableProps) => {
	const context = React.useContext(GlobalContext);
	const colContext = React.useContext(CollectionFilterContext);

	const { playerCollections, collectionCrew } = props;
	const { checkCommonFilter, costMode, short, mapFilter, setSearchFilter, setMapFilter, ownedFilter, setOwnedFilter, rarityFilter, setRarityFilter, searchFilter, fuseFilter, setFuseFilter } = colContext;
	
	const [tabIndex, setTabIndex] = useStateWithStorage('collectionstool/tabIndex', 0, { rememberForever: true });

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

	const searches = searchFilter?.length ? searchFilter.split(';').map(sf => sf.trim())?.filter(f => f?.length) ?? [] : [];

	if (typeof window !== 'undefined' && !!window.location.search?.length) {
		if (context.player.playerData) {
			let params = new URLSearchParams(window.location.search);
			let sel = params.get("select");
			let findcol = playerCollections?.find(f => f.name === sel);
			if (findcol) {
				const selnum = findcol.id;
				if (!mapFilter?.collectionsFilter?.includes(selnum)) {				
					window.setTimeout(() => {
						window.history.replaceState({}, document.title, "/collections");
						setMapFilter({ ... (mapFilter ?? {}), collectionsFilter: [selnum]});
						setTabIndex(3);
					});
				}			
			}
		}
	}

	const createCollectionGroups = (): CollectionMap[] => {
		const { playerData } = context.player;		
		let fstep1 = playerData?.player?.character.crew.concat(mapFilter?.collectionsFilter?.length ? (playerData?.player?.character.unOwnedCrew ?? []) : []).filter(fc => collectionCrew.some(pc => pc.symbol === fc.symbol)) ?? [];
		let fss = {} as {[key: string]: boolean };
	
		if (fstep1.length) {
			let currsym = '';
			for (let item of fstep1){
				currsym = item.symbol;
				if (!(currsym in fss)) {
					fss[currsym] = true;
				}								
				fss[currsym] = fss[currsym] && !(item.immortal > 0 || item.immortal === CompletionState.Immortalized);
			}
		}
		const fstep2 = fstep1.filter((crew, idx) => fss[crew.symbol] && idx === fstep1.findIndex(c2 => c2.symbol === crew.symbol));

		let cstep1 = fstep2.map(g => g.collections).flat();
		cstep1 = cstep1.filter((cn, idx) => cstep1.indexOf(cn) === idx).sort();

		const colMap = cstep1.map((col, idx) => {
			const cobj = playerCollections.find(f => f.name === col);
			
			return {
				collection: cobj,
				crew: fstep2.filter(crew => {
					if (crew.immortal === CompletionState.Immortalized || crew.immortal > 0) return false;

					let fr = crew.collections.some(fc => fc == col);
					
					if (fr) {
						
						if (mapFilter?.collectionsFilter?.length) {
							if (ownedFilter === 'unowned' && !!crew.have) return false;
							if (ownedFilter.slice(0, 5) === 'owned' && !crew.have) return false;
						}
						else if (!crew.have) {
							return false;
						}

						if (!checkCommonFilter(crew, ['unowned', 'owned'])) return false;
					}
					return fr;
				})
			} as CollectionMap;
		}).filter(fc => {
			if (!fc.collection.milestone.goal) return false;
			return true;
		});
		
		colMap.forEach((col, idx) => {

			col.crew.forEach((a) => {
				let acount = a.collections.filter(afc => playerCollections.find(cmf => cmf.needed && cmf.name === afc))?.length ?? 1;
				a.pickerId = acount;
			});

			col.crew.sort((a, b) => {
				let r = 0;
				
				if (searches?.length) {
					let ares = searches.includes(a.name);
					let bres = searches.includes(b.name);
					if (ares !== bres) {
						if (ares) return -1;
						return 1;
					}
				}
				if (a.have !== b.have) {
					if (!a.have) return 1;
					else return -1;
				}

				if (a.favorite !== b.favorite) {
					if (a.favorite) return -1;
					else return 1;
				}

				let acount = a.pickerId ?? 1;
				let bcount = b.pickerId ?? 1;
				
				let asearch = !searchFilter?.length || searches.some(search => a.name.includes(search));
				let bsearch = !searchFilter?.length || searches.some(search => b.name.includes(search));

				if (asearch !== bsearch) {
					if (asearch) r = -1;
					else r = 1;
				}

				if (!r) r = a.max_rarity - b.max_rarity;
				if (!r) r = (b.rarity / (b.highest_owned_rarity ?? b.max_rarity)) - (a.rarity / (a.highest_owned_rarity ?? a.max_rarity));
				if (!r) r = b.level - a.level;
				if (!r) r = (b.equipment?.length ?? 0) - (a.equipment?.length ?? 0);
				if (!r) r = bcount - acount;
				if (!r) r = a.name.localeCompare(b.name);
				return r;
			});

			col.neededStars = neededStars(col.crew, col.collection.needed ?? 0);
		});
		
		colMap.forEach((c) => c.collection.neededCost = starCost(c.crew, c.collection.needed, costMode === 'sale'));
		
		colMap.sort((a, b) => {
			let  acol = a.collection;
			let  bcol = b.collection;
			let r = 0;

			if (mapFilter?.rewardFilter) {
				r = compareRewards(mapFilter, [acol], [bcol], short);
				if (r) return r;
			}

			let amissing = (acol?.milestone?.goal === 'n/a' ? 0 : acol?.milestone?.goal ?? 0) - (acol?.owned ?? 0);
			let bmissing = (bcol?.milestone?.goal === 'n/a' ? 0 : bcol?.milestone?.goal ?? 0) - (bcol?.owned ?? 0);
			if (amissing < 0) amissing = 0;
			if (bmissing < 0) bmissing = 0;
			if (!r) r = amissing - bmissing;
			if (!r) r = (acol?.neededCost ?? 0) - (bcol?.neededCost ?? 0);
			if (!r) r = (acol?.needed ?? 0) - (bcol?.needed ?? 0);
			if (!r) r = (bcol?.milestone?.goal as number ?? 0) - (acol?.milestone?.goal as number ?? 0);
			if (!r) r = acol?.name.localeCompare(bcol?.name ?? "") ?? 0;
			return r;
		});

		return colMap.filter(cm => cm.crew?.length);
	}


	const unfilteredGroups = createCollectionGroups();

	const colGroups = unfilteredGroups.filter((x) => {			
		let bPass = x.collection !== undefined && x.crew?.length &&			
		x.collection?.totalRewards && x.collection.milestone &&
		(!mapFilter?.collectionsFilter?.length || mapFilter.collectionsFilter.some(cf => x.collection?.id === cf));
		
		if (searchFilter?.length && bPass) {				
			bPass &&= x.crew?.some(csf => searches.some(search => csf.name.includes(search)));
		}
					
		return !!bPass;
	});		
	

	// TODO: Optimizer depends on createCollectionGroups, wrap it in!
	// TODO: Sort Optimizer by filter options
	// TODO: Optimizer option show crew on top
	const createOptimizerGroups = (colGroups: CollectionMap[]) => {
		const linkScores = {} as { [key: string]: CollectionMap[] };

		for(let col of colGroups) {
			linkScores[col.collection.name] ??= [];
			if (col.collection.progress === 'n/a') continue;
			if ((col.collection.progress ?? 0) + (col.collection.needed ?? 0) > (col.collection.owned ?? 0)) continue;
			for (let col2 of colGroups) {			
				if (col2.collection.progress === 'n/a') continue;
				if ((col2.collection.progress ?? 0) + (col2.collection.needed ?? 0) > (col2.collection.owned ?? 0)) continue;
				if (col.collection.name === col2.collection.name) continue;
				if ((col.collection.needed ?? 0) < (col2.collection.needed ?? 0)) continue;

				let crew = col.crew.filter(cr => col2.crew.some(cr2 => cr2.symbol === cr.symbol));
				crew = crew.concat(col2.crew.filter(cr => col.crew.some(cr2 => cr2.symbol === cr.symbol)));
				crew = crew.filter((cr, idx) => crew.findIndex(cr2 => cr2.symbol === cr.symbol) === idx);
				crew.sort((a, b) => a.name.localeCompare(b.name));
				if (!!crew?.length) {
					
					linkScores[col.collection.name].push({
						collection: col2.collection,
						crew: crew,
						completes: crew.length >= (col2.collection.needed ?? 0)
					});
				}

			}

			linkScores[col.collection.name] = linkScores[col.collection.name]
				.filter(ls => ls.completes)
				.sort((a, b) => {
				let r = b.crew.length - a.crew.length;
				if (!r) r = a.collection.name.localeCompare(b.collection.name);
				return r;
			});
		}

		const colOptimized = Object.keys(linkScores).map((key, idx) => {
			
			let unique = linkScores[key].map(c => c.crew).flat();
			let col = colGroups.find(f => f.collection.name === key);

			let common = [...unique];
			common = common.filter((fi, idx) => unique.findIndex(f2 => f2.symbol === fi.symbol) === idx);

			unique = [...unique, ...col?.crew ?? []];
			unique = unique.filter((fi, idx) => unique.findIndex(f2 => f2.symbol === fi.symbol) === idx);

			const innercounts = {} as { [key: string]: number };
			for (let u of unique){
				innercounts[u.symbol] = 1;
				for (let subcol of linkScores[key]) {
					if (subcol.crew.some(sc => sc.symbol === u.symbol)) {
						innercounts[u.symbol]++;
					}
				}
			}
			unique.sort((a, b) => {
				let r = 0;
				let ca = innercounts[a.symbol];
				let cb = innercounts[b.symbol];
				r = cb - ca;
				if (!r) {
					r = starCost([a], undefined, costMode === 'sale') - starCost([b], undefined, costMode === 'sale');
				}
				return r;
			});
			return {
				name: key,
				maps: linkScores[key],
				uniqueCrew: unique,
				commonCrew: common,
				collection: col?.collection,
				neededStars: neededStars(unique),
				uniqueCost: starCost(unique, undefined, costMode === 'sale')
			} as CollectionGroup;
		}).filter((g) => !!g.maps?.length && g.maps.some(gm => gm.completes)).sort((a, b) => {
			let dista = a.uniqueCrew.length - a.commonCrew.length;
			let distb = b.uniqueCrew.length - b.commonCrew.length;
			let r = 0; 

			a.nonfullfilling = dista;
			b.nonfullfilling = distb;
			
			if (dista >= 0 && distb >= 0) {
				if (dista !== distb) {
					if (dista === 0) return -1;
					else if (distb === 0) return 1;
				}

				a.nonfullfillingRatio = a.maps.length / dista;
				b.nonfullfillingRatio = b.maps.length / distb;

				r = dista - distb;
			}
			else if (dista >= 0) {
				return -1;
			}
			else if (distb >= 0) {
				return 1;
			}
			else {
				r = distb - dista;
			}
			
			if (!r) r = b.maps.length - a.maps.length;

			if (!r) {
				r = (a.uniqueCost ?? 0) - (b.uniqueCost ?? 0);
			}
			return r;
		});

		const createCombos = (col: CollectionGroup) => {
			const names = col.maps.map(c => c.collection.name);
			
			let result = makeAllCombos(names);
			
			let exact = [] as {names: string[], count: number}[];
			let over = [] as {names: string[], count: number}[];
			let under = [] as {names: string[], count: number}[];
			let colneed = col.collection.needed ?? 0;
			
			for (let test of result) {
				let cols = test.map(tc => col.maps.find(f => f.collection.name === tc));
				
				if (cols?.length) {			
					let extracrew = [] as string[];
					extracrew = cols.map(cm => cm?.crew.slice(0, cm.collection.needed)).flat().map(f => f?.symbol ?? '');
					extracrew = extracrew.filter((ef, i) => ef !== '' && extracrew.findIndex(fi => fi === ef) === i) ?? [];
					let total = extracrew.length; // cols.map(c => c?.collection.needed ?? 0).reduce((p, n) => p + n, 0);
					let tc = cols.map(c => c?.collection.needed ?? 0).reduce((p, n) => p + n, 0);

					if (total) {
						if (total === colneed) {
							exact.push({ names: test, count: total });
						}	
						else if (total > colneed) {
							over.push({ names: test, count: total });
						}
						else  {
							under.push({ names: test, count: total });
						}
					}
				}
			}
			exact.sort((a, b) => b.names.length - a.names.length);
			under.sort((a, b) => b.names.length - a.names.length);
			for (let ex of exact) {
				ex.names = ex.names.map((eu, idx) => (!idx ? "* " : "") + eu);
			}
			if (exact.length > 1) {
				return exact.map(d => d.names);
			}
			return exact.concat(under).map(d => d.names);
		}

		for (let col of colOptimized) {
			col.combos = createCombos(col);
			if (mapFilter?.rewardFilter?.length) {
				col.combos?.sort((a, b) => {

					let acol = (a.map(a => playerCollections.find(f => f.name === a)) ?? []) as PlayerCollection[];
					let bcol = (b.map(b => playerCollections.find(f => f.name === b)) ?? []) as PlayerCollection[];

					if (acol && bcol) {
						return compareRewards(mapFilter, acol, bcol, short);
					}
					else if (acol) {
						return -1;
					}
					else if (bcol) {
						return 1;
					}
					return 0;
				});
			}
			if (mapFilter?.collectionsFilter?.length) {
				if (!mapFilter?.collectionsFilter?.includes(col.collection.id)) {
					col.combos = col.combos.filter(fc => {
						let col = fc.map(sc => playerCollections.find(col => col.name === sc.replace("* ", '')));
						return col.some(c => mapFilter?.collectionsFilter?.includes(c?.id ?? -1));
					});	
				}
			}
		}		

		return colOptimized
			.filter(c => c.combos?.length)
			.map(fc => {
				if (mapFilter?.rewardFilter?.length) {
					let col = (fc.combos?.map(sc => sc.map(tu => playerCollections?.find(col => col?.name === tu?.replace("* ", ''))))?.filter(c => c) ?? []) as PlayerCollection[][];
					
					col?.sort((a, b) => {
						return compareRewards(mapFilter, a, b, short);
					});

					if (col?.length) {
						fc.combos = col?.map(c => c.map(d => d.name));
					}					
				}
				return fc;
			})
			.sort((a, b) => {
				if (mapFilter?.rewardFilter?.length) {
					let  acol = a?.collection;
					let  bcol = b?.collection;
					let r = 0;
		
					if (mapFilter?.rewardFilter) {
						r = (compareRewards(mapFilter, [acol], [bcol], short));
						if (r) return r;
						r = compareRewards(mapFilter, 
							[ acol, ...a?.maps?.map(d => d.collection) ?? []].filter(e => e), 
							[ bcol, ...b?.maps?.map(d => d.collection) ?? []].filter(e => e), 
							short);

						if (r) return r;
					}	
				}

				if (a.combos && b.combos) {
					let acb = a.combos.length;
					let bcb = b.combos.length;
					let ayes = a.combos.filter(c => c[0].startsWith("* "))?.length ?? 0;
					let byes = b.combos.filter(c => c[0].startsWith("* "))?.length ?? 0;
					let r = 0;
					
					if (!r) r = byes - ayes;
					if (!r) r = bcb - acb;

					return r;
				}	
				else if (a.combos) {
					return -1;
				}
				else if (b.combos) {
					return 1;
				}
				else {
					return 0;
				}

			});
	}

	const colOptimized = createOptimizerGroups(unfilteredGroups.map(g => {
		return {
			... g,
			crew: g.crew.filter(f => f.have || (f.immortal !== undefined && f.immortal >= -1))
		}
	}).filter(f => !!f.crew.length));

	const buffConfig = calculateBuffConfig(props.playerData.player);

	const renderTable = () => {
		
		return (<SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>)
	}

	const tabPanes = [
		{ 
			menuItem: 'Overview',
			longTitle: 'Collections Overview',
			description: 'Collections Overview',
			longDescription: "Overview of All Collections",
			showFilters: false,
			requirePlayer: false,
			render: () => <CollectionsOverviewComponent
				onClick={(col) => {
					if (!context.player.playerData) return;
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
			render: () => <ProgressTable playerCollections={playerCollections} 
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
			render: () => renderTable()
		},
		{ 
			menuItem: 'Groups', 
			longTitle: 'Collections Crew Groups',
			description: <>Crew grouped by collection,<br/>and sorted by cost</>, 
			longDescription: "Show crew grouped into collections sorted by closest to max. Crew highlighted in green are required to reach the next tier. Crew are sorted in ascending order of rarity, level, and equipment slots. Use the search box to search for specific crew. Clicking on a crew will append the crew name to the search box.",
			showFilters: true,
			requirePlayer: true,
			render: () => <CollectionGroupTable playerCollections={playerCollections} colGroups={colGroups} />
		},
		{ 
			menuItem: 'Optimizer', 
			longTitle: 'Collections Milestone Optimizer',
			description: <>See which crew can complete the<br/>most collections, at once.</>, 
			longDescription: 'Optimize collection crew to reach multiple milestones, at once. If there is more than one combination available, they will be listed in the \'Variations\' dropdown, sorted by most collections to fewest collections. Variations that completely fill the remaining crew needed for the primary collection are marked with an asterisk *.',
			showFilters: true,
			requirePlayer: true,
			render: () => <CollectionOptimizerTable playerCollections={playerCollections} colOptimized={colOptimized} />
		}
	];

	return (
		<React.Fragment>
			
			<div style={{margin: "1em 0"}}>
				<Step.Group fluid>
					{tabPanes.map((pane, idx) => {
						return (
							<Step active={(tabIndex ?? 0) === idx} onClick={() => setTabIndex(idx)}>
								
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
				<div style={{ margin: '1em 0' }}>
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

				{tabPanes[tabIndex ?? 0].render()}
	
			<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew, props.playerData.player.character.crew, buffConfig)} targetGroup='collectionsTarget' />
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
		if (!checkCommonFilter(crew)) return false;
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
					<RewardsGrid rewards={crew.immortalRewards as Reward[]} />
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
