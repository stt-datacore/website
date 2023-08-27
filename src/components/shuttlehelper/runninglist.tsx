import React from 'react';
import { Table, Button } from 'semantic-ui-react';

import { ShuttleFactionView, SeatSkillView, SeatCrewView } from './views';
import { Shuttlers, Shuttle, ShuttleSeat, CrewScores, getSkillSetId, ISeatAssignment, IShuttleScores } from './shuttleutils';
import { ShuttleAdventure } from '../../model/shuttle';
import { PlayerCrew } from '../../model/player';

type RunningListProps = {
	groupId: string;
	crew: PlayerCrew[];
	setActiveStep: (newStep: string) => void;
	shuttlers: Shuttlers;
	activeShuttles: ShuttleAdventure[];
	crewScores: CrewScores;
	updateCrewScores: (todo: ShuttleSeat[], doneCallback?: () => void) => void;
};

const RunningList = (props: RunningListProps) => {
	const { shuttlers } = props;

	const [shuttles, setShuttles] = React.useState<Shuttle[]>([] as Shuttle[]);
	const [assigned, setAssigned] = React.useState<ISeatAssignment[]>([] as ISeatAssignment[]);

	React.useEffect(() => {
		const shuttles = [] as Shuttle[];
		const assigned = [] as ISeatAssignment[];
		const todo = [] as ShuttleSeat[], todoIds = [] as string[];
		props.activeShuttles.forEach(adventure => {
			const shuttle = shuttlers.shuttles.find(shuttle => shuttle.groupId === props.groupId && shuttle.id === adventure.symbol);
			if (shuttle) {
				shuttles.push(shuttle);
				adventure.shuttles[0].slots.forEach((slot, idx) => {
					const seat = shuttle.seats[idx];
					const ssId = getSkillSetId(seat);
					// Add crew to assignment
					if (slot.crew_symbol) {
						assigned.push({
							shuttleId: adventure.symbol,
							seatNum: idx,
							ssId,
							assignedId: -1,
							assignedSymbol: slot.crew_symbol,
							seatScore: 0,
							locked: false
						});
					}
					// Queue skillset for crew scores
					if (!props.crewScores.skillsets[ssId] && !todoIds.includes(ssId)) {
						todo.push(seat);
						todoIds.push(ssId);
					}
				});
			}
		});
		setShuttles(shuttles);
		setAssigned(assigned);
		if (todo.length > 0) props.updateCrewScores(todo);
	}, [props.activeShuttles]);

	const myCrew = props.crew;
	const SeatAssignmentRow = (props: { shuttleId: string, seatNum: number, seat: ShuttleSeat }) => {
		const { shuttleId, seatNum, seat } = props;

		let assignedCrew = undefined as PlayerCrew | undefined;
		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		if (seated) {
			assignedCrew = myCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
			if (!assignedCrew) assignedCrew = myCrew.find(crew => crew.symbol === seated.assignedSymbol);
		}

		return (
			<Table.Row key={seatNum}>
				<Table.Cell textAlign='center' width={4}>
					<SeatSkillView seat={seat} />
				</Table.Cell>
				<Table.Cell textAlign={assignedCrew ? 'left' : 'center'}>
					{assignedCrew && (<SeatCrewView crew={assignedCrew} />)}
				</Table.Cell>
			</Table.Row>
		);
	};

	const shuttleScores = getShuttleScores(shuttles, assigned, props.crewScores);
	const data = shuttles.slice().filter(shuttle => shuttle.groupId === props.groupId);

	return (
		<React.Fragment>
			<p>You have {shuttles.length} shuttle{shuttles.length === 1 ? '' : 's'} currently running. Re-run these shuttles to re-use crew assignments. Warning: re-running a shuttle may override previous crew assignments.</p>
			<Table celled striped compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Mission</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Faction</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Seat Assignments</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Success Chance</Table.HeaderCell>
						<Table.HeaderCell />
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.length === 0 && (
						<Table.Row>
							<Table.Cell colSpan={5} textAlign='center'>
								No running missions.
							</Table.Cell>
						</Table.Row>
					)}
					{data.map(shuttle => (
						<Table.Row key={shuttle.id}>
							<Table.Cell><b>{shuttle.name}</b></Table.Cell>
							<Table.Cell textAlign='center'>
								<ShuttleFactionView factionId={shuttle.faction} size={3} />
							</Table.Cell>
							<Table.Cell>
								<Table striped selectable singleLine compact='very' style={{ margin: '0 auto' }}>
									<Table.Body>
										{shuttle.seats.map((seat, seatNum) =>
											<SeatAssignmentRow key={seatNum} shuttleId={shuttle.id} seatNum={seatNum} seat={seat} />
										)}
									</Table.Body>
								</Table>
							</Table.Cell>
							<Table.Cell textAlign='center'>
								{shuttleScores[shuttle.id]?.chance > 0 ? <b>{Math.floor(shuttleScores[shuttle.id].chance*100)}%</b> : <></>}
							</Table.Cell>
							<Table.Cell textAlign='right'>
								<Button compact icon='redo' content='Re-run' onClick={() => rerunShuttle()} />
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={5}>
							<Button compact icon='backward' content='View Assignments' onClick={() => props.setActiveStep('assignments')} />
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</React.Fragment>
	);

	function rerunShuttle(): void {
        console.log('Not yet functional!');
	}

	function getShuttleScores(shuttles: Shuttle[], assigned: ISeatAssignment[], crewScores: CrewScores): IShuttleScores {
		const shuttleScores = {} as IShuttleScores;
		const DIFFICULTY = 2000;
		assigned.forEach(seated => {
			const shuttle = shuttles.find(shuttle => shuttle.id === seated.shuttleId);
			if (shuttle) {
				if (!shuttleScores[seated.shuttleId]) {
					const seatCount = shuttle.seats.length;
					shuttleScores[seated.shuttleId] = { chance: 0, scores: Array(seatCount).fill(0) };
				}
				const crewScore = crewScores.ranked.find(score => score.symbol === seated.assignedSymbol && score.ssId === seated.ssId);
				shuttleScores[seated.shuttleId].scores[seated.seatNum] = crewScore?.score ?? 0;
				const dAvgSkill = shuttleScores[seated.shuttleId].scores.reduce((a, b) => (a + b), 0)/shuttleScores[seated.shuttleId].scores.length;
				const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
				shuttleScores[seated.shuttleId].chance = dAvgSkill > 0 ? dChance : 0;
			}
		});
		return shuttleScores;
	}
};

export default RunningList;