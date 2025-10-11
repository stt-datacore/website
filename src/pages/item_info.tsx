import { Link, navigate } from 'gatsby';
import React from 'react';
import { Checkbox, Grid, Header, Icon, Message, Popup, Table } from 'semantic-ui-react';

import CONFIG from '../components/CONFIG';
import { CrewConfigTable } from '../components/crewtables/crewconfigtable';
import { IRosterCrew } from '../components/crewtables/model';
import { renderAnyDataScore, renderMainDataScore } from '../components/crewtables/views/base';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { ShipHoverStat, ShipTarget } from '../components/hovering/shiphoverstat';
import { AvatarView } from '../components/item_presenters/avatarview';
import CrewStat from '../components/item_presenters/crewstat';
import { renderBonuses } from '../components/item_presenters/item_presenter';
import ItemDisplay from '../components/itemdisplay';
import { EquipmentTable } from '../components/items/equipment_table';
import { printRequiredTraits } from '../components/items/utils';
import ItemSources from '../components/itemsources';
import DataPageLayout from '../components/page/datapagelayout';
import { ITableConfigRow } from '../components/searchabletable';
import { GlobalContext } from '../context/globalcontext';
import { EquipmentItem, IDemand } from '../model/equipment';
import { CompletionState, PlayerCrew } from '../model/player';
import { skillSum } from '../utils/crewutils';
import { formatDuration, getItemBonuses, getQuipmentCrew } from '../utils/itemutils';
import { useStateWithStorage } from '../utils/storage';

export interface CrewLevel { crew: PlayerCrew, level: number, owned: boolean };

export interface EquipmentItemData {
	item: EquipmentItem;
	crew_levels: CrewLevel[];
	builds: EquipmentItem[];
}

interface ItemInfoComponentProps {
	setHeader?: (value: string) => void;
	isReady?: boolean;
};

const ItemInfoPage = () => {
	return (
		<DataPageLayout demands={['all_buffs', 'episodes', 'crew', 'items', 'cadet']}>
			<ItemInfo />
		</DataPageLayout>

	);
}

const ItemInfo = (props: ItemInfoComponentProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { setHeader } = props;
	//const tiny = TinyStore.getStore('item_info');
	const [itemData, setItemData] = React.useState<EquipmentItemData>();
	const [errorMessage, setErrorMessage] = React.useState<string>('');
	//	const [items, setItems] = React.useState<EquipmentItem[]>([]);
	const [owned, setOwned] = useStateWithStorage<boolean>(`item_info/owned`, false, { rememberForever: true });
	const [symbol, setSymbol] = React.useState<string | undefined>();
	const [inited, setInited] = React.useState(false);
	const { isMobile } = globalContext;
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { items } = globalContext.core;

	const isQp = React.useMemo(() =>
		!!itemData?.item?.kwipment,
	[itemData]);

	React.useEffect(() => {
		if (inited) return;

		let urlParams = new URLSearchParams(window.location.search);
		const { crew: allcrew, items } = globalContext.core;
		let item_symbol = urlParams.get('symbol') || symbol;

		if (item_symbol) {
			const item = items?.find(entry => entry.symbol === item_symbol);
			const crew_levels = [] as { crew: PlayerCrew, level: number, owned: boolean }[];
			allcrew.forEach(crew => {
				crew.equipment_slots.forEach(es => {
					if (es.symbol === item_symbol) {
						if (globalContext.player.playerData) {
							let owned = globalContext.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
							if (owned) {
								crew_levels.push({
									crew: { ...JSON.parse(JSON.stringify(crew)), ...owned, rarity: owned?.rarity ?? 0 },
									level: es.level,
									owned: !!owned
								});
								return;
							}
						}

						crew_levels.push({
							crew: { ...JSON.parse(JSON.stringify(crew)), immortal: CompletionState.DisplayAsImmortalStatic, rarity: 0 },
							level: es.level,
							owned: false
						});
					}
				});
			});

			// Find other items' whose recipes use this one
			const builds = [] as EquipmentItem[];

			items?.forEach(it => {
				if (it.kwipment && !it.max_rarity_requirement) return;
				if (it.recipe && it.recipe.list && it.recipe.list.find(entry => entry.symbol === item_symbol)) {
					builds.push(it);
				}
			});

			if (item === undefined) {
				setErrorMessage('Invalid item symbol, or data not yet available for this item.');
			}
			else {
				if (item.kwipment) {
					const kwipment_levels = getQuipmentCrew(item, globalContext.core.crew)
						.map(crew => {
							if (globalContext.player.playerData) {
								let owned = globalContext.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
								if (owned) {
									return {
										crew: { ...crew as PlayerCrew, ...owned, rarity: owned?.rarity ?? 0 },
										level: 100,
										owned: !!owned
									}
								}
							}

							return {
								crew: { ...crew, immortal: CompletionState.DisplayAsImmortalStatic, rarity: 0 } as PlayerCrew,
								level: 100,
								owned: false
							}
						});
					setItemData({ item, crew_levels: kwipment_levels, builds });
				}
				else {
					setItemData({ item, crew_levels, builds });
				}
				if (setHeader) setHeader(item.name);
				setSymbol(item.symbol);
				setInited(true);
				if (typeof window !== 'undefined') {
					window.removeEventListener('popstate', popState);
					window.addEventListener('popstate', popState);
				}
			}
		}
	}, [inited]);

	if (itemData === undefined || !!errorMessage) {
		return (
			<>
				<Header as="h3">Item information</Header>
				{!!errorMessage && (
					<Message negative>
						<Message.Header>Unable to load item information</Message.Header>
						<pre>{errorMessage.toString()}</pre>
					</Message>
				)}
				{!errorMessage && (
					<div>
						<Icon loading name="spinner" /> Loading...
					</div>
				)}
			</>
		);
	}

	console.log(itemData);
	const { bonuses, bonusText } = getItemBonuses(itemData.item);

	// TODO: share this code with equipment.ts
	let demands = [] as IDemand[];
	if (itemData.item.recipe) {
		for (let iter of itemData.item.recipe.list) {
			let recipeEquipment = items?.find(item => item.symbol === iter.symbol);
			if (recipeEquipment) {
				demands.push({
					crewSymbols: [],
					count: iter.count,
					symbol: iter.symbol,
					equipment: recipeEquipment,
					factionOnly: iter.factionOnly,
					have: 0
				});
			}
		}
	}

	const item = itemData.item;

	const haveCount = getHaveCount(item.symbol);
	const ship = itemData.item.type === 8 ? globalContext.core.ships?.find(f => f.symbol === item.symbol.replace("_schematic", "")) : undefined;
	const builds = itemData.builds;

	const ltMarginSmall = isMobile ? "0px" : "0.375em";
	const ltMargin = isMobile ? "0px" : "0.75em";
	const ltMarginBig = isMobile ? "0px" : "1em";

	const { TRAIT_NAMES } = globalContext.localized;

	const itemFlavor = itemData.item.flavor?.replace(/\<b\>/g, '').replace(/\<\/b\>/g, '');

	const crewTableCells = [
		{ width: 2, column: 'data', title: t('items.columns.item_demand_levels') }
	] as ITableConfigRow[];

	if (isQp) {
		crewTableCells.unshift(
			{ width: 1, column: 'ranks.scores.quipment', title: t('rank_names.scores.quipment'), reverse: true },
			{
				reverse: true,
				width: 2, column: 'bonus', title: t('global.bonus'),
				customCompare: (a, b) => {
					let r = a.bonus - b.bonus;
					if (!r) r = a.max_rarity - b.max_rarity;
					if (!r) r = a.ranks.scores.overall - b.ranks.scores.overall;
					if (!r) r = a.name.localeCompare(b.name);
					return r;
				}
			}
		);
	}

	crewTableCells.unshift(
		{
			width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'),
			reverse: true,
			customCompare: (a, b) => {
				let r = a.ranks.scores.overall - b.ranks.scores.overall;
				return r;
			}
		}
	);

	return (
		<div>
			<CrewHoverStat targetGroup='item_info' />
			<ShipHoverStat targetGroup='item_info_ships' />
			<ItemHoverStat navigate={(symbol) => navToItem(symbol)} targetGroup='item_info_items' />

			<div style={{
				paddingTop: "2em",
				marginBottom: "1em",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexDirection: isMobile ? "column" : "row"
			}}>
				<AvatarView
					mode='item'
					targetGroup='item_info_items'
					item={item}
					style={{
						margin: isMobile ? '0 0 0.25em 0' : '0.25em 0 0 0'
					}}
					src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
					size={128}
				/>
				<div style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-evenly",
					alignItems: "left"
				}}>
					<Header
						as="h2"
						style={{
							margin: 0,
							marginLeft: ltMarginSmall,
							textAlign: isMobile ? 'center' : 'left'
						}}>
						{item.name}
					</Header>

					{!!itemFlavor && (
						<div style={{ textAlign: 'left', marginLeft: ltMargin, fontStyle: "italic", width: "100%" }}>
							{itemFlavor}
						</div>
					)}

					{!!bonusText?.length && (
						<div style={{ marginLeft: ltMargin }}>
							{renderBonuses(bonuses)}
						</div>
					)}

					{!!haveCount && (
						<div style={{ margin: 0, marginLeft: ltMarginBig, color: "lightgreen" }}>
							{t('items.columns.owned').toLocaleUpperCase()} ({haveCount})
						</div>
					)}

					{!!item.duration &&(
						<div
							style={{
								textAlign: "left",
								//fontStyle: "italic",
								fontSize: "1em",
								marginTop: "2px",
								marginBottom: "4px",
								marginLeft: ltMargin
							}}
						>
							<div><b>{t('ship.duration')}:</b>&nbsp;
								<i>{formatDuration(item.duration, t)}</i></div>
						</div>
					)}

					{!!item.max_rarity_requirement && (
						<div style={{
							textAlign: "left",
							//fontStyle: "italic",
							fontSize: "1em",
							marginTop: "2px",
							marginBottom: "4px",
							marginLeft: ltMargin
						}}>
							{tfmt('items.equippable_by_rarity', {
								rarity: <span style={{
									color: CONFIG.RARITIES[item.max_rarity_requirement].color,
									fontWeight: 'bold'
								}}>
									{CONFIG.RARITIES[item.max_rarity_requirement].name}
								</span>
							})}
						</div>
					)}

					{!!item.kwipment && !!item.traits_requirement?.length && (
						<div
							style={{
								textAlign: "left",
								//fontStyle: "italic",
								fontSize: "1em",
								marginTop: "2px",
								marginBottom: "4px",
								marginLeft: ltMargin
							}}
						>
							<div>
								<b>
									{
										tfmt('items.required_traits', {
											traits: (
												<i>
													{printRequiredTraits(itemData.item, TRAIT_NAMES, t)}
												</i>
											)
										})
									}
								</b>&nbsp;
							</div>
						</div>
					)}
				</div>
			</div>

			{item.type === 8 && !!ship && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center" }}>
					<ShipTarget inputItem={ship} targetGroup='item_info_ships'>
						<Link to={`/ship_info?ship=${ship.symbol}`}>
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center" }}>
								<ItemDisplay
									src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
									size={128}
									rarity={ship.rarity}
									maxRarity={ship.rarity}
								/>
								{ship.name}
							</div>
						</Link>
					</ShipTarget>
				</div>
			)}

			{!!item.recipe?.list?.length && (
				<div>
					<Header as="h3">
						{tfmt('items.craft_for_chrons{{:}}', {
							cost: (<>
								<img
									title={"Chronitons"}
									style={{ width: "1.5em", margin: 0, padding: 0, marginBottom: "2px" }}
									src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`}
								/>
								{item.recipe.craftCost.toLocaleString()}
							</>)
						})}
					</Header>
					<Grid columns={isMobile ? 1 : 3} padded>
						{demands.map((entry, idx) => renderEntry(entry, idx))}
					</Grid>
					<br />
				</div>
			)}

			{!!(item.item_sources.length > 0) && (
				<div>
					<Header as="h3">{t('items.item_sources')}:</Header>
					<ItemSources item_sources={item.item_sources} />
					<br />
				</div>
			)}

			{itemData.crew_levels.length > 0 && (
				<div>
					<Header as="h3">
						{t('items.equippable_by', { crew: '' })}
					</Header>
					{!!playerData && (
						<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: "0.5em" }}>
							<Checkbox
								id="item_info_owned_check_boolean"
								checked={owned}
								onChange={(e, { checked }) => setOwned(checked || false)}
							/>
							<label htmlFor="item_info_owned_check_boolean" style={{ margin: "0.5em", cursor: "pointer" }}>
								{t('crew_ownership.owned')}
							</label>
						</div>
					)}
					<CrewConfigTable
						tableConfig={crewTableCells}
						renderTableCells={renderTableCells}
						crewFilters={[]}
						pageId='item_info'
						rosterCrew={makeCrewFlavors(itemData.crew_levels)}
						rosterType='allCrew'
					/>
					<br />
				</div>
			)}

			{!!builds?.length && (
				<div>
					<Header as="h3">{t('items.is_used_to_build')}:</Header>
					<EquipmentTable
						pageId='item_info'
						hideOwnedColumns={true}
						items={builds}
						navigate={(symbol) => navToItem(symbol)}
					/>
				</div>
			)}
		</div>
	);

	function renderTableCells(row: IRosterCrew): JSX.Element {
		if (itemData?.item?.kwipment) {
			const item = itemData?.item;
			const wb = getItemBonuses(item);
			let bonuses = Object.keys(wb.bonuses).filter(f => row.skill_order.includes(f)).map(m => wb.bonuses[m]);
			return (<>
				<Table.Cell>
					{renderMainDataScore(row, false)}
				</Table.Cell>
				<Table.Cell>
					{renderAnyDataScore(row, 'quipment', t, false)}
				</Table.Cell>
				<Table.Cell>
					{bonuses.map(skill =>
						<CrewStat
							key={`${item.symbol}_quipment_bonus_${skill}`}
							gridStyle={{ gap: '0.5em' }}
							scale={0.75}
							data={skill}
							skill_name={skill.skill}
						/>
					)}
				</Table.Cell>
				<Table.Cell>
					{row.data}
				</Table.Cell>
			</>);
		}
		else {
			return (<>
				<Table.Cell>
					{renderMainDataScore(row, false)}
				</Table.Cell>
				<Table.Cell>
					{row.data}
				</Table.Cell>
			</>);
		}
	}

	function renderEntry(entry: IDemand, idx: number) {
		if (!entry.equipment) return <></>;
		const hc = getHaveCount(entry.equipment.symbol);
		const scolor = hc < entry.count ? 'tomato' : undefined;
		return (
			<Grid.Column key={`${idx}_item_demand_${entry.symbol}`}>
				<Popup
					trigger={
						<Header
							style={{ display: 'flex', cursor: 'zoom-in' }}
							icon={
								<AvatarView
									mode='item'
									item={entry.equipment}
									targetGroup='item_info_items'
									style={{ marginRight: "0.5em" }}
									size={48}
								/>
							}
							content={entry.equipment.name}
							subheader={<div style={{ fontSize: "0.8em" }}>{t('items.n_needed', { n: `${entry.count}` })} {playerData?.player ? <>({tfmt('items.n_owned', { n: <span style={{ color: scolor }}>{hc}</span> })})</> : ""} {entry.factionOnly ? ` (${t('items.faction_only')})` : ''}</div>}
						/>
					}
					header={
						<a style={{ cursor: "pointer" }} onClick={(e) => navToItem(entry.symbol)}>
							{CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
						</a>
					}
					content={<ItemSources item_sources={entry.equipment.item_sources} />}
					on="click"
					wide
				/>
			</Grid.Column>
		);
	}

	function makeCrewFlavors(crew_levels: CrewLevel[]) {
		const { t } = globalContext.localized;
		let crews = {} as { [key: string]: number[] };

		for (let cl of crew_levels) {
			if (owned && !cl.owned) continue;

			crews[cl.crew.symbol] ??= [];
			crews[cl.crew.symbol].push(cl.level);
		}

		let outCrew = Object.keys(crews).map((symbol) => {
			let crew: IRosterCrew | undefined = undefined;
			crew = crew_levels.find(f => f.crew.symbol === symbol)?.crew;
			if (crew) {
				//if (crew) crew = JSON.parse(JSON.stringify(crew)) as IRosterCrew;
				if (itemData?.item?.kwipment) {
					const wb = getItemBonuses(itemData.item);
					let bonuses = Object.keys(wb.bonuses).filter(f => crew.skill_order.includes(f)).map(m => wb.bonuses[m]);
					crew.data = t('items.post_immortalization_advancement');
					crew.bonus = skillSum(bonuses);
				}
				else {
					crew.data = crews[symbol].join(", ");
				}

			}
			if (crew && !globalContext.player.playerData) crew.rarity = crew.max_rarity;
			return crew;
		});

		return (outCrew?.filter(c => !!c) ?? []) as IRosterCrew[];
	}

	function navToItem(symbol: string) {
		navigate("/item_info?symbol=" + symbol, { replace: false });
		setTimeout(() => {
			setInited(false);
		}, 20);
	}

	function popState() {
		setTimeout(() => {
			setInited(false);
		}, 20);
	}

	function getHaveCount(symbol: string) {
		const { playerData } = globalContext.player;
		return playerData?.player?.character?.items?.find(f => f.symbol === symbol)?.quantity ?? 0;
	}
}

// interface ItemInfoPageProps { };

// interface ItemInfoComponentState {
// 	item_data?: EquipmentItemData;
// 	errorMessage?: string;
// 	items?: EquipmentItem[];
// 	owned?: boolean;
// };

// class ItemInfoComponent extends Component<ItemInfoComponentProps, ItemInfoComponentState> {
// 	static contextType = GlobalContext;
// 	declare context: React.ContextType<typeof GlobalContext>;

// 	private inited: boolean = false;
// 	private readonly tiny = TinyStore.getStore('item_info');

// 	constructor(props: ItemInfoComponentProps) {
// 		super(props);
// 		window.addEventListener('popstate', (e) => {
// 			this.inited = false;
// 			this.initData();
// 		});
// 		this.state = {
// 			errorMessage: undefined,
// 			item_data: undefined,
// 			owned: this.tiny.getValue<boolean>('owned') ?? false
// 		};
// 	}

// 	private setOwned = (owned: boolean) => {
// 		this.tiny.setValue('owned', owned, true);
// 		this.inited = false;
// 		this.setState({ ...this.state, owned });
// 	}

// 	componentDidUpdate() {
// 		if (!this.inited) {
// 			this.initData();
// 		}
// 	}

// 	componentDidMount() {
// 		this.initData();
// 	}

// 	private changeComponent(symbol: string) {
// 		navigate("/item_info?symbol=" + symbol, { replace: false });
// 		this.inited = false;
// 		this.initData(symbol);
// 	}

// 	private initData(symbol?: string) {
// 		let urlParams = new URLSearchParams(window.location.search);
// 		const { crew: allcrew, items } = this.context.core;
// 		let item_symbol = symbol;
// 		if (!symbol && urlParams.has('symbol')) {
// 			item_symbol = urlParams.get('symbol') ?? undefined;
// 		}
// 		if (item_symbol) {
// 			const item = items?.find(entry => entry.symbol === item_symbol);

// 			const crew_levels = [] as { crew: PlayerCrew, level: number, owned: boolean }[];
// 			allcrew.forEach(crew => {
// 				crew.equipment_slots.forEach(es => {
// 					if (es.symbol === item_symbol) {
// 						if (this.context.player.playerData) {
// 							let owned = this.context.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
// 							if (owned) {
// 								crew_levels.push({
// 									crew: { ...structuredClone(crew), ...owned, rarity: owned?.rarity ?? 0 },
// 									level: es.level,
// 									owned: !!owned
// 								});
// 								return;
// 							}
// 						}

// 						crew_levels.push({
// 							crew: { ...structuredClone(crew), immortal: CompletionState.DisplayAsImmortalStatic, rarity: 0 } as PlayerCrew,
// 							level: es.level,
// 							owned: false
// 						});
// 					}
// 				});
// 			});

// 			// Find other items' whose recipes use this one
// 			const builds = [] as EquipmentItem[];

// 			items?.forEach(it => {
// 				if (it.recipe && it.recipe.list && it.recipe.list.find(entry => entry.symbol === item_symbol)) {
// 					builds.push(it);
// 				}
// 			});

// 			if (item === undefined) {
// 				this.setState({ errorMessage: 'Invalid item symbol, or data not yet available for this item.' });
// 				this.inited = true;
// 			} else {
// 				if (item.kwipment) {
// 					const kwipment_levels = getQuipmentCrew(item, this.context.core.crew)
// 						.map(crew => {
// 							if (this.context.player.playerData) {
// 								let owned = this.context.player.playerData?.player.character.crew.find(fcrew => fcrew.symbol === crew.symbol);
// 								if (owned) {
// 									return {
// 										crew: { ...crew as PlayerCrew, ...owned, rarity: owned?.rarity ?? 0 },
// 										level: 100,
// 										owned: !!owned
// 									}
// 								}
// 							}

// 							return {
// 								crew: { ...crew, immortal: CompletionState.DisplayAsImmortalStatic, rarity: 0 } as PlayerCrew,
// 								level: 100,
// 								owned: false
// 							}
// 						});
// 					this.setState({ item_data: { item, crew_levels: kwipment_levels, builds } });
// 				}
// 				else {
// 					this.setState({ item_data: { item, crew_levels, builds } });
// 				}
// 				this.props.setHeader(item.name);
// 				this.inited = true;
// 			}
// 		}
// 	}

// 	private makeCrewFlavors = (crew_levels: CrewLevel[]) => {
// 		const { t } = this.context.localized;
// 		let crews = {} as { [key: string]: number[] };
// 		let owned = !!this.state.owned;

// 		for (let cl of crew_levels) {
// 			if (owned && !cl.owned) continue;

// 			crews[cl.crew.symbol] ??= [];
// 			crews[cl.crew.symbol].push(cl.level);
// 		}

// 		let outCrew = Object.keys(crews).map((symbol) => {
// 			let crew: IRosterCrew | undefined = undefined;
// 			crew = crew_levels.find(f => f.crew.symbol === symbol)?.crew;
// 			if (crew) {
// 				//if (crew) crew = structuredClone(crew) as IRosterCrew;
// 				if (this.state.item_data?.item?.kwipment) {
// 					const wb = getItemBonuses(this.state.item_data.item);
// 					let bonuses = Object.keys(wb.bonuses).filter(f => crew.skill_order.includes(f)).map(m => wb.bonuses[m]);
// 					crew.data = t('items.post_immortalization_advancement');
// 					crew.bonus = skillSum(bonuses);
// 				}
// 				else {
// 					crew.data = crews[symbol].join(", ");
// 				}

// 			}
// 			if (crew && !this.context.player.playerData) crew.rarity = crew.max_rarity;
// 			return crew;
// 		});

// 		return (outCrew?.filter(c => !!c) ?? []) as IRosterCrew[];
// 	}

// 	private haveCount(symbol: string) {
// 		const { playerData } = this.context.player;
// 		return playerData?.player?.character?.items?.find(f => f.symbol === symbol)?.quantity ?? 0;
// 	}

// 	renderTableCells = (row: IRosterCrew): JSX.Element => {
// 		if (this.state.item_data?.item?.kwipment) {
// 			const item = this.state.item_data?.item;
// 			const wb = getItemBonuses(item);
// 			let bonuses = Object.keys(wb.bonuses).filter(f => row.skill_order.includes(f)).map(m => wb.bonuses[m]);
// 			return (<React.Fragment>
// 				<Table.Cell>
// 					{renderMainDataScore(row, false)}
// 				</Table.Cell>
// 				<Table.Cell>
// 					{renderAnyDataScore(row, 'quipment', this.context.localized.t, false)}
// 				</Table.Cell>
// 				<Table.Cell>
// 					{bonuses.map(skill =>
// 						<CrewStat gridStyle={{ gap: '0.5em' }} scale={0.75} data={skill} skill_name={skill.skill} />
// 					)}
// 				</Table.Cell>
// 				<Table.Cell>
// 					{row.data}
// 				</Table.Cell>
// 			</React.Fragment>)
// 		}
// 		else {
// 			return (
// 				<React.Fragment>
// 					<Table.Cell>
// 						{renderMainDataScore(row, false)}
// 					</Table.Cell>
// 					<Table.Cell>
// 						{row.data}
// 					</Table.Cell>
// 				</React.Fragment>)
// 		}
// 	}

// 	render() {
// 		const { t, tfmt } = this.context.localized;
// 		const { errorMessage, item_data } = this.state;
// 		const { playerData } = this.context.player;
// 		const { items } = this.context.core;
// 		const isQp = !!this.state.item_data?.item?.kwipment;

// 		const crewTableCells = [
// 			{ width: 2, column: 'data', title: t('items.columns.item_demand_levels') }
// 		] as ITableConfigRow[];

// 		if (isQp) {
// 			crewTableCells.unshift(
// 				{ width: 1, column: 'ranks.scores.quipment', title: t('rank_names.scores.quipment'), reverse: true },
// 				{
// 					reverse: true,
// 					width: 2, column: 'bonus', title: t('global.bonus'),
// 					customCompare: (a, b) => {
// 						let r = a.bonus - b.bonus;
// 						if (!r) r = a.max_rarity - b.max_rarity;
// 						if (!r) r = a.ranks.scores.overall - b.ranks.scores.overall;
// 						if (!r) r = a.name.localeCompare(b.name);
// 						return r;
// 					}
// 				}
// 			);
// 		}

// 		crewTableCells.unshift(
// 			{
// 				width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'),
// 				reverse: true,
// 				customCompare: (a, b) => {
// 					let r = a.ranks.scores.overall - b.ranks.scores.overall;
// 					return r;
// 				}
// 			}
// 		);

// 		if (item_data === undefined || errorMessage !== undefined) {
// 			return (
// 				<>
// 					<Header as="h3">Item information</Header>
// 					{errorMessage && (
// 						<Message negative>
// 							<Message.Header>Unable to load item information</Message.Header>
// 							<pre>{errorMessage.toString()}</pre>
// 						</Message>
// 					)}
// 					{!errorMessage && (
// 						<div>
// 							<Icon loading name="spinner" /> Loading...
// 						</div>
// 					)}
// 				</>
// 			);
// 		}

// 		console.log(item_data);

// 		const { bonuses, bonusText } = getItemBonuses(item_data.item);

// 		// TODO: share this code with equipment.ts
// 		let demands = [] as IDemand[];
// 		if (item_data.item.recipe) {
// 			for (let iter of item_data.item.recipe.list) {
// 				let recipeEquipment = items?.find(item => item.symbol === iter.symbol);
// 				if (recipeEquipment) {
// 					demands.push({
// 						crewSymbols: [],
// 						count: iter.count,
// 						symbol: iter.symbol,
// 						equipment: recipeEquipment,
// 						factionOnly: iter.factionOnly,
// 						have: 0
// 					});
// 				}
// 			}
// 		}

// 		const haveCount = this.haveCount(item_data.item.symbol);
// 		const ship = item_data.item.type === 8 ? this.context.core.ships?.find(f => f.symbol === item_data.item.symbol.replace("_schematic", "")) : undefined;
// 		const builds = item_data.builds;

// 		const ltMarginSmall = window?.innerWidth && window.innerWidth < DEFAULT_MOBILE_WIDTH ? "0px" : "0.375em";
// 		const ltMargin = window?.innerWidth && window.innerWidth < DEFAULT_MOBILE_WIDTH ? "0px" : "0.75em";
// 		const ltMarginBig = window?.innerWidth && window.innerWidth < DEFAULT_MOBILE_WIDTH ? "0px" : "1em";
// 		const traits = this.context.localized.TRAIT_NAMES;

// 		return (
// 			<div>

// 				<CrewHoverStat targetGroup='item_info' />
// 				<ShipHoverStat targetGroup='item_info_ships' />
// 				<ItemHoverStat navigate={(symbol) => this.changeComponent(symbol)} targetGroup='item_info_items' />

// 				<div style={{
// 					paddingTop: "2em",
// 					marginBottom: "1em",
// 					display: "flex",
// 					alignItems: "center",
// 					justifyContent: "center",
// 					flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
// 				}}>
// 					<ItemDisplay
// 						targetGroup='item_info_items'
// 						playerData={playerData}
// 						allItems={items}
// 						itemSymbol={item_data.item.symbol}
// 						style={{
// 							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '0 0 0.25em 0' : '0.25em 0 0 0'
// 						}}
// 						src={`${process.env.GATSBY_ASSETS_URL}${item_data.item.imageUrl}`}
// 						size={128}
// 						rarity={item_data?.item.rarity ?? 0}
// 						maxRarity={item_data?.item.rarity ?? 0}
// 					/>
// 					<div style={{
// 						display: "flex",
// 						flexDirection: "column",
// 						justifyContent: "space-evenly",
// 						alignItems: "left"
// 					}}>
// 						<Header style={{
// 							margin: 0,
// 							marginLeft: ltMarginSmall,
// 							textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'center' : 'left'
// 						}} as="h2">{item_data.item.name}</Header>
// 						{item_data?.item.flavor && <div style={{ textAlign: 'left', marginLeft: ltMargin, fontStyle: "italic", width: "100%" }}>{item_data.item.flavor?.replace(/\<b\>/g, '').replace(/\<\/b\>/g, '')}</div>}
// 						<div style={{ marginLeft: ltMargin }}>{!!bonusText?.length && renderBonuses(bonuses)}</div>
// 						{!!haveCount && <div style={{ margin: 0, marginLeft: ltMarginBig, color: "lightgreen" }}>{t('items.columns.owned').toLocaleUpperCase()} ({haveCount})</div>}
// 						{!!item_data.item.duration &&
// 							<div
// 								style={{
// 									textAlign: "left",
// 									//fontStyle: "italic",
// 									fontSize: "1em",
// 									marginTop: "2px",
// 									marginBottom: "4px",
// 									marginLeft: ltMargin
// 								}}
// 							>
// 								<div><b>{t('ship.duration')}:</b>&nbsp;
// 									<i>{formatDuration(item_data.item.duration, t)}</i></div>
// 							</div>}
// 						{!!item_data.item.max_rarity_requirement &&
// 							<div style={{
// 								textAlign: "left",
// 								//fontStyle: "italic",
// 								fontSize: "1em",
// 								marginTop: "2px",
// 								marginBottom: "4px",
// 								marginLeft: ltMargin
// 							}}>
// 								{tfmt('items.equippable_by_rarity', {
// 									rarity: <span style={{
// 										color: CONFIG.RARITIES[item_data.item.max_rarity_requirement].color,
// 										fontWeight: 'bold'
// 									}}>
// 										{CONFIG.RARITIES[item_data.item.max_rarity_requirement].name}
// 									</span>
// 								})}
// 							</div>}
// 						{!!item_data.item.kwipment && !!item_data.item.traits_requirement?.length &&
// 							<div
// 								style={{
// 									textAlign: "left",
// 									//fontStyle: "italic",
// 									fontSize: "1em",
// 									marginTop: "2px",
// 									marginBottom: "4px",
// 									marginLeft: ltMargin
// 								}}
// 							>
// 								<div><b>{tfmt('items.required_traits', {
// 									traits: <i>
// 										{printRequiredTraits(item_data.item, traits, t)}
// 									</i>
// 								})}</b>&nbsp;
// 								</div>
// 							</div>}
// 					</div>

// 				</div>

// 				{item_data.item.type === 8 && !!ship &&
// 					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center" }}>
// 						<ShipTarget inputItem={ship} targetGroup='item_info_ships'>
// 							<Link to={`/ship_info?ship=${ship.symbol}`}>
// 								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center" }}>
// 									<ItemDisplay
// 										src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
// 										size={128}
// 										rarity={ship.rarity}
// 										maxRarity={ship.rarity}
// 									/>
// 									{ship.name}
// 								</div>
// 							</Link>
// 						</ShipTarget>

// 					</div>}

// 				{!!item_data.item.recipe && !!item_data.item.recipe.list?.length && (
// 					<div>
// 						<Header as="h3">
// 							{tfmt('items.craft_for_chrons', {
// 								cost: <><img title={"Chronitons"} style={{ width: "1.5em", margin: 0, padding: 0, marginBottom: "2px" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} /> {item_data.item.recipe.craftCost.toLocaleString()}</>
// 							})}:</Header>
// 						<Grid columns={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 1 : 3} padded>
// 							{demands.map((entry, idx) => {
// 								if (!entry.equipment) return <></>
// 								const hc = this.haveCount(entry.equipment.symbol);
// 								const scolor = hc < entry.count ? 'tomato' : undefined;

// 								return <Grid.Column key={idx}>
// 									<Popup
// 										trigger={
// 											<Header
// 												style={{ display: 'flex', cursor: 'zoom-in' }}
// 												icon={
// 													<ItemDisplay
// 														playerData={playerData}
// 														itemSymbol={entry.equipment.symbol}
// 														allItems={this.context.core.items}
// 														targetGroup='item_info_items'
// 														style={{ marginRight: "0.5em" }}
// 														src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
// 														size={48}
// 														maxRarity={entry.equipment.rarity}
// 														rarity={entry.equipment.rarity}
// 													/>
// 												}
// 												content={entry.equipment.name}
// 												subheader={<div style={{ fontSize: "0.8em" }}>{t('items.n_needed', { n: `${entry.count}` })} {playerData?.player ? <>({tfmt('items.n_owned', { n: <span style={{ color: scolor }}>{hc}</span> })})</> : ""} {entry.factionOnly ? ` (${t('items.faction_only')})` : ''}</div>}
// 											/>
// 										}
// 										header={
// 											<a style={{ cursor: "pointer" }} onClick={(e) => this.changeComponent(entry.symbol)}>
// 												{CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
// 											</a>
// 										}
// 										content={<ItemSources item_sources={entry.equipment.item_sources} />}
// 										on="click"
// 										wide
// 									/>
// 								</Grid.Column>
// 							})}
// 						</Grid>
// 						<br />

// 					</div>
// 				)}

// 				{!!(item_data.item.item_sources.length > 0) && (
// 					<div>
// 						<Header as="h3">{t('items.item_sources')}:</Header>
// 						<ItemSources item_sources={item_data.item.item_sources} />
// 						<br />
// 					</div>
// 				)}

// 				{item_data.crew_levels.length > 0 && (
// 					<div>
// 						<Header as="h3">{t('items.equippable_by', { crew: '' })}</Header>
// 						{!!this.context.player.playerData &&
// 							<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: "0.5em" }}>
// 								<Checkbox id="item_info_owned_check_boolean" checked={this.state.owned} onChange={(e, { checked }) => this.setOwned(checked || false)} />
// 								<label htmlFor="item_info_owned_check_boolean" style={{ margin: "0.5em", cursor: "pointer" }}>{t('crew_ownership.owned')}</label>
// 							</div>}
// 						<CrewConfigTable
// 							tableConfig={crewTableCells}
// 							renderTableCells={this.renderTableCells}
// 							crewFilters={[]}
// 							pageId='item_info'
// 							rosterCrew={this.makeCrewFlavors(item_data.crew_levels)}
// 							rosterType='allCrew'
// 						/>
// 						<br />
// 					</div>
// 				)}

// 				{!!builds && builds.length > 0 && (
// 					<div>
// 						<Header as="h3">{t('items.is_used_to_build')}:</Header>
// 						<EquipmentTable
// 							pageId='item_info'
// 							hideOwnedColumns={true}
// 							items={builds}
// 							navigate={(symbol) => this.changeComponent(symbol)}
// 						/>
// 					</div>
// 				)}
// 			</div>
// 		);
// 	}
// }

export default ItemInfoPage;
