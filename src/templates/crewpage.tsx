import React, { Component } from 'react';
import { Container, Header, Image, Divider, Grid, Segment, Rating, Dropdown, Popup, Label, Button } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';
import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';
import CrewFullEquipTree from '../components/crewfullequiptree';
import CommonCrewData from '../components/commoncrewdata';
import CrewVariants from '../components/crewvariants';

import CONFIG from '../components/CONFIG';

type StaticCrewPageProps = {
	data: {
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
		};
		crewJson: any;
	};
};

type StaticCrewPageState = {
	selectedEquipment?: number;
	modalVisible: boolean;
	items: any[];
};

class StaticCrewPage extends Component<StaticCrewPageProps, StaticCrewPageState> {
	constructor(props) {
		super(props);

		this.state = {
			selectedEquipment: undefined,
			modalVisible: false,
			items: []
		};
	}

	componentDidMount() {
		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => this.setState({ items }));
	}

	render() {
		const { markdownRemark, crewJson } = this.props.data;
		if (crewJson.edges.length === 0) {
			return <span>Crew not found!</span>;
		}

		let hasBigBookEntry = markdownRemark && markdownRemark.frontmatter && markdownRemark.frontmatter.published;

		const crew = crewJson.edges[0].node;
		return (
			<Layout>
				<CrewFullEquipTree
					visible={this.state.modalVisible}
					items={this.state.items}
					crew={crew}
					onClosed={() => this.setState({ modalVisible: false })}
				/>
				<Container text style={{ paddingTop: '4em', paddingBottom: '2em', marginBottom: '2em' }}>
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
								<Image src={`/media/assets/${crew.imageUrlFullBody}`} size='small' />
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

									{this.renderChargePhases(crew.action.bonus_type, crew.action.charge_phases)}
								</Segment>
							</Grid.Column>
						</Grid.Row>
					</Grid>
					<Divider horizontal hidden />
					{hasBigBookEntry && <div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />}
					<Button
						floated='right'
						style={{ marginTop: '1em' }}
						onClick={() => window.open(`/admin/#/collections/crew/entries/${crew.symbol}`)}
						content='Edit big book content'
						icon='edit'
						labelPosition='right'
					/>
					<Divider horizontal hidden style={{ marginTop: '4em' }} />
					<CrewVariants short_name={crew.short_name} />
				</Container>
			</Layout>
		);
	}

	renderEquipment(crew) {
		let options = [];
		crew.equipment_slots.forEach(es => {
			let equipment = this.state.items.find(item => item.symbol === es.symbol);

			options.push({
				key: es.archetype + '_' + es.level,
				text: `${equipment.name} (level ${es.level})`,
				value: es.archetype,
				content: (
					<Header
						icon={
							<ItemDisplay src={`/media/assets/${equipment.imageUrl}`} size={48} maxRarity={equipment.rarity} rarity={equipment.rarity} />
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

		let es = crew.equipment_slots.find(es => es.archetype === this.state.selectedEquipment)
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
											<img src={`/media/assets/${recipeEntry.imageUrl}`} />x{entry.count}
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

	renderChargePhases(bonus_type, charge_phases) {
		if (!charge_phases) {
			return <span />;
		} else {
			let phases = [];
			let charge_time = 0;
			charge_phases.forEach((cp, idx) => {
				charge_time += cp.charge_time;
				let phaseDescription = `After ${charge_time}s, `;

				if (cp.ability_amount) {
					phaseDescription += `+${cp.ability_amount} ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[bonus_type]}`;
				}

				if (cp.bonus_amount) {
					phaseDescription += `+${cp.bonus_amount} to ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[bonus_type]}`;
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
		markdownRemark(fields: { slug: { eq: $slug } }) {
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
					traits_named
					traits_hidden
					collections
					max_rarity
					imageUrlFullBody
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
						archetype
						symbol
					}
					ship_battle {
						accuracy
						crit_bonus
						crit_chance
						evasion
					}
				}
			}
		}
	}
`;
