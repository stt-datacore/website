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
			const open = openNodes.find(n => n.index === node.index);
			return {
				index: node.index,
				possible: node.traits.map(trait => { return { id: traitId++, trait: trait }; }),
				given: open.open_traits,
				needed: open.hidden_traits.length
			};
		});

		return (
			<Modal
				open={true}
				onClose={() => setModalIsOpen(false)}
				size='tiny'
			>
				<Modal.Header>
					Identify the traits solved by {crew.name}
				</Modal.Header>
				<Modal.Content scrolling>
					<Grid doubling columns={3} textAlign='center'>
						{nodes.map(node =>
							<Grid.Column key={node.index}>
								<Header as='h4' style={{ marginBottom: '0' }}>
									{node.given.map((trait, traitIndex) => (
										<span key={traitIndex}>
											{traitIndex > 0 ? <br /> : <></>}{traitIndex > 0 ? '+ ': ''}{allTraits.trait_names[trait]}
										</span>
									)).reduce((prev, curr) => [prev, curr], [])}
								</Header>
								<p>{node.needed} required:</p>
								{node.possible.map(trait => (
									<div key={trait.id} style={{ paddingBottom: '.5em' }}>
										<Label
											style={{ cursor: 'pointer' }}
											onClick={() => handleLabelClick(node.index, trait.id)}
										>
											{solvedTraits.includes(trait.id) && <Icon name='check' color='green' />}
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
			if (solvedTraits.includes(traitId)) {
				const solvedIndex = solvedTraits.indexOf(traitId);
				solvedTraits.splice(solvedIndex, 1);
				if (solvedTraits.length === 0) setSolvedNode(undefined);
				setSolvedTraits([...solvedTraits]);
				return;
			}
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
