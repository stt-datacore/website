import React from 'react';
import { Header, Icon, Button, Popup, Modal, Grid, Label } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type MarkCrewProps = {
	crew: any;
	openNodes: any[];
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

export const MarkCrew = (props: MarkCrewProps) => {
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
				...open,
				possible: node.traits.map(trait => { return { id: traitId++, trait: trait }; }),
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
									{node.traitsKnown.map((trait, traitIndex) => (
										<span key={traitIndex}>
											{traitIndex > 0 ? <br /> : <></>}{traitIndex > 0 ? '+ ': ''}{allTraits.trait_names[trait]}
										</span>
									)).reduce((prev, curr) => [prev, curr], [])}
								</Header>
								<p>{node.hiddenLeft} required:</p>
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
			const neededTraits = openNodes.find(node => node.index === nodeIndex).hiddenLeft;
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
			if (match.traits.length === openNodes.find(node => node.index === match.index).hiddenLeft)
				solvedNode = match;
		}
		if (solvedNode)
			props.solveNode(solvedNode.index, solvedNode.traits);
		else
			setModalIsOpen(true);
	}
};

type MarkGroupProps = {
	node: any;
	possibleCombos: any[];
	traits: string[];
	traitCounts: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

export const MarkGroup = (props: MarkGroupProps) => {
	const { node, possibleCombos, traits, traitCounts } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [firstTrait, setFirstTrait] = React.useState('');

	React.useEffect(() => {
		if (!modalIsOpen) setFirstTrait('');
	}, [modalIsOpen]);

	const SolvePicker = () => {
		const validCombos = possibleCombos.filter(combo => combo.includes(firstTrait));
		const validSolves = [];
		validCombos.forEach(combo => {
			if (combo.length === node.hiddenLeft && !validSolves.find(solve => solve.every(trait => combo.includes(trait)))) {
				validSolves.push(combo);
			}
			else if (combo.length > node.hiddenLeft) {
				for (let i = 0; i < combo.length; i++) {
					for (let j = i + 1; j < combo.length; j++) {
						const pair = [combo[i], combo[j]];
						if (pair.includes(firstTrait) && !validSolves.find(solve => solve.every(trait => pair.includes(trait))))
							validSolves.push(pair);
					}
				}
			}
		});

		const solveOptions = validSolves.map((combo, idx) => {
			return {
				key: idx,
				value: combo,
				text: combo.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map(trait => allTraits.trait_names[trait]).join(' + ')
			};
		});

		return (
			<Modal
				open={true}
				onClose={() => setModalIsOpen(false)}
				size='tiny'
			>
				<Modal.Header>
					Confirm the traits used to solve Node {node.index}
				</Modal.Header>
				<Modal.Content scrolling style={{ textAlign: 'center' }}>
					<Header as='h4'>
						{node.traitsKnown.map((trait, traitIndex) => (
							<span key={traitIndex}>
								{traitIndex > 0 ? <br /> : <></>}{traitIndex > 0 ? '+ ': ''}{allTraits.trait_names[trait]}
							</span>
						)).reduce((prev, curr) => [prev, curr], [])}
					</Header>
					{solveOptions.map(option => (
						<div key={option.key} style={{ paddingBottom: '.5em' }}>
							<Button onClick={() => handlePairClick(option.value)}>
								{option.text}
							</Button>
						</div>
					)).reduce((prev, curr) => [prev, curr], [])}
				</Modal.Content>
				<Modal.Actions>
					<Button onClick={() => setModalIsOpen(false)}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function handlePairClick(traits: string[]): void {
			props.solveNode(node.index, traits);
			setModalIsOpen(false);
		}
	};

	return (
		<React.Fragment>
			{traits.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
				<Button key={idx} compact style={colorize(trait)}
					onClick={() => handleFirstTrait(trait)}
				>
					{allTraits.trait_names[trait]}
				</Button>
			)).reduce((prev, curr) => [prev, ' ', curr], [])}
			{modalIsOpen && <SolvePicker />}
		</React.Fragment>
	);

	function colorize(trait: string): any {
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
	}

	function handleFirstTrait(trait: string): void {
		if (node.hiddenLeft === 1) {
			props.solveNode(node.index, [trait]);
			return;
		}

		const validCombos = possibleCombos.filter(combo => combo.includes(trait));
		if (validCombos.length === 1 && validCombos[0].length === node.hiddenLeft) {
			props.solveNode(node.index, validCombos[0]);
			return;
		}

		setFirstTrait(trait);
		setModalIsOpen(true);
	}
};
