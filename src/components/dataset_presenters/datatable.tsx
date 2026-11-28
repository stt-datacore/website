import React from 'react';
import {
	Pagination,
	StrictTableProps,
	Table
} from 'semantic-ui-react';

import { v4 } from 'uuid';

import { GlobalContext } from '../../context/globalcontext';

import { IControlledPagination, IControlledSort, IDataSortField, IDataTableColumn, IDataTableSetup, IEssentialData, TSortDirection } from './model';
import { useDataSorter } from './usedata';

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
	controlledSort?: IControlledSort;
	controlledPagination?: IControlledPagination;
};

export const DataTable = (props: DataTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { setup } = props;

	const [data, setData] = React.useState<IEssentialData[] | undefined>(undefined);
	const prepareSortedData = useDataSorter<IEssentialData>();

	// Reset sort on each reload
	const [sortField, setSortField] = React.useState<IDataSortField>(setup?.defaultSort ?? defaultSort);
	const [sortDirection, setSortDirection] = React.useState<TSortDirection>(setup?.defaultSort?.firstSort ?? 'ascending');

	// Reset pagination on each reload
	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	React.useEffect(() => {
		// If controlled sort, update state directly without preparation
		if (props.controlledSort) {
			updateState(
				props.data,
				props.controlledSort.sortField,
				props.controlledSort.sortDirection
			);
			return;
		}
		// Otherwise re-sort data by most recent sort field
		prepareSortedData(props.data, sortField, sortDirection).then(sortedData => {
			updateState(sortedData, sortField, sortDirection);
		});
	}, [props.data, setup]);

	const selectedIds: Set<number> = props.selectedIds ?? new Set<number>();

	if (!data) return <></>;

	// Pagination (only used if controlled pagination is not defined)
	const rowsPerPage: number = setup.rowsPerPage ?? 10;
	const totalPages: number = Math.ceil(data.length / rowsPerPage);
	const pagedData: IEssentialData[] = data.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage);

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
		<React.Fragment>
			<div style={{ overflowX: 'auto' }}>
				<Table {...tableProps}>
					<Table.Header>
						<Table.Row>
							{setup.columns.map(column => (
								<Table.HeaderCell key={v4()}
									textAlign={column.align ?? 'left'}
									sorted={column.sortField && sortField.id === column.sortField.id ? sortDirection : undefined}
									onClick={() => handleColumnHeaderClick(column)}
									className={column.className}
								>
									<div style={{ display: 'inline-block' }}>
										{column.title}
										{column.subtitle && (
											<div>
												<small>{column.subtitle.toLocaleUpperCase()}</small>
											</div>
										)}
									</div>
								</Table.HeaderCell>
							))}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{data.length === 0 && (
							<Table.Row>
								<Table.Cell colSpan={columnCount} textAlign='center'>
									{/* No results found. Please try different search options. */}
									<p>{t('global.no_search_results_found')}</p>
								</Table.Cell>
							</Table.Row>
						)}
						{pagedData.map(datum => (
							<Table.Row key={v4()}
								style={{ cursor: props.handleClick ? 'pointer' : undefined }}
								onClick={(e) => {
									if (e.detail === 2 && props.handleDblClick)
										props.handleDblClick(datum.id);
									else if (props.handleClick)
										props.handleClick(datum.id);
								}}
							>
								{setup.columns.map(column => renderCell(column, datum))}
							</Table.Row>
						))}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.HeaderCell colSpan={columnCount} />
						</Table.Row>
					</Table.Footer>
				</Table>
			</div>
			{!props.controlledPagination && totalPages > 1 && (
				<div style={{ marginTop: '1em' }}>
					<Pagination
						totalPages={totalPages}
						activePage={paginationPage}
						onPageChange={(e, { activePage }) => setPaginationPage(activePage as number)}
						boundaryRange={0}
						ellipsisItem={false}
					/>
				</div>
			)}
		</React.Fragment>
	);

	function updateState(data: IEssentialData[], sortField: IDataSortField, sortDirection: TSortDirection, paginationPage: number = 1): void {
		setData(data);
		setSortField(sortField);
		setSortDirection(sortDirection);
		setPaginationPage(paginationPage);
	}

	function handleColumnHeaderClick(column: IDataTableColumn): void {
		if (!column.sortField) return;
		let updatedSortDirection: TSortDirection = column.sortField.firstSort ?? 'ascending';
		if (column.sortField.id === sortField.id)
			updatedSortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
		// If controlled sort, update parent with requested sort field
		if (props.controlledSort?.onSortRequest) {
			props.controlledSort.onSortRequest(column.sortField, updatedSortDirection);
			return;
		}
		// Otherwise re-sort data by requested sort field
		prepareSortedData(props.data, column.sortField, updatedSortDirection).then(sortedData => {
			updateState(sortedData, column.sortField!, updatedSortDirection);
		});
	}

	function renderCell(column: IDataTableColumn, datum: IEssentialData): React.ReactNode {
		if (column.renderComplexCell) return column.renderComplexCell(datum, selectedIds.has(datum.id));
		return (
			<Table.Cell key={column.id}
				textAlign={column.align ?? 'left'}
				className={column.className}
			>
				{column.renderCell ? column.renderCell(datum, selectedIds.has(datum.id)) : renderDataField(datum, column.id)}
			</Table.Cell>
		);
	}

	function renderDataField(datum: IEssentialData, fieldName: string): React.ReactNode {
		const value: any = fieldName.split('.').reduce((prev, curr) =>
			prev?.hasOwnProperty(curr) ? prev[curr] : undefined,
			datum
		);
		if (value) return <>{value}</>;
		return <></>;
	}
};
