import React, { PureComponent } from 'react';
import { Item, Image, Grid, Popup } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';

import Layout from '../components/layout';

import { getEpisodeName } from '../utils/episodes';
import { trait_names } from '../../static/structured/translation_en.json';
import CONFIG from '../components/CONFIG';

const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

class GauntletsPage extends PureComponent {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allGauntletsJson {
							edges {
								node {
									gauntlet_id
									date
									jackpot_crew
									contest_data {
										featured_skill
										traits
									}
								}
							}
						}
						allCrewJson {
							edges {
								node {
									symbol
									name
									traits_named
									imageUrlPortrait
									max_rarity
									ranks {
										gauntletRank
									}
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
							}
						}
					}
				`}
				render={data => (
					<Layout title='Gauntlets'>
						<Item.Group divided>
							{data.allGauntletsJson.edges.sort((a, b) => Date.parse(b.node.date) - Date.parse(a.node.date)).map(({ node }, index) => {
								const prettyDate = new Date(node.date).toDateString();
								const prettyTraits = node.contest_data.traits.map(t => trait_names[t]);
								const matchedCrew = data.allCrewJson.edges.filter(e => e.node.max_rarity > 3 && prettyTraits.filter(t => e.node.traits_named.includes(t)).length > 1).sort((a, b) => (prettyTraits.filter(t => b.node.traits_named.includes(t)).length - prettyTraits.filter(t => a.node.traits_named.includes(t)).length));
								return (
								<Item key={index}>
									<Item.Content>
										<Item.Header>
											{node.contest_data.traits.map(t => trait_names[t]).join("/")}/{SKILLS[node.contest_data.featured_skill]}
										</Item.Header>
										<Item.Meta style={{color: 'white'}}>{prettyDate}</Item.Meta>
										<Item.Description>
											<Grid stackable>
											{matchedCrew.map(({ node: crew }) => (
													<Grid.Column width={1} style={{textAlign: 'center'}}>
														<a href={`/crew/${crew.symbol}`}>
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
												</a>
												{prettyTraits.filter(t => crew.traits_named.includes(t)).length == 3 ? '65%' : '45%'}
												<br />
												{crew.base_skills[node.contest_data.featured_skill] ? <img style={{width: '1em'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${node.contest_data.featured_skill}.png`} /> : ''}
												</Grid.Column>
											))}
											</Grid>
										</Item.Description>
									</Item.Content>
								</Item>
							)
								})}
						</Item.Group>
					</Layout>
				)}
			/>
		);
	}
}

export default GauntletsPage;
