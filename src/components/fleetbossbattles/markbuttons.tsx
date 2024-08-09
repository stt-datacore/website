import React from 'react';
import { Header, Icon, Button, Popup, Modal, Grid, Label, SemanticWIDTHS } from 'semantic-ui-react';

import { ListedTraits } from './listedtraits';
import { getStyleByRarity, suppressDuplicateTraits } from './fbbutils';

import ItemDisplay from '../itemdisplay';

import { BossCrew, NodeMatch, NodeRarity, Optimizer, PossibleCombo, RarityStyle, SolveStatus, Solver, SolverNode, SolverTrait, TraitRarities } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';
import { TinyShipSkill } from '../item_presenters/shipskill';

interface ISolveOption {
	key: number;
	value: string[];
	rarity: number;
};

type MarkGroupProps = {
	node: SolverNode;
	traits: string[];
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

export const MarkGroup = (props: MarkGroupProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, TRAIT_NAMES } = globalContext.localized;
	const { node, traits } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [firstTrait, setFirstTrait] = React.useState('');

	React.useEffect(() => {
		if (!modalIsOpen) setFirstTrait('');
	}, [modalIsOpen]);

	const nodeRarities: NodeRarity = props.optimizer.rarities[`node-${node.index}`];
	const comboRarity: PossibleCombo[] = nodeRarities.combos;
	const traitRarity: TraitRarities = nodeRarities.traits;

	let traitData: SolverTrait[] = props.solver.traits;

	// When solve is unconfirmed, rewrite traitData to ignore duplicates
	if (node.solveStatus === SolveStatus.Unconfirmed)
		traitData = suppressDuplicateTraits(traitData, traits);

	const GroupSolveOptions = (): JSX.Element => {
		const solveOptions: ISolveOption[] = comboRarity.filter(rarity =>
			(firstTrait === '' || rarity.combo.includes(firstTrait)) && rarity.crew.length > 0
		).sort((a, b) => b.crew.length - a.crew.length)
			.map((rarity, idx) => {
				return {
					key: idx,
					value: rarity.combo,
					rarity: rarity.crew.length
				};
			});

		return (
			<React.Fragment>
				{solveOptions.map(option => (
					<div key={option.key} style={{ marginBottom: '.5em' }}>
						<SolveButton node={node}
							traits={option.value ?? []} rarity={option.rarity} onehand={node.oneHandTest}
							traitData={traitData} solveNode={handleSolveClick}
						/>
					</div>
				)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
			</React.Fragment>
		);
	};

	const GroupSolvePicker = (): JSX.Element => {
		return (
			<Modal
				open={true}
				onClose={() => setModalIsOpen(false)}
				size='tiny'
			>
				<Modal.Header>
					{t('fbb.identify_solve_n', { n: `${node.index+1}`})}
					Identify the traits used to solve Node {node.index+1}
				</Modal.Header>
				<Modal.Content scrolling style={{ textAlign: 'center' }}>
					<Header as='h4'>
						{node.traitsKnown.map((trait, traitIndex) => (
							<span key={traitIndex}>
								{traitIndex > 0 ? ' + ': ''}{TRAIT_NAMES[trait]}
							</span>
						)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
					</Header>
					<GroupSolveOptions />
					<div style={{ marginTop: '2em' }}>
						<Header as='h4'>{t('fbb.partial_solve')}</Header>
						<SolveButton node={node}
							traits={[firstTrait, '?']} rarity={traitRarity[firstTrait]} onehand={false}
							traitData={props.solver.traits} solveNode={handleSolveClick}
						/>
					</div>
				</Modal.Content>
				<Modal.Actions>
					<TipsPopup />
					<Button onClick={() => setModalIsOpen(false)}>
						{t('global.close')}
					</Button>
				</Modal.Actions>
			</Modal>
		);
	};

	// When solve is unconfirmed, show solved traits and allow for single-click confirmation
	if (node.solveStatus === SolveStatus.Unconfirmed)
		return <GroupSolveOptions />;

	return (
		<React.Fragment>
			{(traits.sort((a, b) => TRAIT_NAMES[a].localeCompare(TRAIT_NAMES[b])).map(trait => (
				<SolveButton key={trait} node={node}
					traits={[trait]} rarity={traitRarity[trait]} onehand={false}
					traitData={props.solver.traits} solveNode={handleSingleTrait}
					compact={true}
				/>
			)) as JSX.Element[]).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
			{modalIsOpen && <GroupSolvePicker />}
		</React.Fragment>
	);

	function handleSolveClick(_nodeIndex: number, traits: string[]): void {
		props.solveNode(node.index, getUpdatedSolve(node, traits));
		setModalIsOpen(false);
	}

	function handleSingleTrait(_nodeIndex: number, traits: string[]): void {
		const trait: string = traits[0];

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
	const { t, tfmt } = React.useContext(GlobalContext).localized;

	const [showPicker, setShowPicker] = React.useState<boolean>(false);

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
		const imageUrlPortrait: string = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;

		return (
			<Grid.Column key={crew.symbol} textAlign='center'>
				<span style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => trySolve(false)}>
					<ItemDisplay
						src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
						size={60}
						maxRarity={crew.max_rarity}
						rarity={crew.highest_owned_rarity ?? 0}
					/>
				</span>
				<div>
					<span style={{ cursor: 'pointer' }} onClick={() => trySolve(false)}>
						{crew.only_frozen && <Icon name='snowflake' />}
						{crew.only_expiring && <Icon name='warning sign' />}
						<span style={{ fontStyle: crew.nodes_rarity > 1 ? 'italic' : 'normal' }}>
							{crew.name}
						</span>
						{props.optimizer.prefs.solo.shipAbility === 'show' && (
							<React.Fragment>
								<br /><TinyShipSkill crew={crew} />
							</React.Fragment>
						)}
					</span>
				</div>
			</Grid.Column>
		);
	}

	function renderTrialButtons(): JSX.Element {
		return (
			<Button.Group>
				<Popup
					content={t('fbb.popup.crew_solved', { crew: `${crew.name}`})}
					mouseEnterDelay={500}
					hideOnScroll
					trigger={
						<Button icon compact onClick={() => trySolve(true)}>
							<Icon name='check' color='green' />
						</Button>
					}
				/>
				<Popup
					content={t('fbb.popup.mark_as_tried')}
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

	function trySolve(autoSolve: boolean): void {
		if (!crew.node_matches) return;
		if (Object.values(crew.node_matches).length === 1) {
			const match: NodeMatch = Object.values(crew.node_matches)[0];
			const node: SolverNode | undefined = props.solver.nodes.find(n => n.index === match.index);
			if (node) {
				// Always auto-solve when only 1 solution possible and solve is unconfirmed
				if (node.solveStatus === SolveStatus.Unconfirmed) {
					props.solveNode(node.index, node.solve);
					return;
				}
				// Auto-solve when only 1 solution possible and permitted from trigger
				else if (autoSolve && match.traits.length === node.hiddenLeft) {
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
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { crew, setModalIsOpen } = props;

	const nodeMatches = Object.values(crew.node_matches);

	return (
		<Modal
			open={true}
			onClose={() => setModalIsOpen(false)}
			size={nodeMatches.length === 1 ? 'tiny' : 'small'}
		>
			<Modal.Header>
				Confirm the traits solved by {crew.name}
			</Modal.Header>
			<Modal.Content scrolling>
				{renderOptions()}
			</Modal.Content>
			<Modal.Actions>
				<TipsPopup />
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
										{traitIndex > 0 ? ' + ': ''}{TRAIT_NAMES[trait]}
									</span>
								)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
							</Header>
							<p>Node {node.index+1}</p>
							{node.solveOptions?.map(option => (
								<div key={option.key} style={{ marginBottom: '.5em' }}>
									<SolveButton node={node}
										traits={option.value ?? []} rarity={option.rarity} onehand={node.oneHandTest}
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

	return (
		<Button compact={compact} style={getTraitsStyle(rarity)} onClick={() => props.solveNode(node.index, traits)}>
			<div style={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'nowrap',
				gap: '.5em'
			}}>
				{onehand && rarity > 5 && <Icon name='hand paper' />}
				<ListedTraits traits={traits} traitData={traitData} />
			</div>
		</Button>
	);

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

const TipsPopup = () => {
	return (
		<Popup
			content={renderContent()}
			trigger={
				<span>
					Tips
					<Icon name='question' />
				</span>
			}
		/>
	);

	function renderContent(): JSX.Element {
		return (
			<React.Fragment>
				<p>Colors help visualize the rarity of each possible solution for this node:</p>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center'
				}}>
					{[6, 5, 4, 3, 2].map(rarity => renderLabel(rarity))}
				</div>
			</React.Fragment>
		);
	}

	function renderLabel(rarity: number): JSX.Element {
		const rarityStyle = getStyleByRarity(rarity);
		const rarityNumber = rarity > 5 ? '6+' : rarity;
		return (
			<Label key={rarity} style={{...rarityStyle, marginBottom: '.5em', textAlign: 'center'}}>
				{rarityNumber} in-portal crew share this solution.
			</Label>
		);
	}
};
