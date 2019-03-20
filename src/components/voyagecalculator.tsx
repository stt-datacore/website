import React, { Component } from 'react';
import { Header, Button } from 'semantic-ui-react';
import { StaticQuery, graphql } from 'gatsby';

import { calculateBuffConfig, bonusCrewForCurrentEvent, bestVoyageShip, calculateVoyage } from '../utils/voyageutils';

import CONFIG from './CONFIG';

type VoyageCalculatorProps = {
	playerData: any;
};

class VoyageCalculator extends Component<VoyageCalculatorProps> {
	constructor(props) {
		super(props);
	}

	render() {
        const { playerData } = this.props;
        
        let buffConfig = calculateBuffConfig(playerData.player);
        console.log(buffConfig);

        let eventBonus = bonusCrewForCurrentEvent(playerData.player);
        console.log(eventBonus);

        let bestShips = bestVoyageShip(playerData.player);
        console.log(bestShips);

        let bestShip = bestShips[0];

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
        
        //let allcrew = data.allCrewJson.edges.map(({ node }, index) => node);

		return (
			<StaticQuery
				query={graphql`
					query {
						allCrewJson {
							edges {
								node {
									name
									archetype_id
								}
							}
						}
					}
				`}
				render={data => (
					<div>
						<Header as='h4'>Hello, {playerData.player.display_name}</Header>
                        <p>Current voyage is {curVoy}</p>
                        <p>Best ship: <b>{bestShip.ship.name} ({bestShip.score} Antimatter)</b></p>

                        <Button onClick={() => this._calcVoyageData(bestShip.score)} primary content='Calculate' />
					</div>
				)}
			/>
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
        console.log(options);

		calculateVoyage(
			options,
			({entries, score}) => {
				console.log({
					crewSelection: entries,
					estimatedDuration: score,
					state: 'inprogress'
				});
			},
			({entries, score}) => {
				console.log({
					crewSelection: entries,
					estimatedDuration: score,
					state: 'done'
				});
			}
		);
    }
}

export default VoyageCalculator;
