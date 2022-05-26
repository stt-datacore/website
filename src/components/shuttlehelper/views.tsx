import React from 'react';

import { ShuttleSeat } from './shuttleutils';

import ItemDisplay from '../../components/itemdisplay';
import allFactions from '../../../static/structured/factions.json';

export const ShuttleFactionView = (props: { factionId: number, size: number }) => {
	const faction = allFactions.find(af => af.id === props.factionId);
	if (!faction) return (<></>);
	return (<img alt={faction.name} src={`${process.env.GATSBY_ASSETS_URL}${faction.icon}`} style={{ height: `${props.size}em` }} />);
};

export const SeatSkillView = (props: { seat: ShuttleSeat }) => {
	const { seat } = props;
	if (!seat.skillA) return (<></>);
	return (
		<span style={{ whiteSpace: 'nowrap' }}>
			<img alt={seat.skillA} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skillA}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
			{seat.skillB && (
				<React.Fragment>
					<span style={{ padding: '0 .3em' }}>{seat.operand}</span>
					<img alt={seat.skillB} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skillB}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
				</React.Fragment>
			)}
		</span>
	);
};

export const SeatCrewView = (props: { crew: any }) => {
	const { crew } = props;
	const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
	return (
		<React.Fragment>
			<ItemDisplay
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={32}
				maxRarity={crew.max_rarity}
				rarity={crew.rarity}
				style={{ verticalAlign: 'middle' }}
			/>
			<span style={{ padding: '0 .5em' }}>{crew.name}</span>
		</React.Fragment>
	);
};