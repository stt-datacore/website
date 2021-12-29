import React from 'react';
import { Dropdown, Pagination, Table } from 'semantic-ui-react';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

type PagedTableState = {
  page: number;
  paginationRows: number;
  rowNum: number;
  changeRowNum: (number) => void;
};

const TableContext = React.createContext({});

export class PagedTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rowNum : 0,
      paginationPage : 1,
      paginationRows : 25,
      changeRowNum: rowNum => rowNum !== this.state.rowNum && this.setState({rowNum})
    }
  }

  render() {
    const {paginationPage, paginationRows, rowNum} = this.state;
    const totalPages = Math.ceil(rowNum/paginationRows);

    return (
      <TableContext.Provider value={this.state}>
        <Table {...this.props}>
          {this.props.children}
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell colSpan={9}>
                <Pagination
                  totalPages={totalPages}
                  activePage={paginationPage}
                  onPageChange={(event, { activePage }) => this.setState({paginationPage: activePage})}
                />
                <span style={{ paddingLeft: '2em'}}>
                  Rows per page:{' '}
                  <Dropdown
                    inline
                    options={Array.from(['10', '25', '50', '100'], (value, key) => ({key, value, text: value}))}
                    value={paginationRows}
                    onChange={(event, {value}) => {
                      this.setState({
                        paginationPage: 1,
                        paginationRows: value as number
                    })}}
                  />
                </span>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </TableContext.Provider>
    )
  }

  static Body = class extends React.Component {
    static contextType = TableContext;

    render() {
      const { paginationPage, paginationRows } = this.context;
			this.context.changeRowNum(this.props.children.length);
      const baseRow = (paginationPage-1)*paginationRows;

      return (
        <Table.Body {...this.props}>
          {this.props.children.slice(baseRow, baseRow+paginationRows)}
        </Table.Body>
      );
    }
  }
  static Header = Table.Header;
  static HeaderCell = Table.HeaderCell;
  static Row = Table.Row;
  static Cell = Table.Cell;
}

export default PagedTable;
