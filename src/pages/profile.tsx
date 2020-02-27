import React, { Component } from 'react';
import { Container, Header, Label, Message, Item, Tab, Icon, Dropdown, Menu } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { isMobile } from 'react-device-detect';

import Layout from '../components/layout';
import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';

import { downloadData, exportCrew, prepareProfileData } from '../utils/crewutils';
import { mergeShips, exportShips } from '../utils/shiputils';

type ProfilePageProps = {};

type ProfilePageState = {
	dbid?: string;
	errorMessage?: string;
	playerData?: any;
	mobile: boolean;
};

class ProfilePage extends Component<ProfilePageProps, ProfilePageState> {
	constructor(props: ProfilePageProps) {
		super(props);

		this.state = {
			dbid: undefined,
			errorMessage: undefined,
			playerData: undefined,
			mobile: false
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('dbid')) {
			let dbid = urlParams.get('dbid');
			this.setState({ dbid });

			if (isMobile || (urlParams.has('mobile') && urlParams.get('mobile'))) {
				this.setState({ mobile: true });
			}

			let lastModified = undefined;

			fetch('https://datacore.app/profiles/' + dbid)
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
									prepareProfileData(allcrew, botcrew, playerData, lastModified);

									this.setState({ playerData });
								});
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	renderDesktop() {
		const { playerData } = this.state;

		const panes = [
			{
				menuItem: 'Crew',
				render: () => <ProfileCrew playerData={this.state.playerData} />
			},
			{
				menuItem: 'Crew (mobile)',
				render: () => <ProfileCrewMobile playerData={this.state.playerData} isMobile={false} />
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
			},
			{
				menuItem: 'Charts & Stats',
				render: () => <ProfileCharts playerData={this.state.playerData} />
			}
		];

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Item.Group>
						<Item>
							<Item.Image size="tiny" src={`https://assets.datacore.app/${playerData.player.character.crew_avatar ? playerData.player.character.crew_avatar.portrait : 'crew_portraits_cm_empty_sm.png'}`} />

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

					<Menu compact>
						<Menu.Item>
							{playerData.calc.lastModified ? (
								<span>Last updated: {playerData.calc.lastModified.toLocaleString()}</span>
							) : (
								<span />
							)}
						</Menu.Item>
						<Dropdown item text="Download">
							<Dropdown.Menu>
								<Dropdown.Item onClick={() => this._exportCrew()}>Crew table (CSV)</Dropdown.Item>
								<Dropdown.Item onClick={() => this._exportShips()}>Ship table (CSV)</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown>
					</Menu>
					<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
				</Container>
			</Layout>
		);
	}

	_exportCrew() {
		const { playerData } = this.state;

		let text = exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew));
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	_exportShips() {
		const { playerData } = this.state;

		fetch('/structured/ship_schematics.json')
			.then(response => response.json())
			.then(ship_schematics => {
				let data = mergeShips(ship_schematics, playerData.player.character.ships);
				let text = exportShips(data);
				downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'ships.csv');
			});
	}

	renderMobile() {
		return <ProfileCrewMobile playerData={this.state.playerData} isMobile={true} />;
	}

	render() {
		const { dbid, errorMessage, playerData, mobile } = this.state;

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

		if (mobile) {
			return this.renderMobile();
		} else {
			return this.renderDesktop();
		}
	}
}

export default ProfilePage;
