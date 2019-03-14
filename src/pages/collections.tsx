import React, { Component } from 'react';
import { Container, Item } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';

type CollectionsPageProps = {
	data: {
		allCollectionsJson: any;
	};
};

class CollectionsPage extends Component<CollectionsPageProps> {
	constructor(props) {
		super(props);
	}

	render() {
		const { allCollectionsJson } = this.props.data;
		if (allCollectionsJson.edges.length === 0) {
			return <span>Collection not found!</span>;
		}

		return (
			<Layout>
				<Container style={{ marginTop: '7em', marginBottom: '2em' }}>
					<Item.Group>
						{allCollectionsJson.edges.map(edge => {
							const collection = edge.node;
							return (
								<Item key={collection.name}>
									<Item.Image size='medium' src={`/media/assets/${collection.image}`} />

									<Item.Content>
										<Item.Header>{collection.name}</Item.Header>
                                        <Item.Meta><span dangerouslySetInnerHTML={{ __html: collection.description }} /></Item.Meta>
										<Item.Description>
												<b>Crew: </b>
												{collection.crew ? collection.crew.map(c => c.name).join(', ') : 'ERROR'}
										</Item.Description>
									</Item.Content>
								</Item>
							);
						})}
					</Item.Group>
				</Container>
			</Layout>
		);
	}
}

export default CollectionsPage;

export const query = graphql`
	query {
		allCollectionsJson {
			edges {
				node {
					name
					crew {
						name
					}
					description
					image
				}
			}
		}
	}
`;
