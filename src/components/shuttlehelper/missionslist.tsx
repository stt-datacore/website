import React from 'react';
import { Header, Table, Icon, Dropdown, Input, Button, Grid, Modal, Divider } from 'semantic-ui-react';

import { ShuttleFactionView, SeatSkillView } from './views';
import { Shuttlers, Shuttle, ShuttleSeat } from './shuttleutils';
import { ShuttleAdventure } from '../../model/shuttle';

import allFactions from '../../../static/structured/factions.json';

type MissionsListProps = {
	groupId: string;
	setActiveStep: (newStep: string) => void;
	recommendShuttlers: () => void;
	shuttlers: Shuttlers;
	setShuttlers: (shuttlers: Shuttlers) => void;
	activeShuttles: ShuttleAdventure[];
};

const MissionsList = (props: MissionsListProps) => {
	const { groupId, shuttlers, setShuttlers, activeShuttles } = props;

	const [editMission, setEditMission] = React.useState<Shuttle | undefined>(undefined);

	const [state, dispatch] = React.useReducer(reducer, {
		data: shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId),
		column: null,
		direction: null
	});
	const { column, direction } = state;
	const data: Shuttle[] = state.data;

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId), column, direction });
	}, [shuttlers]);

	const CheckDropdown = () => {
		if (data.length === 0) return (<></>);

		interface ICheckOption {
			key: string;
			text: string;
			ids: string[];
		};

		const checkOptions: ICheckOption[] = [];

		const threeSeaters = [] as string[], fourSeaters = [] as string[];
		data.forEach(shuttle => {
			if (shuttle.seats.length <= 4)
				fourSeaters.push(shuttle.id);
			if (shuttle.seats.length === 3)
				threeSeaters.push(shuttle.id);
		});
		if (threeSeaters.length > 0)
			checkOptions.push({ key: 'three-seaters', text: `Select only 3-seaters (${threeSeaters.length})`, ids: threeSeaters });
		if (fourSeaters.length > 0)
			checkOptions.push({ key: 'four-seaters', text: `Select only 3- and 4- seaters (${fourSeaters.length})`, ids: fourSeaters });

		if (activeShuttles?.length > 0) {
			const openIds = activeShuttles.map(adventure => adventure.symbol);
			checkOptions.push({ key: `open-adventures`, text: `Select only open in-game (${openIds.length})`, ids: openIds });
		}

		const factions = [] as number[];
		data.forEach(shuttle => {
			if (shuttle.faction > 0 && !factions.includes(shuttle.faction)) factions.push(shuttle.faction);
		});
		if (factions.length > 1) {
			factions.forEach(factionId => {
				const ids = data.filter(shuttle => shuttle.faction === factionId).map(shuttle => shuttle.id);
				const faction = allFactions.find(af => af.id === factionId);
				checkOptions.push({ key: `faction-${factionId}`, text: `Select only ${faction?.name} (${ids.length})`, ids });
			});
		}

		return (
			<Dropdown
				icon='check'
				floating
			>
				<Dropdown.Menu>
					<Dropdown.Item icon='check' text={`Select all (${data.length})`} onClick={() => checkMissions([])} />
					{missionsSelected > 0 && (
						<Dropdown.Item icon='x' text='Unselect all' onClick={() => checkMissions([], false)} />
					)}
					{checkOptions.length > 0 && <Dropdown.Divider />}
					{checkOptions.map(option => (
						<Dropdown.Item key={option.key} text={option.text} onClick={() => checkMissions(option.ids)} />
					))}
				</Dropdown.Menu>
			</Dropdown>
		);
	};

	interface ITableConfig {
		title: string | JSX.Element;
		align?: 'left' | 'right' | 'center';
		column?: string;
		span?: number;
		reverse?: boolean;
	};

	const tableConfig: ITableConfig[] = [
		{ title: <CheckDropdown />, align: 'center' },
		{ column: 'name', title: 'Mission' },
		{ column: 'faction', title: 'Faction', align: 'center' },
		{ column: 'seats.length', title: 'Seats', align: 'center' },
		{ column: 'skills', title: 'Skills', span: 5 },
		{ title: '' }
	];

	const MissionEditor = (props: { shuttle: Shuttle }) => {
		const [shuttle, setShuttle] = React.useState<Shuttle>(JSON.parse(JSON.stringify(props.shuttle)));

		const factionOptions = allFactions.sort((a, b) => a.name.localeCompare(b.name)).map(faction => {
			return { key: faction.id, value: faction.id, text: (<span style={{ whiteSpace: 'nowrap' }}>{faction.name}</span>) };
		});

		const EditorSeat = (props: { seat: ShuttleSeat, seatNum: number }) => {
			const { seatNum, seat } = props;

			const skillOptions = [
				{ key: 'CMD', text: 'CMD', value: 'command_skill' },
				{ key: 'DIP', text: 'DIP', value: 'diplomacy_skill' },
				{ key: 'ENG', text: 'ENG', value: 'engineering_skill' },
				{ key: 'MED', text: 'MED', value: 'medicine_skill' },
				{ key: 'SCI', text: 'SCI', value: 'science_skill' },
				{ key: 'SEC', text: 'SEC', value: 'security_skill' }
			];

			return (
				<Grid textAlign='center' columns={3}>
					<Grid.Column>
						<Dropdown
							direction='right'
							compact
							selection
							options={skillOptions}
							value={seat.skillA}
							onChange={(e, { value }) => updateMissionSeat(seatNum, 'skillA', value as string)}
						/>
					</Grid.Column>
					<Grid.Column>
						<Button circular
							disabled={seat.skillB == '' ? true : false}
							onClick={() => updateMissionSeat(seatNum, 'operand', seat.operand == 'AND' ? 'OR' : 'AND')}
						>
							{seat.skillB == '' ? '' : seat.operand}
						</Button>
					</Grid.Column>
					<Grid.Column>
						<Dropdown
							compact
							selection
							clearable
							options={skillOptions}
							value={seat.skillB}
							onChange={(e, { value }) => updateMissionSeat(seatNum, 'skillB', value as string)}
						/>
					</Grid.Column>
				</Grid>
			);
		};

		return (
			<Modal
				open={true}
				onClose={() => applyEdits()}
			>
				<Modal.Header>Edit Mission</Modal.Header>
				<Modal.Content scrolling>
					{renderContent()}
				</Modal.Content>
				<Modal.Actions>
					<Button positive onClick={() => applyEdits()}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function renderContent(): JSX.Element {
			return (
				<React.Fragment>
					<Grid columns={2} divided stackable>
						<Grid.Column>
							<div>
								<Header as='h4'>Mission name</Header>
								<Input style={{ marginTop: '-1em' }}
									placeholder='Mission name...'
									value={shuttle.name}
									onChange={(e, { value }) => updateMissionName(value)}>
										<input />
										<Button icon onClick={() => updateMissionName('')} >
											<Icon name='delete' />
										</Button>
								</Input>
							</div>
							<div style={{ marginTop: '1em' }}>
								<Header as='h4'>Faction</Header>
								<Dropdown
									style={{ marginTop: '-1em' }}
									selection
									options={factionOptions}
									value={shuttle.faction}
									onChange={(e, { value }) => updateFaction(value as number)}
								/>
							</div>
						</Grid.Column>
						<Grid.Column>
							<Header as='h4'>Seats</Header>
							<p style={{ marginTop: '-1em' }}>Set each seat to the skills required. Add seats as necessary.</p>
							<Table collapsing unstackable compact='very' size='small'>
								<Table.Body>
									{shuttle.seats.map((seat, seatNum) => (
										<Table.Row key={seatNum}>
											<Table.Cell textAlign='right'>{seatNum+1}</Table.Cell>
											<Table.Cell textAlign='center'>
												<EditorSeat seatNum={seatNum} seat={seat} />
											</Table.Cell>
											<Table.Cell textAlign='right'>
												{shuttle.seats.length > 1 && <Button compact icon='trash' color='red' onClick={() => deleteMissionSeat(seatNum)} />}
											</Table.Cell>
										</Table.Row>
									))}
								</Table.Body>
							</Table>
							<Button compact icon='plus square outline' content='Add Seat' onClick={() => addMissionSeat()} />
						</Grid.Column>
					</Grid>
					<div style={{ marginTop: '1em' }}>
						<Divider />
						<p>If you no longer need this mission, you can delete it here. Note: missions will be automatically deleted after the event has concluded.</p>
						<p><Button icon='trash' color='red' content='Delete Mission' onClick={() => deleteMission(shuttle.id)} /></p>
					</div>
				</React.Fragment>
			);
		}

		function updateMissionName(newName: string): void {
			shuttle.name = newName;
			setShuttle({...shuttle});
		}

		function updateFaction(newFaction: number): void {
			shuttle.faction = newFaction;
			setShuttle({...shuttle});
		}

		function updateMissionSeat(seatNum: number, key: string, value: string): void {
			shuttle.seats[seatNum][key] = value;
			setShuttle({...shuttle});
		}

		function addMissionSeat(): void {
			shuttle.seats.push(new ShuttleSeat());
			setShuttle({...shuttle});
		}

		function deleteMissionSeat(seatNum: number): void {
			shuttle.seats.splice(seatNum, 1);
			setShuttle({...shuttle});
		}

		function applyEdits(): void {
			if (shuttle.priority === 0) shuttle.priority = missionsSelected + 1;
			const shuttleNum = shuttlers.shuttles.findIndex(s => s.id === shuttle.id);
			shuttlers.shuttles[shuttleNum] = shuttle;
			updateShuttlers();
			setEditMission(undefined);
		}
	};

	const missionsSelected = data.filter(shuttle => shuttle.priority > 0).length;

	return (
		<React.Fragment>
			<div>Click all the missions that you want to run, then click 'Recommend Crew' to see the best seats for your crew.</div>
			<Table celled striped selectable sortable singleLine>
				<Table.Header>
					<Table.Row>
						{tableConfig.map((cell, idx) => (
							<Table.HeaderCell key={idx}
								sorted={column === cell.column ? direction : null}
								onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, reverse: cell.reverse })}
								colSpan={cell.span ?? 1}
								textAlign={cell.align ?? 'left'}
							>
								{cell.title}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.length === 0 && (
						<Table.Row>
							<Table.Cell colSpan={10} textAlign='center'>
								No missions available.
							</Table.Cell>
						</Table.Row>
					)}
					{data.map(shuttle => (
						<Table.Row key={shuttle.id} style={{ cursor: 'pointer' }}
							onClick={() => toggleMissionStatus(shuttle.id)}
							onDoubleClick={() => { toggleMissionStatus(shuttle.id); props.recommendShuttlers(); }}
						>
							<Table.Cell textAlign='center'>
								{shuttle.priority > 0 && (<Icon color='green' name='check' />)}
							</Table.Cell>
							<Table.Cell>
								<span style={{ fontSize: '1.1em' }}><b>{shuttle.name}</b></span>
							</Table.Cell>
							<Table.Cell textAlign='center'>
								<ShuttleFactionView factionId={shuttle.faction} size={1.5} />
							</Table.Cell>
							<Table.Cell textAlign='center'>{shuttle.seats.length}</Table.Cell>
							{[0, 1, 2, 3, 4].map(seatNum => (
								<Table.Cell key={seatNum} textAlign='center'>
									{shuttle.seats.length > seatNum && (
										<SeatSkillView seat={shuttle.seats[seatNum]} />
									)}
								</Table.Cell>
							))}
							<Table.Cell textAlign='right'>
								{!shuttle.readonly && (
									<Button icon='edit' content='Edit' onClick={(e) => { setEditMission(shuttle); e.stopPropagation(); }}/>
								)}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={10} textAlign='right'>
							{missionsSelected > 0 && (<Button compact icon='rocket' color='green' content='Recommend Crew' onClick={() => props.recommendShuttlers()} />)}
							{missionsSelected === 0 && (<Button compact icon='rocket' content='Recommend Crew' />)}
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			{editMission && <MissionEditor shuttle={editMission} />}
			<p>If the mission you want isn't listed here, click 'Create Mission' to input the mission parameters manually. Tip: open shuttle missions in-game before uploading your player data to DataCore so that this tool can import the missions automatically.</p>
			<Button icon='plus square' content='Create Mission' onClick={() => createMission() } />
		</React.Fragment>
	);

	function reducer(state, action): any {
		switch (action.type) {
			case 'UPDATE_DATA':
				//const defaultColumn = action.data.filter(shuttle => shuttle.priority > 0).length ? 'priority' : 'name';
				const updatedData = action.data.slice();
				firstSort(updatedData, action.column ?? 'name', action.direction ?? 'ascending');
				return {
					column: action.column ?? 'name',
					data: updatedData,
					direction: action.direction ?? 'ascending'
				};
			case 'CHANGE_SORT':
				if (!action.column) {
					return {
						column: state.column,
						data: state.data,
						direction: state.direction
					};
				}
				if (state.column === action.column && action.column !== 'priority') {
					return {
						...state,
						data: state.data.slice().reverse(),
						direction: state.direction === 'ascending' ? 'descending' : 'ascending'
					};
				}
				else {
					const data = state.data.slice();
					firstSort(data, action.column, action.reverse);
					return {
						column: action.column,
						data: data,
						direction: action.reverse ? 'descending' : 'ascending'
					};
				}
			default:
				throw new Error();
		}
	}

	function firstSort(data: any[], column: string, reverse: boolean = false): void {
		data.sort((a, b) => {
			if (column === 'name') return a.name.localeCompare(b.name);
			let aValue = column.split('.').reduce((prev, curr) => prev.hasOwnProperty(curr) ? prev[curr] : undefined, a);
			let bValue = column.split('.').reduce((prev, curr) => prev.hasOwnProperty(curr) ? prev[curr] : undefined, b);
			// Always show selected missions at the top when sorting by priority
			if (column === 'priority') {
				if (aValue === 0) aValue = 100;
				if (bValue === 0) bValue = 100;
			}
			if (column === 'skills') {
				aValue = a.seats.length;
				bValue = b.seats.length;
			}
			// Tiebreaker goes to name ascending
			if (aValue === bValue) return a.name.localeCompare(b.name);
			if (reverse) bValue - aValue;
			return aValue - bValue;
		});
	}

	function checkMissions(shuttleIds: string[], checkState: boolean = true): void {
		let priority = 0;
		shuttlers.shuttles.forEach(shuttle => {
			if (shuttleIds.length === 0)
				shuttle.priority = checkState ? ++priority : 0;
			else
				shuttle.priority = checkState && shuttleIds.includes(shuttle.id) ? ++priority : 0;
		});
		updateShuttlers();
		if (shuttleIds.length !== 0)
			dispatch({ type: 'CHANGE_SORT', column: 'priority' });
	}

	function createMission(): void {
		const shuttle = new Shuttle(groupId);
		shuttle.seats.push(new ShuttleSeat());
		shuttlers.shuttles.push(shuttle);
		updateShuttlers();
		setEditMission(shuttle);
	}

	function deleteMission(shuttleId: string): void {
		const shuttleNum = shuttlers.shuttles.findIndex(shuttle => shuttle.id === shuttleId);
		shuttlers.shuttles.splice(shuttleNum, 1);
		updateShuttlers();
		setEditMission(undefined);
	}

	function toggleMissionStatus(shuttleId: string): void {
		const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (!shuttle) return;
		shuttle.priority = shuttle.priority === 0 ? missionsSelected+1 : 0;
		updateShuttlers();
	}

	function updateShuttlers(): void {
		setShuttlers({...shuttlers});
	}
};

export default MissionsList;