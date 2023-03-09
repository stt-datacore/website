import React from 'react';
import { Header, Form, Button, Dropdown, Checkbox, Icon } from 'semantic-ui-react';

import CrewGroups from './crewgroups';
import CrewTable from './crewtable';
import CrewChecklist from './crewchecklist';
import { CrewFullExporter, exportDefaults } from './crewexporter';
import { filterAlphaExceptions, getOptimalCombos, getTraitCountsByNode } from './fbbutils';

import { useStateWithStorage } from '../../utils/storage';

type ChainCrewProps = {
	chain: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
	openNodes: any[];
	allMatchingCrew: any[];
	allCrew: any[];
};

const ChainCrew = (props: ChainCrewProps) => {
	const { chain, spotter, updateSpotter } = props;

	const [exportPrefs, setExportPrefs] = useStateWithStorage(chain.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	return (
		<React.Fragment>
			<CrewFinder chain={chain} spotter={spotter} updateSpotter={updateSpotter}
				openNodes={props.openNodes} allMatchingCrew={props.allMatchingCrew}
				exportPrefs={exportPrefs}
			/>
			<CrewChecklist chainId={chain.id}
				crewList={props.allCrew}
				attemptedCrew={spotter.attemptedCrew} updateAttempts={updateCrewAttempts}
			/>
			<CrewFullExporter chain={chain}
				openNodes={props.openNodes} allMatchingCrew={props.allMatchingCrew}
				exportPrefs={exportPrefs} setExportPrefs={setExportPrefs}
			/>
		</React.Fragment>
	);

	function updateCrewAttempts(attemptedCrew: string[]): void {
		updateSpotter({...spotter, attemptedCrew});
	}
};

const finderDefaults = {
	view: 'groups',
	alpha: 'flag',
	optimal: 'hide',
	usable: ''
};

type CrewFinderProps = {
	chain: any;
	spotter: any;
	updateSpotter: (spotter: any) => void;
	openNodes: any[];
	allMatchingCrew: any[];
	exportPrefs: any;
};

const CrewFinder = (props: CrewFinderProps) => {
	const { chain, spotter, updateSpotter, openNodes } = props;

	const [finderPrefs, setFinderPrefs] = useStateWithStorage(chain.dbid+'/fbb/finder', finderDefaults, { rememberForever: true });

	const [matchingCrew, setMatchingCrew] = React.useState([]);
	const [optimalCombos, setOptimalCombos] = React.useState([]);
	const [traitCounts, setTraitCounts] = React.useState({});

	React.useEffect(() => {
		let matchingCrew = JSON.parse(JSON.stringify(props.allMatchingCrew));
		if (finderPrefs.alpha === 'hide') matchingCrew = filterAlphaExceptions(matchingCrew);
		setMatchingCrew([...matchingCrew]);

		const optimalCombos = getOptimalCombos(matchingCrew);
		setOptimalCombos([...optimalCombos]);

		const traitCountsByNode = {};
		openNodes.forEach(node => {
			traitCountsByNode[`node-${node.index}`] = getTraitCountsByNode(node, matchingCrew);
		});
		setTraitCounts({...traitCountsByNode});
	}, [props.allMatchingCrew, openNodes, finderPrefs.alpha]);

	const alphaOptions = [
		{ key: 'flag', text: 'Flag alpha rule exceptions', value: 'flag' },
		{ key: 'hide', text: 'Hide alpha rule exceptions', value: 'hide' }
	];

	const optimalOptions = [
		{ key: 'flag', text: 'Flag non-optimal crew', value: 'flag' },
		{ key: 'hide', text: 'Hide non-optimal crew', value: 'hide' }
	];

	const usableFilterOptions = [
		{ key: 'all', text: 'Show all crew', value: '' },
		{ key: 'owned', text: 'Only show owned crew', value: 'owned' },
		{ key: 'thawed', text: 'Only show unfrozen crew', value: 'thawed' }
	];

	const crewFilters = {
		hideNonOptimals: finderPrefs.optimal === 'hide',
		usableFilter: finderPrefs.usable
	};

	if (matchingCrew.length === 0)
		return (<div><Icon loading name='spinner' /> Loading...</div>);

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Crew</Header>
			<p>Here are the crew who satisfy the conditions of the remaining unsolved nodes. At least 1 correct solution should be listed for every node.</p>
			<Form>
				<Form.Group grouped>
					<Form.Group inline>
						<Button content={finderPrefs.view === 'groups' ? 'Search for crew' : 'Group by traits'}
							size='large' icon={finderPrefs.view === 'groups' ? 'search' : 'object group'}
							onClick={() => setFinderPrefs({...finderPrefs, view: finderPrefs.view === 'groups' ? 'table' : 'groups'})} />
						<Form.Field
							placeholder='Filter by availability'
							control={Dropdown}
							clearable
							selection
							options={usableFilterOptions}
							value={finderPrefs.usable}
							onChange={(e, { value }) => setFinderPrefs({...finderPrefs, usable: value})}
						/>
						{(finderPrefs.usable === 'owned' || finderPrefs.usable === 'thawed') &&
							<span>
								<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed when using this availability setting.
							</span>
						}
					</Form.Group>
					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label='Hide alpha rule exceptions'
							checked={finderPrefs.alpha === 'hide'}
							onChange={(e, data) => setFinderPrefs({...finderPrefs, alpha: data.checked ? 'hide' : 'flag'})}
						/>
						<Form.Field
							control={Checkbox}
							label='Hide non-optimal crew'
							checked={finderPrefs.optimal === 'hide'}
							onChange={(e, data) => setFinderPrefs({...finderPrefs, optimal: data.checked ? 'hide' : 'flag'})}
						/>
					</Form.Group>
				</Form.Group>
			</Form>

			{finderPrefs.view === 'groups' &&
				<CrewGroups
					chainId={chain.id} openNodes={openNodes} allMatchingCrew={props.allMatchingCrew}
					matchingCrew={matchingCrew} optimalCombos={optimalCombos} traitCounts={traitCounts}
					crewFilters={crewFilters} solveTrait={onTraitSolved} markAsTried={onCrewMarked}
					dbid={chain.dbid} exportPrefs={props.exportPrefs}
				/>
			}
			{finderPrefs.view === 'table' &&
				<CrewTable
					chainId={chain.id} openNodes={openNodes}
					matchingCrew={matchingCrew} optimalCombos={optimalCombos} traitCounts={traitCounts}
					crewFilters={crewFilters} solveNode={onNodeSolved} markAsTried={onCrewMarked}
				/>
			}

			<div style={{ marginTop: '1em' }}>
				{finderPrefs.view === 'table' && <p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>}
				<p><i>Alpha exceptions</i> are crew who might be ruled out based on their trait names. This unofficial rule has had a high degree of success to date, but may not work in all cases. You should only try alpha exceptions if you've exhausted all other listed options.</p>
				<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible crew for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
				<p><i>Trait colors</i> are used to help visualize the rarity of each trait per node (column), e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that trait exceptions are always orange, regardless of rarity.</p>
			</div>
		</div>
	);

	function onTraitSolved(nodeIndex: number, trait: string): void {
		const solves = spotter.solves;
		const solve = solves.find(solve => solve.node === nodeIndex);
		const hiddenTraits = solve ? solve.traits : chain.nodes[nodeIndex].hidden_traits;
		if (hiddenTraits.includes(trait)) return;
		let usedTrait = false;
		const solvedTraits = hiddenTraits.map(hiddenTrait => {
			if (hiddenTrait === '?' && !usedTrait) {
				usedTrait = true;
				return trait;
			}
			return hiddenTrait;
		});
		if (solve) {
			solve.traits = solvedTraits;
		}
		else {
			solves.push({
				node: nodeIndex,
				traits: solvedTraits
			});
		}
		updateSpotter({...spotter, solves});
	}

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		let solvedIndex = 0;
		const solvedTraits = chain.nodes[nodeIndex].hidden_traits.map(hiddenTrait => {
			if (hiddenTrait === '?') return traits[solvedIndex++];
			return hiddenTrait;
		});
		const solves = spotter.solves;
		const solve = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = solvedTraits;
		}
		else {
			solves.push({
				node: nodeIndex,
				traits: solvedTraits
			});
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
};

export default ChainCrew;
