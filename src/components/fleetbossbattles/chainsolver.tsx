import React from 'react';
import { Step, Icon, Message } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';
import { BossCrew, Chain, ComboCount, IgnoredCombo, NodeMatches, Rule, RuleException, Solver, SolverNode, SolverTrait, Spotter } from '../../model/boss';
import { useStateWithStorage } from '../../utils/storage';

import { UserContext } from './context';
import ChainCrew from './crew';
import ChainTraits from './traits';
import { getAllCombos, removeCrewNodeCombo } from './fbbutils';

const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

type ChainSolverProps = {
	chain: Chain;
};

const ChainSolver = (props: ChainSolverProps) => {
	const userContext = React.useContext(UserContext);
	const { bossCrew, userPrefs, setUserPrefs } = userContext;
	const { chain } = props;

	const [solver, setSolver] = React.useState<Solver | undefined>(undefined);
	const [spotter, setSpotter] = useStateWithStorage<Spotter>(`fbb/${chain.id}/spotter`,
		{
			id: chain.id,
			solves: [],
			attemptedCrew: [],
			ignoredTraits: []
		}
	);

	React.useEffect(() => {
		if (!chain) return;

		const solverNodes = [] as SolverNode[];
		const solverTraits = [] as SolverTrait[];
		const traitsConsumed = [] as string[];

		chain.nodes.forEach((node, nodeIndex) => {
			const givenTraitIds = [] as number[];
			node.open_traits.forEach((trait, traitIndex) => {
				const instance = solverTraits.filter(t => t.trait === trait).length + 1;
				const id = solverTraits.length;
				solverTraits.push({
					id,
					trait,
					name: allTraits.trait_names[trait],
					poolCount: 0,
					instance,
					source: 'open',
					consumed: true
				});
				givenTraitIds.push(id);
				traitsConsumed.push(trait);
			});

			let solve = node.hidden_traits;
			const spotSolve = spotter.solves.find(solve => solve.node === nodeIndex);
			if (solve.includes('?') && spotSolve) solve = spotSolve.traits;
			const traitsKnown = node.open_traits.slice();
			solve.forEach(trait => {
				if (trait !== '?') traitsKnown.push(trait);
			});
			const hiddenLeft = solve.filter(trait => trait === '?').length;

			solverNodes.push({
				index: nodeIndex,
				givenTraitIds,
				solve,
				traitsKnown,
				hiddenLeft,
				open: hiddenLeft > 0,
				spotSolve: !!spotSolve,
				alphaTest: node.open_traits.slice().sort((a, b) => b.localeCompare(a, 'en'))[0],
				oneHandTest: chain.difficultyId === 6 || (chain.difficultyId === 5 && nodeIndex > 0)
			});
		});

		chain.traits.forEach((trait, traitIndex) => {
			const instances = solverTraits.filter(t => t.trait === trait);
			const traitCount = instances.length + 1;
			instances.forEach(t => t.poolCount = traitCount);
			solverTraits.push({
				id: solverTraits.length,
				trait,
				name: allTraits.trait_names[trait],
				poolCount: traitCount,
				instance: traitCount,
				source: 'pool',
				consumed: false
			});
		});

		// Mark consumed pool traits
		solverNodes.forEach((node, nodeIndex) => {
			node.solve.forEach(trait => {
				if (trait !== '?') {
					traitsConsumed.push(trait);
					const instanceCount = traitsConsumed.filter(t => t === trait).length;
					const consumed = solverTraits.find(t => t.trait === trait && t.instance === instanceCount);
					if (consumed) consumed.consumed = true;
				}
			});
		});

		// Update trait pool to filter out consumed traits
		const traitPool = [] as string[];
		solverTraits.filter(t => t.source === 'pool').forEach(t => {
			if (!traitPool.includes(t.trait) && !t.consumed && !spotter.ignoredTraits.includes(t.trait))
				traitPool.push(t.trait);
		});

		const allMatchingCrew = [] as BossCrew[];
		const allComboCounts = [] as ComboCount[];
		bossCrew.forEach(crew => {
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[chain.difficultyId]) {
				const nodes = [] as number[];
				const matchesByNode = {} as NodeMatches;
				solverNodes.filter(node => node.open).forEach(node => {
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
					const matchedCrew = JSON.parse(JSON.stringify(crew)) as BossCrew;
					matchedCrew.nodes = nodes;
					matchedCrew.nodes_rarity = nodes.length;
					matchedCrew.node_matches = matchesByNode;
					allMatchingCrew.push(matchedCrew);
				}
			}
		});

		const ignoredCombos = [] as IgnoredCombo[];
		const ignoreCombo = (nodeIndex: number, combo: string[]) => {
			if (!ignoredCombos.find(ignored => ignored.index === nodeIndex && ignored.combo.every(trait => combo.includes(trait))))
				ignoredCombos.push({ index: nodeIndex, combo });
		};

		// Ignore combos of:
		//	1) Crew used to solve other nodes
		//	2) Attempted crew
		const confirmedSolves = chain.nodes.filter(node => node.unlocked_crew_archetype_id)
			.map(node => bossCrew.find(c => c.archetype_id === node.unlocked_crew_archetype_id)?.symbol);
		[confirmedSolves, spotter.attemptedCrew].forEach(group => {
			group?.forEach(attempt => {
				const crew = bossCrew.find(ac => ac.symbol === attempt);
				if (crew) {
					solverNodes.filter(node => node.open).forEach(node => {
						if (node.traitsKnown.every(trait => crew.traits.includes(trait))) {
							const nodePool = traitPool.filter(trait => !node.traitsKnown.includes(trait));
							const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
							const combos = getAllCombos(traitsMatched, node.hiddenLeft);
							combos.forEach(combo => ignoreCombo(node.index, combo));
						}
					});
				}
			});
		});

		// Ignore ALL unique combos
		allComboCounts.filter(count => count.portals <= 1).forEach(count => {
			ignoreCombo(count.index, count.combo);
		});

		// Validate matching combos and traits, factoring ignored combos
		ignoredCombos.forEach(ignored => {
			allMatchingCrew.forEach(crew => {
				if (crew.nodes.includes(ignored.index))
					removeCrewNodeCombo(crew, ignored.index, ignored.combo);
			});
		});

		const validatedCrew = allMatchingCrew.filter(crew => crew.nodes_rarity > 0);

		// Annotate remaining exceptions to unofficial rules (i.e. alpha, one hand)
		validatedCrew.forEach(crew => {
			crew.alpha_rule = { compliant: crew.nodes_rarity, exceptions: [] as RuleException[] } as Rule;
			crew.onehand_rule = { compliant: crew.nodes_rarity, exceptions: [] as RuleException[] } as Rule;
			Object.values(crew.node_matches).forEach(node => {
				let alphaCompliant = node.combos.length, oneHandCompliant = node.combos.length;
				const alphaTest = solverNodes.filter(node => node.open).find(n => n.index === node.index)?.alphaTest;
				node.combos.forEach(combo => {
					if (alphaTest) {
						if (!combo.every(trait => trait.localeCompare(alphaTest, 'en') === 1)) {
							crew.alpha_rule.exceptions.push({ index: node.index, combo });
							alphaCompliant--;
						}
					}
					if (solverNodes.find(n => n.index === node.index)?.oneHandTest) {
						const comboCount = allComboCounts.find(cc =>
							cc.index === node.index
								&& cc.combo.length === combo.length
								&& cc.combo.every(trait => combo.includes(trait))
						);
						if (comboCount && comboCount.portals > 5) {
							crew.onehand_rule.exceptions.push({ index: node.index, combo });
							oneHandCompliant--;
						}
					}
				});
				if (alphaCompliant === 0) crew.alpha_rule.compliant--;
				if (oneHandCompliant === 0) crew.onehand_rule.compliant--;
			});
		});

		setSolver({
			id: chain.id,
			description: chain.description,
			nodes: solverNodes,
			traits: solverTraits,
			crew: validatedCrew,
		});
	}, [chain, spotter]);

	if (!solver) return (<></>);

	const openNodes = solver.nodes.filter(node => node.open).length;

	return (
		<React.Fragment>
			<Step.Group fluid>
				<Step active={userPrefs.view === 'crewgroups' && openNodes > 0} onClick={() => setUserPrefs({...userPrefs, view: 'crewgroups'})}>
					<Icon name='object group' />
					<Step.Content>
						<Step.Title>Groups</Step.Title>
						<Step.Description>View solutions grouped by traits</Step.Description>
					</Step.Content>
				</Step>
				<Step active={userPrefs.view === 'crewtable' && openNodes > 0} onClick={() => setUserPrefs({...userPrefs, view: 'crewtable'})}>
					<Icon name='users' />
					<Step.Content>
						<Step.Title>Crew</Step.Title>
						<Step.Description>Search for individual crew</Step.Description>
					</Step.Content>
				</Step>
				<Step active={userPrefs.view === 'traits' || openNodes === 0} onClick={() => setUserPrefs({...userPrefs, view: 'traits'})}>
					<Icon name='tasks' />
					<Step.Content>
						<Step.Title>Traits</Step.Title>
						<Step.Description>View current combo chain</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>
			{(userPrefs.view === 'crewgroups' || userPrefs.view === 'crewtable') && openNodes > 0 &&
				<ChainCrew view={userPrefs.view}
					solver={solver} spotter={spotter} updateSpotter={setSpotter}
				/>
			}
			{(userPrefs.view === 'traits' || openNodes === 0) &&
				<React.Fragment>
					{openNodes === 0 &&
						<Message positive>
							Your fleet has solved all nodes for this combo chain. Select another boss or update your player data to refresh active battles.
						</Message>
					}
					<ChainTraits solver={solver} spotter={spotter} updateSpotter={setSpotter} />
				</React.Fragment>
			}
		</React.Fragment>
	);
};

export default ChainSolver;
