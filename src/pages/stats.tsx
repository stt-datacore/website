import React, { Component } from 'react';
import { Checkbox, Header, Icon } from 'semantic-ui-react';
import { ResponsiveBar } from '@nivo/bar';

import themes from '../components/nivo_themes';

import CONFIG from '../components/CONFIG';
import { CrewMember } from '../model/crew';
import DataPageLayout from '../components/page/datapagelayout';
type StatsPageProps = {};

type StatsPageState = {
	items?: any;
	crewlist?: CrewMember[];
	misc_stats?: any;
	factionOnly: boolean;
	includeHidden: boolean;
	skillDistrib?: any[];
	skillValueDistrib?: any[];
};

class StatsPage extends Component<StatsPageProps, StatsPageState> {
	constructor(props: StatsPageProps) {
		super(props);

		this.state = {
			crewlist: undefined,
			items: undefined,
			skillDistrib: [],
			skillValueDistrib: [],
			factionOnly: false,
			includeHidden: false
		};
	}

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(crewlist => {
				let skillDistrib = {};
				let skillValueDistrib = {};
				for (let skill in CONFIG.SKILLS) {
					skillDistrib[skill] = 0;
					skillValueDistrib[skill] = 0;
				}

				for (let crew of crewlist) {
					for (let skill in CONFIG.SKILLS) {
						if (crew.base_skills[skill]) {
							skillDistrib[skill]++;
							skillValueDistrib[skill] +=
								crew.base_skills[skill].core + crew.base_skills[skill].range_min + crew.base_skills[skill].range_max;
						}
					}
				}

				this.setState({
					crewlist,
					skillDistrib: Object.keys(skillDistrib)
						.map(k => ({ name: CONFIG.SKILLS[k], Count: skillDistrib[k] }))
						.sort((a, b) => a.Count - b.Count),
					skillValueDistrib: Object.keys(skillValueDistrib)
						.map(k => ({ name: CONFIG.SKILLS[k], Count: skillValueDistrib[k] }))
						.sort((a, b) => a.Count - b.Count)
				});

				fetch('/structured/items.json')
					.then(response => response.json())
					.then(items => {
						items = items.filter(item => item.imageUrl);

						// Fill in something useful for flavor where it's missing
						items.forEach(item => {
							if (!item.flavor) {
								if (item.type === 2 && (!item.item_sources || item.item_sources.length === 0) && !item.recipe) {
									// Most likely a galaxy item
									item.flavor = 'Unused or Galaxy Event item';
								}

								let crew_levels = new Set();
								crewlist.forEach(cr => {
									cr.equipment_slots.forEach(es => {
										if (es.symbol === item.symbol) {
											crew_levels.add(cr.name);
										}
									});
								});

								if (crew_levels.size > 0) {
									if (crew_levels.size > 5) {
										item.flavor = `Equippable by ${crew_levels.size} crew`;
									} else {
										item.flavor = 'Equippable by: ' + [...crew_levels].join(', ');
									}
								}
							}
						});

						items = items.filter(item => item.type !== 2 || item.flavor);

						this.setState({ items });

						fetch('/structured/misc_stats.json')
							.then(response => response.json())
							.then(misc_stats => {
								this.setState({ misc_stats });
							});
					})
					.catch(err => {
						this.setState({ items: [] });
					});
			});
	}

	_getItemName(symbol: string) {
		let item = this.state.items.find((it: any) => it.symbol === symbol);
		if (!item) {
			return symbol;
		} else {
			return `${CONFIG.RARITIES[item.rarity].name} ${item.name}`;
		}
	}

	render() {
		let faction_items = [];
		let mostused_items = [];
		let mostused_traits = [];
		if (this.state.misc_stats) {
			faction_items = this.state.misc_stats.perFaction.map((pf: any) => ({
				Exclusive: pf.exclusive,
				'Not exclusive': pf.count - pf.exclusive,
				name: pf.name
			}));

			mostused_traits = this.state.misc_stats.perTrait.map((pt: any) => ({
				Count: pt.count,
				name: pt.name
			}));

			mostused_traits = this.state.includeHidden
				? mostused_traits
				: mostused_traits.filter((trait: any) => trait.name[0].toLowerCase() !== trait.name[0]);

			mostused_traits = mostused_traits.slice(0, 15);
			mostused_traits.reverse();

			let mostusedsrc = this.state.factionOnly
				? this.state.misc_stats.alldemands.filter((d: any) => d.factionOnly)
				: this.state.misc_stats.alldemands;

			mostused_items = mostusedsrc.slice(0, 15).map((pf: any) => ({
				Component: pf.symbol.endsWith('compon') ? pf.count : 0,
				Equipment: pf.symbol.endsWith('compon') ? 0 : pf.count,
				name: this._getItemName(pf.symbol)
			}));

			mostused_items.reverse();
		}

		return (
			<DataPageLayout>
				<>
				<Header as="h2">Miscellaneous stats</Header>
				<p>
					Contains miscellaneous information, statistics, breakdowns and charts. Stats are fresh and always
					automatically updated whenever new crew gets added.
					</p>

				{!this.state.misc_stats && (
					<div>
						<Icon loading name="spinner" /> Loading...
					</div>
				)}
				{this.state.misc_stats && (
					<div>
						<Header as="h3">Recipe needs for faction-only items</Header>
						<p>
							This breaks down all recipe trees for every equipment on every level of every crew, filtered to
							equipment that is only obtainable from a faction transmission.
							</p>
						<p>
							<i>Exclusive</i> means that the item can only be obtained from that particular faction;{' '}
							<i>Not exclusive</i> means that the item can be obtained from more than one faction.
							</p>
						<div style={{ height: '500px' }}>
							<ResponsiveBar
								data={faction_items}
								theme={themes.dark}
								keys={['Exclusive', 'Not exclusive']}
								indexBy="name"
								layout="horizontal"
								margin={{ top: 20, right: 130, bottom: 50, left: 170 }}
								padding={0.3}
								axisBottom={{
									legend: 'Number of items',
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

						<Header as="h3">Most used items</Header>
						<p>This breaks down all recipe trees and lists the most used 20 items.</p>
						<Checkbox
							label="Faction only"
							onChange={() => this.setState({ factionOnly: !this.state.factionOnly })}
							checked={this.state.factionOnly}
						/>
						<div style={{ height: '500px' }}>
							<ResponsiveBar
								data={mostused_items}
								theme={themes.dark}
								keys={['Component', 'Equipment']}
								indexBy="name"
								layout="horizontal"
								margin={{ top: 20, right: 130, bottom: 50, left: 200 }}
								padding={0.3}
								axisBottom={{
									legend: 'Number of times item is needed in crew equipment recipes',
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

						<Header as="h3">Skill distribution</Header>
						<p>This lists the total number of crew that have each skill.</p>
						<div style={{ height: '500px' }}>
							<ResponsiveBar
								data={this.state.skillDistrib ?? []}
								theme={themes.dark}
								keys={['Count']}
								indexBy="name"
								layout="horizontal"
								margin={{ top: 20, right: 130, bottom: 50, left: 170 }}
								padding={0.3}
								axisBottom={{
									legend: 'Number of crew with skill',
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

						<Header as="h3">Skill value distribution</Header>
						<p>This lists the total skill value across all crew.</p>
						<div style={{ height: '500px' }}>
							<ResponsiveBar
								data={this.state.skillValueDistrib ?? []}
								theme={themes.dark}
								keys={['Count']}
								indexBy="name"
								layout="horizontal"
								margin={{ top: 20, right: 130, bottom: 50, left: 170 }}
								padding={0.3}
								axisBottom={{
									legend: 'Total skill value',
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

						<Header as="h3">Most used traits</Header>
						<p>The most popular traits across all crew.</p>
						<Checkbox
							label="Include Hidden Traits"
							onChange={() => this.setState({ includeHidden: !this.state.includeHidden })}
							checked={this.state.includeHidden}
						/>
						<div style={{ height: '420px' }}>
							<ResponsiveBar
								data={mostused_traits}
								theme={themes.dark}
								keys={['Count']}
								indexBy="name"
								layout="horizontal"
								margin={{ top: 20, right: 130, bottom: 50, left: 200 }}
								padding={0.3}
								axisBottom={{
									legend: 'Number of times the trait shows up for a crew',
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
				)}
				</>
			</DataPageLayout>
		);
	}
}

export default StatsPage;
