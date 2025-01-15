import { Link } from 'gatsby';
import React from 'react';
import { Dropdown, DropdownItemProps, Form, Header, Icon, Popup, Rating, Step, Table } from 'semantic-ui-react';

import { ITableConfigRow, SearchableTable } from '../searchabletable';

import { GlobalContext } from '../../context/globalcontext';
import { CollectionGroup, CollectionMap, CollectionWorkerConfig, CollectionWorkerResult, ComboCostMap } from '../../model/collectionfilter';
import { CrewMember } from '../../model/crew';
import { PlayerCollection, PlayerCrew, Reward } from '../../model/player';
import { compareRewards } from '../../utils/collectionutils';
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
import { CollectionPrefs } from './collectionprefs';

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
	const { t, tfmt } = context.localized;

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
	const { setModalInstance, showThisCrew, favorited, hardFilter, setHardFilter, tierFilter, setTierFilter, byCost, showIncomplete, matchMode, checkCommonFilter, costMode, setShort, short, mapFilter, setSearchFilter, setMapFilter, ownedFilter, setOwnedFilter, rarityFilter, setRarityFilter, searchFilter, fuseFilter, setFuseFilter, setCollectionSettings } = colContext;

	const [initialized, setInitialized] = React.useState(false);
	const [requestRun, setRequestRun] = React.useState(false);

	const tierOpts = [] as DropdownItemProps[];

	const [tabIndex, setTabIndex] = useStateWithStorage<number | undefined>('collectionstool/tabIndex', undefined, { rememberForever: true });

	const tableConfig: ITableConfigRow[] = [
		{ width: 2, column: 'name', title: t('collections.columns.crew'), pseudocolumns: ['name', 'level', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: t('collections.columns.rarity'), reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 2, column: 'unmaxedIds.length', title: t('collections.columns.collections'), reverse: true },
		{
			width: 1,
			column: 'collectionScore',
			title: <span>{t('collections.columns.grade')} <Popup trigger={<Icon name='help' />} content={t('collections.columns.descriptions.grade')} /></span>,
			reverse: true
		},
		{
			width: 1,
			column: 'collectionScoreN',
			title: <span>{t('collections.columns.star_grade')} <Popup trigger={<Icon name='help' />} content={t('collections.columns.descriptions.star_grade')} /></span>,
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
			title: <span>{t('collections.columns.immortal_rewards')} <Popup trigger={<Icon name='help' />} content='Rewards you can claim if you immortalize this crew right now' /></span>,
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

	if (typeof window !== 'undefined' && (!!window.location.search?.length || !!window.location.hash?.length)) {
		if (context.player.playerData) {
			let sel = '' as string | null;
			if (window.location.search) {
				let params = new URLSearchParams(window.location.search);
				sel = params.get("select");
			}
			if (sel) {
				sel = decodeURIComponent(sel);
			}
			else if (!sel && window.location.hash) {
				sel = decodeURIComponent(window.location.hash.slice(1));
			}
			let findcol: PlayerCollection | undefined = undefined;
			findcol = playerCollections?.find(f => f.name === sel);
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

	const buffConfig = calculateBuffConfig(playerData.player);

	const tabPanes = [
		{
			menuItem: '',
			longTitle: '',
			description: '',
			//longDescription: "Overview of All Collections",
			showFilters: false,
			requirePlayer: false,
			mode: 'overview',
			render: (workerRunning: boolean) => <CollectionsOverviewComponent />
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: "",
			showFilters: false,
			requirePlayer: true,
			mode: 'progress',
			render: (workerRunning: boolean) => <ProgressTable
				workerRunning={workerRunning}
				playerCollections={playerCollections}
				filterCrewByCollection={(collection) => {
					setCollectionSettings({
						...colContext,
						mapFilter: {
							...mapFilter,
							collectionsFilter: [collection]
						},
						searchFilter: ''
					});
					setTimeout(() => {
						setTabIndex(2);
					})
				}} />
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: '',
			showFilters: true,
			requirePlayer: true,
			mode: 'crew',
			render: (workerRunning: boolean) => renderTable(workerRunning)
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: tfmt('collections.panes.group.long_description', { star: <Icon name='star' color='green' size='small' /> }),
			showFilters: true,
			requirePlayer: true,
			mode: 'group',
			render: (workerRunning: boolean) => <CollectionGroupTable
				workerRunning={workerRunning}
				playerCollections={playerCollections}
				colGroups={colGroups} />
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: '',
			showFilters: true,
			requirePlayer: true,
			mode: 'optimizer',
			render: (workerRunning: boolean) => <CollectionOptimizerTable
				workerRunning={workerRunning}
				playerCollections={playerCollections}
				colOptimized={colOptimized}
				costMap={costMap}
				/>
		}
	];

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			if (initialized) {
				runWorker();
			}
			else {
				setRequestRun(true);
			}
		}
	}, [context, mapFilter, showIncomplete, rarityFilter, fuseFilter, ownedFilter, searchFilter, matchMode, tierFilter]);

	setTimeout(() => {
		if (requestRun) {
			runWorker();
			setRequestRun(false);
		}
	}, 500);

	return (
		<React.Fragment>
			<div style={{margin: "1em 0"}}>
				<Step.Group fluid widths={5}>
					{tabPanes.map((pane, idx) => {
						return (
							<Step active={(tabIndex === idx || (idx === 0 && tabIndex === undefined))} onClick={() => setTabIndex(idx)}>
								<Step.Content>
									<Step.Title>{pane.menuItem || t(`collections.panes.${pane.mode}.title`)}</Step.Title>
									<Step.Description>{pane.description || t(`collections.panes.${pane.mode}.description`)}</Step.Description>
								</Step.Content>
							</Step>
						)
					})}
				</Step.Group>
			</div>
			{tabIndex !== undefined &&
			<>
				<Header as='h4'>{tabPanes[tabIndex].longTitle || t(`collections.panes.${tabPanes[tabIndex].mode}.long_title`)}</Header>
				<p>{tabPanes[tabIndex].longDescription || t(`collections.panes.${tabPanes[tabIndex].mode}.long_description`)}</p>

				{tabPanes[tabIndex].showFilters &&
					<CollectionPrefs
						mode={tabPanes[tabIndex ?? 0].mode as any}
						playerCollections={playerCollections}
						colOptimized={colOptimized}
						workerRunning={workerRunning}
						/>
				}
				{tabPanes[tabIndex].render(workerRunning)}
			</>
			}
			<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew, playerData.player.character.crew, buffConfig)} targetGroup='collectionsTarget' />
			<ItemHoverStat targetGroup='collectionsTarget_item' />
		</React.Fragment>
	);

	function processWorkerResult(message: { data: { result: CollectionWorkerResult; }; }) {
		const { result } = message.data;
		setColGroups(result.maps);
		setColOptimized(result.groups);
		setCostMap(result.costMap);
		setInitialized(true);
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
			{workerRunning && context.core.spin(t('spinners.default'))}
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
				<tr key={collection.id} style={{cursor: 'pointer'}} onClick={() => setModalInstance({ collection, pageId: 'collections/crew', activeTab: 1 })}>
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