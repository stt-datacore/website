import React from 'react';
import { Table, Form, Dropdown, Pagination, Message } from 'semantic-ui-react';

import { ITrackedVoyage, ITrackedCheckpoint } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { formatTime } from '../../utils/voyageutils';

import { HistoryContext } from './context';
import { VoyageModal } from './voyagemodal';
import { removeVoyageFromHistory } from './utils';

type VoyagesTableProps = {
	activeVoyageId: number;
};

export const VoyagesTable = (props: VoyagesTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
	const { history, setHistory } = React.useContext(HistoryContext);
	const { activeVoyageId } = props;

	const [activeVoyage, setActiveVoyage] = React.useState<ITrackedVoyage | undefined>(undefined);
	const [state, dispatch] = React.useReducer(reducer, {
		data: history.voyages,
		column: 'date',
		direction: 'descending'
	});
	const { data, column, direction } = state;

	const [skillFilter, setSkillFilter] = React.useState<string>('');
	const [revivalFilter, setRevivalFilter] = React.useState<string>('');
	const [paginationPage, setPaginationPage] = React.useState(1);

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: history.voyages });
	}, [history]);

	interface IDropdownOption {
		key: string;
		value: string;
		text: string;
	};

	const skillOptions = [
		{ key: 'all', value: '', text: 'Show all voyages' },
		{ key: 'cmd', value: 'command_skill', text: 'Only show voyages with command' },
		{ key: 'dip', value: 'diplomacy_skill', text: 'Only show voyages with diplomacy' },
		{ key: 'eng', value: 'engineering_skill', text: 'Only show voyages with engineering' },
		{ key: 'med', value: 'medicine_skill', text: 'Only show voyages with medicine' },
		{ key: 'sci', value: 'science_skill', text: 'Only show voyages with science' },
		{ key: 'sec', value: 'security_skill', text: 'Only show voyages with security' }
	] as IDropdownOption[];

	const revivalOptions = [
		{ key: 'all', value: '', text: 'Show all voyages' },
		{ key: 'hide', value: 'hide', text: 'Hide revived voyages' },
		{ key: 'revived', value: 'revived', text: 'Only show revived voyages' }
	] as IDropdownOption[];

	interface ICustomRow {
		column: string;
		title: string;
		align: 'left' | 'center' | 'right' | undefined;
		descendFirst?: boolean;
	};

	const tableConfig = [
		{ column: 'created_at', title: 'Date', align: 'left', descendFirst: true },
		{ column: 'skills.primary_skill', title: 'Primary' },
		{ column: 'skills.secondary_skill', title: 'Secondary' },
		{ column: '_shipTrait', title: 'Ship Trait' },
		{ column: 'max_hp', title: 'Antimatter', descendFirst: true },
		{ column: 'estimate.median', title: 'Initial Estimate', descendFirst: true },
		{ column: 'checkpoint.estimate.median', title: 'Last Estimate', descendFirst: true }
	] as ICustomRow[];

	// Filter
	const filteredData = data.filter(row => {
		if (skillFilter && !([row.skills.primary_skill, row.skills.secondary_skill].includes(skillFilter))) return false;
		if (revivalFilter === 'hide' && row.revivals > 0) return false;
		if (revivalFilter === 'revived' && row.revivals === 0) return false;
		return true;
	}) as ITrackedVoyage[];

	// Pagination
	const rowsPerPage = 10;
	const totalPages = Math.ceil(filteredData.length / rowsPerPage);
	const pagedData = filteredData.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage) as ITrackedVoyage[];

	return (
		<React.Fragment>
			<Form>
				<Form.Group inline>
					<Form.Field
						placeholder='Filter by skill'
						control={Dropdown}
						selection
						clearable
						options={skillOptions}
						value={skillFilter}
						onChange={(e, { value }) => setSkillFilter(value as string)}
					/>
					<Form.Field
						placeholder='Filter by revivals'
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
								onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, descendFirst: cell.descendFirst })}
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
			<Message style={{ margin: '1em 0' }}>
				<Message.Content>
					<Message.Header>Tips</Message.Header>
					<p>Once you start tracking a voyage, update your player data while your voyage is running to automatically track your current runtime and estimate.</p>
					<p>You may want to check on the voyage in-game shortly before importing your player data to DataCore. Your remaining antimatter only gets updated in your player data when the displayed voyage runtime is updated in-game, which may lead to stale estimates on DataCore.</p>
					<p>Because voyages can be recalled at any time, we use <i>last estimates</i> (rather than actual voyage runtimes) as a more consistent metric to compare voyage lengths. We recommend updating your player data after recalling a voyage to keep track of your recall time and to get a final last estimate.</p>
					<p>Voyage history does not synchronize across multiple devices. You can only update a voyage estimate on the device where you initially tracked it.</p>
				</Message.Content>
			</Message>
			{activeVoyage &&
				<VoyageModal voyage={activeVoyage}
					onClose={() => setActiveVoyage(undefined)}
					onRemove={() => removeTrackedVoyage(activeVoyage.tracker_id)}
				/>
			}
		</React.Fragment>
	);

	function renderTableRow(row: ITrackedVoyage): JSX.Element {
		const dtCreated = new Date(row.created_at);
		return (
			<Table.Row key={row.tracker_id} onClick={() => setActiveVoyage(row)} style={{ cursor: 'pointer' }}>
				<Table.Cell>
					{dtCreated.toLocaleDateString()}
					{activeVoyageId > 0 && row.voyage_id === activeVoyageId && <><br/>Active Voyage</>}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{CONFIG.SKILLS[row.skills.primary_skill]}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{CONFIG.SKILLS[row.skills.secondary_skill]}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{SHIP_TRAIT_NAMES[row.ship_trait] ?? row.ship_trait}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{row.max_hp}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{formatTime(row.estimate.median, t)}</b>
					<br />({`${formatTime(row.estimate.minimum, t)} - ${formatTime(row.estimate.moonshot, t)}`})
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{renderLastEstimate(row.checkpoint)}
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderLastEstimate(checkpoint: ITrackedCheckpoint): JSX.Element {
		let estimateType = 'estimated';
		if (['completed', 'recalled'].includes(checkpoint.state))
			estimateType = 'recalled';
		else if (checkpoint.state === 'failed')
			estimateType = 'failed';
		return (
			<React.Fragment>
				<b>{formatTime(checkpoint.estimate.median, t)}</b>
				<div>
					({estimateType} at {formatTime(checkpoint.runtime, t)}
					{checkpoint.hp > 0 && <><br />with {checkpoint.hp} AM left</>})
				</div>
			</React.Fragment>
		);
	}

	function removeTrackedVoyage(trackerId: number): void {
		removeVoyageFromHistory(history, trackerId);
		setHistory({...history});
		setActiveVoyage(undefined);
	}

	function reducer(state: any, action: any): any {
		switch (action.type) {
			case 'UPDATE_DATA':
				const updatedData = action.data.slice();
				sorter(updatedData, 'created_at', 'descending');
				return {
					column: 'created_at',
					data: updatedData,
					direction: 'descending'
				};
			case 'CHANGE_SORT':
				let direction = action.descendFirst ? 'descending' : 'ascending';
				// Reverse sort
				if (state.column === action.column) {
					direction = state.direction === 'ascending' ? 'descending' : 'ascending';
				}
				const data = state.data.slice();
				sorter(data, action.column, direction);
				return {
					column: action.column,
					data: data,
					direction
				};
			default:
				throw new Error();
		}
	}

	function sorter(data: ITrackedVoyage[], column: string, direction: string): void {
		const sortBy = (comps: ((a: ITrackedVoyage, b: ITrackedVoyage) => number)[]) => {
			data.sort((a, b) => {
				const tests = comps.slice();
				let test = 0;
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
