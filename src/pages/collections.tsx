import React, { PureComponent } from 'react';
import { Item, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import { CrewMember } from '../model/crew';
import { Collection } from '../model/game-elements';

type CollectionsPageProps = {};

type CollectionsPageState = {
	collections?: Collection[];
	allcrew?: CrewMember[];
};

class CollectionsPage extends PureComponent<CollectionsPageProps, CollectionsPageState> {
	state: CollectionsPageState = { collections: undefined, allcrew: undefined };

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
		const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';

		const foreColor = theme === 'dark' ? 'white' : 'black';

		if (!collections || collections.length === 0) {
			return (
				<Layout title='Collections'>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Layout title='Collections'>				
				<div></div>
				<Item.Group>
					{collections.map(collection => (
						<Item key={collection.name} id={encodeURIComponent(collection.name)}>
							<Item.Image size='medium' src={`${process.env.GATSBY_ASSETS_URL}${collection.image}`} />

							<Item.Content>
								<Item.Header><div className='text'>{collection.name}</div><hr/></Item.Header>
								<Item.Meta>
									<div style={{color:foreColor}}>
										<span dangerouslySetInnerHTML={{ __html: collection.description ?? "" }} />
									</div>
								</Item.Meta>
								<Item.Description>
									<b>Crew: </b>
									{collection.crew?.map(crew => (
											<Link key={crew} to={`/crew/${crew}/`}>
												{allcrew?.find(c => c.symbol === crew)?.name}
											</Link>
										))
										.reduce((prev, curr) => <>{prev}, {curr}</>)}
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
