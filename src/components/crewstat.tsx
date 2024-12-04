import React, { PureComponent } from 'react';
import { Skill } from '../model/crew';

type CrewStatProps = {
	skill_name: string;
	scale?: number;
	data?: Skill;
	proficiencies?: boolean;
	quipmentMode?: boolean;
	style?: React.CSSProperties;
	vertical?: boolean;
};

class CrewStat extends PureComponent<CrewStatProps> {
	render() {
		let stats = { ...this.props.data };
		if ("min" in stats) {
			stats.range_min = stats['min'] as number;
		}
		if ("max" in stats) {
			stats.range_max = stats['max'] as number;
		}
		const scale = this.props.scale || 1;
		const { proficiencies, quipmentMode, vertical } = this.props;

		return (
			<div style={this.props.style}>
			<div
				style={{
					display: 'inline-grid',
					width: 'max-content',
					textAlign: vertical ? 'center' : undefined,
					gridTemplateColumns: vertical ? `auto` : `${2.5 * scale}em auto auto`,
					gridTemplateAreas: vertical ? `'icon' 'stats' 'profs' 'crits'` : `'icon stats profs' 'icon crits crits'`,
					gridGap: `${0.2 * scale}em`,
					paddingTop: `${0.2 * scale}em`,
					paddingRight: vertical ? '0' : `${0.4 * scale}em`,
				}}>
				<div style={{ gridArea: 'icon' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${this.props.skill_name}.png`} style={{ height: `${2 * scale}em` }} />
				</div>
				{!!stats && (
					<React.Fragment>
						{!proficiencies &&
						<React.Fragment>
							<div style={{ gridArea: 'stats' }}>
								<span style={{ fontWeight: 'bolder', fontSize: `${1.5 * scale}em` }}>{stats.core}</span>
							</div>
							<div style={{ gridArea: 'profs' }}>
								<span style={{ fontWeight: 'normal', fontSize: `${scale}em` }}>
									+({stats.range_min}-{stats.range_max})
								</span>
							</div>
						</React.Fragment>}
						{!!proficiencies &&
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: `${1.5 * scale}em` }}>{stats.range_min}-{stats.range_max}</span>
						</div>}
						{!!quipmentMode &&
						<div style={{ gridArea: 'crits', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`} style={{ height: `${1 * scale}em` }} />
							<span style={{ fontWeight: 'bolder', fontSize: `${scale}em` }}>
								{stats.core! + stats.range_min!}-{stats.core! + stats.range_max!}
							</span>
						</div>}

					</React.Fragment>
				)}

			</div>
			</div>
		);
	}
}

export default CrewStat;
