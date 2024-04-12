import React from 'react';
import { navigate } from 'gatsby';
import { Item } from 'semantic-ui-react';

import { Mission } from '../model/missions';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { getEpisodeName } from '../utils/episodes';

const EpisodesPage = () => {
	const globalContext = React.useContext(GlobalContext);

	const theme = typeof window === 'undefined' ? 'dark' : window.localStorage.getItem('theme') ?? 'dark';
	const foreColor = theme === 'dark' ? 'white' : 'black';

	return (
		<DataPageLayout
			demands={['episodes']}
			pageTitle='Episodes'
		>
			<React.Fragment>
				<Item.Group>
					{globalContext.core.episodes.sort(sortEpisodes).map(episode => (
						<Item key={episode.symbol}>
							<Item.Image
								size="tiny"
								src={`${process.env.GATSBY_ASSETS_URL}${episode.episode_portrait
										? episode.episode_portrait.file.slice(1).replace('/', '_') + '.png'
										: 'crew_full_body_cm_empty_full.png'
									}`}
							/>

							<Item.Content>
								<Item.Header as="a" onClick={() => navigate(`/episode/${episode.symbol}`)}>
									{getEpisodeName(episode)}
								</Item.Header>
								<Item.Meta><span style={{color:foreColor}}>Total stars: {episode.total_stars}</span></Item.Meta>
								<Item.Description>
									<p>{episode.description}</p>
								</Item.Description>
							</Item.Content>
						</Item>
					))}
				</Item.Group>
			</React.Fragment>
		</DataPageLayout>
	);

	function sortEpisodes(a: Mission, b: Mission): number {
		if (a.episode === b.episode) {
			if (a.cadet && !b.cadet)
				return 1;
			else if (!a.cadet && b.cadet)
				return -1;
			return a.id - b.id;
		}
		if (a.episode > 0 && b.episode === -1)
			return -1;
		else if (a.episode === -1 && b.episode > 0)
			return 1;
		return a.episode - b.episode;
	}
};

export default EpisodesPage;
