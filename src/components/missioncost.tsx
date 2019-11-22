import React, { PureComponent } from 'react';

import CONFIG from './CONFIG';

type MissionCostProps = {
	mission_symbol?: string;
	cost: number;
	avg_cost?: number;
	mastery: number;
	chance_grade: number;
	name: string;
};

class MissionCost extends PureComponent<MissionCostProps> {
	render() {
		const is_known = this.props.cost > 0;
		const has_avg = this.props.avg_cost && this.props.avg_cost > 0;

		// TODO: name should be a Link to /missions/${mission_symbol}/
		return (
			<span>
				<span style={{ color: is_known ? 'inherit' : 'red' }}>{this.props.name}</span>{' '}
				<span style={{ display: 'inline-block' }}>
					<img src={`/media/icons/${CONFIG.MASTERY_LEVELS[this.props.mastery].imageUrl}.png`} height={14} />
				</span>
				{is_known && (
					<span>
						{' ('}
						<span style={{ display: 'inline-block' }}>
							<img src={`/media/icons/energy_icon.png`} height={14} />
						</span>
						{` ${this.props.cost}${has_avg ? `; avg. ${this.props.avg_cost.toFixed(2)}` : ''})`}
					</span>
				)}
			</span>
		);
	}
}

export default MissionCost;
