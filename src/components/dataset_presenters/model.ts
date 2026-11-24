import {
	StrictGridColumnProps,
	StrictGridProps,
	StrictTableProps
} from 'semantic-ui-react';

export type TSortDirection = 'ascending' | 'descending';

export interface IEssentialData {
	id: number;
	name: string;
};

export interface IEssentialMatrixData extends IEssentialData {
	rowId: string;
	columnId: string;
};

export interface IDataGridSetup {
	gridProps?: StrictGridProps;
	columnProps?: StrictGridColumnProps;
	renderGridColumn?: (datum: IEssentialData, isSelected: boolean) => React.ReactNode;
	defaultSort?: IDataSortField;
	/** The number of items per page. If undefined, grid will not be paginated */
	itemsPerPage?: number;
	/** The number of items that are rendered in view at a time */
	itemsInView?: number;
};

export interface IDataTableSetup {
	tableProps?: StrictTableProps;
	columns: IDataTableColumn[];
	rowsPerPage?: number;
	defaultSort?: IDataSortField;
};

export interface IDataTableColumn {
	id: string;
	title: string | React.ReactNode;
	/** A short phrase that adds more context to the column. Subtitles appear all uppercase in a line below the title in the column header */
	subtitle?: string;
	align?: 'left' | 'right' | 'center';
	sortField?: IDataSortField;
	/** Adds classes to TableHeaderCells AND TableCells (e.g. sticky, desktop, mobile). If custom classes are only needed on TableCell, use renderComplexCell */
	className?: string;
	/** Render table cell contents. If renderCell and renderComplexCell are undefined, table will try to render datum[column.id] */
	renderCell?: (datum: IEssentialData, isSelected: boolean) => React.ReactNode;
	/** Render complex table cells (TableCell AND cell contents). Use to customize TableCell classes and/or styles */
	renderComplexCell?: (datum: IEssentialData, isSelected: boolean) => React.ReactNode;
	/** Rules for exporting the column. Set to [] to disable exporting. If exports is undefined, exporter will try to export datum[column.id] */
	exports?: IDataTableColumnExport[];
};

export interface IDataTableColumnExport {
	/** Title to use for column in export header; otherwise defaults to column.title */
	title?: string;
	/** Field name of the data to export (i.e. datum[dataField]); otherwise defaults to column.id */
	dataField?: string;
	/** Generate a special value to export. Useful when the dataField value is otherwise complex */
	customExport?: (datum: IEssentialData) => string;
};

export interface IDataMatrixSetup {
	tableProps?: StrictTableProps;
	rows: IDataMatrixField[];
	columns: IDataMatrixField[];
	renderCell?: (datum: IEssentialMatrixData, isSelected: boolean) => React.ReactNode;
	permutate?: boolean;	// Allow combos to be shown in permutation
};

export interface IDataMatrixField {
	id: string;
	title: string | React.ReactNode;
	align?: 'left' | 'right' | 'center';
};

export interface IDataSortField {
	id: string;
	/** Title to use in sortable field options; otherwise defaults to column.title (when column is available) */
	title?: string;
	firstSort?: TSortDirection;
	stringValue?: boolean;
	customSort?: (a: IEssentialData, b: IEssentialData, sortDirection: TSortDirection) => number;
	/** TODO: Deprecate override in favor of using controlled sorts */
	immediateOverride?: boolean;
	/** If true, will treat undefined data as 0 (or as empty string); otherwise undefined data will ALWAYS be listed AFTER sorted defined data */
	defaultToZero?: boolean;
};

export interface IDataPickerState {
	data: IEssentialData[];
	pendingSelectedIds: Set<number>;
	setPendingSelectedIds: (pendingSelectedIds: Set<number>) => void;
	searchQuery: string;
	setSearchQuery: (searchQuery: string) => void;
	showOptions: boolean;
	setShowOptions: (showOptions: boolean) => void;
	layout: 'grid' | 'table';
	setLayout: (layout: 'grid' | 'table') => void;
};

/** When controlled sort is defined, parent will handle sorting rather than data presenter itself */
export interface IControlledSort {
	sortField: IDataSortField;
	sortDirection: TSortDirection;
	onSortRequest?: (sortField: IDataSortField, sortDirection: TSortDirection) => void;
};

/** When controlled pagination is defined, parent will handle pagination rather than data presenter itself */
export interface IControlledPagination {
	totalPages: number;
	activePage: number;
	onPageChange?: (activePage: number) => void;
};
