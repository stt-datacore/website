import React, { Component } from 'react';
import { Popup, Rating, Image } from 'semantic-ui-react';
import { StaticQuery, graphql } from 'gatsby';
import { formatCrewStats } from '../utils/voyageutils';

type CrewPopupProps = {
	crew: any;
};

class CrewPopup extends Component<CrewPopupProps> {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allCrewJson {
							edges {
								node {
									name
									symbol
									imageUrlPortrait
								}
							}
						}
					}
				`}
				render={data => {
					const { crew } = this.props;
					let crewStatic = data.allCrewJson.edges.find(({ node }) => node.symbol === crew.symbol).node;

					let content = <span style={{ cursor: 'help', fontWeight: 'bolder' }}>{crew.name}</span>;

					return (
						<Popup trigger={content}>
							<Popup.Header>{crew.name}</Popup.Header>
							<Popup.Content>
								<Image size='small' src={`/media/assets/${crewStatic.imageUrlPortrait}`} />
								<Rating icon='star' defaultRating={crew.rarity} maxRating={crew.max_rarity} />
								<p>{formatCrewStats(crew)}</p>
							</Popup.Content>
						</Popup>
					);
				}}
			/>
		);
	}
}

export default CrewPopup;
