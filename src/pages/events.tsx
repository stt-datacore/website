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
} from "semantic-ui-react";

import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';

import LazyImage from "../components/lazyimage";
import EventInfoModal from "../components/event_info_modal";
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

type EventInstance = {
	event_details?: boolean;
	event_id: number;
	event_name: string;
	fixed_instance_id: number;
	image: string;
	instance_id: number;
};

const EventsPage = () => {
	return (
		<DataPageLayout
			demands={[
				"crew",
				"cadet",
				"all_buffs",
				"items",
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
	const { event_leaderboards, event_instances } = globalContext.core;
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState<{
		[key: string]: EventLeaderboard;
	} | null>(null);
	const [loadingError, setLoadingError] = React.useState<any>(null);
	const [modalEventInstance, setModalEventInstance] =
		React.useState<EventInstance | null>(null);

	const [tab, setTab] = React.useState(0);

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
					{eventsData.map((eventInfo) => (
						<Grid.Column key={eventInfo.instance_id}>
							<div
								style={{ cursor: "pointer" }}
								onClick={() => setModalEventInstance(eventInfo)}
							>
								<Segment padded>
									<Label attached="bottom">{eventInfo.event_name}</Label>
									<LazyImage
										src={`${process.env.GATSBY_ASSETS_URL}${eventInfo.image}`}
										size="large"
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
					<Modal.Header>{modalEventInstance.event_name}</Modal.Header>
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
};

const EventStatsComponent = () => {
	const globalContext = React.useContext(GlobalContext);
	const { event_stats } = globalContext.core;
	const { playerData } = globalContext.player;
	const { t } = globalContext.localized;
	const [totalPages, setTotalPages] = React.useState(1);
	const [itemsPerPage, setItemsPerPage] = React.useState(10);
	const [activePage, setActivePage] = React.useState(1);

	const [workStats, setWorkStats] = React.useState<EventStats[]>([]);
	const [activePageResults, setActivePageResults] = React.useState<
		EventStats[]
	>([]);

	const [sortColumn, setSortColumn] = React.useState('');
	const [sortDirection, setSortDirection] = React.useState<'ascending' | 'descending'>('ascending');

	const [typeFilter, setTypeFilter] = React.useState(undefined as string | undefined);
	const [eventTypes, setEventTypes] = React.useState([] as string[]);

	const switchDir = () => {
		if (sortDirection === 'ascending') setSortDirection('descending');
		else setSortDirection('ascending');
	}

	const pageStartIdx = (activePage - 1) * itemsPerPage;
	const isMobile =
		typeof window !== "undefined" && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	React.useEffect(() => {
		if (!event_stats?.length) return;
		const newStats = JSON.parse(JSON.stringify(event_stats)) as EventStats[];
		newStats.splice(0, newStats.length - 104);
		const buckets = makeTypeBuckets(newStats);
		const eventTypes = [] as string[];
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
				stat.percentile = (stat.min / max) * 100;
			});
			bucket.sort((a, b) => b.percentile! - a.percentile!);
		});
		newStats.sort((a, b) => {
			let r = b.percentile! - a.percentile!;
			if (!r) r = b.min - a.min;
			return r;
		});
		newStats.forEach((stat, idx) => {
			stat.rank = idx+1
			if (!eventTypes.includes(stat.event_type)) eventTypes.push(stat.event_type);
		});
		eventTypes.sort();
		setEventTypes(eventTypes);
		setWorkStats(newStats);
	}, [event_stats]);

	React.useEffect(() => {
		if (!workStats?.length) return;
		const filtered = workStats.filter(f => !typeFilter || f.event_type === typeFilter);
		const pages = Math.ceil(filtered.length / itemsPerPage);
		if (sortColumn) {
			filtered.sort((a, b) => {
				const dir = sortDirection === 'ascending' ? 1 : -1;
				if (typeof a[sortColumn] === 'string') {
					return dir * a[sortColumn].localeCompare(b[sortColumn]);
				}
				else {
					return dir * (a[sortColumn] - b[sortColumn]);
				}
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
		setActivePageResults(
			filtered.slice(pageStartIdx, pageStartIdx + itemsPerPage)
		);
	}, [workStats, itemsPerPage, activePage, totalPages, sortColumn, sortDirection, typeFilter]);

	const pageSizes = [1, 5, 10, 20, 50, 100].map((size) => {
		return {
			key: `pageSize_${size}`,
			value: size,
			text: `${size}`,
		} as DropdownItemProps;
	});

	return (
		<div>
			<div>
				<EventTypeFilter availableTypes={eventTypes} type={typeFilter} setType={setTypeFilter} />
			</div>
			<Table striped sortable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							sorted={sortColumn === 'name' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'name' ? switchDir() : setSortColumn('name')}
							>{t("global.name")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'event_type' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'event_type' ? switchDir() : setSortColumn('event_type')}
							>{t("event_stats.event_type")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'rank' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'rank' ? switchDir() : setSortColumn('rank')}
							>{t("event_stats.rank")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'percentile' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'percentile' ? switchDir() : setSortColumn('percentile')}
							>{t("global.percentile")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'max' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'max' ? switchDir() : setSortColumn('max')}
							>
							{t("event_stats.rank_n_vp", { n: "1" })}
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'min' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'min' ? switchDir() : setSortColumn('min')}
							>
							{t("event_stats.rank_n_vp", { n: "100" })}
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'median' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'median' ? switchDir() : setSortColumn('median')}
							>{t("event_stats.median_vp")}</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortColumn === 'avg' ? sortDirection : undefined}
							onClick={(e) => sortColumn === 'avg' ? switchDir() : setSortColumn('avg')}
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

	function drawTableRow(stats: EventStats, idx: number) {
		return <Table.Row key={`event_stats_${stats.event_name}_${idx}`}>
			<Table.Cell>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					gap: '0.5em'
				}}>
					<h3>{stats.event_name}</h3>
					{stats.discovered && <p style={{fontSize:'0.8em',fontStyle: 'italic'}}>{moment(stats.discovered).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM d, YYYY")}</p>}
					{[stats.crew, ...stats.other_legendaries ?? []].map((symbol, idx2) => {
						const crew = globalContext.core.crew.find(f => f.symbol === symbol);
						if (!crew) return <></>;
						return <div
							key={`${stats.event_name}_${stats.crew_name}_${idx}_${idx2}`}
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
				{stats.event_type}
			</Table.Cell>
			<Table.Cell>
				{stats.rank!}
			</Table.Cell>
			<Table.Cell>
				<span style={{color: gradeToColor(stats.percentile! / 100) || undefined}}>
					{stats.percentile!.toFixed(1)}
				</span>
			</Table.Cell>
			<Table.Cell>
			{stats.max.toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{stats.min.toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{Math.round(stats.median).toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
			<Table.Cell>
				{Math.round(stats.avg).toLocaleString()} {t('shuttle_helper.event.vp')}
			</Table.Cell>
		</Table.Row>
	}
};

interface EventTypeFilterProps {
	type?: string;
	setType: (value?: string) => void;
	availableTypes: string[];
}
const EventTypeFilter = (props: EventTypeFilterProps) => {

	const { type, setType, availableTypes } = props;
	const { t } = React.useContext(GlobalContext).localized;

	const options = [] as DropdownItemProps[];

	availableTypes.forEach((type) => {
		options.push({
			key: type,
			value: type,
			text: type
		})
	});

	return <Dropdown
			placeholder={t('hints.filter_by_event_type')}
			clearable
			search
			selection
			options={options}
			value={type}
			onChange={(e, { value }) => setType(value as string | undefined)}
		/>
}

export default EventsPage;
