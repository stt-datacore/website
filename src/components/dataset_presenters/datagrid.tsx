import React from 'react';
import { InView } from 'react-intersection-observer';
import {
	Grid,
	Icon,
	Pagination,
	StrictGridColumnProps,
	StrictGridProps
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { IControlledPagination, IControlledSort, IDataGridSetup, IDataSortField, IEssentialData, TSortDirection } from './model';
import { dataFieldSort } from './utils';

const defaultSort: IDataSortField = {
	id: 'name',
	firstSort: 'ascending',
	stringValue: true
};

type DataGridProps = {
	id: string;
	data: IEssentialData[];
	setup?: IDataGridSetup;
	selectedIds?: Set<number>;
	handleClick?: (datumId: number) => void;
	handleDblClick?: (datumId: number) => void;
	controlledSort?: IControlledSort;
	controlledPagination?: IControlledPagination;
};

export const DataGrid = (props: DataGridProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { setup } = props;

	const [data, setData] = React.useState<IEssentialData[] | undefined>(undefined);

	// Reset sort on each reload
	const [sortField, setSortField] = React.useState<IDataSortField>(setup?.defaultSort ?? defaultSort);
	const [sortDirection, setSortDirection] = React.useState<TSortDirection>(setup?.defaultSort?.firstSort ?? 'ascending');

	// Reset pagination/view on each reload
	const [paginationPage, setPaginationPage] = React.useState<number>(1);
	const [pageInView, setPageInView] = React.useState<number>(1);

	React.useEffect(() => {
		// If controlled sort, send data and sort field directly to UI
		if (props.controlledSort) {
			updateState(
				props.data,
				props.controlledSort.sortField,
				props.controlledSort.sortDirection
			);
			return;
		}
		// Otherwise re-sort updated data by most recent sort field
		const data: IEssentialData[] = dataFieldSort(props.data, sortField, sortDirection);
		updateState(data, sortField, sortDirection);
	}, [props.data, setup]);

	if (!data) return <></>;

	// No results found. Please try different search options.
	if (data.length === 0)
		return <>{t('global.no_search_results_found')}</>;

	const selectedIds: Set<number> = props.selectedIds ?? new Set<number>();

	// Pagination (only used if controlled pagination is not defined)
	let totalPages: number = 1;
	let pagedData: IEssentialData[] = data.slice();
	if (setup?.itemsPerPage) {
		const itemsPerPage: number = setup.itemsPerPage;
		totalPages = Math.ceil(data.length / itemsPerPage);
		pagedData = data.slice(itemsPerPage * (paginationPage - 1), itemsPerPage * paginationPage);
	}

	// Number of items that are rendered in view at a time (defaults to 24)
	const itemsInView: number = setup?.itemsInView ?? (setup?.itemsPerPage ?? 24);
	let itemsToRender: number = (itemsInView * (pageInView - 1)) + itemsInView;

	const defaultGridProps: StrictGridProps = {
		textAlign: 'center'
	};

	// Default column props are optimized for crew picker modal
	//	Defaults are only used if columns isn't defined in grid props
	const defaultColumnProps: StrictGridColumnProps = {
		mobile: 8,	// 2 items per row
		tablet: 5,	// 3 items per row
		computer: 4	// 4 items per row
	};

	const gridProps: StrictGridProps = setup?.gridProps ?? defaultGridProps;
	const columnProps: StrictGridColumnProps = setup?.columnProps ?? (setup?.gridProps?.columns ? {} : defaultColumnProps);

	return (
		<React.Fragment>
			<Grid {...gridProps}>
				{pagedData.slice(0, itemsToRender).map(datum => (
					<Grid.Column key={datum.id}
						{...columnProps}
						style={{ cursor: props.handleClick ? 'pointer' : undefined }}
						onClick={(e) => {
							if (e.detail === 2 && props.handleDblClick)
								props.handleDblClick(datum.id);
							else if (props.handleClick)
								props.handleClick(datum.id);
						}}
					>
						{setup?.renderGridColumn && setup.renderGridColumn(datum, selectedIds.has(datum.id))}
						{(!setup || !setup.renderGridColumn) && renderDefaultGridColumn(datum, selectedIds.has(datum.id))}
					</Grid.Column>
				))}
			</Grid>
			{itemsToRender < pagedData.length && (
				<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
					onChange={(inView, _entry) => { if (inView) setPageInView(prevState => prevState + 1); }}
				>
					<Icon loading name='spinner' /> {t('global.loading_ellipses')}
				</InView>
			)}
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
		setPageInView(1);
	}

	function renderDefaultGridColumn(datum: IEssentialData, isSelected: boolean): React.ReactNode {
		return (
			<React.Fragment>
				{isSelected && <Icon name='check' color='blue' />} {datum.name}
			</React.Fragment>
		);
	}
};
