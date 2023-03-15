import React from 'react';
import { Header, Form, Button, Step, Dropdown, Checkbox, Icon } from 'semantic-ui-react';

import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter, exportDefaults } from './crewexporter';
import { filterAlphaExceptions, getOptimalCombos, getRaritiesByNode, filterGroupsByNode } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';

const finderDefaults = {
	view: 'groups',
	alpha: 'flag',
	nonoptimal: 'hide',
	usable: ''
};

type ChainCrewProps = {
	solver: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
	allCrew: any[];
	dbid: string;
};

const ChainCrew = (props: ChainCrewProps) => {
	const { solver, spotter, updateSpotter } = props;

	const [finderPrefs, setFinderPrefs] = useStateWithStorage(props.dbid+'/fbb/finder', finderDefaults, { rememberForever: true });
	const [exportPrefs, setExportPrefs] = useStateWithStorage(props.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	const [matchingCrew, setMatchingCrew] = React.useState([]);
	const [matchingRarities, setMatchingRarities] = React.useState({});
	const [matchingGroups, setMatchingGroups] = React.useState({});
	const [optimalCombos, setOptimalCombos] = React.useState([]);

	const handleKeyPress = React.useCallback((event) => {
		if (event.altKey && event.key === 'i') {
			setFinderPrefs(prev => {
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
		let matchingCrew = JSON.parse(JSON.stringify(solver.crew));
		if (finderPrefs.alpha === 'hide') matchingCrew = filterAlphaExceptions(matchingCrew);
		setMatchingCrew([...matchingCrew]);

		const optimalCombos = getOptimalCombos(matchingCrew);
		setOptimalCombos([...optimalCombos]);

		const matchingRarities = {};
		const matchingGroups = {};
		solver.nodes.filter(node => node.open).forEach(node => {
			const nodeRarities = getRaritiesByNode(node, matchingCrew);
			matchingRarities[`node-${node.index}`] = nodeRarities;
			matchingGroups[`node-${node.index}`] = filterGroupsByNode(node, matchingCrew, nodeRarities, optimalCombos, finderPrefs);
		});
		setMatchingRarities({...matchingRarities});
		setMatchingGroups({...matchingGroups});
	}, [solver, finderPrefs]);

	const usableFilterOptions = [
		{ key: 'all', text: 'Show all crew', value: '' },
		{ key: 'owned', text: 'Only show owned crew', value: 'owned' },
		{ key: 'thawed', text: 'Only show unfrozen crew', value: 'thawed' }
	];

	if (matchingCrew.length === 0)
		return (<div><Icon loading name='spinner' /> Loading...</div>);

	const openNodes = solver.nodes.filter(node => node.open);

	return (
		<div style={{ margin: '0' }}>
			<Step.Group>
				<Step active={finderPrefs.view === 'groups'} onClick={() => setFinderPrefs({...finderPrefs, view: 'groups'})}>
					<Icon name='object group' />
					<Step.Content>
						<Step.Title>Group crew by solutions</Step.Title>
						<Step.Description>Tap a trait if it solves a node. Tap a crew to mark as tried.</Step.Description>
					</Step.Content>
				</Step>
				<Step active={finderPrefs.view === 'table'} onClick={() => setFinderPrefs({...finderPrefs, view: 'table'})}>
					<Icon name='search' />
					<Step.Content>
						<Step.Title>Search for individual crew</Step.Title>
						<Step.Description>Tap the <Icon name='check' /><Icon name='x' /> buttons to mark crew as tried.</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>
			<div style={{ margin: '1em 0' }}>
				<p>Here are the crew who satisfy the conditions of the remaining unsolved nodes. At least 1 correct solution should be listed for every node.</p>
				<Form>
					<Form.Group grouped>
						<Form.Group inline>
						</Form.Group>
						<Form.Group inline>
							<Form.Field
								placeholder='Filter by availability'
								control={Dropdown}
								clearable
								selection
								options={usableFilterOptions}
								value={finderPrefs.usable}
								onChange={(e, { value }) => setFinderPrefs({...finderPrefs, usable: value})}
							/>
							<Form.Field
								control={Checkbox}
								label='Hide alpha rule exceptions'
								checked={finderPrefs.alpha === 'hide'}
								onChange={(e, data) => setFinderPrefs({...finderPrefs, alpha: data.checked ? 'hide' : 'flag'})}
							/>
							<Form.Field
								control={Checkbox}
								label='Hide non-optimal crew'
								checked={finderPrefs.nonoptimal === 'hide'}
								onChange={(e, data) => setFinderPrefs({...finderPrefs, nonoptimal: data.checked ? 'hide' : 'flag'})}
							/>
						</Form.Group>
					</Form.Group>
				</Form>
				{(finderPrefs.usable === 'owned' || finderPrefs.usable === 'thawed' || finderPrefs.alpha === 'hide') &&
					<p>
						<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed when using the selected filters.
					</p>
				}
			</div>

			{finderPrefs.view === 'groups' &&
				<CrewGroups solver={solver}
					matchingGroups={matchingGroups} matchingRarities={matchingRarities}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
					exportPrefs={exportPrefs}
				/>
			}
			{finderPrefs.view === 'table' &&
				<CrewTable solver={solver}
					matchingCrew={matchingCrew} matchingRarities={matchingRarities} optimalCombos={optimalCombos}
					solveNode={onNodeSolved} markAsTried={onCrewMarked}
					finderPrefs={finderPrefs}
				/>
			}

			<div style={{ marginTop: '1em' }}>
				{finderPrefs.view === 'table' && <p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>}
				<p><i>Alpha exceptions</i> are crew who could potentially be ruled out based on their trait names. This unofficial rule has had a high degree of success to date, but may not work in all cases. You should only try alpha exceptions if you've exhausted all other listed options.</p>
				<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible crew for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
				<p><i>Trait colors</i> are used to help visualize the rarity of each trait per node, e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that potential alpha exceptions are always orange, regardless of rarity.</p>
			</div>

			<CrewChecklist chainId={solver.id} crewList={props.allCrew}
				attemptedCrew={spotter.attemptedCrew} updateAttempts={updateCrewAttempts}
			/>

			<CrewFullExporter solver={solver}
				matchingGroups={matchingGroups}
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
