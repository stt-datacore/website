import React, { PureComponent } from 'react';

import CONFIG from './CONFIG';

type MissionCostProps = {
	mission_symbol?: string;
	cost: number;
	avg_cost?: number;
	mastery: number;
	chance_grade: number;
	name: string;
	cadet?: boolean;
	hideCost?: boolean;
};

class MissionCost extends PureComponent<MissionCostProps> {
	render() {
		const is_known = this.props.cost > 0;
		const has_avg = this.props.avg_cost && this.props.avg_cost > 0;
		const { cadet } = this.props;

		// TODO: name should be a Link to /missions/${mission_symbol}/
		return (
			<span>
				<span style={{ color: is_known ? 'inherit' : 'red' }}>{this.props.name}</span>{' '}
				<span style={{ display: 'inline-block' }}>
					<img title={CONFIG.MASTERY_LEVELS[this.props.mastery].name} src={`${process.env.GATSBY_ASSETS_URL}atlas/${CONFIG.MASTERY_LEVELS[this.props.mastery].imageUrl}.png`} height={14} />
				</span>
				{is_known && !this.props.hideCost && (
					<span>
						{' ('}
						<span style={{ display: 'inline-block' }}>
							{!cadet && <img title={"Chronitons"} src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />}
							{cadet && <img title={"Cadet challenge ticket"} src={`${process.env.GATSBY_ASSETS_URL}atlas/cadet_icon.png`} height={14} />}
						</span>

						{` ${this.props.cost}${has_avg ? `; avg. ${this.props.avg_cost?.toFixed(2)}` : ''})`}
					</span>
				)}
			</span>
		);
	}
}

export default MissionCost;
