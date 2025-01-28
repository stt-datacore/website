import React from 'react';
import {
	Pagination,
	StrictTableProps,
	Table
} from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import { IDataSortField, IDataTableColumn, IDataTableSetup, IEssentialData } from './model';
import { dataFieldSort } from './utils';

const defaultSort: IDataSortField = {
	id: 'name',
	firstSort: 'ascending',
	stringValue: true
};

type DataTableProps = {
	id: string;
	data: IEssentialData[];
	setup: IDataTableSetup;
	selectedIds?: Set<number>;
	handleClick?: (datumId: number) => void;
	handleDblClick?: (datumId: number) => void;
};

export const DataTable = (props: DataTableProps) => {
	const { setup } = props;

	// Persist sort preference
	const [sortField, setSortField] = useStateWithStorage<IDataSortField>(`${props.id}/sortField`, setup.defaultSort ?? defaultSort);
	const [sortDirection, setSortDirection] = useStateWithStorage<'ascending' | 'descending'>(`${props.id}/sortDirection`, setup.defaultSort?.firstSort ?? 'ascending');

	// Reset pagination on each reload
	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	const selectedIds: Set<number> = props.selectedIds ?? new Set<number>();

	const data = React.useMemo<IEssentialData[]>(() => {
		const data: IEssentialData[] = props.data.slice();
		dataFieldSort(data, sortField, sortDirection);
		setPaginationPage(1);
		return data;
	}, [props.data, sortField, sortDirection]);

	React.useEffect(() => {
		if (props.setup?.defaultSort?.immediateOverride) {
			delete props.setup.defaultSort.immediateOverride;
			setSortField(props.setup.defaultSort);
			setSortDirection(props.setup.defaultSort.firstSort ?? 'ascending');
		}
	}, [props.setup.defaultSort]);

	// Pagination
	const rowsPerPage: number = setup.rowsPerPage ?? 10;
	const totalPages: number = Math.ceil(data.length / rowsPerPage);
	const pageData: IEssentialData[] = data.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage);

	const defaultTableProps: StrictTableProps = {
		celled: true,
		striped: true,
		selectable: true,
		sortable: true,
		unstackable: true
	};

	const tableProps: StrictTableProps = setup.tableProps ?? defaultTableProps;

	const columnCount: number = setup.columns.length;

	return (
		<div style={{ overflowX: 'auto' }}>
			<Table {...tableProps}>
				<Table.Header>
					<Table.Row>
						{setup.columns.map(column => (
							<Table.HeaderCell key={column.id}
								textAlign={column.align ?? 'left'}
								sorted={column.sortField && sortField.id === column.sortField.id ? sortDirection : undefined}
								onClick={() => handleColumnHeaderClick(column)}
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
								{/* 0 results found. Please try different search options. */}
								<p>0 results found. Please try different search options.</p>
							</Table.Cell>
						</Table.Row>
					)}
					{pageData.map(datum => (
						<Table.Row key={datum.id}
							style={{ cursor: props.handleClick ? 'pointer' : undefined }}
							onClick={(e) => {
								if (e.detail === 2 && props.handleDblClick)
									props.handleDblClick(datum.id);
								else if (props.handleClick)
									props.handleClick(datum.id);
							}}
						>
							{setup.columns.map(column => (
								<Table.Cell key={column.id} textAlign={column.align ?? 'left'}>
									{column.renderCell(datum, selectedIds.has(datum.id))}
								</Table.Cell>
							))}
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={columnCount}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(e, { activePage }) => setPaginationPage(activePage as number)}
							/>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</div>
	);

	function handleColumnHeaderClick(column: IDataTableColumn): void {
		if (!column.sortField) return;
		if (column.sortField.id === sortField.id) {
			setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
			setPaginationPage(1);
		}
		else {
			setSortField(column.sortField);
			setSortDirection(column.sortField.firstSort ?? 'ascending');
			setPaginationPage(1);
		}
	}
};
