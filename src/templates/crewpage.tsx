import React, { Component } from 'react';
import { Helmet } from 'react-helmet';
import { Header, Image, Divider, Grid, Segment, Rating, Dropdown, Popup, Label, Button, Comment } from 'semantic-ui-react';
import { graphql, navigate } from 'gatsby';

import SimpleMDE from 'react-simplemde-editor';
import marked from 'marked';

import Layout from '../components/layout';
import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';
import CrewFullEquipTree from '../components/crewfullequiptree';
import CommonCrewData from '../components/commoncrewdata';
import ExtraCrewDetails from '../components/extracrewdetails';

import CONFIG from '../components/CONFIG';
import { getShipBonus, getShipChargePhases, prepareProfileData } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { TinyStore } from '../utils/tiny';
import { BuffStatTable } from '../utils/voyageutils';
import { CrewMember } from '../model/crew';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { ShipSkill } from '../components/item_presenters/shipskill';
import { DataContext } from '../context/datacontext';
import { PlayerContext } from '../context/playercontext';
import { MergedContext } from '../context/mergedcontext';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { populateItemCadetSources } from '../utils/itemutils';
const DEFAULT_MOBILE_WIDTH = 768;



export interface CrewPageOptions {
	key: string;
	text: string;
	value: string;
	content: JSX.Element;
}

type StaticCrewPageProps = {
	data: {
		site: {
			siteMetadata: {
				titleTemplate: string;
				defaultTitle: string;
				defaultDescription: string;
				baseUrl: string;
			}
		};
		markdownRemark: {
			html: string;
			frontmatter: {
				name: string;
				memory_alpha: string;
				bigbook_tier?: number;
				events?: number;
				in_portal?: boolean;
				published: boolean;
			};
			rawMarkdownBody: string;
		};
		crewJson: any;
	};
	location: {
		pathname: string;
	}
};

const StaticCrewPage = (props: StaticCrewPageProps) => {
	const coreData = React.useContext(DataContext);
	const { strippedPlayerData, buffConfig, maxBuffs } = React.useContext(PlayerContext);

	const isReady = coreData.ready ? coreData.ready(['items', 'crew', 'keystones', 'cadet']) : false;
	const cadetforitem = isReady ? coreData?.cadet?.filter(f => f.cadet) : undefined;

	if (isReady && cadetforitem?.length) {
		populateItemCadetSources(coreData.items, cadetforitem);
	}
	let pd = {} as PlayerData;

	if (strippedPlayerData) {
		pd = JSON.parse(JSON.stringify(strippedPlayerData)) as PlayerData;
		prepareProfileData('ITEM_PAGE', coreData.crew, pd, new Date());
	}

	return (
		<Layout narrowLayout={true}>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<MergedContext.Provider value={{ 
					playerData: pd, 
					allCrew: coreData.crew,
					items: coreData.items,
					buffConfig: buffConfig,
					maxBuffs: maxBuffs,
					keystones: coreData.keystones
					}}>
					<StaticCrewComponent props={props} />
				</MergedContext.Provider>
			}
		</Layout>
	);
};

type StaticCrewComponentState = {
	selectedEquipment?: string;
	modalVisible: boolean;
	commentMarkdown: string;
	comments: any[];
	itemBig: boolean;
};

interface StaticCrewComponentProps {
	props: StaticCrewPageProps;
}

class StaticCrewComponent extends Component<StaticCrewComponentProps, StaticCrewComponentState> {		
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	
	constructor(props: StaticCrewComponentProps | Readonly<StaticCrewComponentProps>) {
		super(props);
		this.state = {
			selectedEquipment: undefined,
			modalVisible: false,
			commentMarkdown: '', // TODO: load
			comments: [],
			itemBig: this.stash.getValue('crew_static_big', false) ?? false
		};
	}
	
	owned: PlayerCrew[] | undefined = undefined;
	ownedCrew: PlayerCrew[] | undefined = undefined;
	buffs: BuffStatTable | undefined = undefined;
	readonly stash = TinyStore.getStore('staticStash', false, true);

	componentWillUnmount(): void {
		window.removeEventListener('keydown', (e) => this._windowKey(e))
		window.removeEventListener('resize', (e) => this._windowSize(e))
	}

	componentDidMount() {
		window.addEventListener('keydown', (e) => this._windowKey(e))
		window.addEventListener('resize', (e) => this._windowSize(e))
		// if (this.stash.containsKey('owned')) {
		// 	this.ownedCrew = this.stash.getValue('owned');
		// 	//stash.removeValue('owned');				
		// }			

		// if (this.stash.containsKey('buffs')) {
		// 	this.buffs = this.stash.getValue('buffs');				
		// }			

		// Disabled until we get big book folks on-board
		/*fetch(`${process.env.GATSBY_DATACORE_URL}api/comments?symbol=` + this.props.data.crewJson.edges[0].node.symbol)
			.then(response => response.json())
			.then(comments => {
				this.setState({ comments });

				const userName = this._getCurrentUsername();
				if (userName) {
					comments.forEach(comment => {
						if (comment.user.loginUserName === userName) {
							this.setState({ commentMarkdown: comment.markdown });
						}
					});
				}
			});*/
	}
	_getCurrentUsername() {
		const windowGlobal = typeof window !== 'undefined' && window;
		let isLoggedIn = windowGlobal && window.localStorage && window.localStorage.getItem('token') && window.localStorage.getItem('username');
		return isLoggedIn ? window.localStorage.getItem('username') : '';
	}
	
	_windowKey = (e: KeyboardEvent) => {
			
		if (e.key === "Escape") {
			if (this.state.itemBig) {
				this.setState({ ...this.state, itemBig: !this.state.itemBig });	
			}
		}
	}

	_windowSize = (e: Event) => {
		this.setState({ ... this.state });
	}

	render() {
		const { location } = this.props.props;
		const { markdownRemark, crewJson, site: { siteMetadata } } = this.props.props.data;


		if (this.context.playerData?.player?.character?.crew?.length) {
			this.ownedCrew = this.context.playerData.player.character.crew;
		}
		if (this.context.buffConfig) {
			this.buffs = this.context.buffConfig;
		}

		if (crewJson.edges.length === 0) {
			return <span>Crew not found!</span>;
		}

		const { comments } = this.state;

		let hasBigBookEntry = markdownRemark && markdownRemark.frontmatter && markdownRemark.frontmatter.published;

		const userName = this._getCurrentUsername();

		const crew = crewJson.edges[0].node as PlayerCrew;
		crew.immortal = CompletionState.DisplayAsImmortalStatic;

		if (this.ownedCrew) {
			let discovered = this.ownedCrew.find(item => item.symbol === crew.symbol);
			if (discovered) {
				crew.immortal = discovered.immortal;
				crew.in_portal ??= discovered.in_portal;
			}
		}

		if (markdownRemark && markdownRemark.frontmatter) {
			crew.bigbook_tier = markdownRemark.frontmatter.bigbook_tier ?? 0;
		}

		
		const imageDoubleClick = () =>{
			if (window.innerWidth < DEFAULT_MOBILE_WIDTH) return;
			this.stash.setValue('crew_static_big', !this.state.itemBig, true);
			this.setState({ ...this.state, itemBig: !this.state.itemBig });			
		}

		return (
			<>
				<Helmet titleTemplate={siteMetadata.titleTemplate} defaultTitle={siteMetadata.defaultTitle}>
					<title>{crew.name}</title>
					<meta property='og:type' content='website' />
					<meta property='og:title' content={`${crew.name} - ${siteMetadata.defaultTitle}`} />
					<meta property='og:site_name' content='DataCore' />
					<meta property='og:image' content={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
					<meta property='og:description' content={markdownRemark.rawMarkdownBody.trim() || siteMetadata.defaultDescription} />
					<meta property='og:url' content={`${siteMetadata.baseUrl}${location.pathname}`} />
				</Helmet>
				<ItemHoverStat targetGroup='crew_page_items' useBoundingClient={true} />
				<CrewFullEquipTree
					visible={this.state.modalVisible}
					items={this.context.items ?? []}
					crew={crew}
					onClosed={() => this.setState({ modalVisible: false })}
				/>
					<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
						<h2 style={{display: "flex", flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row", alignItems:"center"}}>
							<div>{crew.name}</div>
							<div style={{display:"block", marginRight: "0.5em", marginLeft: "0.5em"}}>
								<Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='large' disabled />
							</div>
						</h2>

						<div 
							id='static_avatar'
							style={{
								display: "flex",		
								maxWidth: "700px",						
								flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? "column" : "row",
								alignItems: window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? "center" : "flex-start"														
							}}>
							<div style={{
								display: "flex",								
								flexDirection: "column",
								alignItems: "center",
								width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "100%" : "24em"
							}}>
								<div>
									{crew.series && <Image src={`/media/series/${crew.series}.png`} size={window.innerWidth < DEFAULT_MOBILE_WIDTH || this.state.itemBig ? 'small' : 'small'} />}
								</div>
								<div style={{ 
										flexGrow: 1, 
										display: "flex", 
										flexDirection: window.innerWidth >= DEFAULT_MOBILE_WIDTH && !this.state.itemBig ? "column" : "row", 
										justifyContent: "center" 
									}}
									onDoubleClick={(e) => imageDoubleClick()}
									title={crew.name}
									>
									<img style={{ 
											cursor:
												window.innerWidth < DEFAULT_MOBILE_WIDTH ? 
												"default" :
												this.state.itemBig ?
												"zoom-out" :
												"zoom-in",
											width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "75%" : "100%", 
											marginRight: window.innerWidth >= DEFAULT_MOBILE_WIDTH ? "0.5em" : undefined
										}} 
										src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`} 
										alt={crew.name} 
									/>
									{(window.innerWidth >= DEFAULT_MOBILE_WIDTH && !this.state.itemBig) && (<i style={{textAlign:"center",fontSize:"0.8em", color: "gray"}}>{"(double-click to enlarge)"}</i>)}
								</div>
							</div>
							<div style={{
								display: "flex",
								flexGrow: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : 1,
								flexDirection: "column",
							}}>
								<CommonCrewData crew={crew} markdownRemark={markdownRemark} />
								<div style={{ margin: '1em 0', textAlign: 'right' }}>
									{(crew.immortal !== undefined && crew.immortal !== CompletionState.DisplayAsImmortalStatic) &&
									(<h3><a style={{color: 'lightgreen', cursor: "pointer"}} onClick={(e) => navigate("/playertools?tool=crew&search=" + crew.name)} title="Click to see crew in roster">OWNED</a></h3>)
									||
									<Button icon='add user' color='green' content='Preview in your roster' onClick={() => { this._addProspect(crew); }} />
									}
								</div>

								{(this.context.items?.length ?? 0) > 0 ? (
									<React.Fragment>
										{this.renderEquipment(crew)}
										{this.renderEquipmentDetails(crew)}
										<Button
											onClick={() => this.setState({ modalVisible: true })}
											style={{ marginTop: '1em' }}
											content='Full equipment tree'
											icon='right arrow'
											labelPosition='right'
										/>
									</React.Fragment>
								) : (
										<div className='ui medium centered text active inline loader'>Loading items...</div>
								)}

							</div>
						</div>
					</div>				
				{/* <Grid columns={2}>
					<Grid.Row stretched>
						<Grid.Column width={16}>
							<Header>
								{crew.name} <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='large' disabled />
							</Header>
						</Grid.Column>
					</Grid.Row>
					<Grid.Row>
						<Grid.Column width={4}>
							{crew.series && <Image src={`/media/series/${crew.series}.png`} size='small' />}
							<Image src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`} size='small' />
						</Grid.Column>
						<Grid.Column width={12}>
							<CommonCrewData crew={crew} markdownRemark={markdownRemark} />

							<div style={{ margin: '1em 0', textAlign: 'right' }}>
								{(crew.immortal !== undefined && crew.immortal !== CompletionState.DisplayAsImmortalStatic) &&
								(<h3><a style={{color: 'lightgreen'}} href={"/playertools?tool=crew&search=name:" + crew.name} title="Click to see crew in roster">OWNED</a></h3>)
								||
								<Button icon='add user' color='green' content='Preview in your roster' onClick={() => { this._addProspect(crew); }} />
								}
							</div>
							
							{this.context.items.length > 0 ? (
								<React.Fragment>
									{this.renderEquipment(crew)}
									{this.renderEquipmentDetails(crew)}
									<Button
										onClick={() => this.setState({ modalVisible: true })}
										style={{ marginTop: '1em' }}
										content='Full equipment tree'
										icon='right arrow'
										labelPosition='right'
									/>
								</React.Fragment>
							) : (
									<div className='ui medium centered text active inline loader'>Loading items...</div>
								)}
								
							<Segment>
								<h4 style={{ marginBottom: '.25em' }}>Ship Ability ({crew.action.name})</h4>
								<ul style={{ marginTop: '0', listStyle: 'none', paddingLeft: '0' }}>
									<li>Boosts {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]} by {crew.action.bonus_amount}</li>
									{crew.action.penalty && (
										<li>Decrease {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type]} by {crew.action.penalty.amount}</li>
									)}
									<li>
										<b>Initialize</b>: {crew.action.initial_cooldown}s, <b>Cooldown</b>: {crew.action.cooldown}s, <b>Duration</b>: {crew.action.duration}s
									</li>
									{crew.action.limit && <li><b>Uses Per Battle</b>: {crew.action.limit}</li>}
								</ul>

								{crew.action.ability && (
									<div>
										<h4 style={{ marginBottom: '.25em' }}>Bonus Ability</h4>
										<ul style={{ marginTop: '0', listStyle: 'none', paddingLeft: '0' }}>
											{crew.action.ability.condition > 0 && (
												<li><b>Trigger</b>: {CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</li>
											)}
											<li>{getShipBonus(crew)}</li>
										</ul>
									</div>
								)}

								{crew.action.charge_phases && (
									<div>
										<h4 style={{ marginBottom: '.25em' }}>Charge Phases</h4>
										<ol style={{ marginTop: '0', listStylePosition: 'inside', paddingLeft: '0' }}>
											{getShipChargePhases(crew).map((phase, idx) =>
												<li key={idx}>{phase}</li>
											)}
										</ol>
									</div>
								)}

								<div>
									<h4 style={{ marginBottom: '.25em' }}>Equipment Bonus</h4>
									<p>
										{crew.ship_battle.accuracy && (
											<span>
												<b>Accuracy:</b> +{crew.ship_battle.accuracy}{` `}
											</span>
										)}
										{crew.ship_battle.crit_bonus && (
											<span>
												<b>Crit Bonus:</b> +{crew.ship_battle.crit_bonus}{` `}
											</span>
										)}
										{crew.ship_battle.crit_chance && (
											<span>
												<b>Crit Rating:</b> +{crew.ship_battle.crit_chance}{` `}
											</span>
										)}
										{crew.ship_battle.evasion && (
											<span>
												<b>Evasion:</b> +{crew.ship_battle.evasion}{` `}
											</span>
										)}
									</p>
								</div>
							</Segment>
						</Grid.Column>
					</Grid.Row>
				</Grid> */}
				<Divider horizontal hidden />
				{hasBigBookEntry && (
					<React.Fragment>
						<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
						<div style={{ marginTop: '1em', textAlign: 'right' }}>
							-- <a href={`https://www.bigbook.app/crew/${crew.symbol}`}>The Big Book of Behold Advice</a>
						</div>
					</React.Fragment>
				)}
				{/*userName && (
						<div>
							<br />
							<p>Hello, {userName}. You can edit your comment below:</p>
							<SimpleMDE
								value={this.state.commentMarkdown}
								onChange={value => this._handleMarkDownChange(value)}
								options={{ hideIcons: ['fullscreen', 'guide', 'image', 'side-by-side'] }}
							/>
							<Button onClick={() => this._saveComment(crew.symbol, window.localStorage.getItem('token'))} content='Save comment' />
						</div>
					)}
					{comments && (
						<Comment.Group>
							<Header as='h3' dividing>
								Comments
							</Header>

							{comments.map(comment => (
								<Comment key={comment.id}>
									<Comment.Avatar src={comment.user.avatar || `${process.env.GATSBY_ASSETS_URL}crew_portraits_cm_empty_sm.png`} />
									<Comment.Content>
										<Comment.Author>{comment.user.loginUserName}</Comment.Author>
										<Comment.Metadata>
											<div>{comment.lastUpdate}</div>
										</Comment.Metadata>
										<Comment.Text>
											<div dangerouslySetInnerHTML={{ __html: marked(comment.markdown) }} />
										</Comment.Text>
									</Comment.Content>
								</Comment>
							))}
						</Comment.Group>
							)*/}
				<Divider horizontal hidden style={{ marginTop: '4em' }} />
				<ExtraCrewDetails
					crew_archetype_id={crew.archetype_id}
					max_rarity={crew.max_rarity}
					base_skills={crew.base_skills}
					traits={crew.traits} traits_hidden={crew.traits_hidden}
					unique_polestar_combos={crew.unique_polestar_combos}
				/>
			</>
		);
	}

	_handleMarkDownChange(value: string) {
		this.setState({ commentMarkdown: value });
	}

	async _saveComment(symbol: string, token: string) {
		const { commentMarkdown } = this.state;

		fetch(`${process.env.GATSBY_DATACORE_URL}api/savecomment`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ token, symbol, markdown: commentMarkdown })
		})
			.then(response => response.json())
			.then(res => {
				console.log(res);
			})
			.catch(err => {
				console.error(err);
			});
	}

	_addProspect(crew: any): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: [crew.symbol]
		};
		navigate(linkUrl, { state: linkState });
	}

	renderEquipment(crew: PlayerCrew) {
		let options = [] as CrewPageOptions[];
		crew.equipment_slots.forEach(es => {
			let equipment = this.context.items?.find(item => item.symbol === es.symbol);
			if (!equipment) {
				console.warn(`Could not find item ${es.symbol}`);
				return;
			}

			options.push({
				key: es.symbol + '_' + es.level,
				text: `${equipment.name} (level ${es.level})`,
				value: es.symbol,
				content: (
					<Header
						icon={
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${equipment.imageUrl}`}
								size={48}
								maxRarity={equipment.rarity}
								rarity={equipment.rarity}
							/>
						}
						content={equipment.name}
						subheader={`Level ${es.level}`}
					/>
				)
			});
		});

		return (
			<Dropdown
				selection
				fluid
				options={options}
				placeholder='Choose an equipment to see its details'
				onChange={(ev, { value }) => this.setState({ selectedEquipment: value as string })}
			/>
		);
	}

	renderEquipmentDetails(crew: PlayerCrew) {
		if (!this.state.selectedEquipment) {
			return <span />;
		}

		let es = crew.equipment_slots.find(es => es.symbol === this.state.selectedEquipment);
		let equipment = this.context.items?.find(item => item.symbol === es?.symbol);
		if (!equipment) {
			console.error('Could not find equipment for slot', es);
			return <span />;
		}

		if (!equipment.recipe) {
			return (
				<div>
					<br />
					<p>This item is not craftable, you can find it in these sources:</p>
					<ItemSources item_sources={equipment.item_sources} />
				</div>
			);
		}

		return (
			<div>
				<Grid columns={4} centered padded>
					{equipment.recipe.list.map(entry => {
						let recipeEntry = this.context.items?.find(item => item.symbol === entry.symbol);
						if (!recipeEntry) return <></>
						return (
							<Grid.Column key={recipeEntry.name + recipeEntry.rarity} textAlign='center'>
								<Popup
									trigger={
										<Label as='a' style={{ background: CONFIG.RARITIES[recipeEntry.rarity].color }} image size='big'>
											<img src={`${process.env.GATSBY_ASSETS_URL}${recipeEntry.imageUrl}`} />x{entry.count}
										</Label>
									}
									header={CONFIG.RARITIES[recipeEntry.rarity].name + ' ' + recipeEntry.name}
									content={<ItemSources item_sources={recipeEntry.item_sources} />}
									wide
								/>
							</Grid.Column>
						);
					})}
				</Grid>
			</div>
		);
	}
}

export default StaticCrewPage;

export const query = graphql`
	query($slug: String!, $symbol: String!) {
		site {
			siteMetadata {
				defaultTitle: title
				titleTemplate
				defaultDescription: description
				baseUrl
			}
		}
		markdownRemark(fields: { slug: { eq: $slug } }) {
			rawMarkdownBody
			html
			frontmatter {
				name
				memory_alpha
				bigbook_tier
				events
				in_portal
				published
			}
		}
		crewJson: allCrewJson(filter: { symbol: { eq: $symbol } }) {
			edges {
				node {
					name
					short_name
					flavor
					series
					symbol
					archetype_id
					traits
					traits_named
					traits_hidden
					collections
					max_rarity
					imageUrlFullBody
					imageUrlPortrait
					date_added
					in_portal
					obtained
					...RanksFragment
					base_skills {
						security_skill {
							core
							range_min
							range_max
						}
						command_skill {
							core
							range_min
							range_max
						}
						diplomacy_skill {
							core
							range_min
							range_max
						}
						science_skill {
							core
							range_min
							range_max
						}
						medicine_skill {
							core
							range_min
							range_max
						}
						engineering_skill {
							core
							range_min
							range_max
						}
					}
					skill_data {
						rarity
						base_skills {
							security_skill {
								core
								range_min
								range_max
							}
							command_skill {
								core
								range_min
								range_max
							}
							diplomacy_skill {
								core
								range_min
								range_max
							}
							science_skill {
								core
								range_min
								range_max
							}
							medicine_skill {
								core
								range_min
								range_max
							}
							engineering_skill {
								core
								range_min
								range_max
							}
						}
					}
					cross_fuse_targets {
						symbol
						name
					}
					action {
						name
						bonus_type
						bonus_amount
						initial_cooldown
						cooldown
						duration
						limit
						penalty {
							type
							amount
						}
						ability {
							type
							amount
							condition
						}
						charge_phases {
							charge_time
							bonus_amount
							ability_amount
							cooldown
							duration
						}
					}
					equipment_slots {
						level
						symbol
					}
					ship_battle {
						accuracy
						crit_bonus
						crit_chance
						evasion
					}
					unique_polestar_combos
					nicknames {
						cleverThing
						creator
					}
				}
			}
		}
	}
`;
