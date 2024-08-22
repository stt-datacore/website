import React from 'react';
import { Header, Dropdown, Form, Table, Icon, Grid, Label, Message, Button, Popup } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';
import { SolveStatus, Solver, SolverNode, SolverTrait, Spotter, TraitOption } from '../../model/boss';

import { UserContext, SolverContext } from './context';

type ChainTraitsProps = {
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
};

const ChainTraits = (props: ChainTraitsProps) => {
	const { collaboration } = React.useContext(SolverContext);
	const { solver, spotter, updateSpotter } = props;

	return (
		<React.Fragment>
			<TraitsProgress solver={solver} solveNode={onNodeSolved} />
			<TraitsPossible solver={solver} />
			{!collaboration && <TraitsChecklist solver={solver} spotter={spotter} updateSpotter={updateSpotter} />}
			<TraitsExporter solver={solver} />
		</React.Fragment>
	);

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		const solves = spotter.solves;
		const solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
			solve.crew = [];
		}
		else {
			solves.push({ node: nodeIndex, traits, crew: [] });
		}
		updateSpotter({...spotter, solves});
	}
};

const traitNameInstance = (trait: SolverTrait) => {
	if (trait.poolCount > 1) return `${trait.name} (${trait.instance})`;
	return trait.name;
};

type TraitsProgressProps = {
	solver: Solver;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

const TraitsProgress = (props: TraitsProgressProps) => {
	const { spotterPrefs } = React.useContext(UserContext);
	const { collaboration } = React.useContext(SolverContext);
	const { solver } = props;

	const traitPool = solver.traits.filter(t => t.source === 'pool');

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Current Solutions</Header>
			<p>This table shows the progress of the current combo chain. Update the mystery traits when a node is solved.</p>
			<Table celled selectable striped unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Given Traits</Table.HeaderCell>
						<Table.HeaderCell>Mystery Traits</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{solver.nodes.map((node, nodeIndex) => renderRow(node, nodeIndex))}
				</Table.Body>
			</Table>
		</div>
	);

	function renderRow(node: SolverNode, nodeIndex: number): JSX.Element {
		const { givenTraitIds, solve } = node;
		const readonly = !!collaboration || (node.solveStatus === SolveStatus.Infallible);
		let checkIcon: JSX.Element | undefined = undefined;
		if (node.solveStatus === SolveStatus.Infallible)
			checkIcon = <Icon name='check' />;
		else if (node.solveStatus === SolveStatus.Confirmed || (!spotterPrefs.confirmSolves && node.solveStatus === SolveStatus.Unconfirmed))
			checkIcon = <Icon name='check' color='green' />;
		else if (node.solveStatus === SolveStatus.Unconfirmed)
			checkIcon = <Icon name='check circle' color='green' />;
		return (
			<Table.Row key={nodeIndex}>
				<Table.Cell>
					{checkIcon}
					{givenTraitIds.map(traitId => traitNameInstance(solver.traits[traitId])).join(' + ')}
				</Table.Cell>
				<Table.Cell>
					<Form>
						<Form.Group inline>
							{solve.map((trait, traitIndex) =>
								<TraitPicker key={`${solver.id}-${nodeIndex}-${traitIndex}`}
									nodeIndex={nodeIndex} traitIndex={traitIndex}
									traitPool={traitPool} readonly={readonly}
									trait={trait} setTrait={onTraitSolve}
								/>
							)}
						</Form.Group>
					</Form>
				</Table.Cell>
			</Table.Row>
		);
	}

	function onTraitSolve(nodeIndex: number, traitIndex: number, newTrait: string): void {
		const solve = solver.nodes[nodeIndex].solve;
		solve[traitIndex] = newTrait !== '' ? newTrait : '?';
		props.solveNode(nodeIndex, solve);
	}
};

type TraitPickerProps = {
	nodeIndex: number;
	traitIndex: number;
	traitPool: SolverTrait[];
	readonly: boolean;
	trait: string;
	setTrait: (nodeIndex: number, traitIndex: number, newTrait: string) => void;
};

const TraitPicker = (props: TraitPickerProps) => {
	const [activeTrait, setActiveTrait] = React.useState('?');

	React.useEffect(() => {
		setActiveTrait(props.trait);
	}, [props.trait]);

	const traitOptions: TraitOption[] = props.traitPool.filter(t => t.trait === activeTrait || (!props.readonly && !t.consumed))
		.map(t => {
			return {
				key: t.id,
				value: t.trait,
				text: t.name
			} as TraitOption;
		}).sort((a, b) => a.text.localeCompare(b.text));

	// Add ? as an option for unsolved nodes
	if (traitOptions.length > 1) {
		traitOptions.unshift({
			key: '?',
			value: '?',
			text: '?'
		});
	}

	return (
		<Form.Field>
			<Dropdown
				placeholder='?'
				clearable
				search
				selection
				options={traitOptions}
				value={activeTrait}
				onChange={(e, { value }) => onTraitChange(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
	function onTraitChange(newTrait: string): void {
		if (props.readonly) return;
		setActiveTrait(newTrait);
		props.setTrait(props.nodeIndex, props.traitIndex, newTrait);
	}
};

type TraitsPossibleProps = {
	solver: Solver;
};

const TraitsPossible = (props: TraitsPossibleProps) => {
	const { solver } = props;

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Traits</Header>
			<p>This table should match the list of possible traits in-game.</p>
			<Grid doubling columns={6} style={{ margin: '1em 0' }}>
				{solver.traits.filter(t => t.source === 'pool').map(t =>
					<Grid.Column key={t.id} style={{ textAlign: 'center', padding: '1px' }}>
						<Label size='large'>
							{t.consumed && <Icon name='check' color='green' />}
							{traitNameInstance(t)}
						</Label>
					</Grid.Column>
				)}
			</Grid>
		</div>
	);
};

type TraitsChecklistProps = {
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
};

const TraitsChecklist = (props: TraitsChecklistProps) => {
	const { solver, spotter, updateSpotter } = props;

	const traits = [] as string[];
	solver.traits.forEach(t => {
		if (!traits.includes(t.trait)) traits.push(t.trait);
	});
	const traitOptions = traits.map(trait => {
			return {
				key: trait,
				value: trait,
				text: allTraits.trait_names[trait]
			} as TraitOption;
		}).sort((a, b) => a.text.localeCompare(b.text));

	return (
		<div style={{ margin: '2em 0' }}>
			You can manually exclude traits from consideration.
			<Form.Field
				placeholder='Search for traits'
				control={Dropdown}
				clearable
				fluid
				multiple
				search
				selection
				options={traitOptions}
				value={spotter.ignoredTraits}
				onChange={(e, { value }) => updateSpotter({...spotter, ignoredTraits: value as string[]})}
			/>
		</div>
	);
};

type TraitsExporterProps = {
	solver: Solver;
};

const TraitsExporter = (props: TraitsExporterProps) => {
	const { solver } = props;
	const { nodes, traits } = solver;

	const CABLink = 'https://docs.google.com/spreadsheets/d/1aGdAhgDJqknJKz-im4jxASxcE-cmVL8w2FQEKxpK4Uw/edit#gid=631453914';
	const CABVer = '3.02';

	const copyTraits = () => {
		let output = '';
		for (let n = 0; n < 6; n++) {
			if (n >= nodes.length) {
				output += '\n\n';
				continue;
			}
			const node = nodes[n];
			for (let m = 0; m < 2; m++) {
				if (m < node.givenTraitIds.length)
					output += traits[node.givenTraitIds[m]].name;
				if (m == 0) output += '\n';
			}
			output += '\t\t' + node.solve.length + '\n';
		}
		output += '\n';
		traits.filter(t => t.source === 'pool').forEach(t => {
			output += t.name + '\n';
		});
		navigator.clipboard.writeText(output);
	};

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>CAB's FBB Combo Chain Helper</Message.Header>
				<p>The <b><a href={CABLink} target='_blank'>FBB Combo Chain Helper</a></b> is another tool that can help you and your fleet coordinate attacks in a Fleet Boss Battle. Click the button below to copy the known traits and the list of possible traits for use with this Google Sheet (currently v{CABVer}).</p>
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content='Copy traits to clipboard' onClick={() => copyTraits()} />
					}
				/>
			</Message.Content>
		</Message>
	);
};

export default ChainTraits;
