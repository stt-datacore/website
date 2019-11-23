import React, { Component } from 'react';
import { Popup, Rating, Image } from 'semantic-ui-react';
import { formatCrewStats } from '../utils/voyageutils';

type CrewPopupProps = {
	crew: any;
};

class CrewPopup extends Component<CrewPopupProps> {
	render() {
		const { crew } = this.props;
		if (!crew || !crew.symbol) {
			return <span>ERROR!</span>;
		}

		return (
			<Popup trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{crew.name}</span>}>
				<Popup.Header>{crew.name}</Popup.Header>
				<Popup.Content>
					<Image size='small' src={`/media/assets/${crew.imageUrlPortrait}`} />
					<Rating icon='star' defaultRating={crew.rarity} maxRating={crew.max_rarity} />
					<p>{formatCrewStats(crew, true)}</p>
				</Popup.Content>
			</Popup>
		);
	}
}

export default CrewPopup;
