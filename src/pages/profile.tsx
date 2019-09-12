import React, { Component } from 'react';
import { Container, Header, Label, Message, Item, Tab, Table, Rating, Icon } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import Layout from '../components/layout';

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

			fetch('https://datacore9545.blob.core.windows.net/player-data/' + dbid)
				.then(response => response.json())
				.then(playerData => {
					fetch('/structured/crew.json')
						.then(response => response.json())
						.then(allcrew => {
							// Do some computation on the data to avoid doing it on every render
							let numImmortals = new Set(playerData.player.character.c_stored_immortals);

							playerData.player.character.stored_immortals.map(si => si.id).forEach(item => numImmortals.add(item));

							playerData.player.character.crew.forEach(crew => {
								if (crew.level === 100 && crew.equipment.length === 4) {
									numImmortals.add(crew.archetype_id);
								}
							});

							playerData.calc = {
								numImmortals: numImmortals.size
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

								if (playerData.player.character.c_stored_immortals.includes(crew.archetype_id)) {
									crew.immortal = 1;
								} else {
									let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
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
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	_descriptionLabel(crew: any) {
		if (crew.immortal) {
			return (
				<div>
					<Icon name='snowflake' /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			return (
				<div>
					{crew.favorite && <Icon name='heart' />}
					<span>Level {crew.level}</span>
				</div>
			);
		}
	}

	renderCrew() {
		const { playerData } = this.state;
		return (
			<Table sortable celled selectable striped collapsing unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell width={3}>Crew</Table.HeaderCell>
						<Table.HeaderCell width={1}>Rarity</Table.HeaderCell>
						<Table.HeaderCell width={1}>Command</Table.HeaderCell>
						<Table.HeaderCell width={1}>Diplomacy</Table.HeaderCell>
						<Table.HeaderCell width={1}>Engineering</Table.HeaderCell>
						<Table.HeaderCell width={1}>Medicine</Table.HeaderCell>
						<Table.HeaderCell width={1}>Science</Table.HeaderCell>
						<Table.HeaderCell width={1}>Security</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{playerData.player.character.crew.map((crew, idx) => (
						<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
							<Table.Cell>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}>
									<div style={{ gridArea: 'icon' }}>
										<img width={48} src={`/media/assets/${crew.imageUrlPortrait}`} />
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
									</div>
									<div style={{ gridArea: 'description' }}>{this._descriptionLabel(crew)}</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Rating defaultRating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
							</Table.Cell>
							{crew.base_skills.command_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.command_skill.core}</b>
									<br />
									+({crew.base_skills.command_skill.range_min}-{crew.base_skills.command_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.diplomacy_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.diplomacy_skill.core}</b>
									<br />
									+({crew.base_skills.diplomacy_skill.range_min}-{crew.base_skills.diplomacy_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.engineering_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.engineering_skill.core}</b>
									<br />
									+({crew.base_skills.engineering_skill.range_min}-{crew.base_skills.engineering_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.medicine_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.medicine_skill.core}</b>
									<br />
									+({crew.base_skills.medicine_skill.range_min}-{crew.base_skills.medicine_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.science_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.science_skill.core}</b>
									<br />
									+({crew.base_skills.science_skill.range_min}-{crew.base_skills.science_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.security_skill ? (
								<Table.Cell textAlign='center'>
									<b>{crew.base_skills.security_skill.core}</b>
									<br />
									+({crew.base_skills.security_skill.range_min}-{crew.base_skills.security_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		);
	}

	renderShips() {
		const { playerData } = this.state;
		return (
			<div>
				<Message icon warning>
					<Icon name='exclamation triangle' />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>
				<Table sortable celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={3}>Ship</Table.HeaderCell>
							<Table.HeaderCell width={1}>Level</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{playerData.player.character.ships.map((ship, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>{ship.symbol}</Table.Cell>
								<Table.Cell>
									<Rating defaultRating={ship.level} maxRating={ship.level} size='large' disabled />
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</div>
		);
	}

	renderOther() {
		const { playerData } = this.state;
		return (
			<div>
				<Message icon warning>
					<Icon name='exclamation triangle' />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>

				<Item.Group>
					{playerData.player.character.daily_activities.map(da =>
						da.status ? (
							<Item>
								<Item.Content>
									<Item.Header>{da.name}</Item.Header>
									<Item.Meta>
										<Label>{da.status}</Label>
									</Item.Meta>
									<Item.Description>{da.description}</Item.Description>
								</Item.Content>
							</Item>
						) : (
							<span />
						)
					)}
				</Item.Group>

				<Table sortable celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={3}>Mission</Table.HeaderCell>
							<Table.HeaderCell width={3}>Status</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{playerData.player.character.accepted_missions.concat(playerData.player.character.dispute_histories).map((mission, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>{mission.symbol}</Table.Cell>
								<Table.Cell>
									Completed {mission.stars_earned} of {mission.total_stars} missions
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</div>
		);
	}

	renderItems() {
		const { playerData } = this.state;
		return (
			<div>
				<Message icon warning>
					<Icon name='exclamation triangle' />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>
				<Table sortable celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={3}>Item</Table.HeaderCell>
							<Table.HeaderCell width={1}>Quantity</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{playerData.player.character.items.map((item, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>{item.symbol}</Table.Cell>
								<Table.Cell>{item.quantity}</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</div>
		);
	}

	render() {
		const { dbid, errorMessage, playerData } = this.state;

		if (playerData === undefined || dbid === undefined || errorMessage !== undefined) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as='h4'>Player profile</Header>
						{errorMessage && (
							<Message negative>
								<Message.Header>Unable to load profile</Message.Header>
								<p>
									Failed to find the player profile you were searching. Make sure you have the right URL, or contact the player and ask them
									to reupload their profile.
								</p>
								<pre>{errorMessage.toString()}</pre>
							</Message>
						)}
						<p>
							Are you looking to share your player profile? Go to the <Link to={`/voyage`}>Player Tools page</Link> to upload your
							player.json and access other useful player tools.
						</p>
					</Container>
				</Layout>
			);
		}

		//console.log(playerData);

		const panes = [
			{
				menuItem: 'Crew',
				render: () => <Tab.Pane attached={false}>{this.renderCrew()}</Tab.Pane>
			},
			{
				menuItem: 'Ships',
				render: () => <Tab.Pane attached={false}>{this.renderShips()}</Tab.Pane>
			},
			{
				menuItem: 'Items',
				render: () => <Tab.Pane attached={false}>{this.renderItems()}</Tab.Pane>
			},
			{
				menuItem: 'Other',
				render: () => <Tab.Pane attached={false}>{this.renderOther()}</Tab.Pane>
			}
		];

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Item.Group>
						<Item>
							<Item.Image size='tiny' src={`/media/assets/${playerData.player.character.crew_avatar.portrait}`} />

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
											Fleet <b>{playerData.player.fleet.slabel}</b> ({playerData.player.fleet.rank}) Starbase level{' '}
											{playerData.player.fleet.nstarbase_level}{' '}
										</p>
									)}
								</Item.Description>
							</Item.Content>
						</Item>
					</Item.Group>
					<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
				</Container>
			</Layout>
		);
	}
}

export default ProfilePage;
