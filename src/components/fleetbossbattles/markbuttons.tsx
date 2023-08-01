import React from 'react';
import { Header, Icon, Button, Popup, Modal, Grid, SemanticWIDTHS } from 'semantic-ui-react';

import { getStyleByRarity } from './fbbutils';

import ItemDisplay from '../itemdisplay';

import allTraits from '../../../static/structured/translation_en.json';
import { BossCrew, Optimizer, RarityStyle, Solver, SolverNode, SolverTrait } from '../../model/boss';
import { MergedContext } from '../../context/mergedcontext';
import { FinderContext } from './findercontext';

type MarkGroupProps = {
	node: SolverNode;
	traits: string[];
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

export const MarkGroup = (props: MarkGroupProps) => {
	const { node, traits } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [firstTrait, setFirstTrait] = React.useState('');

	React.useEffect(() => {
		if (!modalIsOpen) setFirstTrait('');
	}, [modalIsOpen]);

	const nodeRarities = props.optimizer.rarities[`node-${node.index}`];
	const comboRarity = nodeRarities.combos;
	const traitRarity = nodeRarities.traits;

	const GroupSolvePicker = () => {
		const solveOptions = comboRarity.filter(rarity => rarity.combo.includes(firstTrait) && rarity.crew.length > 0)
			.sort((a, b) => b.crew.length - a.crew.length)
			.map((rarity, idx) => {
				return {
					key: idx,
					value: rarity.combo,
					rarity: rarity.crew.length
				};
		});

		return (
			<Modal
				open={true}
				onClose={() => setModalIsOpen(false)}
				size='tiny'
			>
				<Modal.Header>
					Confirm the traits used to solve Node {node.index+1}
				</Modal.Header>
				<Modal.Content scrolling style={{ textAlign: 'center' }}>
					<Header as='h4'>
						{node.traitsKnown.map((trait, traitIndex) => (
							<span key={traitIndex}>
								{traitIndex > 0 ? ' + ': ''}{allTraits.trait_names[trait]}
							</span>
						)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
					</Header>
					{solveOptions.map(option => (
						<div key={option.key} style={{ paddingBottom: '.5em' }}>
							<SolveButton node={node}
								traits={option.value ?? []} rarity={option.rarity} onehand={true}
								traitData={props.solver.traits} solveNode={handleSolveClick}
							/>
						</div>
					)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
					<div style={{ marginTop: '2em' }}>
						<Header as='h4'>Partial Solve</Header>
						<SolveButton node={node}
							traits={[firstTrait, '?']} rarity={traitRarity[firstTrait]} onehand={false}
							traitData={props.solver.traits} solveNode={handleSolveClick}
						/>
					</div>
				</Modal.Content>
				<Modal.Actions>
					<Button onClick={() => setModalIsOpen(false)}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function handleSolveClick(nodeIndex: number, traits: string[]): void {
			props.solveNode(node.index, getUpdatedSolve(node, traits));
			setModalIsOpen(false);
		}
	};

	return (
		<React.Fragment>
			{(traits.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map(trait => (
				<SolveButton key={trait} node={node}
					traits={[trait]} rarity={traitRarity[trait]} onehand={false}
					traitData={props.solver.traits} solveNode={handleSingleTrait}
					compact={true}
				/>
			)) as JSX.Element[]).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
			{modalIsOpen && <GroupSolvePicker />}
		</React.Fragment>
	);

	function handleSingleTrait(nodeIndex: number, traits: string[]): void {
		const trait = traits[0];

		// Always auto-solve when only 1 trait required
		if (node.hiddenLeft === 1) {
			props.solveNode(node.index, getUpdatedSolve(node, [trait]));
			return;
		}

		// Otherwise show confirmation dialog
		setFirstTrait(trait);
		setModalIsOpen(true);
	}
};

type MarkCrewProps = {
	crew: BossCrew;
	trigger: string;
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

export const MarkCrew = (props: MarkCrewProps) => {
	const { crew, trigger } = props;

	const [showPicker, setShowPicker] = React.useState(false);
	const context = React.useContext(MergedContext);
	const groupsContext = React.useContext(FinderContext);

	return (
		<React.Fragment>
			{trigger === 'card' && renderCard()}
			{trigger === 'trial' && renderTrialButtons()}
			{showPicker &&
				<SolvePicker crew={crew} solver={props.solver} optimizer={props.optimizer}
					solveNode={props.solveNode} markAsTried={props.markAsTried} setModalIsOpen={setShowPicker}
				/>
			}
		</React.Fragment>
	);

	function renderCard(): JSX.Element {
		const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;

		return (
			<Grid.Column key={crew.symbol} textAlign='center'>
				<span style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => setShowPicker(true)}>
					<ItemDisplay
						crewSymbol={crew.symbol}
						targetGroup='fbb'
						allCrew={context.crew}
						playerData={context.playerData}
						setHoverItem={groupsContext.setHoverCrew}
						src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
						size={60}
						maxRarity={crew.max_rarity}
						rarity={crew.highest_owned_rarity ?? 0}
					/>
				</span>
				<div>
					<span style={{ cursor: 'pointer' }} onClick={() => setShowPicker(true)}>
						{crew.only_frozen && <Icon name='snowflake' />}
						<span style={{ fontStyle: crew.nodes_rarity > 1 ? 'italic' : 'normal' }}>
							{crew.name}
						</span>
					</span>
				</div>
			</Grid.Column>
		);
	}

	function renderTrialButtons(): JSX.Element {
		return (
			<Button.Group>
				<Popup
					content={`${crew.name} solved a node!`}
					mouseEnterDelay={500}
					hideOnScroll
					trigger={
						<Button icon compact onClick={() => trySolve()}>
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
		);
	}

	function trySolve(): void {
		// Always auto-solve when only 1 solution possible
		if (!crew.node_matches) return;
		if (Object.values(crew.node_matches).length === 1) {
			const match = Object.values(crew.node_matches)[0];
			const node = props.solver.nodes.find(n => n.index === match.index);
			if (node) {
				if (match.traits.length === node.hiddenLeft) {
					props.solveNode(node.index, getUpdatedSolve(node, match.traits));
					return;
				}
			}
		}
		setShowPicker(true);
	}
};

type SolvePickerProps = {
	crew: BossCrew;
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
	setModalIsOpen: (modalIsOpen: boolean) => void;
};

const SolvePicker = (props: SolvePickerProps) => {
	const { crew, setModalIsOpen } = props;

	const nodeMatches = Object.values(crew.node_matches);

	return (
		<Modal
			open={true}
			onClose={() => setModalIsOpen(false)}
			size={nodeMatches.length === 1 ? 'tiny' : 'small'}
		>
			<Modal.Header>
				Identify the traits solved by {crew.name}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderOptions()}
			</Modal.Content>
			<Modal.Actions>
				<Button icon='x' color='red' content='Mark as tried' onClick={() => handleTriedClick()} />
				<Button onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderOptions(): JSX.Element {
		let traitId = 0;
		const nodes = nodeMatches.map(node => {
			const open = props.solver.nodes.find(n => n.index === node.index);

			const comboRarities = props.optimizer.rarities[`node-${node.index}`].combos;
			const solveOptions = node.combos.map((combo, idx) => {
				const rarity = comboRarities.find(rarity => rarity.combo.every(trait => combo.includes(trait)));
				return {
					key: idx,
					value: combo,
					rarity: rarity ? rarity.crew.length : 0
				};
			}).sort((a, b) => b.rarity - a.rarity);

			return {
				...open,
				possible: node.traits.map(trait => { return { id: traitId++, trait: trait }; }),
				solveOptions
			};
		}) as SolverNode[];

		return (
			<Grid doubling columns={nodes.length as SemanticWIDTHS} textAlign='center'>
				{nodes.map(node => {
					return (
						<Grid.Column key={node.index}>
							<Header as='h4' style={{ marginBottom: '0' }}>
								{node.traitsKnown.map((trait, traitIndex) => (
									<span key={traitIndex}>
										{traitIndex > 0 ? ' + ': ''}{allTraits.trait_names[trait]}
									</span>
								)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
							</Header>
							<p>Node {node.index+1}</p>
							{node.solveOptions?.map(option => (
								<div key={option.key} style={{ paddingBottom: '.5em' }}>
									<SolveButton node={node}
										traits={option.value ?? []} rarity={option.rarity} onehand={true}
										traitData={props.solver.traits} solveNode={handleSolveClick}
									/>
								</div>
							)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
						</Grid.Column>
					);
				})}
			</Grid>
		);
	}

	function handleTriedClick(): void {
		props.markAsTried(crew.symbol);
		setModalIsOpen(false);
	}

	function handleSolveClick(nodeIndex: number, traits: string[]): void {
		const node = props.solver.nodes.find(n => n.index === nodeIndex);
		if (!node) return;
		props.solveNode(node.index, getUpdatedSolve(node, traits));
		setModalIsOpen(false);
	}
};

type SolveButtonProps = {
	node: SolverNode;
	traits: string[];
	rarity: number;
	onehand: boolean;
	traitData: SolverTrait[];
	compact?: boolean;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

const SolveButton = (props: SolveButtonProps) => {
	const { node, traits, rarity, onehand, traitData, compact } = props;

	const traitSort = (a: string, b: string) => {
		if (a === '?') return 1;
		if (b === '?') return -1;
		return allTraits.trait_names[a].localeCompare(allTraits.trait_names[b]);
	};

	return (
		<Button compact={compact} style={getTraitsStyle(rarity)} onClick={() => props.solveNode(node.index, traits)}>
			{onehand && rarity > 5 && <Icon name='hand paper' />}
			{renderTraits()}
		</Button>
	);

	function renderTraits(): JSX.Element {
		return (
			<React.Fragment>
				{traits.sort((a, b) => traitSort(a, b)).map((trait, idx) => (
					<span key={idx}>
						{trait === '?' ? '?' : getTraitName(trait)}
					</span>
				)).reduce((prev, curr, currIdx) => <>{prev} {currIdx > 0  ? ' + ' : ''} {curr}</>, <></>)}
			</React.Fragment>
		);
	}

	function getTraitName(trait: string): string {
		const instances = traitData.filter(t => t.trait === trait);
		if (instances.length === 1) return allTraits.trait_names[trait];
		const needed = instances.length - instances.filter(t => t.consumed).length;
		return `${allTraits.trait_names[trait]} (${needed})`;
	}

	function getTraitsStyle(rarity: number): RarityStyle {
		// Traits include alpha rule exception
		if (traits.filter(trait => trait !== '?' && trait.localeCompare(node.alphaTest, 'en') === -1).length > 0) {
			return {
				background: '#f2711c',
				color: 'white'
			};
		}
		return getStyleByRarity(rarity);
	}
};

const getUpdatedSolve = (node: SolverNode, traits: string[]) => {
	// Replace first remaining ? on partial solves
	if (node.solve.length > 1 && traits.length === 1) {
		const solve = node.solve.map(hiddenTrait => {
			if (hiddenTrait === '?') return traits[0];
			return hiddenTrait;
		});
		return solve;
	}
	return traits;
};
