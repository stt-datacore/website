import React from 'react';
import { Link } from 'gatsby';
import { Form, Dropdown, Header, Loader } from 'semantic-ui-react';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { CompletionState, PlayerBuffMode } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { ITableConfigRow } from '../../components/searchabletable';
import ProspectPicker from '../../components/prospectpicker';
import { oneCrewCopy, applyCrewBuffs } from '../../utils/crewutils';
import { useStateWithStorage } from '../../utils/storage';

import { IRosterCrew, RosterType, ICrewMarkup, ICrewFilter } from './model';
import { CrewConfigTable } from './crewconfigtable';
import { CrewRarityFilter } from './filters/crewrarity';
import { CrewTraitsFilter } from './filters/crewtraits';
import { CrewStatusFilter } from './filters/crewstatus';
import { CrewMaintenanceFilter } from './filters/crewmaintenance';
import { CrewOwnershipFilter } from './filters/crewownership';
import { CrewPortalFilter } from './filters/crewportal';
import { getBaseTableConfig, CrewBaseCells } from './views/base';
import { ShipAbilitiesFilter, getShipTableConfig, CrewShipCells } from './views/shipabilities';
import { getRanksTableConfig, CrewRankCells } from './views/ranks';
import { CrewUtilityForm, getCrewUtilityTableConfig, CrewUtilityCells } from './views/crewutility';

import RosterSummary from './rostersummary';
import { QuipmentScoreCells, getQuipmentTableConfig as getQuipmentTableConfig } from './views/quipmentscores';
import { getItemWithBonus, getQuipmentAsItemWithBonus } from '../../utils/itemutils';
import { TopQuipmentScoreCells, getTopQuipmentTableConfig } from './views/topquipment';
import { PowerMode, QuipmentToolsFilter } from './filters/quipmenttools';
import { calcQLots } from '../../utils/equipment';
import { CrewBuffModes } from './commonoptions';
import { UnifiedWorker } from '../../typings/worker';
import { ObtainedFilter } from './filters/crewobtained';
import { CrewDataCoreRankCells, getDataCoreRanksTableConfig } from './views/datacoreranks';

interface IRosterTableContext {
	pageId: string;
	rosterCrew: IRosterCrew[];
	rosterType: RosterType;
	initOptions: InitialOptions | undefined;
	lockableCrew: LockedProspect[];
	buffMode?: PlayerBuffMode;
	setBuffMode: (value?: PlayerBuffMode) => void;
};

const RosterTableContext = React.createContext<IRosterTableContext>({} as IRosterTableContext);

type RosterTableProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	rosterType: RosterType;
	initOptions?: InitialOptions;
	initHighlight?: string;
	buffMode?: PlayerBuffMode;
	setBuffMode: (value?: PlayerBuffMode) => void;
};

export const RosterTable = (props: RosterTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData, buffConfig: playerBuffs } = globalContext.player;
	const { initHighlight, buffMode, setBuffMode } = props;

	const [prospects, setProspects] = React.useState<LockedProspect[]>([] as LockedProspect[]);

	const rosterPlusProspects = props.rosterCrew.slice();
	const lockableCrew = React.useMemo(() => {
		const newLockableCrew = [] as LockedProspect[];
		if (initHighlight !== '') {
			const highlighted = props.rosterCrew.find(crew => crew.symbol === initHighlight);
			if (highlighted) {
				newLockableCrew.push({
					symbol: highlighted.symbol,
					name: highlighted.name,
					rarity: highlighted.rarity,
					level: highlighted.level,
					prospect: highlighted.prospect
				});
			}
		}

		if (props.rosterType === 'myCrew') {

			prospects.forEach(prospect => {
				const crew = globalContext.core.crew.find(crew => crew.symbol === prospect.symbol);
				if (crew) {
					const crewman = {
						... oneCrewCopy(crew),
						id: rosterPlusProspects.length,
						prospect: true,
						have: false,
						rarity: prospect.rarity,
						level: playerData?.player.character.max_level ?? 100, // crew.max_level,   /* this property does not exist on core.crew!!! */,
						immortal: CompletionState.DisplayAsImmortalUnowned
					} as IRosterCrew;
					CONFIG.SKILLS_SHORT.forEach(skill => {
						let score = { core: 0, range_min: 0, range_max: 0 };
						if (crewman.base_skills[skill.name]) {
							if (crewman.rarity === crew.max_rarity)
								score = crewman.base_skills[skill.name];
							else
								score = crewman.skill_data[crewman.rarity-1].base_skills[skill.name];
						}
						crewman.base_skills[skill.name] = score;
					});
					if (playerData && playerBuffs) {
						applyCrewBuffs(crewman, playerBuffs);
					}
					rosterPlusProspects.push(crewman);
					newLockableCrew.push({
						symbol: crewman.symbol,
						name: crewman.name,
						rarity: crewman.rarity,
						level: crewman.level,
						prospect: crewman.prospect
					});
				}
			});
		}
		return newLockableCrew;
	}, [initHighlight, prospects]);

	const providerValue = {
		pageId: props.pageId,
		rosterCrew: rosterPlusProspects,
		rosterType: props.rosterType,
		initOptions: props.initOptions,
		lockableCrew,
		buffMode,
		setBuffMode
	} as IRosterTableContext;

	return (
		<RosterTableContext.Provider value={providerValue}>
			<CrewConfigTableMaker tableType={props.rosterType} />
			{props.rosterType === 'myCrew' && playerData && playerBuffs &&
				<React.Fragment>
					<RosterProspects prospects={prospects} setProspects={setProspects} />
					<Header as='h3'>{t('crew_views.advanced_analysis')}</Header>
					<RosterSummary myCrew={props.rosterCrew} allCrew={globalContext.core.crew} buffConfig={playerBuffs} />
				</React.Fragment>
			}
		</RosterTableContext.Provider>
	);
};

type RosterProspectsProps = {
	prospects: LockedProspect[],
	setProspects: (data: LockedProspect[]) => void;
};

const RosterProspects = (props: RosterProspectsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { prospects, setProspects } = props;
	const { t } = globalContext.localized;

	const pool = globalContext.core.crew.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<React.Fragment>
			<Header as='h4'>{t('crew_views.prospect.title')}</Header>
			<p>{t('crew_views.prospect.description')}</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

type TableView =
	'' |
	'ship' |
	'g_ranks' |
	'v_ranks' |
	'crewutility' |
	'qp_score' |
	'qp_best';

interface IToggleableFilter {
	id: string;
	available: boolean;
	form: JSX.Element;
};

interface ITableView {
	id: TableView;
	available: boolean;
	optionText: string;
	form?: JSX.Element;
	tableConfig: ITableConfigRow[];
	renderTableCells: (crew: IRosterCrew) => JSX.Element;
	spinText?: string;
	worker?: (crew: IRosterCrew[]) => Promise<IRosterCrew[]>;
};

interface ITableViewOption {
	key: string;
	value: TableView;
	text: string;
};

interface IDataPrepared {
	rosterType: string;
	rosterCount: number;
	tableView: TableView;
	appliedFilters: string[];
};

const CrewConfigTableMaker = (props: { tableType: RosterType }) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, playerShips } = globalContext.player;
	const { topQuipmentScores: top } = globalContext.core;
	const tableContext = React.useContext(RosterTableContext);
	const { pageId, rosterCrew, rosterType, initOptions, lockableCrew, buffMode, setBuffMode } = tableContext;

	const [preparedCrew, setPreparedCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [dataPrepared, setDataPrepared] = React.useState<IDataPrepared>({} as IDataPrepared);
	const [crewMarkups, setCrewMarkups] = React.useState<ICrewMarkup[]>([] as ICrewMarkup[]);
	const [crewFilters, setCrewFilters] = React.useState<ICrewFilter[]>([] as ICrewFilter[]);

	const [viewIsReady, setViewIsReady] = React.useState<boolean | undefined>(undefined);

	const [showBase, setShowBase] = React.useState<boolean>(false);

	const [questFilter, setQuestFilter] = useStateWithStorage<string[] | undefined>('/quipmentTools/questFilter', undefined);
	const [pstMode, setPstMode] = useStateWithStorage<boolean | 2 | 3>('/quipmentTools/pstMode', false, { rememberForever: true });
	const [powerMode, setPowerMode] = useStateWithStorage<PowerMode>('/quipmentTools/powerMode', 'all', { rememberForever: true });
	const [slots, setSlots] = useStateWithStorage<number | undefined>('/quipmentTools/slots', undefined, { rememberForever: true });
	const [tableView, setTableView] = useStateWithStorage<TableView>(pageId+'/rosterTable/tableView', getDefaultTable());

	const [currentWorker, setCurrentWorker] = React.useState<UnifiedWorker | undefined>(undefined);

	const quipment = getQuipmentAsItemWithBonus(globalContext.core.items);

	const shipranks = globalContext.core.crew.some(c => c.ranks.scores.ship);

	const getActiveBuffs = () => {
		if (buffMode === 'none' || !buffMode) return undefined;

		if (buffMode === 'player') {
			if (globalContext.player.buffConfig) {
				return globalContext.player.buffConfig;
			}
			else {
				return globalContext.maxBuffs;
			}
		}
		else if (buffMode === 'max') {
			return globalContext.maxBuffs;
		}

		return undefined;
	}

	const tableViews = [
		{
			id: 'ship',
			available: true,
			optionText: t('crew_views.ship'),
			form:
				<ShipAbilitiesFilter
					key='ship'
					pageId={pageId}
					rosterCrew={rosterCrew}
					playerData={playerData}
					ships={playerShips ?? globalContext.core.ships}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>,
			tableConfig: getShipTableConfig(t, shipranks),
			renderTableCells: (crew: IRosterCrew) => <CrewShipCells withranks={shipranks} crew={crew} />
		},
		{
			id: 'g_ranks',
			available: true,
			optionText: t('crew_views.gauntlet'),
			form: <p>{tfmt('crew_page.notes.gauntlet_determination', {
				link: <Link to='/gauntlets'>{t('menu.tools.gauntlet')}</Link>
			})}</p>,
			tableConfig: getRanksTableConfig('gauntlet'),
			renderTableCells: (crew: IRosterCrew) => <CrewRankCells crew={crew} prefix='G_' />
		},
		{
			id: 'v_ranks',
			available: true,
			optionText: t('crew_views.voyage'),
			form: <p>{tfmt('crew_page.notes.voyage_determination', {
				link: <Link to='/gauntlets'>{t('menu.tools.voyage_calculator')}</Link>
			})}</p>,
			tableConfig: getRanksTableConfig('voyage'),
			renderTableCells: (crew: IRosterCrew) => <CrewRankCells crew={crew} prefix='V_' />
		},
		{
			id: 'dc_ranks',
			available: true,
			optionText: t('rank_names.scoring'),
			tableConfig: getDataCoreRanksTableConfig(t),
			renderTableCells: (crew: IRosterCrew) => <CrewDataCoreRankCells crew={crew} />
		},
		{
			id: 'qp_score',
			available: true,
			optionText: t('crew_views.quipment'),
			tableConfig: getQuipmentTableConfig(t, ['allCrew', 'offers', 'buyBack'].includes(rosterType)),
			renderTableCells:
				(crew: IRosterCrew) =>
					<QuipmentScoreCells
						excludeQBits={['allCrew', 'offers', 'buyBack'].includes(rosterType)}
						excludeSkills={false}
						top={top[crew.max_rarity - 1]}
						crew={crew} />
		},
		{
			id: 'qp_best',
			available: true,
			optionText: t('crew_views.max_quipment'),
			spinText: t('spinners.quipment'),
			worker: (crew: IRosterCrew[]) => {
				return new Promise((resolve, reject) => {

					// immortalize the stats for quipment
					let c = crew.length;
					for (let i = 0; i < c; i++) {
						if (!crew[i].immortal) {
							const work_crew = JSON.parse(JSON.stringify(crew[i]));
							const ref_crew = globalContext.core.crew.find(f => f.symbol === work_crew.symbol);
							if (ref_crew) {
								work_crew.base_skills = JSON.parse(JSON.stringify(ref_crew.base_skills));
							}
							crew[i] = work_crew;
						}
					}

					if (currentWorker) {
						currentWorker.terminate();
					}

					let worker = new UnifiedWorker();
					worker.addEventListener('message', (result) => {
						resolve(result.data.result);
					});

					worker.postMessage({
						worker: 'qpower',
						config: {
							crew,
							quipment,
							buffs: getActiveBuffs(),
							max_qbits: ['allCrew', 'offers', 'buyBack'].includes(rosterType),
							slots,
							mode: powerMode
						}
					});

					setCurrentWorker(worker);
				});
			},
			form: <QuipmentToolsFilter
					questFilter={questFilter}
					setQuestFilter={setQuestFilter}
					immortalOnly={true}
					maxxed={['allCrew', 'offers', 'buyBack'].includes(rosterType)}
					quipment={quipment}
					pstMode={pstMode}
					setPstMode={setPstMode}
					powerMode={powerMode}
					setPowerMode={setPowerMode}
					slots={slots}
					setSlots={setSlots}
					key='qpbest_tool'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>,
			//form: <p>Rankings determined by precalculation. For specific advice on crew to use, consult the <Link to='/voyage'>Voyage Calculator</Link>.</p>,
			tableConfig: getTopQuipmentTableConfig(t, pstMode, ['allCrew', 'offers', 'buyBack'].includes(rosterType), powerMode, getActiveBuffs()),
			renderTableCells:
				(crew: IRosterCrew) =>
					<TopQuipmentScoreCells
						pstMode={pstMode}
						slots={slots}
						buffConfig={getActiveBuffs()}
						quipment={quipment}
						excludeQBits={['allCrew', 'offers', 'buyBack'].includes(rosterType)}
						targetGroup={`${pageId}/targetClassItem`}
						allslots={['allCrew', 'offers', 'buyBack'].includes(rosterType)}
						top={top[crew.max_rarity - 1]}
						crew={crew} />
		},
		{
			id: 'crew_utility',
			available: playerData && rosterType === 'myCrew',
			optionText: t('crew_views.crew_utility'),
			form:
				<CrewUtilityForm
					pageId={pageId}
					rosterCrew={rosterCrew}
					crewMarkups={crewMarkups}
					setCrewMarkups={setCrewMarkups}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
					showBase={showBase}
					setShowBase={setShowBase}
				/>,
			tableConfig: getCrewUtilityTableConfig(t, showBase),
			renderTableCells: (crew: IRosterCrew) => <CrewUtilityCells pageId={pageId} showBase={showBase} crew={crew} />
		},
	] as ITableView[];

	const toggleableFilters = [
		{
			id: 'status',
			available: playerData && rosterType === 'myCrew',
			form:
				<CrewStatusFilter
					key='filter_mycrew_status'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>
		},
		{
			id: 'maintenance',
			available: playerData && rosterType === 'myCrew',
			form:
				<CrewMaintenanceFilter
					key='filter_mycrew_maintenance'
					pageId={pageId}
					rosterCrew={rosterCrew}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>
		},
		{
			id: 'ownership',
			available: playerData && (['offers', 'allCrew', 'buyBack'].includes(rosterType)),
			form:
				<CrewOwnershipFilter
					key='filter_allcrew_ownership'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>
		},
		{
			id: 'obtained',
			available: (['allCrew'].includes(rosterType)),
			form:
				<ObtainedFilter
					key='filter_allcrew_obtained'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>
		},
	] as IToggleableFilter[];

	const tableViewOptions = [
		{ key: 'base', value: '' as TableView, text: t('crew_views.base') },
	] as ITableViewOption[];

	tableViews.forEach(view => {
		if (view.available) {
			tableViewOptions.push({
				key: view.id,
				value: view.id,
				text: view.optionText
			});
		}
	});

	const view = tableViews.find(tableViewOptions => tableViewOptions.id === tableView);

	const isPreparing = dataPrepared.rosterType !== rosterType ||
		dataPrepared.rosterCount !== (preparedCrew ? preparedCrew.length : 0) ||
		dataPrepared.tableView !== tableView ||
		dataPrepared.appliedFilters.length !== crewFilters.length ||
		!crewFilters.every(crewFilter => dataPrepared.appliedFilters.includes(crewFilter.id));

	React.useEffect(() => {
		// Reset table views when not available on updated roster type
		const activeView = tableViews.find(view => view.id === tableView);
		if (activeView && !activeView.available) setTableView('');

		// Reset toggleable filters on roster type change
		//	Otherwise hidden filters stay in effect when changing roster type
		const resetList = [] as string[];
		crewFilters.forEach(crewFilter => {
			const toggleable = toggleableFilters.find(toggleableFilter => toggleableFilter.id === crewFilter.id);
			if ((toggleable && !toggleable.available)) resetList.push(crewFilter.id);
		});
		resetList.forEach(filterId => {
			const filterIndex = crewFilters.findIndex(crewFilter => crewFilter.id === filterId);
			if (filterIndex >= 0) crewFilters.splice(filterIndex, 1);
			const markupIndex = crewMarkups.findIndex(crewMarkup => crewMarkup.id === filterId);
			if (markupIndex >= 0) crewMarkups.splice(markupIndex, 1);
		});
		setCrewFilters([...crewFilters]);
		setCrewMarkups([...crewMarkups]);
		// TODO: Also reset ship options on view change?
	}, [rosterType]);

	React.useEffect(() => {
		// Apply roster markups, i.e. add sortable fields to crew
		const prepareCrew = async () => {
			const preparedCrew = rosterCrew.slice();
			preparedCrew.forEach(crew => {
				if (crewMarkups.length > 0) {
						crewMarkups.forEach(crewMarkup => {
						crewMarkup.applyMarkup(crew);
					});
				}
			});

			if (view?.worker) {
				setViewIsReady(false);
				view.worker(preparedCrew).then((result) => {
					setPreparedCrew(result);
					const f = result.find(ff => ff.symbol === 'black_admiral_crew');
					console.log(f);
					setViewIsReady(true);
				});
			}
			else {
				setPreparedCrew([...preparedCrew]);
				setViewIsReady(undefined);
			}
		};
		prepareCrew();
	}, [rosterCrew, crewMarkups, slots, powerMode, rosterType, tableView]);

	React.useEffect(() => {
		if (!tableView.startsWith("qp_")) {
			const filterIndex = crewFilters.findIndex(crewFilter => crewFilter.id === 'quipmenttools');

			if (filterIndex >= 0) {
				crewFilters.splice(filterIndex, 1);
				setCrewFilters([ ... crewFilters ]);
			}
		}
	}, [tableView]);

	React.useEffect(() => {

		setDataPrepared({
			rosterType,
			rosterCount: preparedCrew ? preparedCrew.length : 0,
			tableView,
			appliedFilters: crewFilters.map(crewFilter => crewFilter.id)
		});

	}, [rosterType, preparedCrew, tableView, crewFilters]);

	return (
		<React.Fragment>
			<Form>
				<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: '1em' }}>
					<Form.Field
						placeholder={t('crew_views.base')}
						control={Dropdown}
						selection
						clearable
						options={tableViewOptions}
						value={tableView}
						onChange={(e, { value }) => setTableView(value as TableView)}
					/>
					<CrewRarityFilter
						pageId={pageId}
						crewFilters={crewFilters}
						setCrewFilters={setCrewFilters}
					/>
					<CrewTraitsFilter
						pageId={pageId}
						crewMarkups={crewMarkups}
						setCrewMarkups={setCrewMarkups}
						crewFilters={crewFilters}
						setCrewFilters={setCrewFilters}
					/>
					<CrewPortalFilter
						pageId={pageId}
						crewFilters={crewFilters}
						setCrewFilters={setCrewFilters}
					/>
					{(['allCrew', 'offers', 'buyBack'].includes(rosterType)) &&
					<CrewBuffModes
						buffMode={buffMode}
						setBuffMode={setBuffMode}
						playerAvailable={!!playerData}
						/>}
					{toggleableFilters.map(filter => filter.available && filter.form)}
					<div style={{ position: 'absolute', right: '0', alignSelf: 'flex-start' }}>
						<Loader inline active={isPreparing} />
					</div>
				</div>
			</Form>
			{view && view.form}
			{viewIsReady !== false && preparedCrew &&
				<CrewConfigTable
					pageId={pageId}
					rosterType={rosterType}
					initOptions={initOptions}
					rosterCrew={preparedCrew}
					crewFilters={crewFilters}
					tableConfig={view?.tableConfig ?? getBaseTableConfig(props.tableType, t)}
					renderTableCells={(crew: IRosterCrew) => view?.renderTableCells ? view.renderTableCells(crew) : <CrewBaseCells tableType={props.tableType} crew={crew} pageId={pageId} />}
					lockableCrew={lockableCrew}
					loading={isPreparing}
				/>
			}
			{viewIsReady === false && globalContext.core.spin(view?.spinText ?? 'Calculating...')}
		</React.Fragment>
	);

	function getDefaultTable(): TableView {
		let defaultTable: TableView = '';
		if (initOptions?.column) {
			if (initOptions.column.startsWith('ranks.G_')) defaultTable = 'g_ranks';
			if (initOptions.column.startsWith('ranks.V_')) defaultTable = 'v_ranks';
		}
		return defaultTable;
	}
};
