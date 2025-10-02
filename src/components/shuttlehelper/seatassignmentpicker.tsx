import React from 'react';
import { Table, Icon, Button, Modal, Pagination, Popup } from 'semantic-ui-react';

import { IRosterCrew } from '../../components/eventplanner/model';

import { Shuttle, ShuttleSeat, CrewScores, ICrewScore, IShuttleScores, IAssignableCrew, ISeatAssignment } from './model';
import { ShuttlersContext } from './context';
import { SeatSkillView, SeatCrewView } from './missionstable';
import { getSkillSetId } from './utils';
import { GlobalContext } from '../../context/globalcontext';

interface IActiveEdit {
	shuttleId: string;
	seatNum: number;
};

type SeatAssignmentPickerProps = {
	activeEdit: IActiveEdit;
	setActiveEdit: (activeEdit: IActiveEdit | undefined) => void;
	updateAssignment: (shuttleId: string, seatNum: number, assignedCrew: IAssignableCrew, locked: boolean) => void;
	crewScores: CrewScores;
	updateCrewScores: (todo: ShuttleSeat[]) => void;
	shuttleScores: IShuttleScores;
};

export const SeatAssignmentPicker = (props: SeatAssignmentPickerProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const shuttlersContext = React.useContext(ShuttlersContext);
	const { rosterCrew, shuttlers, assigned } = shuttlersContext;
	const { activeEdit, setActiveEdit, updateAssignment, crewScores, updateCrewScores, shuttleScores } = props;
	const { shuttleId, seatNum } = activeEdit;

	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	const shuttle: Shuttle | undefined = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
	if (!shuttle) {
		setActiveEdit(undefined);
		return <></>;
	}

	const seat: ShuttleSeat = shuttle.seats[seatNum];
	// if (!seat) {
	// 	setActiveEdit(undefined);
	// 	return <></>;
	// }

	const ssId: string = getSkillSetId(seat);
	const scores: ICrewScore[] = crewScores.skillsets[ssId];
	if (!scores) updateCrewScores([seat]);

	return (
		<Modal
			open={true}
			onClose={() => setActiveEdit(undefined)}
		>
			<Modal.Header>
				{shuttle.name}
				{shuttleScores[shuttleId] ?
					<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
						({t('shuttle_helper.missions.n_percent_chance', { n: (shuttleScores[shuttleId].chance*100).toFixed(1) })})
					</span>
					: ''}
			</Modal.Header>
			<Modal.Content scrolling>
				{!scores && <>{t('global.loading_ellipses')}</>}
				{scores && renderTable()}
			</Modal.Content>
			<Modal.Actions>
				{shuttle.seats.length > 1 && <Button icon='forward' content={t('shuttle_helper.missions.next_seat')} onClick={() => cycleShuttleSeat()} />}
				<Button onClick={() => setActiveEdit(undefined)}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTable(): React.JSX.Element {
		let assignedCrew: IRosterCrew | undefined = undefined;
		const seated: ISeatAssignment | undefined = assigned.find(seat =>
			seat.shuttleId === shuttleId && seat.seatNum == seatNum
		);
		if (seated) {
			assignedCrew = rosterCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
			if (!assignedCrew) assignedCrew = rosterCrew.find(crew => crew.symbol === seated.assignedSymbol);
		}

		// Pagination
		const rowsPerPage: number = 10;
		const totalPages: number = Math.ceil(scores.length / rowsPerPage);
		const data: ICrewScore[] = scores.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage);

		return (
			<React.Fragment>
				<Table striped selectable singleLine compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell />
							<Table.HeaderCell colSpan={2}>{t('shuttle_helper.missions.columns.best')} <span style={{ padding: '0 .5em' }}><SeatSkillView seat={seat} /></span> {t('base.crew')}</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>{t('shuttle_helper.missions.columns.here')}<Popup trigger={<Icon name='help' />} content='Using this crew here will result in this net change to the success chance of this shuttle' /></Table.HeaderCell>
							<Table.HeaderCell>{t('shuttle_helper.missions.columns.current_assignment')}</Table.HeaderCell>
							<Table.HeaderCell textAlign='center'>{t('shuttle_helper.missions.columns.there')}<Popup trigger={<Icon name='help' />} content='Removing this crew from their current assignment will leave an open seat on that shuttle, resulting in this success chance' /></Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{data.map((datum, idx) => renderRow(datum, idx, assignedCrew))}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.HeaderCell colSpan={6}>
								<Pagination
									totalPages={totalPages}
									activePage={paginationPage}
									onPageChange={(e, { activePage }) => setPaginationPage(activePage as number)}
								/>
							</Table.HeaderCell>
						</Table.Row>
					</Table.Footer>
				</Table>
			</React.Fragment>
		);
	}

	function renderRow(score: ICrewScore, idx: number, assignedCrew: IRosterCrew | undefined): React.JSX.Element {
		const scoreCrew: IRosterCrew | undefined = rosterCrew.find(crew => crew.id === score.id);
		if (!scoreCrew) return <></>;

		const crew: IAssignableCrew = {
			...scoreCrew,
			...score
		};

		const currentSeat: ISeatAssignment | undefined = assigned.find(seat =>
			seat.assignedId === crew.id && seat.assignedSymbol === crew.symbol
		);
		let currentShuttle: Shuttle | undefined = undefined;
		if (currentSeat) currentShuttle = shuttlers.shuttles.find(shuttle => shuttle.id === currentSeat.shuttleId);

		return (
			<Table.Row key={idx} style={{ cursor: 'pointer' }}
				onClick={() => {
					if (!assignedCrew || crew.id !== assignedCrew.id)
						updateAssignment(shuttleId, seatNum, crew, true);
					setActiveEdit(undefined);
				}}
			>
				<Table.Cell textAlign='center'>
					{assignedCrew?.id === crew.id && <Icon color='green' name='check' />}
				</Table.Cell>
				<Table.Cell><SeatCrewView crew={crew} /></Table.Cell>
				<Table.Cell>
					{crew.immortal > 0 && <Icon name='snowflake' />}
					{crew.statusIcon && <Icon name={crew.statusIcon} />}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{renderScoreChange(shuttleId, seatNum, crew.score)}
				</Table.Cell>
				<Table.Cell>
					{currentShuttle?.name}
					{currentShuttle?.id === shuttleId && <span style={{ paddingLeft: '1em' }}><i>(This Shuttle)</i></span>}
					{currentSeat?.locked && <span style={{ paddingLeft: '1em' }}><Icon name='lock' /></span>}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{currentSeat && renderScoreChange(currentSeat.shuttleId, currentSeat.seatNum, 0)}
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderScoreChange(shuttleId: string, seatNum: number, replacementScore: number = 0): React.JSX.Element {
		if (!shuttleScores[shuttleId]) return <></>;
		const newScores = [...shuttleScores[shuttleId].scores];
		newScores[seatNum] = replacementScore;
		const DIFFICULTY = 2000;
		const dAvgSkill = newScores.reduce((a, b) => (a + b), 0)/newScores.length;
		const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
		let style = {} as Object;
		if (replacementScore === 0) {
			if (dChance*100 >= 90) style = { color: 'green', fontWeight: 'bold' };
			return <span style={style}>{Math.floor(dChance*100)}%</span>;
		}
		const dDelta = dChance - shuttleScores[shuttleId].chance;
		if (dDelta > 0 && dChance*100 >= 90)
			style = { color: 'green', fontWeight: 'bold' };
		return <span style={style}>{dDelta > 0 ? '+' : ''}{(dDelta*100).toFixed(1)}%</span>;
	}

	function cycleShuttleSeat(): void {
		if (!shuttle) return;
		const nextAssignment: IActiveEdit = {
			shuttleId: shuttleId as string,
			seatNum: (seatNum + 1) >= shuttle.seats.length ? 0 : seatNum + 1
		};
		setActiveEdit(nextAssignment);
	}
};
