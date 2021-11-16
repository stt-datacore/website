import React, { Component } from 'react';
import { Table, Grid, Header, Accordion, Popup, Segment, Image, Message } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import CONFIG from './CONFIG';
import ItemDisplay from './itemdisplay';
import CrewPopup from './crewpopup';

import Worker from 'worker-loader!../workers/unifiedWorker';
import { ResponsiveLineCanvas } from '@nivo/line';
import themes from './nivo_themes';

type VoyageStatsProps = {
	voyageData: any;
	numSims?: number;
	ships: [];
	showPanels: [];
	estimate?: any;
};

type VoyageStatsState = {
	estimate: any;
	activePanels: [];
};

export class VoyageStats extends Component<VoyageStatsProps, VoyageStatsState> {
	constructor(props) {
		super(props);
		const { estimate, numSims, showPanels, ships, voyageData } = this.props;

		this.state = {
			estimate: estimate,
			activePanels: showPanels ? showPanels : []
		};

		if (!voyageData)
			return;

		if (ships.length == 1) {
			this.ship = ships[0].ship;
		} else {
			let ship = ships.find(s => s.id == voyageData.ship_id);
			fetch('/structured/ship_schematics.json').then(ships => ships.json().then(allShips => {
				this.ship = allShips.find(s => s.ship.symbol == ship.symbol).ship
			}));
		}

		if (!estimate) {
			const score = agg => Math.floor(agg.core + (agg.range_min+agg.range_max)/2);

			this.config = {
				others: [],
				numSims: numSims ?? 5000,
				startAm: voyageData.max_hp,
				currentAm: voyageData.hp ?? voyageData.max_hp,
				elapsedSeconds: voyageData.voyage_duration ?? 0,
			};

			for (let agg of Object.values(voyageData.skill_aggregates)) {
				let skillOdds = 0.1;

				if (agg.skill == voyageData.skills.primary_skill)
					this.config.ps = agg;
				else if (agg.skill == voyageData.skills.secondary_skill)
					this.config.ss = agg;
				else
					this.config.others.push(agg);

				this.config.variance += ((agg.range_max-agg.range_min)/(agg.core + agg.range_max))*skillOdds;
			}

			this.worker = new Worker();
			this.worker.addEventListener('message', message => this.setState({ estimate: message.data.result }));
			this.worker.postMessage({ worker: 'chewable', config: this.config });
		}
	}

	componentWillUnmount() {
		if (this.worker)
			this.worker.terminate();
	}

	_formatTime(time: number) {
		let hours = Math.floor(time);
		let minutes = Math.floor((time-hours)*60);

		return hours+"h " +minutes+"m";
	}

	_renderChart(needsRevive: boolean) {
		const estimate = this.props.estimate ?? this.state.estimate;

		const names = needsRevive ? ['First refill', 'Second refill']
															: [ 'No refills', 'One refill', 'Two refills'];

		const rawData = needsRevive ? estimate.refills : estimate.refills.slice(0, 2);
		// Convert bins to percentages
		const data = estimate.refills.map((refill, index) => {
			const total = refill.bins
													.map(value => value.count)
													.reduce((acc, value) => acc + value, 0);
			var aggregate = total;
			const cumValues = value => {
				aggregate -= value.count;
				return {x: value.result, y: (aggregate/total)*100};
			};
			const ongoing = value => { return {x: value.result, y: value.count/total}};

			const percentages = refill.bins
																.sort((bin1, bin2) => bin1.result - bin2.result)
																.map(cumValues);

			return {
				id: names[index],
				data: percentages
			};
		});

		return (
			<div style={{height : 200}}>
				<ResponsiveLineCanvas
					data={data}
					xScale= {{type: 'linear', min: data[0].data[0].x}}
					yScale={{type: 'linear', max: 100 }}
					theme={themes.dark}
					axisBottom={{legend : 'Voyage length (hours)', legendOffset: 30, legendPosition: 'middle'}}
					axisLeft={{legend : 'Chance (%)', legendOffset: -36, legendPosition: 'middle'}}
					margin={{ top: 50, right: 130, bottom: 50, left: 100 }}
					enablePoints= {true}
					pointSize={0}
					useMesh={true}
					crosshairType='none'
					tooltip={input => {
						let data = input.point.data;
						return `${input.point.serieId}: ${data.y.toFixed(2)}% chance of reaching ${this._formatTime(data.x)}`;
					}}
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
				/>
			</div>
		);
	}

	_renderCrew() {
		const {voyageData} = this.props;
		const  ship  = this.ship;

		return (
			<div>
			  {ship && `Ship: ${ship.name} (${voyageData.max_hp} Antimatter)`}
				<Grid columns={isMobile ? 1 : 2}>
					<Grid.Column>
						<ul>
							{Object.values(CONFIG.VOYAGE_CREW_SLOTS).map((entry, idx) => {
								let { crew, name }  = Object.values(voyageData.crew_slots).find(slot => slot.symbol == entry);

								if (!crew.imageUrlPortrait)
									crew.imageUrlPortrait =
										`${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;

								return (
									<li key={idx}>
										{name}
										{'  :  '}
										<CrewPopup crew={crew} useBase={false} />
										</li>
									);
								})}
							</ul>
						</Grid.Column>
						<Grid.Column verticalAlign="middle">
							<ul>
								{Object.keys(CONFIG.SKILLS).map((entry, idx) => {
									const agg = voyageData.skill_aggregates[entry];

									if (typeof(agg) === 'number') {
										return (<li key={idx}>{`${CONFIG.SKILLS[entry]} : ${Math.round(agg)}`}</li>);
									} else {
										const score = Math.floor(agg.core + (agg.range_min + agg.range_max)/2);

										return (
											<li key={idx}>
												{CONFIG.SKILLS[entry]}
												{' : '}
												<Popup wide trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{score}</span>}>
													<Popup.Content>
														{agg.core + ' +(' + agg.range_min + '-' + agg.range_max + ')'}
													</Popup.Content>
												</Popup>
											</li>
										);
									}
								})}
							</ul>
						</Grid.Column>
					</Grid>
				</div>
			);
	}

	_renderEstimateTitle(needsRevive: boolean = false) {
		const estimate  = this.props.estimate ?? this.state.estimate;

		return needsRevive || !estimate
			?	'Estimate'
			: 'Estimate: ' + this._formatTime(estimate['refills'][0].result);
	}

	_renderEstimate(needsRevive: boolean = false) {
		const estimate  = this.props.estimate ?? this.state.estimate;

		if (!estimate)
			return (<div>Calculating estimate. Please wait...</div>);

		const renderEst = (label, refills) => {
			const est = estimate['refills'][refills];
			return (
				<tr>
					<td>{label}: {this._formatTime(est.result)}</td>
					{!isMobile && <td>90%: {this._formatTime(est.safeResult)}</td>}
					<td>99%: {this._formatTime(est.saferResult)}</td>
					<td>Chance of {est.lastDil} hour dilemma: {est.dilChance == 100 ? 100 : est.dilChance.toPrecision(2)}%</td>
					<td>{est.refillCostResult == 0 || 'Costing ' + est.refillCostResult + ' dilithium'}</td>
				</tr>
			);
		};

		if (estimate.deterministic) {
			let extendTime = estimate['refills'][1].result - estimate['refills'][0].result;

			return (
				<div>
					The voyage will end at {this._formatTime(estimate['refills'][0].result)}.
					Subsequent refills will extend it by {this._formatTime(extendTime)}.
					For a 20 hour voyage you need {estimate['20hrrefills']} refills at a cost of {estimate['20hrdil']} dilithium.
				</div>
			);
		} else {
			let refill = 0;

			return (
				<div>
					<Table><tbody>
						{!needsRevive && renderEst("Estimate", refill++)}
						{renderEst("1 Refill", refill++)}
						{renderEst("2 Refills", refill++)}
					</tbody></Table>
					<p>The 20 hour voyage needs {estimate['20hrrefills']} refills at a cost of {estimate['20hrdil']} dilithium.</p>
					{this._renderChart()}
					<small>Powered by Chewable C++</small>
				</div>
			);
		}
	}

	_renderRewardsTitle(rewards) {
		const { voyageData } = this.props;
		const crewGained = rewards.filter(r => r.type === 1);
		const bestRarity = crewGained.length == 0 ? 0 : crewGained.map(c => c.rarity).reduce((acc, r) => Math.max(acc, r));
		const bestCrewCount = crewGained
			.filter(c => c.rarity == bestRarity)
			.map(c => c.quantity)
			.reduce((acc, c) => acc + c, 0);
		const chronReward = rewards.filter(r => r.symbol === 'energy');
		const chrons = chronReward.length == 0 ? 0 : chronReward[0].quantity;
		const honorReward = rewards.filter(r => r.symbol === 'honor');
		const honor = honorReward.length == 0 ? 0 : honorReward[0].quantity;
		return (
			<span>
				{`Rewards: ${bestCrewCount} ${bestRarity}* `}&nbsp;
				{` ${chrons} `}
				<img
					src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`}
					style={{width : '16px', verticalAlign: 'text-bottom'}}
				/>&nbsp;&nbsp;
				{` ${honor} `}
				<img
					src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
					style={{width : '16px', verticalAlign: 'text-bottom'}}
				/>
			</span>
		)
	}

	_renderRewards(rewards) {
		rewards = rewards.sort((a, b) => {
			if (a.type == b.type && a.item_type === b.item_type && a.rarity == b.rarity)
				return a.full_name.localeCompare(b.full_name);
			else if (a.type == b.type && a.item_type === b.item_type)
				return b.rarity - a.rarity;
			else if (a.type == b.type)
				return b.item_type - a.item_type;
			else if (a.type == 2)
				return 1;
			else if (b.type == 2)
				return -1;
			return a.type - b.type;
		});
		const hideRarity = entry => entry.type == 3;
		const rarity = entry => entry.type == 1 ? 1 : entry.rarity;
		const assetURL = file => {
			let url = file === 'energy_icon'
				? 'atlas/energy_icon.png'
				: `${file.substring(1).replaceAll('/', '_')}`;

			if (!url.match(/\.png$/))
				url += '.png'
			return `${process.env.GATSBY_ASSETS_URL}${url}`;
		};

		return (
			<div>
				<Grid columns={isMobile ? 2 : 5} centered padded>
					{rewards.map((entry, idx) => (
						<Grid.Column key={idx}>
								<Header
									style={{ display: 'flex' }}
									icon={
										<ItemDisplay
											src={assetURL(entry.icon.file)}
											size={48}
											rarity={rarity(entry)}
											maxRarity={entry.rarity}
											hideRarity={hideRarity(entry)}
										/>
									}
									content={entry.name}
									subheader={`Got ${entry.quantity}`}
								/>
						</Grid.Column>
					))}
				</Grid>
			</div>
		);
	}

	/* Not yet in use
	_renderReminder() {
		return (
			<div>
				<p>Remind me :-</p>
				<Form.Field
					control={Checkbox}
					label={<label>At the next dilemma.</label>}
					checked={this.state.dilemmaAlarm}
					onChange={(e, { checked }) => this.setState({ dilemmaAlarm: checked}) }
				/>
				<Form.Field
					control={Checkbox}
					label={<label>When the probably of voyage still running reaches {oddsControl}.</label>}
					checked={this.state.failureAlarm}
					onChange={(e, {checked}) => this.setState({failureAlarm : checked}) }
				/>
			</div>
		);
	}
	*/

	render() {
		const { voyageData } = this.props;

		if (!voyageData)
			return (<Dimmer active>
        <Loader>Calculating...</Loader>
      </Dimmer>);

		const { activePanels } = this.state;
		const voyState = voyageData.state;
		const rewards = {
			'pending': () => [],
			'started': () => voyageData.pending_rewards.loot,
			'failed': () => voyageData.pending_rewards.loot,
			'recalled': () => voyageData.pending_rewards.loot,
			'completed': () => voyageData.granted_rewards.loot
		}[voyState]();

		// Adds/Removes panels from the active list
		const flipItem = (items, item) => items.includes(item)
			? items.filter(i => i != item)
			: items.concat(item);
		const handleClick = (e, {index}) =>
			this.setState({
				activePanels: flipItem(activePanels, index)
			});
		const accordionPanel = (title, content, key, ctitle = false) => {
			const collapsedTitle = ctitle ? ctitle : title;
			const isActive = activePanels.includes(key);
			return (
				<Accordion.Panel
					active={isActive}
					index={key}
					onTitleClick={handleClick}
					title={isActive ? {icon: 'caret down', content: title} : {icon: 'caret right', content: collapsedTitle}}
					content={{content: <Segment>{content}</Segment>}}/>
			);
		};

		if (voyState !== 'pending') {
			const msgTypes = {
				started: ' has been running for ',
				failed: ' failed at ',
				recalled: ' ran for '
			};
			const voyagePriSec = Object.values(voyageData.skills)
																 .map(s1 => CONFIG.SKILLS_SHORT.filter(s2 => s2.name === s1)[0].short)
																 .join('/');

			return (
				<div>
					<Message>Your voyage ({voyagePriSec}){msgTypes[voyState] + this._formatTime(voyageData.log_index/180)}.</Message>
					<Accordion fluid exclusive={false}>
					{
						voyState !== 'recalled' &&
						accordionPanel('Voyage estimate', this._renderEstimate(voyState === 'failed'), 'estimate', this._renderEstimateTitle())
					}
					{ accordionPanel('Voyage lineup', this._renderCrew(), 'crew') }
					{
						accordionPanel('Rewards', this._renderRewards(rewards), 'rewards', this._renderRewardsTitle(rewards))
					}
					</Accordion>
				</div>
			);
		} else {
			return (
				<div>
					<Accordion fluid exclusive={false}>
						{ accordionPanel('Voyage estimate', this._renderEstimate(false), 'estimate', this._renderEstimateTitle()) }
						{ accordionPanel('Voyage lineup', this._renderCrew(), 'crew') }
					</Accordion>
				</div>
			);
		}
	}

}

export default VoyageStats;
