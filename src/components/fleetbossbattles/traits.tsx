import React from 'react';
import { Header, Dropdown, Form, Table, Icon, Grid, Label, Message, Button, Popup } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type ChainTraitsProps = {
	chain: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
};

const ChainTraits = (props: ChainTraitsProps) => {
	return (
		<React.Fragment>
			<TraitsProgress chain={props.chain} spotter={props.spotter} updateSpotter={props.updateSpotter} />
			<TraitsPossible chain={props.chain} spotter={props.spotter} updateSpotter={props.updateSpotter} />
			<TraitsExporter chain={props.chain} />
		</React.Fragment>
	);
};

type TraitsProgressProps = {
	chain: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
};

const TraitsProgress = (props: TraitsProgressProps) => {
	const { chain, spotter } = props;

	const [traitOptions, setTraitOptions] = React.useState(undefined);

	React.useEffect(() => {
		const options = chain.traits.map((trait, traitIndex) => {
			return {
				key: traitIndex,
				value: trait,
				text: allTraits.trait_names[trait]
			};
		}).sort((a, b) => a.text.localeCompare(b.text));
		setTraitOptions([...options]);
	}, [chain.traits]);

	if (!traitOptions) return (<></>);

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Current Combo Chain</Header>
			<p>This table shows the progress of the current combo chain. Update the mystery traits when a node is solved.</p>
			<Table celled selectable striped unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Given Traits</Table.HeaderCell>
						<Table.HeaderCell>Mystery Traits</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{chain.nodes.map((node, nodeIndex) => renderRow(node, nodeIndex))}
				</Table.Body>
			</Table>
		</div>
	);

	function renderRow(node: any, nodeIndex: number): JSX.Element {
		let hiddenTraits = node.hidden_traits;
		if (hiddenTraits.includes('?')) {
			const solve = spotter.solves.find(solve => solve.node === nodeIndex);
			if (solve) hiddenTraits = solve.traits;
		}
		const nodeIsOpen = hiddenTraits.includes('?');

		return (
			<Table.Row key={nodeIndex}>
				<Table.Cell>
					{!nodeIsOpen && <Icon name='check' color='green' />}
					{node.open_traits.map(trait => allTraits.trait_names[trait]).join(' + ')}
				</Table.Cell>
				<Table.Cell>
					<Form>
						<Form.Group inline>
							{hiddenTraits.map((trait, traitIndex) =>
								<TraitPicker key={`${chain.id}-${nodeIndex}-${traitIndex}`}
									nodeIndex={nodeIndex} traitIndex={traitIndex}
									options={traitOptions}
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
		const solves = spotter.solves;
		let solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits[traitIndex] = newTrait !== '' ? newTrait : '?';
		}
		else {
			const hiddenTraits = chain.nodes[nodeIndex].hidden_traits.slice();
			hiddenTraits[traitIndex] = newTrait !== '' ? newTrait: '?';
			spotter.solves.push({ node: nodeIndex, traits: hiddenTraits });
		}
		props.updateSpotter({...spotter, solves});
	}
};

type TraitPickerProps = {
	nodeIndex: number;
	traitIndex: number;
	options: any[];
	trait: string;
	setTrait: (newTrait: string) => void;
};

const TraitPicker = (props: TraitPickerProps) => {
	const [activeTrait, setActiveTrait] = React.useState('?');

	React.useEffect(() => {
		setActiveTrait(props.trait);
	}, [props.trait]);

	return (
		<Form.Field>
			<Dropdown
				placeholder='?'
				clearable
				search
				selection
				options={props.options}
				value={activeTrait}
				onChange={(e, { value }) => onTraitChange(value)}
				closeOnChange
			/>
		</Form.Field>
	);
	function onTraitChange(newTrait: string): void {
		setActiveTrait(newTrait);
		props.setTrait(props.nodeIndex, props.traitIndex, newTrait);
	}
};

type TraitsPossibleProps = {
	chain: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
};

const TraitsPossible = (props: TraitsPossibleProps) => {
	const { chain, spotter } = props;

	const traitsConsumed = [];
	chain.nodes.forEach((node, nodeIndex) => {
		let hiddenTraits = node.hidden_traits;
		if (hiddenTraits.includes('?')) {
			const solve = spotter.solves.find(solve => solve.node === nodeIndex);
			if (solve) hiddenTraits = solve.traits;
		}
		const nodeIsOpen = hiddenTraits.includes('?');
		if (!nodeIsOpen) {
			hiddenTraits.forEach(trait => {
				if (trait !== '?') traitsConsumed.push(trait);
			});
		}
	});

	const traitList = [];
	chain.traits.forEach((trait, traitIndex) => {
		const instance = traitList.filter(t => t.trait === trait).length+1;
		traitList.push({
			id: traitIndex,
			trait,
			instance,
			consumed: traitsConsumed.filter(t => t === trait).length >= instance,
			name: allTraits.trait_names[trait]
		});
	});
	traitList.forEach(trait => {
		trait.count = traitList.filter(t => t.trait === trait.trait).length;
	});

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Traits</Header>
			<p>This table should match the list of possible traits in-game.</p>
			<Grid doubling columns={6} style={{ margin: '1em 0' }}>
				{traitList.map(trait =>
					<Grid.Column key={trait.id} style={{ textAlign: 'center', padding: '1px' }}>
						<Label size='large'>
							{trait.consumed && <Icon name='check' color='green' />}
							{trait.name}{trait.count > 1 ? ` (${trait.instance})`: ''}
						</Label>
					</Grid.Column>
				)}
			</Grid>
		</div>
	);
};

type TraitsExporterProps = {
	chain: any;
};

const TraitsExporter = (props: TraitsExporterProps) => {
	const { chain } = props;
	const { nodes, traits } = chain;

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
				if (m < node.open_traits.length)
					output += allTraits.trait_names[node.open_traits[m]];
				if (m == 0) output += '\n';
			}
			output += '\t\t' + node.hidden_traits.length + '\n';
		}
		output += '\n';
		traits.forEach(trait => {
			output += allTraits.trait_names[trait] + '\n';
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
