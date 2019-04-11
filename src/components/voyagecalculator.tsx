import React, { Component } from 'react';
import { Header, Button, Message, Grid } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { calculateBuffConfig, bestVoyageShip, ICalcResult, calculateVoyage, formatTimeSeconds } from '../utils/voyageutils';
import { exportCrew } from '../utils/crewutils';

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
			result: undefined
		};
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
				<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>
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
					content='Calculate voyage lineup'
				/>

				<Button style={{ marginBottom: '1em' }} onClick={() => this._exportCrew()} content='Export crew spreadsheet...' />

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

				{stillLoading && <div className='ui medium centered text active inline loader'>Calculating...</div>}

				{itemCount > 900 && (
					<Message warning>
						<Message.Header>Items approaching limit</Message.Header>
						<p>
							You have {itemCount} items in your inventory. At {playerData.player.character.item_limit} the game starts randomly losing items; go and replicate away some
							unnecessary stuff.
						</p>
					</Message>
				)}

				<Header as='h4'>Here are some potential items that you don't need (used to equip crew you already equipped):</Header>
				<Grid columns={5} centered padded>
					{this.state.fuellist.map(item => (
						<Grid.Column key={item.archetype_id} textAlign='center'>
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
				let buffConfig = calculateBuffConfig(playerData.player);

				const getMultiplier = (skill: string, stat: string) => {
					return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
				};

				let equipmentAlreadyOnCrew = new Set();

				// Merge with player crew
				for(let crew of allcrew)
				{
					crew.rarity = crew.max_rarity;
					crew.level = 100;

					let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
					crew.immortal = immortal ? immortal.quantity : 0;
					crew.have = crew.immortal  > 0;

					let owned = playerData.player.character.crew.find(c => c.archetype_id === crew.archetype_id);
					if (owned)
					{
						crew.rarity = owned.rarity;
						crew.base_skills = owned.base_skills;
						crew.level = owned.level;
						crew.have = true;
					}

					for (let skill in CONFIG.SKILLS) {
						crew[skill] = {core:0, min:0, max: 0};
					}

					// Apply buffs
					for (let skill in crew.base_skills) {
						crew[skill] = {
							core: Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core')),
							min: Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min')),
							max: Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'))};
					}

					// Calculate replicator fodder
					if ((crew.immortal > 0) || (owned && (owned.level === 100))) {
						let lastEquipmentLevel = 100;
						if (owned) {
							lastEquipmentLevel = owned.level;
							for (let equipment of owned.equipment_slots) {
								if (!equipment.have) {
									lastEquipmentLevel = equipment.level - 1;
								}
							}
						}

						crew.equipment_slots.forEach(equipment => {
							if (equipment.level <= lastEquipmentLevel) {
								equipmentAlreadyOnCrew.add(equipment.archetype);
							}
						});
					}
				}

				let fuellist = playerData.player.character.items.filter(
					item => equipmentAlreadyOnCrew.has(item.archetype_id) && item.quantity === 1 && item.rarity > 1
				);

				this.setState({ fuellist, crew: allcrew });
			});
	}

	_exportCrew()
	{
		function downloadData(dataUrl) {
			let pom = document.createElement('a');
			pom.setAttribute('href', dataUrl);
			pom.setAttribute('download', "crew.csv");
	
			if (document.createEvent) {
				let event = document.createEvent('MouseEvents');
				event.initEvent('click', true, true);
				pom.dispatchEvent(event);
			}
			else {
				pom.click();
			}
		}

		let text = exportCrew(this.state.crew);
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`);
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
