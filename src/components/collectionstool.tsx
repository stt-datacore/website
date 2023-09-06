import React from 'react';
import { Table, Icon, Rating, Form, Checkbox, Dropdown, Header, Grid, Popup, Tab, SemanticWIDTHS, Input, Button, Pagination, Image } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import ItemDisplay from '../components/itemdisplay';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { useStateWithStorage } from '../utils/storage';
import { CrewMember } from '../model/crew';
import { Collection, Filter } from '../model/game-elements';
import { AtlasIcon, BuffBase, CompletionState, CryoCollection, ImmortalReward, Milestone, MilestoneBuff, PlayerCollection, PlayerCrew, PlayerData, Reward } from '../model/player';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { calculateBuffConfig } from '../utils/voyageutils';
import { crewCopy, navToCrewPage, oneCrewCopy } from '../utils/crewutils';
import { GlobalContext } from '../context/globalcontext';
import { ItemHoverStat } from './hovering/itemhoverstat';
import { TinyStore } from '../utils/tiny';
import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';
import { formatColString } from './item_presenters/crew_preparer';
import { CrewItemsView } from './item_presenters/crew_items';
import { getImageName } from '../utils/misc';
import { getIconPath } from '../utils/assets';
import { checkReward, getCollectionRewards } from '../utils/itemutils';
import { EquipmentItem } from '../model/equipment';
import { RewardPicker, RewardsGrid, rewardOptions } from './crewtables/rewards';

const CollectionsTool = () => {
	const context = React.useContext(GlobalContext);
	const { playerData } = context.player;
	const { crew, collections: allCollections } = context.core;

	if (!playerData) return <></>;

	if (!context.core.ready(['collections'])) {	
		return context.core.spin();
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
	const { allCrew, playerCollections, collectionCrew } = props;
	const tinyCol = TinyStore.getStore('collections');   

	const offsel = tinyCol.getValue<string | undefined>("selectedCollection");
	const selColId = playerCollections.find(f => f.name === offsel)?.id;

	tinyCol.removeValue("selectedCollection");

	const defaultMap = {
		collectionsFilter: selColId !== undefined ? [selColId] : [] as number[],
		rewardFilter: []
	} as MapFilterOptions;

	const [mapFilter, setMapFilter] = useStateWithStorage('collectionstool/mapFilter', defaultMap);
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

	console.log("Collections")
	console.log(playerCollections);

	return (
		<React.Fragment>
			<ProgressTable playerCollections={playerCollections} filterCrewByCollection={filterCrewByCollection} />
			<div ref={crewAnchor} />
			<CrewTable playerData={props.playerData} allCrew={allCrew} playerCollections={playerCollections} collectionCrew={collectionCrew} mapFilter={mapFilter} setMapFilter={setMapFilter} />
		</React.Fragment>
	);

	function filterCrewByCollection(collectionId: number): void {
		if (!crewAnchor.current) return;
		
		setMapFilter({ ...mapFilter, collectionsFilter: [collectionId] });
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

export interface MapFilterOptions {
	collectionsFilter?: number[];
	rewardFilter?: string[];
}

export interface CollectionMap {
	collection: PlayerCollection;
	crew: PlayerCrew[];
}

type CrewTableProps = {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	mapFilter: MapFilterOptions;
	setMapFilter: (options: MapFilterOptions) => void;
	playerData: PlayerData;
};

const CrewTable = (props: CrewTableProps) => {
	const context = React.useContext(GlobalContext);
	const { allCrew, playerCollections, collectionCrew, mapFilter, setMapFilter } = props;
	
	const [ownedFilter, setOwnedFilter] = useStateWithStorage('collectionstool/ownedFilter', '');
	const [fuseFilter, setFuseFilter] = useStateWithStorage('collectionstool/fuseFilter', '');
	const [rarityFilter, setRarityFilter] = useStateWithStorage('collectionstool/rarityFilter', [] as number[]);
	const [searchFilter, setSearchFilter] = useStateWithStorage('collectionstool/searchFilter', '');
	const [short, internalSetShort] = useStateWithStorage('collectionstool/colGroupShort', false, { rememberForever: true });
	const [tabIndex, setTabIndex] = useStateWithStorage('collectionstool/tabIndex', 0, { rememberForever: true });

	const setShort = (value: boolean) => {
		if (value !== short) {
			internalSetShort(value);
			setMapFilter({ ... mapFilter ?? {}, rewardFilter: [] });
		}		
	}

	const [groupPage, setGroupPage] = React.useState(1);
	const [groupPageCount, setGroupPageCount] = React.useState(1);

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

	const checkRewardFilter = (collection: PlayerCollection, filters: string[]) => {
		let result = false;

		for (let rewardFilter of filters) {
			let q = true;

			if (rewardFilter && rewardFilter != '*any') {
				let re: RegExp;
				if (rewardFilter == '*buffs') {
					if (collection.milestone?.buffs?.length == 0) q = false;
				}
				else if (rewardFilter.slice(0, 1) == '=') {
					re = new RegExp(rewardFilter.slice(1));
					if (!collection.milestone.rewards?.find(reward => reward.symbol && re.test(reward.symbol))) q = false;
				}
				else if (!collection.milestone.rewards?.find(reward => reward.symbol == rewardFilter)) {
					return q = false;
				}
			}	
			result ||= q;
		}

		return result;
	}

	const checkCommonFilter = (crew: PlayerCrew, exclude?: string[]) => {
		if (!exclude?.includes('unowned') && ownedFilter === 'unowned' && (crew.highest_owned_rarity ?? 0) > 0) return false;
		if (!exclude?.includes('owned') && ownedFilter.slice(0, 5) === 'owned' && crew.highest_owned_rarity === 0) return false;
		if (!exclude?.includes('owned-impact') && ownedFilter === 'owned-impact' && (crew.max_rarity - (crew.highest_owned_rarity ?? crew.rarity ?? 0)) !== 1) return false;
		if (!exclude?.includes('owned-ff') && ownedFilter === 'owned-ff' && crew.max_rarity !== (crew.highest_owned_rarity ?? crew.rarity)) return false;
		if (!exclude?.includes('rarity') && rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
		if (!exclude?.includes('portal') && fuseFilter.slice(0, 6) === 'portal' && !crew.in_portal) return false;
		if (!exclude?.includes('portal-unique') && fuseFilter === 'portal-unique' && !crew.unique_polestar_combos?.length) return false;
		if (!exclude?.includes('portal-nonunique') && fuseFilter === 'portal-nonunique' && crew.unique_polestar_combos?.length !== 0) return false;
		if (!exclude?.includes('nonportal') && fuseFilter === 'nonportal' && crew.in_portal) return false;
		return true;
	}

	const buffConfig = calculateBuffConfig(props.playerData.player);
	const narrow = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	const renderTable = () => {
		
		return (<SearchableTable
				id='collections/crew'
				data={collectionCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderCrewRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			/>)
	}

	const createCollectionGroups = (): CollectionMap[] => {
		const { playerData } = context.player;		
		const filtered = playerData?.player?.character.crew.concat(mapFilter?.collectionsFilter?.length ? (playerData?.player?.character.unOwnedCrew ?? []) : []).filter(fc => collectionCrew.some(pc => pc.symbol === fc.symbol)) ?? [];

		let zcol = filtered.map(z => z.collections).flat();
		zcol = zcol.filter((cn, idx) => zcol.indexOf(cn) === idx).sort();
		const searches = searchFilter?.length ? searchFilter.split(';').map(sf => sf.trim())?.filter(f => f?.length) ?? [] : [];

		const colMap = zcol.map((col, idx) => {
			return {
				collection: playerCollections.find(f => f.name === col),
				crew: filtered.filter(crew => {
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
		})
		.filter((x) => {			
			let bPass = x.collection !== undefined && x.crew?.length &&			
			x.collection?.totalRewards && x.collection.milestone &&
			(!mapFilter?.collectionsFilter?.length || mapFilter.collectionsFilter.some(cf => x.collection?.id === cf));
			
			if (searchFilter?.length && bPass) {				
				bPass &&= x.crew?.some(csf => searches.some(search => csf.name.includes(search)));
			}
						
			return !!bPass;
		})
		.sort((a, b) => {
			let  acol = a.collection;
			let  bcol = b.collection;

			if (mapFilter?.rewardFilter) {
				let ayes = false;
				let byes = false;

				if (short) {
					ayes = checkRewardFilter(acol, mapFilter.rewardFilter);
					byes = checkRewardFilter(bcol, mapFilter.rewardFilter);
				}
				else {
					let areward = getCollectionRewards([acol]);
					let breward = getCollectionRewards([bcol]);
					ayes = areward?.some(r => mapFilter.rewardFilter?.some(rf => r.symbol === rf));
					byes = breward?.some(r => mapFilter.rewardFilter?.some(rf => r.symbol === rf));
	
				}

				if (ayes != byes) {
					if (ayes) return -1;
					else return 1;
				}	
			}

			let r = 0;
			let amissing = (acol?.milestone?.goal === 'n/a' ? 0 : acol?.milestone?.goal ?? 0) - (acol?.owned ?? 0);
			let bmissing = (bcol?.milestone?.goal === 'n/a' ? 0 : bcol?.milestone?.goal ?? 0) - (bcol?.owned ?? 0);
			if (amissing < 0) amissing = 0;
			if (bmissing < 0) bmissing = 0;
			if (!r) r = amissing - bmissing;
			if (!r) r = (acol?.needed ?? 0) - (bcol?.needed ?? 0);
			if (!r) r = (bcol?.milestone?.goal as number ?? 0) - (acol?.milestone?.goal as number ?? 0);
			if (!r) r = acol?.name.localeCompare(bcol?.name ?? "") ?? 0;
			return r;
		});
		
		colMap.forEach((col, idx) => {

			col.crew.forEach((a) => {
				let acount = a.collections.filter(afc => playerCollections.find(cmf => cmf.needed && cmf.name === afc))?.length ?? 1;
				a.pickerId = acount;
			});

			col.crew.sort((a, b) => {
				let r = 0;
				if (a.have !== b.have) {
					if (!a.have) return 1;
					else return -1;
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

		});

		return colMap.filter(cm => cm.crew?.length);
	}

	const addToSearchFilter = (value: string) => {
		if (searchFilter?.length) {
			setSearchFilter(searchFilter + "; " + value);
		}
		else {
			setSearchFilter(value);
		}
	}

	const colGroups = createCollectionGroups();

	const pageCount = Math.ceil(colGroups.length / 10);

	if (pageCount !== groupPageCount || groupPage > pageCount) {
		setGroupPageCount(pageCount);
		setGroupPage(Math.min(pageCount, 1));
		return <></>
	}

	let rewardCol = getCollectionRewards(playerCollections);
	
	const uniqueRewards = rewardCol.filter((f, idx) => rewardCol.findIndex(fi => fi.id === f.id) === idx).sort((a, b) => a.name?.localeCompare(b.name ?? "") ?? 0);

	const rewardOptions = uniqueRewards.map((reward) => {
		return {
			key: reward.symbol,
			value: reward.symbol,
			text: reward.name
		}
	});

	//const rewards =


	const renderCollectionGroups = (colMap: CollectionMap[]) => {		
		return (<div style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "stretch"
		}}>
			{!mapFilter?.collectionsFilter?.length && 
				<i className='ui segment' style={{color:"goldenrod", fontWeight: 'bold', margin: "0.5em 0"}}>
					The grouped collection view shows only owned crew if the collections list is not filtered.
				</i>}
			<div style={{
				display: "flex",
				flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
				alignItems: "center",
				justifyContent: "flex-start"			
			}}>
				<Input
					style={{ width: narrow ? '100%' : '50%', margin: "0.5em 0" }}
					iconPosition="left"
					placeholder="Search..."
					value={searchFilter}
					onChange={(e, { value }) => setSearchFilter(value)}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => setSearchFilter('')} >
							<Icon name='delete' />
						</Button>
				</Input>

				<RewardPicker 
					short={short}
					setShort={setShort}
					rewards={uniqueRewards} 
					icons
					value={mapFilter?.rewardFilter} 
					onChange={(value) => setMapFilter({ ...mapFilter ?? {}, rewardFilter: value as string[] | undefined })}
					 />
				<Checkbox label={"Group rewards"} checked={short} onChange={(e, { checked }) => setShort(checked ?? false)} />
			</div>
			{!!colMap?.length && <Pagination style={{margin: "0.25em 0"}} totalPages={groupPageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number) } />}
			<Table striped>
				{colMap.map((col, idx) => {

					const collection = col.collection;
					if (!collection?.totalRewards || !collection.milestone) return <></>;
					const rewards = collection.totalRewards > 0 ? collection.milestone.buffs?.map(b => b as BuffBase).concat(collection.milestone.rewards ?? []) as Reward[] : [];
					return (<Table.Row key={"colgroup" + idx}>
						<Table.Cell width={4}>
							<div style={{								
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
								alignItems: "center",
								height: "100%",
								margin: "1em"
							}}>
							
							<Image size='medium' src={`${process.env.GATSBY_ASSETS_URL}${collection.image?.replace("/collection_vault/", 'collection_vault_')}.png`}
								style={{margin: "0.5em 0", border: '1px solid #7f7f7f7f', borderRadius: '6px'}}
								title={collection.name}
							/>
							<h2 
								onClick={(e) => { setSearchFilter(''); setMapFilter({ ...mapFilter ?? {}, collectionsFilter: [collection.id]})}}
								style={{marginBottom: 0, textAlign: "center", margin: '0.5em 0', cursor: "pointer"}}>{collection.name}</h2>
							<i>{formatColString(collection.description ?? "", { textAlign: 'center' })}</i>
							<hr style={{width: "16em"}}></hr>
							<i style={{fontSize: "0.8em"}}>{collection.needed} needed for rewards:</i>
							<div style={{margin: "0.5em 0 0.5em 0"}}>
								<RewardsGrid wrap={true} rewards={rewards} />
							</div>
							<i style={{fontSize: "0.8em"}}>{collection.owned} / {collection.crew?.length} Owned</i>
							<i style={{fontSize: "0.8em"}}>Progress to next: {(typeof collection?.milestone?.goal === 'number' && collection?.milestone?.goal > 0) ? `${collection.progress} / ${collection.milestone.goal}` : 'MAX'}</i>
							{((collection?.owned ?? 0) < (collection?.milestone?.goal === 'n/a' ? 0 : collection?.milestone?.goal ?? 0)) && 
								<i className='ui segment' style={{color:'salmon', textAlign: 'center', margin: "0.5em"}}>
									You need to recruit {(collection?.milestone?.goal === 'n/a' ? 0 : collection?.milestone?.goal ?? 0) - (collection?.owned ?? 0)} more crew to reach the next goal.
								</i>}
							</div>
						</Table.Cell>
						<Table.Cell>
							
						<Grid doubling columns={3} textAlign='center'>
								{col.crew.map((crew, ccidx) => (
									<div 
										className={ccidx < (collection?.needed ?? 0) ? 'ui segment' : undefined}
										style={{  
											margin: "1.5em", 
											display: "flex", 
											flexDirection: "column", 
											alignItems: "center", 
											justifyContent: "center",
											padding:"0.25em",
											paddingTop: ccidx < (collection?.needed ?? 0) ? '0.75em' : undefined,
											borderRadius: "5px",																			
											backgroundColor: ccidx < (collection?.needed ?? 0) ? 'darkgreen' : undefined
									}}>
									<ItemDisplay 
										size={64}
										src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
										rarity={!crew.have ? 0 : crew.rarity}
										maxRarity={crew.max_rarity}
										targetGroup={'collectionsTarget'}
										itemSymbol={crew.symbol}
										allCrew={context.core.crew}
										playerData={context.player.playerData}
										/>
										<b
											onClick={(e) => addToSearchFilter(crew.name)} 
											style={{
											cursor: "pointer", 
											margin:"0.5em 0 0 0",
											textDecoration: "underline"
											}}
											title={"Click to see collections containing this crew member"}
											>
											{crew.name}
										</b>			
										<i>({crew.pickerId} collections increased)</i>
										<i>Level {crew.level}</i>
										<CrewItemsView itemSize={16} mobileSize={16} crew={crew} />
									</div>
								))}
							</Grid>
						</Table.Cell>
					</Table.Row>)
					}
				)}

			</Table>
			{!!colMap?.length && <Pagination style={{margin: "0.25em 0 2em 0"}} totalPages={groupPageCount} activePage={groupPage} onPageChange={(e, { activePage }) => setGroupPage(activePage as number) } />}
			{!colMap?.length && <div className='ui segment'>No results.</div>}
			<br /><br /><br />
		</div>)

	}

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
					value={mapFilter.collectionsFilter}
					onChange={(e, { value }) => setMapFilter({ ...mapFilter ?? {}, collectionsFilter: value })}
					closeOnChange
				/>
			</div>
			<div style={{ margin: '1em 0' }}>
				<Form>
					<Form.Group inline>
						{(tabIndex === 0 || !!mapFilter?.collectionsFilter?.length) &&
						<Form.Field
							placeholder='Filter by owned status'
							control={Dropdown}
							clearable
							selection
							options={ownedFilterOptions}
							value={ownedFilter}
							onChange={(e, { value }) => setOwnedFilter(value)}
						/>}
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

			<Tab 	
				activeIndex={tabIndex}
				onTabChange={(e, { activeIndex })=> setTabIndex(activeIndex as number ?? 0)}			
				panes={[
					{ menuItem: narrow ? 'Crew' : 'Crew Table', render: () => renderTable()},
					{ menuItem: narrow ? 'Collections' : 'Collection Crew Groups', render: () => renderCollectionGroups(colGroups.slice(10 * (groupPage - 1), (10 * (groupPage - 1)) + 10))}
				]}
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

		if (mapFilter.collectionsFilter && mapFilter.collectionsFilter.length > 0) {
			let hasAllCollections = true;
			for (let i = 0; i < mapFilter.collectionsFilter.length; i++) {
				if (!crew.unmaxedIds?.includes(mapFilter[i])) {
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
