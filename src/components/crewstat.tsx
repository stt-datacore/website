import React, { PureComponent } from 'react';
import { Skill } from '../model/crew';

type CrewStatProps = {
	skill_name: string;
	scale?: number;
	data?: Skill;
	proficiencies?: boolean;
};

class CrewStat extends PureComponent<CrewStatProps> {
	render() {
		if (!this.props.data) {
			return <span />;
		}

		const stats = this.props.data;
		const scale = this.props.scale || 1;
		const { proficiencies } = this.props;

		return (
			<div
				style={{
					display: 'inline-grid',
					width: 'max-content',
					gridTemplateColumns: `${2.5 * scale}em auto`,
					gridTemplateAreas: `'icon stats'`,
					gridGap: `${0.2 * scale}em`,
					paddingTop: `${0.2 * scale}em`,
					paddingRight: `${0.4 * scale}em`
				}}>
				<div style={{ gridArea: 'icon' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${this.props.skill_name}.png`} style={{ height: `${2 * scale}em` }} />
				</div>
				{!proficiencies &&
				<div style={{ gridArea: 'stats' }}>
					<span style={{ fontWeight: 'bolder', fontSize: `${1.5 * scale}em` }}>{stats.core}</span>
					<span style={{ fontWeight: 'normal', fontSize: `${scale}em` }}>
						+({stats.range_min}-{stats.range_max})
					</span>
				</div>}
				{proficiencies &&
				<div style={{ gridArea: 'stats' }}>
					<span style={{ fontWeight: 'bolder', fontSize: `${1.5 * scale}em` }}>{stats.range_min}-{stats.range_max}</span>
				</div>}
			</div>
		);
	}
}

export default CrewStat;
