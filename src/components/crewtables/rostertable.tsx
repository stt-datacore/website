import React from 'react';
import { Form, Dropdown, Header, Loader } from 'semantic-ui-react';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { CompletionState } from '../../model/player';
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
import { ShipAbilitiesFilter, shipTableConfig, CrewShipCells } from './views/shipabilities';
import { getRanksTableConfig, CrewRankCells } from './views/ranks';

import RosterSummary from './rostersummary';

interface IRosterTableContext {
	pageId: string;
	rosterCrew: IRosterCrew[];
	rosterType: RosterType;
	initOptions: InitialOptions | undefined;
	lockableCrew: LockedProspect[];
};

const RosterTableContext = React.createContext<IRosterTableContext>({} as IRosterTableContext);

type RosterTableProps = {
	pageId: string;
	rosterCrew: IRosterCrew[];
	rosterType: RosterType;
	initOptions?: InitialOptions;
	initHighlight?: string;
};

export const RosterTable = (props: RosterTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, buffConfig: playerBuffs } = globalContext.player;
	const { initHighlight } = props;

	const [prospects, setProspects] = React.useState<LockedProspect[]>([] as LockedProspect[]);

	const rosterPlusProspects = props.rosterCrew.slice();
	const lockableCrew = [] as LockedProspect[];

	if (props.rosterType === 'myCrew') {
		if (initHighlight !== '') {
			const highlighted = props.rosterCrew.find(crew => crew.symbol === initHighlight);
			if (highlighted) {
				lockableCrew.push({
					symbol: highlighted.symbol,
					name: highlighted.name,
					rarity: highlighted.rarity,
					level: highlighted.level,
					prospect: highlighted.prospect
				});
			}
		}

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
				lockableCrew.push({
					symbol: crewman.symbol,
					name: crewman.name,
					rarity: crewman.rarity,
					level: crewman.level,
					prospect: crewman.prospect
				});
			}
		});
	}

	const providerValue = {
		pageId: props.pageId,
		rosterCrew: rosterPlusProspects,
		rosterType: props.rosterType,
		initOptions: props.initOptions,
		lockableCrew
	} as IRosterTableContext;

	return (
		<RosterTableContext.Provider value={providerValue}>
			<CrewConfigTableMaker />
			{props.rosterType === 'myCrew' && playerData && playerBuffs &&
				<React.Fragment>
					<RosterProspects prospects={prospects} setProspects={setProspects} />
					<Header as='h3'>Advanced Analysis</Header>
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

	const pool = globalContext.core.crew.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew to see how they fit into your existing roster.</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

type TableView =
	'' |
	'ship' |
	'g_ranks' |
	'v_ranks';

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
};

interface ITableViewOption {
	key: string;
	value: TableView;
	text: string;
};

interface IDataPrepared {
	rosterType: string;
	rosterCount: number;
	appliedFilters: string[];
};

const CrewConfigTableMaker = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, playerShips } = globalContext.player;
	const tableContext = React.useContext(RosterTableContext);
	const { pageId, rosterCrew, rosterType, initOptions, lockableCrew } = tableContext;

	const [preparedCrew, setPreparedCrew] = React.useState<IRosterCrew[] | undefined>(undefined);
	const [dataPrepared, setDataPrepared] = React.useState<IDataPrepared>({} as IDataPrepared);

	const [crewMarkups, setCrewMarkups] = React.useState<ICrewMarkup[]>([] as ICrewMarkup[]);
	const [crewFilters, setCrewFilters] = React.useState<ICrewFilter[]>([] as ICrewFilter[]);

	const [tableView, setTableView] = useStateWithStorage<TableView>('rosterTable/tableView', getDefaultTable() as TableView);

	React.useEffect(() => {
		// Reset toggleable filters on roster type change
		//	Otherwise hidden filters stay in effect when changing roster type
		const resetList = [] as string[];
		crewFilters.forEach(crewFilter => {
			const toggleable = toggleableFilters.find(toggleableFilter => toggleableFilter.id === crewFilter.id);
			if (toggleable && !toggleable.available) resetList.push(crewFilter.id);
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
		const applyMarkups = async () => {
			const preparedCrew = rosterCrew.slice();
			if (crewMarkups.length > 0) {
				preparedCrew.forEach(crew => {
					crewMarkups.forEach(crewMarkup => {
						crewMarkup.applyMarkup(crew);
					});
				});
			}
			setPreparedCrew([...preparedCrew]);
		};
		applyMarkups();
	}, [rosterCrew, crewMarkups]);

	React.useEffect(() => {
		setDataPrepared({
			rosterType,
			rosterCount: preparedCrew ? preparedCrew.length : 0,
			appliedFilters: crewFilters.map(crewFilter => crewFilter.id)
		});
	}, [rosterType, preparedCrew, crewFilters]);

	const tableViews = [
		{
			id: 'ship',
			available: true,
			optionText: 'Show ship abilities',
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
			tableConfig: shipTableConfig,
			renderTableCells: (crew: IRosterCrew) => <CrewShipCells crew={crew} />
		},
		{
			id: 'g_ranks',
			available: true,
			optionText: 'Show gauntlet ranks',
			tableConfig: getRanksTableConfig('gauntlet'),
			renderTableCells: (crew: IRosterCrew) => <CrewRankCells crew={crew} prefix='G_' />
		},
		{
			id: 'v_ranks',
			available: true,
			optionText: 'Show voyage ranks',
			tableConfig: getRanksTableConfig('voyage'),
			renderTableCells: (crew: IRosterCrew) => <CrewRankCells crew={crew} prefix='V_' />
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
			available: playerData && rosterType === 'allCrew',
			form:
				<CrewOwnershipFilter
					key='filter_allcrew_ownership'
					pageId={pageId}
					crewFilters={crewFilters}
					setCrewFilters={setCrewFilters}
				/>
		},
	] as IToggleableFilter[];

	const tableViewOptions = [
		{ key: 'base', value: '' as TableView, text: 'Show base skills' },
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
		dataPrepared.appliedFilters.length !== crewFilters.length ||
		!crewFilters.every(crewFilter => dataPrepared.appliedFilters.includes(crewFilter.id));

	return (
		<React.Fragment>
			<Form>
				<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: '1em' }}>
					<Form.Field
						placeholder='Show base skills'
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
					{toggleableFilters.map(filter => filter.available && filter.form)}
					<div>
						<Loader inline active={isPreparing} />
					</div>
				</div>
				{view && view.form}
			</Form>
			{preparedCrew &&
				<CrewConfigTable
					pageId={pageId}
					rosterType={rosterType}
					initOptions={initOptions}
					rosterCrew={preparedCrew}
					crewFilters={crewFilters}
					tableConfig={view?.tableConfig ?? getBaseTableConfig()}
					renderTableCells={(crew: IRosterCrew) => view?.renderTableCells ? view.renderTableCells(crew) : <CrewBaseCells crew={crew} />}
					lockableCrew={lockableCrew}
					loading={isPreparing}
				/>
			}
		</React.Fragment>
	);

	function getDefaultTable(): string {
		let defaultTable = '';
		if (initOptions?.column) {
			if (initOptions.column.startsWith('ranks.G_')) defaultTable = 'g_ranks';
			if (initOptions.column.startsWith('ranks.V_')) defaultTable = 'v_ranks';
		}
		return defaultTable;
	}
};
