import React, { PureComponent } from 'react';
import { Table, Input, Pagination, Dropdown, Popup, Icon, Button } from 'semantic-ui-react';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';
import { CrewSearchBar } from '../components/crewsearchbar';

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
	data: any[];
	pagination_rows: number;
	pagination_page: number;
    searchBar: CrewSearchBar;
};

export class SearchableTable extends Component<SearchableTableProps, SearchableTableState> {
	constructor(props) {
		super(props);
		
		this.state = {
			column: null,
			direction: null,
			pagination_rows: 10,
			pagination_page: 1,
			data: this.props.data
		};
	}

	_handleSort(clickedColumn, pseudocolumns) {
		const { column, direction } = this.state;
		let { data } = this.state;

		const compare = (a, b) => (a > b ? 1 : b > a ? -1 : 0);

		if (pseudocolumns) {
			if (pseudocolumns.includes(column) && direction === 'ascending') {
				this.setState({
					direction: 'descending',
					pagination_page: 1,
					data: data.reverse()
				});
			} else {
				const nextIndex = pseudocolumns.indexOf(column) + 1; // Will be 0 if previous column was not a pseudocolumn
				const nextColumnIndex = nextIndex === pseudocolumns.length ? 0 : nextIndex;
				const newColumn = pseudocolumns[nextColumnIndex];
				const sortedData = data.sort((a, b) => compare(a[newColumn], b[newColumn]));
				this.setState({
					column: newColumn,
					direction: 'ascending',
					pagination_page: 1,
					data: sortedData
				});
			}
		} else if (column !== clickedColumn) {
			let sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));

			this.setState({
				column: clickedColumn,
				direction: 'ascending',
				pagination_page: 1,
				data: sortedData
			});
		} else {
			this.setState({
				direction: direction === 'ascending' ? 'descending' : 'ascending',
				pagination_page: 1,
				data: data.reverse()
			});
		}
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_onChangeFilter(value) {
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
        const props = this.props;
		let { data } = this.state;

		if (this.state.searchBar.searchFilter) {
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
                <CrewSearchBar 
                            data= {props.data} 
                            explanation = { props.explanation }
                            searchFilter = {this.state.searchFilter}
                            filterRow = { props.filterRow }
                            searchExt = { props.searchExt }
                            onChange = {this._onChangeFilter}
                        />
				
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
