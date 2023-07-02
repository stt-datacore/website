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
import { PlayerCrew, PlayerData } from '../model/player';
import { BuffStatTable } from '../utils/voyageutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { CrewMember } from '../model/crew';
import { TinyStore } from '../utils/tiny';
import { Gauntlet } from '../model/gauntlets';
import { prepareProfileData } from '../utils/crewutils';
import { CrewPresenter } from '../components/item_presenters/crew_presenter';

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
		if (playerData) prepareProfileData("INDEX", coreData.crew, playerData, new Date());
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
	totalPages: number;
	activePageIndex: number;
	itemsPerPage: number;
	today?: Gauntlet;
	yesterday?: Gauntlet;
}

class GauntletsPageComponent extends React.Component<GauntletsPageProps, GauntletsPageState> {
	static contextType? = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private inited: boolean = false;
	private gauntlets: Gauntlet[] | undefined = undefined;

	constructor(props: GauntletsPageProps) {
		super(props);

		this.state = {
			hoverCrew: undefined,
			activePage: [],
			totalPages: 0,
			activePageIndex: 0,
			itemsPerPage: 10
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

	componentDidMount() {
		this.initData();
	}

	componentDidUpdate() {
		this.initData();
	}

	initData() {
		const { allCrew, gauntlets } = this.context;
		if (!(allCrew?.length) || !(gauntlets?.length)) return;

		gauntlets.forEach((node, index) => {
			
			const prettyTraits = node.contest_data?.traits?.map(t => trait_names[t]);
			if (!prettyTraits) {
				return null
			}
			const matchedCrew = 
				allCrew.filter(e => e.max_rarity > 3 && (
					prettyTraits.filter(t => e.traits_named.includes(t)).length > 1))
					.sort((a, b) => (prettyTraits.filter(t => b.traits_named.includes(t)).length - prettyTraits.filter(t => a.traits_named.includes(t)).length));

			node.matchedCrew = matchedCrew;
			node.prettyTraits = prettyTraits;
		});	

		if (!this.gauntlets || !this.inited) {

			let gaunts = gauntlets?.filter((gauntlet) => gauntlet.prettyTraits?.length) ?? [];
			let today = gaunts[0];
			let yesterday = gaunts[1];
			
			gaunts = gaunts.slice(2);

			let ip = this.state.itemsPerPage;
			let pc = Math.round(gaunts.length / ip);
	
			if ((pc * ip) != gaunts.length) {
				pc++;
			}

			this.gauntlets = gaunts;
			this.inited = true;			

			this.setState({ ... this.state, activePage: gaunts.slice(0, ip), totalPages: pc, activePageIndex: 1, today, yesterday });
		}
	}

	render() {
		const { gauntlets } = this;
		const { activePage, activePageIndex, totalPages, today, yesterday } = this.state;
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

						<div style={{
							display: "flex",
							flexDirection: "row",
							flexWrap: "wrap"
						}}>
							{matchedCrew.map((crew) => (
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
											{prettyTraits?.filter(t => crew.traits_named.includes(t)).length == 3 ? '65%' : '45%'}
										</div>
										<div style={{margin: "0.5em"}}>
											{crew.base_skills[node.contest_data?.featured_skill ?? ""] ? 
											<img style={{width: '1em'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${node.contest_data?.featured_skill}.png`} /> 
											: ''}
										</div>
									</div>
									
									<CrewPresenter storeName='gauntlets' hover={false} crew={crew} />

								</div>
							))}
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