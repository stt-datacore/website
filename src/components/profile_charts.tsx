import React, { Component } from 'react';
import { Checkbox } from 'semantic-ui-react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { ResponsiveRadar } from '@nivo/radar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveTreeMap } from '@nivo/treemap';

import CONFIG from './CONFIG';

import themes from './nivo_themes';
import { sortedStats, insertInStatTree } from '../utils/statutils';

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
	r4_stars: any[];
	r5_stars: any[];
	radar_skill_rarity: any[];
	radar_skill_rarity_owned: any[];
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
			includeTertiary: false,
			r4_stars: [],
			r5_stars: [],
			radar_skill_rarity: [],
			radar_skill_rarity_owned: []
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

		let r4owned = [0, 0, 0, 0];
		let r5owned = [0, 0, 0, 0, 0];

		let radar_skill_rarity = Object.values(CONFIG.SKILLS).map(r => ({
			name: r,
			Common: 0,
			Uncommon: 0,
			Rare: 0,
			'Super Rare': 0,
			Legendary: 0
		}));
		let radar_skill_rarity_owned = Object.values(CONFIG.SKILLS).map(r => ({
			name: r,
			Common: 0,
			Uncommon: 0,
			Rare: 0,
			'Super Rare': 0,
			Legendary: 0
		}));

		let skill_distribution = [];
		for (let crew of allcrew) {
			let pcrew = playerData.player.character.crew.find(bc => bc.symbol === crew.symbol);

			for (const skill in crew.base_skills) {
				if (crew.base_skills[skill].core > 0) {
					let rsr = radar_skill_rarity.find(r => r.name === CONFIG.SKILLS[skill]);
					rsr[CONFIG.RARITIES[crew.max_rarity].name]++;
				}
			}

			total[crew.max_rarity - 1]++;
			if (pcrew) {
				owned[crew.max_rarity - 1]++;

				insertInStatTree(sortedStats(pcrew), skill_distribution, '');

				// TODO: Which to pick if the user has more than one copy of the same crew?
				if (pcrew.max_rarity === 5) {
					r5owned[pcrew.rarity - 1]++;
				}

				if (pcrew.max_rarity === 4) {
					r4owned[pcrew.rarity - 1]++;
				}

				for (const skill in pcrew.base_skills) {
					if (pcrew.base_skills[skill].core > 0) {
						let rsro = radar_skill_rarity_owned.find(r => r.name === CONFIG.SKILLS[skill]);
						rsro[CONFIG.RARITIES[pcrew.max_rarity].name]++;
					}
				}
			}
		}

		let flat_skill_distribution = [];
		skill_distribution.forEach(sec => {
			sec.loc = 0;
			sec.children.forEach(tri => {
				let name = tri.name
					.split('>')
					.map(n => n.trim())
					.sort()
					.join('/');
				let existing = flat_skill_distribution.find(e => e.name === name);
				if (existing) {
					existing.Count += tri.loc;
					existing.Gauntlet += tri.valueGauntlet;
					existing.Voyage += tri.value;
				} else {
					flat_skill_distribution.push({
						name,
						Count: tri.loc,
						Gauntlet: tri.valueGauntlet,
						Voyage: tri.value
					});
				}
			});
		});
		flat_skill_distribution.sort((a, b) => a.Count - b.Count);

		if (!includeTertiary) {
			skill_distribution.forEach(sec => {
				sec.children.forEach(tri => {
					tri.children = [];
				});
			});
		}

		let data_ownership = [];
		for (let i = 0; i < 5; i++) {
			data_ownership.push({
				rarity: CONFIG.RARITIES[i + 1].name,
				Owned: owned[i],
				'Not Owned': total[i] - owned[i]
			});
		}

		// TODO: Voyage Treemap: https://nivo.rocks/treemap/ ; maybe pies with number of stars for legendaries / super rares

		this.setState({
			data_ownership,
			flat_skill_distribution,
			radar_skill_rarity,
			radar_skill_rarity_owned,
			skill_distribution: { name: 'Skills', children: skill_distribution },
			r4_stars: r4owned.map((v, i) => ({ id: `${i + 1} / 4`, value: v })).filter(e => e.value > 0),
			r5_stars: r5owned.map((v, i) => ({ id: `${i + 1} / 5`, value: v })).filter(e => e.value > 0)
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
		const {
			data_ownership,
			skill_distribution,
			flat_skill_distribution,
			r4_stars,
			r5_stars,
			radar_skill_rarity,
			radar_skill_rarity_owned
		} = this.state;

		return (
			<div>
				<h3>Owned vs. Not Owned crew per rarity</h3>
				<div style={{ height: '320px' }}>
					<ResponsiveBar
						data={data_ownership}
						theme={themes.dark}
						keys={['Owned', 'Not Owned']}
						indexBy='rarity'
						layout='horizontal'
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

				<h3>Skill coverage per rarity (yours vs. every crew in vault)</h3>
				<div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
						<ResponsiveRadar
							data={radar_skill_rarity_owned}
							theme={themes.dark}
							keys={['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary']}
							indexBy='name'
							maxValue='auto'
							margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
							curve='linearClosed'
							borderWidth={2}
							borderColor={{ from: 'color' }}
							gridLevels={5}
							gridShape='circular'
							gridLabelOffset={36}
							enableDots={true}
							dotSize={10}
							dotColor={{ theme: 'background' }}
							dotBorderWidth={2}
							dotBorderColor={{ from: 'color' }}
							enableDotLabel={true}
							dotLabel='value'
							dotLabelYOffset={-12}
							colors={{ scheme: 'nivo' }}
							fillOpacity={0.25}
							blendMode='multiply'
							animate={true}
							motionStiffness={90}
							motionDamping={15}
							isInteractive={true}
							legends={[
								{
									anchor: 'top-left',
									direction: 'column',
									translateX: -50,
									translateY: -40,
									itemWidth: 80,
									itemHeight: 20,
									itemTextColor: '#999',
									symbolSize: 12,
									symbolShape: 'circle',
									effects: [
										{
											on: 'hover',
											style: {
												itemTextColor: '#000'
											}
										}
									]
								}
							]}
						/>
					</div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
						<ResponsiveRadar
							data={radar_skill_rarity}
							theme={themes.dark}
							keys={['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary']}
							indexBy='name'
							maxValue='auto'
							margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
							curve='linearClosed'
							borderWidth={2}
							borderColor={{ from: 'color' }}
							gridLevels={5}
							gridShape='circular'
							gridLabelOffset={36}
							enableDots={true}
							dotSize={10}
							dotColor={{ theme: 'background' }}
							dotBorderWidth={2}
							dotBorderColor={{ from: 'color' }}
							enableDotLabel={true}
							dotLabel='value'
							dotLabelYOffset={-12}
							colors={{ scheme: 'nivo' }}
							fillOpacity={0.25}
							blendMode='multiply'
							animate={true}
							motionStiffness={90}
							motionDamping={15}
							isInteractive={true}
							legends={[
								{
									anchor: 'top-left',
									direction: 'column',
									translateX: -50,
									translateY: -40,
									itemWidth: 80,
									itemHeight: 20,
									itemTextColor: '#999',
									symbolSize: 12,
									symbolShape: 'circle',
									effects: [
										{
											on: 'hover',
											style: {
												itemTextColor: '#000'
											}
										}
									]
								}
							]}
						/>
					</div>
				</div>

				<h3>Number of stars (fused rarity) for your Super Rare and Legendary crew</h3>
				<div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
						<ResponsivePie
							data={r4_stars}
							theme={themes.dark}
							margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
							innerRadius={0.2}
							padAngle={2}
							cornerRadius={2}
							borderWidth={1}
							animate={false}
							slicesLabelsTextColor='#333333'
							legends={[
								{
									anchor: 'bottom',
									direction: 'row',
									translateY: 56,
									itemWidth: 100,
									itemHeight: 18,
									itemTextColor: '#999',
									symbolSize: 18,
									symbolShape: 'circle',
									effects: [
										{
											on: 'hover',
											style: {
												itemTextColor: '#000'
											}
										}
									]
								}
							]}
						/>
					</div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
						<ResponsivePie
							data={r5_stars}
							theme={themes.dark}
							margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
							innerRadius={0.2}
							padAngle={2}
							cornerRadius={2}
							borderWidth={1}
							animate={false}
							slicesLabelsTextColor='#333333'
							legends={[
								{
									anchor: 'bottom',
									direction: 'row',
									translateY: 56,
									itemWidth: 100,
									itemHeight: 18,
									itemTextColor: '#999',
									symbolSize: 18,
									symbolShape: 'circle',
									effects: [
										{
											on: 'hover',
											style: {
												itemTextColor: '#000'
											}
										}
									]
								}
							]}
						/>
					</div>
				</div>

				<h3>Skill distribution for owned crew (number of characters per skill combos Primary > Secondary)</h3>
				<Checkbox label='Include tertiary skill' onChange={() => this._onIncludeTertiary()} checked={this.state.includeTertiary} />
				<div>
					<div style={{ height: '420px', width: '50%', display: 'inline-block' }}>
						<ResponsiveSunburst
							data={skill_distribution}
							theme={themes.dark}
							margin={{ top: 40, right: 20, bottom: 20, left: 20 }}
							identity='name'
							value='loc'
							cornerRadius={2}
							borderWidth={1}
							borderColor='white'
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
							indexBy='name'
							layout='horizontal'
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

				<h3>Skill combos by value for Voyage and Gauntlet</h3>
				<div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
						<ResponsiveTreeMap
							root={{ name: 'Skills', children: flat_skill_distribution }}
							theme={themes.dark}
							identity='name'
							value='Voyage'
							colors={{ scheme: 'green_blue' }}
							innerPadding={3}
							outerPadding={3}
							margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
							label='name'
							labelSkipSize={24}
							animate={false}
						/>
					</div>
					<div style={{ height: '320px', width: '50%', display: 'inline-block' }}>
					<ResponsiveTreeMap
							root={{ name: 'Skills', children: flat_skill_distribution }}
							theme={themes.dark}
							identity='name'
							value='Gauntlet'
							colors={{ scheme: 'green_blue' }}
							innerPadding={3}
							outerPadding={3}
							margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
							label='name'
							labelSkipSize={24}
							animate={false}
						/>
					</div>
				</div>
			</div>
		);
	}
}

export default ProfileCharts;
