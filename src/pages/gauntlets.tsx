import React, { PureComponent } from 'react';
import { Item, Image, Grid, Popup, Pagination, PaginationProps } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';
import * as moment from 'moment';
import Layout from '../components/layout';

import { getEpisodeName } from '../utils/episodes';
import { trait_names } from '../../static/structured/translation_en.json';
import CONFIG from '../components/CONFIG';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { BuffStatTable } from '../utils/voyageutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { CrewMember, Skill } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet } from '../model/gauntlets';
import { getSkills, prepareOne, prepareProfileData } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';
import { CrewPreparer, PlayerBuffMode, PlayerImmortalMode } from '../components/item_presenters/crew_preparer';

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
	const isReady = coreData.ready(['all_buffs', 'crew', 'gauntlets', 'items']);
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

export interface GauntletsPageState {
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


}

class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType? = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private inited: boolean = false;
	private gauntlets: Gauntlet[] | undefined = undefined;
	private readonly tiny = TinyStore.getStore('gauntlets');

	constructor(props: GauntletsPageProps) {
		super(props);

		this.state = {
			hoverCrew: undefined,
			activePage: [],
			totalPages: 0,
			activePageIndex: 0,
			itemsPerPage: 10,
			activePageTabs: [[], []],
			totalPagesTab: [0, 0],
			activePageIndexTab: [0, 0],
			itemsPerPageTab: [10, 10]
		}
	}

	public setHoverCrew = (item: CrewMember | PlayerCrew | null | undefined) => {
		this.setState({ ... this.state, hoverCrew: item });
	};

	public setActivePage = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps) => {
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

	public setActivePageTab = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | null, data: PaginationProps, index: number) => {

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

	private lastBuffMode: PlayerBuffMode | undefined = undefined;
	onBuffToggle = (state: PlayerBuffMode) => {
		if (state !== this.lastBuffMode) {
			this.lastBuffMode = state;
			this.forceUpdate();
		}
	}

	onImmoToggle = (crew: PlayerCrew, state: PlayerImmortalMode) => {
		
	}

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate() {
		this.initData();
	}

	initData() {
		const { allCrew, gauntlets } = this.context;
		if (!(allCrew?.length) || !(gauntlets?.length)) return;

		if (gauntlets && this.inited) return;

		gauntlets.forEach((node, index) => {
			
			const prettyTraits = node.contest_data?.traits?.map(t => trait_names[t]);
			if (!prettyTraits) {
				return null
			}
			const matchedCrew = 
				allCrew.filter(e => e.max_rarity > 3 && (
					Object.keys(e.base_skills).some(k => e.base_skills[k].range_max >= 650) ||
					prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
					.map((crew) => {
						let c = this.context.playerData?.player?.character?.crew?.find(d => d.symbol === crew.symbol);
						if (c) return c;
						crew.immortal = this.context.playerData?.player?.character?.crew?.length ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
						return crew;
					})
					.sort((a, b) => {
						if ("have" in a && "have" in b) {
							if (a.have && !b.have) return -1;
							else if (!a.have && b.have) return 1;
						}
						else if ("have" in a && a.have && !("have" in b)) return -1;
						else if ("have" in b && b.have && !("have" in a)) return 1;
						
						let r = 0;
						r = (prettyTraits.filter(t => b.traits_named.includes(t)).length - prettyTraits.filter(t => a.traits_named.includes(t)).length);
						
						if (r) return r;

						// if (b.immortal > 0 && a.immortal <= 0) return -1;
						// else if (a.immortal > 0 && b.immortal <= 0) return 1;

						if (node.contest_data?.featured_skill) {
							r = 0;
							
							let askills = getSkills(a);
							let bskills = getSkills(b);

							if (askills.includes(node.contest_data?.featured_skill)) r--; 
							if (bskills.includes(node.contest_data?.featured_skill)) r++; 
							
							if (r) return r;

							let sk = 0;
							let ask: number[] = [];
							let bsk: number[] = [];

							for (let skill of askills) {
								let bs: Skill;

								if (skill in a.base_skills) {
									bs = a.base_skills[skill];
								}
								else if (skill in a) {
									bs = { core: a[skill].core, range_min: a[skill].min, range_max: a[skill].max };
								}
								else {
									bs = a.base_skills[skill];
								}

								sk = (bs.range_max + bs.range_min) / 2;															
								if (skill === node.contest_data.featured_skill) {
									sk *= 1.35
								}
								ask.push(sk);
							}

							for (let skill of bskills) {
								let bs: Skill;

								if (skill in b.base_skills) {
									bs = b.base_skills[skill];
								}
								else if (skill in b) {
									bs = { core: b[skill].core, range_min: b[skill].min, range_max: b[skill].max };
								}
								else {
									bs = b.base_skills[skill];
								}
								bs = b.base_skills[skill];
								if (!bs) continue;
								sk = (bs.range_max + bs.range_min) / 2;																
								if (skill === node.contest_data.featured_skill) {
									sk *= 1.35
								}
								bsk.push(sk);
							}

							ask.sort((a, b) => b - a);
							bsk.sort((a, b) => b - a);

							if (ask.length >= 1) {
								ask[0] += ask[0] * 0.35;
								if (ask.length >= 2) {
									ask[1] += ask[1] * 0.25;
									if (ask.length >= 3) {
										ask[2] += ask[2] * 0.1;
									}
								}
							}

							if (bsk.length >= 1) {
								bsk[0] += bsk[0] * 0.35;
								if (bsk.length >= 2) {
									bsk[1] += bsk[1] * 0.25;
									if (bsk.length >= 3) {
										bsk[2] += bsk[2] * 0.1;
									}
								}
							}

							r = bsk.reduce((prev, curr) => prev + curr) - ask.reduce((prev, curr) => prev + curr);
						}

						return r;
					});
			
			node.matchedCrew = matchedCrew;
			node.prettyTraits = prettyTraits;
		});	

		if (!this.gauntlets || !this.inited) {

			let gaunts = gauntlets?.filter((gauntlet) => gauntlet.prettyTraits?.length) ?? [];
			let today = gaunts[0];
			let yesterday = gaunts[1];
			
			// [0, 1].forEach((idx) => {
			// 	gaunts[idx].matchedCrew = gaunts[idx].matchedCrew?.map((crew) => {
			// 		let [newcrew, immomodes] = CrewPreparer.prepareCrewMember(crew, this.playerBuffMode, this.getImmortalMode(crew), this.context);
			// 		this.setValidImmortalModes(crew, immomodes ?? ['full']);
			// 		return newcrew as PlayerCrew;
			// 	})
			// });

			gaunts = gaunts.slice(2);
			
			let ip = this.state.itemsPerPage;
			let pc = Math.round(gaunts.length / ip);
	
			if ((pc * ip) != gaunts.length) {
				pc++;
			}

			let apidx = [1, 1];
			let pcs = [0, 0];
			let aptabs = [[], []] as (PlayerCrew | CrewMember)[][];

			[today, yesterday].forEach((day, idx) => {
				if (!day.matchedCrew) {
					return;
				}

				let ip = this.state.itemsPerPageTab[idx];
				let pc = Math.round(day.matchedCrew.length / ip);
		
				if ((pc * ip) != gaunts.length) {
					pc++;
				}

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
				yesterday 
			});
		}
	}

	render() {
		const { gauntlets } = this;
		const { activePage, activePageIndex, totalPages, today, yesterday } = this.state;
		const { activePageTabs, activePageIndexTab, totalPagesTab } = this.state;

		if (!gauntlets) return <></>

		return (
			<Layout title='Gauntlets'>
			
				{[today, yesterday].map((node, idx) => {
					if (!node) return undefined;

					const matchedCrew = node.matchedCrew ?? [];

					const prettyDate = moment(node.date).utc(false).format('dddd, D MMMM YYYY')
					const prettyTraits = node.prettyTraits;

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
							<h2 style={{fontSize:"2em", margin: "0.25em 0"}}>
								{node.contest_data?.traits.map(t => trait_names[t]).join("/")}/{SKILLS[node.contest_data?.featured_skill ?? ""]}						
							</h2>
						</div>
						
						<div style={{margin:"1em 0"}}>
							<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
						</div>

						<div style={{
							display: "flex",
							flexDirection: "row",
							flexWrap: "wrap"
						}}>
							{activePageTabs[idx].map((crew) => (
								<div className="ui segment" style={{
									display: "flex",
									flexDirection: "row",
									justifyContent: "space-evenly",
									width: "100%"
								}}>
									<div style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
										alignItems: "center",
										fontSize: "3em"
									}}>

										<div style={{margin: "0.5em"}}>
											{ prettyTraits?.some(t => crew.traits_named.includes(t)) && ((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
										</div>
										<div style={{margin: "0.5em"}}>
											{crew.base_skills[node.contest_data?.featured_skill ?? ""] ? 
											<img style={{width: '1em'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${node.contest_data?.featured_skill}.png`} /> 
											: ''}
										</div>
									</div>
									
									<CrewPresenter 
										selfRender={true}
										selfPrepare={true}
										onBuffToggle={this.onBuffToggle}
										onImmoToggle={(state) => this.onImmoToggle(crew as PlayerCrew, state)}
										storeName='gauntlets' 
										hover={false} 
										crew={crew} />

								</div>
							))}
						</div>

						<div style={{margin:"1em 0"}}>
							<Pagination fluid totalPages={totalPagesTab[idx]} activePage={activePageIndexTab[idx]} onPageChange={(e, data) => this.setActivePageTab(e, data, idx)} />
						</div>

						<hr />
					</div>
					)
				})}
				
				<CrewHoverStat targetGroup='gauntlets' crew={this.state.hoverCrew ?? undefined} />

				<hr />

				<h2>Previous Gauntlets</h2>			
				
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
													<a href={`/crew/${crew.symbol}`}>
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
											</a>
											{prettyTraits?.filter(t => crew.traits_named.includes(t)).length == 3 ? '65%' : '45%'}
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
			</Layout>
		)}
	}


export default GauntletsPage;