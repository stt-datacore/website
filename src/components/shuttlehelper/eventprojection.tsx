import React from 'react';
import { Button, Divider, Dropdown, Message } from 'semantic-ui-react';

import { IEventData } from '../../model/events';
import { GameEvent, PlayerEquipmentItem, TranslateMethod } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';

import { IShuttleScores, IDropdownOption } from './model';

interface IEventState {
	currentVP: number;
	secondsToEndShuttles: number;
	endType: 'event' | 'faction phase';
};

const defaultEventState: IEventState = {
	currentVP: 0,
	secondsToEndShuttles: 0,
	endType: 'event'
};

interface ISchedule {
	shuttleCount: number;
	shuttleDuration: number;
	shuttleRegularity: number;
	projection: IProjection;
};

interface IProjection {
	estimatedVP: number;
	runsFailed: number;
	rentals: number;
	boosts: IBoosts;
};

interface IBoosts {
	type: 'none' | 'rewardBoost' | 'timeReduction';
	rarity: number;
	count: number;
};

const defaultDuration: number = 180;
const defaultRegularity: number = 1;
const defaultProjection: IProjection = {
	estimatedVP: 0,
	runsFailed: 0,
	rentals: 0,
	boosts: {
		type: 'none',
		rarity: -1,
		count: 0
	}
};

type EventProjectionProps = {
	eventData: IEventData;
	shuttleScores: IShuttleScores;
};

export const EventProjection = (props: EventProjectionProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { t, tfmt } = globalContext.localized;
	const { eventData, shuttleScores } = props;

	const [eventState, setEventState] = React.useState<IEventState>(defaultEventState);
	const [schedules, setSchedules] = React.useState<ISchedule[]>([]);
	const [projections, setProjections] = React.useState<IProjection[]>([]);

	React.useEffect(() => {
		const eventState: IEventState = {
			currentVP: 0,
			secondsToEndShuttles: eventData.seconds_to_end,
			endType: 'event'
		};
		// EventPlanner eventData doesn't hold VP or phases, so get those values from ephemeral events
		if (ephemeral) {
			const activeEvent: GameEvent | undefined = ephemeral.events.find(
				event => event.symbol === eventData.symbol
			);
			if (activeEvent) {
				eventState.currentVP = activeEvent.victory_points ?? 0;
				if (activeEvent.content_types.length > 1) {
					activeEvent.phases.forEach((phase, phaseIdx) => {
						if (activeEvent.content_types[phaseIdx] === 'shuttles')
							eventState.secondsToEndShuttles = phase.seconds_to_end;
							eventState.endType = 'faction phase';
					});
				}
			}
		}
		setEventState({...eventState});
	}, [playerData, eventData]);

	React.useEffect(() => {
		const schedules: ISchedule[] = [];
		schedules.push({
			shuttleCount: Object.values(shuttleScores).length,
			shuttleDuration: defaultDuration,
			shuttleRegularity: defaultRegularity,
			projection: defaultProjection
		});
		setSchedules([...schedules]);
	}, [shuttleScores]);

	React.useEffect(() => {
		const projections: IProjection[] = [];
		const shuttlesScheduled: number = schedules.reduce((prev, curr) => prev + curr.shuttleCount, 0);
		const bestShuttleChances: number[] = Object.values(shuttleScores)
			.map(shuttleScore => shuttleScore.chance)
			.sort((a, b) => b - a)
			.slice(0, shuttlesScheduled);

		let shuttlesRun: number = 0;
		schedules.forEach(schedule => {
			const scheduleShuttleChances: number[] = [];
			while (scheduleShuttleChances.length < schedule.shuttleCount && bestShuttleChances.length > 0) {
				let shuttleChance: number | undefined = schedule.shuttleCount === 180 ? bestShuttleChances.pop() : bestShuttleChances.shift();
				if (shuttleChance) scheduleShuttleChances.push(shuttleChance);
			}
			projections.push(projectSchedule(
				scheduleShuttleChances,
				schedule.shuttleDuration,
				schedule.shuttleRegularity,
				shuttlesRun
			));
			shuttlesRun += schedule.shuttleCount;
		});
		setProjections([...projections]);
	}, [eventState, shuttleScores, schedules]);

	if (eventData.seconds_to_start !== 0) return <></>;

	const scoredShuttles: number = Object.values(shuttleScores).length;
	if (scoredShuttles === 0) return <></>;

	return (
		<Message>
			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<div>
					<div style={{ display: 'inline-block' }}>
						<Scheduler scoredShuttles={scoredShuttles} schedules={schedules} setSchedules={setSchedules} />
					</div>
					{renderNeeds()}
				</div>
				<div style={{ textAlign: 'center' }}>
					{eventState.endType === 'event' && t('shuttle_helper.event.finish_event_with_colon')}
					{eventState.endType === 'faction phase' && t('shuttle_helper.event.finish_faction_with_colon')}
					<div style={{ margin: '.5em 0', fontSize: '2em' }}>
						<b>
							{getProjection().toLocaleString()} {t('shuttle_helper.event.vp')}
						</b>
					</div>
					({t('shuttle_helper.event.current_vp', { vp: eventState.currentVP.toLocaleString() })})
				</div>
			</div>
		</Message>
	);

	function projectSchedule(shuttleChances: number[], shuttleDuration: number, shuttleRegularity: number, shuttleIndex: number): IProjection {
		interface IBoostMap {
			duration: number,
			rarity: number,
			type: 'none' | 'rewardBoost' | 'timeReduction'
		};
		const boostsMap: IBoostMap[] = [
			{ duration: 540, rarity: 0, type: 'rewardBoost' },
			{ duration: 170, rarity: 0, type: 'timeReduction' },
			{ duration: 150, rarity: 1, type: 'timeReduction' },
			{ duration: 120, rarity: 2, type: 'timeReduction' },
			{ duration: 90, rarity: 3, type: 'timeReduction' },
			{ duration: 60, rarity: 4, type: 'timeReduction' },
			{ duration: 30, rarity: 5, type: 'timeReduction' },
		];
		const boosts: IBoostMap | undefined = boostsMap.find(boost => boost.duration === shuttleDuration);
		const projection: IProjection = {
			estimatedVP: 0,
			runsFailed: 0,
			rentals: 0,
			boosts: {
				type: boosts?.type ?? 'none',
				rarity: boosts?.rarity ?? -1,
				count: 0
			}
		};
		// Assume max mission value for events (i.e. 4000 VP)
		const MISSION_VALUE: number = 4000;
		const multiplier: number = shuttleDuration === 540 ? 2 : 1;
		const shuttleBays: number = playerData?.player.character.shuttle_bays ?? 4;
		if (eventState.secondsToEndShuttles > 0) {
			const maxRunsLeft: number = Math.floor(eventState.secondsToEndShuttles/(shuttleDuration*60));
			const runsLeft: number = Math.round(shuttleRegularity*maxRunsLeft);
			shuttleChances.forEach((shuttleChance, idx) => {
				const runsSuccessful: number = Math.round(runsLeft*shuttleChance);
				const runsFailed: number = runsLeft - runsSuccessful;
				projection.estimatedVP += (runsSuccessful*MISSION_VALUE*multiplier)+(runsFailed*MISSION_VALUE*multiplier/5);
				projection.runsFailed += runsFailed;
				if (shuttleIndex + idx + 1 > shuttleBays) projection.rentals += runsLeft;
				if (shuttleDuration !== 180) projection.boosts.count += runsLeft;
			});
		}
		return projection;
	}

	function getProjection(): number {
		return projections.reduce((prev, curr) => prev + curr.estimatedVP, eventState.currentVP);
	}

	function renderNeeds(): React.JSX.Element {
		const needs: React.JSX.Element[] = [];

		const rentals: number = projections.reduce((prev, curr) => prev + curr.rentals, 0);
		if (rentals > 0) {
			needs.push(
				<span>
					<b>{rentals} shuttle rental token{rentals !== 1 ? 's' : ''}</b>
					{playerData && <>{` `}({playerData.player.shuttle_rental_tokens} in inventory)</>}
				</span>
			);
		}

		const rewardBoosts: number = projections.filter(projection =>
			projection.boosts.type === 'rewardBoost'
		).reduce((prev, curr) => prev + curr.boosts.count, 0);
		if (rewardBoosts > 0) {
			const itemInventory: PlayerEquipmentItem | undefined = playerData?.player.character.items.find(item =>
				item.symbol === `reward_bonus_0_shuttle_consumable`
			);
			needs.push(
				<span>
					<b>{rewardBoosts} 0* reward boost{rewardBoosts !== 1 ? 's' : ''}</b>
					{itemInventory && <>{` `}({itemInventory.quantity} in inventory)</>}
				</span>
			);
		}

		for (let boostRarity = 0; boostRarity <= 5; boostRarity++) {
			const timeReductions: number = projections.filter(projections =>
				projections.boosts.type === 'timeReduction' && projections.boosts.rarity === boostRarity
			).reduce((prev, curr) => prev + curr.boosts.count, 0);
			if (timeReductions > 0) {
				const itemReference: PlayerEquipmentItem | undefined = globalContext.core.items.find(item =>
					item.symbol === `time_bonus_${boostRarity}_shuttle_consumable`
				);
				const itemInventory: PlayerEquipmentItem | undefined = playerData?.player.character.items.find(item =>
					item.symbol === `time_bonus_${boostRarity}_shuttle_consumable`
				);
				needs.push(
					<span>
						<b>{timeReductions} x {boostRarity}* {itemReference?.name}</b>
						{itemInventory && <>{` `}({t('items.n_owned', { n: `${itemInventory.quantity}` })})</>}
					</span>
				);
			}
		}

		if (needs.length === 0) return <></>;

		return (
			<div style={{ marginTop: '2em', textAlign: 'center' }}>
				{tfmt('items.this_will_require_items', {
					items: <>{needs.map((need, idx) => {
						let delimiter: string = idx > 0 ? ', ' : '';
						if (needs.length > 1 && idx === needs.length - 1) delimiter += ` ${t('global.and')} `;
						return <span key={idx}>{delimiter}{need}</span>;
					})}</>
				})}
			</div>
		);
	}
};

type SchedulerProps = {
	scoredShuttles: number;
	schedules: ISchedule[];
	setSchedules: (schedules: ISchedule[]) => void;
};

const Scheduler = (props: SchedulerProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { scoredShuttles, schedules, setSchedules } = props;

	const scheduledShuttles: number = schedules.reduce((prev, curr) => prev + curr.shuttleCount, 0);

	return (
		<React.Fragment>
			{schedules.map((schedule, idx) => renderSchedule(schedule, idx))}
			{scheduledShuttles < scoredShuttles && (
				<div style={{ marginTop: '2em' }}>
					<Button compact content={t('shuttle_helper.missions.schedule_other')} onClick={addSchedule} />
				</div>
			)}
		</React.Fragment>
	);

	function renderSchedule(schedule: ISchedule, idx: number): React.JSX.Element {
		let unscheduledShuttles: number = scoredShuttles;
		for (let i = 0; i < idx; i++) {
			unscheduledShuttles -= schedules[i].shuttleCount;
		}
		return (
			<ScheduleRow key={idx}
				schedule={schedule}
				setSchedule={(schedule) => updateSchedules(idx, schedule)}
				maxShuttles={unscheduledShuttles}
				firstSchedule={idx === 0}
				deleteSchedule={() => onDeleteSchedule(idx)}
			/>
		);
	}

	function addSchedule(): void {
		schedules.push({
			shuttleCount: scoredShuttles - scheduledShuttles,
			shuttleDuration: defaultDuration,
			shuttleRegularity: defaultRegularity,
			projection: defaultProjection
		});
		setSchedules([...schedules]);
	}

	function onDeleteSchedule(idx: number): void {
		schedules.splice(idx, 1);
		setSchedules([...schedules]);
	}

	function updateSchedules(idx: number, schedule: ISchedule): void {
		schedules[idx] = schedule;
		// Validate schedules on update
		let validScheduleCount: number = 0;
		let unscheduledShuttles: number = scoredShuttles;
		schedules.forEach(schedule => {
			if (unscheduledShuttles > 0) {
				if (schedule.shuttleCount > unscheduledShuttles)
					schedule.shuttleCount = unscheduledShuttles;
				unscheduledShuttles -= schedule.shuttleCount;
				validScheduleCount++;
			}
		});
		const validSchedules: ISchedule[] = schedules.splice(0, validScheduleCount);
		setSchedules([...validSchedules]);
	}
};

type ScheduleRowProps = {
	schedule: ISchedule;
	setSchedule: (schedule: ISchedule) => void;
	maxShuttles: number;
	firstSchedule: boolean;
	deleteSchedule: () => void;
};

const ScheduleRow = (props: ScheduleRowProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { schedule, setSchedule, maxShuttles, firstSchedule, deleteSchedule } = props;

	return (
		<React.Fragment>
			{!firstSchedule && <Divider horizontal>And</Divider>}
			<div>
				{tfmt('shuttle_helper.event.runner', {
					count: renderCount(),
					duration: renderDuration(),
					rate: renderRate()
				})}
				{!firstSchedule && (
					<span style={{ paddingLeft: '1em' }}>
						<Button compact icon='x' onClick={deleteSchedule} />
					</span>
				)}
			</div>
		</React.Fragment>
	);

	function renderCount(): React.JSX.Element {
		const rateOptions: IDropdownOption[] = [];
		for (let i = maxShuttles; i > 0; i--) {
			rateOptions.push({
				key: i, value: i, text: `${i}`
			});
		}
		return (
			<Dropdown
				compact
				selection
				options={rateOptions}
				value={schedule.shuttleCount}
				onChange={(e, { value }) => setSchedule({...schedule, shuttleCount: value as number}) }
			/>
		);
	}

	function renderDuration(): React.JSX.Element {
		const durationOptions: IDropdownOption[] = [
			{ key: '30m', value: 30, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minute_class', { minutes: '30'})}</span> },
			{ key: '60m', value: 60, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minute_class', { minutes: '60'})}</span> },
			{ key: '90m', value: 90, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minute_class', { minutes: '90'})}</span> },
			{ key: '2h', value: 120, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hour_class', { hours: '2'})}</span> },
			{ key: '3h', value: 180, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hour_class', { hours: '3'})}</span> },
			{ key: '9h', value: 540, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hour_class', { hours: '9'})}</span> }
		];
		return (
			<Dropdown
				compact
				selection
				options={durationOptions}
				value={schedule.shuttleDuration}
				onChange={(e, { value }) => setSchedule({...schedule, shuttleDuration: value as number, shuttleRegularity: 1}) }
			/>
		);
	}

	function renderRate(): React.JSX.Element {
		let regularityOptions: IDropdownOption[] = [
			{ key: '3h', value: 180/180, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '3'})}</span> },
			{ key: '3.5h', value: 180/210, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '3.5'})}</span> },
			{ key: '4h', value: 180/240, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '4'})}</span> },
			{ key: '6h', value: 180/360, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '6'})}</span> },
			{ key: '9h', value: 180/540, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '9'})}</span> },
			{ key: '12h', value: 180/720, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '12'})}</span> },
			{ key: '24h', value: 180/1440, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '24'})}</span> }
		];
		if (schedule.shuttleDuration === 30) {
			regularityOptions = [
				{ key: '30m', value: 30/30, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '30'})}</span> },
				{ key: '40m', value: 30/40, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '40'})}</span> },
				{ key: '50m', value: 30/50, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '50'})}</span> }
			];
		}
		else if (schedule.shuttleDuration === 60) {
			regularityOptions = [
				{ key: '60m', value: 60/60, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '30'})}</span> },
				{ key: '70m', value: 60/70, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '70'})}</span> },
				{ key: '80m', value: 60/80, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '80'})}</span> }
			];
		}
		else if (schedule.shuttleDuration === 90) {
			regularityOptions = [
				{ key: '90m', value: 90/90, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '90'})}</span> },
				{ key: '105m', value: 90/105, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_minutes', { minutes: '105'})}</span> },
				{ key: '120m', value: 90/120, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '2'})}</span> },
				{ key: '150m', value: 90/150, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '2.5'})}</span> }
			];
		}
		else if (schedule.shuttleDuration === 120) {
			regularityOptions = [
				{ key: '120m', value: 120/120, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '2'})}</span> },
				{ key: '135m', value: 120/135, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '2.25'})}</span> },
				{ key: '150m', value: 120/150, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '2.5'})}</span> }
			];
		}
		else if (schedule.shuttleDuration === 540) {
			regularityOptions = [
				{ key: '9h', value: 540/540, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '9'})}</span> },
				{ key: '12h', value: 540/720, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '12'})}</span> },
				{ key: '18h', value: 540/1080, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '18'})}</span> },
				{ key: '24h', value: 540/1440, text: <span style={{ whiteSpace: 'nowrap' }}>{t('duration.n_hours', { hours: '24'})}</span> }
			];
		}
		return (
			<Dropdown
				compact
				selection
				options={regularityOptions}
				value={schedule.shuttleRegularity}
				onChange={(e, { value }) => setSchedule({...schedule, shuttleRegularity: value as number}) }
			/>
		);
	}
};
