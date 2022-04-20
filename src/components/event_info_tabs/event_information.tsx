import React from 'react';
import { graphql, useStaticQuery } from 'gatsby';
import { Header, Card, Label, Image } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { getEventData } from '../../utils/events';
import CrewCard from './crew_card';

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

function EventInformationTab({ eventData }) {
	const { crewJson } = useStaticQuery(graphql`
		query {
			crewJson: allCrewJson {
				edges {
					node {
						name
						max_rarity
						imageUrlPortrait
						symbol
						traits
						traits_hidden
						traits_named
						base_skills {
							security_skill {
								core
							}
							command_skill {
								core
							}
							diplomacy_skill {
								core
							}
							engineering_skill {
								core
							}
							medicine_skill {
								core
							}
							science_skill {
								core
							}
						}
					}
				}
			}
		}
	`);
	const crewData = crewJson.edges.map(edge => edge.node);
	const crewMap = {};
	crewData.forEach(crew => {
		crewMap[crew.symbol] = crew;
	})

	const {
		name,
		description,
		bonus_text,
		content_types,
	} = eventData;

	const { bonus, featured } = getEventData(eventData, crewData);
	const featuredCrewData = featured.map(symbol => {
		const crew = crewMap[symbol];
		return {
			key: `crew_${crew.symbol}`,
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
			traits: crew.traits_named,
		};
	});
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
				<Label key={`crew_${crew.symbol}`} color="black" style={{ marginBottom: '5px' }}>
					<Image
						src={getIconPath({ file: crew.imageUrlPortrait })}
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
