import React from 'react';
import { Header, Card, Label, Image, Message } from 'semantic-ui-react';
import { GameEvent, TranslateMethod } from '../../model/player';
import { getIconPath, getRarityColor } from '../../utils/assets';
import { getEventData } from '../../utils/events';
import CrewCard, { CrewCardBrief } from './crew_card';
import { PlayerCrew } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import { CrewTarget } from '../hovering/crewhoverstat';

const contentTypeMap = {
	gather: 'Galaxy',
	shuttles: 'Faction',
	skirmish: 'Skirmish',
	expedition: 'Expedition',
	voyage: 'Voyage'
};

function getEventType(contentTypes: string[], t?: TranslateMethod) {
	const mappedTypes = contentTypes.map(type => t ? t(`event_type.${type}`) : contentTypeMap[type]);
	const items = new Set(mappedTypes);
	return [...items].join(' / ');
}

function sortCrew(crewArray: PlayerCrew[]) {
	let groups = [
		[],
		[], // common
		[], // uncommon
		[], // rare
		[], // very rare
		[]  // legendary
	] as PlayerCrew[][];
	// organize each crew into rarity buckets
	crewArray.forEach(crew => {
		groups[crew.max_rarity].push(crew);
	});
	// sort by name
	groups = groups.map(group => group.sort((a, b) => a.name < b.name ? -1 : 1));
	// reverse the list so legendary is first
	groups.reverse();
	// flatten the array of arrays
	return groups.flat();
}

function EventInformationTab(props: { eventData: GameEvent, lastEvent?: GameEvent }) {
	const { eventData, lastEvent } = props;
	const context = React.useContext(GlobalContext);
	const { t, TRAIT_NAMES } = context.localized;

	const { crew: allCrew } = context.core;

	const allShips = context.core.ship_schematics.map(m => m.ship);

	const crewData = allCrew; // crewJson.edges.map(edge => edge.node) as PlayerCrew[];
	const crewMap: { [key: string]: PlayerCrew } = {};
	crewData.forEach(crew => {
		crewMap[crew.symbol] = crew as PlayerCrew;
	})

	const {
		name,
		description,
		bonus_text,
		content_types,
	} = eventData;

	const currEvent = getEventData(eventData, crewData, allShips, lastEvent);

	const bonus = currEvent?.bonus;
	const featured = currEvent?.featured;

	const featuredCrewData = featured?.map(symbol => {
		const crew = crewMap[symbol];
		return {
			key: `crew_${crew.symbol}`,
			symbol: crew.symbol,
			name: crew.name,
			image: getIconPath({file: crew.imageUrlPortrait}),
			rarity: crew.max_rarity,
			skills: Object.keys(crew.base_skills)
				.filter(skill => !!crew.base_skills[skill])
				.sort((a, b) => crew.base_skills[a].core > crew.base_skills[b].core ? -1 : 1)
				.map(skill => ({
					key: skill,
					imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`
				})),
			traits: crew.traits.map(t => TRAIT_NAMES[t]),
		} as CrewCardBrief;
	});
	const bonusCrew = crewData.filter(crew => bonus?.includes(crew.symbol) && !featured?.includes(crew.symbol));

	return (
		<>
			<Card fluid raised>
				<Card.Content>
					<Card.Header>{name}</Card.Header>
					<Card.Meta>{getEventType(content_types, t)}</Card.Meta>
					<Card.Description>{description}</Card.Description>
				</Card.Content>
				<Card.Content extra>
					<p>{bonus_text}</p>
					{content_types.includes('skirmish') && currEvent?.bonusGuessed &&
						<Message warning>{t('events_common.skirmish_guess_warning')}</Message>}
				</Card.Content>
			</Card>
			<Header as="h3">{t('event_info.featured_crew')}</Header>
			<Card.Group>
				{featuredCrewData?.map(crew => (
					<CrewCard key={crew.key} crew={crew} sysCrew={crewMap[crew.symbol]} />
				))}
			</Card.Group>
			<Header as="h3">{t('event_info.bonus_crew')}</Header>
			{bonusCrew.length === 0 && (
				<p>{t('event_info.bonus_crew_not_determined')}</p>
			)}
			{sortCrew(bonusCrew as PlayerCrew[]).map(crew => (
				<Label key={`crew_${crew.symbol}`} color="black" style={{ marginBottom: '5px' }}>
					<CrewTarget targetGroup='event_info' inputItem={crewMap[crew.symbol]}>
					<Image
						src={getIconPath({ file: crew.imageUrlPortrait })}
						inline
						spaced="right"
						bordered
						style={{
							height: "48px",
							borderColor: getRarityColor(crew.max_rarity)
						}}
						alt={crew.name}
					/>
					</CrewTarget>
					{crew.name}
				</Label>
			))}
		</>
	);
}

export default EventInformationTab;
