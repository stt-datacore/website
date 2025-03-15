import React from 'react';
import { InView } from 'react-intersection-observer';
import {
	Button,
	Grid,
	Icon,
	Label,
	Message,
	SemanticWIDTHS,
	Table
} from 'semantic-ui-react';

import { BossCrew, FilteredGroup, Optimizer, SolveStatus, Solver, SolverNode } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { UserContext } from './context';
import { CrewNodeExporter } from './crewexporter';
import { MarkGroup, MarkCrew } from './markbuttons';

const CrewGroupsContext = React.createContext<CrewGroupsProps>({} as CrewGroupsProps);

type CrewGroupsProps = {
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[], bypassConfirmation?: boolean) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewGroups = (props: CrewGroupsProps) => {
	const { solver } = props;
	return (
		<CrewGroupsContext.Provider value={{ ...props }}>
			{solver.nodes.map(node => (
				<NodeGroups key={node.index} node={node} />
			))}
		</CrewGroupsContext.Provider>
	);
};

type NodeGroupsProps = {
	node: SolverNode;
};

const NodeGroups = (props: NodeGroupsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt, TRAIT_NAMES } = globalContext.localized;
	const { spotterPrefs } = React.useContext(UserContext);
	const groupsContext = React.useContext(CrewGroupsContext);
	const { node } = props;

	// Hide this node if solve authenticated from player data, solve confirmed, or not set to confirm solved traits
	if (node.solveStatus === SolveStatus.Infallible
		|| node.solveStatus === SolveStatus.Confirmed
		|| (node.solveStatus === SolveStatus.Unconfirmed && !spotterPrefs.confirmSolves)
	) return <></>;

	const nodeGroups: FilteredGroup[] = groupsContext.optimizer.groups[`node-${node.index}`];
	const unconfirmedSolve: boolean = node.solveStatus === SolveStatus.Unconfirmed;
	const partialSolve: boolean = node.solveStatus === SolveStatus.Partial;

	return (
		<div style={{ marginBottom: '2em' }}>
			<Message style={{ position: 'sticky', top: 45, zIndex: 2 }} icon={unconfirmedSolve}>
				{unconfirmedSolve && <Icon name='check circle' color='green' />}
				<div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div>
						<Message.Header>{renderTraits()}</Message.Header>
						<p>
							{(unconfirmedSolve || partialSolve) && (
								<span>
									{unconfirmedSolve && partialSolve && (
										<>{tfmt('fbb.solves.partially_solved', { n: `${node.index+1}`})}{', '}{tfmt('fbb.solves.pending')}</>
									)}
									{unconfirmedSolve && !partialSolve && (
										<>{tfmt('fbb.solves.solved', { n: `${node.index+1}`})}{', '}{tfmt('fbb.solves.pending')}</>
									)}
									{!unconfirmedSolve && partialSolve && (
										<>{tfmt('fbb.solves.partially_solved', { n: `${node.index+1}`})}</>
									)}
									<span style={{ paddingLeft: '1em' }}>
										<Button	/* Undo Solve */
											content={t('fbb.undo_solve')}
											icon='undo'
											onClick={() => groupsContext.solveNode(node.index, [])}
											compact
										/>
									</span>
								</span>
							) || <>{tfmt('fbb.node_n', { n: `${node.index+1}`})}</>}
						</p>
					</div>
					<div>
						<CrewNodeExporter node={node} nodeGroups={nodeGroups} traits={groupsContext.solver.traits} />
					</div>
				</div>
			</Message>
			{nodeGroups.length === 0 && (
				<Message>
					{t('fbb.alert_no_solution')}
				</Message>
			)}
			{nodeGroups.length > 0 && <GroupTable node={node} data={nodeGroups} />}
		</div>
	);

	function renderTraits(): JSX.Element {
		const traits: string[ ] = node.traitsKnown.concat(Array(node.hiddenLeft).fill('?'));
		const formattedTraits = traits.map((trait, idx) => (
			<span key={idx}>
				{idx > 0 ? <> + </> : <></>}{trait !== '?' ? TRAIT_NAMES[trait] : '?'}
			</span>
		)).reduce((prev, curr) => <>{prev} {curr}</>, <></>);
		return (
			<React.Fragment>
				{formattedTraits}
			</React.Fragment>
		);
	}
};

type GroupTableProps = {
	node: SolverNode;
	data: FilteredGroup[];
};

const GroupTable = (props: GroupTableProps) => {
	const groupsContext = React.useContext(CrewGroupsContext);
	const { t } = React.useContext(GlobalContext).localized;
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
		{ column: 'traits', title: t('hints.traits'), width: hasNotes ? 6 : 8, center: true, reverse: true },
		{ column: 'notes', title: t('global.notes'), width: 2, center: true, reverse: true },
		{ column: 'crew', title: t('fbb.columns.crew'), width: 8, center: true, reverse: true }
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
								{row.notes.oneHandException && <Label style={{ background: '#ddd', color: '#333' }}>{t('fbb.crew_lists.customize.options.one_hand_exception')}</Label>}
								{row.notes.alphaException && <Label color='orange'>{t('fbb.crew_lists.customize.options.alpha_exception')}</Label>}
								{row.notes.uniqueCrew && <Label style={{ background: '#fdd26a', color: 'black' }}>{t('fbb.crew_lists.customize.options.unique')}</Label>}
								{row.notes.nonPortal && <Label style={{ background: '#000000', color: '#fdd26a' }}>{t('fbb.crew_lists.customize.options.non_portal')}</Label>}
								{row.notes.nonOptimal && <Label color='grey'>{t('fbb.crew_lists.customize.options.non_optimal')}</Label>}
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

	const [showCrew, setShowCrew] = React.useState<boolean>(false);

	const usable: string = groupsContext.optimizer.prefs.solo.usable;
	const crewList: BossCrew[] = props.crewList.filter(crew =>
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
			{crewList.length === 0 && (
				<Message>
					You have no {usable === 'thawed' ? 'unfrozen' : ''} crew with this group of traits. Change your availability user preference to see more options.
				</Message>
			)}
			{crewList.length > 0 && (
				<Grid doubling columns={3} textAlign='center'>
					{crewList.sort((a, b) => a.name.localeCompare(b.name)).map(crew =>
						<MarkCrew key={crew.symbol} crew={crew} trigger='card'
							solver={groupsContext.solver} optimizer={groupsContext.optimizer}
							solveNode={crewSolve} markAsTried={groupsContext.markAsTried}
						/>
					)}
				</Grid>
			)}
		</React.Fragment>
	);

	function crewSolve(nodeIndex: number, traits: string[]): void {
		groupsContext.solveNode(nodeIndex, traits, true);
	}
};

export default CrewGroups;
