import React from 'react';
import { Table, Icon, Dropdown, Button, Message } from 'semantic-ui-react';

import allFactions from '../../../static/structured/factions.json';
import { ShuttleAdventure } from '../../model/shuttle';

import { Shuttle, ShuttleSeat, ITableColumn, ITableData } from './model';
import { ShuttlersContext } from './context';
import { MissionEditor } from './missioneditor';
import { MissionsTable, MissionFactionView, SeatSkillView } from './missionstable';

export const Missions = () => {
	const shuttlersContext = React.useContext(ShuttlersContext);
	const { groupId, activeShuttles, shuttlers, setShuttlers } = shuttlersContext;

	const [data, setData] = React.useState<ITableData[]>([]);

	const [activeEdit, setActiveEdit] = React.useState<Shuttle | undefined>(undefined);

	React.useEffect(() => {
		const data: ITableData[] = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId)
			.map(shuttle => {
				const shuttleData: ITableData = {
					...shuttle,
					status: 'Unknown',
					is_rental: false,
					expires_in: 0,
					chance: 0
				};
				if (!shuttle.readonly) {
					shuttleData.status = 'Manual';
				}
				else {
					const adventure: ShuttleAdventure | undefined = activeShuttles.find(adventure => adventure.symbol === shuttle.id);
					if (adventure) {
						if (adventure.shuttles[0].is_rental)
							shuttleData.status = 'Renting';
						else if (adventure.shuttles[0].state > 0)
							shuttleData.status = 'Running';
						else {
							const expiryHours = Math.floor(adventure.shuttles[0].expires_in/3600);
							shuttleData.status = `Expires in ${expiryHours === 0 ? '<1' : expiryHours}h`;
						}
						shuttleData.is_rental = adventure.shuttles[0].is_rental;
						shuttleData.expires_in = adventure.shuttles[0].expires_in;
					}
					else {
						shuttleData.status = 'Not Open';
					}
				}
				return shuttleData;
			});
		setData([...data]);
	}, [shuttlers, activeShuttles]);

	const columns: ITableColumn[] = [
		{ id: 'checklist', title: <Icon name='check' />, align: 'center', sortField: { id: 'priority' } },
		{ id: 'name', title: 'Mission', sortField: { id: 'name' } },
		{ id: 'status', title: 'Status', align: 'center', sortField: { id: 'status' } },
		{ id: 'faction', title: 'Faction', align: 'center', sortField: { id: 'faction' } },
		{ id: 'seats', title: 'Seats', align: 'center', sortField: { id: 'seats.length' } },
		{ id: 'skills', title: 'Skills', align: 'center', span: 5, sortField: { id: '_skills' } }
	];

	const columnCount: number = columns.reduce((prev, curr) => prev + (curr.span ?? 1), 0);

	const hasManualShuttles: boolean = data.some(datum => !datum.readonly);
	if (hasManualShuttles) columns.push({ id: 'actions', title: '' });

	const missionsSelected: number = data.filter(shuttle => shuttle.priority > 0).length;

	return (
		<React.Fragment>
			<p>Select all the missions that you want to run, then tap 'Recommend Crew' to see the best seats for your crew.</p>
			<CheckDropdown selectMissions={selectMissions} />
			<MissionsTable
				tableId='missions'
				columns={columns}
				data={data}
				renderTableRow={renderTableRow}
				renderTableFooter={data.length > 0 ? renderTableFooter : undefined}
			/>
			{activeEdit && (
				<MissionEditor
					shuttle={activeEdit}
					saveMission={onMissionSave}
					deleteMission={onMissionDelete}
				/>
			)}
			<Message>
				<p>If the mission you want isn't listed above, <Button compact content='Create a Mission' onClick={() => createMission()} /> to input the mission parameters manually.</p>
				<p>Tip: open shuttle missions in-game before uploading your player data to DataCore so that this tool can import the missions automatically.</p>
			</Message>
		</React.Fragment>
	);

	function renderTableFooter(): JSX.Element {
		return (
			<Table.Row>
				<Table.HeaderCell colSpan={columnCount}>
					{missionsSelected} / {data.length} mission{missionsSelected !== 1 ? 's' : ''} selected
				</Table.HeaderCell>
			</Table.Row>
		);
	}

	function renderTableRow(datum: ITableData): JSX.Element {
		return (
			<Table.Row key={datum.id} style={{ cursor: 'pointer' }}
				onClick={() => toggleMission(datum.id)}
			>
				<Table.Cell textAlign='center'>
					{datum.priority > 0 && <Icon color='green' name='check' />}
				</Table.Cell>
				<Table.Cell>
					<span style={{ fontSize: '1.1em' }}><b>{datum.name}</b></span>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{datum.status}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<MissionFactionView factionId={datum.faction} size={1.5} />
				</Table.Cell>
				<Table.Cell textAlign='center'>{datum.seats.length}</Table.Cell>
				{[0, 1, 2, 3, 4].map(seatNum => (
					<Table.Cell key={seatNum} textAlign='center'>
						{datum.seats.length > seatNum && (
							<SeatSkillView seat={datum.seats[seatNum]} />
						)}
					</Table.Cell>
				))}
				{hasManualShuttles && (
					<Table.Cell textAlign='right'>
						{!datum.readonly && (
							<Button compact icon='edit' content='Edit' onClick={(e) => { setActiveEdit(datum as Shuttle); e.stopPropagation(); }}/>
						)}
					</Table.Cell>
				)}
			</Table.Row>
		);
	}

	function createMission(): void {
		const shuttle = new Shuttle(groupId);
		shuttle.seats.push(new ShuttleSeat());
		setActiveEdit(shuttle);
	}

	function onMissionSave(shuttle: Shuttle): void {
		if (shuttle.seats[0].skillA !== '') {
			if (shuttle.priority === 0) shuttle.priority = missionsSelected + 1;
			const shuttleNum: number = shuttlers.shuttles.findIndex(s => s.id === shuttle.id);
			if (shuttleNum >= 0)
				shuttlers.shuttles[shuttleNum] = shuttle;
			else
				shuttlers.shuttles.push(shuttle);
			updateShuttlers();
		}
		setActiveEdit(undefined);
	}

	function onMissionDelete(shuttleId: string): void {
		const shuttleNum: number = shuttlers.shuttles.findIndex(shuttle => shuttle.id === shuttleId);
		if (shuttleNum >= 0) {
			shuttlers.shuttles.splice(shuttleNum, 1);
			updateShuttlers();
		}
		setActiveEdit(undefined);
	}

	function toggleMission(shuttleId: string): void {
		const shuttle: Shuttle | undefined = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (!shuttle) return;
		shuttle.priority = shuttle.priority === 0 ? missionsSelected + 1 : 0;
		updateShuttlers();
	}

	function selectMissions(shuttleIds: string[]): void {
		let priority = 0;
		shuttlers.shuttles.forEach(shuttle => {
			if (shuttleIds.length === 0)
				shuttle.priority = 0;
			else
				shuttle.priority = shuttleIds.includes(shuttle.id) ? ++priority : 0;
		});
		updateShuttlers();
	}

	function updateShuttlers(): void {
		setShuttlers({...shuttlers});
	}
};

interface ICheckOption {
	key: string;
	text: string;
	ids: string[];
};

type CheckDropdownProps = {
	selectMissions: (shuttleIds: string[]) => void;
};

const CheckDropdown = (props: CheckDropdownProps) => {
	const shuttlersContext = React.useContext(ShuttlersContext);
	const { groupId, activeShuttles, shuttlers } = shuttlersContext;

	const [checkOptions, setCheckOptions] = React.useState<ICheckOption[]>([]);

	React.useEffect(() => {
		const shuttles: Shuttle[] = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId);
		const checkOptions: ICheckOption[] = getCheckOptions(shuttles);
		setCheckOptions([...checkOptions]);
	}, [shuttlers, activeShuttles]);

	const allIds: string[] = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId).map(shuttle => shuttle.id);
	const selectedCount: number = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0).length;

	if (allIds.length === 0) return <></>;

	return (
		<Dropdown
			placeholder='Select missions by group'
		>
			<Dropdown.Menu>
				<Dropdown.Item icon='check' text={`Select all (${allIds.length})`} onClick={() => props.selectMissions(allIds)} />
				{selectedCount > 0 && (
					<Dropdown.Item icon='x' text='Unselect all' onClick={() => props.selectMissions([])} />
				)}
				{checkOptions.length > 0 && <Dropdown.Divider />}
				{checkOptions.map(option => (
					<Dropdown.Item key={option.key} text={option.text} onClick={() => props.selectMissions(option.ids)} />
				))}
			</Dropdown.Menu>
		</Dropdown>
	);

	function getCheckOptions(shuttles: Shuttle[]): ICheckOption[] {
		const checkOptions: ICheckOption[] = [];

		const threeSeaters: string[] = [], fourSeaters: string[] = [];
		shuttles.forEach(shuttle => {
			if (shuttle.seats.length <= 4)
				fourSeaters.push(shuttle.id);
			if (shuttle.seats.length === 3)
				threeSeaters.push(shuttle.id);
		});
		if (threeSeaters.length > 0)
			checkOptions.push({ key: 'three-seaters', text: `Select only 3-seaters (${threeSeaters.length})`, ids: threeSeaters });
		if (fourSeaters.length > 0)
			checkOptions.push({ key: 'four-seaters', text: `Select only 3- and 4- seaters (${fourSeaters.length})`, ids: fourSeaters });

		if (activeShuttles.length > 0) {
			const runningIds: string[] = activeShuttles.filter(adventure => adventure.shuttles[0].state > 0).map(adventure => adventure.symbol);
			checkOptions.push({ key: `running-adventures`, text: `Select only running in-game (${runningIds.length})`, ids: runningIds });
			const activeIds: string[] = activeShuttles.map(adventure => adventure.symbol);
			checkOptions.push({ key: `open-adventures`, text: `Select only open in-game (${activeIds.length})`, ids: activeIds });
		}

		const factions: number[] = [];
		shuttles.forEach(shuttle => {
			if (shuttle.faction > 0 && !factions.includes(shuttle.faction)) factions.push(shuttle.faction);
		});
		if (factions.length > 1) {
			factions.forEach(factionId => {
				const ids: string[] = shuttles.filter(shuttle => shuttle.faction === factionId).map(shuttle => shuttle.id);
				const faction = allFactions.find(af => af.id === factionId);
				checkOptions.push({ key: `faction-${factionId}`, text: `Select only ${faction?.name} (${ids.length})`, ids });
			});
		}

		return checkOptions;
	}
};
