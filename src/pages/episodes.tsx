import React, { PureComponent } from 'react';
import { Item } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';

import { getEpisodeName } from '../utils/episodes';
import DataPageLayout from '../components/page/datapagelayout';

class EpisodesPage extends PureComponent {
	render() {
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';

		const foreColor = theme === 'dark' ? 'white' : 'black';
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
					<DataPageLayout pageTitle='Episodes'>
						<Item.Group>
							{data.allEpisodesJson.edges.map(({ node }, index) => (
								<Item key={index}>
									<Item.Image
										size="tiny"
										src={`${process.env.GATSBY_ASSETS_URL}${node.episode_portrait
												? node.episode_portrait.file.slice(1).replace('/', '_') + '.png'
												: 'crew_full_body_cm_empty_full.png'
											}`}
									/>

									<Item.Content>
										<Item.Header as="a" onClick={() => navigate(`/episode${node.fields.slug}`)}>
											{getEpisodeName(node)}
										</Item.Header>
										<Item.Meta><span style={{color:foreColor}}>Total stars: {node.total_stars}</span></Item.Meta>
										<Item.Description>
											<p>{node.description}</p>
										</Item.Description>
									</Item.Content>
								</Item>
							))}
						</Item.Group>
					</DataPageLayout>
				)}
			/>
		);
	}
}

export default EpisodesPage;
