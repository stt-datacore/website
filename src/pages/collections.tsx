import React, { PureComponent } from 'react';
import { Item, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

type CollectionsPageProps = {};

type CollectionsPageState = {
	collections?: any;
	allcrew?: any;
};

class CollectionsPage extends PureComponent<CollectionsPageProps, CollectionsPageState> {
	state = { collections: undefined, allcrew: undefined };

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(allcrew => {
				fetch('/structured/collections.json')
					.then(response => response.json())
					.then(collections => {
						this.setState({ allcrew, collections });
					});
			});
	}

	render() {
		const { collections, allcrew } = this.state;
		if (!collections || collections.length === 0) {
			return (
				<Layout title='Collections'>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Layout title='Collections'>
				<Item.Group>
					{collections.map(collection => (
						<Item key={collection.name} id={encodeURIComponent(collection.name)}>
							<Item.Image size='medium' src={`${process.env.GATSBY_ASSETS_URL}${collection.image}`} />

							<Item.Content>
								<Item.Header>{collection.name}</Item.Header>
								<Item.Meta>
									<span dangerouslySetInnerHTML={{ __html: collection.description }} />
								</Item.Meta>
								<Item.Description>
									<b>Crew: </b>
									{collection.crew
										.map(crew => (
											<Link key={crew} to={`/crew/${crew}/`}>
												{allcrew.find(c => c.symbol === crew).name}
											</Link>
										))
										.reduce((prev, curr) => [prev, ', ', curr])}
								</Item.Description>
							</Item.Content>
						</Item>
					))}
				</Item.Group>
			</Layout>
		);
	}
}

export default CollectionsPage;
