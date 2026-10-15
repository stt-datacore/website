import React from 'react';
import { Table, Icon, Button } from 'semantic-ui-react';

import { IRosterCrew } from '../../components/eventplanner/model';
import { Shuttle, ShuttleSeat, CrewScores, IShuttleBoost, IShuttleScores, ITableColumn, ITableData, IAssignableCrew, ISeatAssignment } from './model';
import { ShuttlersContext } from './context';
import { MissionsTable, MissionFactionView, SeatSkillView, SeatCrewView } from './missionstable';
import { SeatAssignmentPicker } from './seatassignmentpicker';
import { EventProjection } from './eventprojection';
import { ShuttleBoostPicker } from './shuttleboostpicker';
import { findSeatedCrew, getCrewSeatScore, getShuttleChance } from './utils';
import { GlobalContext } from '../../context/globalcontext';

interface IActiveEdit {
	shuttleId: string;
	seatNum: number;
};

type AssignmentsProps = {
	crewScores: CrewScores;
	updateCrewScores: (todo: ShuttleSeat[]) => void;
};

export const Assignments = (props: AssignmentsProps) => {
	const shuttlersContext = React.useContext(ShuttlersContext);
	const { t } = React.useContext(GlobalContext).localized;
	const { helperId, groupId, rosterCrew, eventData, shuttlers, setShuttlers, assigned, setAssigned } = shuttlersContext;
	const { crewScores, updateCrewScores } = props;

	const [data, setData] = React.useState<ITableData[]>([]);
	const [shuttleScores, setShuttleScores] = React.useState<IShuttleScores>({});

	const [activeEdit, setActiveEdit] = React.useState<IActiveEdit | undefined>(undefined);

	React.useEffect(() => {
		const newScores: IShuttleScores = {};
		assigned.forEach(seated => {
			const shuttle: Shuttle | undefined = shuttlers.shuttles.find(shuttle => shuttle.id === seated.shuttleId);
			if (shuttle) {
				if (!newScores[seated.shuttleId]) {
					const seatCount: number = shuttle.seats.length;
					newScores[seated.shuttleId] = { chance: 0, scores: Array(seatCount).fill(0) };
				}
				newScores[seated.shuttleId].scores[seated.seatNum] = getSeatScore(shuttle, seated);
				newScores[seated.shuttleId].chance = getShuttleChance(shuttle, newScores[seated.shuttleId].scores, eventData);
			}
		});
		setShuttleScores(newScores);

		const data: ITableData[] = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0)
			.map(shuttle => {
				const shuttleData: ITableData = {
					...shuttle,
					status: 'Unknown',
					is_rental: false,
					expires_in: 0,
					chance: newScores[shuttle.id]?.chance ?? 0
				};
				return shuttleData;
			});
		setData([...data]);
	}, [shuttlers, assigned, rosterCrew]);

	const columns: ITableColumn[] = [
		{ id: 'priority', title: <Icon name='check' />, align: 'center', sortField: { id: '_priority' }},
		{ id: 'name', title: t('shuttle_helper.missions.columns.name'), sortField: { id: 'name' } },
		{ id: 'faction', title: t('shuttle_helper.missions.columns.faction'), align: 'center', sortField: { id: 'faction' } },
		{ id: 'assignments', title: t('shuttle_helper.missions.columns.seat_assignments'), align: 'center', sortField: { id: 'seats.length' } },
		{ id: 'boost', title: t('boosts.boost'), align: 'center' },
		{ id: 'chance', title: t('shuttle_helper.missions.columns.success_chance'), align: 'center', sortField: { id: 'chance', firstSort: 'descending' } },
		{ id: 'actions', title: '' }
	];

	const columnCount: number = columns.reduce((prev, curr) => prev + (curr.span ?? 1), 0);
	const missionsSelected: number = data.filter(shuttle => shuttle.priority > 0).length;

	return (
		<React.Fragment>
			{eventData && <EventProjection eventData={eventData} shuttleScores={shuttleScores} />}
			<p>{t('shuttle_helper.calculator.you_can_rearrange')}</p>
			<MissionsTable
				tableId={`${helperId}/assignments`}
				tableProps={{ celled: true, striped: true, sortable: true, unstackable: true }}
				columns={columns}
				data={data}
				defaultSort={{ id: '_priority' }}
				renderTableRow={renderTableRow}
				renderTableFooter={data.length > 0 ? renderTableFooter : undefined}
			/>
			{activeEdit && (
				<SeatAssignmentPicker
					activeEdit={activeEdit}
					setActiveEdit={setActiveEdit}
					updateAssignment={updateAssignment}
					crewScores={crewScores}
					updateCrewScores={updateCrewScores}
					shuttleScores={shuttleScores}
				/>
			)}
		</React.Fragment>
	);

	function renderTableFooter(): React.ReactNode {
		return (
			<Table.Row>
				<Table.HeaderCell colSpan={columnCount}>
					{missionsSelected === 1 && t('shuttle_helper.calculator.mission_selected')}
					{missionsSelected !== 1 && t('shuttle_helper.calculator.missions_selected', { n: `${missionsSelected}`})}
				</Table.HeaderCell>
			</Table.Row>
		);
	}

	function renderTableRow(datum: ITableData): React.ReactNode {
		return (
			<Table.Row key={datum.id}>
				<Table.Cell textAlign='center'>
					{datum.priority}
				</Table.Cell>
				<Table.Cell>
					<span style={{ fontSize: '1.1em' }}><b>{datum.name}</b></span>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<MissionFactionView factionId={datum.faction} size={3} />
				</Table.Cell>
				<Table.Cell>
					<Table striped selectable singleLine compact='very' unstackable style={{ margin: '0 auto' }}>
						<Table.Body>
							{datum.seats.map((seat, seatNum) => renderSeatAssignment(datum.id, seatNum, seat))}
						</Table.Body>
					</Table>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<ShuttleBoostPicker
						shuttle={datum}
						onBoostSelected={(boost) => updateBoost(datum.id, boost)}
					/>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{datum.chance > 0 && <b>{Math.floor(datum.chance*100)}%</b>}
				</Table.Cell>
				<Table.Cell textAlign='right'>
					<Button compact icon='ban' content={t('global.dismiss')} onClick={() => dismissShuttle(datum.id)} />
				</Table.Cell>
			</Table.Row>
		);
	}

	// Assigned seat scores are stored unboosted, so rescore seats of boosted shuttles
	function getSeatScore(shuttle: Shuttle, seated: ISeatAssignment): number {
		if (!shuttle.boost || seated.assignedSymbol === '') return seated.seatScore;
		const seat = shuttle.seats[seated.seatNum];
		const seatedCrew = findSeatedCrew(rosterCrew, seated);
		if (!seat || !seatedCrew) return seated.seatScore;
		return getCrewSeatScore(seatedCrew, seat, eventData, shuttle.boost);
	}

	function updateBoost(shuttleId: string, boost: IShuttleBoost | undefined): void {
		const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (shuttle) {
			shuttle.boost = boost;
			setShuttlers({...shuttlers});
		}
	}

	function renderSeatAssignment(shuttleId: string, seatNum: number, seat: ShuttleSeat): React.ReactNode {
		let assignedCrew: IRosterCrew | undefined = undefined;
		const seated: ISeatAssignment | undefined = assigned.find(seat =>
			seat.shuttleId === shuttleId && seat.seatNum === seatNum
		);
		if (seated) assignedCrew = findSeatedCrew(rosterCrew, seated);

		return (
			<Table.Row key={seatNum} style={{ cursor: 'pointer' }}
				onClick={() => { if (seat.skillA) setActiveEdit({shuttleId, seatNum}); }}
			>
				<Table.Cell textAlign='center' width={4}>
					<SeatSkillView seat={seat} />
				</Table.Cell>
				<Table.Cell textAlign={assignedCrew ? 'left' : 'center'}>
					{assignedCrew && <SeatCrewView crew={assignedCrew} />}
					{!assignedCrew && <span style={{ color: 'gray' }}>({t('shuttle_helper.missions.status.open_seat')})</span>}
				</Table.Cell>
				<Table.Cell>
					{assignedCrew && (
						<React.Fragment>
							{assignedCrew.immortal > 0 && <Icon name='snowflake' />}
							{assignedCrew.statusIcon && <Icon name={assignedCrew.statusIcon} />}
						</React.Fragment>
					)}
				</Table.Cell>
				<Table.Cell textAlign='center' width={3}>
					{assignedCrew && (
						<Button.Group>
							<Button compact icon='lock' color={seated?.locked ? 'yellow' : undefined}
								onClick={(e) => { toggleAssignmentLock(shuttleId, seatNum); e.stopPropagation(); }} />
							<Button compact icon='x'
								onClick={(e) => { updateAssignment(shuttleId, seatNum); e.stopPropagation(); }} />
						</Button.Group>
					)}
				</Table.Cell>
			</Table.Row>
		);
	}

	function updateAssignment(shuttleId: string, seatNum: number, assignedCrew: IAssignableCrew | undefined = undefined, locked: boolean | undefined = false): void {
		// Unassign crew from previously assigned seat, if necessary
		if (assignedCrew) {
			const current: ISeatAssignment | undefined = assigned.find(seat => seat.assignedId === assignedCrew.id);
			if (current) {
				current.assignedId = -1;
				current.assignedSymbol = '';
				current.seatScore = 0;
				current.locked = false;
			}
		}

		const seated: ISeatAssignment | undefined = assigned.find(seat =>
			seat.shuttleId === shuttleId && seat.seatNum === seatNum
		);
		if (assignedCrew && !seated) {
			assigned.push({
				shuttleId,
				seatNum,
				ssId: assignedCrew.ssId,
				assignedId: assignedCrew.id,
				assignedSymbol: assignedCrew.symbol,
				seatScore: assignedCrew.score,
				locked
			});
		}
		else if (assignedCrew && seated) {
			seated.assignedId = assignedCrew.id;
			seated.assignedSymbol = assignedCrew.symbol;
			seated.seatScore = assignedCrew.score;
			seated.locked = locked;
		}
		else if (seated) {
			seated.assignedId = -1;
			seated.assignedSymbol = '';
			seated.seatScore = 0;
			seated.locked = false;
		}
		setAssigned([...assigned]);
	}

	function toggleAssignmentLock(shuttleId: string, seatNum: number): void {
		const seated: ISeatAssignment | undefined = assigned.find(seat =>
			seat.shuttleId === shuttleId && seat.seatNum === seatNum
		);
		if (seated) {
			seated.locked = !seated.locked;
			setAssigned([...assigned]);
		}
	}

	function dismissShuttle(shuttleId: string): void {
		const shuttle: Shuttle | undefined = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (shuttle) {
			const dismissedPriority: number = shuttle.priority;
			shuttle.priority = 0;
			shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId).forEach(shuttle => {
				if (shuttle.priority > dismissedPriority) shuttle.priority--;
			});
			setShuttlers({...shuttlers});
		}
	}
};
