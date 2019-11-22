import React, { Component } from 'react';
import { Container, Header, Label, Message, Item, Tab, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';
import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';

import { calculateBuffConfig } from '../utils/voyageutils';

import CONFIG from '../components/CONFIG';

type ProfilePageProps = {};

type ProfilePageState = {
	dbid?: string;
	errorMessage?: string;
	playerData?: any;
};

class ProfilePage extends Component<ProfilePageProps, ProfilePageState> {
	constructor(props: ProfilePageProps) {
		super(props);

		this.state = {
			dbid: undefined,
			errorMessage: undefined,
			playerData: undefined
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('dbid')) {
			let dbid = urlParams.get('dbid');
			this.setState({ dbid });

			let lastModified = undefined;

			fetch('https://datacore9545.blob.core.windows.net/player-data/' + dbid)
				.then(response => {
					lastModified = new Date(Date.parse(response.headers.get('Last-Modified')));

					return response.json();
				})
				.then(playerData => {
					fetch('/structured/crew.json')
						.then(response => response.json())
						.then(allcrew => {
							fetch('/structured/botcrew.json')
								.then(response => response.json())
								.then(botcrew => {
									// Do some computation on the data to avoid doing it on every render
									let numImmortals = new Set(playerData.player.character.c_stored_immortals);

									playerData.player.character.stored_immortals.map(si => si.id).forEach(item => numImmortals.add(item));

									playerData.player.character.crew.forEach(crew => {
										if (crew.level === 100 && crew.equipment.length === 4) {
											numImmortals.add(crew.archetype_id);
										}
									});

									playerData.calc = {
										numImmortals: numImmortals.size,
										lastModified
									};

									let buffConfig = calculateBuffConfig(playerData.player);
									const getMultiplier = (skill: string, stat: string) => {
										return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
									};

									const applyCrewBuffs = (crew: any) => {
										for (let skill in CONFIG.SKILLS) {
											crew[skill] = { core: 0, min: 0, max: 0 };
										}

										// Apply buffs
										for (let skill in crew.base_skills) {
											crew[skill] = {
												core: Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core')),
												min: Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min')),
												max: Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'))
											};
										}
									};

									// Merge with player crew
									let ownedCrew = [];
									for (let crew of allcrew) {
										crew.rarity = crew.max_rarity;
										crew.level = 100;
										crew.favorite = false;

										let bcrew = botcrew.find(bc => bc.symbol === crew.symbol);
										if (bcrew) {
											crew.bigbook_tier = bcrew.bigbook_tier;
										} else {
											crew.bigbook_tier = 11;
										}

										if (playerData.player.character.c_stored_immortals.includes(crew.archetype_id)) {
											crew.immortal = 1;
										} else {
											let immortal = playerData.player.character.stored_immortals.find(
												im => im.id === crew.archetype_id
											);
											crew.immortal = immortal ? immortal.quantity : 0;
										}
										if (crew.immortal > 0) {
											applyCrewBuffs(crew);
											ownedCrew.push(JSON.parse(JSON.stringify(crew)));
										}

										let inroster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
										inroster.forEach(owned => {
											crew.immortal = 0;
											crew.rarity = owned.rarity;
											crew.base_skills = owned.base_skills;
											crew.level = owned.level;
											crew.have = true;
											crew.favorite = owned.favorite;
											crew.equipment = owned.equipment;
											applyCrewBuffs(crew);
											ownedCrew.push(JSON.parse(JSON.stringify(crew)));
										});
									}

									playerData.player.character.crew = ownedCrew;

									this.setState({ playerData });
								});
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	render() {
		const { dbid, errorMessage, playerData } = this.state;

		if (playerData === undefined || dbid === undefined || errorMessage !== undefined) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as="h4">Player profile</Header>
						{errorMessage && (
							<Message negative>
								<Message.Header>Unable to load profile</Message.Header>
								<p>
									Failed to find the player profile you were searching. Make sure you have the right URL, or contact the
									player and ask them to reupload their profile.
								</p>
								<pre>{errorMessage.toString()}</pre>
							</Message>
						)}
						<p>
							Are you looking to share your player profile? Go to the <Link to={`/voyage`}>Player Tools page</Link> to
							upload your player.json and access other useful player tools.
						</p>
						{!errorMessage && (
							<div>
								<Icon loading name="spinner" /> Loading...
							</div>
						)}
					</Container>
				</Layout>
			);
		}

		const panes = [
			{
				menuItem: 'Crew',
				render: () => <ProfileCrew playerData={this.state.playerData} />
			},
			{
				menuItem: 'Crew (mobile)',
				render: () => <ProfileCrewMobile playerData={this.state.playerData} />
			},
			{
				menuItem: 'Ships',
				render: () => <ProfileShips playerData={this.state.playerData} />
			},
			{
				menuItem: 'Items',
				render: () => <ProfileItems playerData={this.state.playerData} />
			},
			{
				menuItem: 'Other',
				render: () => <ProfileOther playerData={this.state.playerData} />
			}
		];

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Item.Group>
						<Item>
							<Item.Image size="tiny" src={`/media/assets/${playerData.player.character.crew_avatar.portrait}`} />

							<Item.Content>
								<Item.Header>{playerData.player.character.display_name}</Item.Header>
								<Item.Meta>
									<Label>VIP {playerData.player.vip_level}</Label>
									<Label>Level {playerData.player.character.level}</Label>
									<Label>{playerData.calc.numImmortals} crew</Label>
									<Label>{playerData.player.character.shuttle_bays} shuttles</Label>
								</Item.Meta>
								<Item.Description>
									{playerData.player.fleet && (
										<p>
											Fleet{' '}
											<Link to={`/fleet_info?fleetid=${playerData.player.fleet.id}`}>
												<b>{playerData.player.fleet.slabel}</b>
											</Link>{' '}
											({playerData.player.fleet.rank}) Starbase level {playerData.player.fleet.nstarbase_level}{' '}
										</p>
									)}
								</Item.Description>
							</Item.Content>
						</Item>
					</Item.Group>
					{playerData.calc.lastModified ? (
						<Label size="tiny">Last updated: {playerData.calc.lastModified.toLocaleString()}</Label>
					) : (
						<span />
					)}
					<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
				</Container>
			</Layout>
		);
	}
}

export default ProfilePage;
