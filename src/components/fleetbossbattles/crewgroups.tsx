import React from 'react';
import { Segment, Message, Table, Label, Button, Icon, Grid } from 'semantic-ui-react';

import MarkButtons from './markbuttons';
import { isCrewOptimal, getComboIndex } from './fbbutils';

import ItemDisplay from '../itemdisplay';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import allTraits from '../../../static/structured/translation_en.json';

const ChainContext = React.createContext();

type CrewGroupsProps = {
	chainId: string;
	openNodes: any[];
	matchingCrew: any[];
	optimalCombos: any[];
	traitCounts: any[];
	crewFilters: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewGroups = (props: CrewGroupsProps) => {
	const { openNodes } = props;

	return (
		<ChainContext.Provider value={props}>
			{openNodes.map(node =>
				<NodeCombos key={node.index} node={node} traitCounts={props.traitCounts} />
			)}
		</ChainContext.Provider>
	);
};

const NodeCombos = (props) => {
	const chainData = React.useContext(ChainContext);
	const { node } = props;

	const formattedOpen = node.traitsKnown.map((trait, idx) => (
		<span key={idx}>
			{idx > 0 ? <> + </> : <></>}{allTraits.trait_names[trait]}
		</span>
	)).reduce((prev, curr) => [prev, curr], []);
	const hidden = Array(node.hiddenLeft).fill('?').join(' + ');

	const possibleCombos = [];
	const crewByNode = chainData.matchingCrew.filter(crew => !!crew.node_matches[`node-${node.index}`]);
	crewByNode.forEach(crew => {
		const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
		const exists = !!possibleCombos.find(combo =>
			combo.length === crewNodeTraits.length && combo.every(trait => crewNodeTraits.includes(trait))
		);
		if (!exists) possibleCombos.push(crewNodeTraits);
	});

	const traitCounts = props.traitCounts[`node-${node.index}`];

	const data = possibleCombos.map(combo => {
		const score = combo.reduce((prev, curr) => prev + traitCounts[curr], 0);

		const crewList = crewByNode.filter(crew =>
			combo.length === crew.node_matches[`node-${node.index}`].traits.length
			&& combo.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
			&& (chainData.crewFilters.usableFilter !== 'owned' || crew.highest_owned_rarity > 0)
			&& (chainData.crewFilters.usableFilter !== 'thawed' || !crew.only_frozen)
		);

		let exceptions = 0;
		combo.forEach(trait => { if (trait.localeCompare(node.alphaTest) < 0) exceptions++; });
		const alphaException = combo.length - exceptions < node.hiddenLeft;

		const nodeOptimalCombos = chainData.optimalCombos.filter(combos => combos.nodes.includes(node.index)).map(combos => combos.traits);
		const nonOptimal = getComboIndex(nodeOptimalCombos, combo) === -1;

		return {
			combo,
			score,
			crewList,
			alphaException,
			nonOptimal
		};
	}).filter(row => row.crewList.length > 0 && (!chainData.crewFilters.hideNonOptimals || !row.nonOptimal));

	return (
		<div style={{ marginBottom: '2em' }}>
			<Message>
				<Message.Header>{formattedOpen} + {hidden}</Message.Header>
			</Message>
			<ComboTable node={node} data={data} traitCounts={traitCounts} />
		</div>
	);
};

const ComboTable = (props) => {
	const chainData = React.useContext(ChainContext);
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

	const tableConfig = [
		{ column: 'traits', title: 'Traits', width: 6, center: true, reverse: true },
		{ column: 'notes', title: 'Notes', width: 2, center: true },
		{ column: 'crew', title: 'Crew', width: 8, center: true, reverse: true }
	];

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
				{data.map(row => (
					<Table.Row key={row.key}>
						<Table.Cell textAlign='center'>
							{renderTraits(row.combo, traitCounts)}
						</Table.Cell>
						<Table.Cell textAlign='center'>
							{row.alphaException && <Label color='orange'>Alpha exception</Label>}
							{row.nonOptimal && <Label color='grey'>Non-optimal</Label>}
						</Table.Cell>
						<Table.Cell>
							<Grid doubling columns={3} textAlign='center'>
								{renderCrew(row.crewList)}
							</Grid>
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
		if (column === 'traits') {
			data.sort((a, b) => {
				if (b.combo.length === a.combo.length) {
					if (b.crewList.length === a.crewList.length)
						return b.score - a.score;
					return b.crewList.length - a.crewList.length;
				}
				return b.combo.length - a.combo.length;
			});
			return;
		}
		else if (column === 'crew') {
			data.sort((a, b) => {
				if (b.crewList.length === a.crewList.length) {
					if (b.combo.length === a.combo.length)
						return b.score - a.score;
					return b.combo.length - a.combo.length;
				}
				return b.crewList.length - a.crewList.length;
			});
			return;
		}
		data.sort((a, b) => {
			if (reverse)
				return b[column] - a[column];
			return a[column] - b[column];
		});
	}

	function renderTraits(traits: string[], traitCounts: any): JSX.Element {
		const colorize = (trait: string) => {
			// Trait is alpha rule exception
			if (trait.localeCompare(node.alphaTest) === -1) {
				return {
					background: '#f2711c',
					color: 'white'
				};
			}
			let background = 'grey', color = 'white';
			if (traitCounts[trait] === 1) {
				background = '#fdd26a';
				color = 'black';
			}
			else if (traitCounts[trait] === 2) {
				background = '#aa2deb';
			}
			else if (traitCounts[trait] === 3) {
				background = '#5aaaff';
			}
			else if (traitCounts[trait] === 4) {
				background = '#50aa3c';
			}
			else if (traitCounts[trait] === 5) {
				background = '#9b9b9b';
			}
			return { background, color };
		};

		if (traits.length === 0) return (<></>);

		return (
			<React.Fragment>
				{traits.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
					<Label key={idx} style={colorize(trait)}>
						{allTraits.trait_names[trait]}
					</Label>
				)).reduce((prev, curr) => [prev, ' ', curr], [])}
			</React.Fragment>
		);
	}

	function renderCrew(crewList: any): JSX.Element {
		return (
			<React.Fragment>
				{crewList.sort((a, b) => a.name.localeCompare(b.name)).map(crew => <AssignmentCard key={crew.symbol} crew={crew} />)}
			</React.Fragment>
		);
	}
};

const AssignmentCard = (props) => {
	const { crew } = props;
	const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
	return (
		<Grid.Column key={crew.symbol} textAlign='center'>
			<ItemDisplay
				src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
				size={48}
				maxRarity={crew.max_rarity}
				rarity={crew.highest_owned_rarity}
			/>
			<div>
				{crew.only_frozen && <Icon name='snowflake' />}
				<span style={{ fontStyle: crew.nodes_rarity > 1 ? 'italic' : 'normal' }}>
					{crew.name}
				</span>
			</div>
		</Grid.Column>
	);
};

export default CrewGroups;
