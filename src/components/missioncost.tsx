import React, { Component } from 'react';

import CONFIG from './CONFIG';

type MissionCostProps = {
	mission_symbol?: string;
	cost: number;
	mastery: number;
	chance_grade: number;
	name: string;
};

class MissionCost extends Component<MissionCostProps> {
	render() {
		const is_known = this.props.cost > 0;

		// TODO: name should be a Link to /missions/${mission_symbol}/
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
		return (
			<span>
				{' ('}
				<span style={{ display: 'inline-block' }}>
					<img src={`/media/icons/energy_icon.png`} height={14} />
				</span>
				{` ${this.props.cost})`}
			</span>
		);
	}
}

export default MissionCost;