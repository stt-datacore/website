import React from 'react';
import { Header, Dropdown, Form, Table, Icon, Grid, Label, Message, Button, Popup } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type ChainTraitsProps = {
	solver: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
};

const ChainTraits = (props: ChainTraitsProps) => {
	const { solver, spotter, updateSpotter } = props;

	return (
		<React.Fragment>
			<TraitsProgress solver={solver} solveNode={onNodeSolved} />
			<TraitsPossible solver={solver} />
			<TraitsChecklist solver={solver} spotter={spotter} updateSpotter={updateSpotter} />
			<TraitsExporter solver={solver} />
		</React.Fragment>
	);

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		const solves = spotter.solves;
		let solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
		}
		else {
			solve = solver.nodes[nodeIndex].solve;
			spotter.solves.push({ node: nodeIndex, traits });
		}
		updateSpotter({...spotter, solves: spotter.solves});
	}
};

const traitNameInstance = (trait: any) => {
	if (trait.poolCount > 1) return `${trait.name} (${trait.instance})`;
	return trait.name;
};

type TraitsProgressProps = {
	solver: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

const TraitsProgress = (props: TraitsProgressProps) => {
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

	function renderRow(node: any, nodeIndex: number): JSX.Element {
		const { givenTraitIds, solve } = node;

		return (
			<Table.Row key={nodeIndex}>
				<Table.Cell>
					{!node.open && <Icon name='check' color='green' />}
					{givenTraitIds.map(traitId => traitNameInstance(solver.traits[traitId])).join(' + ')}
				</Table.Cell>
				<Table.Cell>
					<Form>
						<Form.Group inline>
							{solve.map((trait, traitIndex) =>
								<TraitPicker key={`${solver.id}-${nodeIndex}-${traitIndex}`}
									nodeIndex={nodeIndex} traitIndex={traitIndex}
									traitPool={traitPool} readonly={!node.open && !node.spotSolve}
									trait={trait} setTrait={onTraitChange}
								/>
							)}
						</Form.Group>
					</Form>
				</Table.Cell>
			</Table.Row>
		);
	}

	function onTraitChange(nodeIndex: number, traitIndex: number, newTrait: string): void {
		const solve = solver.nodes[nodeIndex].solve;
		solve[traitIndex] = newTrait !== '' ? newTrait : '?';
		props.solveNode(nodeIndex, solve);
	}
};

type TraitPickerProps = {
	nodeIndex: number;
	traitIndex: number;
	traitPool: any[];
	readonly: boolean;
	trait: string;
	setTrait: (newTrait: string) => void;
};

const TraitPicker = (props: TraitPickerProps) => {
	const [activeTrait, setActiveTrait] = React.useState('?');

	React.useEffect(() => {
		setActiveTrait(props.trait);
	}, [props.trait]);

	const traitOptions = props.traitPool.filter(t => t.trait === activeTrait || (!props.readonly && !t.consumed))
		.map(t => {
			return {
				key: t.id,
				value: t.trait,
				text: t.name
			};
		}).sort((a, b) => a.text.localeCompare(b.text));

	return (
		<Form.Field>
			<Dropdown
				placeholder='?'
				clearable
				search
				selection
				options={traitOptions}
				value={activeTrait}
				onChange={(e, { value }) => onTraitChange(value)}
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
	solver: any;
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
	solver: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
};

const TraitsChecklist = (props: TraitsChecklistProps) => {
	const { solver, spotter, updateSpotter } = props;

	const traits = [];
	solver.traits.forEach(t => {
		if (!traits.includes(t.trait)) traits.push(t.trait);
	});
	const traitOptions = traits.map(trait => {
			return {
				key: trait,
				value: trait,
				text: allTraits.trait_names[trait]
			};
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
				onChange={(e, { value }) => updateSpotter({...spotter, ignoredTraits: value})}
			/>
		</div>
	);
};

type TraitsExporterProps = {
	solver: any;
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
			output += '\t\t' + node.solvedTraitIds.length + '\n';
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
