import React from 'react';
import { Table, Input, Pagination, Dropdown, Popup, Icon, Button, Message, Checkbox, DropdownItemProps, SemanticICONS } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { useStateWithStorage } from '../utils/storage';

import SearchString from 'search-string/src/searchString';
import { InitialOptions } from '../model/game-elements';
import { CrewMember } from '../model/crew';
import { PlayerCrew } from '../model/player';
import { translatePseudocolumn } from '../utils/misc';
import { GlobalContext } from '../context/globalcontext';
import CONFIG from './CONFIG';
import { TranslateMethod } from '../model/player';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from './stats/utils';
import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';

export function getFilterTypeOptions(t: TranslateMethod) {
	return [
		{ key: '0', value: 'Exact', text: t('options.text_match.any') },
		{ key: '1', value: 'Whole word', text: t('options.text_match.whole_word') },
		{ key: '2', value: 'Any match', text: t('options.text_match.exact') }
	];
}

const defaultPagingOptions = [
	{ key: '0', value: 10, text: '10' },
	{ key: '1', value: 25, text: '25' },
	{ key: '2', value: 50, text: '50' },
	{ key: '3', value: 100, text: '100' }
] as DropdownItemProps[];

export enum SortDirection {
	Ascending = 'ascending',
	Descending = 'descending'
}

export interface SortConfig {
	field?: string;
	direction?: SortDirection | 'ascending' | 'descending';
}

export interface ITableConfigRow {
	width: number;
	column?: string;
	title: string | React.JSX.Element;
	pseudocolumns?: string[];
	reverse?: boolean;
	tiebreakers?: string[];
	tiebreakers_reverse?: boolean[];
	customCompare?: (a: any, b: any, config: IConfigSortData) => number;
	translatePseudocolumn?: (field: string) => string | React.JSX.Element;
}

export interface SearchableTableProps {
	id?: string;
	data: any[];
	filterRow: (row: any, filter: any, filterType?: string) => boolean;
	config: ITableConfigRow[];
	overflowX?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';

	renderTableRow: (row: any, idx?: number, isActive?: boolean) => React.JSX.Element;

	noSearch?: boolean;
	initOptions?: any;
	tableStyle?: React.CSSProperties;
	explanation?: React.ReactNode;
	hideExplanation?: boolean;
	showFilterOptions?: boolean;
	showPermalink?: boolean;
	lockable?: any[];
	zeroMessage?: (searchFilter: string) => React.JSX.Element;

	toolCaption?: string;
	dropDownChoices?: string[];
	dropDownValue?: string;
	setDropDownValue?: (value?: string) => void;

	extraSearchContent?: React.JSX.Element;

	pagingOptions?: DropdownItemProps[];
	defaultPaginationRows?: number;

	lockTitle?: (obj: any) => string;

	showSortDropdown?: boolean;
};

export const SearchableTable = (props: SearchableTableProps) => {
	let data = [...props.data];
	const { t } = React.useContext(GlobalContext).localized;
	const tableId = props.id ?? '';

	const pagingOptions = props.pagingOptions?.length ? props.pagingOptions : defaultPagingOptions;

	const [searchFilter, setSearchFilter] = useStateWithStorage(tableId + 'searchFilter', '');
	const [filterType, setFilterType] = useStateWithStorage(tableId + 'filterType', 'Any match');
	const [column, setColumn] = useStateWithStorage<string | undefined>(tableId + 'column', undefined);
	const [direction, setDirection] = useStateWithStorage<SortDirection | 'ascending' | 'descending' | undefined>(tableId + 'direction', undefined);
	const [pagination_rows, setPaginationRows] = useStateWithStorage(tableId + 'paginationRows', props.defaultPaginationRows ?? pagingOptions[0].value as number ?? 10, { rememberForever: true });
	const [pagination_page, setPaginationPage] = useStateWithStorage(tableId + 'paginationPage', 1);

	const [activeLock, setActiveLock] = React.useState<PlayerCrew | CrewMember | undefined>(undefined);

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
	function onHeaderClick(newColumn: ITableConfigRow) {
		if (!newColumn.column) return;

		const lastColumn = column, lastDirection = direction;

		const sortConfig: SortConfig = {
			field: newColumn.column,
			direction: lastDirection === 'ascending' ? 'descending' : 'ascending'
		};
		if (newColumn.pseudocolumns && newColumn.pseudocolumns.includes(lastColumn || '')) {
			if (direction === 'descending') {
				const nextIndex = newColumn.pseudocolumns.indexOf(lastColumn || '') + 1; // Will be 0 if previous column was not a pseudocolumn
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

	function renderTableHeader(column: any, direction: 'descending' | 'ascending' | undefined): React.JSX.Element {
		return (
			<Table.Row>
				{props.config.map((cell, idx) => (
					<Table.HeaderCell
						key={idx}
						width={cell.width as any}
						sorted={(((cell.pseudocolumns && cell.pseudocolumns.includes(column)) || (column === cell.column)) ? direction : undefined) ?? undefined}
						onClick={() => onHeaderClick(cell)}
						textAlign={cell.width === 1 ? 'center' : 'left'}
					>
						{cell.title}
						{cell.pseudocolumns?.includes(column) && <>
							<br />
							<small>
								{cell.translatePseudocolumn ? cell.translatePseudocolumn(column) : translatePseudocolumn(column, t)}
							</small>
						</>}
					</Table.HeaderCell>
				))}
			</Table.Row>
		);
	}

	function renderPermalink(): React.JSX.Element {
		// Will not catch custom options (e.g. highlight)
		const params = new URLSearchParams();
		if (searchFilter != '') params.append('search', searchFilter);
		if (filterType != 'Any match') params.append('filter', filterType);
		if (column) params.append('column', column);
		if (direction) params.append('direction', direction);
		if (pagination_rows != 10) params.append('rows', "" + pagination_rows);
		if (pagination_page != 1) params.append('page', "" + pagination_page);
		let permalink = window.location.protocol + '//' + window.location.host + window.location.pathname;
		if (params.toString() != '') permalink += '?' + params.toString();
		return (
			<a href={permalink}>
				<Icon name='linkify' /> Permalink
			</a>
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
	let sortColumn = column ?? '';
	let sortDirection = direction;
	if (!props.config.some(f => f.column === sortColumn) && !props.config.some(c => c.pseudocolumns?.some(c => c === column)))
		sortColumn = "";
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
		const columnConfig = props.config.find(col => col.column === sortColumn || col.pseudocolumns?.includes(sortColumn));
		sortDirection = columnConfig?.reverse ? 'descending' : 'ascending';
	}

	const columnConfig = props.config.find(col => col.column === sortColumn || col.pseudocolumns?.includes(sortColumn));

	const sortConfig: IConfigSortData = {
		field: sortColumn,
		direction: sortDirection,
		keepSortOptions: true,
		customCompare: columnConfig?.customCompare
	};

	// Define tiebreaker rules with names in alphabetical order as default
	//	Hack here to sort rarity in the same direction as max_rarity
	let subsort = [] as SortConfig[];

	if (columnConfig && columnConfig.tiebreakers) {
		subsort = columnConfig.tiebreakers.map((subfield, idx) => {

			let subdirection = subfield.slice(subfield.length - 6) === 'rarity' ? sortDirection : 'ascending';
			if (columnConfig.tiebreakers_reverse && columnConfig.tiebreakers_reverse.length > idx) {
				subdirection = columnConfig.tiebreakers_reverse[idx] ? 'descending' : 'ascending';
			}

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
	if (sortColumn.slice(0, 5) === 'ranks' && sortColumn.slice(0, 12) !== 'ranks.scores') {
		const rank = column?.split('.')[1];
		if (rank) data = data.filter(row => row.ranks[rank] > 0);
	}

	// Filtering
	let filters: SearchString[] = [];
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

	const { toolCaption: caption } = props;
	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
	const rightContent = !!props.extraSearchContent && !!props.showSortDropdown;
	return (
		<div>
			{!props.noSearch && <div style={{
				display: "flex",
				flexDirection: isMobile ? "column" : "row",
				alignItems: isMobile ? "flex-start" : "center",
				justifyContent: isMobile ? "center" : "flex-start",
				gap: isMobile ? '0.5em' : undefined,
				flexWrap: 'wrap'
			}}>

				<Input
					style={{ width: isMobile ? '100%' : (rightContent ? undefined : '50%'), flexGrow: rightContent ? 1 : undefined  }}
					iconPosition="left"
					placeholder={t('global.search_ellipses')}
					value={searchFilter}
					onChange={(e, { value }) => onChangeFilter(value)}>
					<input />
					<Icon name='search' />
					<Button icon onClick={() => onChangeFilter('')} >
						<Icon name='delete' />
					</Button>
				</Input>

				{props.showFilterOptions && (
					<span style={{ paddingLeft: isMobile ? undefined : '2em' }}>
						<Dropdown inline
							options={getFilterTypeOptions(t)}
							value={filterType}
							onChange={(event, { value }) => setFilterType(value as string)}
						/>
					</span>
				)}

				{!props.hideExplanation && <Popup wide trigger={<Icon name="help" />}
					header={'Advanced search'}
					content={props.explanation ? props.explanation : renderDefaultExplanation()}
				/>}

				<div style={{
					display: "flex",
					flexDirection: isMobile ? "column" : "row",
					justifyContent: "flex-end",
					justifySelf: "flex-end",
					alignItems: isMobile ? "flex-start" : "center",
					marginLeft: isMobile ? undefined : '1em',
					gap: isMobile ? '0.25em' : '0.5em',
					flexGrow: 1
				}}>
					{!!props.extraSearchContent && <>{props.extraSearchContent}</>}
					{!!props.showSortDropdown && (
						<>
							<span>
								<SortDropDown
									column={column}
									setColumn={setColumn}
									direction={direction}
									setDirection={setDirection}
									config={props.config}
									pseudoColumn={sortColumn}
									/>
							</span>
							{/* <div style={{margin: "0.5em"}} className="ui text">{caption}</div> */}
						</>
					)}
					{!!caption && !!props.dropDownChoices?.length && (
						<div style={{
							margin: "0.5em",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							alignSelf: "flex-end",
							height: "2em"
						}}>
							<span style={{ paddingLeft: '2em' }}>
								<Dropdown inline
									placeholder={caption}
									options={props.dropDownChoices.map((c) => {
										return {
											content: c,
											value: c,
											text: c
										}
									})}
									value={props.dropDownValue}
									onChange={(event, { value }) => {
										if (props.setDropDownValue) {
											props.setDropDownValue(value as string);
										}
									}}
								/>
							</span>
						</div>
					)}
				</div>
			</div>}

			<div>
				{props.lockable && <LockButtons lockTitle={props.lockTitle} lockable={props.lockable} activeLock={activeLock} setLock={onLockableClick} />}
			</div>

			{filteredCount === 0 && (
				<div style={{ margin: '2em 0' }}>
					{(props.zeroMessage && props.zeroMessage(searchFilter)) || renderDefaultZeroMessage()}
				</div>
			)}

			{filteredCount > 0 && (
				<div className='flipscroll-container' style={{ margin: '1em 0', overflowX: props.overflowX ?? 'auto' }}>
					<Table sortable celled selectable striped collapsing unstackable compact="very" className='flipscroll-table' style={props.tableStyle}>
						<Table.Header>{renderTableHeader(column, direction)}</Table.Header>
						<Table.Body>{data.map((row, idx) => props.renderTableRow(row, idx, isRowActive(row, activeLock)))}</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.HeaderCell colSpan={props.config.length}>
									<div style={{ zIndex: "1000", width: "100%" }}>
										<Pagination
											totalPages={totalPages}
											activePage={activePage}
											onPageChange={(event, { activePage }) => {
												setPaginationPage(activePage as number);
												setActiveLock(undefined);	// Remove lock when changing pages
											}}
										/>
										{pagingOptions.length > 1 && <span style={{ paddingLeft: '2em' }}>
											{t('global.rows_per_page')}:{' '}
											<Dropdown
												inline
												upward
												options={pagingOptions}
												value={pagination_rows}
												onChange={(event, { value }) => {
													setPaginationPage(1);
													setPaginationRows(value as number);
												}}
											/>
										</span>}
										{props.showPermalink && (<span style={{ paddingLeft: '5em' }}>{renderPermalink()}</span>)}
									</div>
								</Table.HeaderCell>
							</Table.Row>
						</Table.Footer>
					</Table>
				</div>
			)}
		</div>
	);
};

type SortDropdownProps = {
	config: ITableConfigRow[]
	direction: SortDirection | 'ascending' | 'descending' | undefined;
	setDirection: (value: SortDirection | 'ascending' | 'descending' | undefined) => void;
	column?: string;
	setColumn: (value?: string) => void;
	pseudoColumn?: string
}

export const SortDropDown = (props: SortDropdownProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { pseudoColumn, config, direction, setDirection, column, setColumn } = props;

	const items = React.useMemo(() => {
		const props = [] as DropdownItemProps[];

		config.forEach((col, i) => {
			let skillText = "";
			if (typeof col.title !== 'string' && col.column?.includes("_skill")) {
				let skill_part = col.column.split(".").find(f => f.endsWith("_skill"))
				if (skill_part) skillText = ` ${CONFIG.SKILLS[skill_part]}`;
			}
			props.push({
				key: `${col.column}_dropdown_column`,
				text: skillText || col.title,
				value: col.column,
				content: (
					<div style={{display: 'flex', gap: '0.5em'}}>
						{col.title}{skillText}
					</div>
				)
			});

			if (col.pseudocolumns) {
				col.pseudocolumns.forEach(pcol => {
					props.push({
						key: `${col.column}_${pcol}_dropdown_pseudocolumn`,
						text: col.translatePseudocolumn ? col.translatePseudocolumn(pcol) : translatePseudocolumn(pcol, t),
						value: pcol,
						content: (
							<div style={{marginLeft: '1em'}}>
								&mdash;&nbsp;{col.translatePseudocolumn ? col.translatePseudocolumn(pcol) : translatePseudocolumn(pcol, t)}
							</div>
						)
					});
				});
			}
		});

		return props;
	}, [config, column, pseudoColumn]);

	const phtext = (() => {
		if (!column && !!pseudoColumn) return translatePseudocolumn(pseudoColumn, t);
		return undefined;
	})();
	return (
		<div style={{ display: 'flex', alignItems: 'center' }}>
			<Dropdown
				style={{marginRight: '0.5em'}}
				clearable
				selection
				placeholder={phtext}
				options={items}
				value={column ? (pseudoColumn || column) : undefined}
				onChange={(e, { value }) => setColumn(value as string | undefined)}
			/>
			<Button
				disabled={!column}
				icon={`sort alphabet ${direction === 'ascending' && column ? 'descending' : 'ascending'}`}
				onClick={reverseDirection}
			/>
		</div>
	)

	function reverseDirection() {
		if (direction === 'descending') {
			setDirection('ascending');
		}
		else {
			setDirection('descending');
		}
	}
}

type LockButtonsProps = {
	lockable: any[];
	activeLock: any;
	setLock: (lock: any) => void;
	lockTitle?: (obj: any) => string;
};

const LockButtons = (props: LockButtonsProps) => {
	const { lockable, activeLock, setLock, lockTitle } = props;

	if (lockable?.length == 0) return (<></>);

	return (
		<div style={{ margin: '.5em 0' }}>
			<span style={{ marginRight: '.5em' }}>Lock view on:</span>
			{lockable.map((lock, lockNum) => (
				<Button key={lockNum} compact toggle active={JSON.stringify(lock) === JSON.stringify(activeLock)} onClick={() => handleClick(lock)}>
					{lockTitle ? lockTitle(lock) : lock.name}
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
export const initSearchableOptions = (location: any, search?: string) => {
	let initOptions: InitialOptions | undefined = undefined;
	const OPTIONS = ['search', 'filter', 'column', 'direction', 'rows', 'page'];

	const urlParams = search ? new URLSearchParams("?search=" + search) : (location.search ? new URLSearchParams(location.search) : undefined);
	const linkState = location.state;

	for (let option of OPTIONS) {
		let value: string | undefined = undefined;
		// Always use URL parameters if found
		if (urlParams?.has(option)) value = urlParams.get(option) ?? undefined;
		// Otherwise check <Link state>
		if (!value && linkState && linkState[option]) value = structuredClone(linkState[option]);
		if (value) {
			if (!initOptions) initOptions = {};
			initOptions[option] = value;
		}
	}

	return initOptions;
};

// Check for other initial option from URL or <Link state> by custom name
export function initCustomOption<T>(location: any, option: string, defaultValue: T) {
	let value: string | string[] | undefined = undefined;
	// Always use URL parameters if found
	if (location?.search) {
		const urlParams = new URLSearchParams(location.search);
		if (urlParams.has(option)) value = (Array.isArray(defaultValue) ? urlParams.getAll(option) : urlParams.get(option)) ?? undefined;
	}
	// Otherwise check <Link state>
	if (!value && location?.state) {
		const linkState = location.state;
		if (linkState[option]) value = structuredClone(linkState[option]);
	}
	return (value ?? defaultValue) as T;
};

export const prettyCrewColumnTitle = (column: string) => {
	const lang = (text: string) => {
		let skills = text.split(" / ")
		let output = [] as string[];
		for (let skill of skills) {
			let i1 = CONFIG.SKILLS_SHORT_ENGLISH.findIndex(f => f.short === skill);
			if (i1 >= 0) {
				output.push(CONFIG.SKILLS_SHORT[i1].short);
			}
		}
		return output.join(" / ");
	}
	if (column.slice(0, 6) == 'ranks.') {
		let title = column.replace('ranks.', '');
		if (title.slice(-4) == 'Rank') {
			title = title.replace('Rank', '');
			title = title.slice(0, 1).toUpperCase() + title.slice(1);
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
					{score}<br />{lang(skills)}
				</span>
			);
		}
		return title;
	}
	return column;
};

function renderDefaultZeroMessage(): React.JSX.Element {
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<Message icon>
			<Icon name='search' />
			<Message.Content>
				<Message.Header>{t('crew_picker.no_results_parts.title')}</Message.Header>
				{t('crew_picker.no_results_parts.message')}
			</Message.Content>
		</Message>
	);
}

function renderDefaultExplanation(): React.JSX.Element {
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
				Search for all crew that match a whole or partial skill order:
			</p>
			<p>
				<code>skill_order:CMD or skill_order:CMD/SCI or skill_order:CMD/SCI/SEC</code>
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