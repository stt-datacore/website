import React from "react";
import {
	Container,
	Header,
	Message,
	Segment,
	Label,
	Grid,
	Modal,
	Icon,
	Step,
	Table,
	DropdownItemProps,
	Dropdown,
	Pagination,
	SemanticWIDTHS,
	Button,
} from "semantic-ui-react";

import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';

import LazyImage from "../components/lazyimage";
import { EventInfoModal, EventModalHeader } from "../components/event_info_modal";
import { EventLeaderboard } from "../model/events";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { DEFAULT_MOBILE_WIDTH } from "../components/hovering/hoverstat";
import { EventStats, makeTypeBuckets } from "../utils/event_stats";
import { GauntletPane } from "../utils/gauntlet";
import { AvatarView } from "../components/item_presenters/avatarview";
import { CrewHoverStat } from "../components/hovering/crewhoverstat";
import { useStateWithStorage } from "../utils/storage";
import { gradeToColor } from "../utils/crewutils";
import { OptionsPanelFlexRow } from "../components/stats/utils";
import { useLocaleDate } from "../components/base/localedate";

type EventInstance = {
	event_details?: boolean;
	event_id: number;
	event_name: string;
	fixed_instance_id: number;
	image: string;
	instance_id: number;
	rerun?: boolean;
};

type TypeTotals = {
	type: string,
	total: number
}

const EventsPage = () => {
	return (
		<DataPageLayout
			demands={[
				"crew",
				"cadet",
				"all_buffs",
				"items",
				"all_ships",
				"ship_schematics",
				"event_instances",
				"event_stats",
				"event_leaderboards",
			]}
		>
			<EventsPageComponent />
		</DataPageLayout>
	);
};

const EventsPageComponent = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { event_leaderboards, event_instances: event_instances } = globalContext.core;
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState<{
		[key: string]: EventLeaderboard;
	} | null>(null);
	const [loadingError, setLoadingError] = React.useState<any>(null);
	const [modalEventInstance, setModalEventInstance] =
		React.useState<EventInstance | null>(null);
	const localeDate = useLocaleDate(globalContext.localized);
	const [tab, setTab] = React.useState(0);

	const disconts = React.useMemo(() => {
		let z = event_instances[0].fixed_instance_id - 1;
		let dc = [] as number[];
		for (let i of event_instances.map(m => m.fixed_instance_id)) {
			if (z !== i - 1) {
				dc.push(i);
			}
			z = i;
		}
		return dc;
	}, [event_instances]);

	React.useEffect(() => {
		function loadData() {
			try {
				const eventDataList = [...event_instances];
				setEventsData(eventDataList.reverse());
				const leaderboardDataList = event_leaderboards;
				const keyedLeaderboard = {} as { [key: string]: EventLeaderboard };
				leaderboardDataList.forEach(
					(entry) => (keyedLeaderboard[entry.instance_id] = entry)
				);
				setLeaderboardData(keyedLeaderboard);
			} catch (e) {
				setLoadingError(e);
			}
		}

		loadData();
	}, []);

	return (
		<Container style={{ paddingTop: "4em", paddingBottom: "2em" }}>
			<Header as="h2">{t("event_info.title")}</Header>

			{loadingError && (
				<Message negative>
					<Message.Header>{t("event_info.error_load")}</Message.Header>
					<pre>{loadingError.toString()}</pre>
				</Message>
			)}

			<Step.Group fluid>
				<Step
					key={`event_info_tab`}
					active={tab === 0}
					onClick={() => setTab(0)}
				>
					<Step.Content>
						<Step.Title>{t("event_info.tabs.info.title")}</Step.Title>
						<Step.Description>
							{t("event_info.tabs.info.description")}
						</Step.Description>
					</Step.Content>
				</Step>
				<Step
					key={`event_stats_tab`}
					active={tab === 1}
					onClick={() => setTab(1)}
				>
					<Step.Content>
						<Step.Title>{t("event_info.tabs.stats.title")}</Step.Title>
						<Step.Description>
							{t("event_info.tabs.stats.description")}
						</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>

			{tab === 0 && (
				<Grid stackable columns={3}>
					{eventsData.map((eventInfo, idx) => (
						<Grid.Column key={`event_data_${eventInfo.instance_id}`}>
							<div
								style={{ cursor: "pointer" }}
								onClick={() => setModalEventInstance(eventInfo)}
							>
								<Segment padded>
									<Label attached="bottom" style={{display: 'inline-flex', alignItems: 'center'}}>
										<span style={{flexGrow:1}}>
											{eventInfo.event_name}&nbsp;&mdash;&nbsp;{localeDate(eventToDate(eventInfo.fixed_instance_id), "MMM D, YYYY")}
										</span>
										{!!eventInfo?.rerun && (
											<Label size='mini' style={{justifySelf: 'flex-end'}} color='brown'>{t('global.rerun')}</Label>
										)}
									</Label>
									<LazyImage
										src={`${process.env.GATSBY_ASSETS_URL}${eventInfo.image}`}
										size="large"
										style={{maxHeight: '159px'}}
										onError={(e) => (e.target.style.visibility = "hidden")}
									/>
								</Segment>
							</div>
						</Grid.Column>
					))}
				</Grid>
			)}
			{tab === 1 && <EventStatsComponent />}
			{modalEventInstance !== null && (
				<Modal
					open
					size="large"
					onClose={() => setModalEventInstance(null)}
					closeIcon
				>
					<Modal.Header>
						<EventModalHeader
							flip={true}
							instance={modalEventInstance}
							setInstance={setModalEventInstance}
						/>
					</Modal.Header>
					<Modal.Content scrolling>
						<EventInfoModal
							instanceId={modalEventInstance.instance_id}
							image={modalEventInstance.image}
							hasDetails={modalEventInstance.event_details}
							leaderboard={
								leaderboardData
									? leaderboardData[modalEventInstance.instance_id].leaderboard
									: []
							}
						/>
					</Modal.Content>
				</Modal>
			)}
			<CrewHoverStat targetGroup="event_info_stats" />
		</Container>
	);

	function eventToDate(instanceId: number) {
		let num = instanceId;
		let anchor_id = 458;
		let anchor_date = new Date('2025-01-23T12:00:00');
		let fi = disconts.findLastIndex(x => x < instanceId);
		num += fi - 1;
		anchor_date.setDate(anchor_date.getDate() - (7 * (anchor_id - num)));
		return anchor_date;
	}

	function formatEventType(types: string[]) {
		types = [...new Set(types)];
		return types.map(type => t(`event_type.${type}`)).join("/");
	}
};

const EventStatsComponent = () => {
	const globalContext = React.useContext(GlobalContext);
	const { event_stats, event_instances } = globalContext.core;
	const { playerData } = globalContext.player;
	const { t } = globalContext.localized;
	const [totalPages, setTotalPages] = React.useState(1);
	const [itemsPerPage, setItemsPerPage] = React.useState(20);
	const [activePage, setActivePage] = React.useState(1);

	const [compiledStats, setCompiledStats] = React.useState<EventStats[]>([]);

	const [activePageResults, setActivePageResults] = React.useState<
		EventStats[]
	>([]);

	const [sortColumn, setSortColumn] = React.useState('');
	const [sortDirection, setSortDirection] = React.useState<'ascending' | 'descending'>('ascending');

	const [typeFilter, setTypeFilter] = React.useState(undefined as string[] | undefined);
	const [timeframe, setTimeframe] = useStateWithStorage('event_stats/timeframe', "12_months" as string | undefined);
	const [weeks, setWeeks] = React.useState(timeframeToWeeks(timeframe));
	const [typeTotals, setTypeTotals] = React.useState([] as TypeTotals[]);
	const [eventTypes, setEventTypes] = useStateWithStorage('event_stats/event_types', [] as string[]);
	const [topPct, setTopPct] = React.useState<{[key:string]: number}>({});
	const switchDir = () => {
		if (sortDirection === 'ascending') setSortDirection('descending');
		else setSortDirection('ascending');
	}

	const pageStartIdx = (activePage - 1) * itemsPerPage;
	const isMobile =
		typeof window !== "undefined" && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	React.useEffect(() => {
		if (!event_stats?.length) return;
		const newStats = structuredClone(event_stats) as EventStats[];
		const buckets = makeTypeBuckets(newStats);
		let top = {} as { [key: string]: number };
		Object.entries(buckets).forEach(([type, bucket]) => {
			if (!bucket.length) return;
			bucket.sort((a, b) => {
				return b.min - a.min;
			});

			top[type] ??= 0;
			if (bucket[0] && bucket[0].min > top[type]) top[type] = bucket[0].min;
		});

		Object.entries(buckets).forEach(([type, bucket]) => {
			const max = top[type];
			bucket.forEach((stat) => {
				stat.event_type = stat.event_type.split("/").map(type => t(`event_type.${type}`)).join(" / ");
				stat.sorted_event_type = stat.sorted_event_type?.split("/").map(type => t(`event_type.${type}`)).join(" / ");
				stat.percentile = Number(((stat.min / max) * 100).toFixed(1));
			});
			bucket.sort((a, b) => b.percentile! - a.percentile!);
			bucket.forEach((stat, idx) => stat.rank = idx+1);
		});

		newStats.sort((a, b) => a.instance_id - b.instance_id);

		let lastDiscovered = new Date();
		let maxidx = newStats.length - 1;

		if (newStats.length && newStats[newStats.length - 1].discovered) {
			lastDiscovered = new Date(newStats[newStats.length - 1].discovered!);
			lastDiscovered.setDate(lastDiscovered.getDate() + 7);
		}

		newStats.forEach((stat, idx) => {
			if (!stat.discovered) {
				let w = maxidx - idx;
				stat.discovered = new Date(lastDiscovered);
				let dow = stat.discovered.getDay();
				dow = 3 - dow;
				stat.discovered.setDate(stat.discovered.getDate() + dow);
				stat.discovered.setDate(stat.discovered.getDate() - (w * 7));
				stat.guessed = true;
			}
		});

		setCompiledStats(newStats);
	}, [event_stats]);

	React.useEffect(() => {
		if (!compiledStats?.length) return;
		let maxidx = compiledStats.length - 1;
		let eventTypes = [] as string[];
		let newTypeFilter = [] as string[];
		let totals = {} as { [key: string]: number };

		let filtered = compiledStats.sort((a, b) => a.instance_id - b.instance_id).filter((stat, idx) => {
			if (weeks) {
				if (maxidx - idx > weeks) {
					return false;
				}
			}
			if (!eventTypes.includes(stat.sorted_event_type ?? stat.event_type)) eventTypes.push(stat.sorted_event_type ?? stat.event_type);
			return true;
		});

		eventTypes.sort();

		for (let t of typeFilter ?? []) {
			if (eventTypes.includes(t)) newTypeFilter.push(t);
		}

		const toppct = {} as { [key: string]: number };

		filtered = filtered.filter((stat, idx) => {
			if (newTypeFilter?.length && !newTypeFilter.includes(stat.sorted_event_type ?? stat.event_type)) return false;
			totals[stat.event_type] ??= 0;
			totals[stat.event_type]++;
			let key = stat.sorted_event_type ?? stat.event_type;
			toppct[key] ??= 0;
			if (stat.percentile && toppct[key] < stat.percentile) toppct[key] = stat.percentile;
			return true;
		});


		const pages = Math.ceil(filtered.length / itemsPerPage);
		const dir = sortDirection === 'ascending' ? 1 : -1;

		if (sortColumn) {
			filtered.sort((a, b) => {
				if (sortColumn === 'event_type') {
					let r = dir * a.event_type.localeCompare(b.event_type);
					if (!r) {
						r = b.percentile! - a.percentile!;
					}
					return r;
				}
				else
				if (typeof a[sortColumn] === 'string') {
					return dir * a[sortColumn].localeCompare(b[sortColumn]);
				}
				else if (sortColumn === 'percentile') {
					let r = dir * (a[sortColumn]! - b[sortColumn]!);
					if (!r) {
						r = a.event_type.localeCompare(b.event_type);
					}
					return r;
				}
				else {
					let r = dir * (a[sortColumn] - b[sortColumn]);
					if (!r) r = b.percentile! - a.percentile!;
					return r;
				}
			});
		}
		else {
			filtered.sort((a, b) => {
				let r = b.percentile! - a.percentile!;
				r *= dir;
				if (!r) r = a.event_type.localeCompare(b.event_type);
				return r;
			});
		}

		if (totalPages !== pages) {
			setTotalPages(pages);
			if (activePage > pages) {
				setActivePage(pages);
				return;
			} else if (activePage < 1 && pages) {
				setActivePage(1);
				return;
			}
		}
		setTopPct(toppct);
		setTypeFilter(newTypeFilter?.length ? newTypeFilter : undefined);
		setEventTypes(eventTypes);
		const typeTotals = Object.entries(totals).map(([type, total]) => ({ type, total } as TypeTotals));
		typeTotals.sort((a, b) => a.type.localeCompare(b.type));
		setTypeTotals(typeTotals);
		setActivePageResults(
			filtered.slice(pageStartIdx, pageStartIdx + itemsPerPage)
		);
	}, [compiledStats, itemsPerPage, activePage, totalPages, sortColumn, sortDirection, typeFilter, weeks]);

	const pageSizes = [1, 5, 10, 20, 50, 100].map((size) => {
		return {
			key: `pageSize_${size}`,
			value: size,
			text: `${size}`,
		} as DropdownItemProps;
	});

	const typeGrid = [[]] as string[][]
	const gridWidth = isMobile ? 1 : Math.min(4, typeTotals.length);
	let x = 0;
	let y = 0;
	typeTotals.forEach(({type, total }) => {
		typeGrid[y].push(`${type}: ${total}`);
		x++;
		if (x >= gridWidth) {
			typeGrid.push([]);
			x = 0;
			y++;
		}
	});
	const tfp = timeframeParts(timeframe);

	return (
		<div>
			<div className='ui segment'
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center'
				}}>
				<h3>{t('event_info.tabs.stats.title')}</h3>
				{!!tfp && t(`duration.n_${tfp[1]}`, { [tfp[1]]: tfp[0] })}
				<Grid columns={gridWidth as SemanticWIDTHS} style={{padding:'1em 2em'}}>
					{typeGrid.map((row, idx) => {
						return <Grid.Row key={`typeGrid_row${idx}`}>
							{row.map((col, idx2) => {
								return <Grid.Column key={`typeGrid_row${idx}_col${idx2}`}>
									{col}
								</Grid.Column>
							})}
						</Grid.Row>
					})}
					<Grid.Row>

					</Grid.Row>
				</Grid>
			</div>
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1em'}}>
				<EventTypeFilter availableTypes={eventTypes} type={typeFilter} setType={setTypeFilter} />
				<TimeframeFilter timeframe={timeframe} setTimeframe={setTimeframe} setWeeks={setWeeks} />
			</div>
			<Table striped sortable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							sorted={sortColumn === 'event_name' ? sortDirection : undefined}
							onClick={() => sortColumn === 'event_name' ? switchDir() : setSortColumn('event_name')}
							>{t("global.name")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'instance_id' ? sortDirection : undefined}
							onClick={() => sortColumn === 'instance_id' ? switchDir() : setSortColumn('instance_id')}
							>Id</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'event_type' ? sortDirection : undefined}
							onClick={() => sortColumn === 'event_type' ? switchDir() : setSortColumn('event_type')}
							>{t("event_stats.event_type")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'rank' ? sortDirection : undefined}
							onClick={() => sortColumn === 'rank' ? switchDir() : setSortColumn('rank')}
							>{t("event_stats.rank")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'percentile' ? sortDirection : undefined}
							onClick={() => sortColumn === 'percentile' ? switchDir() : setSortColumn('percentile')}
							>{t("global.percentile")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'max' ? sortDirection : undefined}
							onClick={() => sortColumn === 'max' ? switchDir() : setSortColumn('max')}
							>
							{t("event_stats.rank_n_vp", { n: "1" })}
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'min' ? sortDirection : undefined}
							onClick={() => sortColumn === 'min' ? switchDir() : setSortColumn('min')}
							>
							{t("event_stats.rank_n_vp", { n: "100" })}
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'median' ? sortDirection : undefined}
							onClick={() => sortColumn === 'median' ? switchDir() : setSortColumn('median')}
							>{t("event_stats.median_vp")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'avg' ? sortDirection : undefined}
							onClick={() => sortColumn === 'avg' ? switchDir() : setSortColumn('avg')}
							>{t("event_stats.average_vp")}</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{activePageResults.map((stat, idx) => drawTableRow(stat, idx))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colspan={8}>
							<Pagination
								totalPages={totalPages}
								activePage={activePage}
								onPageChange={(e, data) =>
									setActivePage(data.activePage as number)
								}
							/>
							<span style={{ paddingLeft: "2em" }}>
								{t("global.rows_per_page")}:{" "}
								<Dropdown
									options={pageSizes}
									value={itemsPerPage}
									inline
									onChange={(e, { value }) => setItemsPerPage(value as number)}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</div>
	);

	function drawTableRow(stat: EventStats, idx: number) {
		let instance = event_instances.find(f => f.instance_id === stat.instance_id);
		let url = '';
		if (instance?.image) {
			url = `${process.env.GATSBY_ASSETS_URL}${instance.image}`;
		}
		return <Table.Row key={`event_stats_${stat.event_name}_${idx}`}>
			<Table.Cell width={5}>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					gap: '0.5em'
				}}>
					<h3>{stat.event_name}</h3>
					{!!url && <img src={url} style={{height: '96px'}} />}
					{stat.discovered && <p style={{fontSize:'0.8em',fontStyle: 'italic'}}>
						{stat.guessed && "~ "}
						{moment(stat.discovered)
							.locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language)
							.format("MMM D, YYYY")}
					</p>}
					{[stat.crew, ...stat.other_legendaries ?? []].map((symbol, idx2) => {
						const crew = globalContext.core.crew.find(f => f.symbol === symbol);
						if (!crew) return <></>;
						return <div
							key={`${stat.event_name}_${stat.crew_name}_${idx}_${idx2}`}
							style={{display:'flex', gap: '0.5em', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start'}}>
							<AvatarView
								showMaxRarity={!playerData}
								mode='crew'
								targetGroup="event_info_stats"
								item={crew}
								size={48}
								/>
								{crew.name}
							</div>
					})}
				</div>
			</Table.Cell>
			<Table.Cell>
				{stat.instance_id}
			</Table.Cell>
			<Table.Cell>
				<span style={{
					color: stat.percentile! >= topPct[stat.sorted_event_type!] ? 'lightgreen' : undefined,
					fontWeight: stat.percentile == 100 ? 'bold': undefined
				}}>
					{stat.event_type}
				</span>
			</Table.Cell>
			<Table.Cell>
				{stat.rank!}
			</Table.Cell>
			<Table.Cell>
				<span style={{color: gradeToColor(stat.percentile! / 100) || undefined}}>
					{stat.percentile!.toFixed(1)}
				</span>
			</Table.Cell>
			<Table.Cell>
			{stat.max.toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{stat.min.toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{Math.round(stat.median).toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{Math.round(stat.avg).toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
		</Table.Row>
	}
};

export type CustomTimeFilterProps = DropdownItemProps & {
	onSelect?: (opt?: CustomTimeFilterProps) => void;
}

interface TimeframeFilterProps {
	timeframe?: string;
	setTimeframe: (value?: string) => void;
	setWeeks?: (value?: number) => void;
	customOptions?: CustomTimeFilterProps[];
	customBefore?: boolean;
}

export const TimeframeFilter = (props: TimeframeFilterProps) => {

	const { timeframe, setTimeframe, setWeeks, customBefore, customOptions } = props;
	const { t } = React.useContext(GlobalContext).localized;

	const options = [
		//{ key: 'all_time', value: 'all_time', text: t('duration.all_time') },
		{ key: '2_years', value: '2_years', text: t('duration.n_years', { years: `2`} ) },
		{ key: '18_months', value: '18_months', text: t('duration.n_months', { months: `18`}) },
		{ key: '12_months', value: '12_months', text: t('duration.n_months', { months: `12`}) },
		{ key: '9_months', value: '9_months', text: t('duration.n_months', { months: `9`}) },
		{ key: '6_months', value: '6_months', text: t('duration.n_months', { months: `6`}) },
		{ key: '3_months', value: '3_months', text: t('duration.n_months', { months: `3`}) },
		{ key: '2_months', value: '2_months', text: t('duration.n_months', { months: `2`}) },
		{ key: '4_weeks', value: '4_weeks', text: t('duration.n_weeks', { weeks: `4` }) },
		{ key: '2_weeks', value: '2_weeks', text: t('duration.n_weeks', { weeks: `2` }) },
	] as DropdownItemProps[];

	if (customOptions) {
		const addopts = [...customOptions];
		if (customBefore) addopts.reverse();
		for (let opt of addopts) {
			if (customBefore) {
				options.unshift(opt);
			}
			else {
				options.push(opt);
			}
		}
	}

	options.reverse();

	return <Dropdown
			placeholder={t('hints.filter_by_timeframe')}
			clearable
			selection
			options={options}
			value={timeframe}
			onChange={(e, data) => {
				const { value } = data;
				const optData = data.options?.find(o => o.value === value) as CustomTimeFilterProps;
				if (optData?.onSelect) {
					optData.onSelect(optData);
					return;
				}
				if (setWeeks) {
					setWeeks(timeframeToWeeks(value as string | undefined))
				}
				setTimeframe(value as string | undefined);
			}}
		/>
}

interface EventTypeFilterProps {
	type?: string[];
	setType: (value?: string[]) => void;
	availableTypes: string[];
}

const EventTypeFilter = (props: EventTypeFilterProps) => {

	const { type, setType, availableTypes } = props;
	const { t } = React.useContext(GlobalContext).localized;

	const options = [] as DropdownItemProps[];

	availableTypes.forEach((type) => {
		let text = type;
		if (type.includes("/")) {
			text = type + ` (${t('global.or')} ${(type.split(" / ").sort((a, b) => b.localeCompare(a)).join(" / "))})`
		}
		options.push({
			key: type,
			value: type,
			text
		})
	});

	return <Dropdown
			placeholder={t('hints.filter_by_event_type')}
			clearable
			search
			selection
			multiple
			options={options}
			value={type}
			onChange={(e, { value }) => setType(value as string[] | undefined)}
		/>
}

export function timeframeParts(timeframe?: string): string[] | undefined {
	if (!timeframe) return undefined;
	let sp = timeframe.split("_");
	if (sp.length !== 2) return undefined;
	return sp;
}

export function timeframeToWeeks(timeframe?: string) {
	if (!timeframe) return undefined;
	let sp = timeframe.split("_");
	if (sp.length !== 2) return undefined;
	let n = Number(sp[0]);
	if (Number.isNaN(n)) return undefined;
	let d = new Date();
	let e = new Date();

	switch (sp[1]) {
		case "days":
			d.setDate(d.getDate() - n);
			break;
		case "weeks":
			d.setDate(d.getDate() - (n * 7));
			break;
		case "months":
			d.setMonth(d.getMonth() - n);
			break;
		case "years":
			d.setFullYear(d.getFullYear() - n);
			break;
		default:
			return undefined;
	}

	let w = e.getTime() - d.getTime();
	w /= (1000 * 60 * 60 * 24 * 7);
	return Math.floor(w);
}


export default EventsPage;
