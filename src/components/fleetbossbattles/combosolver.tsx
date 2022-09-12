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
	const [openNodes, setOpenNodes] = React.useState(undefined);
	const [traitPool, setTraitPool] = React.useState([]);
	const [allMatchingCrew, setAllMatchingCrew] = React.useState([]);
	const [attemptedCrew, setAttemptedCrew] = React.useState([]);

	React.useEffect(() => {
		if (props.combo) {
			setCombo({...props.combo});
			if (combo && combo.id !== props.combo.id) setAttemptedCrew([]);
		}
	}, [props.combo]);

	React.useEffect(() => {
		if (!combo) return;

		// The trait pool consists of only remaining possible hidden_traits
		const traits = {};
		combo.traits.forEach(trait => {
			if (!traits[trait]) traits[trait] = { listed: 0, consumed: 0 };
			traits[trait].listed++;
		});

		const openNodes = [];
		let current = false;
		combo.nodes.forEach((node, nodeIndex) => {
			const nodeIsOpen = node.hidden_traits.includes('?');
			const traitsKnown = node.open_traits.slice();
			let hiddenLeft = node.hidden_traits.length;
			node.hidden_traits.forEach(trait => {
				if (trait !== '?') {
					traits[trait].consumed++;
					if (nodeIsOpen) {
						traitsKnown.push(trait);
						hiddenLeft--;
					}
				}
			});
			if (nodeIsOpen) {
				openNodes.push({
					comboId: combo.id,
					index: nodeIndex,
					traitsKnown,
					hiddenLeft
				});
			}
			// You have already solved a node for this chain; not currently used by this tool
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
				if (node.traitsKnown.every(trait => crew.traits.includes(trait))) {
					const nodePool = traitPool.filter(trait => !node.traitsKnown.includes(trait));
					const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
					if (traitsMatched.length >= node.hiddenLeft) {
						ignoredCombos.push({ index: node.index, traits: traitsMatched });
					}
				}
			});
		});

		const allMatchingCrew = [];
		props.allCrew.forEach(crew => {
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[combo.difficultyId]) {
				let nodeCoverage = 0;
				const matchesByNode = {};
				openNodes.forEach(node => {
					// Crew must have every known trait
					if (node.traitsKnown.every(trait => crew.traits.includes(trait))) {
						const nodePool = traitPool.filter(trait => !node.traitsKnown.includes(trait));
						const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
						// Crew must have at least the same number of matching traits as remaining hidden traits
						if (traitsMatched.length >= node.hiddenLeft) {
							const shouldIgnore = !!ignoredCombos.find(ignored =>
								ignored.index === node.index && traitsMatched.every(trait =>
									ignored.traits.includes(trait)
								)
							);
							if (!shouldIgnore) {
								matchesByNode[`node-${node.index}`] = { index: node.index, traits: traitsMatched };
								nodeCoverage++;
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
		// Validate matched traits of non-portal crew
		const nonPortals = allMatchingCrew.filter(crew => !crew.in_portal);
		if (nonPortals.length > 0) {
			openNodes.forEach(node => {
				const nonPortalsByNode = nonPortals.filter(crew => !!crew.node_matches[`node-${node.index}`]);
				if (nonPortalsByNode.length > 0) {
					const portalsByNode = allMatchingCrew.filter(crew => crew.in_portal && !!crew.node_matches[`node-${node.index}`]);
					nonPortals.forEach(nonportal => {
						if (!!nonportal.node_matches[`node-${node.index}`]) {
							const validTraits = [];
							nonportal.node_matches[`node-${node.index}`].traits.forEach(trait => {
								// Trait is valid if any portal crew in this node shares the trait
								//	Could be validated further by testing for unique trait combos
								if (portalsByNode.some(portal => portal.node_matches[`node-${node.index}`].traits.includes(trait)))
									validTraits.push(trait);
							});
							if (validTraits.length < node.hiddenleft) {
								delete nonportal.node_matches[`node-${node.index}`];
								nonportal.coverage_rarity--;
							}
							else {
								nonportal.node_matches[`node-${node.index}`].traits = validTraits;
							}
						}
					});
				}
			});
		}
		const matchingCrew = allMatchingCrew.filter(crew => crew.coverage_rarity > 0);
		setAllMatchingCrew([...matchingCrew]);
	}, [traitPool, attemptedCrew]);

	if (!combo || !openNodes)
		return (<></>);

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
						allMatchingCrew={allMatchingCrew}
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
		let solvedIndex = 0;
		const solvedTraits = combo.nodes[nodeIndex].hidden_traits.map(hiddenTrait => {
			if (hiddenTrait === '?') return traits[solvedIndex++];
			return hiddenTrait;
		});
		combo.nodes[nodeIndex].hidden_traits = solvedTraits;
		setCombo({...combo});
	}
};

export default ComboSolver;
