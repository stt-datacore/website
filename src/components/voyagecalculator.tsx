import React, { Component } from 'react';
import { Header, Button, Message, Grid, Icon, Form, Tab, Select, Dropdown, Checkbox, Modal, Image, Segment } from 'semantic-ui-react';
import * as localForage from 'localforage';
import { isMobile } from 'react-device-detect';

import ItemDisplay from '../components/itemdisplay';
import { VoyageStats } from '../components/voyagestats';
import {
	ICalcResult,
	calculateVoyage,
	abortVoyageCalculation,
	formatTimeSeconds,
	BonusCrew
} from '../utils/voyageutils';

import { applyCrewBuffs} from '../utils/crewutils';
import { mergeShips } from '../utils/shiputils';

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

const searchDepths = [
	 'fastest', // 4
	 'faster', // 5
	 'normal', // 6
	 'slower', // 7
	 'slowest', // 8
	 'for supercomputers', // 9
];

type VoyageCalculatorState = {
	bestShip: any;
	calcState: CalculatorState;
	crew: any[];
	results: ICalcResult[];
	includeFrozen: boolean;
	includeActive: boolean;
	activeEvent: string | undefined;
	peopleList: any;
	currentSelection: any[];
	searchDepth: number;
	extendsTarget: number;
	telemetryOptOut: boolean;
	showCalculator: boolean;
	activeCalculator: number;
};

class VoyageCalculator extends Component<VoyageCalculatorProps, VoyageCalculatorState> {
	constructor(props) {
		super(props);

		this.state = {
			bestShip: undefined,
			calcState: CalculatorState.NotStarted,
			crew: [],
			results: [],
			includeFrozen: false,
			includeActive: false,
			peopleList: undefined,
			currentSelection: [],
			activeEvent: undefined,
			searchDepth: isMobile ? 4 : 6,
			extendsTarget: 0,
			telemetryOptOut: false,
			showCalculator: false,
			activeCalculator: 0
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

		localForage.getItem<boolean>('telemetryOptOut', (err, value) => {
			if (err) {
				console.error(err);
			} else {
				this.setState({ telemetryOptOut: value });
			}
		});

	}

	componentDidUpdate(_, prevState) {
		try {
			const { calcState, crew, telemetryOptOut, results } = this.state;
			if (prevState.calcState === CalculatorState.InProgress && calcState === CalculatorState.Done && results.length > 0) {
				if (!telemetryOptOut) {
					fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry`, {
						method: 'post',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							type: 'voyage',
							data: results[results.length - 1].entries.map((entry) => {
								return entry.choice.symbol;
							})
						})
					});
				}
			}
		} catch(err) {
			console.log('An error occurred while sending telemetry', err);
		}
	}

	setTelemetryOptOut(value) {
		console.log(value);
		localForage.setItem<boolean>('telemetryOptOut', value);
		this.setState({ telemetryOptOut: value });
	}

	_renderCurrentVoyage(data) {
		return (
			<div>
				<VoyageStats
					voyageData={data}
					ships={this.props.playerData.player.character.ships}
					showPanels={['estimate']}
				/>
				<br/>
				<Button onClick={() => this.setState({showCalculator : true})}>Continue to calculator</Button>
			</div>
		);
	}

	render() {
		const { playerData, voyageData } = this.props;
		const { activeCalculator, calcState, showCalculator, bestShip, crew, results } = this.state;

		if (!showCalculator && voyageData.voyage.length > 0)
			return (this._renderCurrentVoyage(voyageData.voyage[0]));

		if (!bestShip)
			return (<></>);

		let currentVoyage = false;
		let curVoy = '';

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
				{currentVoyage &&
					<p>
						It looks like you already have a voyage started!
					</p>
				}
				<Message attached>
					VOYAGE CALCULATOR! Configure the settings below, then click on the "Calculate" button to see the recommendations. Current voyage
					is <b>{curVoy}</b>.
				</Message>
				<Form className='attached fluid segment'>
					<Form.Group inline>
						<Form.Field
							control={Select}
							label='Search depth'
							options={
								Array.from(
									searchDepths,
									(name, idx) => ({
										key: `${idx+4}`,
										text: `${idx+4} (${name})`,
										value: idx+4
									}))
							}
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

						<Form.Field
							control={Checkbox}
							label={<label>Collect anonymous stats <small>(Statistics are used to improve DataCore and power our Voyage Hall of Fame)</small></label>}
							checked={!this.state.telemetryOptOut}
							onChange={(e, { checked }) => this.setTelemetryOptOut(!checked) }
						/>
					</Form.Group>
					<Form.Group>
						<Form.Button
							primary
							onClick={() => this._calcVoyageData(bestShip.score)}
							disabled={this.state.calcState === CalculatorState.InProgress}>
							Calculate best crew selection
						</Form.Button>
						{currentVoyage &&
							<Form.Button
								onClick={() => this.setState({ showCalculator : false })}
								disabled={this.state.calcState === CalculatorState.InProgress}>
								Return to current voyage
							</Form.Button>
						}
					</Form.Group>
				</Form>
					{results.length === 1 &&
						<VoyageStats
							voyageData={this._resultToVoyageData(results[0])}
							estimate={results[0].estimate}
							ships={[bestShip]}
							showPanels={['crew']}
						/>
					}
					{
						results.length > 1 &&
						<Tab
							menu={{ attached: 'bottom', secondary: true, pointing: true }}
							panes={Array.from(results, result => ({
									menuItem: result.name,
									render: () => {
										return (
											<VoyageStats
												voyageData={this._resultToVoyageData(result)}
												estimate={result.estimate}
												ships={[bestShip]}
												showPanels={['crew']}
												/>);
									}
								}))
							}
							style={{ marginTop: '1em' }}
							activeIndex={activeCalculator}
							onTabChange={(e, { activeIndex }) => this.setState({activeCalculator : activeIndex})}
						/>
					}
				<Modal basic size='tiny' open={this.state.calcState === CalculatorState.InProgress}>
                    <Modal.Content image>
                        <Image centered src='/media/voyage-wait-icon.gif' />
                    </Modal.Content>
                    <Modal.Description>
                        <Segment basic textAlign={"center"}>
                            <Button onClick={e => { abortVoyageCalculation(), this.setState({calcState : CalculatorState.Done})}}>Abort</Button>
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
			if (ship.owned) {
				let entry = {
					ship: ship,
					score: ship.antimatter
				};

				if (ship.traits.find((trait: any) => trait == voyage.ship_trait)) {
					entry.score += 150; // TODO: where is this constant coming from (Config)?
				}

				consideredShips.push(entry);
			}
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
		const { crew, searchDepth } = this.state;

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
			name: `Original (${searchDepths[searchDepth-4]})`,
			worker: 'IAmPicard',
			searchDepth: searchDepth,
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
		//let entries  = this.state.result ? this.state.result.entries : [];

		const updateState = (calcResult, finished) => {
			let added = false;
			let results = this.state.results.map(result => {
				if (result.name == options.name) {
					added = true;
					return calcResult;
				} else
					return result;
			});

			if (!added)
				results = [...this.state.results, calcResult];


			this.setState({
				results: results,
				calcState: finished ? CalculatorState.Done : CalculatorState.InProgress,
				activeCalculator: results.length - 1
			});
		};

		calculateVoyage(
			options,
			calcResult => updateState(calcResult, false),
				//if (entries.every((entry, index) => calcResult.entries[index].id == entry.id)) {
			calcResult => updateState(calcResult, true)
		);
	}

	_resultToVoyageData(result, voyage_description) {
			let { playerData } = this.props;
			let { crew, bestShip } = this.state;
			let data = { ...this.props.voyageData.voyage_descriptions[0] };

			result.entries.forEach((entry, idx) => {
				let acrew = playerData.player.character.crew.find(c => c.symbol === entry.choice.symbol);
				data.crew_slots[entry.slotId].crew = acrew;
			});

			data.skill_aggregates = result.aggregates;
			data.max_hp = result.startAM;
			data.state = 'pending';
			return data;
	}
}

export default VoyageCalculator;
