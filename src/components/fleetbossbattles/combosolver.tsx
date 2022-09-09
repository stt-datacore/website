import React from 'react';
import { Step, Icon, Message } from 'semantic-ui-react';

import ComboNodesTable from './combonodestable';
import ComboPossibleTraits from './combopossibletraits';
import ComboCrewTable from './combocrewtable';
import ComboChecklist from './combochecklist';
import { ExportTraits, ExportCrewLists } from './exporter';

const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

type ComboSolverProps = {
	allCrew: string[];
	combo: any;
};

const ComboSolver = (props: ComboSolverProps) => {
	const [activeStep, setActiveStep] = React.useState('crew');
	const [combo, setCombo] = React.useState(undefined);
	const [openNodes, setOpenNodes] = React.useState([]);
	const [traitPool, setTraitPool] = React.useState([]);
	const [allMatchingCrew, setAllMatchingCrew] = React.useState([]);
	const [optimalCombos, setOptimalCombos] = React.useState([]);
	const [attemptedCrew, setAttemptedCrew] = React.useState([]);

	React.useEffect(() => {
		if (props.combo) {
			setCombo({...props.combo});
			if (combo && combo.id !== props.combo.id) setAttemptedCrew([]);
		}
	}, [props.combo]);

	React.useEffect(() => {
		if (!combo) return;

		// The trait pool consists of only possible hidden_traits, not open_traits
		const traits = {};
		combo.traits.forEach(trait => {
			if (!traits[trait]) traits[trait] = { listed: 0, consumed: 0 };
			traits[trait].listed++;
		});

		const openNodes = [];
		let current = false;
		combo.nodes.forEach((node, nodeIndex) => {
			const nodeIsOpen = node.hidden_traits.includes('?');
			if (nodeIsOpen) {
				openNodes.push({...node, comboId: combo.id, index: nodeIndex});
			}
			else {
				node.hidden_traits.forEach(trait => {
					if (trait !== '?') traits[trait].consumed++;
				});
			}
			// You have already solved a node for this chain; not used yet
			if (node.unlocked_character?.is_current) current = true;
		});

		const traitPool = [];
		combo.traits.forEach(trait => {
			if (!traitPool.includes(trait) && traits[trait].consumed < traits[trait].listed)
				traitPool.push(trait);
		});

		setOpenNodes([...openNodes]);
		setTraitPool([...traitPool]);
	}, [combo]);

	React.useEffect(() => {
		if (!combo) return;

		const ignoredCombos = [];
		attemptedCrew.forEach(attempt => {
			const crew = props.allCrew.find(ac => ac.symbol === attempt);
			openNodes.forEach(node => {
				if (node.open_traits.every(trait => crew.traits.includes(trait))) {
					const nodePool = traitPool.filter(trait => !node.open_traits.includes(trait));
					const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
					if (traitsMatched.length >= node.hidden_traits.length) {
						ignoredCombos.push({ index: node.index, traits: traitsMatched });
					}
				}
			});
		});

		const allMatchingCrew = [];
		const allTraitCombos = [];
		props.allCrew.forEach(crew => {
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[combo.difficultyId]) {
				let nodeCoverage = 0;
				const matchesByNode = {};
				openNodes.forEach(node => {
					// Crew must have every open trait
					if (node.open_traits.every(trait => crew.traits.includes(trait))) {
						const nodePool = traitPool.filter(trait => !node.open_traits.includes(trait));
						const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
						// Crew must have at least the same number of matching traits as hidden traits
						if (traitsMatched.length >= node.hidden_traits.length) {
							const shouldIgnore = !!ignoredCombos.find(ignored =>
								ignored.index === node.index && traitsMatched.every(trait =>
									ignored.traits.includes(trait)
								)
							);
							if (!shouldIgnore) {
								matchesByNode[`node-${node.index}`] = { index: node.index, traits: traitsMatched };
								nodeCoverage++;
								if (crew.in_portal) {
									const existing = allTraitCombos.find(combo =>
										combo.traits.length === traitsMatched.length && combo.traits.every(trait => traitsMatched.includes(trait))
									);
									if (existing) {
										if (!existing.nodes.includes(node.index))
											existing.nodes.push(node.index);
									}
									else if (!existing) {
										allTraitCombos.push({ traits: traitsMatched, nodes: [node.index] });
									}
								}
							}
						}
					}
				});
				if (nodeCoverage > 0) {
					const matchedCrew = JSON.parse(JSON.stringify(crew));
					matchedCrew.coverage_rarity = nodeCoverage;
					matchedCrew.node_matches = matchesByNode;
					allMatchingCrew.push(matchedCrew);
				}
			}
		});
		// Identify combo sets that are subsets of other possible combos
		const optimalCombos = [];
		allTraitCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
			const supersets = optimalCombos.filter(optimal =>
				optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
			);
			const newNodes = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes.includes(node)).length === 0);
			if (newNodes.length > 0) combo.nodes = newNodes;
			if (supersets.length === 0 || newNodes.length > 0)
				optimalCombos.push(combo);
		});
		setAllMatchingCrew([...allMatchingCrew]);
		setOptimalCombos([...optimalCombos]);
	}, [traitPool, attemptedCrew]);

	if (!combo) return (<></>);

	return (
		<React.Fragment>
			<Step.Group>
				<Step active={activeStep === 'crew' && openNodes.length > 0} onClick={() => setActiveStep('crew')}>
					<Icon name='users' />
					<Step.Content>
						<Step.Title>Crew</Step.Title>
						<Step.Description>Search for possible crew</Step.Description>
					</Step.Content>
				</Step>
				<Step active={activeStep === 'traits' || openNodes.length === 0} onClick={() => setActiveStep('traits')}>
					<Icon name='tasks' />
					<Step.Content>
						<Step.Title>Traits</Step.Title>
						<Step.Description>View current combo chain</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>
			{activeStep === 'crew' && openNodes.length > 0 &&
				<React.Fragment>
					<ComboCrewTable
						comboId={combo.id} openNodes={openNodes} traitPool={traitPool}
						allMatchingCrew={allMatchingCrew} optimalCombos={optimalCombos}
						solveNode={onNodeSolved} markAsTried={onCrewMarked}
					/>
					<ComboChecklist comboId={combo.id} crewList={props.allCrew} attemptedCrew={attemptedCrew} updateAttempts={setAttemptedCrew} />
					<ExportCrewLists openNodes={openNodes} allMatchingCrew={allMatchingCrew} />
				</React.Fragment>
			}
			{(activeStep === 'traits' || openNodes.length === 0) &&
				<React.Fragment>
					{openNodes.length === 0 &&
						<Message positive>
							Your fleet has solved all nodes for this combo chain. Select another boss or update your player data to refresh active battles.
						</Message>
					}
					<ComboNodesTable comboId={combo.id} nodes={combo.nodes} traits={combo.traits} updateNodes={onUpdateNodes} />
					<ComboPossibleTraits nodes={combo.nodes} traits={combo.traits} />
					<ExportTraits nodes={combo.nodes} traits={combo.traits} />
				</React.Fragment>
			}
		</React.Fragment>
	);

	function onUpdateNodes(nodes: any[]): void {
		setCombo({...combo, nodes});
	}

	function onCrewMarked(crewSymbol: string): void {
		if (!attemptedCrew.includes(crewSymbol)) {
			const newAttempts = [...attemptedCrew];
			newAttempts.push(crewSymbol);
			setAttemptedCrew([...newAttempts]);
		}
	}

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		combo.nodes[nodeIndex].hidden_traits = traits;
		setCombo({...combo});
	}
};

export default ComboSolver;
