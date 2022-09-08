import React from 'react';
import { Header, Icon, Button, Popup, Modal, Grid, Label } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type MarkButtonProps = {
	crew: any;
	openNodes: any[];
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const MarkButtons = (props: MarkButtonProps) => {
	const { crew, openNodes } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	const SolvePicker = () => {
		const [solvedNode, setSolvedNode] = React.useState(undefined);
		const [solvedTraits, setSolvedTraits] = React.useState([]);

		React.useEffect(() => {
			if (!modalIsOpen) {
				setSolvedNode(undefined);
				setSolvedTraits([]);
			}
		}, [modalIsOpen]);

		let traitId = 0;
		const nodes = Object.values(crew.node_matches).map(node => {
			return {
				index: node.index,
				possible: node.traits.map(trait => { return { id: traitId++, trait: trait }; }),
				given: openNodes.find(n => n.index === node.index).open_traits
			};
		});

		return (
			<Modal
				open={true}
				onClose={() => setModalIsOpen(false)}
				size='tiny'
			>
				<Modal.Header>
					Click the correct traits for {crew.name}
				</Modal.Header>
				<Modal.Content scrolling>
					<Grid doubling columns={3} textAlign='center'>
						{nodes.map(node =>
							<Grid.Column key={node.index}>
								<Header as='h4' style={{ marginBottom: '1em' }}>
									{node.given.map((trait, traitIndex) => (
										<span key={traitIndex}>
											{traitIndex > 0 ? <br /> : <></>}{traitIndex > 0 ? '+ ': ''}{allTraits.trait_names[trait]}
										</span>
									)).reduce((prev, curr) => [prev, curr], [])}
								</Header>
								{node.possible.map(trait => (
									<div key={trait.id} style={{ paddingBottom: '.5em' }}>
										<Label
											style={{ background: solvedTraits.includes(trait.id) ? 'green' : undefined, cursor: 'pointer' }}
											onClick={() => handleLabelClick(node.index, trait.id)}
										>
											{allTraits.trait_names[trait.trait]}
										</Label>
									</div>
								)).reduce((prev, curr) => [prev, curr], [])}
							</Grid.Column>
						)}
					</Grid>
				</Modal.Content>
				<Modal.Actions>
					<Button onClick={() => setModalIsOpen(false)}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function handleLabelClick(nodeIndex: number, traitId: number): void {
			const newTraits = solvedNode === nodeIndex ? solvedTraits : [];
			newTraits.push(traitId);
			const neededTraits = openNodes.find(node => node.index === nodeIndex).hidden_traits.length;
			if (newTraits.length === neededTraits) {
				const traits = newTraits.map(traitId =>
					nodes.find(node => node.index === nodeIndex).possible.find(p => p.id === traitId).trait
				);
				props.solveNode(nodeIndex, traits);
				setModalIsOpen(false);
			}
			else {
				setSolvedNode(nodeIndex);
				setSolvedTraits([...newTraits]);
			}
		}
	};

	return (
		<React.Fragment>
			<Button.Group>
				<Popup
					content={`${crew.name} solved a node!`}
					mouseEnterDelay={500}
					hideOnScroll
					trigger={
						<Button icon compact onClick={() => handleSolveClick()}>
							<Icon name='check' color='green' />
						</Button>
					}
				/>
				<Popup
					content={`Mark as tried`}
					mouseEnterDelay={500}
					hideOnScroll
					trigger={
						<Button icon compact onClick={() => props.markAsTried(crew.symbol)}>
							<Icon name='x' color='red' />
						</Button>
					}
				/>
			</Button.Group>
			{modalIsOpen && <SolvePicker />}
		</React.Fragment>
	);

	function handleSolveClick(): void {
		let solvedNode = false;
		if (Object.values(crew.node_matches).length === 1) {
			const match = Object.values(crew.node_matches)[0];
			if (match.traits.length === openNodes.find(node => node.index === match.index).hidden_traits.length)
				solvedNode = match;
		}
		if (solvedNode)
			props.solveNode(solvedNode.index, solvedNode.traits);
		else
			setModalIsOpen(true);
	}
};

export default MarkButtons;
