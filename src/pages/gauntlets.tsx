import React from 'react';
import { Pagination, PaginationProps, Table, Icon, Message, Dropdown, Rating, Button, Form, TextArea, Header, Accordion, Checkbox, DropdownItemProps, SemanticWIDTHS, Step, Input, FormInput } from 'semantic-ui-react';
import { Link } from 'gatsby';
import * as moment from 'moment';
import { TranslationSet } from '../model/traits';

import { randomCrew } from '../context/datacontext';
import { GlobalContext } from '../context/globalcontext';
import { CompletionState, PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from '../model/player';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { ComputedBuff, ComputedSkill, CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet, GauntletRoot, Opponent } from '../model/gauntlets';
import { applyCrewBuffs, comparePairs, dynamicRangeColor, getPlayerPairs, getSkills, gradeToColor, isImmortal, updatePairScore, rankToSkill, skillToRank, getCrewPairScore, getPairScore, emptySkill as EMPTY_SKILL, printPortalStatus, getCrewQuipment } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { BuffNames } from '../components/item_presenters/crew_preparer';

import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import DataPageLayout from '../components/page/datapagelayout';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import ItemDisplay from '../components/itemdisplay';
import GauntletSettingsPopup from '../components/gauntlet/settings';
import { ItemBonusInfo, getItemBonuses } from '../utils/itemutils';
import { GauntletSettings, defaultSettings } from '../utils/gauntlet';
import { EquipmentItem } from '../model/equipment';
import { GauntletPairCard } from '../components/gauntlet/paircard';
import { GauntletPairTable } from '../components/gauntlet/pairtable';
import { GauntletCrewTable } from '../components/gauntlet/gauntlettable';
import { GauntletImportComponent } from '../components/gauntlet/gauntletimporter';

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

	readonly getGauntletCrew = (gauntlet: Gauntlet, rankByPair?: string, range_max?: number, filter?: FilterProps, textFilter?: string) => {
		if (rankByPair === '' || rankByPair === 'none') rankByPair = undefined;

		const rmax = range_max ?? 100;
		const search = textFilter;

		const { buffConfig, maxBuffs } = this.context.player;		
		const { crew: allCrew, translation: allTraits } = this.context.core;		

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
			availBuffs.push('quipment');
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

		const matchesCrew = (crew: PlayerCrew, value?: string) => {
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
	
		let acc = [] as CrewMember[];

		if (this.context.player.playerData?.player?.character?.crew) {
			acc = this.context.player.playerData?.player?.character?.crew.concat(this.context.player.playerData?.player?.character?.unOwnedCrew ?? []);
		}
		else {
			acc = allCrew;
		}
		
		const workCrew = acc;

		const matchedCrew1 =
			workCrew.concat(oppo).map(crewObj => crewObj as PlayerCrew).filter(crew => crew.max_rarity > 3 && (
				(!rankByPair || (rankByPair in crew.ranks)) &&
				(Object.keys(crew.base_skills).some(k => crew.base_skills[k].range_max >= rmax) || !!crew.isOpponent) ||
				prettyTraits.filter(t => crew.traits_named.includes(t)).length > 1))
				.map((inputCrew) => {
					let crew = !!inputCrew.isOpponent ? inputCrew : JSON.parse(JSON.stringify(inputCrew)) as PlayerCrew;

					if (!inputCrew.isOpponent && !crew.have) {
						if (buffConfig && (buffMode === 'player' || buffMode === 'quipment')) {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (maxBuffs && buffMode === 'max') {
							applyCrewBuffs(crew, maxBuffs);
						}
					}

					// let c = this.context.player.playerData?.player?.character?.crew?.find(d => d.id === crew.id);
					
					if (!crew.isOpponent && crew.have) {						
						//crew = JSON.parse(JSON.stringify(c)) as PlayerCrew;

						if (buffConfig && buffMode === 'player') {
							applyCrewBuffs(crew, buffConfig);
						}
						else if (buffConfig && buffMode === 'quipment') {
							if (crew.kwipment?.length) {
                                if (!this.crewQuip[crew.symbol]) {
                                    this.crewQuip[crew.symbol] = getCrewQuipment(crew, this.context.core.items);
                                }
                                let cq = this.crewQuip[crew.symbol];
                                let bn = cq?.map(q => {
                                    this.bonusInfo[q.symbol] ??= getItemBonuses(q);
                                    return this.bonusInfo[q.symbol];
                                }) ?? undefined;
                                
                                applyCrewBuffs(crew, buffConfig, undefined, bn);
                            }
                            else {
                                applyCrewBuffs(crew, buffConfig);
                            }
						}
						else if (maxBuffs && buffMode === 'max') {
							applyCrewBuffs(crew, maxBuffs);
						}
						else {
							for (let skill of Object.keys(crew.base_skills)) {
								crew[skill] = { core: crew.base_skills[skill].core, min: crew.base_skills[skill].range_min, max: crew.base_skills[skill].range_max };								
							}
						}
						// crew.have = true;
					}
					else {
						// crew.have = !!c?.skills;
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
						if (gauntlet.contest_data?.selected_crew?.length && crew.immortal <= 0 && crew.have) {
							let selcrew = gauntlet.contest_data.selected_crew.find((sel) => {
								return sel.archetype_symbol === crew.symbol;
							});

							if (selcrew && crew.skills) {
								crew.isSelected = true;

								if (selcrew.disabled) {
									crew.isDisabled = true;
								}
								else {
									let oskill = crew.skills;
									crew.skills = {};
									crew.isDisabled
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
						else if (!crew.have) crew.rarity = 0;
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
				.filter((crew) => (!filter || this.crewInFilter(crew, filter)) && matchesCrew(crew, search))
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
						else if (buffConfig && buffMode === 'quipment') {
							if (crew.kwipment?.length) {
								let cq = getCrewQuipment(crew, this.context.core.items);
								let bn = cq?.map(q => getItemBonuses(q)) ?? undefined;
								applyCrewBuffs(crew, buffConfig, undefined, bn);
							}
							else {
								applyCrewBuffs(crew, buffConfig);
							}
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

		let f = matchedCrew1.find(f => f.id === 118658649);

		f = matchedCrew1.find(f => f.symbol === 'black_admiral_crew');

		let matchedResults: PlayerCrew[] | undefined = undefined;

		if (gauntlet.prettyTraits?.length) {
			const maxpg = 10;
			let pgs = this.getPairGroups(matchedCrew1, gauntlet, undefined, 100, maxpg);
		
			const incidence = {} as { [key: string]: number };
			const avgidx = {} as { [key: string]: number };
			const fsk = gauntlet.contest_data?.featured_skill;
			let pc = 0;
			for(let pg of pgs) {
				let idx = 1;
				
				for (let pgcrew of pg.crew) {
					incidence[pgcrew.symbol] ??= 0;				
					avgidx[pgcrew.symbol] ??= 0;

					if (pg.pair.some(p => rankToSkill(p) === fsk) && pc === 0) {
						incidence[pgcrew.symbol] += this.state.gauntletSettings.linearSkillIncidenceWeightPrimary;
						avgidx[pgcrew.symbol] += (idx * this.state.gauntletSettings.linearSkillIndexWeightPrimary);
					}
					else if (pg.pair.some(p =>  rankToSkill(p) === fsk) && pc === 1) {
						incidence[pgcrew.symbol] += this.state.gauntletSettings.linearSkillIncidenceWeightSecondary;
						avgidx[pgcrew.symbol] += (idx * this.state.gauntletSettings.linearSkillIndexWeightSecondary);
					}
					else if (pg.pair.some(p =>  rankToSkill(p) === fsk) && pc === 2) {
						incidence[pgcrew.symbol] += this.state.gauntletSettings.linearSkillIncidenceWeightTertiary;
						avgidx[pgcrew.symbol] += (idx * this.state.gauntletSettings.linearSkillIndexWeightTertiary);
					}
					else {
						incidence[pgcrew.symbol]++;
						avgidx[pgcrew.symbol] += idx;	
					}
					idx++;
				}
				pc++;
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

    private readonly crewQuip = {} as { [key: string]: EquipmentItem[] };
    private readonly bonusInfo = {} as { [key: string]: ItemBonusInfo };

	initData() {
		const { crew: allCrew, gauntlets: gauntsin, translation: allTraits } = this.context.core;
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
			let astr = `${a.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[a.contest_data?.featured_skill ?? ""]}`;
			let bstr = `${b.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${SKILLS[b.contest_data?.featured_skill ?? ""]}`;
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
						return !p1 || (p1 in crew && crew[p1]?.max);
					}
					let p2 = rankToSkill(p[1]);
					if (!p1 || !p2) return true;
					return (p1 in crew && crew[p1]?.max && p2 in crew && crew[p2]?.max);
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
					 	return !crew.have && !crew.in_portal && crew.traits_hidden.includes("exclusive_gauntlet")
					
				}
			}
		}
		return true;
	}

	private readonly setSkillPairs = (pairs: string[], idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], skillPairs: pairs };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.inited = false;
		this.setState({ ...this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});	
	}
	
	private readonly setOwnedStatus = (status: OwnedStatus, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], ownedStatus: status };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.inited = false;
		this.setState({ ...this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned });
		});	
	}

	private readonly setMaxResults = (max: number, idx: number) => {
		const newOwned = [ ... this.state.filterProps ];
		newOwned[idx] = { ... newOwned[idx], maxResults: max };
		this.tiny.setValue("gauntletFilter_" + idx, newOwned[idx], true);
		this.setState({... this.state, loading: true });
		window.setTimeout(() => {
			this.setState({... this.state, filterProps: newOwned, loading: false });
		});	
	}

	private readonly setTextFilter = (value: string, idx: number) => {
		let filters = this.state.textFilter;
		filters[idx] = value;
		this.tiny.setValue('textFilter', filters);
		this.updatePaging(false, undefined, undefined, idx, undefined, filters);
	}

	private readonly updatePaging = (preSorted: boolean, newSelGauntlet?: Gauntlet, replaceGauntlet?: Gauntlet, replaceIndex?: number, replaceRank?: string, textFilter?: string[]) => {
		const { filterProps, today, yesterday, activePrevGauntlet, liveGauntlet, sortKey, sortDirection, browsingGauntlet, rankByPair } = this.state;

		let newBrowseGauntlet: Gauntlet | undefined = undefined;
		let newToday: Gauntlet | undefined = undefined;
		let newYesterday: Gauntlet | undefined = undefined;
		let live: Gauntlet | undefined = undefined;

		if (textFilter && replaceIndex !== undefined && replaceGauntlet === undefined) {
			if (replaceIndex === 0) replaceGauntlet = today;
			else if (replaceIndex === 1) replaceGauntlet = yesterday;
			else if (replaceIndex === 2) replaceGauntlet = activePrevGauntlet;
			else if (replaceIndex === 3) replaceGauntlet = browsingGauntlet;
			else if (replaceIndex === 4) replaceGauntlet = liveGauntlet ?? undefined;				
		}

		textFilter ??= ['', '', '', '', ''];

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
			sortDirection: [...sortDirection],
			textFilter: textFilter ?? ''
		});
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

		const { loading, onlyActiveRound, activePageTabs, activePageIndexTab, totalPagesTab, viewModes, rankByPair, tops, filterProps } = this.state;
		const { maxBuffs, buffConfig } = this.context.player;
		const { translation: allTraits} = this.context.core;
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
			availBuffs.push({
				key: 'quipment',
				value: 'quipment',
				text: BuffNames['quipment']
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
		const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

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
								title="Filter Crew by Rank"
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
					<div style={{marginBottom: "0.5em"}}>
						<Input
							style={{ width: isMobile ? '100%' : '50%'}}
							iconPosition="left"
							placeholder="Search..."
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
							{viewModes[idx] === 'table' && this.renderTable(gauntlet, gauntlet.matchedCrew ?? [], idx)}
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
									return (<GauntletPairTable gauntlet={gauntlet}
                                            key={"pairGroup_" + pk}
                                            currContest={currContest === pairGroup.pair.map(e => rankToSkill(e)).sort().join()}
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
		const { translation: allTraits } = this.context.core;
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
						value={browsing ? (browsingGauntlet?.date ?? "gt_0") : (activePrevGauntlet?.date ?? "")}
						onChange={(e, { value }) => this.changeGauntlet(value as string, browsing ? true : false)}
					/>

				</div>
			</div>
			{this.renderGauntlet(browsing ? browsingGauntlet : activePrevGauntlet, browsing ? 3 : 2)}
		</>)
	}

	whyNoPortal(crew: PlayerCrew | CrewMember) {
		if (crew.obtained?.toLowerCase().includes("gauntlet")) return "Unowned (Gauntlet Exclusive)";
		else if (crew.obtained?.toLowerCase().includes("voyage")) return "Unowned (Voyage Exclusive)";
		else if (crew.obtained?.toLowerCase().includes("honor")) return "Unowned (Honor Hall)";
		else if (crew.obtained?.toLowerCase().includes("boss")) return "Unowned (Fleet Boss Exclusive)";
		else
		return "Unowned (Not in Portal)";

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
		const { gauntlets, today, yesterday, liveGauntlet, activeTabIndex } = this.state;
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