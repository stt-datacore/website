import React from 'react';
import { Header, Form, Button, Step, Dropdown, Checkbox, Icon } from 'semantic-ui-react';

import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter, exportDefaults } from './crewexporter';
import { filterAlphaExceptions, getOptimalCombos, getRaritiesByNode, filterGroupsByNode } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';

const filterDefaults = {
	alpha: 'flag',
	nonoptimal: 'hide',
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

	const [resolver, setResolver] = React.useState(undefined);

	const handleKeyPress = React.useCallback((event) => {
		if (event.altKey && event.key === 'i') {
			setFilterPrefs(prev => {
				const newState = prev.nonoptimal === 'hide' ? 'flag' : 'hide';
				return {...prev, nonoptimal: newState};
			});
		}
	}, []);

	React.useEffect(() => {
		document.addEventListener('keydown', handleKeyPress);
		return () => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, [handleKeyPress]);

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

		setResolver({
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

	if (!resolver)
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
						{showWarning &&
							<div>
								<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed with the selected filters.
							</div>
						}
					</Form.Group>
				</Form.Group>
			</Form>

			{view === 'crewgroups' &&
				<CrewGroups solver={solver} resolver={resolver}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
					exportPrefs={exportPrefs}
				/>
			}
			{view === 'crewtable' &&
				<CrewTable solver={solver} resolver={resolver}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			}

			<div style={{ marginTop: '1em' }}>
				{view === 'crewtable' && <p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>}
				<p><i>Alpha exceptions</i> are crew who might be ruled out, based on an unofficial rule that eliminates some of their traits by name. You should only try alpha exceptions if you've exhausted all other listed options.</p>
				<p><i>Uniques</i> are crew whose matching set (and subset) of traits belong to exactly 1 crew in the portal. You should only try unique crew if you've exhausted all other listed options.</p>
				<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible crew for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
				<p><i>Trait colors</i> help visualize the rarity of each trait per node, e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that potential alpha exceptions are always orange, regardless of rarity.</p>
				<p><i>Trait numbers</i> identify how many remaining nodes that trait is likely a solution for, based on an unofficial rule that duplicate traits in the pool are always a solution.</p>
			</div>

			<CrewChecklist key={solver.id} crewList={props.allCrew}
				attemptedCrew={spotter.attemptedCrew} updateAttempts={updateCrewAttempts}
			/>

			<CrewFullExporter solver={solver} resolver={resolver}
				exportPrefs={exportPrefs} setExportPrefs={setExportPrefs}
			/>
		</div>
	);

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
