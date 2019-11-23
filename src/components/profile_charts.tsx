import React, { Component } from 'react';
import { Checkbox } from 'semantic-ui-react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveSunburst } from '@nivo/sunburst';

import CONFIG from './CONFIG';

import themes from './nivo_themes';
import { sortedStats, insertInStatTree } from '../utils/statutils';
import { string } from '../../../../Users/tudorm/AppData/Local/Microsoft/TypeScript/3.6/node_modules/@types/prop-types';

type ProfileChartsProps = {
	playerData: any;
};

type ProfileChartsState = {
	allcrew: any;
	botcrew: any;
	data_ownership: any[];
	skill_distribution: any;
	flat_skill_distribution: any[];
	includeTertiary: boolean;
};

class ProfileCharts extends Component<ProfileChartsProps, ProfileChartsState> {
	constructor(props: ProfileChartsProps) {
		super(props);

		this.state = {
			allcrew: undefined,
			botcrew: undefined,
			data_ownership: [],
			flat_skill_distribution: [],
			skill_distribution: {},
			includeTertiary: false
		};
	}

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(allcrew => {
				fetch('/structured/botcrew.json')
					.then(response => response.json())
					.then(botcrew => {
						this.setState({ allcrew, botcrew }, () => {
							this._calculateStats();
						});
					});
			});
	}

	_calculateStats() {
		let owned = [0, 0, 0, 0, 0];
		let total = [0, 0, 0, 0, 0];

		const { playerData } = this.props;
		const { allcrew, includeTertiary } = this.state;

		let skill_distribution = [];
		for (let crew of allcrew) {
			let pcrew = playerData.player.character.crew.find(bc => bc.symbol === crew.symbol);

			total[crew.max_rarity - 1]++;
			if (pcrew) {
				owned[crew.max_rarity - 1]++;

				insertInStatTree(sortedStats(pcrew), skill_distribution, '');
			}
		}

		if (!includeTertiary) {
			skill_distribution.forEach(sec => {
				sec.children.forEach(tri => {
					tri.children = [];
				});
			});
		}

		let flat_skill_distribution = [];
		skill_distribution.forEach(sec => {
			sec.children.forEach(tri => {
				let name = tri.name.split('>').map(n => n.trim()).sort().join('/');
				let existing = flat_skill_distribution.find(e => e.name === name);
				if (existing) {
					existing.Count += tri.loc;
				} else {
				flat_skill_distribution.push({
					name,
					Count: tri.loc
				});
			}
			});
		});
		flat_skill_distribution.sort((a,b) => a.Count - b.Count);

		let data_ownership = [];
		for (let i = 0; i < 5; i++) {
			data_ownership.push({
				rarity: CONFIG.RARITIES[i].name,
				Owned: owned[i],
				'Not Owned': total[i] - owned[i]
			});
		}

		// TODO: Voyage Treemap: https://nivo.rocks/treemap/ ; maybe pies with number of stars for legendaries / super rares

		this.setState({
			data_ownership,
			flat_skill_distribution,
			skill_distribution: { name: 'Skills', children: skill_distribution }
		});
	}

	_onIncludeTertiary() {
		this.setState(
			prevState => ({ includeTertiary: !prevState.includeTertiary }),
			() => {
				this._calculateStats();
			}
		);
	}

	render() {
		const { data_ownership, skill_distribution, flat_skill_distribution } = this.state;

		return (
			<div>
				<h3>Owned vs. Not Owned crew per rarity</h3>
				<div style={{ height: '320px' }}>
					<ResponsiveBar
						data={data_ownership}
						theme={themes.dark}
						keys={['Owned', 'Not Owned']}
						indexBy="rarity"
						layout="horizontal"
						margin={{ top: 50, right: 130, bottom: 50, left: 100 }}
						padding={0.3}
						axisBottom={{
							legend: 'Number of crew',
							legendPosition: 'middle',
							legendOffset: 32
						}}
						labelSkipWidth={12}
						labelSkipHeight={12}
						legends={[
							{
								dataFrom: 'keys',
								anchor: 'bottom-right',
								direction: 'column',
								justify: false,
								translateX: 120,
								translateY: 0,
								itemsSpacing: 2,
								itemWidth: 100,
								itemHeight: 20,
								itemDirection: 'left-to-right',
								symbolSize: 20,
								effects: [
									{
										on: 'hover',
										style: {
											itemOpacity: 1
										}
									}
								]
							}
						]}
						animate={false}
					/>
				</div>

				<h3>Skill distribution for owned crew (number of characters per skill combos Primary > Secondary)</h3>
				<Checkbox
					label="Include tertiary skill"
					onChange={() => this._onIncludeTertiary()}
					checked={this.state.includeTertiary}
				/>
				<div>
					<div style={{ height: '420px', width: '50%', display: 'inline-block' }}>
						<ResponsiveSunburst
							data={skill_distribution}
							theme={themes.dark}
							margin={{ top: 40, right: 20, bottom: 20, left: 20 }}
							identity="name"
							value="loc"
							cornerRadius={2}
							borderWidth={1}
							borderColor="white"
							colors={{ scheme: 'nivo' }}
							childColor={{ from: 'color' }}
							animate={true}
							motionStiffness={90}
							motionDamping={15}
							isInteractive={true}
						/>
					</div>
					<div style={{ height: '420px', width: '50%', display: 'inline-block' }}>
						<ResponsiveBar
							data={flat_skill_distribution}
							keys={['Count']}
							theme={themes.dark}
							indexBy="name"
							layout="horizontal"
							margin={{ top: 50, right: 130, bottom: 50, left: 100 }}
							padding={0.3}
							axisBottom={{
								legend: 'Number of crew',
								legendPosition: 'middle',
								legendOffset: 32
							}}
							labelSkipWidth={12}
							labelSkipHeight={12}
							legends={[
								{
									dataFrom: 'keys',
									anchor: 'bottom-right',
									direction: 'column',
									justify: false,
									translateX: 120,
									translateY: 0,
									itemsSpacing: 2,
									itemWidth: 100,
									itemHeight: 20,
									itemDirection: 'left-to-right',
									symbolSize: 20,
									effects: [
										{
											on: 'hover',
											style: {
												itemOpacity: 1
											}
										}
									]
								}
							]}
							animate={false}
						/>
					</div>
				</div>
			</div>
		);
	}
}

export default ProfileCharts;
