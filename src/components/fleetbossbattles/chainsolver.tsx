import React from 'react';
import { Header, Step, Icon, Message } from 'semantic-ui-react';

import { BossCrew, ComboCount, IgnoredCombo, NodeMatches, Rule, RuleException, Solve, SolveStatus, Solver, SolverNode, SolverTrait } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { UserContext, SolverContext } from './context';
import ChainCrew from './crew';
import ChainTraits from './traits';
import { isNodeOpen, getAllCombos, removeCrewNodeCombo } from './fbbutils';

const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

export const ChainSolver = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { TRAIT_NAMES } = globalContext.localized;
	const { bossCrew: inputBossCrew, spotterPrefs, userPrefs, setUserPrefs } = React.useContext(UserContext);
	const { bossBattle: { difficultyId, chainIndex, chain }, spotter, setSpotter } = React.useContext(SolverContext);

	const [solver, setSolver] = React.useState<Solver | undefined>(undefined);

	const bossCrew = React.useMemo(() => {
		if (!spotterPrefs.hideUnpublishedCrew) return inputBossCrew;
		return inputBossCrew?.filter(c => !c.preview);
	}, [inputBossCrew, spotterPrefs]);

	React.useEffect(() => {
		if (!chain) return;

		const solverNodes: SolverNode[] = [];
		const solverTraits: SolverTrait[] = [];
		const traitsConsumed: string[] = [];

		chain.nodes.forEach((node, nodeIndex) => {
			const givenTraitIds: number[] = [];
			node.open_traits.forEach(trait => {
				const instance: number = solverTraits.filter(t => t.trait === trait).length + 1;
				const id: number = solverTraits.length;
				solverTraits.push({
					id,
					trait,
					name: TRAIT_NAMES[trait],
					poolCount: 0,
					instance,
					source: 'open',
					consumed: true
				});
				givenTraitIds.push(id);
				traitsConsumed.push(trait);
			});

			let solveStatus: SolveStatus = SolveStatus.Unsolved;
			let solve: string[] = node.hidden_traits.slice();
			if (!solve.includes('?')) {
				solveStatus = SolveStatus.Infallible;
			}
			else {
				const spotSolve: Solve | undefined = spotter.solves.find(solve => solve.node === nodeIndex);
				if (spotSolve) {
					if (!spotSolve.traits.includes('?'))
						solveStatus = spotSolve.crew.length === 0 ? SolveStatus.Confirmed : SolveStatus.Unconfirmed;
					else if (spotSolve.traits.some(trait => trait !== '?'))
						solveStatus = SolveStatus.Partial;
					solve = spotSolve.traits;
				}
			}

			const traitsKnown: string[] = node.open_traits.slice();
			solve.forEach(trait => {
				if (trait !== '?') traitsKnown.push(trait);
			});
			const hiddenLeft: number = solve.filter(trait => trait === '?').length;

			solverNodes.push({
				index: nodeIndex,
				givenTraitIds,
				solve,
				solveStatus,
				traitsKnown,
				hiddenLeft,
				alphaTest: node.open_traits.slice().sort((a, b) => b.localeCompare(a, 'en'))[0],
				oneHandTest: difficultyId === 6 || (difficultyId === 5 && nodeIndex > 0)
			});
		});

		chain.traits.forEach((trait, traitIndex) => {
			const instances = solverTraits.filter(t => t.trait === trait);
			const traitCount = instances.length + 1;
			instances.forEach(t => t.poolCount = traitCount);
			solverTraits.push({
				id: solverTraits.length,
				trait,
				name: TRAIT_NAMES[trait],
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
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[difficultyId]) {
				const nodes = [] as number[];
				const matchesByNode = {} as NodeMatches;
				solverNodes.filter(node => isNodeOpen(node)).forEach(node => {
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
		const infallibleSolves = chain.nodes.filter(node => node.unlocked_crew_archetype_id)
			.map(node => bossCrew.find(c => c.archetype_id === node.unlocked_crew_archetype_id)?.symbol);
		[infallibleSolves, spotter.attemptedCrew].forEach(group => {
			group?.forEach(attempt => {
				const crew = bossCrew.find(ac => ac.symbol === attempt);
				if (crew) {
					solverNodes.filter(node => isNodeOpen(node)).forEach(node => {
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
				const alphaTest = solverNodes.filter(node => isNodeOpen(node)).find(n => n.index === node.index)?.alphaTest;
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
			nodes: solverNodes,
			traits: solverTraits,
			crew: validatedCrew,
		});
	}, [chain, spotter, bossCrew]);

	if (!solver) return (<></>);

	const unsolvedNodes: number = solver.nodes.filter(node => isNodeOpen(node)).length;
	const unconfirmedNodes: number = solver.nodes.filter(node => node.solveStatus === SolveStatus.Unconfirmed).length;
	const chainSolved: boolean = unsolvedNodes === 0 && (!spotterPrefs.confirmSolves || unconfirmedNodes === 0);

	let solvedNodes: number = solver.nodes.length - unsolvedNodes;
	if (spotterPrefs.confirmSolves) solvedNodes -= unconfirmedNodes;

	return (
		<React.Fragment>
			<Header as='h3'>
				{t('fbb.chain_n', { n: `${chainIndex+1}`})}
				<span style={{ marginLeft: '1em' }}>
					(
					{spotterPrefs.confirmSolves && <>{t('fbb.x_y_confirmed_solved', {
						x: `${solvedNodes}`,
						y: `${solver.nodes.length}`
					})}</>}
					{!spotterPrefs.confirmSolves && <>{t('fbb.x_y_solved', {
						x: `${solvedNodes}`,
						y: `${solver.nodes.length}`
					})}</>}
					)
				</span>
			</Header>
			<Step.Group fluid>
				<Step active={userPrefs.view === 'crewgroups' && !chainSolved} onClick={() => setUserPrefs({...userPrefs, view: 'crewgroups'})}>
					<Icon name='object group' />
					<Step.Content>
						<Step.Title>{t('fbb.sections.groups.title')}</Step.Title>
						<Step.Description>{t('fbb.sections.groups.description')}</Step.Description>
					</Step.Content>
				</Step>
				<Step active={userPrefs.view === 'crewtable' && !chainSolved} onClick={() => setUserPrefs({...userPrefs, view: 'crewtable'})}>
					<Icon name='users' />
					<Step.Content>
						<Step.Title>{t('fbb.sections.crew.title')}</Step.Title>
						<Step.Description>{t('fbb.sections.crew.description')}</Step.Description>
					</Step.Content>
				</Step>
				<Step active={userPrefs.view === 'traits' || chainSolved} onClick={() => setUserPrefs({...userPrefs, view: 'traits'})}>
					<Icon name='tasks' />
					<Step.Content>
						<Step.Title>{t('fbb.sections.traits.title')}</Step.Title>
						<Step.Description>{t('fbb.sections.traits.description')}</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>
			{(userPrefs.view === 'crewgroups' || userPrefs.view === 'crewtable') && !chainSolved &&
				<ChainCrew view={userPrefs.view}
					solver={solver} spotter={spotter} updateSpotter={setSpotter}
				/>
			}
			{(userPrefs.view === 'traits' || chainSolved) &&
				<React.Fragment>
					{chainSolved &&
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
