import React from 'react';
import { Header, Dropdown, Form, Table, Icon } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type ComboNodesTableProps = {
	comboId: string;
	nodes: any[];
	traits: string[];
	updateNodes: (nodes: any[]) => void;
};

const ComboNodesTable = (props: ComboNodesTableProps) => {
	const { comboId, nodes } = props;

	const [traitOptions, setTraitOptions] = React.useState(undefined);

	React.useEffect(() => {
		const options = props.traits.map((trait, traitIndex) => {
			return {
				key: traitIndex,
				value: trait,
				text: allTraits.trait_names[trait]
			};
		}).sort((a, b) => a.text.localeCompare(b.text));
		setTraitOptions([...options]);
	}, [props.traits]);

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
					{nodes.map((node, nodeIndex) =>
						<Table.Row key={nodeIndex}>
							<Table.Cell>
								{!node.hidden_traits.includes('?') && <Icon name='check' color='green' />}
								{node.open_traits.map(trait => allTraits.trait_names[trait]).join(' + ')}
							</Table.Cell>
							<Table.Cell>
								<Form>
									<Form.Group inline>
										{node.hidden_traits.map((trait, traitIndex) =>
											<TraitPicker key={`${comboId}-${nodeIndex}-${traitIndex}`}
												nodeIndex={nodeIndex} traitIndex={traitIndex}
												options={traitOptions}
												trait={trait} setTrait={onTraitChange}
											/>
										)}
									</Form.Group>
								</Form>
							</Table.Cell>
						</Table.Row>
					)}
				</Table.Body>
			</Table>
		</div>
	);

	function onTraitChange(nodeIndex: number, traitIndex: number, newTrait: string): void {
		nodes[nodeIndex].hidden_traits[traitIndex] = newTrait !== '' ? newTrait : '?';
		props.updateNodes(nodes);
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

export default ComboNodesTable;
