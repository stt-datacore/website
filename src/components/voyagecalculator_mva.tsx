import React, { Component } from 'react';
import { Header, Button, Message, Icon, Form, Tab, Select, Dropdown, Checkbox, Modal, Image, Segment, Table } from 'semantic-ui-react';
import { Voyagers, VoyagersAnalyzer } from '../utils/voyagers';
import { ChewableEstimator } from '../utils/voyagers-chewable';
import {
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds,
	BonusCrew
} from '../utils/voyageutils';

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
	resultMVA?: any;
	resultIAP?: any;
	resultIAPBot?: any;
	worker: any;
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
			resultMVA: undefined,
			resultIAP: undefined,
			resultIAPBot: undefined,
			worker: undefined,
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
		const { resultMVA, resultIAP, resultIAPBot } = this.state;

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
							label='Search depth (Classic only)'
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
					</Form.Group>

					<Form.Group inline>
						<Form.Field>
							<label>Best ship</label>
							<b>
								{bestShip.ship.name} ({bestShip.antimatter} Antimatter)
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

					<Table striped celled compact='very'>
						<Table.Body>
							<Table.Row>
								<Table.Cell>Calculate</Table.Cell>
								<Table.Cell>
									<Form.Button
										primary
										onClick={() => this._calcVoyageDataMVA()}
										disabled={this.state.calcState === CalculatorState.InProgress}>
										Experimental
									</Form.Button>
								</Table.Cell>
								<Table.Cell>
									<Form.Button
										primary
										onClick={() => this._calcVoyageDataIAP()}
										disabled={this.state.calcState === CalculatorState.InProgress}>
										Classic
									</Form.Button>
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Bot Estimate</Table.Cell>
								<Table.Cell>
									{resultMVA && (
										<div>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
												{this._formatTime((resultMVA.estimate.refills[0].result*3+resultMVA.estimate.refills[0].safeResult)/4)}
											</span>{' '}
											(99% worst case {this._formatTime(resultMVA.estimate.refills[0].saferResult)})
										</div>
									)}
								</Table.Cell>
								<Table.Cell>
									{resultIAPBot && (
										<div>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
												{this._formatTime((resultIAPBot.estimate.refills[0].result*3+resultIAPBot.estimate.refills[0].safeResult)/4)}
											</span>{' '}
											(99% worst case {this._formatTime(resultIAPBot.estimate.refills[0].saferResult)})
										</div>
									)}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Classic Estimate</Table.Cell>
								<Table.Cell>
								</Table.Cell>
								<Table.Cell>
									{resultIAP && (
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
											{this._formatTime(resultIAP.score)}
										</span>
									)}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Next Dilemma</Table.Cell>
								<Table.Cell>
									{resultMVA && (
										<span>{resultMVA.estimate.refills[0].dilChance}% chance to reach {resultMVA.estimate.refills[0].lastDil}h dilemma</span>
									)}
								</Table.Cell>
								<Table.Cell>
									{resultIAPBot && (
										<span>{resultIAPBot.estimate.refills[0].dilChance}% chance to reach {resultIAPBot.estimate.refills[0].lastDil}h dilemma</span>
									)}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>First Refill</Table.Cell>
								<Table.Cell>
									{resultMVA && (
										<span>
											Refill with {resultMVA.estimate.refills[1].refillCostResult} dilithium for a
											<br/>{resultMVA.estimate.refills[1].dilChance}% chance to reach the {resultMVA.estimate.refills[1].lastDil}h dilemma
										</span>
									)}
								</Table.Cell>
								<Table.Cell>
									{resultIAPBot && (
										<span>
											Refill with {resultIAPBot.estimate.refills[1].refillCostResult} dilithium for a
											<br/>{resultIAPBot.estimate.refills[1].dilChance}% chance to reach the {resultIAPBot.estimate.refills[1].lastDil}h dilemma
										</span>
									)}
								</Table.Cell>
							</Table.Row>
							{voyageData.voyage_descriptions[0].crew_slots.map((slot, idx) => {
								let temp, crewMVA, crewIAP;
								if (resultMVA) {
									temp = crew.find(c => c.id === resultMVA.lineup.crew[idx].id);
									crewMVA = playerData.player.character.crew.find(c => c.symbol === temp.symbol);
								}
								if (resultIAP) {
									temp = crew.find(c => c.id === resultIAP.entries[idx].choice);
									crewIAP = playerData.player.character.crew.find(c => c.symbol === temp.symbol);
								}
								return (
									<Table.Row key={idx}>
										<Table.Cell>
											{slot.name}
										</Table.Cell>
										<Table.Cell>
											{resultMVA && (
												<CrewPopup crew={crewMVA} />
											)}
										</Table.Cell>
										<Table.Cell>
											{resultIAP && (
												<CrewPopup crew={crewIAP} />
											)}
										</Table.Cell>
									</Table.Row>
								);
							})}
							<Table.Row>
								<Table.Cell>Skills</Table.Cell>
								<Table.Cell>
									{resultMVA && (
										<Table basic='very' celled collapsing>
											<Table.Body>
												<Table.Row>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.command_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_command_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_security_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.security_skill)}</Table.Cell>
												</Table.Row>
												<Table.Row>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.diplomacy_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_diplomacy_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_medicine_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.medicine_skill)}</Table.Cell>
												</Table.Row>
												<Table.Row>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.engineering_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_engineering_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_science_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultMVA.lineup.skills.science_skill)}</Table.Cell>
												</Table.Row>
											</Table.Body>
										</Table>
									)}
								</Table.Cell>
								<Table.Cell>
									{resultIAPBot && (
										<Table basic='very' celled collapsing>
											<Table.Body>
												<Table.Row>
													<Table.Cell>{Math.floor(resultIAPBot.skills.command_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_command_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_security_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultIAPBot.skills.security_skill)}</Table.Cell>
												</Table.Row>
												<Table.Row>
													<Table.Cell>{Math.floor(resultIAPBot.skills.diplomacy_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_diplomacy_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_medicine_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultIAPBot.skills.medicine_skill)}</Table.Cell>
												</Table.Row>
												<Table.Row>
													<Table.Cell>{Math.floor(resultIAPBot.skills.engineering_skill)}</Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_engineering_skill.png`} /></Table.Cell>
													<Table.Cell><img width={16} src={`${process.env.GATSBY_ASSETS_URL}/atlas/icon_science_skill.png`} /></Table.Cell>
													<Table.Cell>{Math.floor(resultIAPBot.skills.science_skill)}</Table.Cell>
												</Table.Row>
											</Table.Body>
										</Table>
									)}
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Total Antimatter</Table.Cell>
								<Table.Cell>{resultMVA && (<span>{bestShip.antimatter+resultMVA.lineup.antimatter}</span>)}</Table.Cell>
								<Table.Cell>{resultIAPBot && (<span>{bestShip.antimatter+(resultIAPBot.bonusTraits*25)}</span>)}</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table>
				</Form>
				<Modal basic size='tiny' open={this.state.calcState === CalculatorState.InProgress}>
                    <Modal.Content image>
                        <Image centered src='/media/voyage-wait-icon.gif' />
                    </Modal.Content>
                    <Modal.Description>
                        <Segment basic textAlign={"center"}>
                            <Button onClick={() => this._abort()}>Abort</Button>
                        </Segment>
                    </Modal.Description>
                </Modal>
			</div>
		);
	}

	_abort(e) {
		this.state.worker.terminate();
		this.setState({calcState : CalculatorState.Done});
		this._reassessIAPResult().then((result) => {
			if (result) this.setState({ resultIAPBot: result });
		});
	}

	_bestVoyageShip(ships: any[], voyageData: any): any[] {
		let voyage = voyageData.voyage_descriptions[0];

		let consideredShips: any[] = [];
		ships.forEach((ship: any) => {
			let entry = {
				ship: ship,
				antimatter: ship.antimatter
			};

			if (ship.traits.find((trait: any) => trait == voyage.ship_trait)) {
				entry.antimatter += 150; // TODO: where is this constant coming from (Config)?
			}

			consideredShips.push(entry);
		});

		consideredShips = consideredShips.sort((a, b) => b.antimatter - a.antimatter);

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

	_calcVoyageDataMVA() {
		const { voyageData } = this.props;
		const { crew, bestShip } = this.state;

		const voyage_description = voyageData.voyage_descriptions[0];

		// Config is for showing progress (optional)
		let config = {
			'progressCallback': false,
			'debugCallback': false /*(message) => { console.log(message); }*/
		};
		// Voyage data is required
		let voyage = {
			'skills': voyage_description.skills,
			'crew_slots': voyage_description.crew_slots,
			'ship_trait': voyage_description.ship_trait
		};
		// Function to filter out crew you don't want to consider (optional)
		let filter = (crewman) => this._filterConsideredCrew(crewman);
		// Options modify the calculation algorithm (optional)
		let options = {
			'initBoosts': { 'primary': 3.5, 'secondary': 2.5, 'other': 1.0 },
			'searchVectors': 4,
			'luckFactor': false,
			'favorSpecialists': false
		};

		this.setState({
			calcState: CalculatorState.InProgress
		});

		// Assemble lineups that match input
		const voyagers = new Voyagers(crew, config);
		voyagers.assemble(voyage, filter, options)
			.then((lineups) => {
				// Now figure out which lineup is "best"
				const analyzer = new VoyagersAnalyzer(voyage, bestShip, lineups);
				let estimator = (config) => ChewableEstimator(config);
				let sorter = (a, b) => this._chewableSorter(a, b);
				analyzer.analyze(estimator, sorter)
					.then(([lineup, estimate, log]) => {
						this.setState({
							resultMVA: { lineup, estimate, log },
							calcState: CalculatorState.Done
						});
					});
			})
			.catch((error) => {
				console.log(error);
			});
	}

	_filterConsideredCrew(crewman: any) {
		if (!this.state.includeActive && crewman.active_id > 0) {
			return true;
		}

		if (!this.state.includeFrozen && crewman.immortal > 0) {
			return true;
		}

		// Filter out crew the user has chosen not to include
		if (this.state.currentSelection.length > 0 && this.state.currentSelection.some(ignored => ignored === (crewman.crew_id || crewman.id))) {
			return true;
		}

		return false;
	}

	_chewableSorter(a: any, b: any) {
		const playItSafe = false;

		let aEstimate = a.estimate.refills[0];
		let bEstimate = b.estimate.refills[0];

		// Return best average (w/ DataCore pessimism) by default
		let aAverage = (aEstimate.result*3+aEstimate.safeResult)/4;
		let bAverage = (bEstimate.result*3+bEstimate.safeResult)/4;

		if (playItSafe || aAverage == bAverage)
			return bEstimate.saferResult - aEstimate.saferResult;

		return bAverage - aAverage;
	}

	_formatTime(time: number) {
		let hours = Math.floor(time);
		let minutes = Math.floor((time-hours)*60);
		return hours+"h " +minutes+"m";
	}

	_calcVoyageDataIAP() {
		const { voyageData } = this.props;
		const { crew, bestShip } = this.state;

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

		let options = {
			searchDepth: this.state.searchDepth,
			extendsTarget: this.state.extendsTarget,
			shipAM: bestShip.antimatter,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: voyageData.voyage_descriptions[0],
			roster: filteredRoster
		};

		let worker = calculateVoyage(
			options,
			calcResult => {
				this.setState({
					resultIAP: calcResult,
					resultIAPBot: undefined,
					calcState: CalculatorState.InProgress
				});
			},
			calcResult => {
				this.setState({
					resultIAP: calcResult,
					calcState: CalculatorState.Done
				});
				this._reassessIAPResult().then((result) => {
					if (result) this.setState({ resultIAPBot: result });
				});
			}
		);
		this.setState({ worker });
	}

	_reassessIAPResult() {
		const { voyageData } = this.props;
		const { crew, bestShip, resultIAP } = this.state;

		if (!resultIAP) return false;

		const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
							'engineering_skill', 'science_skill', 'medicine_skill'];

		let skills = {
			'command_skill': 0, 'diplomacy_skill': 0, 'security_skill': 0,
			'engineering_skill': 0, 'science_skill': 0, 'medicine_skill': 0
		};
		let iSlot = 0, bonusTraits = 0;
		resultIAP.entries.forEach((entry) => {
			let crewman = crew.find(c => c.id === entry.choice);
			let trait = voyageData.voyage_descriptions[0].crew_slots[iSlot++].trait;
			if (crewman.traits.indexOf(trait) >= 0) bonusTraits++;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				if (!crewman.skills[SKILL_IDS[iSkill]]) continue;
				let skill = crewman.skills[SKILL_IDS[iSkill]];
				let dProficiency = skill.range_min+(skill.range_max-skill.range_min)/2;
				let dSkillScore = skill.core+dProficiency;
				skills[SKILL_IDS[iSkill]] += dSkillScore;
			}
		});

		let ps, ss, os = 0, others = [];
		for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
			if (SKILL_IDS[iSkill] == voyageData.voyage_descriptions[0].skills.primary_skill)
				ps = skills[SKILL_IDS[iSkill]];
			else if (SKILL_IDS[iSkill] == voyageData.voyage_descriptions[0].skills.secondary_skill)
				ss = skills[SKILL_IDS[iSkill]];
			else {
				os += skills[SKILL_IDS[iSkill]];
				others.push(skills[SKILL_IDS[iSkill]]);
			}
		}

		let config = {
			'startAm': bestShip.antimatter + (bonusTraits*25),
			'ps': ps,
			'ss': ss,
			'os': os,
			'others': others
		};

		return new Promise((resolve, reject) => {
			let estimate = ChewableEstimator(config);
			resolve({
				skills,
				bonusTraits,
				estimate
			});
		});
	}
}

export default VoyageCalculator;