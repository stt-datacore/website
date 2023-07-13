import React, { PureComponent } from 'react';
import { Item, Image, Grid, Popup, Pagination, PaginationProps, Table, Tab, Icon, Message, Select, Dropdown, Rating } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql, Link } from 'gatsby';
import * as moment from 'moment';
import Layout from '../components/layout';

import { trait_names } from '../../static/structured/translation_en.json';
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
import { comparePairs, getPlayerPairs, getSkills, navToCrewPage, prepareOne, prepareProfileData } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { PlayerBuffMode, PlayerImmortalMode } from '../components/item_presenters/crew_preparer';
import { GauntletSkill } from '../components/item_presenters/gauntletskill';
import { ShipSkill } from '../components/item_presenters/shipskill';
import { DataWrapper } from '../context/datawrapper';

export type GauntletViewMode = 'big' | 'small' | 'table';

export type GauntletViewMode = 'big' | 'small' | 'table';

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
		<DataWrapper header='Gauntlets' demands={['all_buffs', 'crew', 'gauntlets', 'items']} clone={['crew']}>
			<GauntletsPageComponent />
		</DataWrapper>
	);

}

export interface GauntletsPageProps {
}

export interface FilterProps {
	ownedStatus: string[];
	rarity: number[];
}

export interface GauntletsPageState {
	lastPlayerDate?: Date;
	hoverCrew: PlayerCrew | CrewMember | null | undefined;
	activePage: Gauntlet[];
	activePageTabs: (PlayerCrew | CrewMember)[][];
	today?: Gauntlet;
	yesterday?: Gauntlet;
	totalPages: number;
	activePageIndex: number;
	itemsPerPage: number;

	totalPagesTab: number[];
	activePageIndexTab: number[];
	itemsPerPageTab: number[];

	searchDate?: Date;
	filteredCrew: (PlayerCrew | CrewMember)[][];
	filterProps: FilterProps[];
	appliedFilters: FilterProps[];

	viewModes: GauntletViewMode[];
}

const DEFAULT_FILTER_PROPS = {
	ownedStatus: [] as number[],
	rarity: [] as number[]
};

class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType? = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private inited: boolean = false;
	private gauntlets: Gauntlet[] | undefined = undefined;
	private readonly tiny = TinyStore.getStore('gauntlets');

	constructor(props: GauntletsPageProps) {
		super(props);

		const v1 = this.tiny.getValue<GauntletViewMode>('viewMode_0', 'big') ?? 'big';
		const v2 = this.tiny.getValue<GauntletViewMode>('viewMode_1', 'big') ?? 'big';

		this.state = {
			hoverCrew: undefined,
			activePage: [],
			totalPages: 0,
			activePageIndex: 0,
			itemsPerPage: 10,
			activePageTabs: [[], []],
			totalPagesTab: [0, 0],
			activePageIndexTab: [0, 0],
			itemsPerPageTab: [10, 10],
			filteredCrew: [[], []],
			viewModes: [v1, v2],
			filterProps: [JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS))],
			appliedFilters: [JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS)), JSON.parse(JSON.stringify(DEFAULT_FILTER_PROPS))]
		}
	}

	public readonly setHoverCrew = (item: CrewMember | PlayerCrew | null | undefined) => {
		this.setState({ ... this.state, hoverCrew: item });
	};

	public readonly setActivePage = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps) => {
		if (this.inited && this.gauntlets) {

			let ip = this.state.itemsPerPage;
			let ap = ((data.activePage as number) - 1);
			if (ap < 0) ap = 0;
			
			let cp = ap * ip;
			let ep = cp + ip;
			if (ep > this.gauntlets.length) ep = this.gauntlets.length;
			let sl = this.gauntlets.slice(cp, ep);
			this.setState({ ... this.state, activePage: sl, activePageIndex: ap + 1 });

		}
	}

	public readonly setActivePageTab = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps, index: number) => {

		const tabs = [this.state.today?.matchedCrew, this.state.yesterday?.matchedCrew];

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
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid/' + crew.symbol, value, true);
        }
        else {
            this.tiny.setValue<PlayerImmortalMode[]>('immomodevalid', value, true);
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

    protected get playerBuffMode(): PlayerBuffMode {
        return this.tiny.getValue<PlayerBuffMode>('buffmode', 'player') ?? 'player';
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
		if (this.playerBuffMode === value) return;
        this.tiny.setValue<PlayerBuffMode>('buffmode', value, true);
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
			this.gauntlets = undefined;
			this.inited = false;
		}
		this.initData();
	}

	initData() {
		const { crew: allCrew, gauntlets: gauntin, playerData } = this.context;
		const gauntlets = JSON.parse(JSON.stringify(gauntin)) as Gauntlet[];
		const haveData = !!playerData?.player?.character?.crew?.length;
		if (!(allCrew?.length) || !(gauntlets?.length)) return;
		
		const hasPlayer = !!this.context.playerData?.player?.character?.crew?.length;

		if (gauntlets && this.inited) return;

		gauntlets.forEach((gauntlet, index) => {			
			const prettyTraits = gauntlet.contest_data?.traits?.map(t => trait_names[t]);
			if (!prettyTraits) {
				return null
			}
			const matchedCrew = 				
				allCrew.filter(e => e.max_rarity > 3 && (
					Object.keys(e.base_skills).some(k => e.base_skills[k].range_max >= 650) ||
					prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
					.map((crew) => {
						let c = playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);
						if (c) return c;						
						if (!haveData) crew.rarity = crew.max_rarity;
						else crew.rarity = 0;
						crew.immortal = haveData ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
						return crew;
					})
					.sort((a, b) => {
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
							r = comparePairs(ap[0], bp[0], gauntlet.contest_data?.featured_skill, 1.65);
							if (r === 0 && ap.length > 1 && bp.length > 1) {
								r = comparePairs(ap[1], bp[1], gauntlet.contest_data?.featured_skill, 1.65);
								if (r === 0 && ap.length > 2 && bp.length > 2) {
									r = comparePairs(ap[2], bp[2], gauntlet.contest_data?.featured_skill, 1.65);
								}
							}
						}
						return r;
					});
			
			gauntlet.matchedCrew = matchedCrew;
			gauntlet.prettyTraits = prettyTraits;
		});	

		if (!this.gauntlets || !this.inited) {

			let gaunts = gauntlets?.filter((gauntlet) => gauntlet.prettyTraits?.length) ?? [];
			let today = gaunts[0];
			let yesterday = gaunts[1];

			gaunts = gaunts.slice(2);
			
			let ip = this.state.itemsPerPage;
			let pc = Math.ceil(gaunts.length / ip);
	
			let apidx = [1, 1];
			let pcs = [0, 0];
			let aptabs = [[], []] as (PlayerCrew | CrewMember)[][];

			[today, yesterday].forEach((day, idx) => {
				if (!day.matchedCrew) {
					return;
				}

				let ip = this.state.itemsPerPageTab[idx];
				let pc = Math.ceil(day.matchedCrew.length / ip);

				aptabs[idx] = day.matchedCrew.slice(0, ip);
				pcs[idx] = pc;
			})

			this.gauntlets = gaunts;
			this.inited = true;			

			this.setState({ ... this.state, 
				activePage: gaunts.slice(0, ip), 
				totalPages: pc, 
				activePageIndex: 1, 
				activePageTabs: aptabs,
				totalPagesTab: pcs,
				activePageIndexTab: apidx,
				today, 
				yesterday,
				lastPlayerDate: this.context.playerData?.calc?.lastModified
			});
		}
	}

	private readonly updatePaging = () => {
		const { today, yesterday } = this.state;
		if (!today || !yesterday) return;

		let apidx = [1, 1];
			let pcs = [0, 0];
			let aptabs = [[], []] as (PlayerCrew | CrewMember)[][];

			[today, yesterday].forEach((day, idx) => {
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
				activePageIndex: 1, 
				activePageTabs: aptabs,
				totalPagesTab: pcs,
				activePageIndexTab: apidx,
				today, 
				yesterday 
			});
	}
	
	renderGauntletBig(gauntlet: Gauntlet | undefined, idx: number) {
		const { activePageTabs, activePageIndexTab, totalPagesTab, viewModes } = this.state;
		if (!gauntlet) return undefined;

		const prettyDate = moment(gauntlet.date).utc(false).format('dddd, D MMMM YYYY');
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
			
		return (
		<div style={{
			marginBottom: "2em"
		}}>
			<h1>{idx === 0 ? "Today" : "Yesterday"}'s Gauntlet</h1>
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
					flexDirection:"row",
					justifyContent: "space-between"
				}}>
					<h2 style={{fontSize:"2em", margin: "0.25em 0"}}>
						{gauntlet.contest_data?.traits.map(t => trait_names[t]).join("/")}/{SKILLS[gauntlet.contest_data?.featured_skill ?? ""]}						
					</h2>
					<div style={{
						display: "flex",
						flexDirection: "column",
					}}>
					<h4><b>View Mode</b></h4>
					
					<Dropdown
					
						options={displayOptions}
							value={viewModes[idx]}
							onChange={(e, { value }) => this.setViewMode(idx, value as (GauntletViewMode))}
							/>
					</div>
				</div>
			</div>
			
			<div style={{margin:"1em 0"}}>
				<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
			</div>

			{viewModes[idx] === 'big' &&
			<div style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap"
			}}>
				{activePageTabs[idx].map((crew, idx) => (
					<div className="ui segment" style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-evenly",
						width: "100%"
					}}>
						<CrewPresenter 
							width="100%"
							imageWidth="50%"
							plugins={[GauntletSkill, ShipSkill]}
							pluginData={[gauntlet, undefined]}
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
			{viewModes[idx] === 'small' &&
			<div style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap"
			}}>
				{activePageTabs[idx].map((crew, idx) => (
					<div className="ui segment" style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "space-evenly",
						flexWrap: "wrap",
						width: "50%",
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
			<div style={{margin:"1em 0"}}>
				<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
			</div>

			<hr />
		</div>
		)

	}


	renderTable(gauntlet: Gauntlet, data: PlayerCrew[], idx: number) {
		if (!data) return <></>;
		
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
						<Table.HeaderCell>Rank</Table.HeaderCell>
						<Table.HeaderCell>Crew</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell>Crit Chance</Table.HeaderCell>
						<Table.HeaderCell>1st Pair</Table.HeaderCell>
						<Table.HeaderCell>2nd Pair</Table.HeaderCell>
						<Table.HeaderCell>3rd Pair</Table.HeaderCell>
						<Table.HeaderCell>Owned</Table.HeaderCell>
						<Table.HeaderCell>In Portal</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((row, idx: number) => {
						const crew = row;
						const pairs = getPlayerPairs(crew);

						return (crew &&
							<Table.Row key={idx}
							>
								<Table.Cell>{idx + pp + 1}</Table.Cell>
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
											<a onClick={(e) => navToCrewPage(crew, this.context.playerData.player.character.crew, buffConfig)}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
											</a>											
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
			</Table>
			<CrewHoverStat crew={this.state.hoverCrew ?? undefined} targetGroup='gauntletTable' />
			</div>);
	}

	private formatPair(pair: Skill[]): JSX.Element {
		
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

	private changeDate = (e: string) => {
		this.setState({ ...this.state, searchDate: new Date(e) });
	}

	renderPreviousGauntlets() {
		const { gauntlets } = this;
		const { activePage, activePageIndex, totalPages, searchDate } = this.state;

		if (!gauntlets) return <></>
		
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
		const foreColor = theme === 'dark' ? 'white' : 'black';

		return (<>
				<div style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between"
				}}>
					<h2>Previous Gauntlets</h2>		
						
					{/* <div style={{
						margin: "0.25em",
						marginRight: 0,
						display: "flex",
						flexDirection: "row",
						justifyContent: "center",
						justifyItems: "center",
						alignItems: "center",
						alignContent: "center"
					}}>
						<h4 style={{marginTop:"0.5em"}}>Search By Date:&nbsp;</h4>
						<input value={searchDate?.toDateString()} max={(new Date(gauntlets[0].date).toDateString())} onChange={(e) => this.changeDate((e.nativeEvent.target as HTMLInputElement).value)} className="ui input button" style={{color:foreColor, margin :"0.25em", marginRight: 0}} type="date" />
						<i style={{marginLeft:"0.5em", cursor: "pointer"}} className="icon remove circle button" />
					</div> */}
				</div>
				
				<Pagination fluid totalPages={totalPages} activePage={activePageIndex} onPageChange={this.setActivePage} />
			
				<div className="ui segment">
					<Item.Group divided>
						{activePage?.map((node, index) => {

							const matchedCrew = node.matchedCrew ?? [];

							const prettyDate = moment(node.date).utc(false).format('dddd, D MMMM YYYY')
							const prettyTraits = node.prettyTraits;

							return (
							<Item key={index}>
								<Item.Content>
									<Item.Header>
										{node.contest_data?.traits.map(t => trait_names[t]).join("/")}/{SKILLS[node.contest_data?.featured_skill ?? ""]}
									</Item.Header>
									<Item.Meta style={{color: 'white'}}>{prettyDate}</Item.Meta>
									<Item.Description>
										<Grid stackable>
										{matchedCrew.map((crew) => (
												<Grid.Column width={1} style={{textAlign: 'center'}}>
													<Link to={`/crew/${crew.symbol}`}>
												<CrewTarget inputItem={crew} setDisplayItem={this.setHoverCrew} targetGroup='gauntlets'>
													<Image
													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
													size='tiny'
													alt={crew.name}
													style={{
														borderColor: CONFIG.RARITIES[crew.max_rarity].color,
														borderWidth: '1px',
														borderRadius: '4px',
														borderStyle: 'solid',
														marginLeft: 'auto',
														marginRight: 'auto'
													}}
												/>
												</CrewTarget>
											</Link>
											{((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
											<br />
											{crew.base_skills[node.contest_data?.featured_skill ?? ""] ? <img style={{width: '1em'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${node.contest_data?.featured_skill}.png`} /> : ''}
											</Grid.Column>
										))}
										</Grid>
									</Item.Description>
								</Item.Content>
							</Item>
						)
							})}
					</Item.Group>
				</div>
				<Pagination fluid totalPages={totalPages} activePage={activePageIndex} onPageChange={this.setActivePage} />
			</>)
	}

	render() {
		const { gauntlets } = this;
		const { activePage, activePageIndex, totalPages, today, yesterday } = this.state;
		const { activePageTabs, activePageIndexTab, totalPagesTab } = this.state;

		if (!gauntlets) return <></>

		const tabPanes = [
			{
				menuItem: "Today's Gauntlet",
				render: () => this.renderGauntletBig(today, 0)
			},
			{
				menuItem: "Yesterday's Gauntlet",
				render: () => this.renderGauntletBig(yesterday, 1)
			},
			{
				menuItem: "Previous Gauntlets",
				render: () => this.renderPreviousGauntlets()
			}
		]

		return (
			<div>
				<Message icon warning>
				<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>

				<Tab menu={{ attached: false }} panes={tabPanes} />
				<CrewHoverStat targetGroup='gauntlets' crew={this.state.hoverCrew ?? undefined} />
			</div>
		)}
	}


export default GauntletsPage;