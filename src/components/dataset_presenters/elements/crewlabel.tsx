import React from 'react';

import { PlayerCrew } from '../../../model/player';
import ItemDisplay from '../../itemdisplay';

type CrewLabelProps = {
	crew: PlayerCrew;
};

export const CrewLabel = (props: CrewLabelProps) => {
	const { crew } = props;
	const imageUrlPortrait: string = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
	return (
		<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
			<ItemDisplay
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={32}
				maxRarity={crew.max_rarity}
				rarity={crew.rarity}
			/>
			<span style={{ padding: '0 .5em' }}>{crew.name}</span>
		</div>
	);
};
