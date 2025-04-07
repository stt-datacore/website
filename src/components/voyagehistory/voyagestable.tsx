import React from 'react';
import {
	Dropdown,
	DropdownItemProps,
	Form,
	Icon,
	Message,
	Pagination,
	Popup,
	Table
} from 'semantic-ui-react';

import { ITrackedVoyage, ITrackedCheckpoint } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { formatTime } from '../../utils/voyageutils';

import CONFIG from '../CONFIG';

import { HistoryContext } from './context';
import { deleteTrackedData, removeVoyageFromHistory, SyncState } from './utils';
import { VoyageModal } from './voyagemodal';

interface ITableState {
	data: ITrackedVoyage[];
	column: string;
	direction: 'ascending' | 'descending' | undefined;
};

interface ITableAction {
	type: string;
	data?: ITrackedVoyage[];
	column?: string;
	direction?: 'ascending' | 'descending';
};

interface ITableColumn {
	column: string;
	title: string;
	align?: 'left' | 'center' | 'right';
	firstSort?: 'ascending' | 'descending';
};

export const VoyagesTable = () => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES, t, tfmt } = globalContext.localized;
	const { ephemeral } = globalContext.player;
	const { dbid, history, setHistory, syncState, setMessageId } = React.useContext(HistoryContext);

	const [activeVoyage, setActiveVoyage] = React.useState<ITrackedVoyage | undefined>(undefined);
	const [state, dispatch] = React.useReducer(reducer, {
		data: history.voyages,
		column: 'date',
		direction: 'descending'
	});
	const { data, column, direction } = state;

	const [skillFilter, setSkillFilter] = React.useState<string>('');
	const [revivalFilter, setRevivalFilter] = React.useState<string>('');
	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: history.voyages });
	}, [history]);

	if (history.voyages.length === 0) return <></>;

	const skillOptions: DropdownItemProps[] = [
		{ /* Show all voyages */ key: 'all', value: '', text: t('voyage.show_all_voyages') }
	];
	CONFIG.SKILLS_SHORT.forEach(ss => {
		skillOptions.push(
			{	/* Only show voyages with SKILL */
				key: ss.short,
				value: ss.name,
				text: t('voyage.voyage_history.options.voyage_skill', { skill: CONFIG.SKILLS[ss.name] })
			}
		);
	});

	const revivalOptions: DropdownItemProps[] = [
		{ /* Show all voyages */ key: 'all', value: '', text: t('voyage.show_all_voyages') },
		{ /* Hide revived voyages */ key: 'hide', value: 'hide', text: t('voyage.voyage_history.options.revival.hide') },
		{ /* Only show revived voyages */ key: 'revived', value: 'revived', text: t('voyage.voyage_history.options.revival.revived') }
	];

	const tableConfig: ITableColumn[] = [
		{ /* Date */ column: 'created_at', title: t('voyage.voyage_history.fields.date'), align: 'left', firstSort: 'descending' },
		{ /* Primary */ column: 'skills.primary_skill', title: t('voyage.voyage_history.fields.primary') },
		{ /* Secondary */ column: 'skills.secondary_skill', title: t('voyage.voyage_history.fields.secondary') },
		{ /* Ship Trait */ column: '_shipTrait', title: t('voyage.voyage_history.fields.ship_trait') },
		{ /* Antimatter */ column: 'max_hp', title: t('voyage.voyage_history.fields.antimatter'), firstSort: 'descending' },
		{ /* Initial Estimate */ column: 'estimate.median', title: t('voyage.voyage_history.fields.initial_estimate'), firstSort: 'descending' },
		{ /* Last Estimate */ column: 'checkpoint.estimate.median', title: t('voyage.voyage_history.fields.last_estimate'), firstSort: 'descending' }
	];

	// Filter
	const filteredData: ITrackedVoyage[] = data.filter(row => {
		if (skillFilter && !([row.skills.primary_skill, row.skills.secondary_skill].includes(skillFilter))) return false;
		if (revivalFilter === 'hide' && row.revivals > 0) return false;
		if (revivalFilter === 'revived' && row.revivals === 0) return false;
		return true;
	});

	// Pagination
	const rowsPerPage: number = 10;
	const totalPages: number = Math.ceil(filteredData.length / rowsPerPage);
	const pagedData: ITrackedVoyage[] = filteredData.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage);

	return (
		<React.Fragment>
			<Form>
				<Form.Group inline>
					<Form.Field	/* Filter by voyage skill */
						placeholder={t('hints.filter_by_voyage_skill')}
						control={Dropdown}
						selection
						clearable
						options={skillOptions}
						value={skillFilter}
						onChange={(e, { value }) => setSkillFilter(value as string)}
					/>
					<Form.Field	/* Filter by revivals */
						placeholder={t('hints.filter_by_revivals')}
						control={Dropdown}
						selection
						clearable
						options={revivalOptions}
						value={revivalFilter}
						onChange={(e, { value }) => setRevivalFilter(value as string)}
					/>
				</Form.Group>
			</Form>
			<Table sortable celled selectable striped>
				<Table.Header>
					<Table.Row>
						{tableConfig.map((cell, idx) => (
							<Table.HeaderCell key={idx}
								textAlign={cell.align ?? 'center'}
								sorted={column === cell.column ? direction : undefined}
								onClick={() => dispatch({
									type: 'CHANGE_SORT',
									column: cell.column,
									direction: state.column === cell.column ? (state.direction === 'ascending' ? 'descending' : 'ascending') : (cell.firstSort ?? 'ascending')
								})}
							>
								{cell.title}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{pagedData.map(row => renderTableRow(row))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={tableConfig.length}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(e, { activePage }) => setPaginationPage(activePage as number)}
							/>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			{activeVoyage &&
				<VoyageModal voyage={activeVoyage}
					onClose={() => setActiveVoyage(undefined)}
					onRemove={() => removeTrackedVoyage(activeVoyage.tracker_id)}
				/>
			}
			<HistoryTips />
		</React.Fragment>
	);

	function renderTableRow(row: ITrackedVoyage): JSX.Element {
		const dtCreated: Date = new Date(row.created_at);
		const isRunning: boolean = row.voyage_id > 0 && !!ephemeral?.voyage.find(v => v.id === row.voyage_id);
		return (
			<Table.Row key={row.tracker_id}>
				<Table.Cell style={{
					display: 'flex',
					padding: '1em',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'flex-start',
					gap: '1em'
				}}>
					<Icon name='trash' onClick={() => removeTrackedVoyage(row.tracker_id)} style={{cursor: 'pointer'}} />
					<div onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
						{dtCreated.toLocaleDateString()}
						{isRunning && <><br/>{t('voyage.running_voyage')}</>}
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					{CONFIG.SKILLS[row.skills.primary_skill]}
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					{CONFIG.SKILLS[row.skills.secondary_skill]}
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					{SHIP_TRAIT_NAMES[row.ship_trait] ?? row.ship_trait}
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					{row.max_hp}
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					<b>{formatTime(row.estimate.median, t)}</b>
					<br />({`${formatTime(row.estimate.minimum, t)} - ${formatTime(row.estimate.moonshot, t)}`})
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
					{renderLastEstimate(row.checkpoint)}
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderLastEstimate(checkpoint: ITrackedCheckpoint): JSX.Element {
		let estimateType: string = 'estimated';
		if (['completed', 'recalled'].includes(checkpoint.state))
			estimateType = 'recalled';
		else if (checkpoint.state === 'failed')
			estimateType = 'failed';
		return (
			<React.Fragment>
				<b>{formatTime(checkpoint.estimate.median, t)}</b>
				<div>
					(
						{tfmt(`voyage.estimate.estimated_at.${estimateType}`, { time: formatTime(checkpoint.runtime, t) })}
						{checkpoint.hp > 0 && <><br />{tfmt('voyage.estimate.with_n_am_left', { n: <>{checkpoint.hp}</> })}</>}
					)
				</div>
			</React.Fragment>
		);
	}

	function removeTrackedVoyage(trackerId: number): void {
		if (syncState === SyncState.RemoteReady) {
			deleteTrackedData(dbid, trackerId).then((success: boolean) => {
				if (success) {
					removeVoyageFromHistory(history, trackerId);
					setHistory({...history});
					setActiveVoyage(undefined);
				}
				else {
					throw('Failed removeTrackedVoyage -> deleteTrackedData');
				}
			}).catch(e => {
				setMessageId('voyage.history_msg.failed_to_delete');
				console.log(e);
			});
		}
		else if (syncState === SyncState.LocalOnly) {
			removeVoyageFromHistory(history, trackerId);
			setHistory({...history});
			setActiveVoyage(undefined);
		}
		else {
			setMessageId('voyage.history_msg.invalid_sync_state');
			console.log(`Failed removeTrackedVoyage (invalid syncState: ${syncState})`);
		}
	}

	function reducer(state: ITableState, action: ITableAction): ITableState {
		switch (action.type) {
			case 'UPDATE_DATA':
				if (!action.data) return state;
				const updatedData: ITrackedVoyage[] = action.data.slice();
				sorter(updatedData, 'created_at', 'descending');
				return {
					column: 'created_at',
					data: updatedData,
					direction: 'descending'
				};
			case 'CHANGE_SORT':
				if (!action.column) return state;
				const sortableData: ITrackedVoyage[] = state.data.slice();
				const direction: 'ascending' | 'descending' = action.direction ?? 'ascending';
				sorter(sortableData, action.column, direction);
				return {
					column: action.column,
					data: sortableData,
					direction
				};
			default:
				throw new Error();
		}
	}

	function sorter(data: ITrackedVoyage[], column: string, direction: 'ascending' | 'descending'): void {
		const sortBy = (comps: ((a: ITrackedVoyage, b: ITrackedVoyage) => number)[]) => {
			data.sort((a, b) => {
				const tests = comps.slice();
				let test: number = 0;
				while (tests.length > 0 && test === 0) {
					let shtest = tests.shift();
					test = shtest ? shtest(a, b) : 0;
				}
				return test;
			});
		};
		const getValueFromPath = (obj: any, path: string) => {
			return path.split('.').reduce((a, b) => (a || {b: 0})[b], obj);
		};

		const compareNumberColumn = (a: ITrackedVoyage, b: ITrackedVoyage) => {
			if (direction === 'descending') return getValueFromPath(b, column) - getValueFromPath(a, column);
			return getValueFromPath(a, column) - getValueFromPath(b, column);
		};
		const compareTextColumn = (a: ITrackedVoyage, b: ITrackedVoyage) => {
			if (direction === 'descending') return getValueFromPath(b, column).localeCompare(getValueFromPath(a, column));
			return getValueFromPath(a, column).localeCompare(getValueFromPath(b, column));
		};
		const compareDateDesc = (a: ITrackedVoyage, b: ITrackedVoyage) => b.created_at - a.created_at;
		const compareShipTrait = (a: ITrackedVoyage, b: ITrackedVoyage) => {
			const aShipTrait = SHIP_TRAIT_NAMES[a.ship_trait] ?? a.ship_trait;
			const bShipTrait = SHIP_TRAIT_NAMES[b.ship_trait] ?? b.ship_trait;
			if (direction === 'descending') return bShipTrait.localeCompare(aShipTrait);
			return aShipTrait.localeCompare(bShipTrait);
		};

		if (['skills.primary_skill', 'skills.secondary_skill'].includes(column)) {
			sortBy([compareTextColumn, compareDateDesc]);
			return;
		}
		else if (column === '_shipTrait') {
			sortBy([compareShipTrait, compareDateDesc]);
			return;
		}

		sortBy([compareNumberColumn, compareDateDesc]);
		return;
	}
};

const HistoryTips = () => {
	const { t } = React.useContext(GlobalContext).localized;

	return (
		<Message style={{ margin: '1em 0' }}>
			<Message.Content>
				<Message.Header	/* Tips */
				>
					{t('voyage.voyage_history.tips.title')}
				</Message.Header>
				<p>{t('voyage.voyage_history.tips.tip1')}</p>
				<p>{t('voyage.voyage_history.tips.tip2')}</p>
				<p>{t('voyage.voyage_history.tips.tip3')}</p>
			</Message.Content>
		</Message>
	);
};
