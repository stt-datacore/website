import React, { Component } from 'react';
import { Table, Grid, Header, Accordion, Segment, Message, Dimmer, Loader } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import { LineupViewer } from './lineupviewer';
import ItemDisplay from '../itemdisplay';

import { UnifiedWorker as Worker } from '../../typings/worker';
import { ResponsiveLineCanvas } from '@nivo/line';
import themes from '../nivo_themes';
import { PlayerCrew, PlayerData, PlayerEquipmentItem, Reward, Voyage } from '../../model/player';
import { Ship } from '../../model/ship';
import { Estimate, ExtendedVoyageStatsConfig, VoyageStatsConfig } from '../../model/worker';
import { CrewMember } from '../../model/crew';
import { EquipmentCommon } from '../../model/equipment';
import { checkReward, mergeItems } from '../../utils/itemutils';
import { GlobalContext } from '../../context/globalcontext';
import { formatTime } from '../../utils/voyageutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { IEventData } from '../eventplanner/model';

type VoyageStatsProps = {
	configSource?: 'player' | 'custom';
	voyageData: Voyage;	// Note: non-active voyage being passed here as IVoyageCalcConfig
	numSims?: number;
	ships: Ship[];
	showPanels: string[];
	estimate?: Estimate;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
	playerItems?: PlayerEquipmentItem[];
	allCrew?: CrewMember[];
	allItems?: EquipmentCommon[];
	playerData?: PlayerData;
};

type VoyageStatsState = {
	estimate?: Estimate;
	activePanels: string[];
	currentAm: number;
	currentDuration?: number;
	voyageBugDetected: boolean;
	hoverCrew?: CrewMember | PlayerCrew | undefined;
};

interface RefillBin {
	result: number;
	count: number;
}
interface Bins {
	[key: number]: RefillBin;
}

export class VoyageStats extends Component<VoyageStatsProps, VoyageStatsState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

	worker: Worker | undefined = undefined;
	ship?: Ship;
	config: ExtendedVoyageStatsConfig = {} as VoyageStatsConfig;

	static defaultProps = {
		roster: [],
	};

	updateAndRun(force?: boolean) {
		const { estimate, numSims, ships, configSource, voyageData } = this.props;

		if (!voyageData)
			return;

		this.ship = ships.length == 1 ? ships[0] : ships.find(s => s.id == voyageData?.ship_id);

		if (!estimate || force) {
			const duration = voyageData.voyage_duration ?? 0;
			const correctedDuration = this.state.voyageBugDetected ? duration - duration%7200 : duration;

			this.config = {
				others: [],
				numSims: numSims ?? 5000,
				startAm: voyageData.max_hp,
				currentAm: voyageData.hp ?? voyageData.max_hp,
				elapsedSeconds: correctedDuration,
				variance: 0
			} as VoyageStatsConfig;

			for (let agg of Object.values(voyageData.skill_aggregates)) {
				let skillOdds = 0.1;

				if (agg.skill == voyageData.skills.primary_skill)
					this.config.ps = agg;
				else if (agg.skill == voyageData.skills.secondary_skill)
					this.config.ss = agg;
				else {
					if (!this.config.others) this.config.others = [];
					this.config.others.push(agg);
				}


				this.config.variance += ((agg.range_max-agg.range_min)/(agg.core + agg.range_max))*skillOdds;
			}

			if (this.worker) {
				this.worker.terminate();
				this.worker.removeEventListener('message', this._eventListener);
				this.worker = undefined;
			}

			this.worker = new Worker();
			this.worker.addEventListener('message', this._eventListener);

			this.beginCalc();
		}
	}

	private readonly _eventListener = (message) => {
		this.setState({ estimate: message.data.result });
	}

	constructor(props: VoyageStatsProps | Readonly<VoyageStatsProps>) {
		super(props);
		const { estimate, showPanels, voyageData } = this.props;

		this.state = {
			estimate: estimate,
			activePanels: showPanels ? showPanels : [],
			voyageBugDetected: 	Math.floor(voyageData.voyage_duration/7200) > Math.floor(voyageData.log_index/360),
			currentAm: props.voyageData.hp ?? voyageData.max_hp
		};

		this.updateAndRun();
	}

	private beginCalc() {
		if (this.config.elapsedSeconds) {
			let nextHour = Math.ceil(this.config.elapsedSeconds / 3600);
			if (nextHour % 2) nextHour++;

			if (nextHour >= 18 && (this.config?.selectedTime === undefined || this.config.selectedTime <= nextHour)) {
				this.config.selectedTime = nextHour + 4;
			}

			if (this.config?.selectedTime !== undefined) {
				if (this.config.selectedTime <= nextHour) {
					this.config.selectedTime = nextHour + 2;
				}
				this.worker?.postMessage({ worker: 'voyageEstimateExtended', config: this.config });
				return;
			}
		}

		this.worker?.postMessage({ worker: 'voyageEstimate', config: this.config });
	}

	componentWillUnmount() {
		if (this.worker)
			this.worker.terminate();
	}

	componentDidUpdate(prevProps: Readonly<VoyageStatsProps>, prevState: Readonly<VoyageStatsState>, snapshot?: any): void {
		if (prevProps.playerData !== this.props.playerData || prevProps.voyageData !== this.props.voyageData) {
			this.updateAndRun(true);
		}
	}

	_formatTime(time: number) {
		return formatTime(time, this.context.localized.t);
		// let hours = Math.floor(time);
		// let minutes = Math.floor((time-hours)*60);

		// return hours+"h " +minutes+"m";
	}

	_renderChart(needsRevive?: boolean) {
		const estimate = this.props.estimate ?? this.state.estimate;
		const { t } = this.context.localized;
		const names = needsRevive ? [t('voyage.estimate.first_refill'), t('voyage.estimate.second_refill')]
															: [ t('voyage.estimate.no_refills'), t('voyage.estimate.one_refill'), t('voyage.estimate.two_refills')];
		const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
		const rawData = needsRevive ? estimate?.refills : estimate?.refills.slice(0, 2);
		// Convert bins to percentages
		const data = estimate?.refills.map((refill, index) => {
			var bins = {} as Bins;
			const binSize = 1/30;

			for (var result of refill.all.sort()) {
				const bin = Math.floor(result/binSize)*binSize+binSize/2;

			  try{
				++bins[bin].count;
			  }
			  catch {
				bins[bin] = {result: bin, count: 1};
			  }
			}

			delete bins[NaN];
			var refillBins = Object.values(bins);

			const total = refillBins
				.map(value => value.count)
				.reduce((acc, value) => acc + value, 0);
			var aggregate = total;
			const cumValues = value => {
				aggregate -= value.count;
				return {x: value.result, y: (aggregate/total)*100};
			};
			const ongoing = value => { return {x: value.result, y: value.count/total}};

			const percentages = refillBins
				.sort((bin1, bin2) => bin1.result - bin2.result)
				.map(cumValues);

			return {
				id: names[index],
				data: percentages
			};
		});
		if (!data) return <></>;

		return (
			<div style={{height : 200}}>
				<ResponsiveLineCanvas
					data={data}
					xScale= {{type: 'linear', min: data[0].data[0].x}}
					yScale={{type: 'linear', max: 100 }}
					theme={themes.dark}
					axisBottom={{legend : t('voyage.estimate.legend.voyage_length'), legendOffset: 30, legendPosition: 'middle'}}
					axisLeft={{legend : t('voyage.estimate.legend.chance_%'), legendOffset: -36, legendPosition: 'middle'}}
					margin={{ top: 50, right: 170, bottom: 50, left: 60 }}
					enablePoints= {true}
					pointSize={0}
					crosshairType={undefined}
					tooltip={input => {
						let data = input.point.data;
						return <>{input.point.serieId}:
						{t('voyage.estimate.n_chance_of_reaching_t', {
							n: (data.y as number).toFixed(2),
							t: this._formatTime(data.x as number)
						})}
						</>;
					}}
					legends={[
						{
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
		const { configSource, voyageData, roster, rosterType } = this.props;
		if (!this.ship || !roster) return <></>;
		return <LineupViewer configSource={configSource} voyageConfig={voyageData} ship={this.ship} roster={roster} rosterType={rosterType} />;
	}

	_renderEstimateTitle(needsRevive: boolean = false) {
		const estimate  = this.props.estimate ?? this.state.estimate;
		const { t } = this.context.localized;
		return needsRevive || !estimate
			?	t('voyage.estimate.estimate')
			: t('voyage.estimate.estimate_time', {
				time: this._formatTime(estimate['refills'][0].result)
			});
	}

	_renderPrettyCost(cost: number, idx: number) {
		if (this.context.player.playerData && cost) {
			const { t } = this.context.localized;
			let revivals = this.context.player.playerData.player.character.items.find(f => f.symbol === 'voyage_revival');

			if (revivals && revivals.quantity && revivals.quantity >= idx) {
				let globalItem = this.context.core.items.find(f => f.symbol === 'voyage_revival');
				if (globalItem) {
					revivals = mergeItems([revivals], [globalItem])[0];
					return <div style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "left"
					}}>
						<div style={{width: "32px"}}>
						<img style={{height:"24px", margin:"0.5em"}} src={`${process.env.GATSBY_ASSETS_URL}${revivals.imageUrl}`} />
						</div>
						<span>{idx} / {revivals.quantity} {t('global.item_types.voyage_consumable')}</span>
					</div>
				}
			}
			else {
				return <div style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "left"
				}}>
					<div style={{width: "32px"}}>
					<img style={{height:"24px", margin:"0.5em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`} />
					</div>
					<span>{cost} {t('global.item_types.dilithium')}</span>
				</div>
			}
		}


		return <>{cost == 0 || 'Costing ' + cost + ' dilithium'}</>
	}

	_renderEstimate(needsRevive: boolean = false) {
		const estimate  = this.props.estimate ?? this.state.estimate;
		const { t, tfmt } = this.context.localized;
		if (!estimate)
			return (<div>{t('spinners.calculating_voyage_estimate')}</div>);

		const renderEst = (label, refills, idx) => {
			if (refills >= estimate['refills'].length) return (<></>);
			const est = estimate['refills'][refills];
			return (
				<tr>
					<td>{label}: {this._formatTime(est.result)}</td>
					{!isMobile && <td>90%: {this._formatTime(est.safeResult)}</td>}
					<td>99%: {this._formatTime(est.saferResult)}</td>
					<td>
						{t('voyage.estimate.dilemma_chance', {
							time: `${est.lastDil}`,
							chance: `${Math.floor(est.dilChance)}`
						})}
					</td>
					<td>{this._renderPrettyCost(est.refillCostResult, idx)}</td>
				</tr>
			);
		};

		if (estimate.deterministic) {
			let extendTime = estimate['refills'][1].result - estimate['refills'][0].result;
			let refill = 0;

			return (
				<div>
					{t('voyage.estimate.voyage_end', {
						time: this._formatTime(estimate['refills'][0].result)
					})}
					{t('voyage.estimate.voyage_extend', {
						time: this._formatTime(extendTime)
					})}
					{/*
					For a {this.config?.selectedTime ?? 20} hour voyage you need {estimate['refillshr20']} refills at a cost of {estimate['dilhr20']} dilithium (or {estimate['refillshr20']} voyage revivals.) */}
										<Table style={{marginTop:"0.5em"}}><tbody>
						{!needsRevive && renderEst(t('voyage.estimate.estimate'), refill++, 0)}
						{renderEst(t('voyage.estimate.1_refill'), refill++, 1)}
						{renderEst(t('voyage.estimate.n_refills', { n: '2' }), refill++, 2)}
					</tbody></Table>
					<p>
						{t('voyage.estimate.voyage_long_advice', {
							h: `${this.config?.selectedTime ?? 20}`,
							r: `${estimate['refillshr20']}`,
							d: `${estimate['dilhr20']}`,
							re: `${estimate['refillshr20']}`
						})}
					</p>
				</div>
			);
		} else {
			let refill = 0;

			return (
				<div>
					<Table><tbody>
						{!needsRevive && renderEst(t('voyage.estimate.estimate'), refill++, 0)}
						{renderEst(t('voyage.estimate.1_refill'), refill++, 1)}
						{renderEst(t('voyage.estimate.n_refills', { n: '2' }), refill++, 2)}
					</tbody></Table>
					<p>
						{t('voyage.estimate.voyage_long_advice', {
							h: `${this.config?.selectedTime ?? 20}`,
							r: `${estimate['refillshr20']}`,
							d: `${estimate['dilhr20']}`,
							re: `${estimate['refillshr20']}`
						})}
					</p>
					{estimate.final && this._renderChart()}
				</div>
			);
		}
	}

	_renderRewardsTitle(rewards): JSX.Element {
		const { roster } = this.props;
		const { t, tfmt } = this.context.localized;
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
		let h = 0;
		if (roster?.length && crewGained?.length) {
			let duplicates = crewGained.filter((crew) => roster.some((rost) => rost.symbol === crew.symbol && rost.rarity === rost.max_rarity)).map((cg) => roster.find(r => r.symbol === cg.symbol));
			if (duplicates?.length) {
				for (let crew of duplicates) {
					if (crew.max_rarity === 5) {
						h += 550;
					}
					else if (crew.max_rarity === 4) {
						h += 200;
					}
					else if (crew.max_rarity === 3) {
						h += 100;
					}
					else if (crew.max_rarity === 2) {
						h += 50;
					}
					else {
						h += 25;
					}
				}
			}
		}

		const dupeHonor = h + honor;

		return (
			<span>
				{`${t('base.rewards')}: ${bestCrewCount} ${bestRarity}* `}&nbsp;
				{` ${chrons.toLocaleString()} `}
				<img
					src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`}
					style={{width : '16px', verticalAlign: 'text-bottom'}}
				/>&nbsp;&nbsp;
				{` ${honor.toLocaleString()} `}
				<img
					src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
					style={{width : '16px', verticalAlign: 'text-bottom'}}
				/>

				{dupeHonor && (
					<span> ({tfmt('voyage.or_n_h_if_dupes_dismissed', {
						n: dupeHonor.toLocaleString(),
						h: <img
								src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
								style={{width : '16px', verticalAlign: 'text-bottom'}}
							/>
					})})
					</span>
				)}
			</span>
		)
	}

	_renderRewards(rewards): JSX.Element {
		const { playerItems, roster } = this.props;

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
		const getCrewSymbol = entry => entry.type == 1 ? entry.symbol : entry.symbol;
		const assetURL = file => {
			let url = file === 'energy_icon'
				? 'atlas/energy_icon.png'
				: `${file.substring(1).replaceAll('/', '_')}`;

			if (!url.match(/\.png$/))
				url += '.png'
			return `${process.env.GATSBY_ASSETS_URL}${url}`;
		};

		const itemsOwned = item => {
			const pItem = playerItems?.find(i => i.symbol == item.symbol);
			return `(Have ${pItem ? (pItem?.quantity ?? 0) > 1000 ? `${Math.floor((pItem.quantity ?? 0)/1000)}k+` : pItem.quantity : 0})`;
		};
		const ownedFuncs = [
			item => '',
			item => {
				const owned = roster?.filter(c => c.symbol == item.symbol);

				for (const c of owned ?? [])
					if (c.rarity < c.max_rarity)
						return '(Fusable)';

				return  (owned?.length ?? 0) > 0 ? '(Duplicate)' : '(Unowned)';
			},
			itemsOwned,
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			itemsOwned,	/* ship schematics */
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
			item => '',
		];

		var me = this;

		return (
			<>
			<div>
				<Grid columns={isMobile ? 2 : 5} centered padded>
					{rewards.map((reward: Reward, idx) => {
						checkReward(this.props.allItems ?? [], reward);
						return (
						<Grid.Column key={idx}>
							<Header
								style={{ display: 'flex' }}
								icon={
									<ItemDisplay
										quantity={reward.quantity}
										src={assetURL(reward.icon?.file)}
										size={48}
										rarity={rarity(reward)}
										maxRarity={reward.rarity}
										hideRarity={hideRarity(reward)}
										targetGroup={reward.type === 1 ? 'voyageRewards_crew' : 'voyageRewards_item'}
										itemSymbol={getCrewSymbol(reward)}
										allCrew={this.props.allCrew}
										allItems={this.props.allItems}
										playerData={this.props.playerData}
									/>
								}
								content={reward.name}
								subheader={`Got ${reward.quantity?.toLocaleString()} ${ownedFuncs[reward.type] ? ownedFuncs[reward.type](reward) : reward.type}`}
							/>
						</Grid.Column>
					)}
				)}
				</Grid>
			</div>
			</>
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
		const rewards = voyState !== 'pending' ? voyageData.pending_rewards.loot : [];
		const { t } = this.context.localized;
		// Adds/Removes panels from the active list
		const flipItem = (items: string[], item: string) => items.includes(item)
			? items.filter(i => i != item)
			: items.concat(item);

		const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, {index}: { index: string | number | undefined; }) =>
			this.setState({
				activePanels: flipItem(activePanels, index as string)
			});

		const accordionPanel = (title: string, content: JSX.Element, key: string, ctitle?: string | JSX.Element) => {

			const collapsedTitle = ctitle ? ctitle : title;
			const isActive = activePanels.includes(key);

			return (
				<Accordion.Panel
					active={isActive}
					index={key}
					onTitleClick={(e, {index}) => handleClick(e, {index})}
					title={isActive ? {icon: 'caret down', content: collapsedTitle} : {icon: 'caret right', content: collapsedTitle}}
					content={{content: <Segment>{content}</Segment>}}/>
			);
		};

		if (voyState !== 'pending') {
			const timeDiscrepency = Math.floor(voyageData.voyage_duration/7200) - Math.floor(voyageData.log_index/360);
			const voyageDuration = this._formatTime(voyageData.state == 'started' ? voyageData.voyage_duration/3600 : voyageData.log_index/180);

			return (
				<div>
					{(voyageData.state === 'started' && timeDiscrepency > 0) &&
						<Message warning>
							{t('voyage.overrun_problem_text.line_1')}
							{t('voyage.overrun_problem_text.line_2')}
							{t('voyage.overrun_problem_text.line_3')}
						</Message>
					}
					<Accordion fluid exclusive={false}>
					{
						voyState !== 'recalled' && voyState !== 'completed' &&
						accordionPanel(t('voyage.estimate.title'), this._renderEstimate(voyState === 'failed'), 'estimate', this._renderEstimateTitle())
					}
					{ accordionPanel(t('voyage.lineup.title'), this._renderCrew(), 'crew') }
					{
						accordionPanel(t('base.rewards'), this._renderRewards(rewards), 'rewards', this._renderRewardsTitle(rewards))
					}
					</Accordion>
				</div>
			);
		} else {
			return (
				<div>
					<Accordion fluid exclusive={false}>
						{ accordionPanel(t('voyage.estimate.title'), this._renderEstimate(false), 'estimate', this._renderEstimateTitle()) }
						{ accordionPanel(t('voyage.lineup.title'), this._renderCrew(), 'crew') }
					</Accordion>
				</div>
			);
		}
	}

}

export default VoyageStats;
