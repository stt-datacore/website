import React from 'react';
import { Link } from 'gatsby';
import { Form, Dropdown, Header, Loader, Checkbox } from 'semantic-ui-react';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { CompletionState, PlayerBuffMode } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { ITableConfigRow } from '../../components/searchabletable';
import ProspectPicker from '../../components/prospectpicker';
import { oneCrewCopy, applyCrewBuffs, cheapestFFFE } from '../../utils/crewutils';
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
import { getQuipmentAsItemWithBonus } from '../../utils/itemutils';
import { TopQuipmentScoreCells, getTopQuipmentTableConfig } from './views/topquipment';
import { PowerMode, QuipmentToolsFilter } from './filters/quipmenttools';
import { CrewBuffModes, SpecialViewMode, SpecialViews } from './commonoptions';
import { UnifiedWorker } from '../../typings/worker';
import { ObtainedFilter } from './filters/crewobtained';
import { CrewDataCoreRankCells, getDataCoreRanksTableConfig } from './views/datacoreranks';
import WeightingInfoPopup from './weightinginfo';
import { ReleaseDateFilter } from './filters/crewreleasedate';
import { OptionsPanelFlexRow } from '../stats/utils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { CrewSkillOrder } from './filters/crewskillorder';
import { CheapestFilters, DefaultCheapestOpts } from './filters/cheapestfffe';

interface IRosterTableContext {
	pageId: string;
	rosterCrew: IRosterCrew[];
	rosterType: RosterType;
	initOptions: InitialOptions | undefined;
	lockableCrew: LockedProspect[];
	buffMode?: PlayerBuffMode;
	setBuffMode: (value?: PlayerBuffMode) => void;
};

type RosterConfig = {
	slots: number | undefined,
	traitsOnly: boolean,
	powerMode: PowerMode,
	rosterType: RosterType,
	tableView: TableView,
	specialView: SpecialViews | undefined
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

	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

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
					<RosterSummary myCrew={props.rosterCrew} allCrew={globalContext.core.crew.filter(c => !c.preview)} buffConfig={playerBuffs} />
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
	'qp_best' |
	'dc_ranks';

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
	extraSearchContent?: JSX.Element;
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
	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
	const { t, tfmt } = globalContext.localized;
	const { playerData, playerShips } = globalContext.player;
	const { topQuipmentScores: top } = globalContext.core;
	const tableContext = React.useContext(RosterTableContext);
	const { pageId, rosterCrew, rosterType, initOptions, lockableCrew, buffMode, setBuffMode } = tableContext;

	const [preparedCrew, setPreparedCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [ownedSkills, setOwnedSkills] = React.useState<string[]>([]);
	const [maxedSkills, setMaxedSkills] = React.useState<string[]>([]);

	const [dataPrepared, setDataPrepared] = React.useState<IDataPrepared>({} as IDataPrepared);
	const [crewMarkups, setCrewMarkups] = React.useState<ICrewMarkup[]>([] as ICrewMarkup[]);
	const [crewFilters, setCrewFilters] = React.useState<ICrewFilter[]>([] as ICrewFilter[]);

	const [viewIsReady, setViewIsReady] = React.useState<boolean | undefined>(undefined);

	const [showBase, setShowBase] = React.useState<boolean>(false);
	const [alwaysShowDataScore, setAlwaysShowDataScore] = React.useState<boolean>(false);
	const [weightingOpen, setWeightingOpen] = React.useState<boolean>(false);

	const [specialView, setSpecialView] = useStateWithStorage<SpecialViews | undefined>('/rosterTable/specialView', undefined);

	const [questFilter, setQuestFilter] = useStateWithStorage<string[] | undefined>('/quipmentTools/questFilter', undefined);
	const [pstMode, setPstMode] = useStateWithStorage<boolean | 2 | 3>('/quipmentTools/pstMode', false, { rememberForever: true });
	const [powerMode, setPowerMode] = useStateWithStorage<PowerMode>('/quipmentTools/powerMode', 'all', { rememberForever: true });
	const [slots, setSlots] = useStateWithStorage<number | undefined>('/quipmentTools/slots', undefined, { rememberForever: true });
	const [traitsOnly, setTraitsOnly] = useStateWithStorage<boolean>('/quipmentTools/traitsOnly', false, { rememberForever: true });
	const [tableView, setTableView] = useStateWithStorage<TableView>(pageId+'/rosterTable/tableView', getDefaultTable());
	const [critExpanded, setCritExpanded] = useStateWithStorage(pageId+'/rosterTable/critExpanded', undefined as string | undefined);
	const [cheapest, setCheapest] = useStateWithStorage(pageId+'/rosterTable/special/cheapestfffe/config', structuredClone(DefaultCheapestOpts), { rememberForever: true });
	const [altBaseLayout, setAltBaseLayout] = useStateWithStorage<boolean | undefined>(pageId+'/rosterTable/altBaseLayout', false, { rememberForever: true });
	const [activeRarities, setActiveRarities] = React.useState([] as number[]);
	const [currentWorker, setCurrentWorker] = React.useState<UnifiedWorker | undefined>(undefined);
	const [rosterConfig, setRosterConfig] = React.useState<RosterConfig | undefined>({
			slots,
			traitsOnly,
			powerMode,
			rosterType,
			tableView,
			specialView
		});

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
			id: 'dc_ranks',
			available: true,
			optionText: t('crew_views.scoring'),
			tableConfig: getDataCoreRanksTableConfig(globalContext.core.current_weighting, t, activeRarities),
			renderTableCells: (crew: IRosterCrew) => (
				<CrewDataCoreRankCells
					crew={crew}
					critExpanded={critExpanded}
					setCritExpanded={setCritExpanded}
					rarityFilter={activeRarities}
					weights={globalContext.core.current_weighting}
				/>
			)
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
							const work_crew = oneCrewCopy(crew[i]);
							const ref_crew = globalContext.core.crew.find(f => f.symbol === work_crew.symbol);
							if (ref_crew) {
								work_crew.base_skills = structuredClone(ref_crew.base_skills);
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
					//missions={continuum_missions}
					traitsOnly={traitsOnly}
					setTraitsOnly={setTraitsOnly}
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
			tableConfig: getTopQuipmentTableConfig(t, pstMode, ['allCrew', 'offers', 'buyBack'].includes(rosterType)),
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
					alwaysShowDataScore={alwaysShowDataScore}
					setAlwaysShowDataScore={setAlwaysShowDataScore}
				/>,
			tableConfig: getCrewUtilityTableConfig(t, showBase, alwaysShowDataScore),
			renderTableCells: (crew: IRosterCrew) => <CrewUtilityCells pageId={pageId} showBase={showBase} alwaysShowDataScore={alwaysShowDataScore} crew={crew} />
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
			id: 'special',
			available: playerData && rosterType === 'myCrew',
			form:
				<SpecialViewMode
					key='filter_mycrew_specialview'
					specialView={specialView}
					setSpecialView={setSpecialView}
				/>
		},
		{
			id: 'chepeastfffe',
			available: specialView === 'cheapestfffe',
			form:
				<CheapestFilters
					key='filter_mycrew_specialview_cheapestfffe'
					config={cheapest}
					setConfig={setCheapest}
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
		{
			id: 'skillorder_ownership',
			available: (['offers', 'allCrew', 'buyBack'].includes(rosterType)) && !!playerData,
			form:
				<CrewSkillOrder
					key='filter_allcrew_skillorder_ownership'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
					ownedSkills={ownedSkills}
					maxedSkills={maxedSkills}
				/>
		},
		{
			id: 'timeframe',
			available: (['allCrew'].includes(rosterType)),
			form:
				<ReleaseDateFilter
					key='filter_allcrew_releasedate'
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
		const activeView = tableViews.find(view => view.id === tableView);
		const resetList = [] as string[];
		crewFilters.forEach(crewFilter => {
			const formcondition = tableViews.find(filterView => filterView.id === crewFilter.id && !!filterView.form);
			if (formcondition && formcondition.id !== activeView?.id) resetList.push(crewFilter.id);
		});
		resetList.forEach(filterId => {
			const filterIndex = crewFilters.findIndex(crewFilter => crewFilter.id === filterId);
			if (filterIndex >= 0) crewFilters.splice(filterIndex, 1);
		});
		setCrewFilters([...crewFilters]);
	}, [tableView]);

	React.useEffect(() => {
		// Apply roster markups, i.e. add sortable fields to crew
		prepareCrew();
	}, [rosterCrew, crewMarkups, rosterConfig, specialView, cheapest]);

	React.useEffect(() => {
		const newConfig: RosterConfig = {
			slots,
			traitsOnly,
			powerMode,
			rosterType,
			tableView,
			specialView
		};
		if (!rosterConfig || Object.keys(newConfig).some(key => newConfig[key] != rosterConfig[key])) {
			setRosterConfig(newConfig);
		}
	}, [slots, traitsOnly, powerMode, rosterType, tableView, specialView]);

	React.useEffect(() => {
		setDataPrepared({
			rosterType,
			rosterCount: preparedCrew ? preparedCrew.length : 0,
			tableView,
			appliedFilters: crewFilters.map(crewFilter => crewFilter.id)
		});
	}, [rosterType, preparedCrew, tableView, crewFilters]);

	React.useEffect(() => {
		if (preparedCrew) {
			const maxedSkills = [... new Set(preparedCrew.filter(f => f.have && f.any_immortal).map(pc => `${pc.skill_order.join()},${pc.max_rarity}`))];
			setMaxedSkills(maxedSkills);
			const ownedSkills = [... new Set(preparedCrew.filter(f => f.have).map(pc => `${pc.skill_order.join()},${pc.max_rarity}`))];
			setOwnedSkills(ownedSkills);
		}
	}, [preparedCrew]);

	return (
		<React.Fragment>
			<Form>
				<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: '1em' }}>
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
						notifySetFilter={setActiveRarities}
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
				<React.Fragment>
					<CrewConfigTable
						pageId={pageId}
						rosterType={rosterType}
						initOptions={initOptions}
						rosterCrew={preparedCrew}
						crewFilters={crewFilters}
						extraSearchContent={view ? view?.extraSearchContent : renderExtraSearchContent()}
						tableConfig={view?.tableConfig ?? getBaseTableConfig(props.tableType, t, altBaseLayout && rosterType !== 'offers', specialView === 'cheapestfffe')}
						renderTableCells={(crew: IRosterCrew) =>
							view?.renderTableCells ?
							view.renderTableCells(crew) :
							<CrewBaseCells
								pageId={pageId}
								alternativeLayout={altBaseLayout && rosterType !== 'offers'}
								tableType={props.tableType}
								crew={crew}
								cheap={specialView === 'cheapestfffe'}
							/>}
						lockableCrew={lockableCrew}
						specialView={specialView}
						loading={isPreparing}
					/>
					{tableView === 'dc_ranks' && <WeightingInfoPopup saveConfig={() => false} isOpen={weightingOpen} setIsOpen={setWeightingOpen} />}
				</React.Fragment>
			}
			{viewIsReady === false && globalContext.core.spin(view?.spinText ?? 'Calculating...')}
		</React.Fragment>
	);

	function renderExtraSearchContent() {
		if (rosterType === 'offers') return <></>;
		return (
			<div style={{flexGrow: '1', flexWrap: 'wrap'}}>
				<div style={{...OptionsPanelFlexRow, justifyContent: isMobile ? 'flex-start' : 'flex-end', margin: '0.5em 0'}}>
					<Checkbox
						checked={altBaseLayout}
						onChange={(e, { checked }) => setAltBaseLayout(!!checked)}
						label={t('global.alternative_layout')}
					 />
					{/* <Button>{t('global.advanced_settings')}</Button> */}
				</div>
			</div>
		)
	}

	function getDefaultTable(): TableView {
		let defaultTable: TableView = '';
		if (initOptions?.column) {
			if (initOptions.column.startsWith('ranks.G_')) defaultTable = 'g_ranks';
			if (initOptions.column.startsWith('ranks.V_')) defaultTable = 'v_ranks';
		}
		return defaultTable;
	}

	async function prepareCrew() {
		let useCrew = rosterCrew;
		if (specialView === 'cheapestfffe' && !!playerData) {
			let { candidates } = cheapestFFFE(
				playerData,
				globalContext.core.crew,
				globalContext.core.items,
				cheapest.max_rarity,
				cheapest.min_rarity,
				cheapest.skirmish,
				cheapest.fuse
			)
			useCrew = candidates;
		}
		const preparedCrew = useCrew.map(crew => {
			if (crewMarkups.length > 0) {
					crewMarkups.forEach(crewMarkup => {
					crewMarkup.applyMarkup(crew);
				});
			}
			if (!!playerData && specialView === 'as_immortalized' && rosterType === 'myCrew') {
				if (!crew.immortal || !!crew.kwipment?.some(q => typeof q === 'number' ? !!q : !!q[1])) {
					crew = structuredClone(crew);
					let refcrew = globalContext.core.crew.find(f => f.symbol === crew.symbol)!;
					crew.base_skills = structuredClone(refcrew.base_skills);
					//if (!crew.immortal) crew.immortal = CompletionState.DisplayAsImmortalOwned;
					crew.rarity = crew.max_rarity;
					crew.level = 100;
					crew.ship_battle = structuredClone(refcrew.ship_battle);
					crew.action.bonus_amount = refcrew.action.bonus_amount;
					crew.skills = applyCrewBuffs(crew, buffMode === 'max' ? globalContext.maxBuffs! : globalContext.player.buffConfig!)!;
				}
			}
			return crew;
		});
		if (view?.worker) {
			setViewIsReady(false);
			view.worker(preparedCrew).then((result) => {
				setPreparedCrew(result);
				setViewIsReady(true);
			});
		}
		else {
			setPreparedCrew(preparedCrew);
			setViewIsReady(undefined);
		}
	};
};
