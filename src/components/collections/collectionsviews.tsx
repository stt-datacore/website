import { Link } from 'gatsby';
import React from 'react';
import { Dropdown, DropdownItemProps, Form, Header, Icon, Popup, Rating, Step, Table } from 'semantic-ui-react';

import { UnifiedWorker } from '../../typings/worker';
import { ITableConfigRow, SearchableTable } from '../searchabletable';

import { GlobalContext } from '../../context/globalcontext';
import { CollectionGroup, CollectionMap, CollectionWorkerConfig, CollectionWorkerResult, ComboCostMap } from '../../model/collectionfilter';
import { CrewMember } from '../../model/crew';
import { MilestoneBuff, PlayerCollection, PlayerCrew, Reward } from '../../model/player';
import { citeSymbols, compareRewards } from '../../utils/collectionutils';
import { gradeToColor, numberToGrade } from '../../utils/crewutils';
import { navToCrewPage } from '../../utils/nav';
import { useStateWithStorage } from '../../utils/storage';
import { calculateBuffConfig } from '../../utils/voyageutils';
import CONFIG from '../CONFIG';
import { RewardsGrid } from '../crewtables/rewards';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { CollectionsContext } from './context';
import { CollectionGroupTable } from './groupview';
import { CollectionOptimizerTable } from './optimizerview';
import CollectionsOverviewComponent from './overview';
import { ProgressTable } from './progresstable';
import { RewardFilter } from './rewardfilter';
import { WorkerContext } from '../../context/workercontext';

export interface CollectionsViewsProps {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	filterCrewByCollection: (collectionId: number) => void;
	topCrewScore: number;
	topStarScore: number;
};

export const CollectionsViews = (props: CollectionsViewsProps) => {

	const { topCrewScore, topStarScore } = props;
	const context = React.useContext(GlobalContext);

	const { playerData } = context.player;
	if (!playerData) return <></>;

	const colContext = React.useContext(CollectionsContext);
	const workerContext = React.useContext(WorkerContext);

	// const [worker, setWorker] = React.useState<UnifiedWorker | undefined>();
	// const [workerRunning, setWorkerRunning] = React.useState(false);
	const workerRunning = workerContext.running;
	
	const [colGroups, setColGroups] = React.useState<CollectionMap[]>([]);
	const [colOptimized, setColOptimized] = React.useState<CollectionGroup[]>([]);
	const [costMap, setCostMap] = React.useState<ComboCostMap[]>([]);

	const { playerCollections, collectionCrew } = props;
	const { showThisCrew, favorited, hardFilter, setHardFilter, tierFilter, setTierFilter, byCost, showIncomplete, matchMode, checkCommonFilter, costMode, setShort, short, mapFilter, setSearchFilter, setMapFilter, ownedFilter, setOwnedFilter, rarityFilter, setRarityFilter, searchFilter, fuseFilter, setFuseFilter } = colContext;
	
	const tierOpts = [] as DropdownItemProps[];

	const [tabIndex, setTabIndex] = useStateWithStorage('collectionstool/tabIndex', 0, { rememberForever: true });

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
			}
		}
	}

	const collectionsOptions = playerCollections
			.filter(collection => collection.milestone.goal != 'n/a' && collection.milestone.goal > 0)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(collection => {
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

	const rarityFilterOptions = [] as any[];

	CONFIG.RARITIES.forEach((r, i) => {
		if (i === 0) return;
		rarityFilterOptions.push(
			{ key: `${i}*`, value: i, text: `${i}* ${r.name}` }
		)
	});

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

	// const renderFancyCites = (size?: number) => {
	// 	size ??= 32;
	// 	const honor = playerData.player.honor;		
	// 	const cost = costMode === 'sale' ? 40000 : 50000;
	// 	const total = Math.floor(honor/cost);
	// 	if (honor < cost) return <></>
	// 	return <div style={{
	// 				textAlign: 'center',
	// 				width: '15em',
	// 				display: 'flex',
	// 				flexDirection: 'row',
	// 				alignItems: 'center',
	// 				justifyContent: 'space-between'
	// 			}}>
	// 				<div style={{fontSize: "0.8em", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
	// 					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/honor_currency.png`} style={{height: `${size}px`, width: `${size}px`, marginBottom: '0.5em'}} />
	// 					{honor.toLocaleString()}				
	// 				</div>
	// 				<div style={{fontSize: '3em', display: 'inline', marginTop: '-0.8em'}}>
	// 					&rarr;
	// 				</div>
	// 				<div>				
	// 					<RewardsGrid size={size} kind={'need'} needs={[{symbol: citeSymbols[5], quantity: total}]} />
	// 				</div>
	// 			</div>

	// }

	const offPageSelect = selnum;

	const buffConfig = calculateBuffConfig(playerData.player);

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
		runWorker();
	}, [context, mapFilter, showIncomplete, rarityFilter, fuseFilter, ownedFilter, searchFilter, matchMode, tierFilter]);

	// React.useEffect(() => {
	// 	if (worker) {
	// 		runWorker(worker);
	// 	}
	// 	else {
	// 		let worker = new UnifiedWorker();
	// 		worker.addEventListener('message', processWorkerResult);
	// 		setWorker(worker);
	// 	}
	// }, [worker]);

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

			{/* <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
				{costMode && playerData?.player?.honor && renderFancyCites()}
			</div> */}

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

	function processWorkerResult(message: { data: { result: CollectionWorkerResult; }; }) {
		const { result } = message.data;
		setColGroups(result.maps);
		setColOptimized(result.groups);
		setCostMap(result.costMap);
	}

	function runWorker() {
		const options = {
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
		
		workerContext.runWorker('colOptimizer2', options, processWorkerResult)
	}

	function renderTable(workerRunning: boolean) {		
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
		</React.Fragment>)
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

		const pctgrade = crew.collectionScore! / topCrewScore;
		const pctgradeN = crew.collectionScoreN === -1 ? 1 : crew.collectionScoreN! / topStarScore;
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

	function compareCrewRewards(a: PlayerCrew, b: PlayerCrew): number {
		if (!!a.immortalRewards?.length != !!b.immortalRewards?.length) {
			if (a.immortalRewards?.length) return 1;
			else if (b.immortalRewards?.length) return -1;
		}
		let acol = a.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let bcol = b.unmaxedIds?.map(ci => playerCollections.find(f => f.id === ci) as PlayerCollection) ?? [];
		let r = compareRewards(mapFilter, acol, bcol, short);		
		return -r;
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