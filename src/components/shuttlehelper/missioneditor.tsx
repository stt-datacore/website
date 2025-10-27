import React from 'react';
import { Header, Table, Icon, Dropdown, Input, Button, Grid, Modal, Divider } from 'semantic-ui-react';

import allFactions from '../../../static/structured/factions.json';

import { Shuttle, ShuttleSeat, IDropdownOption } from './model';
import CONFIG from '../CONFIG';

type MissionEditorProps = {
	shuttle: Shuttle;
	saveMission: (shuttle: Shuttle) => void;
	deleteMission: (shuttleId: string) => void;
};

export const MissionEditor = (props: MissionEditorProps) => {
	const [shuttle, setShuttle] = React.useState<Shuttle>(structuredClone(props.shuttle));

	const isNewMission: boolean = props.shuttle.seats[0].skillA === '';

	const factionOptions: IDropdownOption[] = allFactions.sort((a, b) => a.name.localeCompare(b.name)).map(faction => {
		return {
			key: faction.id,
			value: faction.id,
			text: <span style={{ whiteSpace: 'nowrap' }}>{faction.name}</span>
		};
	});

	return (
		<Modal
			open={true}
			onClose={() => props.saveMission(shuttle)}
		>
			<Modal.Header>{isNewMission ? 'Create' : 'Edit'} Mission</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => props.saveMission(shuttle)}>
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
											<EditorSeat seatNum={seatNum} seat={seat} updateMissionSeat={updateMissionSeat} />
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
					<p><Button icon='trash' color='red' content='Delete Mission' onClick={() => props.deleteMission(shuttle.id)} /></p>
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
};

type EditorSeatProps = {
	seat: ShuttleSeat;
	seatNum: number;
	updateMissionSeat: (seatNum: number, key: string, value: string) => void;
};

const EditorSeat = (props: EditorSeatProps) => {
	const { seatNum, seat, updateMissionSeat } = props;

	const skillOptions: IDropdownOption[] = [];

	CONFIG.SKILLS_SHORT.forEach((s) => {
		skillOptions.push(
			{ key: s.short, text: s.short, value: s.name }
		)
	});

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
					disabled={seat.skillB === '' ? true : false}
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
