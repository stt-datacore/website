import React from 'react';
import { InView } from 'react-intersection-observer';
import {
	Grid,
	Icon,
	StrictGridProps
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { IDataGridSetup, IDataSortField, IEssentialData } from './model';
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
};

export const DataGrid = (props: DataGridProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { setup } = props;

	// Persist sort preference
	const [sortField, setSortField] = useStateWithStorage<IDataSortField>(`${props.id}/sortField`, setup?.defaultSort ?? defaultSort);
	const [sortDirection, setSortDirection] = useStateWithStorage<'ascending' | 'descending'>(`${props.id}/sortDirection`, setup?.defaultSort?.firstSort ?? 'ascending');

	// Reset pagination on each reload
	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	const selectedIds: Set<number> = props.selectedIds ?? new Set<number>();

	const data = React.useMemo<IEssentialData[]>(() => {
		const data: IEssentialData[] = props.data.slice();
		dataFieldSort(data, sortField, sortDirection);
		setPaginationPage(1);
		return data;
	}, [props.data, sortField, sortDirection]);

	// Pagination
	const itemsPerPage = 24, itemsToShow = itemsPerPage * paginationPage;

	// No results found. Please try different search options.
	if (data.length === 0)
		return <>{t('global.no_search_results_found')}</>;

	const defaultGridProps: StrictGridProps = {
		columns: 4,
		doubling: true,
		textAlign: 'center'
	};

	const gridProps: StrictGridProps = setup?.gridProps ?? defaultGridProps;

	return (
		<React.Fragment>
			<Grid {...gridProps}>
				{data.slice(0, itemsToShow).map(datum => (
					<Grid.Column key={datum.id}
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
			{itemsToShow < data.length && (
				<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
					onChange={(inView, _entry) => { if (inView) setPaginationPage(prevState => prevState + 1); }}
				>
					<Icon loading name='spinner' /> {t('global.loading_ellipses')}
				</InView>
			)}
		</React.Fragment>
	);

	function renderDefaultGridColumn(datum: IEssentialData, isSelected: boolean): JSX.Element {
		return (
			<React.Fragment>
				{isSelected && <Icon name='check' color='blue' />} {datum.name}
			</React.Fragment>
		);
	}
};
