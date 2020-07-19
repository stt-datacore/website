import React from 'react';
import { graphql, useStaticQuery } from 'gatsby';
import { Header, Card, Label, Image } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { getEventData } from '../../utils/events';
import CrewCard from './crew_card';

type Content = {
	content_type: string,
};

const contentTypeMap = {
	gather: 'Galaxy',
	shuttles: 'Faction',
	skirmish: 'Skirmish',
	expedition: 'Expedition',
};

function getEventType(contentTypes: string[]) {
	const mappedTypes = contentTypes.map(type => contentTypeMap[type]);
	const items = new Set(mappedTypes);
	return [...items].join(' / ');
}

function sortCrew(crewArray) {
	let groups = [
		[],
		[], // common
		[], // uncommon
		[], // rare
		[], // very rare
		[]  // legendary
	];
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

function EventInformationTab({eventData}) {
	const {crewJson} = useStaticQuery(graphql`
		query {
			crewJson: allCrewJson {
				edges {
					node {
						name
						symbol
						max_rarity
						imageUrlPortrait
					}
				}
			}
		}
	`);
	const crewData = crewJson.edges.map(edge => edge.node);

	const {
		name,
		description,
		bonus_text,
		content_types,
		featured_crew
	} = eventData;

	const featuredCrewData = featured_crew.map(crew => ({
		key: `crew_${crew.id}`,
		name: crew.full_name,
		image: getIconPath(crew.portrait),
		rarity: crew.rarity,
		skills: Object.keys(crew.skills).map(skill => ({
			key: skill,
			imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`
		})),
		traits: crew.traits.map(trait => `${trait[0].toUpperCase()}${trait.substr(1).replace(/_/g, ' ')}`),
	}));

	const {bonus, featured} = getEventData(eventData);
	const bonusCrew = crewData.filter(crew => bonus.includes(crew.symbol) && !featured.includes(crew.symbol));

	return (
		<>
			<Card fluid raised>
				<Card.Content>
					<Card.Header>{name}</Card.Header>
					<Card.Meta>{getEventType(content_types)}</Card.Meta>
					<Card.Description>{description}</Card.Description>
				</Card.Content>
				<Card.Content extra>
					<p>{bonus_text}</p>
				</Card.Content>
			</Card>
			<Header as="h3">Featured Crew</Header>
			<Card.Group>
				{featuredCrewData.map(crew => (
					<CrewCard key={crew.key} crew={crew} />
				))}
			</Card.Group>
			<Header as="h3">Bonus Crew</Header>
			{bonusCrew.length === 0 && (
				<p>Bonus crew not yet determined for this event.</p>
			)}
			{sortCrew(bonusCrew).map(crew => (
				<Label key={`crew_${crew.symbol}`} color="black" style={{marginBottom: '5px'}}>
					<Image
						src={getIconPath({file: crew.imageUrlPortrait})}
						size="massive"
						inline
						spaced="right"
						bordered
						style={{
							borderColor: getRarityColor(crew.max_rarity)
						}}
						alt={crew.name}
					/>
					{crew.name}
				</Label>
			))}
		</>
	);
}

export default EventInformationTab;
