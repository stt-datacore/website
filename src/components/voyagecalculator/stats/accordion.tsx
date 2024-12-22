import React, { Component } from 'react';
import { Accordion, Message, Dimmer, Loader } from 'semantic-ui-react';

import { UnifiedWorker as Worker } from '../../../typings/worker';
import { PlayerCrew, PlayerData, PlayerEquipmentItem, Voyage } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { Estimate, ExtendedVoyageStatsConfig, VoyageStatsConfig } from '../../../model/worker';
import { CrewMember } from '../../../model/crew';
import { GlobalContext } from '../../../context/globalcontext';
import { formatTime } from '../../../utils/voyageutils';
import { VoyageStatsEstimate, VoyageStatsEstimateTitle } from './statsestimate';

import { StatsAccordionPanel } from './accordionpanel';

type VoyageStatsProps = {
	configSource?: 'player' | 'custom';
	voyageData: Voyage;	// Note: non-active voyage being passed here as IVoyageCalcConfig
	numSims?: number;
	ships: Ship[];
	estimate?: Estimate;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
	playerData?: PlayerData;
	isActive?: boolean;
};

type VoyageStatsState = {
	estimate?: Estimate;
	isActive: boolean;
	currentAm: number;
	currentDuration?: number;
	voyageBugDetected: boolean;
	hoverCrew?: CrewMember | PlayerCrew | undefined;
};

export class VoyageStatsAccordion extends Component<VoyageStatsProps, VoyageStatsState> {
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
		const { estimate, voyageData } = this.props;

		this.state = {
			estimate: estimate,
			isActive: props.isActive ?? false,
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
	}

	_renderEstimateTitle() {
		return (
			<VoyageStatsEstimateTitle
				selectedTime={this.config.selectedTime}
				estimate={this.props.estimate ?? this.state.estimate}
			/>
		)
	}

	_renderEstimate(voyState?: string) {
		return (
			<VoyageStatsEstimate
				selectedTime={this.config?.selectedTime}
				estimate={this.props.estimate ?? this.state.estimate}
				needsRevive={voyState == 'failed'}
			/>
		)
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
		const { t } = this.context.localized;

		if (!voyageData) {
			return (
				<Dimmer active>
					<Loader>{t('spinners.default')}</Loader>
			  	</Dimmer>
			);
		}

		const { isActive } = this.state;
		const voyState = voyageData.state;

		// Adds/Removes panels from the active list

		const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, {index}: { index: string | number | undefined; }) =>
			this.setState({
				...this.state, isActive: !isActive
			});

		const accordionPanel = (title: string, content: JSX.Element, key: string, ctitle?: string | JSX.Element) => {
			return (
				<StatsAccordionPanel
					isActive={isActive}
					handleClick={handleClick}
					title={title}
					content={content}
					index={key}
					collapsedTitle={ctitle}
					/>
			)
		};

		if (voyState !== 'pending') {
			const timeDiscrepency = Math.floor(voyageData.voyage_duration/7200) - Math.floor(voyageData.log_index/360);
			// const voyageDuration = this._formatTime(voyageData.state == 'started' ? voyageData.voyage_duration/3600 : voyageData.log_index/180);

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
						accordionPanel(
							t('voyage.estimate.title'),
							this._renderEstimate(voyState),
							'estimate',
							this._renderEstimateTitle()
						)
					}
					</Accordion>
				</div>
			);
		} else {
			return (
				<div>
					<Accordion fluid exclusive={false}>
						{
							accordionPanel(
								t('voyage.estimate.title'),
								this._renderEstimate(),
								'estimate',
								this._renderEstimateTitle()
							)
						}
					</Accordion>
				</div>
			);
		}
	}

}

export default VoyageStatsAccordion;
