import React from 'react';
import {
	Checkbox,
	Dropdown,
	DropdownItemProps,
	Form,
	Header,
	Icon,
	Message
} from 'semantic-ui-react';

import { BossCrew, FilteredGroup, FilteredGroups, NodeRarities, NodeRarity, Optimizer, PossibleCombo, Solve, SolveStatus, Solver, Spotter, SpotterPreferences, TraitRarities, ViableCombo, SolverNode } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';
import { crewCopy, oneCrewCopy } from '../../utils/crewutils';

import { UserContext } from './context';
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
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { userType, bossCrew, spotterPrefs, setSpotterPrefs, soloPrefs, setSoloPrefs } = React.useContext(UserContext);
	const { view, solver, spotter, updateSpotter } = props;

	const [optimizer, setOptimizer] = React.useState<Optimizer | undefined>(undefined);

	React.useEffect(() => {
		let resolvedCrew: BossCrew[] = crewCopy<BossCrew>(solver.crew);
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
					// Reconstitute boss crew data for unconfirmed crew
					let nodeCrew: BossCrew[] = [];
					unconfirmedSolve.crew.forEach(crewSymbol => {
						const unconfirmedCrew: BossCrew | undefined = bossCrew.find(bc => bc.symbol === crewSymbol);
						if (unconfirmedCrew) {
							const bossCrewData: BossCrew = oneCrewCopy<BossCrew>(unconfirmedCrew);
							nodeCrew.push({
								...bossCrewData,
								nodes: [node.index],
								nodes_rarity: 1,
								node_matches: {
									[`node-${node.index}`]: {
										index: node.index,
										combos: [unconfirmedSolve.traits],
										traits: unconfirmedSolve.traits
									}
								},
								onehand_rule: { compliant: 1, exceptions: [] },
								alpha_rule: { compliant: 1, exceptions: [] }
							});
						}
					});
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

	const usableFilterOptions: DropdownItemProps[] = [
		{ key: 'all', text: t('options.crew_status.none'), value: '' },
		{ key: 'owned', text: t('crew_ownership.owned'), value: 'owned' },
		{ key: 'thawed', text: t('options.crew_status.thawed'), value: 'thawed' }
	];

	if (!optimizer)
		return <div><Icon loading name='spinner' /> {t('global.loading_ellipses')}</div>;

	const showWarning = spotterPrefs.alpha === 'hide' || spotterPrefs.onehand === 'hide'
		|| soloPrefs.usable === 'owned' || soloPrefs.usable === 'thawed';

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>{t('fbb.possible_solutions.title')}</Header>
			<p>
				{t('fbb.possible_solutions.heading')}{` `}
				{view === 'crewgroups' && <span>{t('fbb.possible_solutions.tap_trait_solve')}</span>}
				{view === 'crewtable' && (
					<span>
						{tfmt('fbb.possible_solutions.tap_approve_decline', {
							approve: <Icon name='check' />,
							decline: <Icon name='x' />
						})}
					</span>
				)}
			</p>

			<Message>
				<Form>
					<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
						<Form.Group grouped>
							<Header as='h4'>{t('fbb.settings.unofficial.title')}</Header>
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.unofficial.hide_one_hand')}
								checked={spotterPrefs.onehand === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, onehand: data.checked ? 'hide' : 'flag'})}
							/>
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.unofficial.hide_alpha')}
								checked={spotterPrefs.alpha === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, alpha: data.checked ? 'hide' : 'flag'})}
							/>
						</Form.Group>
						<Form.Group grouped>
							<Header as='h4'>{t('fbb.settings.optimizations.title')}</Header>
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.optimizations.hide_non_optimal')}
								checked={spotterPrefs.nonoptimal === 'hide'}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, nonoptimal: data.checked ? 'hide' : 'flag'})}
							/>
							{view === 'crewgroups' && (
								<Form.Field
									control={Checkbox}
									label={t('fbb.settings.optimizations.prioritize_coverage')}
									checked={spotterPrefs.noncoverage === 'hide'}
									onChange={(e, data) => setSpotterPrefs({...spotterPrefs, noncoverage: data.checked ? 'hide' : 'show'})}
								/>
							)}
						</Form.Group>
						<Form.Group grouped>
							<Header as='h4'>{t('fbb.settings.user_prefs.title')}</Header>
							{userType === 'player' && (
								<Form.Field
									placeholder={t('hints.filter_by_availability')}
									control={Dropdown}
									clearable
									selection
									options={usableFilterOptions}
									value={soloPrefs.usable}
									onChange={(e, { value }) => setSoloPrefs({...soloPrefs, usable: value})}
								/>
							)}
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.user_prefs.show_ship_ability')}
								checked={soloPrefs.shipAbility === 'show'}
								onChange={(e, data) => setSoloPrefs({...soloPrefs, shipAbility: data.checked ? 'show' : 'hide'})}
							/>
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.user_prefs.confirm_solves')}
								checked={spotterPrefs.confirmSolves}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, confirmSolves: data.checked})}
							/>
							<Form.Field
								control={Checkbox}
								label={t('fbb.settings.user_prefs.hide_unpublished_crew')}
								checked={spotterPrefs.hideUnpublishedCrew}
								onChange={(e, data) => setSpotterPrefs({...spotterPrefs, hideUnpublishedCrew: data.checked })}
							/>
						</Form.Group>
					</div>
				</Form>
				{showWarning && (
					<div>
						<Icon name='warning sign' color='yellow' /> {t('fbb.settings.warn')}
					</div>
				)}
			</Message>

			{view === 'crewgroups' && (
				<CrewGroups solver={solver} optimizer={optimizer}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			)}
			{view === 'crewtable' && (
				<CrewTable solver={solver} optimizer={optimizer}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			)}

			<div style={{ margin: '2em 0' }}>
				<CrewChecklist key={solver.id}
					optimizer={optimizer}
					attemptedCrew={spotter.attemptedCrew}
					updateAttempts={updateCrewAttempts}
				/>
			</div>

			<Message style={{ margin: '1em 0' }}>
				<Message.Content>
					<Message.Header>{t('fbb.tips.title')}</Message.Header>
					<p><b>One hand exceptions</b> are crew who might be ruled out based on an unofficial rule that eliminates traits if they are shared by more than a handful of crew.</p>
					<p><b>{t('fbb.tips.one_hand_exceptions_a')}</b> {t('fbb.tips.one_hand_exceptions_b')}</p>
					<p><b>{t('fbb.tips.alpha_exceptions_a')}</b> {t('fbb.tips.alpha_exceptions_b')}</p>
					<p><b>{t('fbb.tips.non_optimals_a')}</b> {t('fbb.tips.non_optimals_b')}</p>
					<p><b>{t('fbb.tips.coverage_a')}</b> {t('fbb.tips.coverage_b')}</p>
					<p><b>{t('fbb.tips.trait_colors_a')}</b> {t('fbb.tips.trait_colors_b')}</p>
					<p><b>{t('fbb.tips.trait_numbers_a')}</b> {t('fbb.tips.trait_numbers_b')}</p>
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
		const viableCombos: ViableCombo[] = [];
		crewList.forEach(crew => {
			Object.values(crew.node_matches).forEach(node => {
				const existing: ViableCombo | undefined = viableCombos.find(combo =>
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
		const optimalCombos: ViableCombo[] = [];
		viableCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
			const supersets: ViableCombo[] = optimalCombos.filter(optimal =>
				optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
			);
			const newNodes: number[] = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes.includes(node)).length === 0);
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
		const node: SolverNode | undefined = solver.nodes.find(node => node.index === nodeIndex);
		if (!node) return;

		// Reset solved traits to ? if passed an empty traits array
		if (traits.length === 0) {
			traits = Array(node.solve.length).fill('?');
		}

		// Keep list of crew who can confirm this solve
		//	If all traits solved AND crew array set, solve status will be unconfirmed
		//	If all traits solved AND crew array empty, solve status will be confirmed
		const unconfirmedCrew: string[] = [];
		if (node.solveStatus !== SolveStatus.Unconfirmed && !bypassConfirmation) {
			solver.crew.slice().filter(crew =>
				!!crew.node_matches[`node-${nodeIndex}`]
					&& traits.every(trait => crew.traits.includes(trait))
			).forEach(crew => {
				unconfirmedCrew.push(crew.symbol);
			});
		}

 		const solves: Solve[] = JSON.parse(JSON.stringify(spotter.solves));
		const solve: Solve | undefined = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
			solve.crew = unconfirmedCrew;
		}
		else {
			solves.push({ node: nodeIndex, traits, crew: unconfirmedCrew });
		}

		updateSpotter({...spotter, solves});
 	}

	function onCrewMarked(crewSymbol: string): void {
		if (!spotter.attemptedCrew.includes(crewSymbol)) {
			const attemptedCrew: string[] = spotter.attemptedCrew.slice();
			attemptedCrew.push(crewSymbol);
			updateSpotter({...spotter, attemptedCrew});
		}
	}

	function updateCrewAttempts(attemptedCrew: string[]): void {
		updateSpotter({...spotter, attemptedCrew});
	}
};

export default ChainCrew;
