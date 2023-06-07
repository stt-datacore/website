import React from 'react';
import { Header, Form, Button, Step, Dropdown, Checkbox, Icon, Message } from 'semantic-ui-react';

import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter, exportDefaults } from './crewexporter';
import { getAllCombos, getComboIndexOf, removeCrewNodeCombo } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';

const filterDefaults = {
	alpha: 'flag',
	nonoptimal: 'hide',
	noncoverage: 'show',
	usable: ''
};

type ChainCrewProps = {
	view: string;
	solver: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
	allCrew: any[];
	dbid: string;
};

const ChainCrew = (props: ChainCrewProps) => {
	const { view, solver, spotter, updateSpotter } = props;

	const [filterPrefs, setFilterPrefs] = useStateWithStorage(props.dbid+'/fbb/filtering', filterDefaults, { rememberForever: true });
	const [exportPrefs, setExportPrefs] = useStateWithStorage(props.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	const [optimizer, setOptimizer] = React.useState(undefined);

	React.useEffect(() => {
		let resolvedCrew = JSON.parse(JSON.stringify(solver.crew));
		if (filterPrefs.alpha === 'hide') resolvedCrew = filterAlphaExceptions(resolvedCrew);

		const optimalCombos = getOptimalCombos(resolvedCrew);

		const rarities = {};
		const filteredGroups = {};
		solver.nodes.filter(node => node.open).forEach(node => {
			const nodeRarities = getRaritiesByNode(node, resolvedCrew);
			rarities[`node-${node.index}`] = nodeRarities;
			filteredGroups[`node-${node.index}`] = filterGroupsByNode(node, resolvedCrew, nodeRarities, optimalCombos, filterPrefs);
		});

		setOptimizer({
			crew: resolvedCrew,
			optimalCombos,
			rarities,
			filtered: {
				settings: filterPrefs,
				groups: filteredGroups
			}
		});
	}, [solver, filterPrefs]);

	const usableFilterOptions = [
		{ key: 'all', text: 'Show all crew', value: '' },
		{ key: 'owned', text: 'Only show owned crew', value: 'owned' },
		{ key: 'thawed', text: 'Only show unfrozen crew', value: 'thawed' }
	];

	if (!optimizer)
		return (<div><Icon loading name='spinner' /> Loading...</div>);

	const openNodes = solver.nodes.filter(node => node.open);
	const showWarning = filterPrefs.usable === 'owned' || filterPrefs.usable === 'thawed' || filterPrefs.alpha === 'hide';

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Solutions</Header>
			<p>
				Here are the crew who satisfy the conditions of the remaining unsolved nodes.{` `}
				{view === 'crewgroups' && <span>Tap a trait if it solves a node. Tap a crew to mark as tried.</span>}
				{view === 'crewtable' && <span>Tap the <Icon name='check' /><Icon name='x' /> buttons to mark crew as tried.</span>}
			</p>

			<Form>
				<Form.Group grouped>
					<Form.Group inline>
						<Form.Field
							placeholder='Filter by availability'
							control={Dropdown}
							clearable
							selection
							options={usableFilterOptions}
							value={filterPrefs.usable}
							onChange={(e, { value }) => setFilterPrefs({...filterPrefs, usable: value})}
						/>
						<Form.Field
							control={Checkbox}
							label='Hide alpha rule exceptions'
							checked={filterPrefs.alpha === 'hide'}
							onChange={(e, data) => setFilterPrefs({...filterPrefs, alpha: data.checked ? 'hide' : 'flag'})}
						/>
						<Form.Field
							control={Checkbox}
							label='Hide non-optimal crew'
							checked={filterPrefs.nonoptimal === 'hide'}
							onChange={(e, data) => setFilterPrefs({...filterPrefs, nonoptimal: data.checked ? 'hide' : 'flag'})}
						/>
						<Form.Field
							control={Checkbox}
							label='Prioritize crew with coverage'
							checked={filterPrefs.noncoverage === 'hide'}
							onChange={(e, data) => setFilterPrefs({...filterPrefs, noncoverage: data.checked ? 'hide' : 'show'})}
						/>
						{showWarning &&
							<div>
								<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed with the selected filters.
							</div>
						}
					</Form.Group>
				</Form.Group>
			</Form>

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

			<CrewChecklist key={solver.id} crewList={props.allCrew}
				attemptedCrew={spotter.attemptedCrew} updateAttempts={updateCrewAttempts}
			/>

			<Message style={{ margin: '1em 0' }}>
				<Message.Content>
					<Message.Header>Tips</Message.Header>
					<p><i>Alpha exceptions</i> are crew who might be ruled out based on an unofficial rule that eliminates some of their traits by name. You should only try alpha exceptions if you've exhausted all other listed options.</p>
					<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible solution for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
					<p><i>Coverage</i> identifies crew who might be solutions to multiple nodes. In group view, crew with coverage are italicized. In crew view, the number of potential nodes is listed.</p>
					<p><i>Trait colors</i> help visualize the rarity of each trait per node, e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that potential alpha exceptions are always orange, regardless of rarity.</p>
					<p><i>Trait numbers</i> identify how many remaining nodes that trait is likely a solution for, based on an unofficial rule that duplicate traits in the pool are always a solution.</p>
				</Message.Content>
			</Message>

			<CrewFullExporter solver={solver} optimizer={optimizer}
				exportPrefs={exportPrefs} setExportPrefs={setExportPrefs}
			/>
		</div>
	);

	function filterAlphaExceptions(crewList: any[]): any[] {
		return crewList.filter(crew => {
			if (crew.alpha_rule.compliant === 0) return false;
			crew.alpha_rule.exceptions.forEach(combo => {
				removeCrewNodeCombo(crew, combo.index, combo.combo);
			});
			return crew.nodes_rarity > 0;
		});
	}

	function getOptimalCombos(crewList: any[]): any[] {
		const viableCombos = [];
		crewList.forEach(crew => {
			Object.values(crew.node_matches).forEach(node => {
				const existing = viableCombos.find(combo =>
					combo.traits.length === node.traits.length && combo.traits.every(trait => node.traits.includes(trait))
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
		const optimalCombos = [];
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

	function getRaritiesByNode(node: any, crewList: any[]): any {
		const possibleCombos = [];
		const traitRarity = {};
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

	function filterGroupsByNode(node: any, crewList: any[], rarities: any, optimalCombos: any[], filters: any): any {
		const comboRarity = rarities.combos;
		const traitRarity = rarities.traits;
		const traitGroups = [];
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
			const crewList = matchingCrew.filter(crew =>
				(filters.noncoverage !== 'hide' || highestCoverage === 1 || crew.nodes_rarity > 1)
					&& (filters.usable !== 'owned' || crew.highest_owned_rarity > 0)
					&& (filters.usable !== 'thawed' || (crew.highest_owned_rarity > 0 && !crew.only_frozen))
			);

			let alphaExceptions = 0;
			traits.forEach(trait => { if (trait.localeCompare(node.alphaTest) < 0) alphaExceptions++; });
			const alphaException = traits.length - alphaExceptions < node.hiddenLeft;

			const crewSet = [];
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

			const notes = { alphaException, uniqueCrew, nonPortal, nonOptimal };

			return {
				traits,
				score,
				crewList,
				notes
			};
		}).filter(row =>
			row.crewList.length > 0
				&& (filters.nonoptimal === 'flag' || !row.notes.nonOptimal)
		);
	}

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		const solves = spotter.solves;
		let solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
		}
		else {
			solve = solver.nodes[nodeIndex].solve;
			spotter.solves.push({ node: nodeIndex, traits });
		}
		updateSpotter({...spotter, solves: spotter.solves});
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
