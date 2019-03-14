import React, { Component } from 'react';

import { graphql } from 'gatsby';

import CONFIG from './CONFIG';

type MissionCostProps = {
	mission?: any;
	mastery: number;
	chance_grade: number;
	name: string;
};

class MissionCost extends Component<MissionCostProps> {
	render() {
		const is_known = this.props.mission;

		return (
			<span>
				<span style={{ color: is_known ? 'inherit': 'red' }}>{this.props.name}</span>
				{' '}
				<span style={{ display: 'inline-block' }}>
					<img src={`/media/icons/${CONFIG.MASTERY_LEVELS[this.props.mastery].imageUrl}.png`} height={14} />
				</span>
				{is_known && this.renderCost()}
			</span>
		);
	}

	renderCost() {
		let cost = this.props.mission.mastery_levels[this.props.mastery].energy_cost;

		return (
			<span>
				{' ('}
				<span style={{ display: 'inline-block' }}>
					<img src={`/media/icons/energy_icon.png`} height={14} />
				</span>
				{` ${cost})`}
			</span>
		);
	}
}

export default MissionCost;

export const query = graphql`
	fragment MissionsFragment on QuestsJson {
		mastery_levels {
			energy_cost
		}
	}
`;
