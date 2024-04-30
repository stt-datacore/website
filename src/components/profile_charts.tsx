import React, { Component } from 'react';
import { Checkbox, Popup, Grid, Header, Table, Message } from 'semantic-ui-react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { ResponsiveRadar } from '@nivo/radar';
import { ResponsivePie } from '@nivo/pie';

import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';

import CONFIG from '../components/CONFIG';

import ErrorBoundary from './errorboundary';
import themes from './nivo_themes';
import { sortedStats, insertInStatTree, StatTreeNode } from '../utils/statutils';
import { demandsPerSlot } from '../utils/equipment';
import { DemandCounts, IDemand } from '../model/equipment';
import { PlayerCrew, PlayerEquipmentItem } from '../model/player'
import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';
import { EquipmentItem, EquipmentItemSource } from '../model/equipment';

type ProfileChartsProps = {
};

type ProfileChartsState = {
	allcrew?: PlayerCrew[];
	items?: EquipmentItem[];
	data_ownership: any[];
	skill_distribution: StatTreeNode;
	flat_skill_distribution: StatTreeNode[];
	includeTertiary: boolean;
	includeAllCrew: boolean;
	r4_stars: any[];
	r5_stars: any[];
	radar_skill_rarity: any[];
	radar_skill_rarity_owned: any[];
	demands: IDemand[];
	excludeFulfilled: boolean;
	honordebt?: {
		ownedStars: number[];
		totalStars: number[];
		craftCost: number;
	};
};

class ProfileCharts extends Component<ProfileChartsProps, ProfileChartsState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

	constructor(props: ProfileChartsProps) {
		super(props);

		this.state = {
			allcrew: undefined,
			items: undefined,
			demands: [],
			data_ownership: [],
			flat_skill_distribution: [],
			skill_distribution: {} as StatTreeNode,
			includeTertiary: false,
			r4_stars: [],
			r5_stars: [],
			radar_skill_rarity: [],
			radar_skill_rarity_owned: [],
			honordebt: undefined,
			excludeFulfilled: false,
			includeAllCrew: false
		};
	}

	componentDidMount() {
		fetch('/structured/crew.json')
			.then((response) => response.json())
			.then((allcrew) => {
				fetch('/structured/items.json')
					.then((response) => response.json())
					.then((items) => {
						this.setState({ allcrew, items }, () => {
							this._calculateStats();
						});
					});
			});
	}

	_calculateStats() {
		let owned = [0, 0, 0, 0, 0];
		let total = [0, 0, 0, 0, 0];
		let unowned_portal = [0,0,0,0,0];

		const { playerData } = this.context.player;
		const { allcrew, includeTertiary, items, includeAllCrew } = this.state;

		let r4owned = [0, 0, 0, 0];
		let r5owned = [0, 0, 0, 0, 0];

		if (includeAllCrew) {
			r4owned.push(0);
			r5owned.push(0);			
		}

		let ownedStars = [0, 0, 0, 0, 0];
		let totalStars = [0, 0, 0, 0, 0];

		let radar_skill_rarity = Object.values(CONFIG.SKILLS).map((r) => ({
			name: r,
			Common: 0,
			Uncommon: 0,
			Rare: 0,
			'Super Rare': 0,
			Legendary: 0,
		}));
		let radar_skill_rarity_owned = Object.values(CONFIG.SKILLS).map((r) => ({
			name: r,
			Common: 0,
			Uncommon: 0,
			Rare: 0,
			'Super Rare': 0,
			Legendary: 0,
		}));

		let craftCost = 0;
		let demands: IDemand[] = [];
		let dupeChecker = new Set<string>();

		let skill_distribution = [] as StatTreeNode[];
		for (let crew of allcrew ?? []) {
			let pcrew: PlayerCrew | undefined = undefined;

			// If multiple copies, find the "best one"
			let pcrewlist = playerData?.player.character.crew.filter((bc) => bc.symbol === crew.symbol) ?? [];
			if (pcrewlist.length === 1) {
				pcrew = pcrewlist[0];
			} else if (pcrewlist.length > 1) {
				pcrew = pcrewlist.sort((a, b) => b.level - a.level)[0];
			}

			totalStars[crew.max_rarity - 1] += crew.max_rarity;
			if (pcrew) {
				ownedStars[crew.max_rarity - 1] += pcrew.rarity;
			}

			for (const skill in crew.base_skills) {
				if (crew.base_skills[skill].core > 0) {
					let rsr = radar_skill_rarity.find((r) => r.name === CONFIG.SKILLS[skill]);
					if (rsr) rsr[CONFIG.RARITIES[crew.max_rarity].name]++;
				}
			}

			total[crew.max_rarity - 1]++;
			if (pcrew) {
				owned[crew.max_rarity - 1]++;

				insertInStatTree(sortedStats(pcrew), skill_distribution, '');

				if (pcrew.max_rarity === 5) {
					r5owned[pcrew.rarity - 1]++;
				}

				if (pcrew.max_rarity === 4) {
					r4owned[pcrew.rarity - 1]++;
				}

				for (const skill in pcrew.base_skills) {
					if (pcrew.base_skills[skill].core > 0) {
						let rsro = radar_skill_rarity_owned.find((r) => r.name === CONFIG.SKILLS[skill]);
						if (rsro) rsro[CONFIG.RARITIES[pcrew.max_rarity].name]++;
					}
				}

				let startLevel = pcrew.max_level ? pcrew.max_level - 10 : pcrew.level - (pcrew.level % 10);
				if (pcrew.equipment?.length < 4) {
					// If it's not fully equipped for this level band, we include the previous band as well
					startLevel = Math.max(1, startLevel - 10);
				}

				// all levels past pcrew.level
				crew.equipment_slots
					.filter((es) => es.level >= startLevel)
					.forEach((es) => {
						craftCost += demandsPerSlot(es, items ?? [], dupeChecker, demands, crew.symbol);
					});
			} else {
				if (includeAllCrew) {
					if (crew.max_rarity === 4) {
						r4owned[4]++;
					}
					else if (crew.max_rarity === 5) {
						r5owned[5]++;
					}
				}
		
				if (crew.in_portal) {
					unowned_portal[crew.max_rarity - 1]++;
				}
			}
		}

		demands = demands.sort((a, b) => b.count - a.count);

		for (let demand of demands) {
			let item = playerData?.player.character.items.find((it) => it.symbol === demand.symbol);
			demand.have = item ? (item.quantity ?? 0) : 0;
		}

		let flat_skill_distribution = [] as any[];
		skill_distribution.forEach((sec) => {
			sec.loc = 0;
			sec.children.forEach((tri) => {
				let name = tri.name
					.split('>')
					.map((n) => n.trim())
					.sort()
					.join('/');
				let existing = flat_skill_distribution.find((e) => e.name === name);
				if (existing) {
					existing.Count += tri.loc;
					existing.Gauntlet += tri.valueGauntlet;
					existing.Voyage += tri.value;
				} else {
					flat_skill_distribution.push({
						name,
						Count: tri.loc,
						Gauntlet: tri.valueGauntlet,
						Voyage: tri.value,
					});
				}
			});
		});
		flat_skill_distribution.sort((a, b) => a.Count - b.Count);

		if (!includeTertiary) {
			skill_distribution.forEach((sec) => {
				sec.children.forEach((tri) => {
					tri.children = [];
				});
			});
		}

		let data_ownership = [] as any[];
		for (let i = 0; i < 5; i++) {
			data_ownership.push({
				rarity: CONFIG.RARITIES[i + 1].name,
				Owned: owned[i],
				'Not Owned': total[i] - owned[i] - unowned_portal[i],
				'Not Owned - Portal': unowned_portal[i],
			});
		}

		const makeLabel = (i: number, rarity: number) => {
			if (rarity === i) {
				return `Unowned`;
			}
			else {
				return `${i + 1} / ${rarity}`;
			}
		}

		this.setState({
			data_ownership,
			flat_skill_distribution,
			radar_skill_rarity,
			radar_skill_rarity_owned,
			demands,
			honordebt: { ownedStars, totalStars, craftCost },
			skill_distribution: { name: 'Skills', children: skill_distribution, value: 0, valueGauntlet: 0, loc: 0 } as StatTreeNode,
			r4_stars: r4owned.map((v, i) => ({ label: makeLabel(i, 4), id: makeLabel(i, 4), value: v })).filter((e) => e.value > 0),
			r5_stars: r5owned.map((v, i) => ({ label: makeLabel(i, 5), id: makeLabel(i, 5), value: v })).filter((e) => e.value > 0),
		});
	}

	_onIncludeTertiary() {
		this.setState(
			(prevState) => ({ includeTertiary: !prevState.includeTertiary }),
			() => {
				this._calculateStats();
			}
		);
	}
	
	_onIncludeAllCrew() {
		this.setState(
			(prevState) => ({ includeAllCrew: !prevState.includeAllCrew }),
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
			radar_skill_rarity_owned,
			honordebt,
			excludeFulfilled,
		} = this.state;

		let { demands } = this.state;

		let totalHonorDebt = 0;
		let readableHonorDebt = '';

		if (honordebt) {
			totalHonorDebt = honordebt.totalStars
				.map((val, idx) => (val - honordebt.ownedStars[idx]) * CONFIG.CITATION_COST[idx])
				.reduce((a, b) => a + b, 0);

			let totalHonorDebtDays = totalHonorDebt / 2000;

			let years = Math.floor(totalHonorDebtDays / 365);
			let months = Math.floor((totalHonorDebtDays - years * 365) / 30);
			let days = totalHonorDebtDays - years * 365 - months * 30;

			readableHonorDebt = `${years} years ${months} months ${Math.floor(days)} days`;
		}

		let totalChronCost = 0;
		let factionRec = [] as DemandCounts[];
		demands.forEach((entry) => {
			let cost = entry.equipment?.item_sources.map((its: any) => its.avg_cost).filter((cost) => !!cost);
			if (cost && cost.length > 0) {
				totalChronCost += Math.min(...cost) * entry.count;
			} else {
				const factions = entry.equipment?.item_sources.filter((e) => e.type === 1);
				if (factions && factions.length > 0) {
					let fe = factionRec.find((e: any) => e.name === factions[0].name);
					if (fe) {
						fe.count += entry.count;
					} else {
						factionRec.push({
							name: factions[0].name,
							count: entry.count,
						});
					}
				}
			}
		});

		if (excludeFulfilled) {
			demands = demands.filter((d) => d.count > d.have);
		}

		factionRec = factionRec.sort((a, b) => b.count - a.count).filter((e) => e.count > 0);

		totalChronCost = Math.floor(totalChronCost);

		return (
			<ErrorBoundary>
				<>
				<h3>Owned vs. Not Owned crew per rarity</h3>
				<div style={{ height: '320px' }}>
					<ResponsiveBar
						data={data_ownership}
						theme={themes.dark}
						keys={['Owned', 'Not Owned', 'Not Owned - Portal']}
						indexBy='rarity'
						layout='horizontal'
						margin={{ top: 50, right: 130, bottom: 50, left: 100 }}
						padding={0.3}
						axisBottom={{
							legend: 'Number of crew',
							legendPosition: 'middle',
							legendOffset: 32,
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
											itemOpacity: 1,
										},
									},
								],
							},
						]}
						animate={false}
					/>
				</div>

				<h3>Honor debt</h3>
				{honordebt && (
					<div>
						<Table basic='very' striped>
							<Table.Header>
								<Table.Row>
									<Table.HeaderCell>Rarity</Table.HeaderCell>
									<Table.HeaderCell>Required stars</Table.HeaderCell>
									<Table.HeaderCell>Honor cost</Table.HeaderCell>
								</Table.Row>
							</Table.Header>

							<Table.Body>
								{honordebt.totalStars.map((val, idx) => (
									<Table.Row key={idx}>
										<Table.Cell>
											<Header as='h4'>{CONFIG.RARITIES[idx + 1].name}</Header>
										</Table.Cell>
										<Table.Cell>
											{val - honordebt.ownedStars[idx]}{' '}
											<span>
												<i>
													({honordebt.ownedStars[idx]} / {val})
												</i>
											</span>
										</Table.Cell>
										<Table.Cell>{(val - honordebt.ownedStars[idx]) * CONFIG.CITATION_COST[idx]}</Table.Cell>
									</Table.Row>
								))}
							</Table.Body>

							<Table.Footer>
								<Table.Row>
									<Table.HeaderCell />
									<Table.HeaderCell>
										Owned {honordebt.ownedStars.reduce((a, b) => a + b, 0)} out of {honordebt.totalStars.reduce((a, b) => a + b, 0)}
									</Table.HeaderCell>
									<Table.HeaderCell>{totalHonorDebt}</Table.HeaderCell>
								</Table.Row>
							</Table.Footer>
						</Table>

						<Message info>
							<Message.Header>{readableHonorDebt}</Message.Header>
							<p>That's how long will it take you to max all remaining crew in the vault at 2000 honor / day</p>
						</Message>
					</div>
				)}

				<h3>Items required to level all owned crew</h3>
				<h5>Note: this may over-include already equipped items from previous level bands for certain crew</h5>
				<Message info>
					<Message.Header>Cost and faction recommendations</Message.Header>
					<p>
						Total chroniton cost to farm all these items: {totalChronCost}{' '}
						<span style={{ display: 'inline-block' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
						</span>
					</p>
					{honordebt && (
						<p>
							Total number of credits required to craft all the recipes: {honordebt.craftCost}{' '}
							<span style={{ display: 'inline-block' }}>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/soft_currency_icon.png`} height={14} />
							</span>
						</p>
					)}
				</Message>

				<h4>Factions with most needed non-mission items</h4>
				<ul>
					{factionRec.map((e) => (
						<li key={e.name}>
							{e.name}: {e.count} items
						</li>
					))}
				</ul>

				<div>
					<Checkbox
						label='Exclude already fulfilled'
						onChange={() => this.setState({ excludeFulfilled: !excludeFulfilled })}
						checked={this.state.excludeFulfilled}
					/>
					<Grid columns={3} centered padded>
						{demands.map((entry, idx) => (
							entry?.equipment &&
							<Grid.Column key={idx}>
								<Popup
									trigger={
										<Header
											style={{ display: 'flex', cursor: 'zoom-in' }}
											icon={
												<ItemDisplay
													src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
													size={48}
													maxRarity={entry.equipment.rarity}
													rarity={entry.equipment.rarity}
												/>
											}
											content={entry.equipment.name}
											subheader={`Need ${entry.count} ${entry.factionOnly ? ' (FACTION)' : ''} (have ${entry.have})`}
										/>
									}
									header={CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
									content={<ItemSources item_sources={entry.equipment.item_sources} />}
									on='click'
									wide
								/>
							</Grid.Column> || <></>
						))}
					</Grid>
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
							//motionStiffness={90}
							//motionDamping={15}
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
												itemTextColor: '#000',
											},
										},
									],
								},
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
							//motionStiffness={90}
							//motionDamping={15}
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
												itemTextColor: '#000',
											},
										},
									],
								},
							]}
						/>
					</div>
				</div>

				<h3>Number of stars (fused rarity) for your Super Rare and Legendary crew</h3>
				<Checkbox label='Include unowned crew' onChange={() => this._onIncludeAllCrew()} checked={this.state.includeAllCrew} />
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
							//slicesLabelsTextColor='#333333'
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
												itemTextColor: '#000',
											},
										},
									],
								},
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
							//slicesLabelsTextColor='#333333'
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
												itemTextColor: '#000',
											},
										},
									],
								},
							]}
						/>
					</div>
				</div>

				<h3>Skill distribution for owned crew (number of characters per skill combos Primary &gt; Secondary)</h3>
				<Checkbox label='Include tertiary skill' onChange={() => this._onIncludeTertiary()} checked={this.state.includeTertiary} />
				<div>
					<div style={{ height: '420px', width: '50%', display: 'inline-block' }}>
						<ResponsiveSunburst
							data={skill_distribution}
							theme={themes.dark}
							margin={{ top: 40, right: 20, bottom: 20, left: 20 }}
							id='name'
							value='loc'
							cornerRadius={2}
							borderWidth={1}
							borderColor='white'
							colors={{ scheme: 'nivo' }}
							childColor={{ from: 'color' }}
							animate={true}
							//motionStiffness={90}
							//motionDamping={15}
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
								legendOffset: 32,
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
												itemOpacity: 1,
											},
										},
									],
								},
							]}
							animate={false}
						/>
					</div>
				</div>
				</>
			</ErrorBoundary>
		);
	}
}

export default ProfileCharts;
