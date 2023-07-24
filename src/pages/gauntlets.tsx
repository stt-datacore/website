import React, { PureComponent } from 'react';
import { Item, Image, Grid, Pagination, PaginationProps, Table, Tab, Icon, Message, Dropdown, Rating } from 'semantic-ui-react';
import { Link } from 'gatsby';
import * as moment from 'moment';
import Layout from '../components/layout';

import allTraits from '../../static/structured/translation_en.json';
import CONFIG from '../components/CONFIG';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { CiteMode, CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet } from '../model/gauntlets';
import { applyCrewBuffs, comparePairs, getPlayerPairs, getSkills, navToCrewPage, prepareOne, prepareProfileData } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { CrewPreparer, PlayerBuffMode, PlayerImmortalMode } from '../components/item_presenters/crew_preparer';
import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';

export type GauntletViewMode = 'big' | 'small' | 'table';
const isWindow = typeof window !== 'undefined';

const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

const GauntletsPage = () => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'gauntlets', 'items']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	let playerData: PlayerData | undefined = undefined;

	if (isReady && strippedPlayerData && strippedPlayerData.stripped && strippedPlayerData?.player?.character?.crew?.length) {
		playerData = JSON.parse(JSON.stringify(strippedPlayerData));
		if (playerData) prepareProfileData("GAUNTLETS", coreData.crew, playerData, new Date());
	}

	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady) {
		maxBuffs = coreData.all_buffs;
	}

	return (
		<Layout>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
					<React.Fragment>
						<MergedContext.Provider value={{
							allCrew: coreData.crew,
							playerData: playerData ?? {} as PlayerData,
							buffConfig: buffConfig,
							maxBuffs: maxBuffs,
							gauntlets: coreData.gauntlets
						}}>
							<GauntletsPageComponent />
						</MergedContext.Provider>
					</React.Fragment>
				}

		</Layout>
	);

}

export interface GauntletsPageProps {
}

export interface FilterProps {
	ownedStatus: string[];
	rarity: number[];
}

export interface GauntletsPageState {

	hoverCrew: PlayerCrew | CrewMember | null | undefined;
	gauntlets: Gauntlet[];
	uniques: Gauntlet[];
	
	activePageTabs: (PlayerCrew | CrewMember)[][];

	today?: Gauntlet;
	yesterday?: Gauntlet;
	activePrevGauntlet?: Gauntlet;
	browsingGauntlet?: Gauntlet;

	itemsPerPage: number;

	totalPagesTab: number[];
	activePageIndexTab: number[];
	itemsPerPageTab: number[];

	searchDate?: Date;

	filteredCrew: (PlayerCrew | CrewMember)[][];
	filterProps: FilterProps[];
	appliedFilters: FilterProps[];

	viewModes: GauntletViewMode[];
	lastPlayerDate?: Date;

	sortKey: string[];
	sortDirection: ('ascending' | 'descending' | undefined)[];

	discoveredPairs: string[][];
	rankByPair: string[];
}

const DEFAULT_FILTER_PROPS = {
	ownedStatus: [] as number[],
	rarity: [] as number[]
};

class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType? = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private inited: boolean = false;	
	private readonly tiny = TinyStore.getStore('gauntlets');

	constructor(props: GauntletsPageProps) {
		super(props);

		const v1 = this.tiny.getValue<GauntletViewMode>('viewMode_0', 'table') ?? 'table';
		const v2 = this.tiny.getValue<GauntletViewMode>('viewMode_1', 'table') ?? 'table';
		const v3 = this.tiny.getValue<GauntletViewMode>('viewMode_2', 'table') ?? 'table';
		const v4 = this.tiny.getValue<GauntletViewMode>('viewMode_3', 'table') ?? 'table';
		
		this.state = {
			sortKey: ['', '', '', ''],
			sortDirection: [undefined, undefined, undefined, undefined],
			hoverCrew: undefined,
			itemsPerPage: 10,
			activePageTabs: [[], [], [], []],
			discoveredPairs: [[], [], [], []],
			rankByPair: ['none', 'none', 'none', 'none'],
			totalPagesTab: [0, 0, 0, 0],
			activePageIndexTab: [0, 0, 0, 0],
			itemsPerPageTab: [10, 10, 10, 10],
			filteredCrew: [[], [], [], []],
			viewModes: [v1, v2, v3, v4],
			gauntlets: [],
			browsingGauntlet: undefined,
			uniques: [],
			filterProps: [JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS))],
			appliedFilters: [JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS))]
		}
	}

	public readonly setHoverCrew = (item: CrewMember | PlayerCrew | null | undefined) => {
		this.setState({ ... this.state, hoverCrew: item });
	};

	public readonly setActivePageTab = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps, index: number) => {

		const tabs = [this.state.today?.matchedCrew, this.state.yesterday?.matchedCrew, this.state.activePrevGauntlet?.matchedCrew];

		if (this.inited && tabs[index]) {
			let crew = tabs[index] ?? [] as PlayerCrew[];
			let ip = this.state.itemsPerPageTab[index];
			let ap = ((data.activePage as number) - 1);
			if (ap < 0) ap = 0;

			let cp = ap * ip;
			let ep = cp + ip;
			if (ep > crew.length) ep = crew.length;
			let sl = crew.slice(cp, ep);

			let naps = [ ... this.state.activePageTabs ];
			naps[index] = sl;

			let nidx = [ ... this.state.activePageIndexTab ];
			nidx[index] = ap + 1;

			this.setState({ ... this.state, activePageTabs: naps, activePageIndexTab: nidx });
		}
	}

    protected setValidImmortalModes(crew: PlayerCrew | CrewMember | undefined, value: PlayerImmortalMode[]) {
		if (JSON.stringify(value) === JSON.stringify(this.getValidImmortalModes(crew))) return;
        if (crew) {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + crew.symbol, value, false);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, false);
        }
    }

    protected getValidImmortalModes(crew: PlayerCrew | CrewMember | undefined): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (crew) {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid/' + crew.symbol, ['full']) ?? ['full'];
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode[]>('immomodevalid', ['full']) ?? ['full'];
        }
         // console.log("immortal-mode")
         // console.log(value);
        return value;
    }

	protected getImmortalMode(crew: PlayerCrew | CrewMember | undefined): PlayerImmortalMode {
        let value: PlayerImmortalMode;
        if (crew) {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode/' + crew.symbol, 'owned') ?? 'owned';
        }
        else {
            value = this.tiny.getValue<PlayerImmortalMode>('immomode', 'owned') ?? 'owned';
        }
         // console.log("immortal-mode")
         // console.log(value);
        return value;
    }

    protected setImmortalMode(crew: PlayerCrew | CrewMember | undefined, value: PlayerImmortalMode) {
        if (value == this.getImmortalMode(crew)) return;
        if (crew) {
            this.tiny.setValue<PlayerImmortalMode>('immomode/' + crew.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode>('immomode', value, true);
        }
    }

	protected getViewMode(index: number) {
		return this.state.viewModes[index];
	}

	protected setViewMode(index: number, viewMode: GauntletViewMode) {
		if (this.state.viewModes[index] != viewMode) {
			let vm = [ ... this.state.viewModes ];
			vm[index] = viewMode;
			this.tiny.setValue('viewMode_' + index, viewMode, true);
			this.setState({ ... this.state, viewModes: vm });
		}
	}

	private lastBuffMode: PlayerBuffMode | undefined = undefined;

	readonly onBuffToggle = (state: PlayerBuffMode) => {
		if (state !== this.lastBuffMode) {
			this.lastBuffMode = state;
			this.forceUpdate();
		}
	}

	readonly onImmoToggle = (crew: PlayerCrew, state: PlayerImmortalMode) => {

	}

	readonly filterCrew = (filter: FilterProps, filterCrew: (PlayerCrew | CrewMember)[]) => {

		let newcrew = [] as (PlayerCrew | CrewMember)[];

		for (let crew of filterCrew) {
			if (filter.rarity?.length) {
				if (!filter.rarity.some(r => r === crew.max_rarity)) continue;
			}

			if (filter.ownedStatus?.length) {
				if ("have" in crew && crew.have) {
					if (!filter.ownedStatus.includes('have')) continue;
				}
				else if (!("have" in crew) || !crew.have) {
					if (!filter.ownedStatus.includes('not_have')) continue;
				}

				if ("immortal" in crew) {
					if (crew.immortal >= 1 && !filter.ownedStatus.includes('frozen')) continue;
					else if (crew.immortal < 1 && !filter.ownedStatus.includes('unfrozen')) continue;
				}
			}

			newcrew.push(crew);
		}

		return newcrew;
	}

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate() {
		if (this.state.lastPlayerDate !== this.context.playerData?.calc?.lastModified) {			
			this.inited = false;
		}
		this.initData();
	}

	readonly discoverPairs = (crew: (PlayerCrew | CrewMember)[]) => {
		let rmap = crew.map((item) => Object.keys(item.ranks));
		let ranks = [] as string[];
		ranks.push('');
		for (let rc of rmap) {
			for (let rank of rc) {
				if (rank.startsWith("G_") && !ranks.includes(rank)) {
					ranks.push(rank);
				}
			}
		}
		return ranks;
	}

	readonly getGauntletCrew = (gauntlet: Gauntlet, rankByPair?: string) => {
		if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

		const { allCrew, buffConfig, maxBuffs } = this.context;
		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;

		const prettyTraits = gauntlet.contest_data?.traits?.map(t => allTraits.trait_names[t]);
		if (!prettyTraits) {
			return null
		}
		const matchedCrew =
			allCrew.filter(e => e.max_rarity > 3 && (
				(!rankByPair || (rankByPair in e.ranks)) &&
				Object.keys(e.base_skills).some(k => e.base_skills[k].range_max >= 500) ||
				prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
				.map((inputCrew) => {
					let crew = JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;
					
					if (buffConfig) {
						applyCrewBuffs(crew, buffConfig);
					}

					let c = this.context.playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);
					
					if (c) {
						crew = JSON.parse(JSON.stringify(c)) as PlayerCrew;
					}
					else {
						let skills = getSkills(crew);
						for (let s of skills) {
							crew[s] = {
								core: 0,
								min: 0,
								max: 0
							}
						}
					}

					if (!hasPlayer) crew.rarity = crew.max_rarity;
					else if (!c) crew.rarity = 0;
					
					crew.immortal = hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
					crew.pairs = getPlayerPairs(crew);

					return crew;
				})
				.sort((a, b) => {

					if (rankByPair) {
						return a.ranks[rankByPair] - b.ranks[rankByPair];
					}

					let r = 0;

					let atrait = prettyTraits.filter(t => a.traits_named.includes(t)).length;
					let btrait = prettyTraits.filter(t => b.traits_named.includes(t)).length;

					if (atrait >= 3) atrait = 3.90;
					else if (atrait >= 2) atrait = 2.7;
					else if (atrait >= 1) atrait = 1.5;
					else atrait = 0.30;

					if (btrait >= 3) btrait = 3.90;
					else if (btrait >= 2) btrait = 2.7;
					else if (btrait >= 1) btrait = 1.5;
					else btrait = 0.30;

					let ap = getPlayerPairs(a, atrait);
					let bp = getPlayerPairs(b, btrait);

					if (ap && bp) {
						r = comparePairs(ap[0], bp[0], gauntlet.contest_data?.featured_skill, 1.5);
						if (r === 0 && ap.length > 1 && bp.length > 1) {
							r = comparePairs(ap[1], bp[1], gauntlet.contest_data?.featured_skill, 1.5);
							if (r === 0 && ap.length > 2 && bp.length > 2) {
								r = comparePairs(ap[2], bp[2], gauntlet.contest_data?.featured_skill, 1.5);
							}
						}
					}
					return r;
			});

		gauntlet.matchedCrew = matchedCrew;
		gauntlet.origRanks = {};

		matchedCrew.forEach((crew, idx) => {
			gauntlet.origRanks ??= {};
			gauntlet.origRanks[crew.symbol] = idx + 1;
		});

		gauntlet.prettyTraits = prettyTraits;
	}

	initData() {
		const { allCrew, gauntlets: gauntsin } = this.context;
		const gauntlets = JSON.parse(JSON.stringify(gauntsin));

		if (!(allCrew?.length) || !(gauntlets?.length)) return;

		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;

		if (gauntlets && this.inited) return;

		let uniques = [...gauntlets];

		let qmaps = uniques.map((g, idx) => {
			if (!g || !g.contest_data) return undefined;				
			return JSON.stringify(g.contest_data);
		})
		
		qmaps = qmaps.filter((q, idx) => q && qmaps.indexOf(q) === idx);
		let pass2 = [] as Gauntlet[];
		for (let q of qmaps) {
			let qparse = uniques.find(x => x.contest_data && JSON.stringify(x.contest_data) === q);
			if (qparse) {
				qparse = JSON.parse(JSON.stringify(qparse));
				qparse.template = true;
				pass2.push(qparse);
			} 
		}

		uniques = pass2.sort((a, b) => {
			let astr = `${a.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[a.contest_data?.featured_skill ?? ""]}`;
			let bstr = `${b.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[b.contest_data?.featured_skill ?? ""]}`;
			return astr.localeCompare(bstr);
		}) as Gauntlet[]

		uniques.forEach((unique, idx) => {
			unique.date = "gt_" + idx;
		})
		
		gauntlets.slice(0, 3).forEach((node, index) => {
			this.getGauntletCrew(node);
		});

		this.getGauntletCrew(uniques[0]);

		if (!this.state.gauntlets?.length || !this.inited) {

			const og: Gauntlet[] = gauntlets; //?.filter((gauntlet: Gauntlet) => gauntlet.prettyTraits?.length) ?? [] as Gauntlet[];
			const today = og[0];
			const yesterday = og[1];
			const activePrevGauntlet = og[2];
			const gaunts = og.slice(2);

			let apidx = [1, 1, 1, 1];
			let pcs = [0, 0, 0, 0];
			let aptabs = [[], [], [], []] as (PlayerCrew | CrewMember)[][];
			
			[today, yesterday, activePrevGauntlet, uniques[0]].forEach((day, idx) => {
				if (!day.matchedCrew) {
					return;
				}

				let ip = this.state.itemsPerPageTab[idx];
				let pc = Math.ceil(day.matchedCrew.length / ip);

				aptabs[idx] = day.matchedCrew.slice(0, ip);
				pcs[idx] = pc;
			})

			this.inited = true;

			this.setState({ ... this.state,
				gauntlets: gaunts,
				activePageTabs: aptabs,
				totalPagesTab: pcs,
				activePageIndexTab: apidx,
				browsingGauntlet: uniques[0],
				today,
				yesterday,
				lastPlayerDate: this.context.playerData?.calc?.lastModified,
				activePrevGauntlet,
				uniques
			});
		}
	}

	private changeGauntlet = (date: string, unique?: boolean) => {
		if (unique) {
			const g = this.state.uniques?.find((g) => g.date === date);
			this.updatePaging(undefined, g, 3);
			}
		else {
			const g = this.state.gauntlets?.find((g) => g.date === date);
			this.updatePaging(g);
		}
	}

	private changeRankPair = (idx: number, pair?: string) => {
		const { today, yesterday, activePrevGauntlet, sortKey, sortDirection, browsingGauntlet } = this.state;
		const gauntlets = [today, yesterday, activePrevGauntlet, browsingGauntlet];

		pair ??= 'none';
		this.updatePaging(undefined, gauntlets[idx], idx, pair);
	}

	private readonly updatePaging = (newSelGauntlet?: Gauntlet, replaceGauntlet?: Gauntlet, replaceIndex?: number, replaceRank?: string) => {
		const { today, yesterday, activePrevGauntlet, sortKey, sortDirection, browsingGauntlet, rankByPair } = this.state;
		let newBrowseGauntlet: Gauntlet | undefined = undefined;
		let newToday: Gauntlet | undefined = undefined;
		let newYesterday: Gauntlet | undefined = undefined;

		if (replaceIndex === 0) newToday = replaceGauntlet;
		else if (replaceIndex === 1) newYesterday = replaceGauntlet;
		else if (replaceIndex === 2) newSelGauntlet = replaceGauntlet;
		else if (replaceIndex === 3) newBrowseGauntlet = replaceGauntlet;
			
		if (replaceGauntlet) {
			this.getGauntletCrew(replaceGauntlet, replaceRank);
		}
		
		if (newSelGauntlet && replaceGauntlet !== newSelGauntlet) {
			this.getGauntletCrew(newSelGauntlet);
		}
		else if (newBrowseGauntlet && replaceGauntlet !== newBrowseGauntlet) {
			this.getGauntletCrew(newBrowseGauntlet);			
		}
		
		let apidx = this.state.activePageIndexTab;
		let pcs = [0, 0, 0, 0];
		let aptabs = [[], [], [], []] as (PlayerCrew | CrewMember)[][];

		[newToday ?? today, newYesterday ?? yesterday, newSelGauntlet ?? activePrevGauntlet, newBrowseGauntlet ?? browsingGauntlet].forEach((day, idx) => {
			if (replaceIndex !== undefined && replaceIndex === idx) {
				day = replaceGauntlet;
				rankByPair[replaceIndex] = replaceRank ?? 'none';
			}

			if (!day) return;

			if (!day.matchedCrew) {
				return;
			}

			let ip = this.state.itemsPerPageTab[idx];
			let pc = Math.ceil(day.matchedCrew.length / ip);

			aptabs[idx] = day.matchedCrew.slice(0, ip);
			pcs[idx] = pc;
			if (apidx[idx] > pc) apidx[idx] = pc;
		});

		this.inited = true;

		this.setState({ ... this.state,
			rankByPair: [...rankByPair],
			activePageTabs: aptabs,
			totalPagesTab: pcs,
			activePageIndexTab: apidx,
			today: replaceIndex === 0 ? replaceGauntlet : today ? { ... today } : undefined,
			yesterday: replaceIndex === 1 ? replaceGauntlet : yesterday ? { ... yesterday } : undefined,
			activePrevGauntlet: replaceIndex === 2 ? replaceGauntlet : newSelGauntlet ?? activePrevGauntlet,
			browsingGauntlet: replaceIndex === 3 ? replaceGauntlet : newBrowseGauntlet ?? browsingGauntlet,
			sortKey: [...sortKey],
			sortDirection: [...sortDirection]
		});
	}
 
	private readonly columns = [
		{ title: "Rank", key: "index" },
		{ title: "Crew", key: "name" },
		{ title: "Rarity", key: "rarity" },
		{ title: "Crit Chance", key: "crit" },
		{ title: "1st Pair", key: "pair_1" },
		{ title: "2nd Pair", key: "pair_2" },
		{ title: "3rd Pair", key: "pair_3" },
		{ title: "Owned", key: "have" },
		{ title: "In Portal", key: "in_portal" },
	]

	private columnClick = (key: string, tabidx: number) => {
		const { today, yesterday, activePrevGauntlet, sortDirection, sortKey } = this.state;
		const pages = [today, yesterday, activePrevGauntlet];

		if (tabidx in pages && pages[tabidx]) {

			const page = pages[tabidx] ?? {} as Gauntlet;
			const prettyTraits = page?.prettyTraits;
			
			var newarr = JSON.parse(JSON.stringify(pages[tabidx]?.matchedCrew ?? [])) as PlayerCrew[];

			if (sortDirection[tabidx] === undefined) {
				if (key === 'name') {
					sortDirection[tabidx] = 'ascending';
				}
				else {
					sortDirection[tabidx] = 'descending';
				}
			}
			else if (key === sortKey[tabidx]) {				
				if (sortDirection[tabidx] === 'descending') {
					sortDirection[tabidx] = 'ascending';
				}
				else {
					sortDirection[tabidx] = 'descending';
				}
			}

			sortKey[tabidx] = key;

			const dir = sortDirection[tabidx] === 'descending' ? -1 : 1;

			if (key === 'index' && page.origRanks) {
				newarr = newarr.sort((a, b) => {
					if (page.origRanks) {
						if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
							return dir * (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
						}
					}
					
					return 0;
				})
			}
			else if (key === 'name') {
				newarr = newarr.sort((a, b) => dir * a.name.localeCompare(b.name));
			}
			else if (key === 'rarity') {
				newarr = newarr.sort((a, b) => {
					let r = a.max_rarity - b.max_rarity;
					if (r === 0 && "rarity" in a && "rarity" in b) {
						r = (a.rarity ?? 0) - (b.rarity ?? 0);
					}
					if (!r) {
						if (page.origRanks) {
							if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
								return (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
							}
						}
					}
					return dir * r;
				});
			}
			else if (key === 'crit') {
				newarr = newarr.sort((a, b) => {
					let atr = prettyTraits?.filter(t => a.traits_named.includes(t))?.length ?? 0;
					let btr = prettyTraits?.filter(t => b.traits_named.includes(t))?.length ?? 0;
					let answer = atr - btr;
					if (!answer) {
						if (page.origRanks) {
							if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
								return (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
							}
						}
					}
					return dir * answer;
				});
			}
			else if (key.startsWith("pair_")) {
				let pairIdx = Number.parseInt(key.slice(5)) - 1;
				newarr = newarr.sort((a, b) => {
					let apairs = getPlayerPairs(a);
					let bpairs = getPlayerPairs(b);

					if (apairs && bpairs) {
						let pa = [...apairs ?? []];
						let pb = [...bpairs ?? []];
						return dir * (-1 * comparePairs(pa[pairIdx], pb[pairIdx]));
					}
					else if (apairs) {
						return dir * -1;
					}
					else if (bpairs) {
						return dir * 1;
					}
					else {
						return 0;
					}
				});
			}
			else if (key === 'have') {
				newarr = newarr.sort((a, b) => {
					let r = 0;
					if ("have" in a && "have" in b) {
						if (a.have != b.have) {
							if (a.have) r = 1;
							else r = -1;
						}
					}
					else if ("have" in a) {
						if (a.have) r = 1;
					}
					else if ("have" in b) {
						if (b.have) r = -1;
					}
					
					if (r === 0 && page.origRanks) {
						if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
							return (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
						}
					}
					
					if (r === 0 && page.origRanks) {
						if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
							return (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
						}
					}
					
					return r * dir;
				})
			}
			else if (key === 'in_portal') {
				newarr = newarr.sort((a, b) => {
					let r = (a.in_portal ? 1 : 0) - (b.in_portal ? 1 : 0);
					if (!r) {
						if (page.origRanks) {
							if (a.symbol in page.origRanks && b.symbol in page.origRanks) {
								return (page.origRanks[a.symbol] - page.origRanks[b.symbol]);
							}
						}
						
						return 0;
					}
					return dir * r;
				})
			}

			this.updatePaging(undefined, { ...page, matchedCrew: newarr }, tabidx);
		}
	}

	private formatPair(pair: Skill[]): JSX.Element {
		if (!pair[0].skill) return <></>
		return (
			<div>
				<div style={{
					display: "flex",
					flexDirection: "row"
				}}>
					<img style={{height: '2em', margin: "0.25em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[0].skill}.png`} />
					<div style={{
							margin: "0.5em"
						}}>
						{pair[0].range_min}-{pair[0].range_max}
					</div>
				</div>
				{pair.length > 1 &&
				<div style={{
					display: "flex",
					flexDirection: "row"
				}}>
					<img style={{height: '2em', margin: "0.25em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[1].skill}.png`} />
					<div style={{
							margin: "0.5em"
						}}>
						{pair[1].range_min}-{pair[1].range_max}
					</div>
				</div>}
			</div>

		)
	}

	renderTable(gauntlet: Gauntlet, data: PlayerCrew[], idx: number) {
		if (!data) return <></>;
		
		const { totalPagesTab, activePageIndexTab, sortDirection, sortKey } = this.state;

		let pp = this.state.activePageIndexTab[idx] - 1;
		pp *= this.state.itemsPerPageTab[idx];

		const buffConfig = this.context.buffConfig;

		const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
			console.log("imageClick");
			// if (matchMedia('(hover: hover)').matches) {
			// 	window.location.href = "/crew/" + data.symbol;
			// }
		}

		const setCurrentCrew = (crew) => {
			this.setState({ ... this.state, hoverCrew: crew });
		}
		
		const prettyTraits = gauntlet.prettyTraits;

		return (<div style={{overflowX: "auto"}}>
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell colSpan={9}>
						<div style={{margin:"1em 0", width: "100%"}}>
							<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
						</div>
					</Table.HeaderCell>
					</Table.Row>
					<Table.Row>
						{this.columns.map((col, hidx) => 
						<Table.HeaderCell 
								sorted={sortKey[idx] === col.key ? sortDirection[idx] : undefined}
								onClick={(e) => this.columnClick(col.key, idx)}
								key={"k_"+hidx}>
							{col.title}
							</Table.HeaderCell>)}
					</Table.Row>					
				</Table.Header>
				<Table.Body>
					{data.map((row, idx: number) => {
						const crew = row;
						const pairs = crew.pairs ?? getPlayerPairs(crew);
						const rank = gauntlet.origRanks ? gauntlet.origRanks[crew.symbol] : idx + pp + 1;
						return (crew &&
							<Table.Row key={idx}
							>
								<Table.Cell>{rank}</Table.Cell>
								<Table.Cell>
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon stats' 'icon description'`,
											gridGap: '1px'
										}}>
										<div style={{ gridArea: 'icon' }}

										>
											<CrewTarget targetGroup='gauntletTable'
												inputItem={crew}
												setDisplayItem={setCurrentCrew}>
												<img
													onClick={(e) => imageClick(e, crew)}
													width={48}
													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
													/>
											</CrewTarget>
										</div>
										<div style={{ gridArea: 'stats' }}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
								</Table.Cell>
								<Table.Cell>
								{((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
								</Table.Cell>
								<Table.Cell width={2}>
									{pairs && pairs.length >= 1 && this.formatPair(pairs[0])}
								</Table.Cell>
								<Table.Cell width={2}>
									{pairs && pairs.length >= 2 && this.formatPair(pairs[1])}
								</Table.Cell>
								<Table.Cell width={2}>
									{pairs && pairs.length >= 3 && this.formatPair(pairs[2])}
								</Table.Cell>
								<Table.Cell width={2}>
									{crew.have === true ? "Yes" : "No"}
								</Table.Cell>
								<Table.Cell width={2}>
									{crew.in_portal ? "Yes" : "No"}
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.Cell colSpan={9}>
						<div style={{margin:"1em 0", width: "100%"}}>
							<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
						</div>
						</Table.Cell>
					</Table.Row>
				</Table.Footer>
			</Table>
			<CrewHoverStat crew={this.state.hoverCrew ?? undefined} targetGroup='gauntletTable' />
			</div>);
	}

	renderGauntletBig(gauntlet: Gauntlet | undefined, idx: number) {

		const { activePageTabs, activePageIndexTab, totalPagesTab, viewModes, rankByPair } = this.state;

		if (!gauntlet) return undefined;

		const pairs = this.discoverPairs(gauntlet.matchedCrew ?? [])
				.map((pair) => {
					let pf = pair === '' ? 'none' : pair;
					let pn = pair === '' ? '' : pair.slice(2).replace("_", "/");

					return {
						key: pf,
						value: pf,
						text: pn == '' ? 'None' : pn
					}
				});

		const prettyDate = !gauntlet.template ? moment(gauntlet.date).utc(false).format('dddd, D MMMM YYYY') : "";
		const displayOptions = [{
				key: "big",
				value:"big",
				text: "Large Presentation"
			},
			{
				key: "small",
				value:"small",
				text: "Small Presentation"
			},
			{
				key: "table",
				value:"table",
				text: "Table"
			}]

		if (gauntlet.unavailable_msg) {
			return (
				<Message icon>
				<img style={{height:"15em"}} src={`${process.env.GATSBY_ASSETS_URL}crew_full_body_cm_qjudge_full.png`} />
					<Message.Content>
						<Message.Header>{gauntlet.unavailable_msg}</Message.Header>
						{gauntlet.unavailable_desc_msg}
					</Message.Content>
				</Message>
			)
		}
		return (
		<div style={{
			marginBottom: "2em",
			overflowX:"auto"
		}}>
			{/* {idx === 2 && <h1>Previous Gauntlets</h1>} */}
			{idx < 2 && <h1>{idx === 0 ? "Today" : "Yesterday"}'s Gauntlet</h1>}

			<div style={{
				display:"flex",
				flexDirection: "column",
				justifyContent: "flex-start",
				margin: "0.25em 0"
			}}> 
				<h3 style={{fontSize:"1.5em", margin: "0.25em 0"}}>
					{prettyDate}
				</h3>
				<div style={{
					display: "flex",
					flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
					justifyContent: "space-between"
				}}>
					<h2 style={{fontSize:"2em", margin: "0.25em 0"}}>
						{gauntlet.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/{SKILLS[gauntlet.contest_data?.featured_skill ?? ""]}
					</h2>

					<div style={{
						display:"flex",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
					}}>
						<div style={{
							display: "flex",
							flexDirection: "column",
							marginRight: "2em",
							textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
						}}>
						<h4><b>Rank By Pair</b></h4>

						<Dropdown
							direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
							options={pairs}
							value={rankByPair[idx]}
							onChange={(e, { value }) => this.changeRankPair(idx, value as string)}
							/>
						</div>


						<div style={{
							display: "flex",
							flexDirection: "column",
							textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
						}}>
						<h4><b>View Mode</b></h4>

						<Dropdown
							direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
							options={displayOptions}
							value={viewModes[idx]}
							onChange={(e, { value }) => this.setViewMode(idx, value as (GauntletViewMode))}
							/>
						</div>
					</div>
				</div>
			</div>

			{viewModes[idx] !== 'table' && <div style={{margin:"1em 0", width: "100%"}}>
				<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
			</div>}

			{viewModes[idx] === 'big' &&
			<div style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				overflowX: "auto"
			}}>
				{activePageTabs[idx].map((crew) => (
					<div key={crew.symbol} className="ui segment" style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-evenly",
						width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "100%"
					}}>
						<CrewPresenter
							width={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "100%"}
							imageWidth="50%"
							plugins={[GauntletSkill, ShipSkill]}
							pluginData={[gauntlet, undefined]}
							selfRender={true}
							selfPrepare={true}
							onBuffToggle={this.onBuffToggle}
							onImmoToggle={(state) => this.onImmoToggle(crew as PlayerCrew, state)}
							storeName='gauntlets'
							hover={window.innerWidth < DEFAULT_MOBILE_WIDTH ? true : false}
							crew={crew} />
					</div>
				))}
			</div>}
			{viewModes[idx] === 'small' &&
			<div style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				overflowX: "auto"
			}}>
				{activePageTabs[idx].map((crew) => (
					<div key={crew.symbol} className="ui segment" style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-evenly",
						flexWrap: "wrap",
						width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '100%' : "50%",
						margin: "0"
					}}>
						<CrewPresenter
							hideStats
							compact
							proficiencies
							plugins={[GauntletSkill]}
							pluginData={[gauntlet]}
							selfRender={true}
							selfPrepare={true}
							onBuffToggle={this.onBuffToggle}
							onImmoToggle={(state) => this.onImmoToggle(crew as PlayerCrew, state)}
							storeName='gauntlets'
							hover={false}
							crew={crew} />
					</div>
				))}
			</div>}
			{viewModes[idx] === 'table' && this.renderTable(gauntlet, activePageTabs[idx] as PlayerCrew[], idx)}
			{viewModes[idx] !== 'table' && <div style={{margin:"1em 0", width: "100%"}}>
				<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
			</div>}

			<hr />
		</div>
		)

	}

	renderPreviousGauntlets(browsing?: boolean) {

		const { activePrevGauntlet, browsingGauntlet, gauntlets, uniques } = this.state;

		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';

		const gauntOpts = (browsing ? uniques : gauntlets).map((g, idx) => {
			let text = "";
			
			if (browsing) {
				text = `${g.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[g.contest_data?.featured_skill ?? ""]}`;
			}
			else {
				text = moment(g.date).utc(false).format('dddd, D MMMM YYYY') + ` (${g.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[g.contest_data?.featured_skill ?? ""]})`;
			}

			return {
				key: browsing ? "gt_" + idx : g.date,
				value: browsing ? "gt_" + idx : g.date,
				text: text
			};
		})

		return (<>
				<div style={{
					display: "flex",
					flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
					justifyContent: "space-between"
				}}>
					<h1>{browsing ? "Browse" : "Previous"} Gauntlets</h1>

					<div style={{
						display: "flex",
						flexDirection: "column"
					}}>
						<Dropdown 
							scrolling
							options={gauntOpts}
							value={browsing ? (browsingGauntlet?.date ?? "g_0") : (activePrevGauntlet?.date ?? "")}
							onChange={(e, { value }) => this.changeGauntlet(value as string, browsing ? true : false)}
							/>

					</div>
				</div>
				{this.renderGauntletBig(browsing ? browsingGauntlet : activePrevGauntlet, browsing ? 3 : 2)}
			</>)
	}

	render() {
		const { gauntlets, today, yesterday } = this.state;
		const isMobile = isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		if (!gauntlets) return <></>
		
		const fs = isMobile ? "0.75em" : "1em";

		const tabPanes = [
			{
				menuItem: isMobile ? "Today": "Today's Gauntlet",
				render: () => <div style={{fontSize: fs}}>{this.renderGauntletBig(today, 0)}</div>
			},
			{
				menuItem: isMobile ? "Yesterday" : "Yesterday's Gauntlet",
				render: () => <div style={{fontSize: fs}}>{this.renderGauntletBig(yesterday, 1)}</div>
			},
			{
				menuItem: isMobile ? "Previous" : "Previous Gauntlets",
				render: () => <div style={{fontSize: fs}}>{this.renderPreviousGauntlets()}</div>
			},
			{
				menuItem: isMobile ? "Browse" : "Browse Gauntlets",
				render: () => <div style={{fontSize: fs}}>{this.renderPreviousGauntlets(true)}</div>
			}

		]

		return (
			<>
				<Message icon warning>
				<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>
				<div>
				{isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH && 
				<Tab menu={{ attached: false, fluid: true, wrap: true }} panes={tabPanes} /> ||
				<Tab menu={{ attached: false }} panes={tabPanes} />
				}
				</div>
				<CrewHoverStat targetGroup='gauntlets' crew={this.state.hoverCrew ?? undefined} />
			</>
		)}
	}


export default GauntletsPage;