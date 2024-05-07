import React from 'react';
import { Header, Form, Dropdown, Checkbox, Icon, Message } from 'semantic-ui-react';

import { BossCrew, FilteredGroup, FilteredGroups, NodeRarities, NodeRarity, Optimizer, PossibleCombo, Solve, SolveStatus, Solver, Spotter, SpotterPreferences, TraitRarities, ViableCombo } from '../../model/boss';
import { crewCopy } from '../../utils/crewutils';

import { UserContext, SolverContext } from './context';
import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter } from './crewexporter';
import { isNodeOpen, getAllCombos, getComboIndexOf, removeCrewNodeCombo } from './fbbutils';

type ChainCrewProps = {
	view: string;
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
};

const ChainCrew = (props: ChainCrewProps) => {
	const { userType, spotterPrefs, setSpotterPrefs, soloPrefs, setSoloPrefs } = React.useContext(UserContext);
	const { collaboration } = React.useContext(SolverContext);
	const { view, solver, spotter, updateSpotter } = props;

	const [optimizer, setOptimizer] = React.useState<Optimizer | undefined>(undefined);

	React.useEffect(() => {
		let resolvedCrew = crewCopy<BossCrew>(solver.crew);
		if (spotterPrefs.onehand === 'hide') resolvedCrew = filterOneHandExceptions(resolvedCrew);
		if (spotterPrefs.alpha === 'hide') resolvedCrew = filterAlphaExceptions(resolvedCrew);

		const optimalCombos: ViableCombo[] = getOptimalCombos(resolvedCrew);

		const rarities: NodeRarities = {};
		const groups: FilteredGroups = {};
		solver.nodes.forEach(node => {
			if (isNodeOpen(node)) {
				const nodeCrew: BossCrew[] = resolvedCrew.filter(crew => !!crew.node_matches[`node-${node.index}`]);
				const nodeRarities: NodeRarity = getNodeRarities(node.index, nodeCrew);
				const nodeGroups: FilteredGroup[] = filterNodeGroups(node.index, node.hiddenLeft, node.alphaTest, nodeCrew, nodeRarities, optimalCombos, spotterPrefs);
				rarities[`node-${node.index}`] = nodeRarities;
				groups[`node-${node.index}`] = nodeGroups;
			}
			else {
				// Calculate rarities, groups for unconfirmed solve
				const unconfirmedSolve: Solve | undefined = spotter.solves.find(solve =>
					solve.node === node.index && solve.crew.length > 0
				);
				if (unconfirmedSolve) {
					let nodeCrew = crewCopy<BossCrew>(unconfirmedSolve.crew);
					if (spotterPrefs.onehand === 'hide') nodeCrew = filterOneHandExceptions(nodeCrew);
					if (spotterPrefs.alpha === 'hide') nodeCrew = filterAlphaExceptions(nodeCrew);
					const nodeCombo: ViableCombo[] = [{ traits: unconfirmedSolve.traits, nodes: [node.index] }];
					const nodeRarities: NodeRarity = getNodeRarities(node.index, nodeCrew);
					const nodeGroups: FilteredGroup[] = filterNodeGroups(node.index, unconfirmedSolve.traits.length, node.alphaTest, nodeCrew, nodeRarities, nodeCombo, spotterPrefs);
					rarities[`node-${node.index}`] = nodeRarities;
					groups[`node-${node.index}`] = nodeGroups;
				}
			}
		});

		setOptimizer({
			crew: resolvedCrew,
			optimalCombos,
			rarities,
			groups,
			prefs: {
				spotter: spotterPrefs,
				solo: soloPrefs
			}
		});
	}, [solver, spotterPrefs]);

	React.useEffect(() => {
		if (!optimizer) return;
		const prefs = {
			spotter: spotterPrefs,
			solo: soloPrefs
		};
		setOptimizer({...optimizer, prefs});
	}, [soloPrefs]);

	const usableFilterOptions = [
		{ key: 'all', text: 'Show all crew', value: '' },
		{ key: 'owned', text: 'Only show owned crew', value: 'owned' },
		{ key: 'thawed', text: 'Only show unfrozen crew', value: 'thawed' }
	];

	if (!optimizer)
		return (<div><Icon loading name='spinner' /> Loading...</div>);

	const showWarning = spotterPrefs.alpha === 'hide' || spotterPrefs.onehand === 'hide'
		|| soloPrefs.usable === 'owned' || soloPrefs.usable === 'thawed';

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Solutions</Header>
			<p>
				Here are the crew who satisfy the conditions of the remaining unsolved nodes.{` `}
				{view === 'crewgroups' && <span>Tap a trait if it solves a node. Tap a crew to mark as tried.</span>}
				{view === 'crewtable' && <span>Tap the <Icon name='check' /><Icon name='x' /> buttons to mark crew as tried.</span>}
			</p>

			<Message>
				<Form>
					<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
						<Form.Group grouped>
							<Header as='h4'>Unofficial Rules</Header>
							<Form.Field
								control={Checkbox}
								label='Hide one hand exceptions'
								checked={spotterPrefs.onehand === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, onehand: data.checked ? 'hide' : 'flag'})}
							/>
							<Form.Field
								control={Checkbox}
								label='Hide alpha exceptions'
								checked={spotterPrefs.alpha === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, alpha: data.checked ? 'hide' : 'flag'})}
							/>
						</Form.Group>
						<Form.Group grouped>
							<Header as='h4'>Optimizations</Header>
							<Form.Field
								control={Checkbox}
								label='Hide non-optimal crew'
								checked={spotterPrefs.nonoptimal === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, nonoptimal: data.checked ? 'hide' : 'flag'})}
							/>
							{view === 'crewgroups' && (
								<Form.Field
									control={Checkbox}
									label='Prioritize crew with coverage'
									checked={spotterPrefs.noncoverage === 'hide'}
									onChange={(e, data) => setSpotterPrefs({...spotterPrefs, noncoverage: data.checked ? 'hide' : 'show'})}
								/>
							)}
						</Form.Group>
						<Form.Group grouped>
							<Header as='h4'>User Preferences</Header>
							{userType === 'player' &&
								<Form.Field
									placeholder='Filter by availability'
									control={Dropdown}
									clearable
									selection
									options={usableFilterOptions}
									value={soloPrefs.usable}
									onChange={(e, { value }) => setSoloPrefs({...soloPrefs, usable: value})}
								/>
							}
							<Form.Field
								control={Checkbox}
								label='Show ship ability'
								checked={soloPrefs.shipAbility === 'show'}
								onChange={(e, data) => setSoloPrefs({...soloPrefs, shipAbility: data.checked ? 'show' : 'hide'})}
							/>
							<Form.Field
								control={Checkbox}
								label='Confirm trait solves'
								checked={spotterPrefs.confirmSolves}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, confirmSolves: data.checked})}
							/>
						</Form.Group>
					</div>
				</Form>
				{showWarning &&
					<div>
						<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed with the current settings.
					</div>
				}
			</Message>

			{view === 'crewgroups' &&
				<CrewGroups solver={solver} optimizer={optimizer}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			}
			{view === 'crewtable' &&
				<CrewTable solver={solver} optimizer={optimizer}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			}

			<CrewChecklist key={solver.id}
				attemptedCrew={spotter.attemptedCrew}
				updateAttempts={updateCrewAttempts}
			/>

			<Message style={{ margin: '1em 0' }}>
				<Message.Content>
					<Message.Header>Tips</Message.Header>
					<p><i>One hand exceptions</i> are crew who might be ruled out based on an unofficial rule that limits solutions to traits with no more than a handful of matching crew.</p>
					<p><i>Alpha exceptions</i> are crew who might be ruled out based on an unofficial rule that eliminates some of their traits by name. You should only try alpha exceptions if you've exhausted all other listed options.</p>
					<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible solution for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
					<p><i>Coverage</i> identifies crew who might be solutions to multiple nodes. In groups view, crew with coverage are italicized; if you prioritize crew with coverage, some crew will be hidden when others can be tried as possible solutions for more nodes. In crew view, the number of potential nodes is listed.</p>
					<p><i>Trait colors</i> help visualize the rarity of each trait per node, e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that potential alpha exceptions are always orange, regardless of rarity.</p>
					<p><i>Trait numbers</i> identify how many remaining nodes that trait is likely a solution for, based on an unofficial rule that duplicate traits in the pool are always a solution.</p>
				</Message.Content>
			</Message>

			<CrewFullExporter solver={solver} optimizer={optimizer} />
		</div>
	);

	function filterOneHandExceptions(crewList: BossCrew[]): BossCrew[] {
		return crewList.filter(crew => {
			if (crew.onehand_rule.compliant === 0) return false;
			crew.onehand_rule.exceptions.forEach(combo => {
				removeCrewNodeCombo(crew, combo.index, combo.combo);
			});
			return crew.nodes_rarity > 0;
		});
	}

	function filterAlphaExceptions(crewList: BossCrew[]): BossCrew[] {
		return crewList.filter(crew => {
			if (crew.alpha_rule.compliant === 0) return false;
			crew.alpha_rule.exceptions.forEach(combo => {
				removeCrewNodeCombo(crew, combo.index, combo.combo);
			});
			return crew.nodes_rarity > 0;
		});
	}

	function getOptimalCombos(crewList: BossCrew[]): ViableCombo[] {
		const viableCombos = [] as ViableCombo[];
		crewList.forEach(crew => {
			Object.values(crew.node_matches).forEach(node => {
				const existing = viableCombos.find(combo =>
					combo.traits.length === node.traits.length && combo.traits.every(trait => trait && node.traits.includes(trait))
				);
				if (existing) {
					if (!existing.nodes.includes(node.index))
						existing.nodes.push(node.index);
				}
				else if (!existing) {
					viableCombos.push({ traits: node.traits, nodes: [node.index] });
				}
			});
		});
		// Identify combo sets that are subsets of other possible combos
		const optimalCombos = [] as ViableCombo[];
		viableCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
			const supersets = optimalCombos.filter(optimal =>
				optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
			);
			const newNodes = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes.includes(node)).length === 0);
			if (newNodes.length > 0) combo.nodes = newNodes;
			if (supersets.length === 0 || newNodes.length > 0)
				optimalCombos.push(combo);
		});
		return optimalCombos;
	}

	function getNodeRarities(nodeIndex: number, nodeCrew: BossCrew[]): NodeRarity {
		const possibleCombos: PossibleCombo[] = [];
		const traitRarity: TraitRarities = {};
		nodeCrew.forEach(crew => {
			crew.node_matches[`node-${nodeIndex}`].combos.forEach(combo => {
				const existing: PossibleCombo | undefined = possibleCombos.find(possible =>
					possible.combo.every(trait => combo.includes(trait))
				);
				if (existing) {
					if (crew.in_portal) existing.crew.push(crew.symbol);
				}
				else {
					possibleCombos.push({ combo, crew: crew.in_portal ? [crew.symbol] : []});
				}
			});
			const portalValue: number = crew.in_portal ? 1 : 0;
			crew.node_matches[`node-${nodeIndex}`].traits.forEach(trait => {
				traitRarity[trait] = traitRarity[trait] ? traitRarity[trait] + portalValue : portalValue;
			});
		});
		return { combos: possibleCombos, traits: traitRarity };
	}

	function filterNodeGroups(nodeIndex: number, hiddenLeft: number, alphaTest: string, nodeCrew: BossCrew[], rarities: NodeRarity, optimalCombos: ViableCombo[], spotterPrefs: SpotterPreferences): FilteredGroup[] {
		const comboRarity: PossibleCombo[] = rarities.combos;
		const traitRarity: TraitRarities = rarities.traits;
		const traitGroups: string[][] = [];
		nodeCrew.forEach(crew => {
			const crewNodeTraits: string[] = crew.node_matches[`node-${nodeIndex}`].traits;
			const exists: boolean = !!traitGroups.find(traits =>
				traits.length === crewNodeTraits.length && traits.every(trait => crewNodeTraits.includes(trait))
			);
			if (!exists) traitGroups.push(crewNodeTraits);
		});

		return traitGroups.map(traits => {
			const score: number = traits.reduce((prev, curr) => prev + traitRarity[curr], 0);

			const matchingCrew: BossCrew[] = nodeCrew.filter(crew =>
				traits.length === crew.node_matches[`node-${nodeIndex}`].traits.length
					&& traits.every(trait => crew.node_matches[`node-${nodeIndex}`].traits.includes(trait))
			);
			const highestCoverage: number = matchingCrew.reduce((prev, curr) => Math.max(prev, curr.nodes_rarity), 0);
			const crewList: BossCrew[] = matchingCrew.filter(crew => spotterPrefs.noncoverage !== 'hide' || highestCoverage === 1 || crew.nodes_rarity > 1);

			const oneHandException: boolean = crewList.filter(crew => crew.onehand_rule.compliant > 0).length === 0;

			let alphaExceptions: number = 0;
			traits.forEach(trait => { if (trait.localeCompare(alphaTest, 'en') < 0) alphaExceptions++; });
			const alphaException: boolean = traits.length - alphaExceptions < hiddenLeft;

			const crewSet: string[] = [];
			getAllCombos(traits, hiddenLeft).forEach(combo => {
				const combos: PossibleCombo | undefined  = comboRarity.find(rarity =>
					rarity.combo.every(trait => combo.includes(trait))
				);
				if (combos) {
					combos.crew.forEach(crew => {
						if (!crewSet.includes(crew)) crewSet.push(crew);
					});
				}
			});

			// Should never see unique or non-portal tags, if everything in solver works as expected
			const uniqueCrew: boolean = crewSet.length === 1;
			const nonPortal: boolean = crewSet.length === 0;

			const nodeOptimalCombos: string[][] = optimalCombos.filter(combos => combos.nodes.includes(nodeIndex)).map(combos => combos.traits);
			const nonOptimal: boolean = getComboIndexOf(nodeOptimalCombos, traits) === -1;

			const notes = { oneHandException, alphaException, uniqueCrew, nonPortal, nonOptimal };

			return {
				traits,
				score,
				crewList,
				notes
			};
		}).filter(row =>
			row.crewList.length > 0
				&& (spotterPrefs.nonoptimal === 'flag' || !row.notes.nonOptimal)
		);
	}

	function onNodeSolved(nodeIndex: number, traits: string[], bypassConfirmation: boolean = false): void {
		const node = solver.nodes.find(node => node.index === nodeIndex);
		if (!node) return;

		// Reset solved traits to ? if passed an empty traits array
		if (traits.length === 0) {
			traits = Array(node.solve.length).fill('?');
		}

		// Keep list of crew who can confirm this solve
		//	If all traits solved AND crew array set, solve status will be unconfirmed
		//	If all traits solved AND crew array empty, solve status will be confirmed
		let crew: BossCrew[] = [];
		if (node.solveStatus !== SolveStatus.Unconfirmed && !bypassConfirmation) {
			crew = solver.crew.slice().filter(crew =>
				!!crew.node_matches[`node-${nodeIndex}`]
					&& traits.every(trait => crew.traits.includes(trait))
			);
			crew.forEach(crew => {
				// Only retain knowledge about the solved node and solved traits
				crew.nodes_rarity = 1;
				crew.node_matches = {
					[`node-${nodeIndex}`]: {
						index: nodeIndex,
						combos: [traits],
						traits: traits
					}
				};
			});
		}

 		const solves = [...spotter.solves];
		const solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
			solve.crew = crew;
		}
		else {
			solves.push({ node: nodeIndex, traits, crew });
		}

		updateSpotter({...spotter, solves});
 	}

	function onCrewMarked(crewSymbol: string): void {
		if (!spotter.attemptedCrew.includes(crewSymbol)) {
			const attemptedCrew = [...spotter.attemptedCrew];
			attemptedCrew.push(crewSymbol);
			updateSpotter({...spotter, attemptedCrew});
		}
	}

	function updateCrewAttempts(attemptedCrew: string[]): void {
		if (!!collaboration) return;
		updateSpotter({...spotter, attemptedCrew});
	}
};

export default ChainCrew;
