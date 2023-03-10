import React from 'react';
import { InView } from 'react-intersection-observer';
import { Message, Table, Label, Button, Icon, Grid } from 'semantic-ui-react';

import { CrewNodeExporter } from './crewexporter';
import { MarkGroup } from './markbuttons';
import { filterCombosByNode } from './fbbutils';

import ItemDisplay from '../itemdisplay';

import allTraits from '../../../static/structured/translation_en.json';

const FinderContext = React.createContext();

type CrewGroupsProps = {
	chainId: string;
	openNodes: any[];
	allMatchingCrew: any[];
	matchingCrew: any[];
	optimalCombos: any[];
	traitCounts: any[];
	crewFilters: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
	dbid: string;
	exportPrefs: any;
};

const CrewGroups = (props: CrewGroupsProps) => {
	const { openNodes } = props;

	return (
		<FinderContext.Provider value={props}>
			<p>Tap a trait if it solves a node. Tap a crew to mark as tried.</p>
			{openNodes.map(node =>
				<NodeCombos key={node.index} node={node} />
			)}
		</FinderContext.Provider>
	);
};

type NodeCombosProps = {
	node: any;
};

const NodeCombos = (props: NodeCombosProps) => {
	const finderData = React.useContext(FinderContext);
	const { node } = props;

	const formattedOpen = node.traitsKnown.map((trait, idx) => (
		<span key={idx}>
			{idx > 0 ? <> + </> : <></>}{allTraits.trait_names[trait]}
		</span>
	)).reduce((prev, curr) => [prev, curr], []);
	const hidden = Array(node.hiddenLeft).fill('?').join(' + ');

	const traitCounts = finderData.traitCounts[`node-${node.index}`];
	const data = filterCombosByNode(node, finderData.matchingCrew, finderData.optimalCombos, traitCounts, finderData.crewFilters);

	return (
		<div style={{ marginBottom: '2em' }}>
			<Message>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<div>
						<Message.Header>{formattedOpen} + {hidden}</Message.Header>
						<p>Node {node.index+1}</p>
					</div>
					<div>
						<CrewNodeExporter
							node={node} allMatchingCrew={finderData.allMatchingCrew}
							dbid={finderData.dbid} exportPrefs={finderData.exportPrefs}
						/>
					</div>
				</div>
			</Message>
			{data.length === 0 &&
				<Message>
					No possible solutions found for this node. You may need to change your filter settings or reset the list of attempted crew.
				</Message>
			}
			{data.length > 0 && <ComboTable data={data} node={node} traitCounts={traitCounts} />}
		</div>
	);
};

type ComboTableProps = {
	data: any[];
	node: any;
	traitCounts: any;
};

const ComboTable = (props: ComboTableProps) => {
	const finderData = React.useContext(FinderContext);
	const { node, traitCounts } = props;

	const [state, dispatch] = React.useReducer(reducer, {
		data: props.data,
		column: null,
		direction: null
	});
	const { data, column, direction } = state;

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: props.data });
	}, [props.data]);

	const hasNotes = data.filter(row => row.alphaException || row.nonOptimal).length > 0;
	const possibleCombos = data.map(row => row.combo);

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
							width={cell.width} textAlign={cell.center ? 'center' : 'left'}
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
							<MarkGroup node={node} possibleCombos={possibleCombos} traits={row.combo} traitCounts={traitCounts} solveNode={finderData.solveNode} />
						</Table.Cell>
						{hasNotes &&
							<Table.Cell textAlign='center'>
								{row.alphaException && <Label color='orange'>Alpha exception</Label>}
								{row.nonOptimal && <Label color='grey'>Non-optimal</Label>}
							</Table.Cell>
						}
						<Table.Cell>
							<ComboCrew crewList={row.crewList} />
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

	function firstSort(data: any[], column: string, reverse: boolean = false): any[] {
		const sortBy = (comps) => {
			data.sort((a, b) => {
				const tests = comps.slice();
				let test = 0;
				while (tests.length > 0 && test === 0) {
					test = tests.shift()(a, b);
				}
				return test;
			});
		};
		const compareTraits = (a, b) => b.combo.length - a.combo.length;
		const compareCrew = (a, b) => b.crewList.length - a.crewList.length;
		const compareScore = (a, b) => b.score - a.score;
		const compareNotes = (a, b) => {
			const aScore = a.alphaException || a.nonOptimal ? 1 : 0;
			const bScore = b.alphaException || b.nonOptimal ? 1 : 0;
			return bScore - aScore;
		};
		const compareNotesAsc = (a, b) => {
			const aScore = a.alphaException || a.nonOptimal ? 1 : 0;
			const bScore = b.alphaException || b.nonOptimal ? 1 : 0;
			return aScore - bScore;
		};

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

type ComboCrewProps = {
	crewList: any[];
};

const ComboCrew = (props: ComboCrewProps) => {
	const { crewList } = props;

	const [showCrew, setShowCrew] = React.useState(false);

	return (
		<React.Fragment>
			{!showCrew &&
				<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
					onChange={(inView, entry) => { if (inView) setShowCrew(true); }}
				>
					<Icon loading name='spinner' />
					<br />Loading...
				</InView>
			}
			{showCrew &&
				<Grid doubling columns={3} textAlign='center'>
					{crewList.sort((a, b) => a.name.localeCompare(b.name)).map(crew =>
						<CrewCard key={crew.symbol} crew={crew} />
					)}
				</Grid>
			}
		</React.Fragment>
	);
};

type CrewCardProps = {
	crew: any;
};

const CrewCard = (props: CrewCardProps) => {
	const finderData = React.useContext(FinderContext);
	const { crew } = props;

	const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;

	return (
		<Grid.Column key={crew.symbol} textAlign='center'>
			<span style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => finderData.markAsTried(crew.symbol)}>
				<ItemDisplay
					src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
					size={48}
					maxRarity={crew.max_rarity}
					rarity={crew.highest_owned_rarity}
				/>
			</span>
			<div>
				<span style={{ cursor: 'pointer' }} onClick={() => finderData.markAsTried(crew.symbol)}>
					{crew.only_frozen && <Icon name='snowflake' />}
					<span style={{ fontStyle: crew.nodes_rarity > 1 ? 'italic' : 'normal' }}>
						{crew.name}
					</span>
				</span>
			</div>
		</Grid.Column>
	);
};

export default CrewGroups;
