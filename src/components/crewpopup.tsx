import React, { Component } from 'react';
import { Popup, Rating, Image } from 'semantic-ui-react';
import { formatCrewStats } from '../utils/voyageutils';

type CrewPopupProps = {
	crew: any;
	useBase?: boolean;
};

class CrewPopup extends Component<CrewPopupProps> {
	render() {
		const { crew, useBase } = this.props;
		//console.log(crew);
		if (!crew || !crew.symbol) {
			return <span>ERROR!</span>;
		}

		return (
			<Popup trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{crew.name}</span>}>
				<Popup.Header>{crew.name}</Popup.Header>
				<Popup.Content>
					<Image size='small' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
					<Rating icon='star' defaultRating={crew.rarity} maxRating={crew.max_rarity} />
					<p>{formatCrewStats(crew, useBase ?? true)}</p>
				</Popup.Content>
			</Popup>
		);
	}
}

export default CrewPopup;
