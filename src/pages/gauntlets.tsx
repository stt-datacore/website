import React, { PureComponent } from 'react';
import { Item, Image, Grid, Pagination, PaginationProps, Table, Tab, Icon, Message, Dropdown, Rating, Button, Form, TextArea, Header, Accordion, Checkbox } from 'semantic-ui-react';
import { Link } from 'gatsby';
import * as moment from 'moment';
import Layout from '../components/layout';
import { AllTraits } from '../model/traits';
import allTraits from '../../static/structured/translation_en.json';
const traits = allTraits as AllTraits;


import CONFIG from '../components/CONFIG';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { CiteMode, CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { ComputedSkill, CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet, GauntletRoot } from '../model/gauntlets';
import { applyCrewBuffs, comparePairs, dynamicRangeColor, getPlayerPairs, getSkills, gradeToColor, isImmortal, updatePairScore, navToCrewPage, prepareOne, prepareProfileData, rankToSkill, skillToRank, getCrewPairScore, getPairScore, emptySkill as EMPTY_SKILL } from '../utils/crewutils';
import { BuffSelector, CrewPresenter } from '../components/item_presenters/crew_presenter';
import { BuffNames, CrewPreparer, PlayerBuffMode, PlayerImmortalMode } from '../components/item_presenters/crew_preparer';

import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import { DataWrapper } from '../context/datawrapper';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import ItemDisplay from '../components/itemdisplay';

export type GauntletViewMode = 'big' | 'small' | 'table' | 'pair_cards';

type SortDirection = 'ascending' | 'descending' | undefined;

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
	return (
		<DataWrapper header='Gauntlets' demands={['all_buffs', 'crew', 'gauntlets', 'items']}>
			<GauntletsPageComponent />
		</DataWrapper>
	);

}
export interface PairGroup {
	pair: string[];
	crew: PlayerCrew[]
};

export interface GauntletsPageProps {
}

export type OwnedStatus = 'any' | 'owned' | 'unfrozen' | 'unowned' | 'fe' | 'portal' | 'gauntlet' | 'nonportal';

export interface FilterProps {
	ownedStatus?: OwnedStatus;
	rarity?: number;
	maxResults?: number;
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
	liveGauntlet?: Gauntlet;

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
}

const DEFAULT_FILTER_PROPS = {
	ownedStatus: 'any',
	maxResults: 10
} as FilterProps;

export function getBernardsNumber(a: PlayerCrew | CrewMember, gauntlet: Gauntlet, apairs?: Skill[][] | Skill[]) {
	let atrait = gauntlet.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;

	if (atrait >= 3) atrait = 3.90;
	else if (atrait >= 2) atrait = 2.7;
	else if (atrait >= 1) atrait = 1.5;
	else atrait = 0.30;
	
	apairs ??= getPlayerPairs(a, atrait);
	
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
	static contextType?= MergedContext;
	context!: React.ContextType<typeof MergedContext>;
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

		const liveJson = this.tiny.getValue<string | undefined>('liveGauntlet', undefined);
		let lg: Gauntlet | undefined = undefined;

		if (liveJson) {
			try {
				let lgr = JSON.parse(liveJson) as GauntletRoot;
				lg = lgr.character.gauntlets[0];
			}
			catch {

			}
		}

		this.state = {
			onlyActiveRound: this.tiny.getValue<boolean>('activeRound', false),
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
			filteredCrew: [[], [], [], []],
			viewModes: vmodes,
			gauntlets: [],
			browsingGauntlet: undefined,
			uniques: [],
			filterProps: fprops,			
			activeTabIndex: lg ? 4 : 0
		}
	}

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
		this.forceUpdate();
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
			this.setState({ ... this.state, ranges: vm });
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
			this.setState({ ... this.state, tops: vm });
		}
	}

	protected setActiveRound(value: boolean) {
		this.tiny.setValue('activeRound', value);
		this.setState({...this.state, onlyActiveRound: value });
	}

	protected getActiveRound() {
		return !!this.state.onlyActiveRound;
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

			}
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

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate() {
		if (this.state.lastPlayerDate !== this.context.playerData?.calc?.lastModified) {
			this.inited = false;
		}
		this.initData();
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
		const pairs = this.discoverPairs(crew, featuredSkill);
		const { onlyActiveRound } = this.state;
		const featRank = skillToRank(featuredSkill ?? "") ?? "";
		const ptop = top ?? 10;
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

			pairGroups.push({
				pair: rpairs,
				crew: crew.filter(c => rank in c.ranks && (c.ranks[rank] <= ptop))
					.map(d => d as PlayerCrew)
					.filter((crew2) => {			
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

						if (atrait >= 3) atrait = 3.90;
						else if (atrait >= 2) atrait = 2.7;
						else if (atrait >= 1) atrait = 1.5;
						else atrait = 0.30;

						if (btrait >= 3) btrait = 3.90;
						else if (btrait >= 2) btrait = 2.7;
						else if (btrait >= 1) btrait = 1.5;
						else btrait = 0.30;

						let r = 0;
						
						let apairs = getPlayerPairs(a, atrait);
						let bpairs = getPlayerPairs(b, btrait);

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

							const ascore = amatch?.length ? getBernardsNumber(a, gauntlet, amatch) : getBernardsNumber(a, gauntlet, apairs);
							const bscore = bmatch?.length ? getBernardsNumber(b, gauntlet, bmatch) : getBernardsNumber(b, gauntlet, bpairs);
	
							updatePairScore(a, { score: ascore, pair: amatch ?? apairs[0] });
							updatePairScore(b, { score: bscore, pair: bmatch ?? bpairs[0] });

							r = bscore - ascore;
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

		const { crew: allCrew, buffConfig, maxBuffs } = this.context;		
		const availBuffs = ['none'] as PlayerBuffMode[];
		const oppo = [] as PlayerCrew[];

		if (gauntlet.opponents?.length) {
			for (let op of gauntlet.opponents){
				const ocrew = op.crew_contest_data.crew[0];
				const nfcrew = this.context.crew.find((cf) => cf.symbol === ocrew.archetype_symbol);
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
					}

					fcrew.rarity = ocrew.rarity;
					fcrew.isOpponent = true;					
					fcrew.ssId = op.name;
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

		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;

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

		const matchedCrew =
			allCrew.concat(oppo).filter(e => e.max_rarity > 3 && (
				(!rankByPair || (rankByPair in e.ranks)) &&
				(Object.keys(e.base_skills).some(k => e.base_skills[k].range_max >= rmax) || !!e.isOpponent) ||
				prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
				.map((inputCrew) => {
					let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;

					if (buffConfig && buffMode === 'player') {
						applyCrewBuffs(crew, buffConfig);
					}
					else if (maxBuffs && buffMode === 'max') {
						applyCrewBuffs(crew, maxBuffs);
					}

					let c = this.context.playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);

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

					if (gauntlet.contest_data?.selected_crew?.length) {
						let selcrew = gauntlet.contest_data.selected_crew.find((sel) => sel.archetype_symbol === crew.symbol);
						if (selcrew) {
							if (selcrew.disabled) {
								crew.isDisabled = true;
							}
							else {
								for (let selskill of selcrew.skills) {								
									let sk = selskill.skill;
									crew.isDebuffed = (crew.skills[sk].range_max > selskill.max);
									crew.skills[sk].range_max = selskill.max;
									crew.skills[sk].range_min = selskill.min;
								}
							}
						}
					}

					if (!crew.isOpponent) {
						if (!hasPlayer) crew.rarity = crew.max_rarity;
						else if (!c) crew.rarity = 0;
						if (!crew.immortal || crew.immortal < 0) {
							crew.immortal = hasPlayer ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
						}
					}
					else {
						crew.immortal = CompletionState.DisplayAsImmortalStatic;
					}
					
					crew.pairs = getPlayerPairs(crew);					
					return crew;
				})
				.filter((crew) => !filter || this.crewInFilter(crew, filter))
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

					if (!a.score) {
						a.score = getBernardsNumber(a, gauntlet, ap);
					}

					if (!b.score) {
						b.score = getBernardsNumber(b, gauntlet, bp);
					}

					return b.score - a.score;

					// if (ap && bp) {
					// 	r = comparePairs(ap[0], bp[0], gauntlet.contest_data?.featured_skill, 1);
					// 	if (ap.length > 1 && bp.length > 1) {
					// 		r += comparePairs(ap[1], bp[1], gauntlet.contest_data?.featured_skill, 1);
					// 		if (ap.length > 2 && bp.length > 2) {
					// 			r += comparePairs(ap[2], bp[2], gauntlet.contest_data?.featured_skill, 1);
					// 		}
					// 	}
					// }

					// return r;
				});

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
		const { crew: allCrew, gauntlets: gauntsin } = this.context;
		const { liveGauntlet } = this.state;

		const gauntlets = JSON.parse(JSON.stringify(gauntsin));

		if (!(allCrew?.length) || !(gauntlets?.length)) return;

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
				qparse = JSON.parse(JSON.stringify(qparse)) as Gauntlet;
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

			this.setState({
				... this.state,
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
			this.updatePaging(false, undefined, g, 3);
		}
		else {
			const g = this.state.gauntlets?.find((g) => g.date === date);
			this.updatePaging(false, g);
		}
	}

	private readonly crewInFilter = (crew: PlayerCrew, filter: FilterProps): boolean => {
		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;
		if (!filter.rarity || crew.rarity === filter.rarity) {
			if (filter.ownedStatus) {
				switch(filter.ownedStatus) {
					case 'any':
						return true;
					case 'fe':
						if (!hasPlayer) return true;
						return !!crew.have && crew.level === 100 && crew.equipment?.length === 4;
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
	
	private readonly setOwnedStatus = (status: OwnedStatus, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], ownedStatus: status };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx]);
		this.inited = false;
		this.setState({... this.state, filterProps: newOwned });
	}

	private readonly setMaxResults = (max: number, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], maxResults: max };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx]);
		this.setState({... this.state, filterProps: newOwned });
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
					<img style={{ height: '2em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[0].skill}.png`} />
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
						<img style={{ height: '2em', margin: "0.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pair[1].skill}.png`} />
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

	renderGauntlet(gauntlet: Gauntlet | undefined, idx: number) {

		const { onlyActiveRound, activePageTabs, activePageIndexTab, totalPagesTab, viewModes, rankByPair, tops, filterProps } = this.state;
		const { maxBuffs, buffConfig } = this.context;
		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;

		const availBuffs = [] as { key: string | number, value: string | number, text: string, content?: JSX.Element }[];
		const featuredCrew = this.context.crew.find((crew) => crew.symbol === gauntlet?.jackpot_crew);

		const filterOptions = hasPlayer ? [
			{ key: 'any', value: 'any', text: 'All Crew' },
			{ key: 'owned', value: 'owned', text: 'Owned Crew' },
			{ key: 'fe', value: 'fe', text: 'Owned, Fully Equipped Crew' },
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
		]

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
			key: "pair_cards",
			value: "pair_cards",
			text: "Grouped Pairs"
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
					<img style={{ height: "15em" }} src={`${process.env.GATSBY_ASSETS_URL}crew_full_body_cm_qjudge_full.png`} />
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
								allCrew={this.context.crew}
								playerData={this.context.playerData}
								targetGroup='gauntletsHover'
								crewSymbol={featuredCrew?.symbol}
							/>
						</div>
					}
					{idx < 3 && <div><h2 style={{ margin: 0, padding: 0 }}>{featuredCrew?.name}</h2><i>Jackpot Crew for {prettyDate}</i></div>}

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
						<h3 style={{ fontSize: "1.5em", margin: "0.25em 0" }}>
							{prettyDate}
						</h3>

						<div style={{
							display: "flex",
							flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
						}}>
							<div style={{
								display: "flex",
								flexDirection: "row",
								marginBottom: "0.25em",
								textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
							}}>
								<h4 style={{ marginRight: "0.5em" }}><b>Minimum Proficiency Max:&nbsp;</b></h4>

								<Dropdown
									style={{
										textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
									}}
									direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
									options={[100, 200, 300, 400, 500, 600, 700, 800].map(o => { return { text: o, value: o, key: o } })}
									value={this.getRangeMax(idx)}
									onChange={(e, { value }) => this.setRangeMax(idx, value as number)} />
							</div>
						</div>

					</div>
					<div style={{
						display: "flex",
						flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
						justifyContent: "space-between"
					}}>
						<h2 style={{ fontSize: "2em", margin: "0.25em 0" }}>
							{gauntlet.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/{SKILLS[gauntlet.contest_data?.featured_skill ?? ""]}
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
					<i><b>Note:</b> If owned crew are detected, then their current level in your roster is used to compute their rank.</i>
				</div>

				<div style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "stretch"
				}}>

					<div style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "flex-start"
					}}>
						{viewModes[idx] === 'pair_cards' && 
						<div style={{
							display: "flex",
							flexDirection: "column",
							marginRight: "2em",
							textAlign: "left"
						}}>
							<h4><b>Show Top Crew</b></h4>

							<Dropdown
								title="Filter Crew by Big Book Rank"
								options={[1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: "Top " + o, key: o, value: o } })}
								value={tops[idx]}
								onChange={(e, { value }) => this.setTops(idx, value as number)}
							/>
						</div>}
						{viewModes[idx] === 'pair_cards' && 
						<div style={{
							display: "flex",
							flexDirection: "column",
							marginRight: "2em",
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
							marginRight: "2em",
							textAlign: "left"
						}}>
							<h4><b>Show Buffs</b></h4>

							<Dropdown
								title="Apply Buffs to Stats"
								options={availBuffs}
								value={this.getBuffState(availBuffs.map(b => b.key) as PlayerBuffMode[])}
								onChange={(e, { value }) => this.setBuffState(value as PlayerBuffMode)}
							/>
						</div>

						
						<div style={{
							display: "flex",
							flexDirection: "column",
							marginRight: "2em",
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
						{idx === 4 && <div style={{
							display: "flex",
							flexDirection: "row",
							marginRight: "2em",
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
					</div>

					
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
							marginTop: "0em",
							marginBottom: "2em",
							display: "flex",
							flexDirection: "row",
							justifyContent: "space-between",
							flexWrap: "wrap"
						}}>
							{this.getPairGroups(gauntlet.matchedCrew ?? [], gauntlet, gauntlet.contest_data?.featured_skill, tops[idx], filterProps[idx].maxResults)
								.map((pairGroup, pk) => {
								return (<div
									key={"pairGroup_" + pk}
									style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "stretch",
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
				</div>
				{viewModes[idx] !== 'table' && viewModes[idx] !== 'pair_cards' && <div style={{ margin: "1em 0", width: "100%" }}>
					<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
				</div>}

				<hr />
			</div>
		)

	}

	renderBrowsableGauntletPage(browsing?: boolean, searching?: boolean) {
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
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';

		const roundPair = gauntlet?.contest_data?.secondary_skill ? [gauntlet?.contest_data?.primary_skill, gauntlet?.contest_data?.secondary_skill] : []
		const isRound = !this.state.onlyActiveRound || (skills.every(s => roundPair.some(e => s === e)));
		const inMatch = !!gauntlet.contest_data?.selected_crew?.some((c) => c.archetype_symbol === crew.symbol);
		
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
			<div className="ui segment"
				title={crew.name 
					+ (("isDisabled" in crew && crew.isDisabled) ? " (Disabled)" : "") 
					+ (("isDebuffed" in crew && crew.isDebuffed) ? " (Reduced Power)" : "")
					+ (("ssId" in crew && crew.ssId) ? ` (Opponent: ${crew.ssId})` : "")
				
				}
				key={crew.symbol + pstr + ("ssId" in crew ? crew.ssId : "")}
				style={{
					width: "28em",
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					padding: '0.5em',
					paddingBottom: 0,
					margin: 0,
					marginBottom: "0.5em",
					backgroundColor: isRound ? (("isDisabled" in crew && crew.isDisabled) ? "#003300" : (("isOpponent" in crew && !!crew.isOpponent) ? 'darkred' : (inMatch ? 'darkgreen' : undefined))) : undefined
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
						playerData={this.context.playerData}
						crewSymbol={crew.symbol}
						targetGroup='gauntletsHover'
						allCrew={this.context.crew}
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
					width: "16em"
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
						width: "15em",
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
					{!("immortal" in crew) || !(crew.have) &&
						<span>
							{crew.in_portal && <img title={"Unowned (Available in Portal)"} style={{ height: "16px" }} src='/media/portal.png' />}
							{!crew.in_portal && <i title={this.whyNoPortal(crew)} className='lock icon' />}
						</span>}
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
		this.setState({ ... this.state, gauntletJson: '', liveGauntlet: undefined, activeTabIndex: 0 });
	}

	private readonly parseGauntlet = (json?: string) => {
		const gauntletJson = json ?? this.state.gauntletJson;
		if (!gauntletJson || gauntletJson === '') return;

		try {
			const root = JSON.parse(gauntletJson) as GauntletRoot;
			this.inited = false;
			this.tiny.setValue('liveGauntlet', gauntletJson, false);
			this.setState({ ... this.state, gauntletJson: '', liveGauntlet: root.character.gauntlets[0], activeTabIndex: 4 });
		}
		catch {
			this.setState({ ... this.state, gauntletJson: '(**)', liveGauntlet: undefined, activeTabIndex: 0 });
		}
	}

	render() {
		const { gauntlets, today, yesterday, liveGauntlet, gauntletJson, activeTabIndex } = this.state;
		const isMobile = isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		if (!gauntlets) return <></>

		const fs = isMobile ? "0.75em" : "1em";

		const tabPanes = [
			{
				menuItem: isMobile ? "Today" : "Today's Gauntlet",
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(today, 0)}</div>
			},
			{
				menuItem: isMobile ? "Yesterday" : "Yesterday's Gauntlet",
				render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(yesterday, 1)}</div>
			},
			{
				menuItem: isMobile ? "Previous" : "Previous Gauntlets",
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage()}</div>
			},
			{
				menuItem: isMobile ? "Browse" : "Browse Gauntlets",
				render: () => <div style={{ fontSize: fs }}>{this.renderBrowsableGauntletPage(true, true)}</div>
			}
		]

		if (liveGauntlet){
			tabPanes.push({
					menuItem: isMobile ? "Live" : "Live Gauntlet",
					render: () => <div style={{ fontSize: fs }}>{this.renderGauntlet(liveGauntlet, 4)}</div>
				},
			)
		}


		const PLAYERLINK = 'https://app.startrektimelines.com/gauntlet/status?client_api=20&only_read_state=true';

		return (
			<>
			<Accordion
				defaultActiveIndex={this.state.activeTabIndex === 4 ? 0 : -1}
				panels={[{
					index: 0, 
					key: 0,
					title: "Post, Update or Clear Live Gauntlet Data",
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
							value={liveGauntlet || gauntletJson?.startsWith("(**)") ? '' : gauntletJson}
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
				/>
				<div style={{margin: "1em 0"}}>
					{isWindow && window.innerWidth < DEFAULT_MOBILE_WIDTH &&
						<Tab activeIndex={activeTabIndex} onTabChange={(e, props) => this.setState({ ... this.state, activeTabIndex: props.activeIndex as number })} menu={{ attached: false, fluid: true, wrap: true }} panes={tabPanes} /> ||
						<Tab activeIndex={activeTabIndex} onTabChange={(e, props) => this.setState({ ... this.state, activeTabIndex: props.activeIndex as number })}  menu={{ attached: false }} panes={tabPanes} />
					}
				</div>
				<CrewHoverStat targetGroup='gauntletsHover' />
			</>
		)
	}
}


export default GauntletsPage;