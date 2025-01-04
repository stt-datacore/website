import React from 'react';
import {
	Image,
	Rating
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';

type CrewPortraitProps = {
	crew: PlayerCrew;
};

export const CrewPortrait = (props: CrewPortraitProps) => {
	const { crew } = props;
	const imageUrlPortrait: string = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
	return (
		<React.Fragment>
			<Image>
				<div>
					<img src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`} width='72px' height='72px' />
				</div>
			</Image>
			<div>{crew.name}</div>
			<div><Rating defaultRating={crew.rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
		</React.Fragment>
	);
};
