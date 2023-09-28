import React from 'react';
import { Pagination, PaginationProps, Table, Icon, Message, Dropdown, Rating, Button, Form, TextArea, Header, Accordion, Checkbox, DropdownItemProps, SemanticWIDTHS, Step } from 'semantic-ui-react';
import { Link } from 'gatsby';
import * as moment from 'moment';
import { AllTraits } from '../model/traits';
import allTraits from '../../static/structured/translation_en.json';
const traits = allTraits as AllTraits;


import { randomCrew } from '../context/datacontext';
import { GlobalContext } from '../context/globalcontext';
import { CompletionState, PlayerCrew } from '../model/player';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { ComputedBuff, ComputedSkill, CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet, GauntletRoot, Opponent } from '../model/gauntlets';
import { applyCrewBuffs, comparePairs, dynamicRangeColor, getPlayerPairs, getSkills, gradeToColor, isImmortal, updatePairScore, rankToSkill, skillToRank, getCrewPairScore, getPairScore, emptySkill as EMPTY_SKILL, printPortalStatus } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { BuffNames, PlayerBuffMode, PlayerImmortalMode } from '../components/item_presenters/crew_preparer';

import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import DataPageLayout from '../components/page/datapagelayout';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import ItemDisplay from '../components/itemdisplay';
import GauntletSettingsPopup, { GauntletSettings, defaultSettings } from '../components/gauntlet/settings';

export type GauntletViewMode = 'big' | 'small' | 'table' | 'pair_cards';

type SortDirection = 'ascending' | 'descending' | undefined;

const isWindow = typeof window !== 'undefined';

export const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

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
	gauntletJson?: string;
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
	maxResults: 10
} as FilterProps;

export function getBernardsNumber(a: PlayerCrew | CrewMember, gauntlet?: Gauntlet, apairs?: Skill[][] | Skill[], settings?: GauntletSettings) {
	let atrait = gauntlet?.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;
	settings ??= defaultSettings;

	if (atrait >= 3) atrait = settings.crit65;
	else if (atrait >= 2) atrait = settings.crit45;
	else if (atrait >= 1) atrait = settings.crit25;
	else atrait = settings.crit5;
	
	apairs ??= getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
	
	let cn = 0;
	let w = 0;

	if (apairs?.length && ("length" in apairs[0])) {
		const skills = [apairs[0][0], apairs[0][1], apairs.length > 1 ? apairs[1][1] : { core: 0, range_min: 0, range_max: 0 }];

		for (let skill of skills) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}
		if (apairs.length === 1) cn /= 2;
	}	
	else if (apairs?.length && !("length" in apairs[0])) {
		for (let skill of apairs as Skill[]) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}		
	}

	//cn /= w;

	return cn;
}


const GauntletTabCount = 5;


class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType?= GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	private inited: boolean = false;
	private readonly tiny = TinyStore.getStore('gauntlets');

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
		for (let i = 0; i < GauntletTabCount; i++) {
			vmodes.push(this.tiny.getValue<GauntletViewMode>('viewMode_' + i, 'pair_cards') ?? 'pair_cards')
			rmax.push(this.tiny.getValue('gauntletRangeMax_' + i, 500) ?? 500);
			tops.push(this.tiny.getValue('gauntletTops_' + i, 100) ?? 100);
			fprops.push(this.tiny.getValue('gauntletFilter_' + i, DEFAULT_FILTER_PROPS) ?? DEFAULT_FILTER_PROPS);

			skeys.push('');
			sdir.push(undefined);
			aptabs.push([]);
			dpairs.push([]);
			rbpair.push('none');
			ptab.push(0);
			ipage.push(10);
		}

		const settings = this.tiny.getValue<GauntletSettings>('gauntletSettings', defaultSettings) ?? defaultSettings;
		const liveJson = this.tiny.getValue<string | undefined>('liveGauntlet', undefined);
		let lg: Gauntlet | undefined = undefined;

		if (liveJson) {
			try {
				let lgr = JSON.parse(liveJson) as GauntletRoot | Gauntlet;
				if ("state" in lgr) {
					lg = lgr;
				}
				else {
					lg = lgr.character.gauntlets[0];
				}
				
			}
			catch {

			}
		}

		const activeTabIndex = this.tiny.getValue<number>("activeTabIndex", lg ? 4 : 0);

		this.state = {
			loading: true,
			onlyActiveRound: this.tiny.getValue<boolean>('activeRound', true),
			liveGauntlet: lg,
			gauntletJson: '',
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
			settingsOpen: false
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

		const tabs = [this.state.today?.matchedCrew, this.state.yesterday?.matchedCrew, this.state.activePrevGauntlet?.matchedCrew, this.state.browsingGauntlet?.matchedCrew, this.state.liveGauntlet?.matchedCrew];

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
		}
		window.setTimeout(() => this.initData());
	}

	readonly discoverPairs = (crew: (PlayerCrew | CrewMember)[], featuredSkill?: string) => {
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

		ranks.sort((a, b) => {
			if (featuredSkill) {
				let ak = a.includes(featuredSkill);
				let bk = b.includes(featuredSkill);

				if (ak != bk) {
					if (ak) return -1;
					else return 1;
				}
			}

			return a.localeCompare(b);
		})
		return ranks;
	}

	readonly getPairGroups = (crew: (PlayerCrew | CrewMember)[], gauntlet: Gauntlet, featuredSkill?: string, top?: number, maxResults?: number) => {
		featuredSkill ??= gauntlet.contest_data?.featured_skill;
		const pairs = this.discoverPairs(crew, featuredSkill);
		const { onlyActiveRound, hideOpponents } = this.state;
		const featRank = skillToRank(featuredSkill ?? "") ?? "";
		const ptop = top;
		const pairGroups = [] as PairGroup[];
		const currSkills = [gauntlet.contest_data?.primary_skill ?? "", gauntlet.contest_data?.secondary_skill ?? ""].sort().join();

		for (let pair of pairs) {

			if (pair === '') continue;

			let rank = pair;
			let rpairs = pair.replace("G_", "").split("_");

			const px = pairGroups.length;

			let srank = rpairs.map(p => rankToSkill(p) as string).sort();
			let pjoin = srank.join();
			
			const hapres = rpairs.map(z => rankToSkill(z)).sort().join();
			const { gauntletSettings: settings } = this.state;

			pairGroups.push({
				pair: rpairs,
				crew: crew.filter(c => rank in c.ranks && (!ptop || (ptop && c.ranks[rank] <= ptop)))
					.map(d => d as PlayerCrew)
					.filter((crew2) => {		
						if (hideOpponents && crew2.isOpponent) return false;

						if (onlyActiveRound) {
							if (hapres === currSkills) {
								return true;
							}
							else {
								return crew2.isOpponent !== true;
							}
						}	
						else {
							return true;
						}
					})
					.sort((a, b) => {

						let atrait = gauntlet.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;
						let btrait = gauntlet.prettyTraits?.filter(t => b.traits_named.includes(t)).length ?? 0;

						if (atrait >= 3) atrait = settings.crit65;
						else if (atrait >= 2) atrait = settings.crit45;
						else if (atrait >= 1) atrait = settings.crit25;
						else atrait = settings.crit5;

						if (btrait >= 3) btrait = settings.crit65;
						else if (btrait >= 2) btrait = settings.crit45;
						else if (btrait >= 1) btrait = settings.crit25;
						else btrait = settings.crit5;

						let r = 0;
						
						let apairs = getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
						let bpairs = getPlayerPairs(b, btrait, settings.minWeight, settings.maxWeight);

						if (apairs && bpairs) {
							let amatch = [] as Skill[];
							let bmatch = [] as Skill[];
							
							[apairs, bpairs].forEach((pset, idx) => {
								for(let wpair of pset) {
									let djoin = wpair.map(s => s.skill).sort().join();
									if (djoin === pjoin) {
										if (idx === 0) amatch = wpair.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
										else bmatch = wpair.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
										return;
									}
								}
								pset = pset?.filter(ap => ap.some(p2 => p2.skill && srank.includes(p2.skill)));

								if (pset?.length) {
									for (let p of pset[0]) {
										if (p.skill && srank.includes(p.skill)) {
											let glitch = [{
												... p
											},
											{ 
												... JSON.parse(JSON.stringify(EMPTY_SKILL)) as Skill,
												skill: srank.find(sr => sr !== p.skill)
											}
											]
											if (idx === 0) amatch = glitch.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
											else bmatch = glitch.sort((a, b) => a.skill?.localeCompare(b.skill ?? '') ?? 0);
											return;
										}
									}
								}
							});

							const ascore = amatch?.length ? getBernardsNumber(a, gauntlet, amatch, settings) : getBernardsNumber(a, gauntlet, apairs, settings);
							const bscore = bmatch?.length ? getBernardsNumber(b, gauntlet, bmatch, settings) : getBernardsNumber(b, gauntlet, bpairs, settings);
	
							updatePairScore(a, { score: ascore, pair: amatch ?? apairs[0] });
							updatePairScore(b, { score: bscore, pair: bmatch ?? bpairs[0] });

							r = Math.round(bscore) - Math.round(ascore);
							if (!r) r = a.name.localeCompare(b.name);					
						}
						return r ? r : a.ranks[rank] - b.ranks[rank];
					})					
			});

			gauntlet.pairMax ??= [];
			gauntlet.pairMin ??= [];

			pairGroups[px].crew.forEach((c) => {
				let tstr = rpairs.map(z => rankToSkill(z));
				let gp = gauntlet.pairMin?.find(fo => fo.pair.map(foz => foz.skill).sort().join("_") === tstr.sort().join("_"));
				let ps = getCrewPairScore(c, rank);
				if (!ps) return;

				if (!gp) {
					gp = {
						... ps
					};
					gauntlet.pairMin ??= [];
					gauntlet.pairMin.push(gp);
				}
				else {
					if (ps.score < gp.score) {
						gp.score = ps.score;
					}
				}

				gp = gauntlet.pairMax?.find(fo => fo.pair.map(foz => foz.skill).sort().join("_") === tstr.sort().join("_"));

				if (!gp) {
					gp = {
						... ps
					};
					gauntlet.pairMax ??= [];
					gauntlet.pairMax.push(gp);
				}
				else {
					if (ps.score > gp.score) {
						gp.score = ps.score;
					}
				}
				
			})

		}
		if (maxResults) {
			pairGroups.forEach((pg) => {
				pg.crew = pg.crew.slice(0, maxResults);
			})
		}
		pairGroups.sort((a, b) => {

			const apair = a.pair.map(z => rankToSkill(z)).sort().join();
			const bpair = b.pair.map(z => rankToSkill(z)).sort().join();
			
			if (apair !== bpair) {
				if (apair === currSkills) return -1;
				else if (bpair === currSkills) return 1;
			}

			if (a.pair.includes(featRank) === b.pair.includes(featRank)) {
				let r = a.pair[0].localeCompare(b.pair[0]);
				if (!r) {
					r = a.pair[1].localeCompare(b.pair[1]);
				}
				return r;
			}
			else if (a.pair.includes(featRank)) {
				return -1;
			}
			else {
				return 1;
			}
		})		

		return pairGroups;
	}

	readonly getGauntletCrew = (gauntlet: Gauntlet, rankByPair?: string, range_max?: number, filter?: FilterProps) => {
		if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

		const rmax = range_max ?? 500;

		const { buffConfig, maxBuffs } = this.context.player;		
		const { crew: allCrew } = this.context.core;		

		const availBuffs = ['none'] as PlayerBuffMode[];
		const oppo = [] as PlayerCrew[];

		if (gauntlet.opponents?.length && !this.state.hideOpponents) {
			for (let op of gauntlet.opponents){
				const ocrew = op.crew_contest_data.crew[0];
				const nfcrew = this.context.core.crew.find((cf) => cf.symbol === ocrew.archetype_symbol);
				if (nfcrew) {
					const fcrew = JSON.parse(JSON.stringify(nfcrew)) as PlayerCrew;
					for (let skname of Object.keys(fcrew.base_skills)) {
						const skill = fcrew.base_skills[skname] as Skill;
						const opposkill = ocrew.skills.find((f) => f.skill === skname);
						fcrew.skills ??= {};
						fcrew.skills[skname] = {
							...skill,
							range_max: opposkill?.max,
							range_min: opposkill?.min
						};
						fcrew[skname] = {
							core: skill.core,
							max: opposkill?.max,
							min: opposkill?.min
						};
					}

					fcrew.rarity = ocrew.rarity;
					fcrew.isOpponent = true;					
					fcrew.ssId = op.player_id.toString();
					fcrew.immortal = CompletionState.DisplayAsImmortalOpponent;
					fcrew.have = false;
					oppo.push(fcrew);
				}
			}
		}

		if (buffConfig && Object.keys(buffConfig).length) {
			availBuffs.push('player');
		}
		if (maxBuffs && Object.keys(maxBuffs).length) {
			availBuffs.push('max');
		}

		const buffMode = this.getBuffState(availBuffs);

		const hasPlayer = !!this.context.player.playerData?.player?.character?.crew?.length;

		const prettyTraits = gauntlet.contest_data?.traits?.map(t => allTraits.trait_names[t]);
		gauntlet.prettyTraits = prettyTraits;

		if (!prettyTraits) {
			return null
		}
		
		delete gauntlet.matchedCrew;
		delete gauntlet.maximal;
		delete gauntlet.minimal;
		delete gauntlet.pairMax;
		delete gauntlet.pairMin;

		const { gauntletSettings: settings } = this.state;

		const matchedCrew1 =
			allCrew.concat(oppo).map(z => z as PlayerCrew).filter(e => e.max_rarity > 3 && (
				(!rankByPair || (rankByPair in e.ranks)) &&
				(Object.keys(e.base_skills).some(k => e.base_skills[k].range_max >= rmax) || !!e.isOpponent) ||
				prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
				.map((inputCrew) => {
					let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;

					if (!inputCrew.isOpponent) {
						if (buffConfig && buffMode === 'player') {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (maxBuffs && buffMode === 'max') {
							applyCrewBuffs(crew, maxBuffs);
						}
					}

					let c = this.context.player.playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);

					if (!crew.isOpponent && c) {
						crew = JSON.parse(JSON.stringify(c)) as PlayerCrew;
						if (buffConfig && buffMode === 'player') {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (maxBuffs && buffMode === 'max') {
							applyCrewBuffs(crew, maxBuffs);
						}
						else {
							for (let skill of Object.keys(crew.base_skills)) {
								crew[skill] = { core: crew.base_skills[skill].core, min: crew.base_skills[skill].range_min, max: crew.base_skills[skill].range_max };								
							}
						}
						crew.have = true;
					}
					else {
						crew.have = !!c;
						let skills = getSkills(crew);
						for (let s of skills) {
							if (!(s in crew)) {
								crew[s] = {
									core: 0,
									min: 0,
									max: 0
								}
							}
						}
					}

					
					if (!crew.isOpponent) {
						if (gauntlet.contest_data?.selected_crew?.length) {
							let selcrew = gauntlet.contest_data.selected_crew.find((sel) => sel.archetype_symbol === crew.symbol);
							if (selcrew) {
								if (selcrew.disabled) {
									crew.isDisabled = true;
								}
								else {
									let oskill = crew.skills;
									crew.skills = {};

									delete crew.command_skill;
									delete crew.diplomacy_skill;
									delete crew.engineering_skill;
									delete crew.security_skill;
									delete crew.science_skill;
									delete crew.medicine_skill;

									for (let selskill of selcrew.skills) {								
										let sk = selskill.skill;
										crew.isDebuffed = (oskill[sk].range_max > selskill.max);
										crew.skills[sk] = { core: 0, range_max: selskill.max, range_min: selskill.min } as Skill;
										crew[sk] = { core: 0, max: selskill.max, min: selskill.min } as ComputedBuff;
									}
								}
							}
						}
				
						if (!hasPlayer) crew.rarity = crew.max_rarity;
						else if (!c) crew.rarity = 0;
						if (!crew.immortal || crew.immortal < 0) {
							crew.immortal = hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
						}
					}
					else {
						crew.immortal = CompletionState.DisplayAsImmortalOpponent;
						crew.have = false;
					}
					
					crew.pairs = getPlayerPairs(crew);					
					return crew;
				})
				.filter((crew) => !filter || this.crewInFilter(crew, filter))
				.map((crew) => { 
					if (filter?.ownedStatus === 'nofemax' || filter?.ownedStatus === 'ownedmax' || filter?.ownedStatus === 'maxall') {
						if ((crew.level === 100 && crew.equipment?.length === 4) || !crew.have) return crew;
						let fcrew = allCrew.find(z => z.symbol === crew.symbol);
						if (!fcrew) return crew;

						crew.base_skills = JSON.parse(JSON.stringify(fcrew.base_skills));
						crew.rarity = crew.max_rarity;
						crew.level = 100;
						crew.equipment = [0,1,2,3];
						crew.immortal = CompletionState.DisplayAsImmortalOwned;
						crew.skills ??= {};
						for (let skill of Object.keys(crew.base_skills)) {
							crew.skills[skill] = { ... crew.base_skills[skill] };
						}
						if (buffMode === 'player' && buffConfig) {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (buffMode === 'max' && maxBuffs) {
							applyCrewBuffs(crew, maxBuffs);
						}
						crew.pairs = getPlayerPairs(crew);
					}
					return crew;
				})
				.sort((a, b) => {

					if (rankByPair) {
						return a.ranks[rankByPair] - b.ranks[rankByPair];
					}

					let r = 0;

					let atrait = prettyTraits.filter(t => a.traits_named.includes(t)).length;
					let btrait = prettyTraits.filter(t => b.traits_named.includes(t)).length;

					if (atrait >= 3) atrait = settings.crit65;
					else if (atrait >= 2) atrait = settings.crit45;
					else if (atrait >= 1) atrait = settings.crit25;
					else atrait = settings.crit5;

					if (btrait >= 3) btrait = settings.crit65;
					else if (btrait >= 2) btrait = settings.crit45;
					else if (btrait >= 1) btrait = settings.crit25;
					else btrait = settings.crit5;

					let ap = getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
					let bp = getPlayerPairs(b, btrait, settings.minWeight, settings.maxWeight);

					if (!a.score) {
						a.score = getBernardsNumber(a, gauntlet, ap, settings);
					}

					if (!b.score) {
						b.score = getBernardsNumber(b, gauntlet, bp, settings);
					}

					r = r = Math.round(b.score) - Math.round(a.score);;

					if (!r) r = a.name.localeCompare(b.name);
					return r;
				});
		
		let matchedResults: PlayerCrew[] | undefined = undefined;

		if (gauntlet.prettyTraits?.length) {
			const maxpg = 10;
			let pgs = this.getPairGroups(matchedCrew1, gauntlet, undefined, 100, maxpg);
		
			const incidence = {} as { [key: string]: number };
			const avgidx = {} as { [key: string]: number };
	
			for(let pg of pgs) {
				let idx = 1;
				
				for (let pgcrew of pg.crew) {
					incidence[pgcrew.symbol] ??= 0;				
					incidence[pgcrew.symbol]++;

					avgidx[pgcrew.symbol] ??= 0;
					avgidx[pgcrew.symbol] += idx;

					idx++;
				}
			}
			
			Object.keys(avgidx).forEach(key => {
				avgidx[key] /= incidence[key];
			});
	
			matchedResults = matchedCrew1.filter(c => c.symbol in incidence).sort((a, b) => {
				let r = 0;
				let anum = (maxpg - avgidx[a.symbol]) * incidence[a.symbol];
				let bnum = (maxpg - avgidx[b.symbol]) * incidence[b.symbol];

				r = bnum - anum;
				return r;
			});
		}
		else {
			matchedResults = matchedCrew1;
		}

		const matchedCrew = matchedResults;

		gauntlet.matchedCrew = matchedCrew;
		gauntlet.origRanks = {};
		
		let maximal = 0;
		let minimal = 0;

		matchedCrew.forEach((crew, idx) => {
			if (maximal === 0 || (crew.score && crew.score > maximal)) {
				maximal = crew.score ?? 0;
			}
			if (minimal === 0 || (crew.score && crew.score < minimal)) {
				minimal = crew.score ?? 0;
			}

			gauntlet.origRanks ??= {};
			gauntlet.origRanks[crew.symbol] = idx + 1;
		});

		gauntlet.maximal = maximal;
		gauntlet.minimal = minimal;
		gauntlet.prettyTraits = prettyTraits;
	}

	initData() {
		const { crew: allCrew, gauntlets: gauntsin } = this.context.core;
		const { playerData } = this.context.player;

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
			let astr = `${a.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[a.contest_data?.featured_skill ?? ""]}`;
			let bstr = `${b.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[b.contest_data?.featured_skill ?? ""]}`;
			return astr.localeCompare(bstr);
		}) as Gauntlet[]);

		uniques.forEach((unique, idx) => {
			unique.date = "gt_" + idx;
		})

		gauntlets.slice(0, 3).forEach((node, index) => {
			let rmax = this.state.ranges[index];
			this.getGauntletCrew(node, undefined, rmax, this.state.filterProps[index]);
		});

		this.getGauntletCrew(uniques[0], undefined, this.state.ranges[3], this.state.filterProps[3]);

		if (liveGauntlet){
			this.getGauntletCrew(liveGauntlet, undefined, this.state.ranges[4], this.state.filterProps[4]);
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
				if (!day?.matchedCrew) {
					return;
				}

				let ip = this.state.itemsPerPageTab[idx];
				let pc = Math.ceil(day.matchedCrew.length / ip);

				aptabs[idx] = day.matchedCrew.slice(0, ip);
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

	private readonly crewInFilter = (crew: PlayerCrew, filter: FilterProps): boolean => {
		const hasPlayer = !!this.context.player.playerData?.player?.character?.crew?.length;
		if (!filter.rarity || crew.rarity === filter.rarity) {
			if (filter.skillPairs?.length) {
				if (!filter.skillPairs.some((sp) => {
					let p = sp.split("/");
					let p1 = rankToSkill(p[0]);
					if (p.length === 1) {
						return !p1 || (p1 in crew && crew[p1].max);
					}
					let p2 = rankToSkill(p[1]);
					if (!p1 || !p2) return true;
					return (p1 in crew && crew[p1].max && p2 in crew && crew[p2].max);
				})) return false;
			}
			if (filter.ownedStatus) {
				switch(filter.ownedStatus) {
					case 'any':
					case 'maxall':
						return true;
					case 'fe':
						if (!hasPlayer) return true;
						return !!crew.have && crew.level === 100 && crew.equipment?.length === 4;
					case 'nofe':
					case 'nofemax':
						if (!hasPlayer) return true;
						return !!crew.have && (crew.level !== 100 || crew.equipment?.length !== 4);						
					case 'ownedmax':
						if (!hasPlayer) return true;
					 	return !!crew.have;						
					case 'unfrozen':
						if (!hasPlayer) return true;
						return !!crew.have && crew.immortal <= 0;						
					case 'owned':
						if (!hasPlayer) return true;
						return !!crew.have;
					case 'unowned':
						if (!hasPlayer) return true;
						return !crew.have;
					case 'portal':
						return !crew.have && crew.in_portal;
					case 'nonportal':
						return !crew.have && !crew.in_portal; 
					case 'gauntlet':
						return !crew.have && !crew.in_portal && crew.obtained.toLowerCase().includes("gauntlet");
					
				}
			}
		}
		return true;
	}

	private readonly setSkillPairs = (pairs: string[], idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], skillPairs: pairs };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx]);
		this.inited = false;
		this.setState({ ...this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});	
	}
	
	private readonly setOwnedStatus = (status: OwnedStatus, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], ownedStatus: status };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx]);
		this.inited = false;
		this.setState({ ...this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});	
	}

	private readonly setMaxResults = (max: number, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], maxResults: max };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx]);
		this.setState({... this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned, loading: false });
		});	
	}

	private readonly updatePaging = (preSorted: boolean, newSelGauntlet?: Gauntlet, replaceGauntlet?: Gauntlet, replaceIndex?: number, replaceRank?: string) => {
		const { filterProps, today, yesterday, activePrevGauntlet, liveGauntlet, sortKey, sortDirection, browsingGauntlet, rankByPair } = this.state;

		let newBrowseGauntlet: Gauntlet | undefined = undefined;
		let newToday: Gauntlet | undefined = undefined;
		let newYesterday: Gauntlet | undefined = undefined;
		let live: Gauntlet | undefined = undefined;

		if (replaceIndex === 0) newToday = replaceGauntlet;
		else if (replaceIndex === 1) newYesterday = replaceGauntlet;
		else if (replaceIndex === 2) newSelGauntlet = replaceGauntlet;
		else if (replaceIndex === 3) newBrowseGauntlet = replaceGauntlet;
		else if (replaceIndex === 4) live = replaceGauntlet;

		let rmax = 500;
		if (replaceIndex !== undefined) {
			rmax = this.state.ranges[replaceIndex];
		}
		if (!preSorted && newSelGauntlet) {
			this.getGauntletCrew(newSelGauntlet, replaceRank, rmax, filterProps[2]);
		}
		else if (!preSorted && newBrowseGauntlet) {
			this.getGauntletCrew(newBrowseGauntlet, replaceRank, rmax, filterProps[3]);
		}
		else if (!preSorted && live) {
			this.getGauntletCrew(live, replaceRank, rmax, filterProps[4]);
		}
		else if (!preSorted && replaceGauntlet) {
			this.getGauntletCrew(replaceGauntlet, replaceRank, rmax, replaceIndex !== undefined ? filterProps[replaceIndex] : undefined);
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

		this.setState({
			... this.state,
			rankByPair: [...rankByPair],
			activePageTabs: aptabs,
			totalPagesTab: pcs,
			activePageIndexTab: apidx,
			today: replaceIndex === 0 ? replaceGauntlet : today ? { ...today } : undefined,
			yesterday: replaceIndex === 1 ? replaceGauntlet : yesterday ? { ...yesterday } : undefined,
			activePrevGauntlet: replaceIndex === 2 ? replaceGauntlet : newSelGauntlet ?? activePrevGauntlet,
			browsingGauntlet: replaceIndex === 3 ? replaceGauntlet : newBrowseGauntlet ?? browsingGauntlet,
			liveGauntlet: replaceIndex === 4 ? replaceGauntlet : live ?? liveGauntlet,
			sortKey: [...sortKey],
			sortDirection: [...sortDirection]
		});
	}

	private readonly columns = [
		{ title: "Rank", key: "index" },
		{ title: "Crew", key: "name", width: 3 as SemanticWIDTHS },
		{ title: "Rarity", key: "rarity" },
		{ title: "Crit Chance", key: "crit" },
		{ title: "1st Pair", key: "pair_1" },
		{ title: "2nd Pair", key: "pair_2" },
		{ title: "3rd Pair", key: "pair_3" },
		// { title: "Owned", key: "have" },
		{ title: "In Portal", key: "in_portal" },
	]

	private columnClick = (key: string, tabidx: number) => {
		const { today, yesterday, activePrevGauntlet, browsingGauntlet, liveGauntlet, sortDirection, sortKey, rankByPair } = this.state;
		const pages = [today, yesterday, activePrevGauntlet, browsingGauntlet, liveGauntlet];

		if (tabidx in pages && pages[tabidx]) {

			rankByPair[tabidx] = 'none';

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

			this.updatePaging(true, undefined, { ...page, matchedCrew: newarr }, tabidx, 'none');
		}
	}

	readonly getSkillUrl = (skill: string | Skill): string => {
		let skilluse: string | undefined = undefined;

		if (typeof skill === 'string' && skill.length === 3 && skill.toUpperCase() === skill) {
			skilluse = rankToSkill(skill);
		}
		else if (typeof skill === 'string') {
			skilluse = skill;
		}
		else {
			skilluse = skill.skill;
		}

		return `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skilluse}.png`;
	}

	private formatPair(pair: Skill[], style?: React.CSSProperties, debuff?: boolean, disabled?: boolean): JSX.Element {
		if (!pair[0].skill) return <></>
		
		const disabledOpacity = 0.5;

		const orangeColor = 'orange';
		const redColor = '#ff3300';

		return (
			<div style={{
				...style,
				display: "flex",
				flexDirection: "row",
				justifyContent: "center"
			}}>
				{debuff && <i title={"Crew power is reduced"} className="down arrow icon" style={{margin: "0.375em 0", fontSize: "10pt", color: orangeColor}} />}
				{disabled && <i title={"Crew is disabled"} className="exclamation circle icon" style={{margin: "0.375em 0", fontSize: "10pt", color: redColor }} />}
				<div style={{
					display: "flex",
					flexDirection: "row",
					opacity: disabled ? disabledOpacity : undefined
				}}>
					<img style={{ maxHeight: '1.5em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[0].skill}.png`} />
					<div style={{
						margin: "0.5em"
					}}>
						{pair[0].range_min}-{pair[0].range_max}
					</div>
				</div>
				{pair.length > 1 &&
					<div style={{
						display: "flex",
						flexDirection: "row",
						opacity: disabled ? disabledOpacity : undefined
					}}>
						<img style={{ maxHeight: '1.5em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[1].skill}.png`} />
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

		const { totalPagesTab, activePageIndexTab, sortDirection, sortKey, filterProps } = this.state;
		const filter = filterProps[idx];
		const pageIdx = idx;
		let pp = this.state.activePageIndexTab[idx] - 1;
		pp *= this.state.itemsPerPageTab[idx];

		const buffConfig = this.context.player.buffConfig;

		const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
			console.log("imageClick");
			// if (matchMedia('(hover: hover)').matches) {
			// 	window.location.href = "/crew/" + data.symbol;
			// }
		}

		const prettyTraits = gauntlet.prettyTraits;

		return (<div style={{ overflowX: "auto" }}>
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell colSpan={9}>
							<div style={{ margin: "1em 0", width: "100%" }}>
								<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
							</div>
						</Table.HeaderCell>
					</Table.Row>
					<Table.Row>
						{this.columns.map((col, hidx) =>
							<Table.HeaderCell
								width={col.width}
								sorted={sortKey[idx] === col.key ? sortDirection[idx] : undefined}
								onClick={(e) => this.columnClick(col.key, idx)}
								key={"k_" + hidx}>
								{col.title}
							</Table.HeaderCell>)}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((row, idx: number) => {
						const crew = row;
						const pairs = crew.pairs ?? getPlayerPairs(crew);
						const rank = gauntlet.origRanks ? gauntlet.origRanks[crew.symbol] : idx + pp + 1;
						const inMatch = !!gauntlet.contest_data?.selected_crew?.some((c) => c.archetype_symbol === crew.symbol);

						return (crew &&
							<Table.Row key={idx}
								negative={crew.isOpponent}
								positive={
									
									(pageIdx !== 4 && (filter?.ownedStatus === 'maxall' || filter?.ownedStatus === 'ownedmax') && crew.immortal === CompletionState.DisplayAsImmortalOwned)
									|| (pageIdx === 4 && inMatch)
								}
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
											>
												<img
													onClick={(e) => imageClick(e, crew)}
													width={48}
													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
												/>
											</CrewTarget>
											{crew.immortal > 0 &&
												<div style={{
													marginTop: "-16px",
													color: "white",
													display: "flex",
													flexDirection: "row",
													justifyContent: "flex-end"
												}}>
													<i className="snowflake icon" />
												</div>}
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
								{/* <Table.Cell width={2}>
									{crew.have === true ? "Yes" : "No"}
								</Table.Cell> */}
								<Table.Cell width={2}>
									<span title={printPortalStatus(crew, true, true, true)}>
										{printPortalStatus(crew, true, false)}
									</span>
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.Cell colSpan={9}>
							<div style={{ margin: "1em 0", width: "100%" }}>
								<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
							</div>
						</Table.Cell>
					</Table.Row>
				</Table.Footer>
			</Table>
			<CrewHoverStat targetGroup='gauntletTable' />
		</div>);
	}	

	renderGauntlet(gauntletIn: Gauntlet | undefined, idx: number) {

		const { loading, onlyActiveRound, activePageTabs, activePageIndexTab, totalPagesTab, viewModes, rankByPair, tops, filterProps } = this.state;
		const { maxBuffs, buffConfig } = this.context.player;
		const hasPlayer = !!(this.context.player.playerData?.player?.character?.crew?.length ?? 0);

		const availBuffs = [] as { key: string | number, value: string | number, text: string, content?: JSX.Element }[];

		if (!gauntletIn) {
			if (this.state.uniques?.length) gauntletIn = this.state.uniques[0];
		}

		const featuredCrew = this.context.core.crew.find((crew) => crew.symbol === gauntletIn?.jackpot_crew);
		let jp = [] as CrewMember[];
		
		if (idx === 3) {
			jp = this.context.core.crew.filter((crew) => {
				return (crew.obtained.toLowerCase().includes("gauntlet"));
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
			{ key: 'any', value: 'any', text: 'All Crew' },
			{ key: 'maxall', value: 'maxall', text: 'All Crew as Maxed' },
			{ key: 'owned', value: 'owned', text: 'Owned Crew' },
			{ key: 'ownedmax', value: 'ownedmax', text: 'Owned Crew as Maxed' },
			{ key: 'fe', value: 'fe', text: 'Owned, Fully Equipped Crew' },
			{ key: 'nofe', value: 'nofe', text: 'Owned, Not Fully Equipped Crew' },
			{ key: 'nofemax', value: 'nofemax', text: 'Owned, Not Fully Equipped Crew as Maxed' },
			{ key: 'unfrozen', value: 'unfrozen', text: 'Owned, Unfrozen Crew' },
			{ key: 'unowned', value: 'unowned', text: 'Unowned Crew' },
			{ key: 'portal', value: 'portal', text: 'Unowned, Portal-Available Crew' },
			{ key: 'gauntlet', value: 'gauntlet', text: 'Unowned, Gauntlet Exclusive Crew' },
			{ key: 'nonportal', value: 'nonportal', text: 'Unowned, Non-Portal Crew' },
		] :
		[
			{ key: 'any', value: 'any', text: 'All Crew' },
			{ key: 'portal', value: 'portal', text: 'Portal-Available Crew' },
			{ key: 'gauntlet', value: 'gauntlet', text: 'Gauntlet Exclusive Crew' },
			{ key: 'nonportal', value: 'nonportal', text: 'Non-Portal Crew' },
		];

		

		const skills = ['CMD', 'DIP', 'SEC', 'SCI', 'ENG', 'MED'].sort();
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
			text: BuffNames['none']
		})

		if (buffConfig) {
			availBuffs.push({
				key: 'player',
				value: 'player',
				text: BuffNames['player']
			})

		}

		if (maxBuffs) {
			availBuffs.push({
				key: 'max',
				value: 'max',
				text: BuffNames['max']
			})

		}

		if (!gauntletIn) return <></>;

		const gauntlet = gauntletIn;

		const prettyTraits = gauntlet.state === "POWER" ? ["Raw Power Score"] : gauntlet.contest_data?.traits?.map(t => allTraits.trait_names[t]);

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

		const prettyDate = gauntlet.state === "POWER" ? "" : (!gauntlet.template ? moment(gauntlet.date).utc(false).format('dddd, D MMMM YYYY') : "");
		const displayOptions = [{
			key: "pair_cards",
			value: "pair_cards",
			text: "Pair Groups"
		},
		{
			key: "table",
			value: "table",
			text: "Table"
		},
		{
			key: "big",
			value: "big",
			text: "Large Presentation"
		},
		{
			key: "small",
			value: "small",
			text: "Small Presentation"
		}]

		if (gauntlet.unavailable_msg) {
			return (
				<Message icon>
					{randomCrew("q_jdl")}
					<Message.Content>
						<Message.Header>{gauntlet.unavailable_msg}</Message.Header>
						{gauntlet.unavailable_desc_msg}
					</Message.Content>
				</Message>
			)
		}

		const currContest = [gauntlet?.contest_data?.primary_skill ?? "", gauntlet?.contest_data?.secondary_skill ?? ""].sort().join()

		return (

			<div style={{
				marginBottom: "2em",
				overflowX: "auto"
			}}>

				{idx < 2 && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>{idx === 0 ? "Today" : "Yesterday"}'s Gauntlet</h1>}
				{idx === 4 && <h1 style={{ margin: 0, marginBottom: "0.5em", padding: 0 }}>Live Gauntlet</h1>}
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
					{idx !== 3 && <div><h2 style={{ margin: 0, padding: 0 }}>{featuredCrew?.name}</h2><i>Jackpot Crew for {prettyDate}</i></div>}

					{!!jackpots?.length && idx === 3 &&
						<Accordion
							style={{margin: "1em 0em"}}
							defaultActiveIndex={-1}
							panels={[{
								index: 0, 
								key: 0,
								title: "Browse Gauntlet Exclusive Crew (Click Here)",
								content: {
									content: <>
									<div style={{
										display: "flex",
										flexDirection:"row",			
										flexWrap: "wrap",							
										justifyContent: "space-between",										
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
													<i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin:"0.25em 0 0 0"}}>({moment(jcrew.date_added).format("D MMM YYYY")})</i>
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
								<h4 style={{ marginRight: "0.5em" }}><b>Minimum Proficiency Max:&nbsp;</b></h4>
								<div>
								<Dropdown
									style={{
										textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
									}}
									inline
									direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
									options={[100, 200, 300, 400, 500, 600, 700, 800].map(o => { return { text: o, value: o, key: o } })}
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

							{gauntlet.state !== "POWER" && (gauntlet.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/") + "/" + SKILLS[gauntlet.contest_data?.featured_skill ?? ""])}
							{gauntlet.state === "POWER" && "Raw Power Scores"}
							
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
					
				<div style={{margin: "0.75em 0", fontSize: "10pt"}}>
					<i><b>Note:</b> If owned crew are detected, then their current level in your roster may be used to compute their rank, depending on filter settings.</i>
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
							<h4><b>Show Top Crew</b></h4>

							<Dropdown
								title="Filter Crew by Big Book Rank"
								options={[0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: o ? "Top " + o : "No Limit", key: o, value: o } })}
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
							<h4><b>Max Results Per Section</b></h4>

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
							<h4><b>Show Buffs</b></h4>

							<Dropdown
								title={"Apply Buffs to Stats" + (idx === 4 ? " (Note: Opponent stats are not recomputed)" : "")}
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
							<h4><b>Owned Status</b></h4>

							<Dropdown
								title="Filter Crew by Owned Status"
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
							<h4><b>Skills &amp; Pairs</b></h4>
							<div style={{marginLeft: "-1em", marginTop: "-0.5em"}}>
								<Dropdown
									title={"Filter by skills or pairs"}
									placeholder="Skills & Pairs"										
									clearable
									compact
									inline
									multiple
									options={skillFilters}
									value={filterProps[idx].skillPairs}
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
									title="Highlight Active Round Only"
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
									title="Hide Opponents"
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
					<i><b>Note:</b> Your selected gauntlet crew will appear highlighted in green, while opponents will appear highlighted in red.</i>
				</div>}
				{idx !== 4 && viewModes[idx] === 'table' && (filterProps[idx].ownedStatus === 'ownedmax' || filterProps[idx].ownedStatus === 'maxall') &&
				<div style={{margin: "1em 0 0 0", fontSize: "10pt"}}>
					<i><b>Note:</b> Unleveled, owned crew that are shown maxed are highlighted in green.</i>
				</div>
				}
				{viewModes[idx] === 'pair_cards' && (filterProps[idx].ownedStatus === 'ownedmax' || filterProps[idx].ownedStatus === 'maxall') &&
				<div style={{margin: "1em 0 0 0", fontSize: "10pt"}}>
					<i><b>Note:</b> Unleveled, owned crew that are shown maxed have proficiencies that are underlined and highlighted in green.</i>
				</div>}

				{loading && <div style={{height:"50vh", display: "flex", flexDirection: "row", justifyContent: "center", alignItems:"center"}}><div className='ui medium centered text active inline loader'>Calculating ...</div></div>}
				
				{(!loading) && (<div>

					{viewModes[idx] !== 'table' && viewModes[idx] !== 'pair_cards' && <div style={{ margin: "1em 0", width: "100%" }}>
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

						<div style={{marginTop:"1.5em"}}>
							{viewModes[idx] === 'table' && this.renderTable(gauntlet, activePageTabs[idx] as PlayerCrew[], idx)}
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
								{this.getPairGroups(gauntlet.matchedCrew ?? [], gauntlet, gauntlet.contest_data?.featured_skill, tops[idx], filterProps[idx].maxResults)
									.map((pairGroup, pk) => {
									return (<div
										key={"pairGroup_" + pk}
										style={{
											padding: 0,
											margin: 0,
											display: "flex",										
											width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : undefined,
											flexDirection: "column",
											justifyContent: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "center" : "stretch",
										}}>

										<div
											className='ui segment'
											style={{
												textAlign: "center",
												display: "flex",
												flexDirection: "row",
												fontSize: "18pt",
												marginTop: "1em",
												marginBottom: "0.5em",
												justifyContent: "center",
												paddingTop: "0.6em",
												paddingBottom: "0.5em",
												backgroundColor: 
													currContest === pairGroup.pair.map(e => rankToSkill(e)).sort().join() ? 'royalblue' : (pairGroup.pair.includes(skillToRank(gauntlet.contest_data?.featured_skill as string) as string) ? "slateblue" : undefined),

											}}>
											{pairGroup.pair.map((p, ik) => {
												return (
													<div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
														<img key={ik} src={this.getSkillUrl(p)} style={{ height: "1em", maxWidth: "1em", marginLeft: "0.25em", marginRight: "0.25em" }} /> {p} {ik === 0 && <span>&nbsp;/&nbsp;</span>}
													</div>
												)
											})}
										</div>
										{pairGroup.crew.map((crew) => (
											this.renderPairCard(crew, gauntlet, pairGroup.pair)))}
									</div>)
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

		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';

		const gauntOpts = (browsing ? uniques : gauntlets).map((g, idx) => {
			let text = "";

			if (g.state === "POWER") {
				text = 'Raw Power Scores'
			}
			else if (browsing) {
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
						clearable={searching}
						selection={searching}
						search={searching}
						options={gauntOpts}
						value={browsing ? (browsingGauntlet?.date ?? "g_0") : (activePrevGauntlet?.date ?? "")}
						onChange={(e, { value }) => this.changeGauntlet(value as string, browsing ? true : false)}
					/>

				</div>
			</div>
			{this.renderGauntlet(browsing ? browsingGauntlet : activePrevGauntlet, browsing ? 3 : 2)}
		</>)
	}

	renderPairCard(crew: CrewMember | PlayerCrew, gauntlet: Gauntlet, pair: string[]) {
		const skills = pair.map(m => rankToSkill(m));
		const crewpair = [] as Skill[];
		const prettyTraits = gauntlet.prettyTraits;
		const crit = ((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5);
		const critColor = gradeToColor(crit);
		const gmin = getPairScore(gauntlet.pairMin ?? [], pair.join("_"));
		const gmax = getPairScore(gauntlet.pairMax ?? [], pair.join("_"));
		const crewPairScore = getCrewPairScore(crew as PlayerCrew, pair.join("_"));
		const bigNumberColor = dynamicRangeColor("score" in crew ? (crewPairScore?.score ?? 0) : 0, gmax?.score ?? 0, gmin?.score ?? 0);
		const critString = crit + "%";
		const boostMode = this.getBuffState();
		const powerColor = ("immortal" in crew && crew.immortal === CompletionState.DisplayAsImmortalOwned) ? 'lightgreen' : undefined;
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';
		
		const roundPair = gauntlet?.contest_data?.secondary_skill ? [gauntlet?.contest_data?.primary_skill, gauntlet?.contest_data?.secondary_skill] : []
		const isRound = !this.state.onlyActiveRound || (skills.every(s => roundPair.some(e => s === e)));
		const inMatch = !!gauntlet.contest_data?.selected_crew?.some((c) => c.archetype_symbol === crew.symbol);
		const isOpponent = "isOpponent" in crew && crew.isOpponent;
		let tempicon = "";
		if (inMatch && this.context.player.playerData) {
			tempicon = this.context.player.playerData.player.character.crew_avatar.portrait.file;
		}
		const myIcon = tempicon;
		let tempoppo: Opponent | undefined = undefined;
		if (isOpponent) {
			tempoppo = gauntlet.opponents?.find(o => o.player_id === Number.parseInt(crew?.ssId ?? "0"));	
			if (tempoppo?.icon?.file && !tempoppo.icon.file.includes(".png")) {
				tempoppo.icon.file = tempoppo.icon.file.replace("/crew_icons/", "crew_icons_") + ".png";
			}		
		}
		
		const opponent = tempoppo;

		let pstr = "G_" + pair.join("_");
		let rnk = 0;

		if (pstr in crew.ranks) {
			rnk = crew.ranks[pstr] as number;
		}

		for (let skill of skills) {
			if (boostMode === 'player' && "skills" in crew && skill && skill in crew.skills) {
				let cp = JSON.parse(JSON.stringify(crew.skills[skill] as Skill));
				cp.skill = skill;
				crewpair.push(cp);
			}
			else if (boostMode !== 'none' && skill && skill in crew && ((crew[skill] as ComputedSkill).core)) {
				let cp = JSON.parse(JSON.stringify(crew[skill] as ComputedSkill)) as ComputedSkill;
				cp.skill = skill;
				crewpair.push({
					core: cp.core,
					range_max: cp.max,
					range_min: cp.min,
					skill: skill
				});
			}
			else if (skill && skill in crew.base_skills) {
				let cp = JSON.parse(JSON.stringify(crew.base_skills[skill] as Skill)) as Skill;
				cp.skill = skill;
				crewpair.push(cp);
			}
		}

		return (
			<div 
				className="ui segment" 
				key={crew.symbol + pstr + (opponent?.name ?? "")}
				title={crew.name 
					+ (("isDisabled" in crew && crew.isDisabled) ? " (Disabled)" : "") 
					+ (("isDebuffed" in crew && crew.isDebuffed) ? " (Reduced Power)" : "")
					+ ((opponent?.name) ? ` (Opponent: ${opponent.name})` : "")
				}
				style={{
					display: "flex",
					flexDirection:"column",
					width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : "28em",
					padding: 0,
					margin: 0,
					marginBottom: "0.5em",
				}}>
				
				{((inMatch || isOpponent) && isRound) && 
				<div style={{
					flexGrow: 1,
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					margin: 0,
					padding: "2px 4px",
					backgroundColor: isRound ? (("isDisabled" in crew && crew.isDisabled) ? "#003300" : (isOpponent ? 'darkred' : (inMatch ? 'darkgreen' : undefined))) : undefined	
				}}>
					{isOpponent && 
						<>
							<span>
								{opponent?.rank}
							</span>
							<div style={{
								flexGrow: 1,								
								justifyContent:"center", 
								display:"flex",
								flexDirection:"row", 
								alignItems:"center"}}>
									{opponent?.name}
									<img className="ui" style={{margin: "4px 8px", borderRadius: "3px", height:"16px"}} src={`${process.env.GATSBY_ASSETS_URL}${opponent?.icon.file}`} />
							</div>
							<span>
								[{opponent?.level}]
							</span>
						</>}

					{inMatch && !isOpponent &&
						<>
							<span>
								{gauntlet?.rank}
							</span>
							<div style={{
								flexGrow: 1,								
								justifyContent:"center", 
								display:"flex",
								flexDirection:"row", 
								alignItems:"center"}}>
									{this.context.player.playerData?.player.display_name}
									<img className="ui" style={{margin: "4px 8px", borderRadius: "3px", height:"16px"}} src={`${process.env.GATSBY_ASSETS_URL}${myIcon}`} />
							</div>
							<span>
								[{this.context.player.playerData?.player.character.level}]
							</span>
						</>}

				</div>}
				<div 
					style={{
						flexGrow: 1,
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						width: "100%",
						padding: '0.5em',
						paddingBottom: 0,
						margin: 0,
						// backgroundColor: isRound ? (("isDisabled" in crew && crew.isDisabled) ? "transparent" : (isOpponent ? '#990000' : (inMatch ? '#008800' : undefined))) : undefined,
						}}
				>
					<div style={{
						width: "2em",
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						cursor: "pointer"
					}}>
						<a
							style={{color: foreColor, textDecoration: "underline"}}
							target='_blank'
							href={`https://www.bigbook.app/ratings/gauntlet?search=${encodeURI(crew.name)}`}
							title={`Big Book Rank ${rnk} for ${pstr.slice(2).replace("_", "/")}`}
						>{rnk}</a>
					</div>
					<div style={{ margin: 0, marginRight: "0.25em", width: "68px" }}>
						<ItemDisplay
							playerData={this.context.player.playerData}
							itemSymbol={crew.symbol}
							targetGroup='gauntletsHover'
							allCrew={this.context.core.crew}
							src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
							rarity={"rarity" in crew ? crew.rarity : crew.max_rarity}
							maxRarity={crew.max_rarity}
							size={64}
						/>
					</div>
					<div style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "15em" : "16em",
					}}>
						<div style={{
							margin: 0,
							marginLeft: "0.25em",
							marginBottom: "0.25em",
						}}>
							{this.formatPair(crewpair, {
								flexDirection: "row",
								display: "flex",
								justifyContent: "space-evenly",
								textDecoration: powerColor ? 'underline' : undefined,
								color: powerColor,
								fontSize: "8pt"
							}, isRound && ("isDebuffed" in crew && crew.isDebuffed), 
							isRound && ("isDisabled" in crew && crew.isDisabled))}
						</div>
						<div style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "space-evenly",
							margin: 0,
							fontSize: "10pt",
							marginLeft: "0.25em",
							marginRight: "0.25em",
							marginTop: "0.25em",
							width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "14em" : "15em",
							cursor: "default"
							
						}}>
						{"score" in crew && crew.score && 
							<div
								title={`${Math.round(crewPairScore?.score ?? 0).toLocaleString()} Overall Estimated Damage for ${pair.join("/")}`}
								style={{
									margin: "0 0.5em",
									color: bigNumberColor ?? undefined,
									display: "flex",
									flexDirection:"row",
									justifyContent: "center",
									width: "4em",
									alignItems: "center"							
									}}>
								<img style={{margin: "0 0.25em", maxHeight: "1em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/anomally_icon.png`} />
								{Math.round(crewPairScore?.score ?? 0).toLocaleString()}
							</div>} 
								
							<div
								title={`${crit}% Crit Chance`}
								style={{
									fontWeight: crit > 25 ? "bold" : undefined,
									margin: "0 0.5em",
									color: critColor ?? undefined
									}}>
								{critString}
							</div>
						</div>
					</div>
					<div style={{ marginRight: "0.25em" }}>
						{"immortal" in crew && (crew.immortal > 0 && <i title={"Owned (Frozen, " + crew.immortal + " copies)"} className='snowflake icon' />) ||
							("immortal" in crew && crew.have && (isImmortal(crew) && <i title={"Owned (Immortalized)"} style={{ color: "lightgreen" }} className='check icon' />))}
						{"immortal" in crew && crew.have && (!isImmortal(crew) && <span title={"Owned (Not Immortalized)"}>{crew.level}</span>)}
						{(isOpponent) &&
							<span>
								<img title={"Opponent (" + opponent?.name + ")"} style={{ height: "16px" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/warning_icon.png`} />
							</span>}

						{!("immortal" in crew) || !(crew.have) && !(isOpponent) &&
							<span>
								{crew.in_portal && <img title={"Unowned (Available in Portal)"} style={{ height: "16px" }} src='/media/portal.png' />}
								{!crew.in_portal && <i title={this.whyNoPortal(crew)} className='lock icon' />}
							</span>}
					</div>
				</div>
			</div>)
	}

	whyNoPortal(crew: PlayerCrew | CrewMember) {
		if (crew.obtained?.toLowerCase().includes("gauntlet")) return "Unowned (Gauntlet Exclusive)";
		else if (crew.obtained?.toLowerCase().includes("voyage")) return "Unowned (Voyage Exclusive)";
		else if (crew.obtained?.toLowerCase().includes("honor")) return "Unowned (Honor Hall)";
		else if (crew.obtained?.toLowerCase().includes("boss")) return "Unowned (Fleet Boss Exclusive)";
		else return "Unowned (Not in Portal)";

	}

	private readonly clearGauntlet = () => {
		this.tiny.setValue('liveGauntlet', undefined);
		this.inited = false;
		this.tiny.setValue('activeTabIndex', 0);
		this.setState({ ... this.state, gauntletJson: '', liveGauntlet: undefined, activeTabIndex: 0 });
	}

	private readonly parseGauntlet = (json?: string) => {
		const gauntletJson = json ?? this.state.gauntletJson;
		if (!gauntletJson || gauntletJson === '') return;

		try {
			const root = JSON.parse(gauntletJson) as GauntletRoot | Gauntlet;

			const gauntlet = "state" in root ? root : root.character.gauntlets[0];

			if (gauntlet.state?.includes("ENDED")) {
				this.inited = false;
				this.tiny.setValue('liveGauntlet', '', false);
				this.tiny.setValue('activeTabIndex', 0);
				this.setState({ ... this.state, gauntletJson: '', liveGauntlet: null, activeTabIndex: 0 });	
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
			this.tiny.setValue('liveGauntlet', gauntletJson, false);
			this.tiny.setValue('activeTabIndex', 4);

			this.setState({ ... this.state, gauntletJson: '', liveGauntlet: gauntlet, activeTabIndex: 4 });			
		}
		catch {
			this.tiny.setValue('activeTabIndex', 0);
			this.setState({ ... this.state, gauntletJson: '(**)', liveGauntlet: null, activeTabIndex: 0 });
		}
	}

	

	renderCopyPaste(): JSX.Element {
		const PLAYERLINK = 'https://app.startrektimelines.com/gauntlet/status?client_api=20&only_read_state=true';
		const { liveGauntlet, gauntletJson } = this.state;

		return (
			<React.Fragment>
				<Header icon>
					<Icon name='paste' />
					Copy and Paste
				</Header>
				<p>
					Copy the contents of
					{` `}<a href={PLAYERLINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						your player data
					</a>,
					<br />then paste everything into the text box below.
				</p>
				<Form>
				<TextArea
						placeholder='Paste a gauntlet, here'
						id='__zzpp'
						value={liveGauntlet || gauntletJson?.startsWith("(**)") ? '' : gauntletJson ?? ''}
						onChange={(e, { value }) => this.setState({ ... this.state, gauntletJson: value as string })}
						onPaste={(e: ClipboardEvent) => this.parseGauntlet(e.clipboardData?.getData('text') as string)}
					/>
				</Form>
				<Accordion style={{ marginTop: '1em' }}>
					<Accordion.Title
						
					>
						<Icon name={'caret down'} />
						Post, Update or Clear Live Gauntlet Data (Click Here)
					</Accordion.Title>
					<Accordion.Content style={{ textAlign: 'left' }}>
						<p>You can access your live gauntlet matches in a similar way to how you access your player data, currently.</p>
						<ul>
							<li>
								Open this page in your browser:{' '}
								<a href={PLAYERLINK} target='_blank'>
									{PLAYERLINK}
								</a>
							</li>
							<li>
								Log in if asked, then wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","character":'}</span> ...
							</li>
							<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
							<li>Paste it (Ctrl+V) in the text box below. Note that DataCore will intentionally display less data here to speed up the process</li>
							<li>Click the 'Import data' button</li>
						</ul>
						<p>If you have multiple accounts, we recommend using your browser in incognito mode (Chrome) or in private mode (Edge / Firefox) to avoid caching your account credentials, making it easier to switch accounts.</p>
					</Accordion.Content>
				</Accordion>
			</React.Fragment>
		);
	}


	render() {
		const { gauntlets, today, yesterday, liveGauntlet, gauntletJson, activeTabIndex } = this.state;
		const isMobile = isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		const hasPlayer = !!this.context.player.playerData?.player?.character?.crew?.length;

		if (!gauntlets) return <></>

		const fs = isMobile ? "0.75em" : "1em";

		const tabPanes = [
			{
				menuItem: isMobile ? "Today" : "Today's Gauntlet",
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(today, 0)}</div>,
				description: "Today's gauntlet"
			},
			{
				menuItem: isMobile ? "Yesterday" : "Yesterday's Gauntlet",
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(yesterday, 1)}</div>,
				description: "Yesterday's gauntlet"
			},
			{
				menuItem: isMobile ? "Previous" : "Previous Gauntlets",
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage()}</div>,
				description: "Browse previous gauntlets by date"
			},
			{
				menuItem: isMobile ? "Browse" : "Browse Gauntlets",
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage(true, true)}</div>,
				description: "Browse through all known gauntlets"
			}
		]

		if (liveGauntlet && hasPlayer){
			tabPanes.push({
					menuItem: isMobile ? "Live" : "Live Gauntlet",
					render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(liveGauntlet, 4)}</div>,
					description: "Live gauntlet round"
				},
			)
		}

		if (activeTabIndex !== undefined && (activeTabIndex < 0 || activeTabIndex >= tabPanes.length)) {
			this.setActiveTabIndex(0);
			return this.context.core.spin();
		}

		const PLAYERLINK = 'https://app.startrektimelines.com/gauntlet/status?client_api=20&only_read_state=true';

		if (typeof window !== 'undefined' && hasPlayer) {
			window["gauntletDataSetter"] = (value: string) => {
				this.parseGauntlet(value);
			}
		}

		return (
			<>
			{/* {hasPlayer && this.renderCopyPaste()} */}
			{hasPlayer && <Accordion
				defaultActiveIndex={(this.state.activeTabIndex === 4 && liveGauntlet) ? 0 : -1}
				panels={[{
					index: 0, 
					key: 0,
					title: "Post, Update or Clear Live Gauntlet Data (Click Here)",
					content: {
						content: <><Header as='h2'>Live Gauntlet Data</Header>				
						<p>You can access your live gauntlet matches in a similar way to how you access your player data, currently.</p>
						<ul>
							<li>
								Open this page in your browser:{' '}
								<a href={PLAYERLINK} target='_blank'>
									{PLAYERLINK}
								</a>
							</li>
							<li>
								Log in if asked, then wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","character":'}</span> ...
							</li>
							<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
							<li>Paste it (Ctrl+V) in the text box below. Note that DataCore will intentionally display less data here to speed up the process</li>
							<li>Click the 'Import data' button</li>
						</ul>
						<Form>
						<TextArea
							placeholder='Paste a gauntlet, here'
							id='__zzpp'
							value={liveGauntlet || gauntletJson?.startsWith("(**)") ? '' : gauntletJson ?? ''}
							onChange={(e, { value }) => this.setState({ ... this.state, gauntletJson: value as string })}
							onPaste={(e: ClipboardEvent) => this.parseGauntlet(e.clipboardData?.getData('text') as string)}
						/>
		
						{gauntletJson?.startsWith("(**)") && <div style={{color: "tomato", fontWeight: "bold", fontStyle: "italic"}}>Invalid JSON detected. Please try again.</div>}
		
						<div style={{
							display:"flex",
							flexDirection:"row",
							justifyContent: "flex-start"					
						}}>
						<Button
							onClick={() => this.parseGauntlet()}
							style={{ marginTop: '1em' }}
							content='Import data'
							icon='paste'
							labelPosition='right'
						/>
						{liveGauntlet && <Button
							onClick={() => this.clearGauntlet()}
							style={{ marginTop: '1em' }}
							content='Clear live gauntlet'
							icon='delete'
							labelPosition='right'
						/>}
						</div>
						</Form></>
					}
				}]}
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
					{/* {isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH &&
						<Tab activeIndex={activeTabIndex} onTabChange={(e, props) => this.setActiveTabIndex(props.activeIndex as number)} menu={{ attached: false, fluid: true, wrap: true }} panes={tabPanes} /> ||
						<Tab activeIndex={activeTabIndex} onTabChange={(e, props) => this.setActiveTabIndex(props.activeIndex as number)}  menu={{ attached: false }} panes={tabPanes} />
					} */}
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