import React from 'react';

import { ShuttleSeat } from './shuttleutils';

import ItemDisplay from '../../components/itemdisplay';
import allFactions from '../../../static/structured/factions.json';
import { MergedContext } from '../../context/mergedcontext';
import { PlayerCrew } from '../../model/player';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';

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

export const SeatCrewView = (props: { crew: PlayerCrew }) => {
	const { crew } = props;
	// const context = React.useContext(MergedContext);
	const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
	return (
		<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'center' : undefined }}>
			<ItemDisplay
				// itemSymbol={crew.symbol}
				// allCrew={context.allCrew}
				// allItems={context.items}
				// playerData={context.playerData}
				// targetGroup='eventTarget'
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={32}
				maxRarity={crew.max_rarity}
				rarity={crew.rarity}
			/>
			<span style={{ padding: '0 .5em' }}>{crew.name}</span>
		</div>
	);
};