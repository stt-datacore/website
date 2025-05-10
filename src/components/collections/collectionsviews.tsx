import React from 'react';

import { DropdownItemProps, Header, Icon, Step } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { CollectionCombo, CollectionInfo, CollectionWorkerConfig, CollectionWorkerResult, ComboCostMap } from '../../model/collectionfilter';
import { CrewMember } from '../../model/crew';
import { PlayerCollection, PlayerCrew } from '../../model/player';
import { navToCrewPage } from '../../utils/nav';
import { useStateWithStorage } from '../../utils/storage';

import CONFIG from '../CONFIG';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { CollectionsContext } from './context';
import { CollectionResearchView } from './views/researchview';
import { CollectionCombosView } from './views/combosview';
import CollectionsOverviewComponent from './views/overview';
import { ProgressTable } from './views/progresstable';
import { WorkerContext } from '../../context/workercontext';
import { CollectionPrefs } from './collectionprefs';
import { CollectionTableView } from './views/tableview';
import { TinyStore } from '../../utils/tiny';
import { Collection } from '../../model/game-elements';

export interface CollectionsViewsProps {
	allCrew: (CrewMember | PlayerCrew)[];
	playerCollections: PlayerCollection[];
	extendedCollections: PlayerCollection[];
	collectionCrew: PlayerCrew[];
	filterCrewByCollection: (collectionId: number) => void;
	topCrewScore: number;
	topStarScore: number;
};

export const CollectionsViews = (props: CollectionsViewsProps) => {

	const { topCrewScore, topStarScore } = props;
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;

	const { playerData } = globalContext.player;

	const colContext = React.useContext(CollectionsContext);
	const workerContext = React.useContext(WorkerContext);
	const workerRunning = workerContext.running;

	const [colData, setColGroups] = React.useState<CollectionInfo[]>([]);
	const [colCombos, setColOptimized] = React.useState<CollectionCombo[]>([]);
	const [costMap, setCostMap] = React.useState<ComboCostMap[]>([]);

	const { playerCollections, collectionCrew, extendedCollections } = props;
	const { favorited, byCost, showIncomplete, matchMode, costMode, short, mapFilter, setModalInstance, setMapFilter, ownedFilter, rarityFilter, searchFilter, fuseFilter, setCollectionSettings } = colContext;

	const [initialized, setInitialized] = React.useState(false);
	const [requestRun, setRequestRun] = React.useState(false);
	const [offPageSelect, setOffPageSelect] = React.useState<number | undefined>(undefined);
	const milestoneOpts = [] as DropdownItemProps[];

	const [tabIndex, setTabIndex] = useStateWithStorage<number | undefined>('collectionstool/tabIndex', undefined, { rememberForever: true });

	React.useEffect(() => {
		let selnum = undefined as number | undefined;

		if (typeof window !== 'undefined' && (!!window.location.search?.length || !!window.location.hash?.length)) {
			if (globalContext.player.playerData) {
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

				let findcol: Collection | PlayerCollection | undefined = undefined;
				findcol = playerCollections?.find(f => f.name === sel && f.milestone.goal !== 0);

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
				else {
					findcol = globalContext.core.collections?.find(f => f.name === sel);
					if (findcol) {
						setModalInstance({
							collection: findcol as PlayerCollection,
							activeTab: 0
						});
						window.setTimeout(() => {
							window.history.replaceState({}, document.title, "/collections");
							setTabIndex(0);
						});
					}
				}
			}
		}
		setOffPageSelect(selnum);
	}, [colContext]);

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			if (initialized) {
				runWorker();
			}
			else {
				setRequestRun(true);
			}
		}
	}, [playerData, colContext]);

	if (!playerData) return <></>;

	setTimeout(() => {
		if (requestRun) {
			runWorker();
			setRequestRun(false);
			setInitialized(true);
		}
	}, 500);

	if (mapFilter.collectionsFilter?.length === 1) {
		let idx = playerCollections.findIndex(fc => fc.id === (!!mapFilter.collectionsFilter ? mapFilter.collectionsFilter[0] : null));
		if (idx >= 0) {
			let m_idx = playerCollections[idx].claimable_milestone_index ?? -1;
			if (m_idx !== -1 && m_idx != ((playerCollections[idx].milestones?.length ?? 0) - 1)) {
				let len = (!!playerCollections[idx].milestones ? playerCollections[idx].milestones?.length ?? 0 : 0);
				let milestones = playerCollections[idx].milestones ?? [];
				let crew = 0;
				for (let i = m_idx; i < len; i++) {
					crew = milestones[i].goal;
					milestoneOpts.push({
						key: i,
						value: i,
						text: `${i + 1} (${crew} Crew)`
					});
				}
			}
		}
	}

	const ownedFilterOptions = [] as DropdownItemProps;

	if (((tabIndex === 0 || !!mapFilter?.collectionsFilter?.length) && tabIndex !== 3)) {
		ownedFilterOptions.push({ key: 'none', value: '', text: 'Show all crew' })
		ownedFilterOptions.push({ key: 'unowned', value: 'unowned', text: 'Only show unowned crew' });
	}

	ownedFilterOptions.push({ key: 'owned', value: 'owned', text: 'Only show owned crew' })
	ownedFilterOptions.push({ key: 'owned-impact', value: 'owned-impact', text: 'Only show crew needing 1 fuse' });
	ownedFilterOptions.push({ key: 'owned-threshold', value: 'owned-threshold', text: 'Only show crew needing 1 or 2 fuses' });
	ownedFilterOptions.push({ key: 'owned-ff', value: 'owned-ff', text: 'Only show fully fused crew' });

	const rarityFilterOptions = [] as any[];

	CONFIG.RARITIES.forEach((r, i) => {
		if (i === 0) return;
		rarityFilterOptions.push(
			{ key: `${i}*`, value: i, text: `${i}* ${r.name}` }
		)
	});

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
			render: () =>
				<CollectionTableView
					playerCollections={extendedCollections}
					collectionCrew={collectionCrew}
					topCrewScore={topCrewScore}
					topStarScore={topStarScore}
					short={short}
					/>
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: tfmt('collections.panes.group.long_description', { star: <Icon name='star' color='green' size='small' /> }),
			showFilters: true,
			requirePlayer: true,
			mode: 'group',
			render: (workerRunning: boolean) =>
				<CollectionResearchView
					workerRunning={workerRunning}
					playerCollections={playerCollections}
					colData={colData} />
		},
		{
			menuItem: '',
			longTitle: '',
			description: '',
			longDescription: '',
			showFilters: true,
			requirePlayer: true,
			mode: 'optimizer',
			render: (workerRunning: boolean) =>
				<CollectionCombosView
					workerRunning={workerRunning}
					playerCollections={playerCollections}
					colCombos={colCombos}
					costMap={costMap}
					/>
		}
	];

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
						extendedCollections={extendedCollections}
						colCombos={colCombos}
						workerRunning={workerRunning}
						/>
				}
				{tabPanes[tabIndex].render(workerRunning)}
			</>
			}
			<CrewHoverStat  openCrew={(crew) => navToCrewPage(crew)} targetGroup='collectionsTarget' />
			<ItemHoverStat targetGroup='collectionsTarget_item' />
		</React.Fragment>
	);

	function processWorkerResult(message: { data: { result: CollectionWorkerResult; }; }) {
		const { result } = message.data;
		setColGroups(result.collections);
		setColOptimized(result.combos);
		setCostMap(result.comboCostMap);
	}

	function runWorker() {
		const options = {
			playerCollections,
			playerData: globalContext.player.playerData,
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

};