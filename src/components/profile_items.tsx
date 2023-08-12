import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import { mergeItems } from '../utils/itemutils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';

import CONFIG from '../components/CONFIG';
import { MergedData, MergedContext } from '../context/mergedcontext';
import ItemDisplay from './itemdisplay';
import { EquipmentCommon, EquipmentItem } from '../model/equipment';
import { calculateRosterDemands } from '../utils/equipment';

type ProfileItemsProps = {
	data?: EquipmentCommon[] | EquipmentItem[];
	navigate?: (symbol: string) => void;
	hideOwnedInfo?: boolean;
};

type ProfileItemsState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	pagination_rows: number;
	pagination_page: number;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ProfileItems extends Component<ProfileItemsProps, ProfileItemsState> {
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;

	constructor(props: ProfileItemsProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: props.data ?? []
		};
	}

	componentDidMount() {
		if (this.state.data.length) return;

		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				let data = mergeItems(this.context.playerData.player.character.items, items);
				this.setState({ data });
			});
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_handleSort(clickedColumn) {
		const { column, direction } = this.state;
		let { data } = this.state;

		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction: clickedColumn === column ? direction : (clickedColumn === 'quantity' ? 'ascending' : null)
		};

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		this.setState({
			column: sorted.field,
			direction: sorted.direction,
			pagination_page: 1,
			data: sorted.result
		});
	}

	private handleNavigate = (symbol: string) => {
		if (this.props.navigate) {
			this.props.navigate(symbol);
		}
		else {
			navigate("/item_info?symbol=" + symbol);
		}
	}

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		const { playerData } = this.context;
		let { hideOwnedInfo } = this.props;

		if (!hideOwnedInfo && !!playerData?.player?.character?.crew?.length && !!data?.length){
			const demandos = calculateRosterDemands(playerData.player.character.crew, data as EquipmentItem[]);
			for (let item of data) {
				const fitem = demandos?.demands?.find(f => f.symbol === item.symbol);
				if (fitem) {
					item.needed = fitem.count;
				}
				else {
					item.needed = 0;
				}
			}
		}
		
		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							width={3}
							sorted={column === 'name' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('name')}
						>
							Item
						</Table.HeaderCell>
						{!hideOwnedInfo && <Table.HeaderCell
							width={1}
							sorted={column === 'quantity' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('quantity')}
						>
							Quantity
						</Table.HeaderCell>}
						{!hideOwnedInfo &&
						<Table.HeaderCell
							width={1}
							sorted={column === 'needed' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('needed')}
						>
							Needed
						</Table.HeaderCell>}
						<Table.HeaderCell
							width={1}
							sorted={column === 'type' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('type')}
						>
							Item type
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'rarity' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('rarity')}
						>
							Rarity
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((item, idx) => (
						<Table.Row key={idx}>
							<Table.Cell>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}
								>
									<div style={{ gridArea: 'icon' }}>
									<ItemDisplay
										rarity={item.rarity}
										maxRarity={item.rarity}
										size={48} 
										src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`} />
										
									</div>
									<div style={{ gridArea: 'stats', cursor: "pointer" }}>
										<a onClick={(e) => this.handleNavigate(item.symbol)}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
												{item.rarity > 0 && (
													<span>
														{item.rarity} <Icon name="star" />{' '}
													</span>
												)}
												{item.name}
											</span>
										</a>
									</div>
									<div style={{ gridArea: 'description' }}>{item.flavor}</div>
								</div>
							</Table.Cell>
							{!hideOwnedInfo && <Table.Cell>{item.quantity}</Table.Cell>}
							{!hideOwnedInfo && <Table.Cell>{item.needed ?? 0}</Table.Cell>}
							<Table.Cell>{CONFIG.REWARDS_ITEM_TYPE[item.type]}</Table.Cell>
							<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan="8">
							<Pagination
								totalPages={totalPages}
								activePage={pagination_page}
								onPageChange={(event, { activePage }) => this._onChangePage(activePage)}
							/>
							<span style={{ paddingLeft: '2em' }}>
								Items per page:{' '}
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
		);
	}
}

export default ProfileItems;
