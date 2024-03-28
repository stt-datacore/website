import React, { Component } from 'react';
import { Header, Item, Comment } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import { getEpisodeName } from '../utils/episodes';

import CONFIG from '../components/CONFIG';
import DataPageLayout from '../components/page/datapagelayout';

type StaticEpisodePageProps = {
	data: {
		allEpisodesJson: any;
	};
};

function imageFileUrl(img: any) {
	return img.file.slice(1).replace('/', '_') + '.png';
}

class StaticEpisodePage extends Component<StaticEpisodePageProps> {
	constructor(props) {
		super(props);
	}

	_questType(qtype: string) {
		if (qtype === 'ConflictQuest') {
			return 'Away mission';
		} else if (qtype === 'ShipBattleQuest') {
			return 'Ship battle';
		} else {
			return 'Narrative';
		}
	}

	_getImageUrl(quest: any) {
		if (quest.timeline_icon) return imageFileUrl(quest.timeline_icon);

		if (quest.mastery_levels && quest.mastery_levels.length > 0 && quest.mastery_levels[0].opponent) {
			return imageFileUrl(quest.mastery_levels[0].opponent.ship_icon);
		}

		if (quest.notifier_icon) {
			return imageFileUrl(quest.notifier_icon);
		}

		return 'empty.png';
	}

	_htmlDecode(input) {
		input = input.replace(/<#([0-9A-F]{6})>/gi, '<span style="color:#$1">');
		input = input.replace(/<\/color>/g, '</span>');

		return {
			__html: input
		};
	}

	renderQuestDescription(quest) {
		let screens = <span />;
		if (quest.quest_type === 'NarrativeQuest' && quest.screens) {
			screens = (
				<Comment.Group threaded>
					<Header as='h4' dividing>
						Screens
					</Header>
					{quest.screens.map((screen, idx) => (
						<Comment key={idx}>
							<Comment.Avatar src={`${process.env.GATSBY_ASSETS_URL}${imageFileUrl(screen.speaker_image)}`} />
							<Comment.Content>
								<Comment.Author as='a'>{screen.speaker_name}</Comment.Author>
								<Comment.Text>
									<p>{screen.text}</p>
									<ul>
										{screen.responses.map((resp, idx) => (
											<li key={idx}>
												<b>{resp.paraphrase}</b> - {resp.text}
											</li>
										))}
									</ul>
								</Comment.Text>
							</Comment.Content>
						</Comment>
					))}
				</Comment.Group>
			);
		}

		if (quest.quest_type === 'ShipBattleQuest') {
			screens = (
				<div>
					{quest.mastery_levels.map(ml => (
						<div key={ml.id}>
							<span style={{ display: 'inline-block' }}>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/${CONFIG.MASTERY_LEVELS[ml.id].imageUrl}.png`} height={14} />
							</span>
							<span>
								{'  ' + CONFIG.MASTERY_LEVELS[ml.id].name} mastery - {ml.energy_cost}{' '}
								<span style={{ display: 'inline-block' }}>
									<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
								</span>
							</span>
							{ml.opponent && (
								<span>
									{'   '}Opponent: {ml.opponent.name} ({ml.opponent.ship_name})
								</span>
							)}
						</div>
					))}
				</div>
			);
		}

		if (quest.quest_type === 'ConflictQuest') {
			let cadet = <span />;
			if (quest.crew_requirement) {
				cadet = (
					<div>
						Cadet requirements: <span dangerouslySetInnerHTML={this._htmlDecode(quest.crew_requirement.description)} />
					</div>
				);
			}

			screens = (
				<div>
					{cadet}
					<ul>
						{quest.stages.map(stage => (
							<li key={stage.grid_x}>{stage.text}</li>
						))}
					</ul>
				</div>
			);
		}

		return (
			<div>
				{quest.description && <p>{quest.description}</p>}
				{quest.intro && (
					<Comment.Group>
						<Comment>
							<Comment.Avatar src={`${process.env.GATSBY_ASSETS_URL}${imageFileUrl(quest.intro.portrait)}`} />
							<Comment.Content>
								<Comment.Author as='a'>{quest.intro.speaker_name}</Comment.Author>
								<Comment.Text>
									<p>{quest.intro.text}</p>
									<ul>
										<li>{quest.intro.response}</li>
									</ul>
								</Comment.Text>
							</Comment.Content>
						</Comment>
					</Comment.Group>
				)}
				{screens}
			</div>
		);
	}

	render() {
		const { allEpisodesJson } = this.props.data;
		if (allEpisodesJson.edges.length === 0) {
			return <span>Episode not found!</span>;
		}

		const episode = allEpisodesJson.edges[0].node;
		return (
			<DataPageLayout pageTitle={getEpisodeName(episode)}>
				<React.Fragment>
				<p dangerouslySetInnerHTML={{ __html: episode.description }} />

				<Item.Group divided>
					{episode.quests.map((c, idx) => (
						<Item key={idx}>
							<Item.Image size='small' src={`${process.env.GATSBY_ASSETS_URL}${this._getImageUrl(c)}`} />

							<Item.Content>
								<Item.Header as='a'>{c.name}</Item.Header>
								<Item.Description>{this.renderQuestDescription(c)}</Item.Description>
								<Item.Extra>{this._questType(c.quest_type)}</Item.Extra>
							</Item.Content>
						</Item>
					))}
				</Item.Group>
				</React.Fragment>
			</DataPageLayout>
		);
	}
}

export default StaticEpisodePage;

export const query = graphql`
	query($symbol: String!) {
		allEpisodesJson(filter: { symbol: { eq: $symbol } }) {
			edges {
				node {
					name
					description
					cadet
					episode_title
					episode
					total_stars
					episode_portrait {
						file
					}
					quests {
						quest_type
						symbol
						name
						action
						description
						cadet_crew_select_info
						unlock_text
						notifier_icon {
							file
						}
						timeline_icon {
							file
						}
						mastery_levels {
							id
							energy_cost
							opponent {
								ship_icon {
									file
								}
								ship_name
								ship_level
								rarity
								shields
								hull
								evasion
								attack
								accuracy
								crit_chance
								crit_bonus
								attacks_per_second
								shield_regen
								name
								icon {
									file
								}
							}
						}
						intro {
							text
							portrait {
								file
							}
							speaker_name
							response
						}
						screens {
							speaker_name
							speaker_image {
								file
							}
							text
							prerequisites {
								mission_tags
							}
							responses {
								text
								button
								rewards {
									mission_tags
								}
								index
								loot_rewards {
									type
									symbol
									name
									icon {
										file
									}
									quantity
									quantity_as_percentage_increase
									id
								}
								paraphrase
							}
							index
						}
						crew_requirement {
							description
						}
						stages {
							grid_x
							text
						}
					}
				}
			}
		}
	}
`;
