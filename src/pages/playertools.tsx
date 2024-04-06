import React from 'react';
import { navigate } from 'gatsby';
import { Card, Image } from 'semantic-ui-react';

import DataPageLayout from '../components/page/datapagelayout';

interface IToolPage {
	optionKey: string;
	src: string;
	title: string;
	link: string;
	sidebarRole: 'item';
};

// Reusing pages/tools data from navigation
const toolPages: IToolPage[] = [
	{ optionKey: 'behold', src: '/media/portal.png',title: "Behold Helper", link: "/behold", sidebarRole: 'item' },	// Behold available at launch
	{ optionKey: 'faction', title: "Factions", src: '/media/faction.png', link: "/factions", sidebarRole: 'item' },	// Factions available at launch
	// { optionKey: 'fleet', title: "Fleet", src: '/media/fleet_icon.png', link: "/fleet", sidebarRole: 'item' },	// Factions available at launch
	{ optionKey: 'event', src: '/media/event.png', title: "Event Planner", link: "/eventplanner", sidebarRole: 'item' },	// Events added post-launch
	{ optionKey: 'gauntlet', src: '/media/gauntlet.png', title: "Gauntlet", link: "/gauntlets", sidebarRole: 'item' },	// Gauntlet added v1.7
	{ optionKey: 'cite', src: `${process.env.GATSBY_ASSETS_URL}/atlas/star_reward.png`, title: "Citation Optimizer", link: "/cite-opt", sidebarRole: 'item' },	// Citations added 1.9
	{ optionKey: 'voyage', src: "/media/voyage.png", title: "Voyage Calculator", link: "/voyage", sidebarRole: 'item' },	// Voyages added v3
	{ optionKey: 'voyhist', src: "/media/voyagehist.png", title: "Voyage History", link: "/voyagehistory", sidebarRole: 'item' },	// Voyages added v3
	{ optionKey: 'collection', src: '/media/vault.png', title: "Collection Planner", link: "/collections", sidebarRole: 'item' },	// Collections added v4
	{ optionKey: 'retrieval', src: '/media/retrieval.png', title: "Crew Retrieval", link: "/retrieval", sidebarRole: 'item' },	// Crew retrieval added v8
	{ optionKey: 'fbb', src: '/media/fbb.png', title: "Fleet Boss Battles", link: "/fbb", sidebarRole: 'item' },	// Fleet boss battles added v9
	{ optionKey: 'continuum', src: '/media/continuum.png', title: "Continuum Helper", link: "/continuum", sidebarRole: 'item' },	// Continuum missions added v10
];

const PlayerToolsPage = () => {
	return (
		<DataPageLayout
			pageTitle='Player Tools'
			playerPromptType='none'
		>
			<React.Fragment>
				<p>DataCore's player tools have moved, so please note the new addresses and update your bookmarks as needed.</p>
				<Card.Group>
					{toolPages.sort((a, b) => a.title.localeCompare(b.title)).map(page => (
						<Card key={page.optionKey}>
							<Card.Content onClick={() => navigate(page.link)} style={{ cursor: 'pointer' }}>
								<Image floated='right' size='mini' src={page.src} />
								<Card.Header>
									{page.title}
								</Card.Header>
								<Card.Meta>
									https://datacore.app{page.link}
								</Card.Meta>
							</Card.Content>
						</Card>
					))}
				</Card.Group>
			</React.Fragment>
		</DataPageLayout>
	);
};

export default PlayerToolsPage;
