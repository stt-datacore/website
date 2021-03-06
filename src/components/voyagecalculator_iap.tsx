import React, { Component } from 'react';
import { Header, Button, Message, Grid, Icon, Form, Tab, Select, Dropdown, Checkbox, Modal, Image, Segment } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import {
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds,
	BonusCrew
} from '../utils/voyageutils';

import { applyCrewBuffs} from '../utils/crewutils';
import { mergeShips } from '../utils/shiputils';

import CrewPopup from '../components/crewpopup';

import CONFIG from './CONFIG';

type VoyageCalculatorProps = {
	playerData: any;
	voyageData: any;
	eventData: any;
};

enum CalculatorState {
	NotStarted,
	InProgress,
	Done
}

type VoyageCalculatorState = {
	bestShip: any;
	calcState: CalculatorState;
	crew: any[];
	result?: ICalcResult;
	includeFrozen: boolean;
	includeActive: boolean;
	activeEvent: string | undefined;
	peopleList: any;
	currentSelection: any[];
	searchDepth: number;
	extendsTarget: number;
};

class VoyageCalculator extends Component<VoyageCalculatorProps, VoyageCalculatorState> {
	constructor(props) {
		super(props);

		this.state = {
			bestShip: undefined,
			calcState: CalculatorState.NotStarted,
			crew: [],
			result: undefined,
			includeFrozen: false,
			includeActive: false,
			peopleList: undefined,
			currentSelection: [],
			activeEvent: undefined,
			searchDepth: 6,
			extendsTarget: 0
		};
	}

	async componentDidMount() {
		const { playerData, voyageData, eventData } = this.props;

		const [shipsResponse] = await Promise.all([
			fetch('/structured/ship_schematics.json')
		]);
		const allships = await shipsResponse.json();

		let ships = mergeShips(allships, playerData.player.character.ships);
		let bestShips = this._bestVoyageShip(ships, voyageData);

		let shuttleCrew = JSON.parse(JSON.stringify(voyageData.shuttle_crew));

		let crewlist = [];
		let peopleListDefault = [], peopleListAll = [];
		let fakeID = 1;

		playerData.player.character.crew.forEach(crew => {
			let crewman = JSON.parse(JSON.stringify(crew));
			crewman.id = fakeID++;

			// Voyage calculator looks for skills, range_min, range_max properties
			let skills = {};
			for (let skill in CONFIG.SKILLS) {
				if (crew[skill].core > 0)
					skills[skill] = {
						'core': crew[skill].core,
						'range_min': crew[skill].min,
						'range_max': crew[skill].max
					};
			}
			crewman.skills = skills;

			// Voyage roster generation looks for active_id property
			crewman.active_id = 0;
			if (crew.immortal === 0) {
				let shuttleCrewId = crew.symbol+','+crew.level+','+crew.equipment.join('');
				let shuttleIndex = shuttleCrew.indexOf(shuttleCrewId);
				if (shuttleIndex >= 0) {
					crewman.active_id = 1;
					shuttleCrew[shuttleIndex] = '';	// Clear this ID so that dupes are counted properly
				}
			}

			crewlist.push(crewman);

			// Populate exclusion lists
			let person = {
				key: crewman.id,
				value: crewman.id,
				image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crewman.imageUrlPortrait}` },
				text: crewman.name
			};
			peopleListAll.push(person);
			if (crew.immortal === 0) peopleListDefault.push(person);
		});

		let peopleList = {
			'all': peopleListAll.sort((a, b) => a.text.localeCompare(b.text)),
			'default': peopleListDefault.sort((a, b) => a.text.localeCompare(b.text))
		};

		let bonusCrew = this._bonusCrewForCurrentEvent(eventData, crewlist);
		if (bonusCrew) {
			this.setState({ activeEvent: bonusCrew.eventName, currentSelection: bonusCrew.crewIds });
		}

		this.setState({ bestShip: bestShips[0], crew: crewlist, peopleList });
	}

	render() {
		const { playerData, voyageData } = this.props;
		const { bestShip, crew } = this.state;

		if (!bestShip)
			return (<></>);

		let curVoy = '';
		let currentVoyage = false;
		if (voyageData.voyage_descriptions && voyageData.voyage_descriptions.length > 0) {
			curVoy = `${CONFIG.SKILLS[voyageData.voyage_descriptions[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[voyageData.voyage_descriptions[0].skills.secondary_skill]
			} secondary`;
		}
		if (voyageData.voyage && voyageData.voyage.length > 0) {
			curVoy = `${CONFIG.SKILLS[voyageData.voyage[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[voyageData.voyage[0].skills.secondary_skill]
			} secondary`;
			currentVoyage = voyageData.voyage[0].state === 'started';
		}

		let peopleListStyle = this.state.includeFrozen ? 'all' : 'default';

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
							options={this.state.peopleList[peopleListStyle]}
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
							label='Consider active (on shuttles) crew'
							checked={this.state.includeActive}
							onChange={(e, { checked }) => this.setState({ includeActive: checked })}
						/>

						<Form.Field
							control={Checkbox}
							label='Consider frozen (vaulted) crew'
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
									let pcrew = crew.find(c => c.id === entry.choice);
									let acrew = playerData.player.character.crew.find(c => c.symbol === pcrew.symbol);
									return (
										<li key={idx}>
											{voyageData.voyage_descriptions[0].crew_slots[entry.slotId].name}
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
                        <Image centered src='/media/voyage-wait-icon.gif' />
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

	_bestVoyageShip(ships: any[], voyageData: any): any[] {
		let voyage = voyageData.voyage_descriptions[0];

		let consideredShips: any[] = [];
		ships.forEach((ship: any) => {
			let entry = {
				ship: ship,
				score: ship.antimatter
			};

			if (ship.traits.find((trait: any) => trait == voyage.ship_trait)) {
				entry.score += 150; // TODO: where is this constant coming from (Config)?
			}

			consideredShips.push(entry);
		});

		consideredShips = consideredShips.sort((a, b) => b.score - a.score);

		return consideredShips;
	}

	_bonusCrewForCurrentEvent(eventData: any[], crewlist: any[]): BonusCrew | undefined {
		if (!eventData || eventData.length == 0)
			return undefined;

		let activeEvents = eventData.filter((ev) => (ev.seconds_to_end > 0 && ev.seconds_to_start < 86400));
		if (activeEvents.length == 0)
			return undefined;

		let activeEvent = activeEvents.sort((a, b) => (a.seconds_to_start - b.seconds_to_start))[0];

		let result = new BonusCrew();
		result.eventName = activeEvent.name;

		let eventCrew: { [index: string]: any } = {};
		if (activeEvent.content) {
			if (activeEvent.content.crew_bonuses) {
				for (let symbol in activeEvent.content.crew_bonuses) {
					eventCrew[symbol] = activeEvent.content.crew_bonuses[symbol];
				}
			}

			// For skirmish events
			if (activeEvent.content.bonus_crew) {
				for (let symbol in activeEvent.content.bonus_crew) {
					eventCrew[symbol] = activeEvent.content.bonus_crew[symbol];
				}
			}

			// For expedition events
			if (activeEvent.content.special_crew) {
				activeEvent.content.special_crew.forEach((symbol: string) => {
					eventCrew[symbol] = symbol;
				});
			}

			// TODO: there's also bonus_traits; should we bother selecting crew with those? It looks like you can use voyage crew in skirmish events, so it probably doesn't matter
			if (activeEvent.content.shuttles) {
				activeEvent.content.shuttles.forEach((shuttle: any) => {
					for (let symbol in shuttle.crew_bonuses) {
						eventCrew[symbol] = shuttle.crew_bonuses[symbol];
					}
				});
			}
		}

		for (let symbol in eventCrew) {
			let foundCrew = crewlist.find((crew: any) => crew.have && (crew.symbol === symbol));
			if (foundCrew) {
				result.crewIds.push(foundCrew.crew_id || foundCrew.id);
			}
		}

		return result;
	}

	_packVoyageOptions(shipAM: number) {
		const { voyageData } = this.props;
		const { crew } = this.state;

		let filteredRoster = crew.filter(crewman => {
			// Filter out buy-back crew
			if (crewman.buyback) {
				return false;
			}

			if (!this.state.includeActive && crewman.active_id > 0) {
				return false;
			}

			if (!this.state.includeFrozen && crewman.immortal > 0) {
				return false;
			}

			// Filter out crew the user has chosen not to include
			if (this.state.currentSelection.length > 0 && this.state.currentSelection.some(ignored => ignored === (crewman.crew_id || crewman.id))) {
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
			voyage_description: voyageData.voyage_descriptions[0],
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