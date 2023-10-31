import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Input, Checkbox, DropdownItemProps } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';


import '../typings/worker';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';

import { binaryLocate, exportItems, exportItemsAlt, mergeItems } from '../utils/itemutils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';

import CONFIG from '../components/CONFIG';
import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';
import ItemDisplay from './itemdisplay';
import { EquipmentCommon, EquipmentItem } from '../model/equipment';
import { calculateRosterDemands } from '../utils/equipment';
import { TinyStore } from '../utils/tiny';
import { downloadData } from '../utils/crewutils';
import { ItemHoverStat } from './hovering/itemhoverstat';
import { CrewHoverStat } from './hovering/crewhoverstat';
import { EquipmentWorkerConfig, EquipmentWorkerResults } from '../model/worker';
import { PlayerCrew } from '../model/player';
import { appelate } from '../utils/misc';
import { CrewMember } from '../model/crew';

type ProfileItemsProps = {
	/** List of equipment items */
	data?: EquipmentCommon[] | EquipmentItem[];
	
	/** Optional alternative navigation method */
	navigate?: (symbol: string) => void;
	
	/** Hide features for owned items */
	hideOwnedInfo?: boolean;

	/** Hide search bar */
	hideSearch?: boolean;
	
	/** Add needed but unowned items to list */
	addNeeded?: boolean;

	pageName?: string;
	
	noRender?: boolean;

	/** Do not run the worker */
	noWorker?: boolean;

	/** Put flavor in its own column. */
	flavor?: boolean;
};

interface ItemSearchOpts {
	filterText?: string;
	itemType?: number[];
	rarity?: number[];
}

type ProfileItemsState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	data?: (EquipmentCommon | EquipmentItem)[];
	filteredData?: (EquipmentCommon | EquipmentItem)[];
	searchOpts?: ItemSearchOpts;
	pagination_rows: number;
	pagination_page: number;
	
	/** Add needed but unowned items to list */
	addNeeded?: boolean;	
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ProfileItems extends Component<ProfileItemsProps, ProfileItemsState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	readonly tiny: TinyStore; 
	private lastData: (EquipmentCommon | EquipmentItem)[] | undefined;

	constructor(props: ProfileItemsProps) {
		super(props);
		this.tiny = TinyStore.getStore((props.pageName ? props.pageName + "_": "") + 'profile_items');

		this.state = {
			column: null,
			direction: null,
			searchOpts: this.tiny.getValue('searchOptions'),
			pagination_rows: 10,
			pagination_page: 1,
			data: props.data,
			addNeeded: props.addNeeded ?? this.tiny.getValue<boolean>('addNeeded', false)
		};
	}

	private runWorker() {
		const worker = new UnifiedWorker();
		const { playerData } = this.context.player;

		const items = this.context.core.items;
		const { addNeeded } = this.state;
		
		var me = this;

		if (playerData?.calculatedDemands?.length) {
			let data = [ ... playerData.calculatedDemands ];

			if (addNeeded) {
				data.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
				me.setState({ ... this.state, data, column: 'quantity', direction: 'ascending', pagination_page: 1 });
			}
			else {
				me.setState({ ... this.state, data });	
			}			
			return;
		}

		worker.addEventListener('message', (message: { data: { result: EquipmentWorkerResults } }) => {						
			if (playerData) playerData.calculatedDemands = message.data.result.items as EquipmentItem[];
			let data = [ ... message.data.result.items ];
			
			if (addNeeded) {
				data.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
				me.setState({ ... this.state, data, column: 'quantity', direction: 'ascending', pagination_page: 1 });
			}
			else {
				me.setState({ ... this.state, data });	
			}			
		});

		worker.postMessage({
			worker: 'equipmentWorker',
			config: { 
				playerData,
				items,
				addNeeded: this.state.addNeeded			
				} as EquipmentWorkerConfig
		});
	}
	componentDidMount() {
		this.initData();
	}

	componentDidUpdate(prevProps: Readonly<ProfileItemsProps>, prevState: Readonly<ProfileItemsState>, snapshot?: any): void {		
		this.initData();	
	}

	initData() {
		const { playerData } = this.context.player;
		
		if (playerData) {
			if (playerData.calculatedDemands && this.state.data?.length && this.state.data?.length > 0) return;
		}

		const { items } = this.context.core;		
		if (!items) return;
		
		if (this.state.data?.length && this.lastData === this.state.data) {
			return;
		}
		else {
			this.lastData = this.state.data;
		}

		if (!this.props.noWorker) { 
			this.runWorker();
		}
		else if (this.props.data?.length) {
			this.setState({ ...this.state, data: this.props.data })
		}
	}

	private _onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}


	private _handleSort(clickedColumn) {
		const { column, direction } = this.state;
		let { data } = this.state;
		if (!data) return;
		
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

	private _handleNavigate = (symbol: string) => {
		if (this.props.navigate) {
			this.props.navigate(symbol);
		}
		else {
			navigate("/item_info?symbol=" + symbol);
		}
	}

	private _handleFilter = (text: string | undefined) => {
		const searchOpts = { ...(this.state.searchOpts ?? {}), filterText: text ?? '' };
		this.tiny.setValue('searchOptions', searchOpts);

		this.setState({ ...this.state, searchOpts });
	}

	private _handleItemType = (values: number[] | undefined) => {
		const searchOpts = { ...(this.state.searchOpts ?? {}), itemType: values };
		this.tiny.setValue('searchOptions', searchOpts);
		this.setState({ ...this.state, searchOpts });
	}

	private _handleRarity = (values: number[] | undefined) => {
		const searchOpts = { ...(this.state.searchOpts ?? {}), rarity: values };
		this.tiny.setValue('searchOptions', searchOpts);		
		this.setState({ ...this.state, searchOpts });
	}


	private _handleAddNeeded = (value: boolean | undefined) => {
		if (this.state.addNeeded === value) return;		
		const { playerData } = this.context.player;

		if (playerData) {
			delete playerData.calculatedDemands;
		}

		this.tiny.setValue('addNeeded', value ?? false);
		this.setState({ ... this.state, data: undefined, addNeeded: value ?? false });
	}

	createFlavor(item: EquipmentItem | EquipmentCommon) {
		let output = [] as JSX.Element[];

		let flavor = item.flavor ?? "";
		if (flavor.startsWith("Equippable by: ")) {
			let crew = flavor.replace("Equippable by: ", "").split(", ")?.map(s => this.context.core.crew.find(c => c.symbol === s)).filter(s => !!s) as CrewMember[];
			output.push(<div>
				Equippable by: {crew.map((crew) => <Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>).reduce((p, n) => <>{p}, {n}</>)}
			</div>)
		}
		const crew = this.context.player.playerData?.player.character.crew ?? [];

		if (item.kwipment && (item.traits_requirement?.length || item.max_rarity_requirement)) {
			let found: PlayerCrew[] | null = null;
			
			if (item.traits_requirement_operator === "and") {
				found = crew.filter((crew) => {
					return (item.traits_requirement?.every((t) => crew.traits.includes(t) || crew.traits_hidden.includes(t)));
				});					
			}
			else {
				found = crew.filter((crew) => {
					if (!!item.max_rarity_requirement && item.max_rarity_requirement !== crew.max_rarity) return false;

					if (item.traits_requirement?.length) {
						if (item.traits_requirement_operator === 'and') {
							return (item.traits_requirement?.every((t) => crew.traits.includes(t) || crew.traits_hidden.includes(t)));
						}
						else {
							return (item.traits_requirement?.some((t) => crew.traits.includes(t) || crew.traits_hidden.includes(t)));
						}
					}

					return true;
					
				});					
			}

			if (found?.length) {				
				flavor ??= "";
				
				if (flavor?.length) {
					flavor += "\n";
				}
				if (found.length > 5) {
					if (item.traits_requirement?.length) {
						if (item.max_rarity_requirement) {
							output.push(<div>
								Equippable by <span style={{
									color: CONFIG.RARITIES[item.max_rarity_requirement].color,
									fontWeight: 'bold'
								}}>
								{CONFIG.RARITIES[item.max_rarity_requirement].name}
								</span>
								&nbsp;crew with the following traits: {item.traits_requirement?.map(r => <Link to={`/?search=trait:${r}`}>{appelate(r)}</Link>).reduce((p, n) => <>{p} {item.traits_requirement_operator} {n}</>)}
							</div>)
							flavor += `Equippable by ${CONFIG.RARITIES[item.max_rarity_requirement].name} crew with the following traits: ${item.traits_requirement?.map(r => appelate(r)).join(" " + item.traits_requirement_operator + " ")}`;
						}
						else {
							output.push(<>
								Equippable by crew with the following traits:&nbsp;{item.traits_requirement?.map(r => <Link to={`/?search=trait:${r}`}>{appelate(r)}</Link>).reduce((p, n) => <>{p} {item.traits_requirement_operator} {n}</>)}
							</>)
							flavor += `Equippable by crew with the following traits: ${item.traits_requirement?.map(r => appelate(r)).join(" " + item.traits_requirement_operator + " ")}`;
						}
					}
					else if (item.max_rarity_requirement) {
						output.push(<div>
							Equippable by&nbsp;<span style={{
								color: CONFIG.RARITIES[item.max_rarity_requirement].color,
								fontWeight: 'bold'
							}}>
							{CONFIG.RARITIES[item.max_rarity_requirement].name}
							</span>
							&nbsp;crew.
						</div>)
					flavor += `Equippable by ${CONFIG.RARITIES[item.max_rarity_requirement].name} crew.`;
					}
					else {
						output.push(<div>Equippable by&nbsp;{found.length} crew.</div>)
						flavor += `Equippable by ${found.length} crew.`;
					}
				} else {
					output.push(<div>
						Equippable by:&nbsp;{found.map((crew) => <Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>).reduce((p, n) => <>{p}, {n}</>)}
					</div>)
		
					flavor += 'Equippable by: ' + [...found.map(f => f.symbol)].join(', ');
				}
			}
		}
		return output;	
	}

	render() {
		const { addNeeded, column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;
		const filterText = this.state.searchOpts?.filterText?.toLocaleLowerCase();
		const { rarity, itemType } = this.state.searchOpts ?? {};
		const { playerData } = this.context.player;
		let bReady: boolean = !!data?.length;
		if (playerData) {
			if (!playerData.calculatedDemands && !this.props.noWorker) {
				bReady = false;
			}
		}
		const { flavor, hideOwnedInfo, hideSearch } = this.props;		
		let totalPages = 0;
		const presentTypes = [...new Set(data?.map(d => d.type) ?? Object.keys(CONFIG.REWARDS_ITEM_TYPE).map(k => Number.parseInt(k)))];

		if (data?.length) {
			
			if ((filterText && filterText !== '') || !!rarity?.length || !!itemType?.length) {
				
				data = data.filter(f => {
					let textPass = true;
					let rarePass = true;
					let itemPass = true;

					if (filterText && filterText !== '') {
						textPass = f.name?.toLowerCase().includes(filterText) || 
						f.short_name?.toLowerCase().includes(filterText) ||
						f.flavor?.toLowerCase().includes(filterText) ||
						CONFIG.RARITIES[f.rarity].name.toLowerCase().includes(filterText) ||
						CONFIG.REWARDS_ITEM_TYPE[f.type].toLowerCase().includes(filterText);
					}

					if (!!rarity?.length) {
						rarePass = rarity?.some(r => f.rarity == r);
					}
					if (!!itemType?.length) {
						itemPass = itemType?.some(t => f.type == t);
					}

					return textPass && rarePass && itemPass;
				});
			}
			if (rarity?.length) {

			}

			totalPages = Math.ceil(data.length / this.state.pagination_rows);

			// Pagination
			data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);
		}		

		const rewardFilterOpts = [] as DropdownItemProps[];
		const rarities = [] as DropdownItemProps[];
		presentTypes.sort((a, b) => {
			let atext = CONFIG.REWARDS_ITEM_TYPE[a];
			let btext = CONFIG.REWARDS_ITEM_TYPE[b];
			return atext.localeCompare(btext);
		});
		presentTypes.forEach((rk) => {
			rewardFilterOpts.push({ 
				key: rk,
				value: rk,
				text: CONFIG.REWARDS_ITEM_TYPE[rk]
			});			
		});

		Object.keys(CONFIG.RARITIES).forEach((rk) => {
			rarities.push({ 
				key: Number.parseInt(rk),
				value: Number.parseInt(rk),
				text: CONFIG.RARITIES[rk].name
			});
		});

		if (this.props.noRender) return <></>
		return (
			<div style={{margin:0,padding:0}}>
			<div className='ui segment' style={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
				{!hideSearch && <div style={{ display: "flex", height: "3em", flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginLeft: "0.25em"}}>
					<Input		
						style={{width:"22em"}}
						label={"Search Items"}
						value={filterText}
						onChange={(e, { value }) => this._handleFilter(value as string)}
						/>
					<i className='delete icon'								
						title={"Clear Searches and Comparison Marks"} 							    
						style={{
							cursor: "pointer", 
							marginLeft: "0.75em"
						}} 								
						onClick={(e) => {
								this._handleFilter(undefined); 
							} 
						} 
					/>
					<div style={{marginLeft: "0.5em"}}>
						<Dropdown 
							placeholder={"Filter by item type"}
							multiple
							clearable
							scrolling
							options={rewardFilterOpts}
							value={itemType}
							onChange={(e, { value }) => this._handleItemType(value as number[] | undefined)}
						/>
					</div>
					<div style={{marginLeft: "0.5em"}}>
						<Dropdown 
							placeholder={"Filter by rarity"}
							multiple
							clearable
							options={rarities}
							value={rarity}
							onChange={(e, { value }) => this._handleRarity(value as number[] | undefined)}
						/>
					</div>
				</div>}
				{!hideOwnedInfo && <div style={{display:'flex', flexDirection:'row', justifyItems: 'flex-end', alignItems: 'center'}}>
					<Checkbox checked={addNeeded} onChange={(e, { value }) => this._handleAddNeeded(!addNeeded)} /><span style={{marginLeft:"0.5em", cursor: "pointer"}} onClick={(e) => this._handleAddNeeded(!addNeeded)}>Show Unowned Needed Items</span>
				</div>}
			</div>
			{(!data || !bReady) && <div className='ui medium centered text active inline loader'>{"Calculating crew demands..."}</div>}
			{bReady && !!(data?.length) && <Table sortable celled selectable striped collapsing unstackable compact="very">
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
						{!!flavor &&
						<Table.HeaderCell
							width={2}
							sorted={column === 'flavor' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('flavor')}
						>
							Flavor
						</Table.HeaderCell>}						
						{!hideOwnedInfo &&
						<Table.HeaderCell
							width={1}
							sorted={column === 'factionOnly' ? direction ?? undefined : undefined}
							onClick={() => this._handleSort('factionOnly')}
						>
							Faction Only
						</Table.HeaderCell>}						
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((item, idx) => (
						<Table.Row key={idx}>
							<Table.Cell>
								<div
									title={item.name + (!hideOwnedInfo ? (!item.quantity ? ' (Unowned)' : ` (${item.quantity})`) : "")}
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}
								>
									<div style={{ gridArea: 'icon' }}>
									<ItemDisplay
										targetGroup='profile_items'
										style={{
											opacity: !item.quantity && !hideOwnedInfo ? '0.20' : '1'
										}}
										playerData={this.context.player.playerData}
										itemSymbol={item.symbol}
										allItems={this.state.data}
										rarity={item.rarity}
										maxRarity={item.rarity}
										size={48} 
										src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`} />
										
									</div>
									<div style={{ gridArea: 'stats', cursor: "pointer" }}>
										<a onClick={(e) => this._handleNavigate(item.symbol)}>
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
									<div style={{ gridArea: 'description' }}>{this.createFlavor(item)}</div>
								</div>
							</Table.Cell>
							{!hideOwnedInfo && <Table.Cell>{item.quantity}</Table.Cell>}
							{!hideOwnedInfo && <Table.Cell>{item.needed ?? 'N/A'}</Table.Cell>}
							<Table.Cell>{CONFIG.REWARDS_ITEM_TYPE[item.type]}</Table.Cell>
							<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
							{!!flavor && <Table.Cell>{this.createFlavor(item)}</Table.Cell>}
							{!hideOwnedInfo && <Table.Cell>{item.factionOnly === undefined ? '' : (item.factionOnly === true ? 'Yes' : 'No')}</Table.Cell>}
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
			</Table>}
			<ItemHoverStat targetGroup='profile_items' navigate={this._handleNavigate} />
			<CrewHoverStat targetGroup='profile_items_crew' />
			<br />
				{!hideOwnedInfo && !!(data?.length) && bReady &&
					<div style={{
						display: "flex",
						flexDirection: "row",
						justifyContent:"flex-start"
					}}>
					<div 
						className='ui button' 
						onClick={(e) => { if (this.state.data) this._exportItems(this.state.data)}}
						style={{display:'inline', flexDirection:'row', justifyContent:'space-evenly', cursor: 'pointer'}}
						>
						<span style={{margin: '0 2em 0 0'}}>Export to CSV</span><i className='download icon' />
					</div>
					<div 
						className='ui button' 
						onClick={(e) => { if (this.state.data) this._exportItems(this.state.data, true)}}
						style={{marginRight:"2em",display:'inline', flexDirection:'row', justifyContent:'space-evenly', cursor: 'pointer'}}
						>
						<span style={{margin: '0 2em 0 0'}}>Copy to Clipboard</span><i className='clipboard icon' />
					</div>
				</div>}
			<br />
			<br />
			</div>
		);
	}
	
	_exportItems(data: (EquipmentCommon | EquipmentItem)[], clipboard?: boolean) {
		const { playerData } = this.context.player;

		let text = exportItemsAlt(data);
		if (clipboard){
			navigator.clipboard.writeText(text);			
			return;
		}
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'items.csv');
	}
}

export default ProfileItems;
