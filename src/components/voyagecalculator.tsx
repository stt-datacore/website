import React, { Component } from 'react';
import { Header, Button, Message, Grid, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';
import ItemDisplay from '../components/itemdisplay';
import {
	calculateBuffConfig,
	bestVoyageShip,
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds
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
};

class VoyageCalculator extends Component<VoyageCalculatorProps, VoyageCalculatorState> {
	constructor(props) {
		super(props);

		const { playerData } = props;

		let bestShips = bestVoyageShip(playerData.player);

		this.state = {
			bestShip: bestShips[0],
			calcState: CalculatorState.NotStarted,
			crew: [],
			fuellist: [],
			originalPlayerData: undefined,
			result: undefined,
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
					window.open(`https://datacore.netlify.com/profile/?dbid=${originalPlayerData.player.dbid}`, '_blank');
					this.setState({ uploading: false, uploaded: true });
				});
			});
	}

	render() {
		const { playerData } = this.props;
		const { bestShip, calcState } = this.state;

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

		let itemCount = playerData.player.character.items.length;

		let stillLoading = calcState === CalculatorState.InProgress;

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
									href={`https://datacore.netlify.com/profile/?dbid=${playerData.player.dbid}`}
									target="_blank"
								>{`https://datacore.netlify.com/profile/?dbid=${playerData.player.dbid}`}</a>
							</p>
						)}
					</Message.Content>
				</Message>
				<p>Current voyage is {curVoy}</p>
				<p>
					Best ship:{' '}
					<b>
						{bestShip.ship.name} ({bestShip.score} Antimatter)
					</b>
				</p>
				{currentVoyage && <p>It looks like you already have a voyage started.</p>}

				<Button
					style={{ marginBottom: '1em' }}
					onClick={() => this._calcVoyageData(bestShip.score)}
					primary
					content="Calculate voyage lineup"
				/>

				<Button
					style={{ marginBottom: '1em' }}
					onClick={() => this._exportCrew()}
					content="Export crew spreadsheet..."
				/>

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

				{stillLoading && <div className="ui medium centered text active inline loader">Calculating...</div>}

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
				for (let crew of allcrew) {
					crew.rarity = crew.max_rarity;
					crew.level = 100;
					crew.have = false;
					crew.equipment = [0,1,2,3];

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

				this.setState({ fuellist, crew: crewlist });
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

			/*if (!this.state.includeActive && crew.active_id > 0) {
				return false;
			}

			if (!this.state.includeFrozen && crew.frozen > 0) {
				return false;
			}

			// Filter out crew the user has chosen not to include
			if (
				this.state.currentSelectedItems.length > 0 &&
				this.state.currentSelectedItems.some(ignored => ignored === (crew.crew_id || crew.id))
			) {
				return false;
			}*/

			return true;
		});

		return {
			searchDepth: 6,
			extendsTarget: 0,
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
				console.log(calcResult);
				this.setState({
					result: calcResult,
					calcState: CalculatorState.InProgress
				});
			},
			calcResult => {
				console.log(calcResult);
				this.setState({
					result: calcResult,
					calcState: CalculatorState.Done
				});
			}
		);
	}
}

export default VoyageCalculator;
