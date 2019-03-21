import React, { Component } from 'react';
import { Header, Button } from 'semantic-ui-react';

import {
	calculateBuffConfig,
	bonusCrewForCurrentEvent,
	bestVoyageShip,
	ICalcResult,
	calculateVoyage,
	formatTimeSeconds
} from '../utils/voyageutils';

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
	calcState: CalculatorState;
	result?: ICalcResult;
};

class VoyageCalculator extends Component<VoyageCalculatorProps, VoyageCalculatorState> {
	constructor(props) {
		super(props);

		const { playerData } = props;

		let buffConfig = calculateBuffConfig(playerData.player);
		console.log(buffConfig);

		let eventBonus = bonusCrewForCurrentEvent(playerData.player);
		console.log(eventBonus);

		let bestShips = bestVoyageShip(playerData.player);

		this.state = {
			bestShip: bestShips[0],
			calcState: CalculatorState.NotStarted,
			result: undefined
		};
	}

	render() {
		const { playerData } = this.props;
		const { bestShip, calcState } = this.state;

		let curVoy = '';
		if (playerData.player.character.voyage_descriptions && playerData.player.character.voyage_descriptions.length > 0) {
			curVoy = `${CONFIG.SKILLS[playerData.player.character.voyage_descriptions[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[playerData.player.character.voyage_descriptions[0].skills.secondary_skill]
			} secondary`;
		}
		if (playerData.player.character.voyage && playerData.player.character.voyage.length > 0) {
			curVoy = `${CONFIG.SKILLS[playerData.player.character.voyage[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[playerData.player.character.voyage[0].skills.secondary_skill]
			} secondary`;
		}

		let stillLoading = calcState === CalculatorState.InProgress;

		return (
			<div>
				<Header as='h4'>Hello, {playerData.player.display_name}</Header>
				<p>Current voyage is {curVoy}</p>
				<p>
					Best ship:{' '}
					<b>
						{bestShip.ship.name} ({bestShip.score} Antimatter)
					</b>
				</p>

				<Button style={{ marginBottom: '1em' }} onClick={() => this._calcVoyageData(bestShip.score)} primary content='Calculate' />

				{this.state.result && (
					<React.Fragment>
						<p>
							Estimated duration: <b>{formatTimeSeconds(this.state.result.score * 60 * 60)}</b>
						</p>
						<ul>
							{this.state.result.entries.map((entry, idx) => {
                                let crew = playerData.player.character.crew.find(c => c.id === entry.choice);
								return <li key={idx}>
									{playerData.player.character.voyage_descriptions[0].crew_slots[entry.slotId].name}
                                    {'  :  '}
                                    <CrewPopup crew={crew} />
                                </li>;
                            }
							)}
						</ul>
					</React.Fragment>
				)}

				{stillLoading && <div className='ui medium centered text active inline loader'>Calculating...</div>}
			</div>
		);
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
