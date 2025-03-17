import { Link, navigate } from "gatsby";
import React, { Component } from "react";
import {
	Checkbox,
	Dropdown,
	DropdownItemProps,
	Icon,
	Input,
	Pagination,
	Rating,
	SemanticWIDTHS,
	Table,
} from "semantic-ui-react";

import { UnifiedWorker } from "../../typings/worker";
import {
	IConfigSortData,
	IResultSortDataBy,
	sortDataBy,
} from "../../utils/datasort";
import {
	exportItemsAlt,
	getItemBonuses,
	isQuipmentMatch,
} from "../../utils/itemutils";

import CONFIG from "../CONFIG";
import { GlobalContext } from "../../context/globalcontext";
import { CrewMember } from "../../model/crew";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import { PlayerCrew, TranslateMethod } from "../../model/player";
import { EquipmentWorkerConfig, EquipmentWorkerResults } from "../../model/worker";
import {
	downloadData,
	getCrewQuipment,
	oneCrewCopy,
	qbitsToSlots,
	shortToSkill,
	skillToShort,
} from "../../utils/crewutils";
import { calcItemDemands, canBuildItem } from "../../utils/equipment";
import { TinyStore } from "../../utils/tiny";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { CrewItemsView } from "../item_presenters/crew_items";
import { CrewPreparer } from "../item_presenters/crew_preparer";
import { CrewPresenter } from "../item_presenters/crew_presenter";
import { renderBonuses } from "../item_presenters/item_presenter";
import ItemDisplay from "../itemdisplay";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { ITableConfigRow } from "../searchabletable";
import { CrewKwipTrial, CrewType, ItemSearchOpts, ItemsTableProps, OwnedType, printRequiredTraits } from "./utils";
import { useStateWithStorage } from "../../utils/storage";
import { ItemsContextProvider } from "./contextprovider";

export interface CustomFieldDef {
	field: string;
	text: string;
	format?: (value: any) => string;
	width?: SemanticWIDTHS;
	reverse?: boolean
}


type ItemsTableState = {
	column: any;
	direction: "descending" | "ascending" | null;
	data?: (EquipmentCommon | EquipmentItem)[];
	filteredData?: (EquipmentCommon | EquipmentItem)[];
	searchOpts?: ItemSearchOpts;
	pagination_rows: number;
	pagination_page: number;

	/** Add needed but unowned items to list */
	addNeeded?: boolean;
	crewSelection: string;
	crewType: CrewType;
	traits?: string[];
	skills?: string[];
	trials?: CrewKwipTrial[];
	ownedQuipment?: OwnedType;
	ignoreLimit?: boolean;
};

export const ItemsTable = (props: ItemsTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { items } = globalContext.core;
	const pageName = props.pageName ?? 'items_table'

	return <React.Fragment>
		<ItemsContextProvider pageName={pageName}>
			<React.Fragment>
				<ItemsTableComponent {...props} />
			</React.Fragment>
		</ItemsContextProvider>

	</React.Fragment>

}


const ItemsHeaderComponent = (props: ItemsTableProps) => {

}

const ItemsTableComponent = (props: ItemsTableProps) => {


	return <>
	</>
}

const pagingOptions = [
	{ key: "0", value: 10, text: "10" },
	{ key: "1", value: 25, text: "25" },
	{ key: "2", value: 50, text: "50" },
	{ key: "3", value: 100, text: "100" },
];

class ItemsTableOld extends Component<ItemsTableProps, ItemsTableState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;
	readonly tiny: TinyStore;
	private lastData: (EquipmentCommon | EquipmentItem)[] | undefined;

	constructor(props: ItemsTableProps) {
		super(props);
		this.tiny = TinyStore.getStore(
			(props.pageName ? props.pageName + "_" : "") + "profile_items"
		);

		this.state = {
			crewType: this.tiny.getValue<CrewType>("crewType") ?? "quippable",
			crewSelection: this.tiny.getValue<string>("crewSelection") ?? "",
			column: null,
			direction: null,
			searchOpts: this.tiny.getValue("searchOptions"),
			pagination_rows:
				props.init_rows ??
				this.tiny.getValue<number>("pagination_rows", 10) ??
				10,
			pagination_page: 1,
			data: props.data,
			addNeeded:
				props.addNeeded ?? this.tiny.getValue<boolean>("addNeeded", false),
			ownedQuipment: "all",
		};

		this.lastData = undefined;
	}

	private setCrewSelection = (value: string) => {
		this.tiny.setValue("crewSelection", value);
		if (value === "") {
			this.setState({ ...this.state, crewSelection: value, trials: [] });
		} else {
			this.setState({ ...this.state, crewSelection: value });
		}
	};

	private setRows = (value: number) => {
		this.tiny.setValue("pagination_rows", value, true);
		this.setState({
			...this.state,
			pagination_rows: value,
			pagination_page: 1,
		});
	};

	private setCrewType = (value: CrewType) => {
		this.tiny.setValue("crewType", value);
		this.setState({ ...this.state, crewType: value, crewSelection: "" });
	};

	private findFirstCrew = (symbol: string) => {
		const { playerData } = this.context.player;
		const { crewType } = this.state;
		let found = playerData?.player.character.crew.find((d) => {
			if (d.symbol !== symbol) return false;

			if (crewType === "frozen") {
				if (!d.immortal || d.immortal <= 0) return false;
			} else if (crewType === "quippable") {
				if (!d.q_bits || d.q_bits < 100) return false;
			} else {
				if (d.immortal !== -1) return false;
			}

			return true;
		});

		return found;
	};

	private makeCrewChoices = () => {
		const crewChoices = [] as DropdownItemProps[];
		const { crew } = this.context.core;
		const { playerData } = this.context.player;
		const { crewType, skills, traits } = this.state;

		let data = this._getFilteredItems(true) as EquipmentItem[];

		if (this.props?.crewMode && crew?.length) {
			[...crew]
				.sort((a, b) => a.name.localeCompare(b.name))
				.forEach((c) => {
					if (
						playerData &&
						["owned", "quippable", "frozen"].includes(crewType)
					) {
						if (!this.findFirstCrew(c.symbol)) return;
					}

					if (skills?.length) {
						if (
							!skills.some(
								(skill) =>
									(shortToSkill(skill?.toUpperCase()) ?? "") in c.base_skills
							)
						)
							return;
					}

					if (traits?.length) {
						if (!traits.includes("any") && !traits.includes("none")) {
							if (
								!traits.some(
									(trait) =>
										c.traits.includes(trait) || c.traits_hidden.includes(trait)
								)
							)
								return;
						} else if (data && traits.includes("any")) {
							if (!data.some((d) => isQuipmentMatch(c, d))) return;
						}
					}

					crewChoices.push({
						key: c.symbol,
						value: c.symbol,
						text: c.name,
						content: (
							<React.Fragment>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "48px auto",
										gridTemplateAreas: "'img text' 'img rarity'",
									}}
								>
									<img
										src={`${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}`}
										style={{
											height: "32px",
											gridArea: "img",
										}}
									/>
									<div
										style={{
											gridArea: "text",
											textAlign: "left",
											marginBottom: "0.25em",
										}}
									>
										{c.name}
									</div>
									<div style={{ gridArea: "rarity" }}>
										<Rating
											icon={"star"}
											maxRating={c.max_rarity}
											rating={c.max_rarity}
											size={"tiny"}
										/>
									</div>
								</div>
							</React.Fragment>
						),
						// image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` },
						// text: c.name
					});
				});
		}
		return crewChoices;
	};

	private runWorker() {
		const worker = new UnifiedWorker();
		const { playerData } = this.context.player;

		const items = this.context.core.items;
		const { addNeeded } = this.state;

		var me = this;

		if (playerData?.calculatedDemands?.length) {
			let data = [...playerData.calculatedDemands];

			if (addNeeded) {
				data.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
				me.setState({
					...this.state,
					data,
					column: "quantity",
					direction: "ascending",
					pagination_page: 1,
				});
			} else {
				me.setState({ ...this.state, data });
			}
			return;
		}

		worker.addEventListener(
			"message",
			(message: { data: { result: EquipmentWorkerResults } }) => {
				if (playerData)
					playerData.calculatedDemands = message.data.result
						.items as EquipmentItem[];
				let data = [...message.data.result.items];

				if (addNeeded) {
					data.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
					me.setState({
						...this.state,
						data,
						column: "quantity",
						direction: "ascending",
						pagination_page: 1,
					});
				} else {
					me.setState({ ...this.state, data });
				}
			}
		);

		worker.postMessage({
			worker: "equipmentWorker",
			config: {
				playerData,
				items,
				addNeeded: this.state.addNeeded,
			} as EquipmentWorkerConfig,
		});
	}
	componentDidMount() {
		this.initData();
	}

	componentDidUpdate(
		prevProps: Readonly<ItemsTableProps>,
		prevState: Readonly<ItemsTableState>,
		snapshot?: any
	): void {
		if (this.props.data && this.props.data !== this.state.data) {
			this.setState({ ...this.state, data: this.props.data });
		} else {
			this.initData();
		}
	}

	initData() {
		const { playerData } = this.context.player;

		if (playerData) {
			if (
				playerData.calculatedDemands &&
				this.state.data?.length &&
				this.state.data?.length > 0
			)
				return;
		}

		const { items, crew } = this.context.core;
		if (!items || !crew) return;

		if (this.state.data?.length && this.lastData === this.state.data) {
			return;
		} else {
			this.lastData = this.state.data;
		}

		if (!this.props.noWorker) {
			this.runWorker();
		} else if (this.props.data?.length) {
			this.setState({ ...this.state, data: this.props.data });
		}
	}

	private _onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	private makeTrialCrew = (crew: PlayerCrew) => {
		if (!crew || !this.context.core.crew?.length) return undefined;

		crew = oneCrewCopy({
			...(this.context.core.crew.find(
				(f) => f.symbol === crew.symbol
			) as PlayerCrew),
			...crew,
		}) as PlayerCrew;

		if (crew.level === undefined || crew.rarity === undefined) {
			crew.kwipment = [0, 0, 0, 0];
			crew.kwipment_expiration = [0, 0, 0, 0];
			crew.rarity = crew.max_rarity;
			crew.level = 100;
			crew.skills = crew.base_skills;
			crew.q_bits = 1300;
		} else if (crew.immortal > 0) {
			crew.q_bits = 1300;
		}

		if (this.state.ignoreLimit) {
			crew.q_bits = 1300;
		}

		let trial = this.state.trials?.find((f) => f.symbol === crew.symbol);

		if (!trial) {
			trial = {
				symbol: crew.symbol,
				kwipment: crew.kwipment
					.map((k: number | number[]) => (typeof k === "number" ? k : k[1]))
					.filter((n) => !!n),
				kwipment_expiration: crew.kwipment_expiration
					.map((k: number | number[]) => (typeof k === "number" ? k : k[1]))
					.filter((n) => !!n),
			} as CrewKwipTrial;

			let trials = [...(this.state.trials ?? [])];
			trials.push(trial);
			window.setTimeout(() => {
				this.setState({ ...this.state, trials });
			});
		}
		if (trial) {
			let slots = qbitsToSlots(crew?.q_bits ?? 0);
			crew.kwipment = trial.kwipment?.slice(0, slots) ?? [];
			crew.kwipment_expiration =
				trial.kwipment_expiration?.slice(0, slots) ?? [];
			slots = 4 - crew.kwipment.length;
			for (let i = 0; i < slots; i++) {
				crew.kwipment.push(0);
			}
		}

		return CrewPreparer.prepareCrewMember(
			crew,
			"quipment",
			"full",
			this.context,
			true
		)[0];
	};

	private maxTrial(crew: PlayerCrew) {
		let trials = this.state.trials ?? [];
		let currtrial = trials.find((t) => t.symbol === crew.symbol) ?? {
			symbol: crew,
			kwipment: [],
		};
		if (currtrial) {
			return currtrial.kwipment.length >= qbitsToSlots(crew.q_bits ?? 0);
		}
		return false;
	}

	private getTrial(crew: string, item: number) {
		let trials = this.state.trials ?? [];
		let currtrial = trials.find((t) => t.symbol === crew) ?? {
			symbol: crew,
			kwipment: [],
			kwipment_expiration: [],
		};
		if (currtrial) {
			currtrial = { ...currtrial };

			if (currtrial.kwipment?.includes(item)) {
				return true;
			}
		}
		return false;
	}

	private setTrial(crew: string, item: number, state: boolean) {
		let trials = this.state.trials ?? [];
		let currtrial = trials.find((t) => t.symbol === crew) ?? {
			symbol: crew,
			kwipment: [],
			kwipment_expiration: [],
		};

		if (currtrial) {
			currtrial = { ...currtrial };

			if (currtrial.kwipment?.includes(item) && state === false) {
				let n = currtrial.kwipment.indexOf(item);
				currtrial.kwipment =
					currtrial.kwipment?.filter((f) => f !== item) ?? [];
				currtrial.kwipment_expiration = currtrial.kwipment_expiration.filter(
					(f, idx) => idx !== n
				);
			} else if (!currtrial.kwipment?.includes(item) && state === true) {
				currtrial.kwipment ??= [];
				currtrial.kwipment_expiration ??= [];
				currtrial.kwipment.push(item);
				currtrial.kwipment_expiration.push(0);
			}
			trials = trials.filter((f) => f.symbol !== crew);
			trials.push(currtrial);
			// if (currtrial.kwipment.length) {
			// 	trials.push(currtrial);
			// }
		}

		this.setState({ ...this.state, trials });
	}

	private _handleSort(clickedColumn) {
		const { column, direction } = this.state;
		let { data } = this.state;
		if (!data) return;

		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction:
				clickedColumn === column
					? direction
					: clickedColumn === "quantity"
						? "ascending"
						: null,
		};

		if (clickedColumn === "buffs") {
			if (clickedColumn === column) {
				sortConfig.direction =
					sortConfig.direction === "ascending" ? "descending" : "ascending";
			} else {
				sortConfig.direction = direction ?? "ascending";
			}

			const factor = sortConfig.direction === "ascending" ? 1 : -1;

			data.sort((a, b) => {
				let abonus = a.bonuses ?? {};
				let bbonus = b.bonuses ?? {};

				let askills = Object.values(abonus).reduce((p, n) => p + n, 0);
				let bskills = Object.values(bbonus).reduce((p, n) => p + n, 0);

				return (askills - bskills) * factor;
			});

			this.setState({
				column: sortConfig.field,
				direction: sortConfig.direction,
				pagination_page: 1,
				data,
			});

			return;
		}

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);

		this.setState({
			column: sorted.field,
			direction: sorted.direction,
			pagination_page: 1,
			data: sorted.result,
		});
	}

	private _handleNavigate = (symbol: string) => {
		if (this.props.navigate) {
			this.props.navigate(symbol);
		} else {
			navigate("/item_info?symbol=" + symbol);
		}
	};

	private _handleFilter = (text: string | undefined) => {
		const searchOpts = {
			...(this.state.searchOpts ?? {}),
			filterText: text ?? "",
		};
		this.tiny.setValue("searchOptions", searchOpts);

		this.setState({ ...this.state, searchOpts, pagination_page: 1 });
	};

	private _handleTraits = (values: string[] | undefined) => {
		if (values?.length) {
			if (values[values.length - 1] === "none") {
				values = ["none"];
			} else if (values[values.length - 1] === "any") {
				values = ["any"];
			} else if (values.some((v) => v !== "none" && v !== "any")) {
				values = values.filter((v) => v !== "none" && v !== "any");
			} else if (values?.includes("none")) {
				values = ["none"];
			} else if (values?.includes("any")) {
				values = ["any"];
			}
		}

		const searchOpts = {
			...(this.state.searchOpts ?? {}),
			filterText: !!values?.length ? "trait:" + values?.join(",") : "",
		};
		this.tiny.setValue("searchOptions", searchOpts);

		this.setState({
			...this.state,
			searchOpts,
			traits: values,
			skills: [],
			pagination_page: 1,
		});
	};

	private _handleSkills = (values: string[] | undefined) => {
		const searchOpts = {
			...(this.state.searchOpts ?? {}),
			filterText: !!values?.length ? "skill:" + values?.join(",") : "",
		};
		this.tiny.setValue("searchOptions", searchOpts);

		this.setState({
			...this.state,
			searchOpts,
			skills: values,
			traits: [],
			pagination_page: 1,
		});
	};

	private _handleItemType = (values: number[] | undefined) => {
		const searchOpts = { ...(this.state.searchOpts ?? {}), itemType: values };
		this.tiny.setValue("searchOptions", searchOpts);
		this.setState({ ...this.state, searchOpts, pagination_page: 1 });
	};

	private _handleRarity = (values: number[] | undefined) => {
		const searchOpts = { ...(this.state.searchOpts ?? {}), rarity: values };
		this.tiny.setValue("searchOptions", searchOpts);
		this.setState({ ...this.state, searchOpts, pagination_page: 1 });
	};

	private _handleOwned = (value: OwnedType) => {
		this.tiny.setValue("ownedQuipment", value, true);
		this.setState({ ...this.state, ownedQuipment: value });
	};

	private _handleAddNeeded = (value: boolean | undefined) => {
		if (this.state.addNeeded === value) return;
		const { playerData } = this.context.player;

		if (playerData) {
			delete playerData.calculatedDemands;
		}

		this.tiny.setValue("addNeeded", value ?? false);
		this.setState({
			...this.state,
			data: undefined,
			addNeeded: value ?? false,
		});
	};

	private _getFilteredItems(ignoreCrewSelection?: boolean) {
		const { ownedQuipment, crewSelection } = this.state;
		let data = [...(this.state.data ?? [])];

		const filterText = this.state.searchOpts?.filterText?.toLocaleLowerCase();
		const { types, crewMode } = this.props;

		const { rarity, itemType } = this.state.searchOpts ?? {};
		const { playerData } = this.context.player;

		if (
			(filterText && filterText !== "") ||
			!!rarity?.length ||
			!!itemType?.length ||
			!!types?.length ||
			!!crewSelection?.length
		) {
			data = data.filter((f) => {
				if (ownedQuipment !== "all" && f.type === 14 && playerData) {
					let g = f as EquipmentItem;
					if (!g.demands?.some((d) => d.have)) {
						g.demands = calcItemDemands(
							g,
							this.context.core.items,
							playerData.player.character.items
						);
					}
					if (ownedQuipment === "both") {
						if (
							!canBuildItem(g, true) &&
							!playerData.player.character.items.some(
								(item) =>
									item.archetype_id?.toString() === f.kwipment_id?.toString()
							)
						)
							return false;
					} else if (ownedQuipment === "buildable") {
						if (!canBuildItem(g, true)) return false;
					} else if (ownedQuipment === "owned") {
						if (
							!playerData.player.character.items.some(
								(item) =>
									item.archetype_id?.toString() === f.kwipment_id?.toString()
							)
						)
							return false;
					}
				}

				let textPass = true;
				let rarePass = true;
				let itemPass = true;
				let crewPass = true;

				if (!!types?.length && !types.includes(f.type)) return false;

				if (filterText && filterText !== "") {
					if (filterText.includes(":")) {
						let sp = filterText.split(":");
						if (sp?.length === 2) {
							if (sp[0] === "trait") {
								sp = sp[1].split(",");

								let trait_any = false;
								let trait_none = false;

								sp = sp.filter((f) => {
									if (f === "any") {
										trait_any = true;
									} else if (f === "none") {
										trait_none = true;
									} else {
										return true;
									}
									return false;
								});

								if (trait_any) {
									if (!f.traits_requirement?.length) return false;
								} else if (trait_none) {
									if (!!f.traits_requirement?.length) return false;
								} else {
									if (sp?.length) {
										if (
											!f.traits_requirement?.some((g) =>
												sp.some((s) => s === g)
											)
										)
											return false;
									}
								}
							} else if (sp[0] === "skill" && f.bonuses) {
								let bmap = getItemBonuses(f as EquipmentItem);
								if (bmap?.bonuses) {
									sp = sp[1].split(",");
									if (
										!Object.keys(bmap?.bonuses).some((sk) =>
											sp.some(
												(b) =>
													b.toLowerCase() === skillToShort(sk)?.toLowerCase()
											)
										)
									)
										return false;
								}
							}
						}
					} else {
						textPass =
							f.name?.toLowerCase().includes(filterText) ||
							f.short_name?.toLowerCase().includes(filterText) ||
							f.flavor?.toLowerCase().includes(filterText) ||
							CONFIG.RARITIES[f.rarity].name
								.toLowerCase()
								.includes(filterText) ||
							CONFIG.REWARDS_ITEM_TYPE[f.type]
								.toLowerCase()
								.includes(filterText);
					}
				}

				if (!!rarity?.length) {
					rarePass = rarity?.some((r) => f.rarity == r);
				}
				if (!!itemType?.length) {
					itemPass = itemType?.some((t) => f.type == t);
				}

				if (
					!ignoreCrewSelection &&
					!!crewMode &&
					!!crewSelection?.length &&
					typeof crewSelection === "string"
				) {
					let selCrew = this.context.core.crew.find(
						(crew) => crew.symbol === crewSelection
					);
					if (selCrew) {
						if (f.type === 14) {
							if (
								!!f.max_rarity_requirement &&
								f.max_rarity_requirement < selCrew.max_rarity
							)
								return false;
							if (f.traits_requirement?.length) {
								if (f.traits_requirement_operator === "and") {
									if (
										!f.traits_requirement?.every(
											(t) =>
												selCrew?.traits.includes(t) ||
												selCrew?.traits_hidden.includes(t)
										)
									)
										return false;
								} else {
									if (
										!f.traits_requirement?.some(
											(t) =>
												selCrew?.traits.includes(t) ||
												selCrew?.traits_hidden.includes(t)
										)
									)
										return false;
								}
							}
							let bonuses = getItemBonuses(f as EquipmentItem)?.bonuses;
							if (bonuses)
								crewPass = Object.keys(bonuses).some(
									(skill) => !!selCrew && skill in selCrew.base_skills
								);
						} else {
							crewPass = false;
						}
					}
				}

				return textPass && rarePass && itemPass && crewPass;
			});
		}

		return data;
	}

	renderBuffs(item: EquipmentItem | EquipmentCommon) {
		const { bonuses } = getItemBonuses(item as EquipmentItem);
		return renderBonuses(bonuses, "1em", "0.25em");
	}

	createFlavor(item: EquipmentItem | EquipmentCommon) {
		const { t, tfmt } = this.context.localized;
		let output = [] as JSX.Element[];

		let flavor = item.flavor ?? "";
		if (flavor.startsWith("Equippable by: ")) {
			let crew = flavor
				.replace("Equippable by: ", "")
				.split(", ")
				?.map((s) => this.context.core.crew.find((c) => c.name === s || c.symbol === s))
				.filter((s) => !!s) as CrewMember[];
			if (crew?.length)
				output.push(
					<div>
						{tfmt("items.equippable_by", {
							crew: crew
								.map((crew) => (
									<Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>
								))
								.reduce((p, n) => (
									<>
										{p}, {n}
									</>
								)),
						})}
					</div>
				);
		}
		if (output.length) flavor = '';

		const crew = this.context.core.crew;

		if (
			item.kwipment &&
			(item.traits_requirement?.length || item.max_rarity_requirement)
		) {
			let found: CrewMember[] | null = null;

			const bonus = getItemBonuses(item as EquipmentItem);
			const traits = this.context.localized.TRAIT_NAMES;

			found = crew.filter((f) => {
				let mrq = item.max_rarity_requirement ?? f.max_rarity;
				let rr = mrq >= f.max_rarity;

				if (item.traits_requirement?.length) {
					if (item.traits_requirement_operator === "and") {
						rr &&= item.traits_requirement?.every(
							(t) => f.traits.includes(t) || f.traits_hidden.includes(t)
						);
					} else {
						rr &&= item.traits_requirement?.some(
							(t) => f.traits.includes(t) || f.traits_hidden.includes(t)
						);
					}
				}
				rr &&= Object.keys(bonus.bonuses).some(
					(skill) => skill in f.base_skills
				);

				return rr;
			});

			if (found?.length) {
				flavor ??= "";

				if (flavor?.length) {
					flavor += "\n";
				}
				if (found.length > 5) {
					if (item.traits_requirement?.length) {
						if (item.max_rarity_requirement) {
							output.push(
								<div>
									{tfmt("items.equippable_by_rarity_traits", {
										rarity: (
											<span
												style={{
													color:
														CONFIG.RARITIES[item.max_rarity_requirement].color,
													fontWeight: "bold",
												}}
											>
												{CONFIG.RARITIES[item.max_rarity_requirement].name}
											</span>
										),
										traits: printRequiredTraits(item, traits, t),
									})}
								</div>
							);
							flavor += t("items.equippable_by_rarity_traits", {
								rarity: CONFIG.RARITIES[item.max_rarity_requirement].name,
								traits: `${printRequiredTraits(item, traits, t)}`,
							});
						} else {
							output.push(
								<>
									{tfmt("items.equippable_by_traits", {
										traits: printRequiredTraits(item, traits, t),
									})}
								</>
							);
							flavor += t("items.equippable_by_traits", {
								traits: `${printRequiredTraits(item, traits)}`,
							});
						}
					} else if (item.max_rarity_requirement) {
						output.push(
							<div>
								{tfmt("items.equippable_by_rarity", {
									rarity: (
										<span
											style={{
												color:
													CONFIG.RARITIES[item.max_rarity_requirement].color,
												fontWeight: "bold",
											}}
										>
											{CONFIG.RARITIES[item.max_rarity_requirement].name}
										</span>
									),
								})}
							</div>
						);
						flavor += t("items.equippable_by_rarity", {
							rarity: CONFIG.RARITIES[item.max_rarity_requirement].name,
						});
					} else {
						output.push(
							<div>{t("items.equippable_by", { crew: found.length.toString() })}</div>
						);
						flavor += t("items.equippable_by", { crew: found.length.toString() });
					}
				} else {
					output.push(
						<div>
							{tfmt("items.equippable_by", {
								crew: found
									.map((crew) => (
										<Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>
									))
									.reduce((p, n) => (
										<>
											{p}, {n}
										</>
									)),
							})}
						</div>
					);

					flavor += t("items.equippable_by", {
						crew: [...found.map((f) => f.symbol)].join(", "),
					});
				}
			}
		}
		else if (flavor) {
			output.push(<>{flavor}</>)
		}
		return output;
	}

	render() {
		const { t } = this.context.localized;
		const {
			ownedQuipment,
			skills,
			traits: pftraits,
			crewType,
			crewSelection,
			addNeeded,
			column,
			direction,
			pagination_rows,
			pagination_page,
		} = this.state;
		let data = [...(this.state.data ?? [])];

		const filterText = this.state.searchOpts?.filterText?.toLocaleLowerCase();
		const {
			crewTargetGroup,
			itemTargetGroup,
			types,
			crewMode,
			buffs,
			customFields,
		} = this.props;

		const { rarity, itemType } = this.state.searchOpts ?? {};
		const { playerData } = this.context.player;

		let bReady: boolean = !!data?.length;
		let traits = pftraits;
		if (!traits?.length && filterText?.includes("trait:")) {
			let sp = filterText.split(":");
			traits = sp[1].split(",");
		}

		const skillmap = CONFIG.SKILLS_SHORT.map((ss) => {
			return {
				key: ss.short.toLowerCase(),
				value: ss.short.toLowerCase(),
				text: CONFIG.SKILLS[ss.name],
			};
		});

		if (playerData) {
			if (!playerData.calculatedDemands && !this.props.noWorker) {
				bReady = false;
			}
		}

		const { flavor, hideOwnedInfo, hideSearch } = this.props;

		let totalPages = 0;
		let traitFilterOpts = [] as DropdownItemProps[];

		if (buffs) {
			traitFilterOpts.push({
				key: "any",
				value: "any",
				text: t("items.any_trait_limited"),
			});

			traitFilterOpts.push({
				key: "none",
				value: "none",
				text: t("items.any_non_trait_limited"),
			});

			traitFilterOpts = traitFilterOpts.concat(
				[
					...new Set(
						data.map((d) => d.traits_requirement?.sort() ?? []).flat()
					),
				]?.map((trait) => {
					return {
						key: trait,
						value: trait,
						text: this.context.localized.TRAIT_NAMES[trait],
					};
				})
			);
		}

		const presentTypes = [
			...new Set(
				data
					?.filter((d) => !types?.length || types.includes(d.type))
					.map((d) => d.type) ??
				Object.keys(CONFIG.REWARDS_ITEM_TYPE).map((k) => Number.parseInt(k))
			),
		];
		const crewTypes = [
			{
				key: "all",
				value: "all",
				text: t("options.roster_maintenance.none"),
			},
		];
		if (!!playerData) {
			crewTypes.push({
				key: "quippable",
				value: "quippable",
				text: t("options.roster_maintenance.quippable"),
			});
			crewTypes.push({
				key: "owned",
				value: "owned",
				text: t("crew_ownership.immortal"),
			});
			crewTypes.push({
				key: "frozen",
				value: "frozen",
				text: t("options.crew_status.frozen"),
			});
		}
		if (bReady) {
			data = this._getFilteredItems();
			totalPages = Math.ceil(data.length / this.state.pagination_rows);

			// Pagination
			data = data.slice(
				pagination_rows * (pagination_page - 1),
				pagination_rows * pagination_page
			);
		}

		const rewardFilterOpts = [] as DropdownItemProps[];
		const ownedOpts = [
			{
				key: "all",
				value: "all",
				text: t("items.options.all_quipment"),
			},
			{
				key: "owned",
				value: "owned",
				text: t("items.options.only_owned"),
			},
			{
				key: "buildable",
				value: "buildable",
				text: t("items.options.only_buildable"),
			},
			{
				key: "both",
				value: "both",
				text: t("items.options.owned_or_buildable"),
			},
		] as DropdownItemProps[];

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
				text: CONFIG.REWARDS_ITEM_TYPE[rk],
			});
		});

		Object.keys(CONFIG.RARITIES).forEach((rk) => {
			rarities.push({
				key: Number.parseInt(rk),
				value: Number.parseInt(rk),
				text: CONFIG.RARITIES[rk].name,
			});
		});

		const crewChoices = this.makeCrewChoices();
		const selCrew =
			!!crewMode && !!crewSelection
				? this.makeTrialCrew(
					(this.findFirstCrew(crewSelection) ??
						this.context.core.crew.find(
							(f) => f.symbol === crewSelection
						)) as PlayerCrew
				)
				: undefined;

		if (this.props.noRender) return <></>;

		const isMobile =
			typeof window !== "undefined" && window.innerWidth < DEFAULT_MOBILE_WIDTH;

		const tableConfig = [
			{ width: 3, column: "name", title: t("items.columns.item") },
		] as ITableConfigRow[];

		if (!hideOwnedInfo) {
			tableConfig.push(
				{ width: 1, column: 'quantity', title: t("items.columns.quantity"), reverse: true },
				{ width: 1, column: 'needed', title: t("items.columns.needed"), reverse: true },
			);
		}

		if (!types?.length) {
			tableConfig.push(
				{ width: 1, column: 'type', title: t("items.columns.item_type"), reverse: false },
			);
		}

		tableConfig.push(
			{ width: 1, column: 'rarity', title: t("items.columns.rarity"), reverse: true },
		);

		if (buffs) {
			tableConfig.push(
				{ width: 1, column: 'buffs', title: t("items.columns.item_buffs"), reverse: true },
			);
		}

		if (flavor) {
			tableConfig.push(
				{ width: 1, column: 'flavor', title: t("items.columns.flavor"), reverse: false },
			);
		}

		if (!hideOwnedInfo) {
			tableConfig.push(
				{ width: 1, column: 'factionOnly', title: t("items.faction_only"), reverse: false },
			);
		}

		if (!!customFields?.length) {
			customFields.forEach((field) => {
				tableConfig.push(
					{ width: field.width as number ?? 1, column: field.field, title: t("items.faction_only"), reverse: field.reverse },
				)
			});
		}

		return (
			<div style={{ margin: 0, padding: 0 }}>
				{!hideSearch && (
					<div
						className="ui segment"
						style={{
							display: "flex",
							flexDirection: "column", //isMobile ? "column" : "row",
							alignItems: "flex-start",
							gap: "0.5em",
						}}
					>
						{!!crewMode && (<div
							style={{
								display: "flex", width: "100%",
								height: "3em",
								flexDirection: isMobile ? "column" : "row",
								justifyContent: "flex-start",
								alignItems: "center",
								marginLeft: "0.25em",
							}}
						>
							<div style={{ marginRight: "0.75em", width: isMobile ? "100%" : "50%" }}>
								<Dropdown
									fluid
									search
									selection
									clearable
									placeholder={t("global.search_crew_ellipses")}
									labeled
									options={crewChoices}
									value={crewSelection}
									onChange={(e, { value }) =>
										this.setCrewSelection(value as string)
									}
								/>
							</div>
							<div
								style={{ marginLeft: "0.5em", marginRight: "0.5em" }}
							>
								<Dropdown
									placeholder={t("hints.filter_by_owned_status")}
									options={crewTypes}
									value={crewType}
									onChange={(e, { value }) =>
										this.setCrewType(value as CrewType)
									}
								/>
							</div>
						</div>)}
						<div
							style={{
								display: "flex",
								height: "3em",
								flexDirection: isMobile ? "column" : "row",
								justifyContent: "flex-start",
								alignItems: "center",
								marginLeft: "0.25em",
							}}
						>
							<Input
								style={{ width: "22em" }}
								placeholder={t("global.search_items_ellipses")}
								value={filterText}
								onChange={(e, { value }) =>
									this._handleFilter(value as string)
								}
							/>
							<i
								className="delete icon"
								title={t("global.clear")}
								style={{
									cursor: "pointer",
									marginLeft: "0.75em",
								}}
								onClick={(e) => {
									this._handleFilter(undefined);
								}}
							/>
							{!buffs && (
								<div style={{ marginLeft: "0.5em" }}>
									<Dropdown
										placeholder={t("hints.filter_by_item_type")}
										multiple
										clearable
										scrolling
										options={rewardFilterOpts}
										value={itemType || []}
										onChange={(e, { value }) =>
											this._handleItemType(value as number[] | undefined)
										}
									/>
								</div>
							)}
							{!buffs && (
								<div style={{ marginLeft: "0.5em" }}>
									<Dropdown
										placeholder={t("hints.filter_by_rarity")}
										multiple
										clearable
										options={rarities}
										value={rarity || []}
										onChange={(e, { value }) =>
											this._handleRarity(value as number[] | undefined)
										}
									/>
								</div>
							)}
							{!!buffs && (
								<div style={{ marginLeft: "0.5em" }}>
									<Dropdown
										placeholder={t("hints.filter_by_trait")}
										multiple
										clearable
										scrolling
										options={traitFilterOpts}
										value={traits || []}
										onChange={(e, { value }) =>
											this._handleTraits(value as string[] | undefined)
										}
									/>
								</div>
							)}
							{!!buffs && (
								<div style={{ marginLeft: "0.5em" }}>
									<Dropdown
										placeholder={t("hints.filter_by_skill")}
										multiple
										clearable
										scrolling
										options={skillmap}
										value={skills || []}
										onChange={(e, { value }) =>
											this._handleSkills(value as string[] | undefined)
										}
									/>
								</div>
							)}
							{!!buffs && (
								<div style={{ marginLeft: "0.5em" }}>
									<Dropdown
										placeholder={t("hints.filter_by_owned_status")}
										scrolling
										options={ownedOpts}
										value={ownedQuipment}
										onChange={(e, { value }) =>
											this._handleOwned(value as OwnedType)
										}
									/>
								</div>
							)}
							{!hideOwnedInfo && (
								<div
									style={{
										display: "flex",
										flexDirection: "row",
										justifyItems: "flex-end",
										alignItems: "center",
									}}
								>
									<Checkbox
										checked={addNeeded}
										onChange={(e, { value }) =>
											this._handleAddNeeded(!addNeeded)
										}
									/>
									<span
										style={{ marginLeft: "0.5em", cursor: "pointer" }}
										onClick={(e) => this._handleAddNeeded(!addNeeded)}
									>
										{t("items.show_unowned_needed")}
									</span>
								</div>
							)}
						</div>
					</div>
				)}
				{(!data || !bReady) && (
					<div className="ui medium centered text active inline loader">
						{"Calculating crew demands..."}
					</div>
				)}

				{!!selCrew && (
					<div
						className="ui segment"
						style={{
							backgroundColor: "#333",
							display: "flex",
							justifyContent: "stretch",
							alignItems: "center",
							gap: "1em",
							flexDirection: "column",
						}}
					>
						<CrewPresenter
							selfRender
							quipmentMode
							hideStats
							compact
							plugins={[]}
							crew={selCrew}
							hover={false}
							storeName="items_quip"
						/>
						<CrewItemsView
							targetGroup={"profile_items"}
							itemSize={48}
							crew={selCrew}
							quipment
						/>
						<Checkbox
							label={"Assume Max Slots"}
							checked={!!this.state.ignoreLimit}
							onChange={(e, { checked }) =>
								this.setState({ ...this.state, ignoreLimit: !!checked })
							}
						/>
					</div>
				)}

				{bReady && !!data?.length && (
					<Table
						sortable
						celled
						selectable
						striped
						collapsing
						unstackable
						compact="very"
					>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell
									width={3}
									sorted={
										column === "name" ? direction ?? undefined : undefined
									}
									onClick={() => this._handleSort("name")}
								>
									{t("items.columns.item")}
								</Table.HeaderCell>
								{!hideOwnedInfo && (
									<Table.HeaderCell
										width={1}
										sorted={
											column === "quantity" ? direction ?? undefined : undefined
										}
										onClick={() => this._handleSort("quantity")}
									>
										{t("items.columns.quantity")}
									</Table.HeaderCell>
								)}
								{!hideOwnedInfo && (
									<Table.HeaderCell
										width={1}
										sorted={
											column === "needed" ? direction ?? undefined : undefined
										}
										onClick={() => this._handleSort("needed")}
									>
										{t("items.columns.needed")}
									</Table.HeaderCell>
								)}
								{!types?.length && (
									<Table.HeaderCell
										width={1}
										sorted={
											column === "type" ? direction ?? undefined : undefined
										}
										onClick={() => this._handleSort("type")}
									>
										{t("items.columns.item_type")}
									</Table.HeaderCell>
								)}
								<Table.HeaderCell
									width={1}
									sorted={
										column === "rarity" ? direction ?? undefined : undefined
									}
									onClick={() => this._handleSort("rarity")}
								>
									{t("items.columns.rarity")}
								</Table.HeaderCell>
								{!!buffs && (
									<Table.HeaderCell
										width={2}
										sorted={
											column === "buffs" ? direction ?? undefined : undefined
										}
										onClick={() => this._handleSort("buffs")}
									>
										{t("items.columns.item_buffs")}
									</Table.HeaderCell>
								)}
								{!!flavor && (
									<Table.HeaderCell
										width={2}
										sorted={
											column === "flavor" ? direction ?? undefined : undefined
										}
										onClick={() => this._handleSort("flavor")}
									>
										{t("items.columns.flavor")}
									</Table.HeaderCell>
								)}
								{!hideOwnedInfo && (
									<Table.HeaderCell
										width={1}
										sorted={
											column === "factionOnly"
												? direction ?? undefined
												: undefined
										}
										onClick={() => this._handleSort("factionOnly")}
									>
										{t("items.faction_only")}
									</Table.HeaderCell>
								)}
								{!!customFields?.length &&
									customFields.map((field) => (
										<Table.HeaderCell
											key={"custom_" + field.field + "_header"}
											width={field.width ?? 1}
											sorted={
												column === field.field
													? direction ?? undefined
													: undefined
											}
											onClick={() => this._handleSort(field.field)}
										>
											{field.text}
										</Table.HeaderCell>
									))}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{data.map((item, idx) => (
								<Table.Row key={idx}>
									<Table.Cell>
										<div
											title={
												item.name +
												(!hideOwnedInfo
													? !item.quantity
														? " (Unowned)"
														: ` (${item.quantity})`
													: "")
											}
											style={{
												display: "grid",
												gridTemplateColumns: !!selCrew
													? "87px auto"
													: "60px auto",
												gridTemplateAreas: `'icon stats' 'icon description'`,
												gridGap: "1px",
											}}
										>
											<div
												style={{
													gridArea: "icon",
													display: "flex",
													gap: "0.5em",
													width: "87px",
													flexDirection: "row",
													alignItems: "center",
												}}
											>
												{!!selCrew && (
													<Checkbox
														disabled={
															this.maxTrial(selCrew as PlayerCrew) &&
															!this.getTrial(
																selCrew.symbol,
																Number.parseInt(
																	item.kwipment_id?.toString() ?? "0"
																)
															)
														}
														checked={this.getTrial(
															selCrew.symbol,
															Number.parseInt(
																item.kwipment_id?.toString() ?? "0"
															)
														)}
														onChange={(e, { checked }) =>
															this.setTrial(
																selCrew.symbol,
																Number.parseInt(
																	item.kwipment_id?.toString() ?? "0"
																),
																checked || false
															)
														}
													/>
												)}

												<ItemDisplay
													targetGroup={itemTargetGroup ?? "profile_items"}
													style={{
														opacity:
															!item.quantity && !hideOwnedInfo ? "0.20" : "1",
													}}
													playerData={this.context.player.playerData}
													itemSymbol={item.symbol}
													allItems={this.state.data}
													rarity={item.rarity}
													maxRarity={item.rarity}
													size={48}
													src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
												/>
											</div>
											<div style={{ gridArea: "stats", cursor: "pointer" }}>
												<a onClick={(e) => this._handleNavigate(item.symbol)}>
													<span
														style={{ fontWeight: "bolder", fontSize: "1.25em" }}
													>
														{item.rarity > 0 && (
															<span>
																{item.rarity} <Icon name="star" />{" "}
															</span>
														)}
														{item.name}
													</span>
												</a>
											</div>
											<div style={{ gridArea: "description" }}>
												{this.createFlavor(item)}
											</div>
										</div>
									</Table.Cell>
									{!hideOwnedInfo && <Table.Cell>{item.quantity}</Table.Cell>}
									{!hideOwnedInfo && (
										<Table.Cell>{item.needed ?? "N/A"}</Table.Cell>
									)}
									{!types?.length && (
										<Table.Cell>
											{CONFIG.REWARDS_ITEM_TYPE[item.type]}
										</Table.Cell>
									)}
									<Table.Cell>{CONFIG.RARITIES[item.rarity].name}</Table.Cell>
									{!!buffs && <Table.Cell>{this.renderBuffs(item)}</Table.Cell>}
									{!!flavor && (
										<Table.Cell>{this.createFlavor(item)}</Table.Cell>
									)}
									{!hideOwnedInfo && (
										<Table.Cell>
											{item.factionOnly === undefined
												? ""
												: item.factionOnly === true
													? t("global.yes")
													: t("global.no")}
										</Table.Cell>
									)}
									{!!customFields?.length &&
										customFields.map((field) => (
											<Table.Cell key={"custom_" + field.field + "_value"}>
												{field.format
													? field.format(item[field.field])
													: item[field.field]}
											</Table.Cell>
										))}
								</Table.Row>
							))}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.HeaderCell colSpan="8">
									<Pagination
										totalPages={totalPages}
										activePage={pagination_page}
										onPageChange={(event, { activePage }) =>
											this._onChangePage(activePage)
										}
									/>
									<span style={{ paddingLeft: "2em" }}>
										{t("global.rows_per_page")}:{" "}
										<Dropdown
											inline
											options={pagingOptions}
											value={pagination_rows}
											onChange={(event, { value }) =>
												this.setRows(value as number)
											}
										/>
									</span>
								</Table.HeaderCell>
							</Table.Row>
						</Table.Footer>
					</Table>
				)}

				{!itemTargetGroup && (
					<ItemHoverStat
						targetGroup="profile_items"
						navigate={this._handleNavigate}
					/>
				)}

				{!crewTargetGroup && <CrewHoverStat targetGroup="profile_items_crew" />}
				<br />
				{!hideOwnedInfo && !!data?.length && bReady && (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "flex-start",
						}}
					>
						<div
							className="ui button"
							onClick={(e) => {
								if (this.state.data) this._exportItems(this.state.data);
							}}
							style={{
								display: "inline",
								flexDirection: "row",
								justifyContent: "space-evenly",
								cursor: "pointer",
							}}
						>
							<span style={{ margin: "0 2em 0 0" }}>
								{t("share_profile.export.export_csv")}
							</span>
							<i className="download icon" />
						</div>
						<div
							className="ui button"
							onClick={(e) => {
								if (this.state.data) this._exportItems(this.state.data, true);
							}}
							style={{
								marginRight: "2em",
								display: "inline",
								flexDirection: "row",
								justifyContent: "space-evenly",
								cursor: "pointer",
							}}
						>
							<span style={{ margin: "0 2em 0 0" }}>
								{t("share_profile.export.export_clipboard")}
							</span>
							<i className="clipboard icon" />
						</div>
					</div>
				)}
			</div>
		);
	}

	_exportItems(data: (EquipmentCommon | EquipmentItem)[], clipboard?: boolean) {
		const { playerData } = this.context.player;

		let text = exportItemsAlt(data);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(
			`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`,
			"items.csv"
		);
	}
}

export default ItemsTable;
