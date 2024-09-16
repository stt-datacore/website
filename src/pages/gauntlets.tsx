import React from 'react';
import { Pagination, PaginationProps, Icon, Message, Dropdown, Button, Accordion, Checkbox, DropdownItemProps, Step, Input } from 'semantic-ui-react';
import * as moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/fr';
import 'moment/locale/de';
import { randomCrew } from '../context/datacontext';
import { GlobalContext } from '../context/globalcontext';
import { PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from '../model/player';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet, GauntletRoot } from '../model/gauntlets';
import { gradeToColor, prettyObtained, shortToSkill, skillToShort } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { BuffNames } from '../components/item_presenters/crew_preparer';

import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import DataPageLayout from '../components/page/datapagelayout';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import ItemDisplay from '../components/itemdisplay';
import GauntletSettingsPopup from '../components/gauntlet/settings';
import { ItemBonusInfo } from '../utils/itemutils';
import { GauntletSettings, calculateGauntlet, defaultSettings, discoverPairs, getPairGroups } from '../utils/gauntlet';
import { EquipmentItem } from '../model/equipment';
import { GauntletPairTable } from '../components/gauntlet/pairtable';
import { GauntletCrewTable } from '../components/gauntlet/gauntlettable';
import { GauntletImportComponent } from '../components/gauntlet/gauntletimporter';
import CONFIG from '../components/CONFIG';

export type GauntletViewMode = 'big' | 'small' | 'table' | 'pair_cards';

type SortDirection = 'ascending' | 'descending' | undefined;

const isWindow = typeof window !== 'undefined';

// export const SKILLS = {
// 	command_skill: 'CMD',
// 	science_skill: 'SCI',
// 	security_skill: 'SEC',
// 	engineering_skill: 'ENG',
// 	diplomacy_skill: 'DIP',
// 	medicine_skill: 'MED'
// };

const GauntletsPage = () => {
	return (
		<DataPageLayout playerPromptType='recommend' demands={['gauntlets', 'all_buffs', 'crew', 'items']}>
			<GauntletsPageComponent />
		</DataPageLayout>
	);

}
export interface PairGroup {
	pair: string[];
	crew: PlayerCrew[]
};

export interface GauntletsPageProps {
}

export type OwnedStatus = 'any' | 'maxall' | 'owned' | 'unfrozen' | 'unowned' | 'ownedmax' | 'nofe' | 'nofemax' | 'fe' | 'portal' | 'gauntlet' | 'nonportal';

export interface FilterProps {
	ownedStatus?: OwnedStatus;
	rarity?: number;
	maxResults?: number;
	skillPairs?: string[];
}

export interface GauntletsPageState {
	liveGauntletRoot?: GauntletRoot;

	gauntlets: Gauntlet[];
	uniques: Gauntlet[];
	ranges: number[];
	tops: number[];

	activePageTabs: (PlayerCrew | CrewMember)[][];

	today?: Gauntlet;
	yesterday?: Gauntlet;
	activePrevGauntlet?: Gauntlet;
	browsingGauntlet?: Gauntlet;
	liveGauntlet?: Gauntlet | null;

	itemsPerPage: number;

	totalPagesTab: number[];
	activePageIndexTab: number[];
	itemsPerPageTab: number[];

	searchDate?: Date;

	filteredCrew: (PlayerCrew | CrewMember)[][];
	filterProps: FilterProps[];

	viewModes: GauntletViewMode[];
	lastPlayerDate?: Date;

	textFilter: string[];

	sortKey: string[];
	sortDirection: SortDirection[];

	discoveredPairs: string[][];
	rankByPair: string[];

	activeTabIndex?: number;
	onlyActiveRound?: boolean;
	hideOpponents?: boolean;

	loading?: boolean;
	settingsOpen: boolean;

	gauntletSettings: GauntletSettings;
}

const DEFAULT_FILTER_PROPS = {
	ownedStatus: 'any',
	maxResults: 10,
} as FilterProps;

const GauntletTabCount = 5;


class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType?= GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	private inited: boolean = false;
	private readonly tiny = TinyStore.getStore('gauntlets');

    private readonly crewQuip = {} as { [key: string]: EquipmentItem[] };
    private readonly bonusInfo = {} as { [key: string]: ItemBonusInfo };

	constructor(props: GauntletsPageProps) {
		super(props);

		const vmodes = [] as GauntletViewMode[];
		const rmax = [] as number[];
		const tops = [] as number[];
		const fprops =[] as FilterProps[];
		const skeys = [] as string[];
		const sdir = [] as SortDirection[];
		const aptabs = [] as (PlayerCrew | CrewMember)[][];
		const dpairs = [] as string[][];
		const rbpair = [] as string[];
		const ptab = [] as number[];
		const ipage = [] as number[];
		const tf = [] as string[];
		for (let i = 0; i < GauntletTabCount; i++) {
			vmodes.push(this.tiny.getValue<GauntletViewMode>('viewMode_' + i, 'pair_cards') ?? 'pair_cards')
			rmax.push(this.tiny.getValue('gauntletRangeMax_' + i, 100) ?? 100);
			tops.push(this.tiny.getValue('gauntletTops_' + i, 100) ?? 100);
			fprops.push(this.tiny.getValue('gauntletFilter_' + i, DEFAULT_FILTER_PROPS) ?? DEFAULT_FILTER_PROPS);
			tf.push(this.tiny.getValue('textFilter_' + i, '') ?? '');

			skeys.push('');
			sdir.push(undefined);
			aptabs.push([]);
			dpairs.push([]);
			rbpair.push('none');
			ptab.push(0);
			ipage.push(10);
		}

		const settings = this.tiny.getValue<GauntletSettings>('gauntletSettings', defaultSettings) ?? defaultSettings;

		const activeTabIndex = 0; // this.tiny.getValue<number>("activeTabIndex", lg ? 4 : 0);

		this.state = {
			loading: true,
			onlyActiveRound: this.tiny.getValue<boolean>('activeRound', true),
			liveGauntlet: undefined,
			sortKey: skeys,
			sortDirection: sdir,
			itemsPerPage: 10,
			activePageTabs: aptabs,
			discoveredPairs: dpairs,
			rankByPair: rbpair,
			totalPagesTab: [...ptab],
			ranges: rmax,
			activePageIndexTab: [...ptab],
			itemsPerPageTab: ipage,
			tops: tops,
			filteredCrew: [[], [], [], [], []],
			viewModes: vmodes,
			gauntlets: [],
			browsingGauntlet: undefined,
			uniques: [],
			filterProps: fprops,
			activeTabIndex: activeTabIndex,
			hideOpponents: this.tiny.getValue<boolean>('hideOpponents', false),
			gauntletSettings: settings,
			settingsOpen: false,
			textFilter: tf
		}
	}
	readonly getSettingsOpen = () => {
		return this.state.settingsOpen;
	}
	readonly setSettingsOpen = (value: boolean) => {
		this.setState({ ... this.state, settingsOpen: value });
	}

	readonly setSettings = (value: GauntletSettings) => {
		if (JSON.stringify(value) !== JSON.stringify(this.state.gauntletSettings)) {
			this.setState({ ... this.state, loading: true });
			window.setTimeout(() => {
				this.inited = false;
				this.tiny.setValue('gauntletSettings', value, true);
				this.setState({ ...this.state, gauntletSettings: value });
			});
		}
	}

	public readonly setActivePageTab = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps, index: number) => {

		const tabs = [this.state.today?.searchCrew, this.state.yesterday?.searchCrew, this.state.activePrevGauntlet?.searchCrew, this.state.browsingGauntlet?.searchCrew, this.state.liveGauntlet?.searchCrew];

		if (this.inited && tabs[index]) {
			let crew = tabs[index] ?? [] as PlayerCrew[];
			let ip = this.state.itemsPerPageTab[index];
			let ap = ((data.activePage as number) - 1);
			if (ap < 0) ap = 0;

			let cp = ap * ip;
			let ep = cp + ip;
			if (ep > crew.length) ep = crew.length;
			let sl = crew.slice(cp, ep);

			let naps = [... this.state.activePageTabs];
			naps[index] = sl;

			let nidx = [... this.state.activePageIndexTab];
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

	protected readonly getBuffState = (availModes?: PlayerBuffMode[]): PlayerBuffMode => {
		let result = this.tiny.getValue<PlayerBuffMode>('buffmode', 'player');

		if (result && availModes?.length && !availModes.includes(result)) {
			result = availModes ? availModes[0] : 'none';
		}
		else if (!result) {
			result = 'none';
		}
		return result;
	}

	protected readonly setBuffState = (buff: PlayerBuffMode) => {
		let test = this.getBuffState();
		if (test === buff) return;
		this.tiny.setValue('buffmode', buff, true);
		this.inited = false;
		this.setState({...this.state, loading: true})
	}


	protected getRangeMax(index: number) {
		return this.state.ranges[index];
	}

	protected setRangeMax(index: number, max: number) {
		if (this.state.ranges[index] != max) {
			let vm = [... this.state.ranges];
			vm[index] = max;
			this.tiny.setValue('gauntletRangeMax_' + index, max, true);
			this.inited = false;
			this.setState({ ...this.state, loading: true });
			window.setTimeout(() => {
				this.setState({ ... this.state, ranges: vm });
			});
		}
	}

	protected getTops(index: number) {
		return this.state.tops[index];
	}

	protected setTops(index: number, newtop: number) {
		if (this.state.tops[index] != newtop) {
			let vm = [... this.state.tops];
			vm[index] = newtop;
			this.tiny.setValue('gauntletTops_' + index, newtop, true);
			this.setState({ ... this.state, loading: true });
			window.setTimeout(() => {
				this.setState({ ... this.state, tops: vm, loading: false });
			});
		}
	}

	protected setActiveRound(value: boolean) {
		this.tiny.setValue('activeRound', value, true);
		this.setState({...this.state, onlyActiveRound: value });
	}

	protected getActiveRound() {
		return !!this.state.onlyActiveRound;
	}

	protected setHideOpponents(value: boolean) {
		this.tiny.setValue('hideOpponents', value, true);
		this.setState({ ...this.state, loading: true });
		this.inited = false;
		window.setTimeout(() => {
			this.setState({...this.state, hideOpponents: value });
		});
	}

	protected getHideOpponents() {
		return !!this.state.hideOpponents;
	}

	protected getViewMode(index: number) {
		return this.state.viewModes[index];
	}

	protected setViewMode(index: number, viewMode: GauntletViewMode) {
		if (this.state.viewModes[index] != viewMode) {
			let vm = [... this.state.viewModes];
			vm[index] = viewMode;
			this.tiny.setValue('viewMode_' + index, viewMode, true);
			if (viewMode === 'pair_cards') {
				this.setState({ ... this.state, loading: true });
			}
			window.setTimeout(() => {
				this.setState({ ... this.state, viewModes: vm, loading: false });
			});
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

	protected setActiveTabIndex = (value?: number) => {
		this.tiny.setValue('activeTabIndex', value, true);
		this.setState({ ...this.state, loading: true });
		window.setTimeout(() => {
			this.setState({...this.state, activeTabIndex: value, loading: false });
		});

	}

	protected getActiveTabIndex = () => {
		return this.state.activeTabIndex;
	}

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate() {
		if (this.state.lastPlayerDate !== this.context.player.playerData?.calc?.lastModified) {
			this.inited = false;
            let cp = Object.keys(this.crewQuip);
            let bi = Object.keys(this.bonusInfo);
            if (cp?.length) {
                for (let key of cp) {
                    delete this.crewQuip[key];
                }
            }
            if (bi?.length) {
                for (let key of bi) {
                    delete this.bonusInfo[key];
                }
            }
		}
		setTimeout(() => this.initData());
	}

	readonly matchesCrew = (crew: PlayerCrew, value?: string) => {
		if (value !== '' && value !== undefined) {
			let ltf = value.toLowerCase();
			if (crew.name.toLowerCase().includes(ltf)) return true;
			if (crew.symbol.includes(ltf)) return true;
			if (crew.traits.some(t => t.toLowerCase().includes(ltf))) return true;
			if (crew.traits_hidden.some(t => t.toLowerCase().includes(ltf))) return true;
			if (crew.traits_named.some(t => t.toLowerCase().includes(ltf))) return true;
			return false;
		}
		return true;
	}

	readonly getGauntletCrew = (
		gauntlet: Gauntlet,
		rankByPair?: string,
		range_max?: number,
		filter?: FilterProps,
		textFilter?: string) => {

		const availmodes = ['none'] as PlayerBuffMode[];

		if (this.context.player.buffConfig) {
			availmodes.push('player');
			availmodes.push('quipment');
		}

		if (this.context.core.all_buffs) {
			availmodes.push('max');
		}

		calculateGauntlet({
			context: this.context,
			settings: this.state.gauntletSettings,
			buffMode: this.getBuffState(availmodes),
			onlyActiveRound: this.state.onlyActiveRound,
			hideOpponents: this.state.hideOpponents,
			equipmentCache: this.crewQuip,
			bonusCache: this.bonusInfo,
			gauntlet,
			rankByPair,
			range_max,
			filter,
			textFilter
		});
	}

	initData() {
		const { crew: allCrew, gauntlets: gauntsin } = this.context.core;
		const { TRAIT_NAMES } = this.context.localized;
		const { playerData } = this.context.player;
		const { textFilter } = this.state;

		if (!(allCrew?.length) || !(gauntsin?.length)) return;
		if (gauntsin.length && this.inited) return;

		const hasPlayer = !!playerData?.player?.character?.crew?.length;
		const gauntlets = JSON.parse(JSON.stringify(gauntsin));

		const liveGauntlet = hasPlayer ? this.state.liveGauntlet : null;

		let uniques = [...gauntlets];

		let qmaps = uniques.map((g, idx) => {
			if (!g || !g.contest_data) return undefined;
			return JSON.stringify(g.contest_data);
		})

		this.setState({ ...this.state, loading: true });

		qmaps = qmaps.filter((q, idx) => q && qmaps.indexOf(q) === idx);
		let pass2 = [] as Gauntlet[];
		for (let q of qmaps) {
			let qparse = uniques.find(x => x.contest_data && JSON.stringify(x.contest_data) === q);
			if (qparse) {
				qparse = JSON.parse(JSON.stringify(qparse)) as Gauntlet;
				qparse.template = true;
				pass2.push(qparse);
			}
		}

		uniques = [{
			gauntlet_id: 0,
			state: "POWER",
			jackpot_crew: "",
			seconds_to_join: 0,
			contest_data: {
				primary_skill: "",
				secondary_skill: "",
				featured_skill: "",
				traits: [] as string[]
			},
			date: (new Date()).toISOString()
		}] as Gauntlet[];

		uniques = uniques.concat(pass2.sort((a, b) => {
			let astr = `${a.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(a.contest_data?.featured_skill ?? "")}`;
			let bstr = `${b.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(b.contest_data?.featured_skill ?? "")}`;
			return astr.localeCompare(bstr);
		}) as Gauntlet[]);

		uniques.forEach((unique, idx) => {
			unique.date = "gt_" + idx;
		})

		gauntlets.slice(0, 3).forEach((node, index) => {
			let rmax = this.state.ranges[index];
			this.getGauntletCrew(node, undefined, rmax, this.state.filterProps[index], textFilter[index]);
		});

		this.getGauntletCrew(uniques[0], undefined, this.state.ranges[3], this.state.filterProps[3], textFilter[3]);

		if (liveGauntlet){
			this.getGauntletCrew(liveGauntlet, undefined, this.state.ranges[4], this.state.filterProps[4], textFilter[4]);
		}

		if (!this.state.gauntlets?.length || !this.inited) {

			const og: Gauntlet[] = gauntlets; //?.filter((gauntlet: Gauntlet) => gauntlet.prettyTraits?.length) ?? [] as Gauntlet[];
			const today = og[0];
			const yesterday = og[1];
			const activePrevGauntlet = og[2];
			const gaunts = og.slice(2);

			let apidx = [1, 1, 1, 1, 1];
			let pcs = [0, 0, 0, 0, 0];
			let aptabs = [[], [], [], [], []] as (PlayerCrew | CrewMember)[][];

			[today, yesterday, activePrevGauntlet, uniques[0], liveGauntlet].forEach((day, idx) => {
				if (!day?.searchCrew) {
					return;
				}

				let ip = this.state.itemsPerPageTab[idx];
				let pc = Math.ceil(day.searchCrew.length / ip);

				aptabs[idx] = day.searchCrew.slice(0, ip);
				pcs[idx] = pc;
			})

			this.inited = true;

			let actIdx = this.state.activeTabIndex;

			if (!hasPlayer) {
				this.tiny.removeValue('liveGauntlet');
				if (actIdx === 4) actIdx = 0;
			}

			this.setState({
				... this.state,
				activeTabIndex: actIdx,
				gauntlets: gaunts,
				activePageTabs: aptabs,
				totalPagesTab: pcs,
				activePageIndexTab: apidx,
				browsingGauntlet: uniques[0],
				today,
				yesterday,
				lastPlayerDate: this.context.player.playerData?.calc?.lastModified,
				activePrevGauntlet,
				uniques,
				loading: false
			});
		}
	}

	private changeGauntlet = (date: string, unique?: boolean) => {
		if (unique) {
			if (date === '') date = "gt_0";
			const g = this.state.uniques?.find((g) => g.date === date);
			this.updatePaging(false, undefined, g, 3);
		}
		else {
			const g = this.state.gauntlets?.find((g) => g.date === date);
			this.updatePaging(false, g);
		}
	}

	private readonly setSkillPairs = (pairs: string[], idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], skillPairs: pairs };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.inited = false;
		this.setState({ ...this.state, filterProps: newOwned, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});
	}

	private readonly setOwnedStatus = (status: OwnedStatus, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], ownedStatus: status };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.inited = false;
		this.setState({ ...this.state, filterProps: newOwned, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});
	}

	private readonly setMaxResults = (max: number, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], maxResults: max };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.setState({... this.state, filterProps: newOwned, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned, loading: false });
		});
	}

	private readonly setTextFilter = (value: string, idx: number) => {
		let filters = this.state.textFilter;
		filters[idx] = value;
		this.tiny.setValue('textFilter', filters);
		this.updatePaging(false, undefined, undefined, idx, undefined, filters, true);
	}

	private readonly updatePaging = (preSorted: boolean, newSelGauntlet?: Gauntlet, replaceGauntlet?: Gauntlet, replaceIndex?: number, replaceRank?: string, textFilter?: string[], justFilter?: boolean) => {
		const { filterProps, today, yesterday, activePrevGauntlet, liveGauntlet, sortKey, sortDirection, browsingGauntlet, rankByPair } = this.state;

		let newBrowseGauntlet: Gauntlet | undefined = undefined;
		let newToday: Gauntlet | undefined = undefined;
		let newYesterday: Gauntlet | undefined = undefined;
		let live: Gauntlet | undefined = undefined;

		if (textFilter && replaceIndex !== undefined && replaceGauntlet === undefined) {
			if (replaceIndex === 0) replaceGauntlet = today ? { ... today } : undefined;
			else if (replaceIndex === 1) replaceGauntlet = yesterday ? { ... yesterday } : undefined;
			else if (replaceIndex === 2) replaceGauntlet = activePrevGauntlet ? { ... activePrevGauntlet } : undefined;
			else if (replaceIndex === 3) replaceGauntlet = browsingGauntlet ? { ... browsingGauntlet } : undefined;
			else if (replaceIndex === 4) replaceGauntlet = liveGauntlet ? { ...liveGauntlet } : undefined;
		}

		textFilter ??= ['', '', '', '', ''];

		if (replaceIndex === 0) newToday = replaceGauntlet ? { ... replaceGauntlet } : undefined;
		else if (replaceIndex === 1) newYesterday = replaceGauntlet ? { ... replaceGauntlet } : undefined;
		else if (replaceIndex === 2) newSelGauntlet = replaceGauntlet ? { ... replaceGauntlet } : undefined;
		else if (replaceIndex === 3) newBrowseGauntlet = replaceGauntlet ? { ... replaceGauntlet } : undefined;
		else if (replaceIndex === 4) live = replaceGauntlet ? { ... replaceGauntlet } : undefined;

		let rmax = 100;
		if (replaceIndex !== undefined) {
			rmax = this.state.ranges[replaceIndex];
		}

		if (!justFilter) {
			if (!preSorted && newSelGauntlet) {
				this.getGauntletCrew(newSelGauntlet, replaceRank, rmax, filterProps[2], textFilter[2]);
			}
			else if (!preSorted && newBrowseGauntlet) {
				this.getGauntletCrew(newBrowseGauntlet, replaceRank, rmax, filterProps[3], textFilter[3]);
			}
			else if (!preSorted && live) {
				this.getGauntletCrew(live, replaceRank, rmax, filterProps[4], textFilter[4]);
			}
			else if (!preSorted && replaceGauntlet) {
				this.getGauntletCrew(replaceGauntlet, replaceRank, rmax, replaceIndex !== undefined ? filterProps[replaceIndex] : undefined, replaceIndex !== undefined ? textFilter[replaceIndex] : undefined);
			}
		}

		let apidx = this.state.activePageIndexTab;
		let pcs = [0, 0, 0, 0, 0];
		let aptabs = [[], [], [], [], []] as (PlayerCrew | CrewMember)[][];

		[newToday ?? today, newYesterday ?? yesterday, newSelGauntlet ?? activePrevGauntlet, newBrowseGauntlet ?? browsingGauntlet, live ?? liveGauntlet].forEach((day, idx) => {
			if (replaceIndex !== undefined && replaceIndex === idx) {
				day = replaceGauntlet;
				rankByPair[replaceIndex] = replaceRank ?? 'none';
				if (rankByPair[replaceIndex] !== 'none') {
					sortDirection[replaceIndex] = undefined;
					sortKey[replaceIndex] = '';
				}
			}

			if (!day) return;

			if (!day.allCrew) {
				return;
			}

			day.searchCrew = day.allCrew.filter(c => this.matchesCrew(c as PlayerCrew, this.state.textFilter[idx]))

			let ip = this.state.itemsPerPageTab[idx];
			let pc = Math.ceil(day.searchCrew.length / ip);

			aptabs[idx] = day.searchCrew.slice(0, ip);
			pcs[idx] = pc;
			if (apidx[idx] > pc) apidx[idx] = pc;
			if (apidx[idx] < 1 && !!day.searchCrew?.length) apidx[idx] = 1;
		});

		this.inited = true;

		this.setState({
			... this.state,
			rankByPair: [...rankByPair],
			activePageTabs: aptabs,
			totalPagesTab: pcs,
			activePageIndexTab: [ ... apidx ] ,
			today: replaceIndex === 0 ? replaceGauntlet : today ? { ...today } : undefined,
			yesterday: replaceIndex === 1 ? replaceGauntlet : yesterday ? { ...yesterday } : undefined,
			activePrevGauntlet: replaceIndex === 2 ? replaceGauntlet : newSelGauntlet ?? activePrevGauntlet,
			browsingGauntlet: replaceIndex === 3 ? newBrowseGauntlet ?? replaceGauntlet : newBrowseGauntlet ?? browsingGauntlet,
			liveGauntlet: replaceIndex === 4 ? replaceGauntlet : live ?? liveGauntlet,
			sortKey: [...sortKey],
			sortDirection: [...sortDirection],
			textFilter: textFilter ?? ''
		});
	}

	readonly getSkillUrl = (skill: string | Skill): string => {
		let skilluse: string | undefined = undefined;

		if (typeof skill === 'string' && skill.length === 3 && skill.toUpperCase() === skill) {
			skilluse = shortToSkill(skill);
		}
		else if (typeof skill === 'string') {
			skilluse = skill;
		}
		else {
			skilluse = skill.skill;
		}

		return `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skilluse}.png`;
	}

	renderTable(gauntlet: Gauntlet, data: (PlayerCrew | CrewMember)[], idx: number) {

        if (!data) return <></>;

		const { textFilter, filterProps } = this.state;
		const filter = filterProps[idx];

		return <GauntletCrewTable
            pageId={`gauntletPage_${idx}`}
            mode={idx === 4 ? 'live' : 'normal'}
			gauntlets={idx === 3 && this.state.browsingGauntlet?.state === 'POWER' ? this.context.core.gauntlets : undefined}
            gauntlet={gauntlet}
            data={data.map(d => d as PlayerCrew)}
            textFilter={textFilter[idx]}
            setTextFilter={(value) => this.setTextFilter(value, idx)}
            rankByPair={this.state.rankByPair}
            filter={filter}
            setRankByPair={(value) => this.setState({...this.state, rankByPair: value})}
            />

	}

	renderGauntlet(gauntletIn: Gauntlet | undefined, idx: number) {
		const { t } = this.context.localized;
		const { loading, onlyActiveRound, activePageTabs, activePageIndexTab, totalPagesTab, viewModes, rankByPair, tops, filterProps } = this.state;
		const { maxBuffs, buffConfig } = this.context.player;
		const { TRAIT_NAMES } = this.context.localized;
		const hasPlayer = !!(this.context.player.playerData?.player?.character?.crew?.length ?? 0);

		const availBuffs = [] as { key: string | number, value: string | number, text: string, content?: JSX.Element }[];

		if (!gauntletIn) {
			if (this.state.uniques?.length) gauntletIn = this.state.uniques[0];
		}

		const featuredCrew = this.context.core.crew.find((crew) => crew.symbol === gauntletIn?.jackpot_crew);
		let jp = [] as CrewMember[];

		if (idx === 3) {
			jp = this.context.core.crew.filter((crew) => {
				return crew.traits_hidden.includes("exclusive_gauntlet");
			})
			.sort((a, b) => {
				return a.date_added.getTime() - b.date_added.getTime();
			});
		}
		else if (idx === 4 && gauntletIn) {
			let pc = gauntletIn.contest_data?.selected_crew?.map(c => this.context.player.playerData?.player.character.crew.find(f => f.symbol === c.archetype_symbol) as PlayerCrew);
			if (pc) jp = pc;
		}

		const jackpots = jp;
		//const oppocrew = (gauntletIn?.opponents?.map(o => o.crew_contest_data.crew ?? [])?.flat() ?? []);

		const filterOptions = hasPlayer ? [
			{ key: 'any', value: 'any', text: t('gauntlet.owned_status.any') },
			{ key: 'maxall', value: 'maxall', text: t('gauntlet.owned_status.maxall') },
			{ key: 'owned', value: 'owned', text: t('gauntlet.owned_status.owned') },
			{ key: 'ownedmax', value: 'ownedmax', text: t('gauntlet.owned_status.ownedmax') },
			{ key: 'fe', value: 'fe', text: t('gauntlet.owned_status.fe') },
			{ key: 'nofe', value: 'nofe', text: t('gauntlet.owned_status.nofe') },
			{ key: 'nofemax', value: 'nofemax', text: t('gauntlet.owned_status.nofemax') },
			{ key: 'unfrozen', value: 'unfrozen', text: t('gauntlet.owned_status.unfrozen') },
			{ key: 'unowned', value: 'unowned', text: t('gauntlet.owned_status.unowned') },
			{ key: 'portal', value: 'portal', text: t('gauntlet.owned_status.portal') },
			{ key: 'gauntlet', value: 'gauntlet', text: t('gauntlet.owned_status.gauntlet') },
			{ key: 'nonportal', value: 'nonportal', text: t('gauntlet.owned_status.nonportal') }
		] :
		[
			{ key: 'any', value: 'any', text: t('gauntlet.unowned_status.any') },
			{ key: 'portal', value: 'portal', text: t('gauntlet.unowned_status.portal') },
			{ key: 'gauntlet', value: 'gauntlet', text: t('gauntlet.unowned_status.gauntlet') },
			{ key: 'nonportal', value: 'nonportal', text: t('gauntlet.unowned_status.nonportal') }
		];

		const skills = CONFIG.SKILLS_SHORT.map(s => s.short).sort();
		const skillFilters = [] as DropdownItemProps[];

		for (let skill1 of skills) {
			skillFilters.push({
				key: skill1,
				value: skill1,
				text: skill1
			});
			for (let skill2 of skills) {
				if (skill1 === skill2) continue;
				let sp = `${skill1}/${skill2}`;
				if (skillFilters.find(f => f.key?.includes(skill1) && f.key?.includes(skill2))) continue;
				skillFilters.push({
					key: sp,
					value: sp,
					text: sp
				});
			}
		}

		availBuffs.push({
			key: 'none',
			value: 'none',
			text: t(BuffNames['none'])
		})

		if (buffConfig) {
			availBuffs.push({
				key: 'player',
				value: 'player',
				text: t(BuffNames['player'])
			})
			availBuffs.push({
				key: 'quipment',
				value: 'quipment',
				text: t(BuffNames['quipment'])
			})

		}

		if (maxBuffs) {
			availBuffs.push({
				key: 'max',
				value: 'max',
				text: t(BuffNames['max'])
			})

		}

		if (!gauntletIn) return <></>;

		const gauntlet = gauntletIn;

		const prettyTraits = gauntlet.state === "POWER" ? [t('gauntlet.base_power')] : gauntlet.contest_data?.traits?.map(t => TRAIT_NAMES[t]);

		const pairs = discoverPairs(gauntlet.searchCrew ?? [])
			.map((pair) => {
				let pf = pair === '' ? 'none' : pair;
				let pn = pair === '' ? '' : pair.slice(2).replace("_", "/");

				return {
					key: pf,
					value: pf,
					text: pn == '' ? 'None' : pn
				}
			});

		const prettyDate = gauntlet.state === "POWER" ? "" : (!gauntlet.template ? moment(gauntlet.date).utc(false).locale(this.context.localized.language === 'sp' ? 'es' : this.context.localized.language).format('dddd, D MMMM YYYY') : "");
		const displayOptions = [{
			key: "pair_cards",
			value: "pair_cards",
			text: t('gauntlet.view_modes.pair_cards.title'),
			title: t('gauntlet.view_modes.pair_cards.heading')
		},
		{
			key: "table",
			value: "table",
			text: t('gauntlet.view_modes.table.title'),
			title: t('gauntlet.view_modes.table.heading'),
		},
		{
			key: "big",
			value: "big",
			text: t('gauntlet.view_modes.big.title'),
			title: t('gauntlet.view_modes.big.heading'),
		},
		{
			key: "small",
			value: "small",
			text: t('gauntlet.view_modes.small.title'),
			heading: t('gauntlet.view_modes.small.heading')
		}]

		if (gauntlet.unavailable_msg) {
			return (
				<Message icon>
					{randomCrew("q_jdl", this.context.core.crew)}
					<Message.Content>
						<Message.Header>{gauntlet.unavailable_msg}</Message.Header>
						{gauntlet.unavailable_desc_msg}
					</Message.Content>
				</Message>
			)
		}

		const currContest = [gauntlet?.contest_data?.primary_skill ?? "", gauntlet?.contest_data?.secondary_skill ?? ""].sort().join()
		const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

		return (

			<div style={{
				marginBottom: "2em",
				overflowX: "auto"
			}}>

				{idx < 2 && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{idx === 0 ? t('gauntlet.pages.today_gauntlet.title') : t('gauntlet.pages.yesterday_gauntlet.title')}</h1>}
				{idx === 4 && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{t('gauntlet.pages.live_gauntlet.title')}</h1>}
				{/* {idx === 2 && <h1>Previous Gauntlets</h1>} */}
				<div style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					margin: 0,
					padding: 0,
				}}>
					{featuredCrew && idx !== 3 &&
						<div style={{
							margin: 0,
							padding: 0,
							marginRight: "1em"
						}}
						>
							<ItemDisplay
								size={64}
								maxRarity={featuredCrew.max_rarity}
								rarity={featuredCrew.max_rarity}
								src={`${process.env.GATSBY_ASSETS_URL}${featuredCrew.imageUrlPortrait}`}
								allCrew={this.context.core.crew}
								playerData={this.context.player.playerData}
								targetGroup='gauntletsHover'
								itemSymbol={featuredCrew?.symbol}
							/>
						</div>
					}
					{idx !== 3 && <div><h2 style={{ margin: 0, padding: 0 }}>{featuredCrew?.name}</h2><i>{t('gauntlet.jackpot_crew_for_date', { date: prettyDate})}</i></div>}

					{!!jackpots?.length && idx === 3 &&
						<Accordion
							style={{margin: "1em 0em"}}
							defaultActiveIndex={-1}
							panels={[{
								index: 0,
								key: 0,
								title: t('gauntlet.browse_gauntlet_exclusives'),
								content: {
									content: <>
									<div style={{
										display: "flex",
										flexDirection:"row",
										flexWrap: "wrap",
										justifyContent: "flex-start",
										alignItems: "left"
									}}>
										{jackpots.sort((a, b) => b.date_added.getTime() - a.date_added.getTime())
										.map((jcrew) => {
											const crit = 0; // ((prettyTraits?.filter(t => jcrew.traits_named.includes(t))?.length ?? 0) * 20 + 5);

											return (
												<div style={{
													margin: "1em",
													padding: 0,
													width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "72px" : "96px",
													display: "flex",
													flexDirection:"column",
													justifyContent:"flex-start",
													alignItems: "center",
													textAlign: "center"
												}}
												>
													<ItemDisplay
														key={"jackpot" + jcrew.symbol}
														size={64}
														maxRarity={jcrew.max_rarity}
														rarity={jcrew.max_rarity}
														src={`${process.env.GATSBY_ASSETS_URL}${jcrew.imageUrlPortrait}`}
														allCrew={this.context.core.crew}
														playerData={this.context.player.playerData}
														targetGroup='gauntletsHover'
														itemSymbol={jcrew?.symbol}
													/>
													<i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin:"0.5em 0 0 0"}}>{jcrew.name}</i>
													<i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin:"0.25em 0 0 0"}}>({moment(jcrew.date_added).locale(this.context.localized.language === 'sp' ? 'es' : this.context.localized.language).format("D MMM YYYY")})</i>
												</div>
											)
										})}
									</div>
									</>
								}
							}]}
						/>}


				</div>

				<div style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start",
					margin: "0.25em 0"
				}}>
					<div style={{
						display: "flex",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
						justifyContent: "space-between"
					}}>
						<div>
							<h3 style={{ fontSize: "1.5em", margin: "0.25em 0" }}>
								{prettyDate}
							</h3>
							{!!jackpots?.length && idx === 4 &&
								<Accordion
									style={{margin: "1em 0em"}}
									defaultActiveIndex={-1}
									panels={[{
										index: 0,
										key: 0,
										title: `Bracket Id: ${gauntlet.bracket_id}`,
										content: {
											content: <>
											<div style={{
												display: "flex",
												flexDirection:"row",
												flexWrap: "wrap",
												justifyContent: "space-between",
											}}>
												{jackpots.sort((a, b) => a.name.localeCompare(b.name))
												.map((jcrew) => {
													const crit = ((prettyTraits?.filter(t => jcrew.traits_named.includes(t))?.length ?? 0) * 20 + 5);

													return (
														<div style={{
															margin: "1em",
															padding: 0,
															width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "72px" : "96px",
															display: "flex",
															flexDirection:"column",
															justifyContent:"flex-start",
															alignItems: "center",
															textAlign: "center"
														}}
														>
															<ItemDisplay
																key={"jackpot" + jcrew.symbol}
																size={64}
																maxRarity={jcrew.max_rarity}
																rarity={jcrew.max_rarity}
																src={`${process.env.GATSBY_ASSETS_URL}${jcrew.imageUrlPortrait}`}
																allCrew={this.context.core.crew}
																playerData={this.context.player.playerData}
																targetGroup='gauntletsHover'
																itemSymbol={jcrew?.symbol}
															/>
															<i style={{ color: undefined, margin:"0.5em 0 0 0"}}>{jcrew.name}</i>
															<i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin:"0.5em 0 0 0"}}>{crit}%</i>
														</div>
													)
												})}
											</div>
											</>
										}
									}]}
								/>}

						</div>

						<div style={{
							display: "flex",
							flexDirection: "column"
						}}>
							<div style={{
								display: "flex",
								flexDirection: "row",
								marginBottom: "0.25em",
								textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
							}}>
								<h4 style={{ marginRight: "0.5em" }}><b>{t('gauntlet.min_max_proficiency')}:&nbsp;</b></h4>
								<div>
								<Dropdown
									style={{
										textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
									}}
									inline
									direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
									options={[0, 100, 200, 300, 400, 500, 600, 700, 800].map(o => { return { text: o, value: o, key: o } })}
									value={this.getRangeMax(idx)}
									onChange={(e, { value }) => this.setRangeMax(idx, value as number)} />
								</div>
							</div>

						</div>

					</div>
					<div style={{
						display: "flex",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
						justifyContent: "space-between"
					}}>
						<h2 style={{ fontSize: "2em", margin: "0.25em 0" }}>

							{gauntlet.state !== "POWER" && (gauntlet.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/") + "/" + skillToShort(gauntlet.contest_data?.featured_skill ?? ""))}
							{gauntlet.state === "POWER" && t('gauntlet.base_power')}

						</h2>

						<div style={{
							display: "flex",
							flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
						}}>
							<div style={{
								display: "flex",
								flexDirection: "column",
								textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
							}}>
								<h4><b>{t('gauntlet.view_modes.title')}</b></h4>

								<Dropdown
									title={t(`gauntlet.view_modes.${viewModes[idx]}.heading`)}
									direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
									options={displayOptions}
									value={viewModes[idx]}
									onChange={(e, { value }) => this.setViewMode(idx, value as (GauntletViewMode))}
								/>
							</div>
						</div>
					</div>
				</div>

				<div style={{margin: "0.75em 0", fontSize: "10pt"}}>
					<i>{t('gauntlet.note_owned_crew_power_calc_msg')}</i>
				</div>

				<div style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "stretch"
				}}>

					<div style={{
						display: "flex",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
						justifyContent: "flex-start"
					}}>
						{viewModes[idx] === 'pair_cards' &&
						<div style={{
							display: "flex",
							flexDirection: "column",
							alignSelf: "left",
							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
							textAlign: "left"
						}}>
							<h4><b>{t('gauntlet.show_top_crew')}</b></h4>

							<Dropdown
								title="Filter Crew by Rank"
								options={[0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: o ? t('gauntlet.top_n', { n: `${o}`}) : t('gauntlet.no_limit'), key: o, value: o } })}
								value={tops[idx]}
								onChange={(e, { value }) => this.setTops(idx, value as number)}
							/>
						</div>}
						{viewModes[idx] === 'pair_cards' &&
						<div style={{
							display: "flex",
							flexDirection: "column",
							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
							textAlign: "left"
						}}>
							<h4><b>{t('gauntlet.max_results_per_table')}</b></h4>

							<Dropdown
								title="Limit Total Results Per Section"
								options={[0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: !o ? 'No Limit' : "" + o, key: o, value: o } })}
								value={filterProps[idx].maxResults}
								onChange={(e, { value }) => this.setMaxResults(value as number, idx)}
							/>
						</div>}
						<div style={{
							display: "flex",
							flexDirection: "column",
							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
							textAlign: "left"
						}}>
							<h4><b>{t('gauntlet.show_buffs_heading')}</b></h4>

							<Dropdown
								title={t('gauntlet.apply_buffs') + (idx === 4 ? ` (${t('gauntlet.note_opponent_stats_no_calc_msg')})` : "")}
								options={availBuffs}
								value={this.getBuffState(availBuffs.map(b => b.key) as PlayerBuffMode[])}
								onChange={(e, { value }) => this.setBuffState(value as PlayerBuffMode)}
							/>
						</div>


						<div style={{
							display: "flex",
							flexDirection: "column",
							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
							textAlign: "left"
						}}>
							<h4><b>{t('gauntlet.owned_status_heading')}</b></h4>

							<Dropdown
								title={t('hints.filter_by_owned_status')}
								scrolling
								options={filterOptions}
								value={filterProps[idx].ownedStatus}
								onChange={(e, { value }) => this.setOwnedStatus(value as OwnedStatus, idx)}
							/>
						</div>


						{idx !== 9 && <div style={{
							display: "flex",
							flexDirection: "column",
							margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
							textAlign: "left"
						}}>
							<h4><b>{t('gauntlet.skills_and_pairs')}</b></h4>
							<div style={{marginLeft: "-1em", marginTop: "-0.5em"}}>
								<Dropdown
									title={t('hints.filter_by_skill')}
									placeholder={t('gauntlet.skills_and_pairs')}
									clearable
									compact
									inline
									scrolling
									multiple
									options={skillFilters}
									value={filterProps[idx].skillPairs ?? []}
									onChange={(e, { value }) => this.setSkillPairs(value as string[], idx)}
								/>
							</div>
						</div>}

						<div style={{display:"flex", flexDirection: "column", height: "100%", justifyContent: "space-evenly"}}>
							{idx === 4 && viewModes[idx] === 'pair_cards' && <div style={{
								display: "flex",
								flexDirection: "row",
								margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 1em 0",
								textAlign: "left"
							}}>

								<Checkbox
									title={t('gauntlet.only_highlight_active_round')}
									options={filterOptions}
									checked={this.getActiveRound()}
									onChange={(e, { checked }) => this.setActiveRound(checked as boolean)}
								/>

								<h4 style={{margin:"0 1em", cursor: "pointer"}} onClick={(e) => this.setActiveRound(!this.getActiveRound())}><b>Highlight Active Round Only</b></h4>
							</div>}
							{idx === 4 && <div style={{
								display: "flex",
								flexDirection: "row",
								margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
								textAlign: "left"
							}}>
								<Checkbox
									title={t('gauntlet.hide_opponents')}
									options={filterOptions}
									checked={this.getHideOpponents()}
									onChange={(e, { checked }) => this.setHideOpponents(checked as boolean)}
								/>

								<h4 style={{margin:"0 1em", cursor: "pointer"}} onClick={(e) => this.setHideOpponents(!this.getHideOpponents())}><b>Hide Opponents</b></h4>
							</div>}
						</div>

					</div>

				{idx === 4 &&
				<div style={{margin: "1em 0 0 0", fontSize: "10pt"}}>
					<i>{t('gauntlet.note_live_crew_highlight_msg')}</i>
				</div>}
				{idx !== 4 && viewModes[idx] === 'table' && (filterProps[idx].ownedStatus === 'ownedmax' || filterProps[idx].ownedStatus === 'maxall') &&
				<div style={{margin: "1em 0 0 0", fontSize: "10pt"}}>
					<i>{t('gauntlet.note_unleveled_crew_max_highlight_table_msg')}</i>
				</div>
				}
				{viewModes[idx] === 'pair_cards' && (filterProps[idx].ownedStatus === 'ownedmax' || filterProps[idx].ownedStatus === 'maxall') &&
				<div style={{margin: "1em 0 0 0", fontSize: "10pt"}}>
					<i>{t('gauntlet.note_unleveled_crew_max_highlight_pair_msg')}</i>
				</div>}

				{loading && <div style={{height:"50vh", display: "flex", flexDirection: "row", justifyContent: "center", alignItems:"center"}}><div className='ui medium centered text active inline loader'>Calculating ...</div></div>}

				{(!loading) && (<div>

					{viewModes[idx] !== 'table' && viewModes[idx] !== 'pair_cards' && <div style={{ margin: "1em 0", width: "100%" }}>
					<div style={{marginBottom: "0.5em"}}>
						<Input
							style={{ width: isMobile ? '100%' : '50%'}}
							iconPosition="left"
							placeholder={t('global.search_ellipses')}
							value={this.state.textFilter[idx]}
							onChange={(e, { value }) => this.setTextFilter(value, idx)}>
							<input />
							<Icon name='search' />
							<Button icon onClick={() => this.setTextFilter('', idx)} >
								<Icon name='delete' />
							</Button>
						</Input>
					</div>
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
									pluginData={[idx === 3 && this.state.browsingGauntlet?.state === 'POWER' ? this.context.core.gauntlets : gauntlet, undefined]}
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
										pluginData={[idx === 3 && this.state.browsingGauntlet?.state === 'POWER' ? this.context.core.gauntlets : gauntlet, undefined]}
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

						<div style={{marginTop:"1.5em"}}>
							{viewModes[idx] === 'table' && this.renderTable(gauntlet, gauntlet.searchCrew ?? [], idx)}
						</div>

						{viewModes[idx] === 'pair_cards' &&
							<div style={{
								margin: 0,
								marginTop: "0em",
								marginBottom: "2em",
								display: "flex",
								flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
								justifyContent: "space-between",
								flexWrap: "wrap"
							}}>
								{getPairGroups(gauntlet.searchCrew ?? [], gauntlet, this.state.gauntletSettings, this.state.hideOpponents, this.state.onlyActiveRound, gauntlet.contest_data?.featured_skill, tops[idx], filterProps[idx].maxResults)
									.map((pairGroup, pk) => {
									return (<GauntletPairTable gauntlet={gauntlet}
                                            key={"pairGroup_" + pk}
                                            currContest={currContest === pairGroup.pair.map(e => shortToSkill(e)).sort().join()}
                                            pairGroup={pairGroup}
                                            boostMode={this.getBuffState()}
                                            onlyActiveRound={this.state.onlyActiveRound}
                                            />)
								})}
							</div>
						}

						{viewModes[idx] !== 'table' && viewModes[idx] !== 'pair_cards' && <div style={{ margin: "1em 0", width: "100%" }}>
						<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
						</div>}

					</div>)}

				</div>

				<br />
			</div>
		)

	}

	renderBrowsableGauntletPage(browsing?: boolean, searching?: boolean) {
		const { activePrevGauntlet, browsingGauntlet, gauntlets, uniques } = this.state;
		const { TRAIT_NAMES, t } = this.context.localized;
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';

		const gauntOpts = (browsing ? uniques : gauntlets).map((g, idx) => {
			let text = "";

			if (g.state === "POWER") {
				text = t('gauntlet.base_power')
			}
			else if (browsing) {
				text = `${g.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(g.contest_data?.featured_skill ?? "")}`;
			}
			else {
				text = moment(g.date).locale(this.context.localized.language === 'sp' ? 'es' : this.context.localized.language).utc(false).format('dddd, D MMMM YYYY') + ` (${g.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/")}/${skillToShort(g.contest_data?.featured_skill ?? "")})`;
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
				<h1>{browsing ? t('gauntlet.pages.browse_gauntlets.title') : t('gauntlet.pages.previous_gauntlets.title')}</h1>

				<div style={{
					display: "flex",
					flexDirection: "column"
				}}>
					<Dropdown
						scrolling
						clearable={searching}
						selection={searching}
						search={searching}
						options={gauntOpts}
						value={browsing ? (browsingGauntlet?.date ?? "gt_0") : (activePrevGauntlet?.date ?? "")}
						onChange={(e, { value }) => this.changeGauntlet(value as string, browsing ? true : false)}
					/>

				</div>
			</div>
			{this.renderGauntlet(browsing ? browsingGauntlet : activePrevGauntlet, browsing ? 3 : 2)}
		</>)
	}

	whyNoPortal(crew: PlayerCrew | CrewMember) {
		const { t } = this.context.localized;
		prettyObtained(crew, t, true)
		if (crew.obtained?.toLowerCase().includes("gauntlet") ||
		crew.obtained?.toLowerCase().includes("voyage") ||
		crew.obtained?.toLowerCase().includes("honor") ||
		crew.obtained?.toLowerCase().includes("boss")) return `${t('crew_state.unowned')} (${prettyObtained(crew, this.context.localized.t, true)})`;
		else return t('crew_state.unowned_no_portal');
	}

	private readonly clearGauntlet = () => {
		this.tiny.setValue('liveGauntlet', undefined);
		this.inited = false;
		this.tiny.setValue('activeTabIndex', 0);
		this.setState({ ... this.state, liveGauntlet: undefined, liveGauntletRoot: undefined, activeTabIndex: 0 });
	}

	private readonly parseGauntlet = (live: GauntletRoot | undefined) => {

		if (!live) {
			this.setState({ ...this.state, liveGauntlet: null, activeTabIndex: 0 });
			return;
		}

		try {
			const root = live;
			const gauntlet = root.character.gauntlets[0];

			if (gauntlet.state?.includes("ENDED")) {
				this.inited = false;
				this.tiny.setValue('liveGauntlet', '', false);
				this.tiny.setValue('activeTabIndex', 0);
				this.setState({ ... this.state, liveGauntlet: null, activeTabIndex: 0 });
				return;
			}

			const dts = gauntlet.bracket_id?.split("_");

			if (dts !== undefined) {
				gauntlet.date = dts[0];
			}

			if (!gauntlet.date && gauntlet.seconds_to_join) {
				let d = new Date((Date.now() + (1000 * gauntlet.seconds_to_join)));
				d = new Date(d.getTime() - (1 * 24 * 60 * 60 * 1000));
				gauntlet.date = d.toISOString();
			}

			this.inited = false;
			// TODO: Dormant Code to merge previous rounds!
			//
			// let json = this.tiny.getValue<string>('liveGauntlet');

			// const prevGauntlet = json ? JSON.parse(json) as Gauntlet : {} as Gauntlet;
			// const curroppos = [ ... gauntlet.opponents ?? [] ];
			// const prevoppos = [ ... prevGauntlet?.opponents ?? [] ];

			// for (let oppo of curroppos) {
			// 	let po = prevoppos.find(fo => fo.player_id === oppo.player_id);
			// 	if (po) {
			// 		const crewdata = [ ... po.crew_contest_data.crew ];
			// 		for (let pcrew of crewdata) {
			// 			let fo = oppo.crew_contest_data.crew.find(foppo => foppo.archetype_symbol === pcrew.archetype_symbol);
			// 			if (fo) {
			// 				let pcopy = [ ... pcrew.skills, ...fo.skills];
			// 				pcopy = pcopy.filter((pf, idx) => pcopy.findIndex(t => t.skill === pf.skill) === idx);
			// 				pcrew.skills = pcopy;
			// 			}
			// 			else {
			// 				po.crew_contest_data.crew.push(pcrew);
			// 			}
			// 		}
			// 	}
			// 	else {
			// 		prevoppos.push(oppo);
			// 	}
			// }

			// gauntlet.opponents = prevoppos;

			//this.tiny.setValue('liveGauntlet', JSON.stringify(gauntlet), false);
			this.tiny.setValue('liveGauntlet', gauntlet, false);
			this.tiny.setValue('activeTabIndex', 4);

			this.setState({ ... this.state, liveGauntlet: gauntlet, liveGauntletRoot: live, activeTabIndex: 4 });
		}
		catch {
			this.tiny.setValue('activeTabIndex', 0);
			this.setState({ ... this.state, liveGauntlet: null, liveGauntletRoot: undefined, activeTabIndex: 0 });
		}
	}

	render() {
		const { tfmt } = this.context.localized;
		const { gauntlets, today, yesterday, liveGauntlet, activeTabIndex } = this.state;
		const isMobile = isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		const hasPlayer = !!this.context.player.playerData?.player?.character?.crew?.length;

		if (!gauntlets) return <></>

		const fs = isMobile ? "0.75em" : "1em";

		const tabPanes = [
			{
				menuItem: isMobile ? tfmt('gauntlet.pages.today_gauntlet.short') : tfmt('gauntlet.pages.today_gauntlet.title'),
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(today, 0)}</div>,
				description: tfmt('gauntlet.pages.today_gauntlet.heading')
			},
			{
				menuItem: isMobile ? tfmt('gauntlet.pages.yesterday_gauntlet.short') : tfmt('gauntlet.pages.yesterday_gauntlet.title'),
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(yesterday, 1)}</div>,
				description: tfmt('gauntlet.pages.yesterday_gauntlet.heading')
			},
			{
				menuItem: isMobile ? tfmt('gauntlet.pages.previous_gauntlets.short') : tfmt('gauntlet.pages.previous_gauntlets.title'),
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage()}</div>,
				description: tfmt('gauntlet.pages.previous_gauntlets.heading')
			},
			{
				menuItem: isMobile ? tfmt('gauntlet.pages.browse_gauntlets.short') : tfmt('gauntlet.pages.browse_gauntlets.title'),
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage(true, true)}</div>,
				description: tfmt('gauntlet.pages.browse_gauntlets.heading')
			}
		]

		if (liveGauntlet && hasPlayer){
			tabPanes.push({
					menuItem: isMobile ? tfmt('gauntlet.pages.live_gauntlet.short') : tfmt('gauntlet.pages.live_gauntlet.title'),
					render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(liveGauntlet, 4)}</div>,
					description: tfmt('gauntlet.pages.live_gauntlet.heading')
				},
			)
		}

		if (activeTabIndex !== undefined && (activeTabIndex < 0 || activeTabIndex >= tabPanes.length)) {
			this.setActiveTabIndex(0);
			return this.context.core.spin();
		}

		if (typeof window !== 'undefined' && hasPlayer) {
			window["gauntletDataSetter"] = (value: string) => {
				this.parseGauntlet(JSON.parse(value));
			}
		}

		return (
			<>
			{hasPlayer &&
					<GauntletImportComponent
						setGauntlet={(g) => this.parseGauntlet(g)}
						clearGauntlet={() => this.clearGauntlet()}
						gauntlet={this.state.liveGauntletRoot}
						currentHasRemote={!!this.state.liveGauntletRoot}
					/>}
				<div style={{margin: "1em 0"}}>
					<Step.Group fluid>
						{tabPanes.map((pane, idx) => {
							return (
								<Step active={(activeTabIndex ?? 0) === idx} onClick={() => this.setActiveTabIndex(idx)}>

									<Step.Content>
										<Step.Title>{pane.menuItem}</Step.Title>
										<Step.Description>{pane.description}</Step.Description>
									</Step.Content>
								</Step>
							)
						})}
					</Step.Group>
					{tabPanes[activeTabIndex ?? 0].render()}

					<GauntletSettingsPopup
						isOpen={this.state.settingsOpen}
						setIsOpen={this.setSettingsOpen}
						config={{
							current: this.state.gauntletSettings,
							setCurrent: this.setSettings,
							defaultOptions: defaultSettings
							}} />
				</div>
				<CrewHoverStat targetGroup='gauntletsHover' />
			</>
		)
	}
}


export default GauntletsPage;