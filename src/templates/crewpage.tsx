import React, { Component } from 'react';
import { Helmet } from 'react-helmet';
import { Header, Image, Divider, Grid, Segment, Rating, Dropdown, Popup, Label, Button, Comment } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import SimpleMDE from 'react-simplemde-editor';
import marked from 'marked';

import Layout from '../components/layout';
import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';
import CrewFullEquipTree from '../components/crewfullequiptree';
import CommonCrewData from '../components/commoncrewdata';
import ExtraCrewDetails from '../components/extracrewdetails';

import CONFIG from '../components/CONFIG';

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

type StaticCrewPageState = {
	selectedEquipment?: number;
	modalVisible: boolean;
	commentMarkdown: string;
	items: any[];
	comments: any[];
};

class StaticCrewPage extends Component<StaticCrewPageProps, StaticCrewPageState> {
	constructor(props) {
		super(props);

		this.state = {
			selectedEquipment: undefined,
			modalVisible: false,
			commentMarkdown: '', // TODO: load
			comments: [],
			items: []
		};
	}

	componentDidMount() {
		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => this.setState({ items }));


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

	render() {
		const { location } = this.props;
		const { markdownRemark, crewJson, site: { siteMetadata } } = this.props.data;
		if (crewJson.edges.length === 0) {
			return <span>Crew not found!</span>;
		}

		const { comments } = this.state;

		let hasBigBookEntry = markdownRemark && markdownRemark.frontmatter && markdownRemark.frontmatter.published;

		const userName = this._getCurrentUsername();

		const crew = crewJson.edges[0].node;
		return (
			<Layout narrowLayout={true}>
				<Helmet titleTemplate={siteMetadata.titleTemplate} defaultTitle={siteMetadata.defaultTitle}>
					<title>{crew.name}</title>
					<meta property='og:type' content='website' />
					<meta property='og:title' content={`${crew.name} - ${siteMetadata.defaultTitle}`} />
					<meta property='og:site_name' content='DataCore' />
					<meta property='og:image' content={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
					<meta property='og:description' content={markdownRemark.rawMarkdownBody.trim() || siteMetadata.defaultDescription} />
					<meta property='og:url' content={`${siteMetadata.baseUrl}${location.pathname}`} />
				</Helmet>
				<CrewFullEquipTree
					visible={this.state.modalVisible}
					items={this.state.items}
					crew={crew}
					onClosed={() => this.setState({ modalVisible: false })}
				/>
				<Grid columns={2}>
					<Grid.Row stretched>
						<Grid.Column width={16}>
							<Header>
								{crew.name} <Rating defaultRating={crew.max_rarity} maxRating={5} icon='star' size='large' disabled />
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

							{this.state.items.length > 0 ? (
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
								<Header as='h4'>{crew.action.name}</Header>
								<p>
									Boosts {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]} by {crew.action.bonus_amount}
								</p>
								<p>
									Initialize: {crew.action.initial_cooldown}s, Cooldown: {crew.action.cooldown}s, Duration: {crew.action.duration}s
									</p>
								{crew.action.limit && <p>Uses Per Battle: {crew.action.limit}</p>}

								{crew.action.ability && (
									<p>
										Bonus ability:
										{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', crew.action.ability.amount)}{' '}
										{crew.action.ability.condition > 0 && (
											<span>Trigger: {CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</span>
										)}
									</p>
								)}

								<p>
									<b>Accuracy:</b> +{crew.ship_battle.accuracy} <b>Crit Bonus:</b> +{crew.ship_battle.crit_bonus}{' '}
									{crew.ship_battle.crit_chance && (
										<span>
											<b>Crit Rating:</b> +{crew.ship_battle.crit_chance}{' '}
										</span>
									)}
									<b>Evasion:</b> +{crew.ship_battle.evasion}
								</p>
								{crew.action.penalty && (
									<p>
										Decrease {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type]} by {crew.action.penalty.amount}
									</p>
								)}

								{this.renderChargePhases(crew.action, crew.action.charge_phases)}
							</Segment>
						</Grid.Column>
					</Grid.Row>
				</Grid>
				<Divider horizontal hidden />
				{hasBigBookEntry && <div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />}
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
			</Layout>
		);
	}

	_handleMarkDownChange(value) {
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

	renderEquipment(crew) {
		let options = [];
		crew.equipment_slots.forEach(es => {
			let equipment = this.state.items.find(item => item.symbol === es.symbol);

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
				onChange={(ev, { value }) => this.setState({ selectedEquipment: value as number })}
			/>
		);
	}

	renderEquipmentDetails(crew) {
		if (!this.state.selectedEquipment) {
			return <span />;
		}

		let es = crew.equipment_slots.find(es => es.symbol === this.state.selectedEquipment);
		let equipment = this.state.items.find(item => item.symbol === es.symbol);
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
						let recipeEntry = this.state.items.find(item => item.symbol === entry.symbol);
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

	renderChargePhases(action, charge_phases) {
		if (!charge_phases) {
			return <span />;
		} else {
			let phases = [];
			let charge_time = 0;
			charge_phases.forEach((cp, idx) => {
				charge_time += cp.charge_time;
				let phaseDescription = `After ${charge_time}s, `;

				if (cp.ability_amount) {
					phaseDescription += CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[action.ability.type].replace('%VAL%', cp.ability_amount);
				}

				if (cp.bonus_amount) {
					phaseDescription += `+${cp.bonus_amount} to ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type]}`;
				}

				if (cp.duration) {
					phaseDescription += `, +${cp.duration}s duration`;
				}

				if (cp.cooldown) {
					phaseDescription += `, +${cp.cooldown}s cooldown`;
				}

				phases.push(<p key={idx}>{phaseDescription}</p>);
			});

			return (
				<div>
					<h4>Charge phases</h4>
					<div>{phases}</div>
				</div>
			);
		}
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
