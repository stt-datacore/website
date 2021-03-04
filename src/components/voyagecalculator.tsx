import React, { Component } from 'react';
import { Header, Button, Message, Grid, Icon, Form, Tab, Select, Dropdown, Checkbox, Modal, Image, Segment } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import {
	calculateBuffConfig,
	bestVoyageShip,
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds,
	bonusCrewForCurrentEvent
} from '../utils/voyageutils';

import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';
import CrewRetrieval from '../components/crewretrieval';


import { exportCrew, applyCrewBuffs, downloadData, prepareProfileData } from '../utils/crewutils';
import { stripPlayerData } from '../utils/playerutils';

import CrewPopup from '../components/crewpopup';

import CONFIG from './CONFIG';

type VoyageCalculatorProps = {
	playerData: any;
};

enum CalculatorState {
	NotStarted,
	InProgress,
	Done
}

type VoyageCalculatorState = {
	bestShip: any;
	crew: any[];
	fuellist: any[];
	fuelschematicslist: any[];
	calcState: CalculatorState;
	result?: ICalcResult;
	originalPlayerData?: any;
	strippedPlayerData?: any;
	preparedProfileData?: any;
	uploading: boolean;
	uploaded: boolean;
	includeFrozen: boolean;
	includeActive: boolean;
	activeEvent: string | undefined;
	peopleList: any[];
	currentSelection: any[];
	searchDepth: number;
	extendsTarget: number;
};

class VoyageCalculator extends Component<VoyageCalculatorProps, VoyageCalculatorState> {
	constructor(props) {
		super(props);

		const { playerData } = props;

		let bestShips = bestVoyageShip(playerData.player);

		playerData.player;

		this.state = {
			bestShip: bestShips[0],
			calcState: CalculatorState.NotStarted,
			crew: [],
			fuellist: [],
			originalPlayerData: undefined,
			strippedPlayerData: undefined,
			preparedProfileData: undefined,
			result: undefined,
			includeFrozen: false,
			includeActive: false,
			peopleList: [],
			currentSelection: [],
			activeEvent: undefined,
			searchDepth: 6,
			extendsTarget: 0,
			uploading: false,
			uploaded: false
		};
	}

	_shareProfile() {
		this.setState({ uploading: true });
		const { originalPlayerData, strippedPlayerData } = this.state;

		let jsonBody = JSON.stringify({
			dbid: originalPlayerData.player.dbid,
			player_data: strippedPlayerData
		});

		fetch(`${process.env.GATSBY_DATACORE_URL}api/post_profile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			window.open(`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${originalPlayerData.player.dbid}`, '_blank');
			this.setState({ uploading: false, uploaded: true });
		});
	}

	renderVoyageCalculator() {
		const { playerData } = this.props;
		const { bestShip, crew } = this.state;

		let curVoy = '';
		let currentVoyage = false;
		if (playerData.player.character.voyage_descriptions && playerData.player.character.voyage_descriptions.length > 0) {
			curVoy = `${CONFIG.SKILLS[playerData.player.character.voyage_descriptions[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[playerData.player.character.voyage_descriptions[0].skills.secondary_skill]
			} secondary`;
		}
		if (playerData.player.character.voyage && playerData.player.character.voyage.length > 0) {
			curVoy = `${CONFIG.SKILLS[playerData.player.character.voyage[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[playerData.player.character.voyage[0].skills.secondary_skill]
			} secondary`;
			currentVoyage = playerData.player.character.voyage[0].state === 'started';
		}

		return (
			<div style={{ margin: '5px' }}>
				{currentVoyage && <p>It looks like you already have a voyage started!</p>}
				<Message attached>
					VOYAGE CALCULATOR! Configure the settings below, then click on the "Calculate" button to see the recommendations. Current voyage
					is <b>{curVoy}</b>.
				</Message>
				<Form className='attached fluid segment'>
					<Form.Group inline>
						<Form.Field
							control={Select}
							label='Search depth'
							options={[
								{ key: '4', text: '4 (fastest)', value: 4 },
								{ key: '5', text: '5 (faster)', value: 5 },
								{ key: '6', text: '6 (normal)', value: 6 },
								{ key: '7', text: '7 (slower)', value: 7 },
								{ key: '8', text: '8 (slowest)', value: 8 },
								{ key: '9', text: '9 (for supercomputers)', value: 9 }
							]}
							value={this.state.searchDepth}
							onChange={(e, { value }) => this.setState({ searchDepth: value })}
							placeholder='Search depth'
						/>
						<Form.Field
							control={Select}
							label='Extends (target)'
							options={[
								{ key: '0', text: 'none (default)', value: 0 },
								{ key: '1', text: 'one', value: 1 },
								{ key: '2', text: 'two', value: 2 }
							]}
							value={this.state.extendsTarget}
							onChange={(e, { value }) => this.setState({ extendsTarget: value })}
							placeholder='How many times you plan to revive'
						/>
					</Form.Group>

					<Form.Group inline>
						<Form.Field>
							<label>Best ship</label>
							<b>
								{bestShip.ship.name} ({bestShip.score} Antimatter)
							</b>
						</Form.Field>
					</Form.Group>

					<Form.Group>
						<Form.Field
							control={Dropdown}
							clearable
							fluid
							multiple
							search
							selection
							options={this.state.peopleList}
							placeholder='Select or search for crew'
							label={
								"Crew you don't want to consider for voyage" +
								(this.state.activeEvent ? ` (preselected crew which gives bonus in the event ${this.state.activeEvent})` : '')
							}
							value={this.state.currentSelection}
							onChange={(e, { value }) => this.setState({ currentSelection: value })}
						/>
					</Form.Group>

					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label='Include active (on shuttles) crew'
							checked={this.state.includeActive}
							onChange={(e, { checked }) => this.setState({ includeActive: checked })}
						/>

						<Form.Field
							control={Checkbox}
							label='Include frozen (vaulted) crew'
							checked={this.state.includeFrozen}
							onChange={(e, { checked }) => this.setState({ includeFrozen: checked })}
						/>
					</Form.Group>

					{this.state.result && (
						<React.Fragment>
							<p>
								Estimated duration: <b>{formatTimeSeconds(this.state.result.score * 60 * 60)}</b>
							</p>
							<ul>
								{this.state.result.entries.map((entry, idx) => {
									let pcrew = playerData.player.character.crew.find(c => c.id === entry.choice);
									let acrew = crew.find(c => c.symbol === pcrew.symbol);
									return (
										<li key={idx}>
											{playerData.player.character.voyage_descriptions[0].crew_slots[entry.slotId].name}
											{'  :  '}
											<CrewPopup crew={acrew} />
										</li>
									);
								})}
							</ul>
						</React.Fragment>
					)}

					<Form.Group>
						<Form.Button
							primary
							onClick={() => this._calcVoyageData(bestShip.score)}
							disabled={this.state.calcState === CalculatorState.InProgress}>
							Calculate best crew selection
						</Form.Button>
					</Form.Group>
				</Form>
				<Modal basic size='tiny' open={this.state.calcState === CalculatorState.InProgress}>
                    <Modal.Content image>
                        <Image centered src='/media/wait_icon.gif' />
                    </Modal.Content>
                    <Modal.Description>
                        <Segment basic textAlign={"center"}>
                            <Button onClick={e => this.setState({calcState : CalculatorState.Done})}>Abort</Button>
                        </Segment>
                    </Modal.Description>
                </Modal>
			</div>
		);
	}

	renderItemLimit() {
		const { playerData } = this.props;

		let itemCount = playerData.player.character.items.length;
		return (
			<div>
				{itemCount > 900 && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {playerData.player.character.item_limit} the game starts randomly losing
							items; go and replicate away some unnecessary stuff.
						</p>
					</Message>
				)}

				<Header as='h4'>Here are some potential items that you don't need (used to upgrade ships you already maxed):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuelschematicslist.map(item => (
						<Grid.Column key={item.archetype_id} textAlign='center'>
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${item.icon.file.substr(1).replace(/\//g, '_')}.png`}
								size={64}
								maxRarity={item.rarity}
								rarity={item.rarity}
							/>
							<p>{item.name}</p>
						</Grid.Column>
					))}
				</Grid>

				<Header as='h4'>Here are some potential items that you don't need (used to equip crew you already equipped):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuellist.map(item => (
						<Grid.Column key={item.archetype_id} textAlign='center'>
							<ItemDisplay
								src={`${process.env.GATSBY_ASSETS_URL}${item.icon.file.substr(1).replace(/\//g, '_')}.png`}
								size={64}
								maxRarity={item.rarity}
								rarity={item.rarity}
							/>
							<p>{item.name}</p>
						</Grid.Column>
					))}
				</Grid>
			</div>
		);
	}

	render() {
		const { playerData } = this.props;

		const panes = [
			{
				menuItem: 'Voyage Calculator',
				render: () => this.renderVoyageCalculator()
			},
			{
				menuItem: 'Unneeded items',
				render: () => this.renderItemLimit()
			},
			{
				menuItem: 'Crew',
				render: () => <ProfileCrew playerData={this.state.preparedProfileData} isTools={true} />
			},
			{
				menuItem: 'Crew (mobile)',
				render: () => <ProfileCrewMobile playerData={this.state.preparedProfileData} isMobile={false} />
			},
			{
				menuItem: 'Crew Retrieval',
				render: () => <CrewRetrieval playerData={this.state.preparedProfileData} />
			},
			{
				menuItem: 'Ships',
				render: () => <ProfileShips playerData={this.state.preparedProfileData} />
			},
			{
				menuItem: 'Items',
				render: () => <ProfileItems playerData={this.state.preparedProfileData} />
			},
			{
				menuItem: 'Other',
				render: () => <ProfileOther playerData={this.state.preparedProfileData} />
			},
			{
				menuItem: 'Charts & Stats',
				render: () => <ProfileCharts playerData={this.state.preparedProfileData} />
			}
		];

		return (
			<div>
				<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>
				<Message icon>
					<Icon name='bell' />
					<Message.Content>
						<Message.Header>Share your player profile!</Message.Header>
						{!this.state.uploaded && (
							<p>
								Click here to{' '}
								<Button size='small' color='green' onClick={() => this._shareProfile()}>
									{this.state.uploading && <Icon loading name='spinner' />}share your profile
								</Button>{' '}
								and unlock more tools and export options for items and ships. More details:
							</p>
						)}
						{!this.state.uploaded && (
							<Message.List>
								<Message.Item>
									Once shared, the profile will be publicly accessible by anyone that has the link (or knows your DBID)
								</Message.Item>
								<Message.Item>
									There is no private information included in the player profile; information being shared is limited to:{' '}
									<b>captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
								</Message.Item>
							</Message.List>
						)}
						{this.state.uploaded && (
							<p>
								Your profile was uploaded. Share the link:{' '}
								<a
									href={`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}
									target='_blank'>{`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}</a>
							</p>
						)}
					</Message.Content>
				</Message>

				<Button style={{ marginBottom: '1em' }} onClick={() => this._exportCrew()} content='Export crew spreadsheet...' />

				<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
			</div>
		);
	}

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(allcrew => {
				fetch('/structured/items.json')
					.then(response => response.json())
					.then(items => {
						const { playerData } = this.props;

						let strippedPlayerData = stripPlayerData(items, JSON.parse(JSON.stringify(playerData)));
						let preparedProfileData = JSON.parse(JSON.stringify(strippedPlayerData));

						prepareProfileData(allcrew, preparedProfileData, undefined);

						this.setState({ originalPlayerData: playerData, strippedPlayerData, preparedProfileData });
						let buffConfig = calculateBuffConfig(playerData.player);

						let equipmentAlreadyOnCrew = new Set();

						// Merge with player crew
						let crewlist = [];
						let fakeID = 1;
						for (let crew of allcrew) {
							crew.rarity = crew.max_rarity;
							crew.level = 100;
							crew.have = false;
							crew.equipment = [0, 1, 2, 3];
							crew.id = fakeID++;

							let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
							crew.immortal = immortal ? immortal.quantity : 0;
							if (crew.immortal > 0) {
								crew.have = true;
								applyCrewBuffs(crew, buffConfig);

								// Add a copy to the list
								crewlist.push(JSON.parse(JSON.stringify(crew)));
								crew.immortal = 0;
							}

							let inRoster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
							inRoster.forEach(owned => {
								if (!owned.in_buy_back_state) {
									crew.rarity = owned.rarity;
									crew.base_skills = owned.base_skills;
									crew.level = owned.level;
									crew.have = true;
									crew.crew_id = owned.id;

									crew.equipment = owned.equipment.map(e => e[0]);

									applyCrewBuffs(crew, buffConfig);
									// Add a copy to the list
									crewlist.push(JSON.parse(JSON.stringify(crew)));
								}
							});

							// Calculate replicator fodder
							if (crew.have) {
								crew.equipment_slots.forEach(equipment => {
									equipmentAlreadyOnCrew.add(equipment.symbol);
								});
							} else {
								// Crew is not immortal or in the active roster
								applyCrewBuffs(crew, buffConfig);
								// Add a copy to the list
								crewlist.push(JSON.parse(JSON.stringify(crew)));
							}
						}

						let fuellist = playerData.player.character.items.filter(
							item =>
								(equipmentAlreadyOnCrew.has(item.symbol) && item.quantity === 1 && item.rarity > 1) ||
								item.name.indexOf("'s ") > 0 ||
								item.name.indexOf("s' ") > 0
						);
						
						let maxedShips = playerData.player.character.ships.filter(
							ship => ship.level === ship.max_level
						);

						let fuelschematicslist = playerData.player.character.items.filter(
							item => maxedShips.some((ship) => ship.schematic_id === item.archetype_id)
						);

						let bonusCrew = bonusCrewForCurrentEvent(playerData.player, crewlist);
						if (bonusCrew) {
							this.setState({ activeEvent: bonusCrew.eventName, currentSelection: bonusCrew.crewIds });
						}

						let peopleList = [];
						crewlist.forEach(crew => {
							if (crew.have) {
								peopleList.push({
									key: crew.crew_id || crew.id,
									value: crew.crew_id || crew.id,
									image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` },
									text: crew.name
								});
							}
						});

						this.setState({ peopleList, fuellist, fuelschematicslist, crew: crewlist });
					});
			});
	}

	_exportCrew() {
		const { crew } = this.state;

		let text = exportCrew(crew);
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	_packVoyageOptions(shipAM: number) {
		const { playerData } = this.props;

		let filteredRoster = playerData.player.character.crew.filter(crew => {
			// Filter out buy-back crew
			if (crew.buyback) {
				return false;
			}

			if (!this.state.includeActive && crew.active_id > 0) {
				return false;
			}

			if (!this.state.includeFrozen && crew.immortal > 0) {
				return false;
			}

			// Filter out crew the user has chosen not to include
			if (this.state.currentSelection.length > 0 && this.state.currentSelection.some(ignored => ignored === (crew.crew_id || crew.id))) {
				return false;
			}

			return true;
		});

		return {
			searchDepth: this.state.searchDepth,
			extendsTarget: this.state.extendsTarget,
			shipAM: shipAM,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: playerData.player.character.voyage_descriptions[0],
			roster: filteredRoster
		};
	}

	_calcVoyageData(shipAM: number) {
		let options = this._packVoyageOptions(shipAM);

		calculateVoyage(
			options,
			calcResult => {
				this.setState({
					result: calcResult,
					calcState: CalculatorState.InProgress
				});
			},
			calcResult => {
				this.setState({
					result: calcResult,
					calcState: CalculatorState.Done
				});
			}
		);
	}
}

export default VoyageCalculator;
