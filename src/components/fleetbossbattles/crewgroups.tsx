import React from 'react';
import { InView } from 'react-intersection-observer';
import { Message, Table, Label, Icon, Grid, SemanticWIDTHS } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';
import { BossCrew, FilteredGroup, Optimizer, Solver, SolverNode } from '../../model/boss';

import { CrewNodeExporter } from './crewexporter';
import { MarkGroup, MarkCrew } from './markbuttons';

interface CrewGroupsProps {
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewGroupsContext = React.createContext<CrewGroupsProps>({} as CrewGroupsProps);

const CrewGroups = (props: CrewGroupsProps) => {
	const { solver } = props;

	const openNodes = solver.nodes.filter(node => node.open);

	return (
		<CrewGroupsContext.Provider value={{ ...props }}>
			{openNodes.map(node =>
				<NodeGroups key={node.index} node={node} />
			)}
		</CrewGroupsContext.Provider>
	);
};

type NodeGroupsProps = {
	node: SolverNode;
};

const NodeGroups = (props: NodeGroupsProps) => {
	const groupsContext = React.useContext(CrewGroupsContext);
	const { node } = props;

	const formattedOpen = node.traitsKnown.map((trait, idx) => (
		<span key={idx}>
			{idx > 0 ? <> + </> : <></>}{allTraits.trait_names[trait]}
		</span>
	)).reduce((prev, curr) => <>{prev} {curr}</>, <></>);
	const hidden = Array(node.hiddenLeft).fill('?').join(' + ');

	const nodeGroups = groupsContext.optimizer.groups[`node-${node.index}`];

	return (
		<div style={{ marginBottom: '2em' }}>
			<Message style={{ position: 'sticky', top: 45, zIndex: 2 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div>
						<Message.Header>{formattedOpen} + {hidden}</Message.Header>
						<p>Node {node.index+1}</p>
					</div>
					<div>
						<CrewNodeExporter node={node} nodeGroups={nodeGroups} traits={groupsContext.solver.traits} />
					</div>
				</div>
			</Message>
			{nodeGroups.length === 0 &&
				<Message>
					No possible solutions found for this node. You may need to change your filters, double-check your solved traits, or reset the list of attempted crew.
				</Message>
			}
			{nodeGroups.length > 0 && <GroupTable node={node} data={nodeGroups} />}
		</div>
	);
};

type GroupTableProps = {
	node: SolverNode;
	data: FilteredGroup[];
};

const GroupTable = (props: GroupTableProps) => {
	const groupsContext = React.useContext(CrewGroupsContext);
	const { node } = props;

	const [state, dispatch] = React.useReducer(reducer, {
		data: props.data,
		column: null,
		direction: null
	});
	const { data, column, direction } = state;

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: props.data });
	}, [props.data]);

	const hasNotes = data.filter(row => Object.values(row.notes).filter(note => !!note).length > 0).length > 0;

	const tableConfig = [
		{ column: 'traits', title: 'Traits', width: hasNotes ? 6 : 8, center: true, reverse: true },
		{ column: 'notes', title: 'Notes', width: 2, center: true, reverse: true },
		{ column: 'crew', title: 'Crew', width: 8, center: true, reverse: true }
	];
	if (!hasNotes) tableConfig.splice(1, 1);

	return (
		<Table sortable celled selectable striped>
			<Table.Header>
				<Table.Row>
					{tableConfig.map((cell, idx) => (
						<Table.HeaderCell key={idx}
							sorted={column === cell.column ? direction : null}
							onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, reverse: cell.reverse })}
							width={cell.width as SemanticWIDTHS} textAlign={cell.center ? 'center' : 'left'}
						>
							{cell.title}
						</Table.HeaderCell>
					))}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{data.map((row, idx) => (
					<Table.Row key={idx}>
						<Table.Cell textAlign='center'>
							<MarkGroup node={node} traits={row.traits} solver={groupsContext.solver} optimizer={groupsContext.optimizer} solveNode={groupsContext.solveNode} />
						</Table.Cell>
						{hasNotes &&
							<Table.Cell textAlign='center'>
								{row.notes.oneHandException && <Label style={{ background: '#ddd', color: '#333' }}>One hand exception</Label>}
								{row.notes.alphaException && <Label color='orange'>Alpha exception</Label>}
								{row.notes.uniqueCrew && <Label style={{ background: '#fdd26a', color: 'black' }}>Unique</Label>}
								{row.notes.nonPortal && <Label style={{ background: '#000000', color: '#fdd26a' }}>Non-portal</Label>}
								{row.notes.nonOptimal && <Label color='grey'>Non-optimal</Label>}
							</Table.Cell>
						}
						<Table.Cell>
							<GroupCrew crewList={row.crewList} />
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function reducer(state: any, action: any): any {
		switch (action.type) {
			case 'UPDATE_DATA':
				const updatedData = action.data.slice();
				firstSort(updatedData, 'traits', true);
				return {
					column: 'traits',
					data: updatedData,
					direction: 'descending'
				};
			case 'CHANGE_SORT':
				if (state.column === action.column) {
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

	function firstSort(data: FilteredGroup[], column: string, reverse: boolean = false): void {
		const sortBy = (comps: ((a: FilteredGroup, b: FilteredGroup) => number)[]) => {
			data.sort((a, b) => {
				const tests = comps.slice();
				let test = 0;
				while (tests.length > 0 && test === 0) {
					let shtest = tests.shift();
					test = shtest ? shtest(a, b) : 0;
				}
				return test;
			});
		};

		const noteScore = (row: FilteredGroup) => Object.values(row.notes).filter(note => !!note).length;
		const compareTraits = (a: FilteredGroup, b: FilteredGroup) => b.traits.length - a.traits.length;
		const compareCrew = (a: FilteredGroup, b: FilteredGroup) => b.crewList.length - a.crewList.length;
		const compareScore = (a: FilteredGroup, b: FilteredGroup) => b.score - a.score;
		const compareNotes = (a: FilteredGroup, b: FilteredGroup) => noteScore(b) - noteScore(a);
		const compareNotesAsc = (a: FilteredGroup, b: FilteredGroup) => noteScore(a) - noteScore(b);

		if (column === 'crew') {
			sortBy([compareCrew, compareNotesAsc, compareTraits, compareScore]);
			return;
		}
		else if (column === 'notes') {
			sortBy([compareNotes, compareTraits, compareCrew, compareScore]);
			return;
		}

		// Default is sort by traits
		sortBy([compareTraits, compareNotesAsc, compareCrew, compareScore]);
		return;
	}
};

type GroupCrewProps = {
	crewList: BossCrew[];
};

const GroupCrew = (props: GroupCrewProps) => {
	const groupsContext = React.useContext(CrewGroupsContext);

	const [showCrew, setShowCrew] = React.useState(false);

	const usable = groupsContext.optimizer.prefs.solo.usable;
	const crewList = props.crewList.filter(crew =>
		(usable !== 'owned' || (crew.highest_owned_rarity ?? 0) > 0)
			&& (usable !== 'thawed' || ((crew.highest_owned_rarity ?? 0) > 0 && !crew.only_frozen))
	);

	if (!showCrew) {
		return (
			<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
				onChange={(inView, entry) => { if (inView) setShowCrew(true); }}
			>
				<Icon loading name='spinner' />
				<br />Loading...
			</InView>
		);
	}

	return (
		<React.Fragment>
			{crewList.length === 0 &&
				<Message>
					You have no {usable === 'thawed' ? 'unfrozen' : ''} crew with this group of traits. Change your availability user preference to see more options.
				</Message>
			}
			{crewList.length > 0 &&
				<Grid doubling columns={3} textAlign='center'>
					{crewList.sort((a, b) => a.name.localeCompare(b.name)).map(crew =>
						<MarkCrew key={crew.symbol} crew={crew} trigger='card'
							solver={groupsContext.solver} optimizer={groupsContext.optimizer}
							solveNode={groupsContext.solveNode} markAsTried={groupsContext.markAsTried}
						/>
					)}
				</Grid>
			}
		</React.Fragment>
	);
};

export default CrewGroups;
