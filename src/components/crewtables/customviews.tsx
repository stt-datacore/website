import React from "react";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";

/**
 * Crew View Filter Panes to be enabled.
 *
 * These values can be OR'd together.
 *
 * Any false-y value will activate all available panes.
 */
export enum CrewFilterPanes {

	/** Show all Panes */
	All = 0,

	/** Show base stats */
	BaseStats = 1,

	/** Show ship stats */
	ShipStats = 2,

	/** Reserved (not currently used) */
	Reserved = 4,

	/** Show caller-provided custom filter content */
	CustomFilters = 8
}

export interface CrewTableCustomFilter {
	filterComponent: (typeof CustomFilterComponentBase<PlayerCrew | CrewMember, CustomFilterProps<PlayerCrew | CrewMember>>);
	customColumns?: ITableConfigRow[];
	title: string;
}

export interface FilterItemMethodConfig<T> {
	index: number,
	filterItem: (value: T) => boolean
}

export interface CustomFilterProps<T> {
	index: number;
	setFilterItemMethod: (props: FilterItemMethodConfig<T>) => void;
}

export abstract class CustomFilterComponentBase<TItem, TProps extends CustomFilterProps<TItem>> extends React.Component<TProps> {
	static title: string;

	constructor(props: TProps) {
		super(props);

		const { setFilterItemMethod, index: key } = this.props;
		setFilterItemMethod({ index: key, filterItem: this.filterItem });
	}

	protected abstract filterItem(item: TItem): boolean;
}


export interface SearchableViewProps<T> {
	id?: string;
	data: T[];
	filterRow: (row: T, filter: any, filterType?: string) => boolean;
	overflowX?: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';

    initOptions?: any;
	explanation?: React.ReactNode;
    showFilterOptions?: boolean;
	showPermalink?: boolean;
	lockable?: any[];
	zeroMessage?: (searchFilter: string) => React.JSX.Element;

	toolCaption?: string;

	checkableValue?: boolean;
	checkableEnabled?: boolean;
	setCheckableValue?: (value?: boolean) => void;

	dropDownChoices?: string[];
	dropDownValue?: string;
	setDropDownValue?: (value?: string) => void;
};

export type FilterType = '' | 'Exact' | 'Whole word' | 'Any match';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

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
}

export interface SearchableViewState<T> {

        searchFilter: string;
        filterType: FilterType;
        column?: string;
        direction?: SortDirection;
        pagination_rows: number;
        pagination_page: number;

	// const [searchFilter, setSearchFilter] = useStateWithStorage(tableId+'searchFilter', '');
	// const [filterType, setFilterType] = useStateWithStorage(tableId+'filterType', 'Any match');
	// const [column, setColumn] = useStateWithStorage<string | undefined>(tableId+'column', undefined);
	// const [direction, setDirection] = useStateWithStorage<SortDirection | 'ascending' | 'descending' | undefined>(tableId+'direction', undefined);
	// const [pagination_rows, setPaginationRows] = useStateWithStorage(tableId+'paginationRows', 10);
	// const [pagination_page, setPaginationPage] = useStateWithStorage(tableId+'paginationPage', 1);
}

export class CustomSearchableViewBase<TItem, TProps extends SearchableViewProps<TItem>, TState extends SearchableViewState<TItem>> extends React.Component<TProps, TState> {

    constructor(props: TProps){
        super(props);

        this.state = {
            searchFilter: '',
            filterType: '',
            pagination_rows: 10,
            pagination_page: 1
        } as TState;
    }

	protected createStateAccessors<T>(name: string): [T, (value: T) => void] { return [
		this.state[name],
		(value: T) => this.setState((prevState) => { prevState[name] = value; return prevState; })
	] };





}





