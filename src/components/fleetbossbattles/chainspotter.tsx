import React from 'react';
import { Step, Icon, Message } from 'semantic-ui-react';

import ChainCrew from './crew';
import ChainTraits from './traits';
import { getComboIndex, removeCrewNodeCombo } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';

const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

type ChainSpotterProps = {
	chain: any;
	allCrew: string[];
};

const ChainSpotter = (props: ChainSpotterProps) => {
	const { chain } = props;

	const [spotter, setSpotter] = useStateWithStorage(`fbb/${chain.id}/spotter`,
		{
			id: chain.id,
			solves: [],
			attemptedCrew: [],
			ignoredTraits: []
		}
	);

	const [openNodes, setOpenNodes] = React.useState(undefined);
	const [traitPool, setTraitPool] = React.useState([]);
	const [allMatchingCrew, setAllMatchingCrew] = React.useState([]);

	const [activeStep, setActiveStep] = React.useState('crew');

	React.useEffect(() => {
		// Ensure spotter matches chain, i.e. not in between switching bosses
		if (!chain || chain.id !== spotter.id) return;

		// The trait pool consists of only remaining possible hidden_traits
		const traits = {};
		chain.traits.forEach(trait => {
			if (!traits[trait]) traits[trait] = { listed: 0, consumed: 0 };
			traits[trait].listed++;
		});

		// Keep track of duplicate traits in original pool
		const dupeTest = Object.entries(traits).filter(entry => entry[1].listed > 1).map(entry => entry[0]);

		const openNodes = [];
		let current = false;
		chain.nodes.forEach((node, nodeIndex) => {
			let hiddenTraits = node.hidden_traits.slice();
			if (hiddenTraits.includes('?')) {
				const solve = spotter.solves.find(solve => solve.node === nodeIndex);
				if (solve) hiddenTraits = solve.traits;
			}
			const nodeIsOpen = hiddenTraits.includes('?');
			const traitsKnown = node.open_traits.slice();
			let hiddenLeft = hiddenTraits.length;
			hiddenTraits.forEach(trait => {
				if (trait !== '?') {
					traits[trait].consumed++;
					if (nodeIsOpen) {
						traitsKnown.push(trait);
						hiddenLeft--;
					}
				}
			});
			if (nodeIsOpen) {
				const alphaTest = node.open_traits.slice().sort((a, b) => b.localeCompare(a))[0];
				openNodes.push({
					chainId: chain.id,
					index: nodeIndex,
					traitsKnown,
					hiddenLeft,
					dupeTest,
					alphaTest
				});
			}
			// You have already solved a node for this chain; not currently used by this tool
			if (node.unlocked_character?.is_current) current = true;
		});

		const traitPool = [];
		chain.traits.forEach(trait => {
			if (!traitPool.includes(trait) && traits[trait].consumed < traits[trait].listed && !spotter.ignoredTraits.includes(trait))
				traitPool.push(trait);
		});

		const getAllCombos = (traits, count) => {
			if (count === 1) return traits.map(trait => [trait]);
			const combos = [];
			for (let i = 0; i < traits.length; i++) {
				for (let j = i+1; j < traits.length; j++) {
					combos.push([traits[i], traits[j]]);
				}
			}
			return combos;
		};

		const allMatchingCrew = [];
		const allComboCounts = [];
		props.allCrew.forEach(crew => {
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[chain.difficultyId]) {
				const nodes = [];
				const matchesByNode = {};
				openNodes.forEach(node => {
					// Crew must have every known trait
					if (node.traitsKnown.every(trait => crew.traits.includes(trait))) {
						const nodePool = traitPool.filter(trait => !node.traitsKnown.includes(trait));
						const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
						// Crew must have at least the same number of matching traits as remaining hidden traits
						if (traitsMatched.length >= node.hiddenLeft) {
							nodes.push(node.index);
							const combos = getAllCombos(traitsMatched, node.hiddenLeft);
							matchesByNode[`node-${node.index}`] = { index: node.index, traits: traitsMatched, combos };
							combos.forEach(combo => {
								const existing = allComboCounts.find(cc =>
									cc.index === node.index
									&& cc.combo.length === combo.length
									&& cc.combo.every(trait => combo.includes(trait))
								);
								if (existing) {
									existing.crew.push(crew.symbol);
									if (crew.in_portal) existing.portals++;
								}
								else {
									allComboCounts.push({ index: node.index, combo, crew: [crew.symbol], portals: crew.in_portal ? 1 : 0});
								}
							});
						}
					}
				});
				if (nodes.length > 0) {
					const matchedCrew = JSON.parse(JSON.stringify(crew));
					matchedCrew.nodes = nodes;
					matchedCrew.nodes_rarity = nodes.length;
					matchedCrew.node_matches = matchesByNode;
					allMatchingCrew.push(matchedCrew);
				}
			}
		});

		const ignoredCombos = [];
		const ignoreCombo = (nodeIndex, combo) => {
			if (!ignoredCombos.find(ignored => ignored.index === nodeIndex && ignored.combo.every(trait => combo.includes(trait))))
				ignoredCombos.push({ index: nodeIndex, combo });
		};

		// Ignore combos of:
		//	1) Crew used to solve other nodes
		//	2) Attempted crew
		const knownSolves = chain.nodes.filter(node => node.unlocked_crew_archetype_id)
			.map(node => props.allCrew.find(c => c.archetype_id === node.unlocked_crew_archetype_id).symbol);
		[knownSolves, spotter.attemptedCrew].forEach(group => {
			group.forEach(attempt => {
				const crew = props.allCrew.find(ac => ac.symbol === attempt);
				openNodes.forEach(node => {
					if (node.traitsKnown.every(trait => crew.traits.includes(trait))) {
						const nodePool = traitPool.filter(trait => !node.traitsKnown.includes(trait));
						const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
						const combos = getAllCombos(traitsMatched, node.hiddenLeft);
						combos.forEach(combo => ignoreCombo(node.index, combo));
					}
				});
			});
		});

		// Also ignore unique combos of non-portal crew
		//	Set to <= 1 to ignore ALL unique combos
		allComboCounts.filter(count => count.portals <= 0).forEach(count => {
			ignoreCombo(count.index, count.combo);
		});

		// Validate matching combos and traits, factoring ignored combos
		ignoredCombos.forEach(ignored => {
			allMatchingCrew.forEach(crew => {
				if (crew.nodes.includes(ignored.index) && getComboIndex(crew.node_matches[`node-${ignored.index}`].combos, ignored.combo) >= 0)
					removeCrewNodeCombo(crew, ignored.index, ignored.combo);
			});
		});
		const validatedCrew = allMatchingCrew.filter(crew => crew.nodes_rarity > 0);

		validatedCrew.forEach(crew => {
			// Annotate remaining exceptions to alpha rule
			crew.alpha_rule = { compliant: crew.nodes_rarity, exceptions: [] };
			Object.values(crew.node_matches).forEach(node => {
				let combosCompliant = node.combos.length;
				const alphaTest = openNodes.find(n => n.index === node.index).alphaTest;
				node.combos.forEach(combo => {
					if (!combo.every(trait => trait.localeCompare(alphaTest) === 1)) {
						crew.alpha_rule.exceptions.push({ index: node.index, combo });
						combosCompliant--;
					}
				});
				if (combosCompliant === 0) crew.alpha_rule.compliant--;
			});
		});

		setOpenNodes([...openNodes]);
		setTraitPool([...traitPool]);
		setAllMatchingCrew([...validatedCrew]);
	}, [chain, spotter]);

	if (!openNodes) return (<></>);

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
				<ChainCrew chain={chain} spotter={spotter} updateSpotter={setSpotter}
					openNodes={openNodes} allMatchingCrew={allMatchingCrew} allCrew={props.allCrew}
				/>
			}
			{(activeStep === 'traits' || openNodes.length === 0) &&
				<React.Fragment>
					{openNodes.length === 0 &&
						<Message positive>
							Your fleet has solved all nodes for this combo chain. Select another boss or update your player data to refresh active battles.
						</Message>
					}
					<ChainTraits chain={chain} spotter={spotter} updateSpotter={setSpotter} />
				</React.Fragment>
			}
		</React.Fragment>
	);
};

export default ChainSpotter;
