import React, { PureComponent } from 'react';
import { Table, Input, Pagination, Dropdown, Popup, Icon, Button } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

export interface ITableConfigRow {
	width: number;
	column: string;
	title: string;
	pseudocolumns?: string[];
}

type SearchableTableProps = {
	data: any[];
	explanation: React.ReactNode;
	config: ITableConfigRow[];
	renderTableRow: (row: any) => JSX.Element;
	filterRow: (crew: any, filter: any) => boolean;
    searchExt: React.ReactNode;
};

type SearchableTableState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	pagination_rows: number;
	pagination_page: number;
};

export class SearchableTable extends PureComponent<SearchableTableProps, SearchableTableState> {
	constructor(props) {
		super(props);
		
		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: this.props.data
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('search')) {
			// Push the search string to localstorage for back button to behave as expected
			localForage.setItem<string>(window.location.pathname + 'searchFilter', urlParams.get('search'));
			this.setState({ searchFilter: urlParams.get('search') });
		} else {
			localForage.getItem<string>(window.location.pathname + 'searchFilter', (err, value) => {
				if (err) {
					console.error(err);
				} else {
					this.setState({ searchFilter: value });
				}
			});
		}
	}

	_handleSort(clickedColumn, pseudocolumns) {
		const { column, direction } = this.state;
		let { data } = this.state;

		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction: direction
		};

		if(pseudocolumns) {
			if(pseudocolumns.includes(column)) {
				sortConfig.field = column;
			} else {
				sortConfig.direction = null;
			}
			sortConfig.rotateFields = pseudocolumns;
		} else {
			if(clickedColumn !== column) {
				// sort rarity and skills descending first by default
				sortConfig.direction = 'ascending';
			}
		}

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		this.setState({
			column: sorted.field,
			direction: sorted.direction,
			pagination_page: 1,
			data: sorted.result
		});
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_onChangeFilter(value) {
		localForage.setItem<string>(window.location.pathname + 'searchFilter', value);
		this.setState({ searchFilter: value, pagination_page: 1 });
	}

	renderTableHeader(column: any, direction: 'descending' | 'ascending' | null): JSX.Element {
		return (
			<Table.Row>
				{this.props.config.map((cell, idx) => (
					<Table.HeaderCell
						key={idx}
						width={cell.width as any}
						sorted={((cell.pseudocolumns && cell.pseudocolumns.includes(column)) || (column === cell.column)) ? direction : null}
						onClick={() => this._handleSort(cell.column, cell.pseudocolumns)}
					>
						{cell.title}{cell.pseudocolumns?.includes(column) && <><br/><small>{column}</small></>}
					</Table.HeaderCell>
				))}
			</Table.Row>
		);
	}

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		if (this.state.searchFilter) {
			let filters = [];
			let grouped = this.state.searchFilter.split(/\s+OR\s+/i);
			grouped.forEach(group => {
				filters.push(SearchString.parse(group));
			});
			data = data.filter(row => this.props.filterRow(row, filters));
		}

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);
		return (
			<div>
				<Input
					style={{ width: isMobile ? '100%' : '50%' }}
					iconPosition="left"
					placeholder="Search..."
					value={this.state.searchFilter}
					onChange={(e, { value }) => this._onChangeFilter(value)}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => this._onChangeFilter('')} >
							<Icon name='delete' />
						</Button>
				</Input>

				{this.props.searchExt}
				<Popup wide trigger={<Icon name="help" />} header={'Advanced search'} content={this.props.explanation} />
				
				<Table sortable celled selectable striped collapsing unstackable compact="very">
					<Table.Header>{this.renderTableHeader(column, direction)}</Table.Header>
					<Table.Body>{data.map(row => this.props.renderTableRow(row))}</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.HeaderCell colSpan={this.props.config.length}>
								<Pagination
									totalPages={totalPages}
									activePage={pagination_page}
									onPageChange={(event, { activePage }) => this._onChangePage(activePage)}
								/>
								<span style={{ paddingLeft: '2em'}}>
									Rows per page:{' '}
									<Dropdown
										inline
										options={pagingOptions}
										value={pagination_rows}
										onChange={(event, { value }) =>
											this.setState({ pagination_page: 1, pagination_rows: value as number })
										}
									/>
								</span>
							</Table.HeaderCell>
						</Table.Row>
					</Table.Footer>
				</Table>
			</div>
		);
	}
}
