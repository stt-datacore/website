import React from 'react';
import { Table, Input, Pagination, Dropdown, Popup, Icon, Button, Message } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';
import { Link } from 'gatsby';

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
	reverse?: boolean;
	tiebreakers?: string[];
}

type SearchableTableProps = {
	id?: string;
	data: any[];
	explanation?: React.ReactNode;
	config: ITableConfigRow[];
	renderTableRow: (row: any, idx?: number, isActive?: boolean) => JSX.Element;
	filterRow: (row: any, filter: any, filterType?: string) => boolean;
	initOptions?: any;
    showFilterOptions: boolean;
	showPermalink: boolean;
	lockable?: any[];
	zeroMessage?: (searchFilter: string) => JSX.Element;
};

export const SearchableTable = (props: SearchableTableProps) => {
	let data = [...props.data];
	const tableId = props.id ?? '';

	const [searchFilter, setSearchFilter] = useStateWithStorage(tableId+'searchFilter', '');
	const [filterType, setFilterType] = useStateWithStorage(tableId+'filterType', 'Any match');
	const [column, setColumn] = useStateWithStorage(tableId+'column', undefined);
	const [direction, setDirection] = useStateWithStorage(tableId+'direction', undefined);
	const [pagination_rows, setPaginationRows] = useStateWithStorage(tableId+'paginationRows', 10);
	const [pagination_page, setPaginationPage] = useStateWithStorage(tableId+'paginationPage', 1);

	const [activeLock, setActiveLock] = React.useState(undefined);

	// Override stored values with custom initial options and reset all others to defaults
	//	Previously stored values will be rendered before an override triggers a re-render
	React.useEffect(() => {
		if (props.initOptions) {
			setSearchFilter(props.initOptions['search'] ?? '');
			setFilterType(props.initOptions['filter'] ?? 'Any match');
			setColumn(props.initOptions['column'] ?? undefined);
			setDirection(props.initOptions['direction'] ?? undefined);
			setPaginationRows(props.initOptions['rows'] ?? 10);
			setPaginationPage(props.initOptions['page'] ?? 1);
		}
	}, [props.initOptions]);

	// Activate lock by default if only 1 lockable
	React.useEffect(() => {
		setActiveLock(props.lockable?.length === 1 ? props.lockable[0] : undefined);
	}, [props.lockable]);

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
						{cell.title}{cell.pseudocolumns?.includes(column) && <><br/><small>{column.replace('_',' ').replace('.length', '')}</small></>}
					</Table.HeaderCell>
				))}
			</Table.Row>
		);
	}

	function renderPermalink(): JSX.Element {
		// Will not catch custom options (e.g. highlight)
		const params = new URLSearchParams();
		if (searchFilter != '') params.append('search', searchFilter);
		if (filterType != 'Any match') params.append('filter', filterType);
		if (column) params.append('column', column);
		if (direction) params.append('direction', direction);
		if (pagination_rows != 10) params.append('rows', pagination_rows);
		if (pagination_page != 1) params.append('page', pagination_page);
		let permalink = window.location.protocol + '//' + window.location.host + window.location.pathname;
		if (params.toString() != '') permalink += '?' + params.toString();
		return (
			<Link to={permalink}>
				<Icon name='linkify' /> Permalink
			</Link>
		);
	}

	function onLockableClick(lock: any): void {
		if (lock) {
			setActiveLock(lock);
		}
		else {
			setActiveLock(undefined);
			// Remember active page after removing lock
			setPaginationPage(activePage);
		}
	}

	function isRowActive(row: any, highlight: any): boolean {
		if (!highlight) return false;
		let isMatch = true;
		Object.keys(highlight).forEach(key => {
			if (row[key] !== highlight[key]) isMatch = false;
		});
		return isMatch;
	}

	// Sorting
	let sortColumn = column;
	let sortDirection = direction;
	// If no column set, use date_added as default column when available
	if (!sortColumn) {
		if (data.length > 0 && data[0].date_added) {
			sortColumn = 'date_added';
			sortDirection = 'descending';
		}
		else {
			sortColumn = 'name';
			sortDirection = 'ascending';
		}
	}
	// If no direction set, determine direction from tableConfig when possible
	if (!sortDirection) {
		const columnConfig = props.config.find(col => col.column === sortColumn);
		sortDirection = columnConfig?.reverse ? 'descending' : 'ascending';
	}
	const sortConfig: IConfigSortData = {
		field: sortColumn,
		direction: sortDirection,
		keepSortOptions: true
	};

	// Define tiebreaker rules with names in alphabetical order as default
	//	Hack here to sort rarity in the same direction as max_rarity
	let subsort = [];
	const columnConfig = props.config.find(col => col.column === sortColumn);
	if (columnConfig && columnConfig.tiebreakers) {
		subsort = columnConfig.tiebreakers.map(subfield => {
			const subdirection = subfield.substr(subfield.length-6) === 'rarity' ? sortDirection : 'ascending';
			return { field: subfield, direction: subdirection };
		});
	}
	if (column !== 'name') subsort.push({ field: 'name', direction: 'ascending' });
	sortConfig.subsort = subsort;

	// Use original dataset for sorting
	const sorted: IResultSortDataBy = sortDataBy([...props.data], sortConfig);
	data = sorted.result;

	// Sorting by pre-calculated ranks should filter out crew without matching skills
	//	Otherwise crew without skills show up first (because 0 comes before 1)
	if (sortColumn.substr(0, 5) === 'ranks') {
		const rank = column.split('.')[1];
		data = data.filter(row => row.ranks[rank] > 0);
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
	const filteredCount = data.length;

	// Pagination
	let activePage = pagination_page;
	if (activeLock) {
		const index = data.findIndex(row => isRowActive(row, activeLock));
		// Locked crew is not viewable in current filter
		if (index < 0) {
			setActiveLock(undefined);
			return (<></>);
		}
		activePage = Math.floor(index / pagination_rows) + 1;
	}
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

			{props.lockable && <LockButtons lockable={props.lockable} activeLock={activeLock} setLock={onLockableClick} />}

			{filteredCount === 0 && (
				<div style={{ margin: '2em 0' }}>
					{(props.zeroMessage && props.zeroMessage(searchFilter)) || renderDefaultZeroMessage()}
				</div>
			)}

			{filteredCount > 0 && (
				<Table sortable celled selectable striped collapsing unstackable compact="very">
					<Table.Header>{renderTableHeader(column, direction)}</Table.Header>
					<Table.Body>{data.map((row, idx) => props.renderTableRow(row, idx, isRowActive(row, activeLock)))}</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.HeaderCell colSpan={props.config.length}>
								<Pagination
									totalPages={totalPages}
									activePage={activePage}
									onPageChange={(event, { activePage }) => {
										setPaginationPage(activePage as number);
										setActiveLock(undefined);	// Remove lock when changing pages
									}}
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
								{props.showPermalink && (<span style={{ paddingLeft: '5em'}}>{renderPermalink()}</span>)}
							</Table.HeaderCell>
						</Table.Row>
					</Table.Footer>
				</Table>
			)}
		</div>
	);
};

type LockButtonsProps = {
	lockable: any[];
	activeLock: any;
	setLock: (lock: any) => void;
};

const LockButtons = (props: LockButtonsProps) => {
	const { lockable, activeLock, setLock } = props;

	if (lockable?.length == 0) return (<></>);

	return (
		<div style={{ margin: '.5em 0' }}>
			<span style={{ marginRight: '.5em' }}>Lock view on:</span>
			{lockable.map((lock, lockNum) => (
				<Button key={lockNum} compact toggle active={JSON.stringify(lock) === JSON.stringify(activeLock)} onClick={() => handleClick(lock)}>
					{lock.name}
				</Button>
			))}
		</div>
	);

	function handleClick(lock: any): void {
		const isActive = JSON.stringify(lock) === JSON.stringify(activeLock);
		setLock(isActive ? undefined : lock);
	}
};

// Check for custom initial table options from URL or <Link state>
export const initSearchableOptions = (location: any) => {
	let initOptions = false;
	const OPTIONS = ['search', 'filter', 'column', 'direction', 'rows', 'page'];

	const urlParams = location.search ? new URLSearchParams(location.search) : undefined;
	const linkState = location.state;

	OPTIONS.forEach((option) => {
		let value = undefined;
		// Always use URL parameters if found
		if (urlParams?.has(option)) value = urlParams.get(option);
		// Otherwise check <Link state>
		if (!value && linkState && linkState[option]) value = JSON.parse(JSON.stringify(linkState[option]));
		if (value) {
			if (!initOptions) initOptions = {};
			initOptions[option] = value;
		}
	});

	return initOptions;
};

// Check for other initial option from URL or <Link state> by custom name
export const initCustomOption = (location: any, option: string, defaultValue: any) => {
	let value = undefined;
	// Always use URL parameters if found
	if (location?.search) {
		const urlParams = new URLSearchParams(location.search);
		if (urlParams.has(option)) value = Array.isArray(defaultValue) ? urlParams.getAll(option) : urlParams.get(option);
	}
	// Otherwise check <Link state>
	if (!value && location?.state) {
		const linkState = location.state;
		if (linkState[option]) value = JSON.parse(JSON.stringify(linkState[option]));
	}
	return value ?? defaultValue;
};

export const prettyCrewColumnTitle = (column: string) => {
	if (column.substr(0, 6) == 'ranks.') {
		let title = column.replace('ranks.', '');
		if (title.substr(-4) == 'Rank') {
			title = title.replace('Rank', '');
			title = title.substr(0, 1).toUpperCase() + title.substr(1);
			return title;
		}
		else {
			const vars = title.split('_');
			let score = vars.shift();
			switch (score) {
				case 'G': score = 'Gauntlet'; break;
				case 'V': score = 'Voyage'; break;
			}
			const skills = vars.reduce((prev, curr) => prev != '' ? prev + ' / ' + curr : curr, '');
			return (
				<span style={{ fontSize: '.95em' }}>
					{score}<br/>{skills}
				</span>
			);
		}
		return title;
	}
	return column;
};

function renderDefaultZeroMessage(): JSX.Element {
	return (
		<Message icon>
			<Icon name='search' />
			<Message.Content>
				<Message.Header>0 results found</Message.Header>
				Please try different search options.
			</Message.Content>
		</Message>
	);
}

function renderDefaultExplanation(): JSX.Element {
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