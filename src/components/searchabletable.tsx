import React from 'react';
import { Table, Input, Pagination, Dropdown, Popup, Icon, Button } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { useStateWithStorage } from '../utils/storage';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';

const filterTypeOptions = [
    { key : '0', value : 'Exact', text : 'Exact match only' },
    { key : '1', value : 'Whole word', text : 'Whole word only' },
    { key : '2', value : 'Any match', text : 'Match any text' }
];

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

export interface ITableConfigRow {
	width: number;
	column: string;
	title: string | JSX.Element;
	pseudocolumns?: string[];
}

type SearchableTableProps = {
	id?: string;
	data: any[];
	explanation?: React.ReactNode;
	config: ITableConfigRow[];
	renderTableRow: (row: any, idx?: number) => JSX.Element;
	filterRow: (crew: any, filter: any, filterType?: string) => boolean;
	initOptions?: any;
    showFilterOptions: boolean;
};

export const SearchableTable = (props: SearchableTableProps) => {
	let data = [...props.data];
	const tableId = props.id ?? '';

	const hasDate = data.length > 0 && data[0].date_added;
	const defaultSort = {
		column: data.length > 0 && hasDate ? 'date_added' : 'name',
		direction: data.length > 0 && hasDate ? 'descending' : 'ascending'
	};

	const [searchFilter, setSearchFilter] = useStateWithStorage(tableId+'searchFilter', '');
	const [filterType, setFilterType] = useStateWithStorage(tableId+'filterType', 'Any match');
	const [column, setColumn] = useStateWithStorage(tableId+'column', defaultSort.column);
	const [direction, setDirection] = useStateWithStorage(tableId+'direction', defaultSort.direction);
	const [pagination_rows, setPaginationRows] = useStateWithStorage(tableId+'paginationRows', 10);
	const [pagination_page, setPaginationPage] = useStateWithStorage(tableId+'paginationPage', 1);

	// Override stored values with custom initial options and reset all others to defaults
	//	Previously stored values will be rendered before an override triggers a re-render
	React.useEffect(() => {
		if (props.initOptions) {
			setSearchFilter(props.initOptions['searchFilter'] ?? '');
			setFilterType(props.initOptions['filterType'] ?? 'Any match');
			setColumn(props.initOptions['column'] ?? defaultSort.column);
			setDirection(props.initOptions['direction'] ?? defaultSort.direction);
			setPaginationRows(props.initOptions['paginationRows'] ?? 10);
			setPaginationPage(props.initOptions['paginationPage'] ?? 1);
		}
	}, [props.initOptions]);

	// Update column and/or toggle direction, and store new values in state
	//	Actual sorting of full dataset will occur on next render before filtering and pagination
	function onHeaderClick(newColumn) {
		if (!newColumn.column) return;

		const lastColumn = column, lastDirection = direction;

		const sortConfig = {
			field: newColumn.column,
			direction: lastDirection === 'ascending' ? 'descending' : 'ascending'
		};
		if (newColumn.pseudocolumns && newColumn.pseudocolumns.includes(lastColumn)) {
			if (direction === 'descending') {
				const nextIndex = newColumn.pseudocolumns.indexOf(lastColumn) + 1; // Will be 0 if previous column was not a pseudocolumn
				sortConfig.field = newColumn.pseudocolumns[nextIndex === newColumn.pseudocolumns.length ? 0 : nextIndex];
				sortConfig.direction = 'ascending';
			}
			else {
				sortConfig.field = lastColumn;
				sortConfig.direction = 'descending';
			}
		}
		else if (newColumn.column !== lastColumn) {
			sortConfig.direction = newColumn.reverse ? 'descending' : 'ascending';
		}

		setColumn(sortConfig.field);
		setDirection(sortConfig.direction);
		setPaginationPage(1);
	}

	function onChangeFilter(value) {
		setSearchFilter(value);
		setPaginationPage(1);
	}

	function renderTableHeader(column: any, direction: 'descending' | 'ascending' | null): JSX.Element {
		return (
			<Table.Row>
				{props.config.map((cell, idx) => (
					<Table.HeaderCell
						key={idx}
						width={cell.width as any}
						sorted={((cell.pseudocolumns && cell.pseudocolumns.includes(column)) || (column === cell.column)) ? direction : null}
						onClick={() => onHeaderClick(cell)}
						textAlign={cell.width === 1 ? 'center' : 'left'}
					>
						{cell.title}{cell.pseudocolumns?.includes(column) && <><br/><small>{column.replace('_',' ')}</small></>}
					</Table.HeaderCell>
				))}
			</Table.Row>
		);
	}

	// Sorting
	if (column) {
		const sortConfig: IConfigSortData = {
			field: column,
			direction: direction,
			keepSortOptions: true
		};

		// Define tiebreaker rules with names in alphabetical order as default
		//	Hack here to sort rarity in the same direction as max_rarity
		let subsort = [];
		const columnConfig = props.config.find(col => col.column === column);
		if (columnConfig && columnConfig.tiebreakers) {
			subsort = columnConfig.tiebreakers.map(subfield => {
				const subdirection = subfield.substr(subfield.length-6) === 'rarity' ? direction : 'ascending';
				return { field: subfield, direction: subdirection };
			});
		}
		if (column != 'name') subsort.push({ field: 'name', direction: 'ascending' });
		sortConfig.subsort = subsort;

		// Use original dataset for sorting
		const sorted: IResultSortDataBy = sortDataBy([...props.data], sortConfig);
		data = sorted.result;
	}

	// Filtering
	let filters = [];
	if (searchFilter) {
		let grouped = searchFilter.split(/\s+OR\s+/i);
		grouped.forEach(group => {
			filters.push(SearchString.parse(group));
		});
	}
	data = data.filter(row => props.filterRow(row, filters, filterType));

	// Pagination
	let activePage = pagination_page;
	let totalPages = Math.ceil(data.length / pagination_rows);
	if (activePage > totalPages) activePage = totalPages;
	data = data.slice(pagination_rows * (activePage - 1), pagination_rows * activePage);

	return (
		<div>
			<Input
				style={{ width: isMobile ? '100%' : '50%' }}
				iconPosition="left"
				placeholder="Search..."
				value={searchFilter}
				onChange={(e, { value }) => onChangeFilter(value)}>
					<input />
					<Icon name='search' />
					<Button icon onClick={() => onChangeFilter('')} >
						<Icon name='delete' />
					</Button>
			</Input>

			{props.showFilterOptions && (
				<span style={{ paddingLeft: '2em' }}>
					<Dropdown inline
								options={filterTypeOptions}
								value={filterType}
								onChange={(event, {value}) => setFilterType(value as number)}
					/>
				</span>
			)}

			<Popup wide trigger={<Icon name="help" />}
				header={'Advanced search'}
				content={props.explanation ? props.explanation : renderDefaultExplanation()}
			/>

			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>{renderTableHeader(column, direction)}</Table.Header>
				<Table.Body>{data.map((row, idx) => props.renderTableRow(row, idx))}</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={props.config.length}>
							<Pagination
								totalPages={totalPages}
								activePage={activePage}
								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
							/>
							<span style={{ paddingLeft: '2em'}}>
								Rows per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={pagination_rows}
									onChange={(event, {value}) => {
										setPaginationPage(1);
										setPaginationRows(value as number);
									}}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</div>
	);
}

function renderDefaultExplanation() {
	return (
		<div>
			<p>
				Search for crew by name or trait (with optional '-' for exclusion). For example, this returns all Rikers
				that are not romantic:
			</p>
			<p>
				<code>riker -romantic</code>
			</p>

			<p>
				Search for multiple crew by separating terms with <b>OR</b>. This returns any Tuvok or T'Pol:
			</p>
			<p>
				<code>tuvok OR tpol</code>
			</p>

			<p>
				Specify <b>name</b>, <b>trait</b>, <b>rarity</b> or <b>skill</b> fields for more advanced searches. This
				returns all female crew of rarity 4 or 5 with science skill and the Q Continuum trait:
			</p>
			<p>
				<code>trait:female rarity:4,5 skill:sci trait:"q continuum"</code>
			</p>

			<p>
				Search for all crew that are in the game portal (<b>true</b>) or not (any other value):
			</p>
			<p>
				<code>in_portal:true</code>
			</p>
		</div>
	);
}
