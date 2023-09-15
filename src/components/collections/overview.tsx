import React, { PureComponent } from 'react';
import { Item, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../layout';
import { CrewMember } from '../../model/crew';
import { Collection } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import { formatColString } from '../item_presenters/crew_preparer';
import DataPageLayout from '../page/datapagelayout';
import CONFIG from '../CONFIG';

type CollectionsPageProps = {};

type CollectionsPageState = {
	collections?: Collection[];
	allcrew?: CrewMember[];
};

class CollectionsOverviewComponent extends PureComponent<CollectionsPageProps, CollectionsPageState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

	constructor(props: CollectionsPageProps) {
		super(props);
		this.state = { collections: undefined, allcrew: undefined };
	}

	componentDidMount() {
		if (this.context.core.ready(['crew', 'collections'])) {
			this.setState({ ... this.state, allcrew: this.context.core.crew, collections: this.context.core.collections });			
		}

		// fetch('/structured/crew.json')
		// 	.then(response => response.json())
		// 	.then(allcrew => {
		// 		fetch('/structured/collections.json')
		// 			.then(response => response.json())
		// 			.then(collections => {
		// 				this.setState({ allcrew, collections });
		// 			});
		// 	});
	}

	componentDidUpdate(prevProps: Readonly<CollectionsPageProps>, prevState: Readonly<CollectionsPageState>, snapshot?: any): void {
		
		if (!!this.state.collections && !!this.state.allcrew) return;

		if (this.context.core.ready(['crew', 'collections'])) {
			this.setState({ ... this.state, allcrew: this.context.core.crew, collections: this.context.core.collections });			
		}

	}

	render() {

		// if (!this.context.core.ready(['crew', 'collections'])) return this.context.core.spin();

		const { collections, allcrew } = this.state;

		if (!collections || collections.length === 0) {
			return this.context.core.spin ? this.context.core.spin() : <></>;
		}

		return (
			<Item.Group>
				{collections.map(collection => (
					<Item key={collection.name} id={encodeURIComponent(collection.name)} style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
						<Item.Image size='medium' className='ui segment' style={{border: "1px solid #7f7f7f7f", width:300, height: 150, borderRadius: "6px"}} src={`${process.env.GATSBY_ASSETS_URL}${collection.image}`} />

						<Item.Content>
							<Item.Header><div className='text'>{collection.name}</div><hr/></Item.Header>
							<Item.Meta>
								<div className='text'>
									{formatColString(collection.description ?? "", undefined, 'ui label')}
								</div>
							</Item.Meta>
							<Item.Description>
								<b>Crew: </b>
								{collection.crew?.map(crew => {
									const mapped = allcrew?.find(c => c.symbol === crew);
									return (
										<Link key={crew} to={`/crew/${crew}/`} style={{color: CONFIG.RARITIES[mapped?.max_rarity ?? 0].color}}>
											{mapped?.name}
										</Link>
									)
								})
									.reduce((prev, curr) => <>{prev}, {curr}</>)}
							</Item.Description>
						</Item.Content>
					</Item>
				))}
				<br/><br/><br/>
			</Item.Group>
		);
	}
}

export default CollectionsOverviewComponent;
