import React from 'react';
import { Header, Table, Icon, Input, Button, Modal, Pagination, Popup } from 'semantic-ui-react';

import { ShuttleFactionView, SeatSkillView, SeatCrewView } from './views';
import { Shuttlers, Shuttle, ShuttleSeat, CrewScores, getSkillSetId } from './shuttleutils';

type AssignmentsListProps = {
	groupdId: string;
	crew: any[];
	setActiveStep: (newStep: string) => void;
	recommendShuttlers: () => void;
	shuttlers: Shuttlers;
	setShuttlers: (shuttlers: Shuttlers) => void;
	assigned: any[];
	setAssigned: (assigned: any[]) => void;
	crewScores: CrewScores;
	updateCrewScores: (todo: ShuttleSeat[]) => void;
};

const AssignmentsList = (props: AssignmentsList) => {
	const { shuttlers, setShuttlers, assigned, setAssigned, crewScores, updateCrewScores } = props;

	const [shuttleScores, setShuttleScores] = React.useState([]);
	const [editAssignment, setEditAssignment] = React.useState(undefined);
	const [scoreLoadQueue, setScoreLoadQueue] = React.useState('');

	React.useEffect(() => {
		updateShuttleScores();
	}, [assigned]);

	const myCrew = props.crew;
	const SeatAssignmentRow = (props: { shuttleId: string, seatNum: number, seat: ShuttleSeat }) => {
		const { shuttleId, seatNum, seat } = props;

		let assignedCrew;
		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		if (seated) {
			assignedCrew = myCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
			if (!assignedCrew) assignedCrew = myCrew.find(crew => crew.symbol === seated.assignedSymbol);
		}

		const lockAttributes = {};
		if (seated?.locked) lockAttributes.color = 'yellow';

		return (
			<Table.Row key={seatNum} style={{ cursor: 'pointer' }}
				onClick={() => { if (seat.skillA) setEditAssignment({shuttleId, seatNum}); }}
			>
				<Table.Cell textAlign='center'>
					<SeatSkillView seat={seat} />
				</Table.Cell>
				<Table.Cell textAlign={assignedCrew ? 'left' : 'right'}>
					{assignedCrew && (<SeatCrewView crew={assignedCrew} />)}
					{!assignedCrew && (<span style={{ color: 'gray' }}>(Open seat)</span>)}
				</Table.Cell>
				<Table.Cell>
					{assignedCrew?.immortal > 0 && (<Icon name='snowflake' />)}
					{assignedCrew?.prospect && (<Icon name='add user' />)}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{assignedCrew && (
						<Button.Group>
							<Button compact icon='lock' {... lockAttributes}
								onClick={(e) => { toggleAssignmentLock(shuttleId, seatNum); e.stopPropagation(); }} />
							<Button compact icon='x'
								onClick={(e) => { updateAssignment(shuttleId, seatNum); e.stopPropagation(); }} />
						</Button.Group>
					)}
				</Table.Cell>
			</Table.Row>
		);
	};

	const SeatAssignmentPicker = () => {
		const { shuttleId, seatNum } = editAssignment;
		const [paginationPage, setPaginationPage] = React.useState(1);

		const seat = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId).seats[seatNum];
		const ssId = getSkillSetId(seat);
		const scores = crewScores.skillsets[ssId];
		if (!scores) {
			if (scoreLoadQueue === '') {
				setScoreLoadQueue(ssId);
				updateCrewScores([seat], () => setScoreLoadQueue(''));
			}
			return (<></>);
		}

		const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		return (
			<Modal
				open={true}
				onClose={() => setEditAssignment(undefined)}
			>
				<Modal.Header>
					{shuttle.name}
					{shuttleScores[shuttleId] ?
						<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
							({(shuttleScores[shuttleId].chance*100).toFixed(1)}% Chance)
						</span>
						: ''}
				</Modal.Header>
				<Modal.Content scrolling>
					{scores && renderTable()}
				</Modal.Content>
				<Modal.Actions>
					<Button icon='forward' content='Next Seat' onClick={() => cycleShuttleSeat()} />
					<Button positive onClick={() => setEditAssignment(undefined)}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function renderTable(): JSX.Element {
			let assignedCrew;
			const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum == seatNum);
			if (seated) {
				assignedCrew = myCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
				if (!assignedCrew) assignedCrew = myCrew.find(crew => crew.symbol === seated.assignedSymbol);
			}

			// Pagination
			const rowsPerPage = 10;
			const totalPages = Math.ceil(scores.length / rowsPerPage);
			const data = scores.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage).map(score => {
				const scoreCrew = myCrew.find(crew => crew.id === score.id);
				return {...scoreCrew, ...score}
			});

			return (
				<React.Fragment>
					<Table striped selectable singleLine compact='very'>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell />
								<Table.HeaderCell colSpan={2}>Best <span style={{ padding: '0 .5em' }}><SeatSkillView seat={seat} /></span> Crew</Table.HeaderCell>
								<Table.HeaderCell textAlign='center'>Here<Popup trigger={<Icon name='help' />} content='Using this crew here will result in this net change to the success chance of this shuttle' /></Table.HeaderCell>
								<Table.HeaderCell>Current Assignment</Table.HeaderCell>
								<Table.HeaderCell textAlign='center'>There<Popup trigger={<Icon name='help' />} content='Removing this crew from their current assignment will leave an open seat on that shuttle, resulting in this success chance' /></Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{data.map((crew, idx) => renderRow(crew, idx, assignedCrew))}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.HeaderCell colSpan={6}>
									<Pagination
										totalPages={totalPages}
										activePage={paginationPage}
										onPageChange={(e, { activePage }) => setPaginationPage(activePage)}
									/>
								</Table.HeaderCell>
							</Table.Row>
						</Table.Footer>
					</Table>
				</React.Fragment>
			);
		}

		function renderRow(crew: any, idx: number, assignedCrew: any): JSX.Element {
			const currentSeat = assigned.find(seat => seat.assignedId === crew.id && seat.assignedSymbol === crew.symbol);
			const currentShuttle = currentSeat ? shuttlers.shuttles.find(shuttle => shuttle.id === currentSeat.shuttleId) : undefined;
			return (
				<Table.Row key={idx} style={{ cursor: 'pointer' }}
					onClick={() => {
						if (!assignedCrew || crew.id !== assignedCrew.id)
							updateAssignment(shuttleId, seatNum, crew, true);
						setEditAssignment(undefined);
					}}
				>
					<Table.Cell textAlign='center'>
						{assignedCrew?.id === crew.id && (<Icon color='green' name='check' />)}
					</Table.Cell>
					<Table.Cell><SeatCrewView crew={crew} /></Table.Cell>
					<Table.Cell>
						{crew.immortal > 0 && (<Icon name='snowflake' />)}
						{crew.prospect && (<Icon name='add user' />)}
					</Table.Cell>
					<Table.Cell textAlign='center'>
						{renderScoreChange(shuttleId, seatNum, crew.score)}
					</Table.Cell>
					<Table.Cell>
						{currentShuttle?.name}
						{currentShuttle?.id === shuttleId ? <span style={{ paddingLeft: '1em' }}><i>(This Shuttle)</i></span> : ''}
					</Table.Cell>
					<Table.Cell textAlign='center'>
						{currentSeat && renderScoreChange(currentSeat.shuttleId, currentSeat.seatNum, 0)}
					</Table.Cell>
				</Table.Row>
			);
		}

		function renderScoreChange(shuttleId: string, seatNum: number, replacementScore: number = 0): JSX.Element {
			if (!shuttleScores[shuttleId]) return (<></>);
			const newScores = [...shuttleScores[shuttleId].scores];
			newScores[seatNum] = replacementScore;
			const DIFFICULTY = 2000;
			const dAvgSkill = newScores.reduce((a, b) => (a + b), 0)/newScores.length;
			const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
			const attributes = {};
			if (replacementScore === 0) {
				if (dChance*100 >= 90) attributes.style = { color: 'green', fontWeight: 'bold' };
				return (<span {...attributes}>{Math.floor(dChance*100)}%</span>);
			}
			const dDelta = dChance - shuttleScores[shuttleId].chance;
			if (dDelta > 0 && dChance*100 >= 90)
				attributes.style = { color: 'green', fontWeight: 'bold' };
			return (<span {...attributes}>{dDelta > 0 ? '+' : ''}{(dDelta*100).toFixed(1)}%</span>);
		}

		function cycleShuttleSeat(): void {
			const nextAssignment = {
				shuttleId: shuttleId,
				seatNum: seatNum + 1 >= shuttle.seats.length ? 0 : seatNum + 1
			};
			setEditAssignment(nextAssignment);
		}
	};

	const data = shuttlers.shuttles.slice()
		.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0)
		.sort((a, b) => a.priority - b.priority);

	return (
		<React.Fragment>
			<p>You can rearrange crew to balance shuttle chances as you see fit. Click a seat to change the crew assigned to it.</p>
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
							<Table.Cell colSpan={6} textAlign='center'>
								No missions selected.
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
								<Button compact icon='ban' content='Dismiss' onClick={() => dismissShuttle(shuttle.id)} />
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={3}>
							<Button compact icon='backward' content='Change Missions' onClick={() => props.setActiveStep('missions')} />
						</Table.HeaderCell>
						<Table.HeaderCell colSpan={3} textAlign='right'>
							{data.length > 0 && (<Button compact icon='rocket' color='green' content='Recommend Crew' onClick={() => props.recommendShuttlers()} />)}
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			{editAssignment && (<SeatAssignmentPicker />)}
		</React.Fragment>
	);

	function dismissShuttle(shuttleId: string): void {
		shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId).priority = 0;
		setShuttlers({...shuttlers});
	}

	function updateAssignment(shuttleId: string, seatNum: number, assignedCrew: any, locked: boolean): void {
		// Unassign crew from previously assigned seat, if necessary
		if (assignedCrew) {
			const current = assigned.find(seat => seat.assignedId === assignedCrew.id);
			if (current) {
				current.assignedId = -1;
				current.assignedSymbol = '';
				current.seatScore = 0;
				current.locked = false;
			}
		}

		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
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
		else if (assignedCrew) {
			seated.assignedId = assignedCrew.id;
			seated.assignedSymbol = assignedCrew.symbol;
			seated.seatScore = assignedCrew.score;
			seated.locked = locked;
		}
		else {
			seated.assignedId = -1;
			seated.assignedSymbol = '';
			seated.seatScore = 0;
			seated.locked = false;
		}
		setAssigned([...assigned]);
	}

	function toggleAssignmentLock(shuttleId: string, seatNum: number): void {
		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		seated.locked = !seated.locked;
		setAssigned([...assigned]);
	}

	function updateShuttleScores(): void {
		const DIFFICULTY = 2000;
		const newScores = [];
		assigned.forEach(seated => {
			if (!newScores[seated.shuttleId]) {
				const seatCount = shuttlers.shuttles.find(shuttle => shuttle.id === seated.shuttleId).seats.length;
				newScores[seated.shuttleId] = { chance: 0, scores: Array(seatCount).fill(0) };
			}
			newScores[seated.shuttleId].scores[seated.seatNum] = seated.seatScore;
			const dAvgSkill = newScores[seated.shuttleId].scores.reduce((a, b) => (a + b), 0)/newScores[seated.shuttleId].scores.length;
			const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
			newScores[seated.shuttleId].chance = dAvgSkill > 0 ? dChance : 0;
		});
		setShuttleScores(newScores);
	}
};

export default AssignmentsList;