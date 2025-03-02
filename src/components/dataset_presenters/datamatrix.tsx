import React from 'react';
import {
	Icon,
	StrictTableProps,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { IDataMatrixSetup, IEssentialMatrixData } from './model';

type DataMatrixProps = {
	id: string;
	data: IEssentialMatrixData[];
	setup: IDataMatrixSetup;
	selectedIds?: Set<number>;
	handleClick?: (datumId: number) => void;
	handleDblClick?: (datumId: number) => void;
};

export const DataMatrix = (props: DataMatrixProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { setup } = props;

	const selectedIds: Set<number> = props.selectedIds ?? new Set<number>();

	const data = React.useMemo<IEssentialMatrixData[]>(() => {
		const data: IEssentialMatrixData[] = props.data.slice();
		return data;
	}, [props.data]);

	// No results found. Please try different search options.
	if (data.length === 0)
		return <>{t('global.no_search_results_found')}</>;

	const defaultTableProps: StrictTableProps = {
		definition: true,
		fixed: true,
		celled: true,
		striped: true,
		selectable: true,
		unstackable: true
	};

	const tableProps: StrictTableProps = setup.tableProps ?? defaultTableProps;

	return (
		<div style={{ overflowX: 'auto' }}>
			<Table {...tableProps}>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell />
						{setup.columns.map(column => (
							<Table.HeaderCell key={column.id}
								textAlign={column.align ?? 'left'}
							>
								{column.title}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{setup.rows.map(row => (
						<Table.Row key={row.id}>
							<Table.Cell
								textAlign={row.align ?? 'left'}
							>
								{row.title}
							</Table.Cell>
							{setup.columns.map(column => (
								<Table.Cell key={`${row.id},${column.id}`}
									textAlign={column.align ?? 'left'}
								>
									{renderMatrixCell(row.id, column.id)}
								</Table.Cell>
							))}
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</div>
	);

	function renderMatrixCell(rowId: string, columnId: string): JSX.Element {
		let datum: IEssentialMatrixData | undefined = data.find(datum => datum.rowId === rowId && datum.columnId === columnId);
		if (!datum && setup.permutate)
			datum = data.find(datum => datum.rowId === columnId && datum.columnId === rowId);
		if (!datum) return <></>;
		return setup.renderCell ? setup.renderCell(datum, selectedIds.has(datum.id)) : renderDefaultCell(datum, selectedIds.has(datum.id));
	}

	function renderDefaultCell(datum: IEssentialMatrixData, isSelected: boolean): JSX.Element {
		return (
			<React.Fragment>
				{isSelected && <Icon name='check' color='blue' />} {datum.name}
			</React.Fragment>
		);
	}
};
