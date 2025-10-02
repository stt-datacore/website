import React from 'react';
import { StrictTableProps, Table } from 'semantic-ui-react';

import allFactions from '../../../static/structured/factions.json';

import ItemDisplay from '../../components/itemdisplay';
import { useStateWithStorage } from '../../utils/storage';

import { ShuttleSeat, ITableColumn, ITableData, ITableSortField } from './model';
import { IRosterCrew } from '../eventplanner/model';
import { GlobalContext } from '../../context/globalcontext';

type MissionsTableProps = {
	tableId: string;
	tableProps?: StrictTableProps;
	columns: ITableColumn[];
	data: ITableData[];
	defaultSort?: ITableSortField;
	renderTableRow: (datum: ITableData) => React.JSX.Element;
	renderTableFooter?: () => React.JSX.Element;
};

export const MissionsTable = (props: MissionsTableProps) => {
	const { tableId, columns, defaultSort, renderTableRow, renderTableFooter } = props;
	const { t } = React.useContext(GlobalContext).localized;
	const [data, setData] = React.useState<ITableData[]>([]);
	// !! Do not rememberForever the following preferences !!
	const [sortColumn, setSortColumn] = useStateWithStorage<string>(`${tableId}/column`, defaultSort?.id ?? 'name');
	const [sortDirection, setSortDirection] = useStateWithStorage<'ascending' | 'descending'>(`${tableId}/direction`, defaultSort?.firstSort ?? 'ascending');

	React.useEffect(() => {
		const data: ITableData[] = props.data.slice();
		dataSort(data, sortColumn ?? 'name', sortDirection ?? 'ascending');
		setData([...data]);
	}, [props.data, sortColumn, sortDirection]);

	const defaultTableProps: StrictTableProps = {
		celled: true,
		striped: true,
		selectable: true,
		sortable: true,
		unstackable: true
	};

	const tableProps: StrictTableProps = props.tableProps ?? defaultTableProps;

	const columnCount: number = columns.reduce((prev, curr) => prev + (curr.span ?? 1), 0);

	return (
		<div style={{ margin: '1em 0', overflowX: 'auto' }}>
			<Table key={tableId} {...tableProps}>
				<Table.Header>
					<Table.Row>
						{columns.map((column, idx) => (
							<Table.HeaderCell key={idx}
								sorted={column.sortField && sortColumn === column.sortField.id ? sortDirection : undefined}
								onClick={() => handleColumnHeaderClick(column)}
								colSpan={column.span ?? 1}
								textAlign={column.align ?? 'left'}
							>
								{column.title}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.length === 0 && (
						<Table.Row>
							<Table.Cell colSpan={columnCount} textAlign='center'>
								<p>{t('shuttle_helper.missions.status.no_missions')}</p>
							</Table.Cell>
						</Table.Row>
					)}
					{data.map(datum => renderTableRow(datum))}
				</Table.Body>
				{renderTableFooter && (
					<Table.Footer>
						{renderTableFooter()}
					</Table.Footer>
				)}
			</Table>
		</div>
	);

	function handleColumnHeaderClick(column: ITableColumn): void {
		if (!column.sortField) return;
		if (column.sortField.id === sortColumn) {
			setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
		}
		else {
			setSortColumn(column.sortField.id);
			setSortDirection(column.sortField.firstSort ?? 'ascending');
		}
	}

	function dataSort(data: ITableData[], sortColumn: string, sortDirection: string = 'ascending'): ITableData[] {
		const stringColumns: string[] = ['name', 'status'];
		const getDataValue = (datum: ITableData): any => {
			return sortColumn.split('.').reduce((prev, curr) => prev.hasOwnProperty(curr) ? prev[curr] : undefined, datum);
		};
		return data.sort((a, b) => {
			if (stringColumns.includes(sortColumn)) {
				if (sortDirection === 'descending') return b[sortColumn].localeCompare(a[sortColumn]);
				return a[sortColumn].localeCompare(b[sortColumn]);
			}

			let aValue: any = getDataValue(a);
			let bValue: any = getDataValue(b);

			// Always show selected missions at the top when sorting by priority
			if (sortColumn === '_priority') {
				aValue = a.priority > 0 ? a.priority : 100;
				bValue = b.priority > 0 ? b.priority : 100;
			}

			if (sortColumn === '_skills') {
				aValue = a.seats.length;
				bValue = b.seats.length;
			}

			// Tiebreaker goes to name ascending
			if (aValue === bValue) return a.name.localeCompare(b.name);

			if (sortDirection === 'descending') return bValue - aValue;
			return aValue - bValue;
		});
	}
};

type MissionFactionViewProps = {
	factionId: number;
	size: number;
};

export const MissionFactionView = (props: MissionFactionViewProps) => {
	const faction = allFactions.find(af => af.id === props.factionId);
	if (!faction) return <></>;
	return <img alt={faction.name} src={`${process.env.GATSBY_ASSETS_URL}${faction.icon}`} style={{ height: `${props.size}em` }} />;
};

type SeatSkillViewProps = {
	seat: ShuttleSeat;
};

export const SeatSkillView = (props: SeatSkillViewProps) => {
	const { seat } = props;
	const { t } = React.useContext(GlobalContext).localized;
	if (!seat.skillA) return <></>;
	return (
		<span style={{ whiteSpace: 'nowrap' }}>
			<img alt={seat.skillA} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skillA}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
			{seat.skillB && (
				<React.Fragment>
					<span style={{ padding: '0 .3em' }}>{t(`global.${seat.operand.toLowerCase()}`).toUpperCase()}</span>
					<img alt={seat.skillB} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skillB}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
				</React.Fragment>
			)}
		</span>
	);
};

type SeatCrewViewProps = {
	crew: IRosterCrew;
};

export const SeatCrewView = (props: SeatCrewViewProps) => {
	const { crew } = props;
	const imageUrlPortrait: string = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
	return (
		<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center'/* , justifyContent: 'center' */ }}>
			<ItemDisplay
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={32}
				maxRarity={crew.max_rarity}
				rarity={crew.rarity}
			/>
			<span style={{ padding: '0 .5em' }}>{crew.name}</span>
		</div>
	);
};
