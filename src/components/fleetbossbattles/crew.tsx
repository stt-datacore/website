import React from 'react';
import { Header, Form, Dropdown, Checkbox, Icon, Message } from 'semantic-ui-react';

import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter, exportDefaults } from './crewexporter';
import { getAllCombos, getComboIndexOf, removeCrewNodeCombo } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';
import { BossCrew, ExportPreferences, FilteredGroup, FilteredGroups, NodeRarities, NodeRarity, Optimizer, PossibleCombo, SoloPreferences, Solver, SolverNode, Spotter, SpotterPreferences, TraitRarities, ViableCombo } from '../../model/boss';
import { CrewMember } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { crewCopy } from '../../utils/crewutils';

const spotterDefaults = {
	alpha: 'flag',
	onehand: 'flag',
	nonoptimal: 'hide',
	noncoverage: 'show'
} as SpotterPreferences;

const soloDefaults = {
	usable: '',
	shipAbility: 'hide'
} as SoloPreferences;

type ChainCrewProps = {
	view: string;
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
	allCrew: (CrewMember | PlayerCrew)[];
	dbid: string;
};

const ChainCrew = (props: ChainCrewProps) => {
	const { view, solver, spotter, updateSpotter } = props;

	const [spotterPrefs, setSpotterPrefs] = useStateWithStorage<SpotterPreferences>(props.dbid+'/fbb/filtering', spotterDefaults, { rememberForever: true });
	const [soloPrefs, setSoloPrefs] = useStateWithStorage<SoloPreferences>(props.dbid+'/fbb/soloing', soloDefaults, { rememberForever: true });
	const [exportPrefs, setExportPrefs] = useStateWithStorage<ExportPreferences>(props.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	const [optimizer, setOptimizer] = React.useState<Optimizer | undefined>(undefined);

	React.useEffect(() => {
		let resolvedCrew = crewCopy<BossCrew>(solver.crew);
		if (spotterPrefs.onehand === 'hide') resolvedCrew = filterOneHandExceptions(resolvedCrew);
		if (spotterPrefs.alpha === 'hide') resolvedCrew = filterAlphaExceptions(resolvedCrew);

		const optimalCombos = getOptimalCombos(resolvedCrew);

		const rarities = {} as NodeRarities;
		const groups = {} as FilteredGroups;
		solver.nodes.filter(node => node.open).forEach(node => {
			const nodeRarities = getRaritiesByNode(node, resolvedCrew);
			rarities[`node-${node.index}`] = nodeRarities;
			groups[`node-${node.index}`] = filterGroupsByNode(node, resolvedCrew, nodeRarities, optimalCombos, spotterPrefs);
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
							<Form.Field
								placeholder='Filter by availability'
								control={Dropdown}
								clearable
								selection
								options={usableFilterOptions}
								value={soloPrefs.usable}
								onChange={(e, { value }) => setSoloPrefs({...soloPrefs, usable: value})}
							/>
							<Form.Field
								control={Checkbox}
								label='Show ship ability'
								checked={soloPrefs.shipAbility === 'show'}
								onChange={(e, data) => setSoloPrefs({...soloPrefs, shipAbility: data.checked ? 'show' : 'hide'})}
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
					exportPrefs={exportPrefs}
				/>
			}
			{view === 'crewtable' &&
				<CrewTable solver={solver} optimizer={optimizer}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			}

			<CrewChecklist key={solver.id} crewList={props.allCrew as PlayerCrew[]}
				attemptedCrew={spotter.attemptedCrew} updateAttempts={updateCrewAttempts}
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

			<CrewFullExporter solver={solver} optimizer={optimizer}
				exportPrefs={exportPrefs} setExportPrefs={setExportPrefs}
			/>
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

	function getRaritiesByNode(node: SolverNode, crewList: BossCrew[]): NodeRarity {
		const possibleCombos = [] as PossibleCombo[];
		const traitRarity = {} as TraitRarities;
		const crewByNode = crewList.filter(crew => !!crew.node_matches[`node-${node.index}`]);
		crewByNode.forEach(crew => {
			crew.node_matches[`node-${node.index}`].combos.forEach(combo => {
				const existing = possibleCombos.find(possible => possible.combo.every(trait => combo.includes(trait)));
				if (existing) {
					if (crew.in_portal) existing.crew.push(crew.symbol);
				}
				else {
					possibleCombos.push({ combo, crew: crew.in_portal ? [crew.symbol] : []});
				}
			});
			const portalValue = crew.in_portal ? 1 : 0;
			crew.node_matches[`node-${node.index}`].traits.forEach(trait => {
				traitRarity[trait] = traitRarity[trait] ? traitRarity[trait] + portalValue : portalValue;
			});
		});

		return { combos: possibleCombos, traits: traitRarity };
	}

	function filterGroupsByNode(node: SolverNode, crewList: BossCrew[], rarities: NodeRarity, optimalCombos: ViableCombo[], spotterPrefs: SpotterPreferences): FilteredGroup[] {
		const comboRarity = rarities.combos;
		const traitRarity = rarities.traits;
		const traitGroups = [] as string[][];
		const crewByNode = crewList.filter(crew => !!crew.node_matches[`node-${node.index}`]);
		crewByNode.forEach(crew => {
			const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
			const exists = !!traitGroups.find(traits =>
				traits.length === crewNodeTraits.length && traits.every(trait => crewNodeTraits.includes(trait))
			);
			if (!exists) traitGroups.push(crewNodeTraits);
		});

		return traitGroups.map(traits => {
			const score = traits.reduce((prev, curr) => prev + traitRarity[curr], 0);

			const matchingCrew = crewByNode.filter(crew =>
				traits.length === crew.node_matches[`node-${node.index}`].traits.length
					&& traits.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
			);
			const highestCoverage = matchingCrew.reduce((prev, curr) => Math.max(prev, curr.nodes_rarity), 0);
			const crewList = matchingCrew.filter(crew => spotterPrefs.noncoverage !== 'hide' || highestCoverage === 1 || crew.nodes_rarity > 1);

			const oneHandException = crewList.filter(crew => crew.onehand_rule.compliant > 0).length === 0;

			let alphaExceptions = 0;
			traits.forEach(trait => { if (trait.localeCompare(node.alphaTest, 'en') < 0) alphaExceptions++; });
			const alphaException = traits.length - alphaExceptions < node.hiddenLeft;

			const crewSet = [] as string[];
			getAllCombos(traits, node.hiddenLeft).forEach(combo => {
				const combos = comboRarity.find(rarity => rarity.combo.every(trait => combo.includes(trait)));
				if (combos) {
					combos.crew.forEach(crew => {
						if (!crewSet.includes(crew)) crewSet.push(crew);
					});
				}
			});

			// Should never see unique or non-portal tags, if everything in solver works as expected
			const uniqueCrew = crewSet.length === 1;
			const nonPortal = crewSet.length === 0;

			const nodeOptimalCombos = optimalCombos.filter(combos => combos.nodes.includes(node.index)).map(combos => combos.traits);
			const nonOptimal = getComboIndexOf(nodeOptimalCombos, traits) === -1;

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

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		const solves = spotter.solves;
		const solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
		}
		else {
			solves.push({ node: nodeIndex, traits });
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
		updateSpotter({...spotter, attemptedCrew});
	}
};

export default ChainCrew;
