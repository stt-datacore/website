import React, { Component } from 'react';
import { Header, Button, Message, Grid, Icon, Form, Select, Dropdown, Checkbox } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import {
	calculateBuffConfig,
	bestVoyageShip,
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds,
	bonusCrewForCurrentEvent
} from '../utils/voyageutils';

import { exportCrew } from '../utils/crewutils';
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
	calcState: CalculatorState;
	result?: ICalcResult;
	originalPlayerData?: any;
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

		playerData.player

		this.state = {
			bestShip: bestShips[0],
			calcState: CalculatorState.NotStarted,
			crew: [],
			fuellist: [],
			originalPlayerData: undefined,
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
		const { originalPlayerData } = this.state;

		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				let jsonBody = JSON.stringify({
					dbid: originalPlayerData.player.dbid,
					player_data: stripPlayerData(items, JSON.parse(JSON.stringify(originalPlayerData)))
				});

				fetch('https://datacore.azurewebsites.net/api/player_data', {
					method: 'post',
					body: jsonBody
				}).then(() => {
					window.open(`https://datacore.app/profile/?dbid=${originalPlayerData.player.dbid}`, '_blank');
					this.setState({ uploading: false, uploaded: true });
				});
			});
	}

	renderVoyageCalculator() {
		const { playerData } = this.props;
		const { bestShip } = this.state;

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
					VOYAGE CALCULATOR! Configure the settings below, then click on the "Calculate" button to see the recommendations. Current voyage is <b>{curVoy}</b>.
				</Message>
				<Form className='attached fluid segment' loading={this.state.calcState === CalculatorState.InProgress}>
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
							<b>{bestShip.ship.name} ({bestShip.score} Antimatter)</b>
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
									let crew = playerData.player.character.crew.find(c => c.id === entry.choice);
									return (
										<li key={idx}>
											{playerData.player.character.voyage_descriptions[0].crew_slots[entry.slotId].name}
											{'  :  '}
											<CrewPopup crew={crew} />
										</li>
									);
								})}
							</ul>
						</React.Fragment>
					)}

					<Form.Group>
						<Form.Button primary onClick={() => this._calcVoyageData(bestShip.score)} disabled={this.state.calcState === CalculatorState.InProgress}>
							Calculate best crew selection
						</Form.Button>
					</Form.Group>
				</Form>
			</div>
		);
	}

	render() {
		const { playerData } = this.props;

		let itemCount = playerData.player.character.items.length;

		return (
			<div>
				<Header as="h4">Hello, {playerData.player.character.display_name}</Header>
				<Message icon>
					<Icon name="bell" />
					<Message.Content>
						<Message.Header>NEW! Share your player profile!</Message.Header>
						{!this.state.uploaded && (
							<p>
								If you want to share your profile with the world{' '}
								<Button size="small" color="green" onClick={() => this._shareProfile()}>
									{this.state.uploading && <Icon loading name="spinner" />} click here
								</Button>{' '}
								More details:
							</p>
						)}
						{!this.state.uploaded && (
							<Message.List>
								<Message.Item>
									Once shared, the profile will be publicly accessible by anyone that has the link (or knows your DBID)
								</Message.Item>
								<Message.Item>
									There is no private information being leaked through the player profile; information being shared is
									limited to:{' '}
									<b>
										captain name, level, vip level, fleet name and role, achievements, completed missions, your crew,
										items and ships.
									</b>
								</Message.Item>
							</Message.List>
						)}
						{this.state.uploaded && (
							<p>
								Your profile was uploaded. Here's the link:{' '}
								<a
									href={`https://datacore.app/profile/?dbid=${playerData.player.dbid}`}
									target="_blank"
								>{`https://datacore.app/profile/?dbid=${playerData.player.dbid}`}</a>
							</p>
						)}
					</Message.Content>
				</Message>

				<Button
					style={{ marginBottom: '1em' }}
					onClick={() => this._exportCrew()}
					content="Export crew spreadsheet..."
				/>

				{this.renderVoyageCalculator()}

				{itemCount > 900 && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {playerData.player.character.item_limit} the game starts
							randomly losing items; go and replicate away some unnecessary stuff.
						</p>
					</Message>
				)}

				<Header as="h4">
					Here are some potential items that you don't need (used to equip crew you already equipped):
				</Header>
				<Grid columns={5} centered padded>
					{this.state.fuellist.map(item => (
						<Grid.Column key={item.archetype_id} textAlign="center">
							<ItemDisplay
								src={`/media/assets/${item.icon.file.substr(1).replace(/\//g, '_')}.png`}
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

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(allcrew => {
				const { playerData } = this.props;
				this.setState({ originalPlayerData: playerData });
				let buffConfig = calculateBuffConfig(playerData.player);

				const getMultiplier = (skill: string, stat: string) => {
					return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
				};

				const fixUpSkills = (crew: any) => {
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

				let equipmentAlreadyOnCrew = new Set();

				// Merge with player crew
				let crewlist = [];
				let fakeID = 1;
				for (let crew of allcrew) {
					crew.rarity = crew.max_rarity;
					crew.level = 100;
					crew.have = false;
					crew.equipment = [0,1,2,3];
					crew.id = fakeID++;

					let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
					crew.immortal = immortal ? immortal.quantity : 0;
					if (crew.immortal > 0) {
						crew.have = true;
						fixUpSkills(crew);

						// Add a copy to the list
						crewlist.push(JSON.parse(JSON.stringify(crew)));
						crew.immortal = 0;
					}

					let inRoster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
					inRoster.forEach(owned =>
					{
						if (!owned.in_buy_back_state) {
							crew.rarity = owned.rarity;
							crew.base_skills = owned.base_skills;
							crew.level = owned.level;
							crew.have = true;
							crew.crew_id = owned.id;

							crew.equipment = owned.equipment.map(e => e[0]);

							fixUpSkills(crew);
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
						fixUpSkills(crew);
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

				let bonusCrew = bonusCrewForCurrentEvent(playerData.player, crewlist);
				if (bonusCrew) {
					this.setState({activeEvent: bonusCrew.eventName, currentSelection: bonusCrew.crewIds});
				}

				let peopleList = [];
				crewlist.forEach(crew => {
					if (crew.have) {
						peopleList.push({
							key: crew.crew_id || crew.id,
							value: crew.crew_id || crew.id,
							image: { avatar: true, src: `/media/assets/${crew.imageUrlPortrait}` },
							text: crew.name
						});
					}
				});

				this.setState({ peopleList, fuellist, crew: crewlist });
			});
	}

	_exportCrew() {
		function downloadData(dataUrl) {
			let pom = document.createElement('a');
			pom.setAttribute('href', dataUrl);
			pom.setAttribute('download', 'crew.csv');

			if (document.createEvent) {
				let event = document.createEvent('MouseEvents');
				event.initEvent('click', true, true);
				pom.dispatchEvent(event);
			} else {
				pom.click();
			}
		}

		fetch('/structured/botcrew.json')
			.then(response => response.json())
			.then(botcrew => {
				const { crew } = this.state;

				for (let c of crew) {
					let bc = botcrew.find(cr => c.symbol === cr.symbol);
					if (bc) {
						c.tier = bc.bigbook_tier;
						c.voyRank = bc.ranks.voyRank;
						c.gauntletRank = bc.ranks.gauntletRank;
						c.in_portal = bc.in_portal;
					} else {
						c.tier = 0;
						c.voyRank = 0;
						c.gauntletRank = 0;
						c.in_portal = undefined;
					}
				}

				let text = exportCrew(crew);
				downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`);
			});
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
			if (
				this.state.currentSelection.length > 0 &&
				this.state.currentSelection.some(ignored => ignored === (crew.crew_id || crew.id))
			) {
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
