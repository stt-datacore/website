import React, { Component } from 'react';
import { Container, Item } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';

type StaticCollectionPageProps = {
	data: {
		allCollectionsJson: any;
	};
};

class StaticCollectionPage extends Component<StaticCollectionPageProps> {
	constructor(props) {
		super(props);
	}

	render() {
		const { allCollectionsJson } = this.props.data;
		if (allCollectionsJson.edges.length === 0) {
			return <span>Collection not found!</span>;
		}

		const collection = allCollectionsJson.edges[0].node;
		return (
			<Layout>
				<Container text style={{ marginTop: '7em', marginBottom: '2em' }}>
					<Item.Group>
						<Item>
							<Item.Image size='medium' src={`/media/assets/${collection.image}`} />

							<Item.Content>
								<Item.Header>{collection.name}</Item.Header>
								<Item.Meta>
									<span dangerouslySetInnerHTML={{ __html: collection.description }} />
								</Item.Meta>
								<Item.Description>
									<b>Crew: </b>
									{collection.crew ? collection.crew.map(c => c.name).join(', ') : 'ERROR'}
								</Item.Description>
							</Item.Content>
						</Item>
					</Item.Group>
                    <p>TODO: more details here (like rewards)</p>
				</Container>
			</Layout>
		);
	}
}

export default StaticCollectionPage;

export const query = graphql`
	query($id: String!) {
		allCollectionsJson(filter: { id: { eq: $id } }) {
			edges {
				node {
					name
                    description
                    crew {
                        name
                    }
					image
				}
			}
		}
	}
`;
