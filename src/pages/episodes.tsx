import React, { PureComponent } from 'react';
import { Container, Item } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';

import Layout from '../components/layout';

import { getEpisodeName } from '../utils/episodes';

class EpisodesPage extends PureComponent {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allEpisodesJson {
							edges {
								node {
									name
									description
									cadet
									episode_title
									episode
									total_stars
									episode_portrait {
										file
									}
									fields {
										slug
									}
								}
							}
						}
					}
				`}
				render={data => (
					<Layout>
						<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
							<Item.Group>
								{data.allEpisodesJson.edges.map(({ node }, index) => (
									<Item key={index}>
										<Item.Image
											size="tiny"
											src={`${process.env.GATSBY_ASSETS_URL}${
												node.episode_portrait
													? node.episode_portrait.file.substr(1).replace('/', '_') + '.png'
													: 'crew_full_body_cm_empty_full.png'
											}`}
										/>

										<Item.Content>
											<Item.Header as="a" onClick={() => navigate(`/episode${node.fields.slug}`)}>
												{getEpisodeName(node)}
											</Item.Header>
                                            <Item.Meta>Total stars: {node.total_stars}</Item.Meta>
											<Item.Description>
												<p>{node.description}</p>
											</Item.Description>
										</Item.Content>
									</Item>
								))}
							</Item.Group>
						</Container>
					</Layout>
				)}
			/>
		);
	}
}

export default EpisodesPage;
