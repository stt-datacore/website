import React from 'react';
import { Header, Dropdown, Message, Form, Checkbox, Table, Rating, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { CrewTraitMatchesCell } from '../components/crewtables/commoncells';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { useStateWithStorage } from '../utils/storage';

import allTraits from '../../static/structured/translation_en.json';

const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

const AllDataContext = React.createContext();

type FleetBossBattlesProps = {
	playerData: any;
	allCrew: any[];
};

const FleetBossBattles = (props: FleetBossBattlesProps) => {
	const { playerData } = props;

	const [fleetbossData, ] = useStateWithStorage('tools/fleetbossData', undefined);

	const allCrew = JSON.parse(JSON.stringify(props.allCrew));

	// Calculate highest owned rarities
	allCrew.forEach(ac => {
		const owned = playerData.player.character.crew.filter(oc => oc.symbol === ac.symbol);
		ac.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
		ac.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal === 0).length === 0;
	});

	const allData = {
		playerData,
		allCrew,
		bossData: fleetbossData
	};

	return (
		<AllDataContext.Provider value={allData}>
			<div style={{ marginBottom: '1em' }}>
				Use this tool to help activate combo chain bonuses in a fleet boss battle. Warning: this feature is still in development.
			</div>
			<ComboPicker />
		</AllDataContext.Provider>
	);
};

const ComboPicker = () => {
	const allData = React.useContext(AllDataContext);

	const [activeBoss, setActiveBoss] = React.useState(undefined);
	const [combo, setCombo] = React.useState(undefined);

	React.useEffect(() => {
		if (activeBoss) {
			const boss = allData.bossData.statuses.find(b => b.id === activeBoss);
			const comboIndex = boss.combo.previous_node_counts.length;
			const combo = {
				id: `${boss.id}-${comboIndex}`,
				difficultyId: boss.difficulty_id,
				traits: boss.combo.traits,
				nodes: boss.combo.nodes
			};
			setCombo({...combo});
		}
	}, [activeBoss]);

	const bossOptions = [];
	const getBossName = (bossSymbol) => {
		return allData.bossData.groups.find(group => group.symbol === bossSymbol).name;
	};
	allData.bossData.statuses.forEach(boss => {
		if (boss.ends_in) {
			const unlockedNodes = boss.combo.nodes.filter(node => node.unlocked_character);
			if (boss.combo.nodes.length - unlockedNodes.length > 0) {
				bossOptions.push(
					{
						key: boss.id,
						value: boss.id,
						text: `${getBossName(boss.group)}, ${DIFFICULTY_NAME[boss.difficulty_id]} (${boss.combo.nodes.length-unlockedNodes.length} open)`
					}
				);
			}
		}
	});

	if (bossOptions.length === 0)
		return (<p>No fleet boss battles are currently open.</p>);

	if (!activeBoss && bossOptions.length === 1)
		setActiveBoss(bossOptions[0].value);

	return (
		<React.Fragment>
			{bossOptions.length > 0 &&
				<Dropdown fluid selection clearable
					placeholder='Select a difficulty'
					options={bossOptions}
					value={activeBoss}
					onChange={(e, { value }) => setActiveBoss(value)}
				/>
			}
			{bossOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			{combo && <ComboSolver combo={combo} />}
		</React.Fragment>
	);
};

type ComboSolverProps = {
	combo: any;
};

const ComboSolver = (props: ComboSolverProps) => {
	const allData = React.useContext(AllDataContext);

	const [combo, setCombo] = React.useState(undefined);
	const [openNodes, setOpenNodes] = React.useState([]);
	const [traitPool, setTraitPool] = React.useState([]);
	const [allMatchingCrew, setAllMatchingCrew] = React.useState([]);
	const [optimalCombos, setOptimalCombos] = React.useState([]);

	React.useEffect(() => {
		if (props.combo) setCombo({...props.combo});
	}, [props.combo]);

	React.useEffect(() => {
		if (!combo) return;

		// The trait pool consists of only possible hidden_traits, not open_traits
		const traits = {};
		combo.traits.forEach(trait => {
			if (!traits[trait]) traits[trait] = { listed: 0, consumed: 0 };
			traits[trait].listed++;
		});

		const openNodes = [];
		let current = false;
		combo.nodes.forEach((node, nodeIndex) => {
			const nodeIsOpen = node.hidden_traits.includes('?');
			if (nodeIsOpen) {
				openNodes.push({...node, comboId: combo.id, index: nodeIndex});
			}
			else {
				node.hidden_traits.forEach(trait => {
					traits[trait].consumed++;
				});
				if (node.unlocked_character?.is_current) current = true;
			}
		});

		const traitPool = [];
		combo.traits.forEach(trait => {
			if (!traitPool.includes(trait) && traits[trait].consumed < traits[trait].listed)
				traitPool.push(trait);
		});

		setOpenNodes([...openNodes]);
		setTraitPool([...traitPool]);
	}, [combo]);

	React.useEffect(() => {
		if (!combo) return;

		const allMatchingCrew = [];
		const allTraitCombos = [];
		allData.allCrew.forEach(crew => {
			if (crew.max_rarity <= MAX_RARITY_BY_DIFFICULTY[combo.difficultyId]) {
				let nodeCoverage = 0;
				const matchesByNode = {};
				openNodes.forEach(node => {
					// Crew must have every open trait
					if (node.open_traits.every(trait => crew.traits.includes(trait))) {
						const nodePool = traitPool.filter(trait => !node.open_traits.includes(trait));
						const traitsMatched = nodePool.filter(trait => crew.traits.includes(trait));
						// Crew must have at least the same number of matching traits as hidden traits
						if (traitsMatched.length >= node.hidden_traits.length) {
							matchesByNode[`node-${node.index}`] = { index: node.index, traits: traitsMatched };
							nodeCoverage++;
							const existing = allTraitCombos.find(combo =>
								combo.traits.length === traitsMatched.length && combo.traits.every(trait => traitsMatched.includes(trait))
							);
							if (existing && !existing.nodes.includes(node.index))
								existing.nodes.push(node.index);
							else if (!existing)
								allTraitCombos.push({ traits: traitsMatched, nodes: [node.index] });
						}
					}
				});
				if (nodeCoverage > 0) {
					const matchedCrew = JSON.parse(JSON.stringify(crew));
					matchedCrew.coverage_rarity = nodeCoverage;
					matchedCrew.node_matches = matchesByNode;
					allMatchingCrew.push(matchedCrew);
				}
			}
		});
		const optimalCombos = [];
		allTraitCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
			const supersets = optimalCombos.filter(optimal =>
				optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
			);
			const newNodes = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes.includes(node)).length === 0);
			if (newNodes.length > 0) combo.nodes = newNodes;
			if (supersets.length === 0 || newNodes.length > 0)
				optimalCombos.push(combo);
		});
		setAllMatchingCrew([...allMatchingCrew]);
		setOptimalCombos([...optimalCombos]);
	}, [traitPool]);

	if (!combo) return (<></>);

	return (
		<React.Fragment>
			<ComboNodesTable comboId={combo.id} nodes={combo.nodes} traits={combo.traits} updateNodes={onUpdateNodes} />
			<ComboCrewTable openNodes={openNodes} traitPool={traitPool} allMatchingCrew={allMatchingCrew} optimalCombos={optimalCombos} />
		</React.Fragment>
	);

	function onUpdateNodes(nodes: any[]): void {
		setCombo({...combo, nodes});
	}
};

type ComboNodesTableProps = {
	comboId: string;
	nodes: any[];
	traits: string[];
	updateNodes: (nodes: any[]) => void;
};

const ComboNodesTable = (props: ComboNodesTableProps) => {
	const { comboId, nodes } = props;

	const [traitOptions, setTraitOptions] = React.useState(undefined);

	React.useEffect(() => {
		const options = props.traits.map((trait, traitIndex) => {
			return {
				key: traitIndex,
				value: trait,
				text: allTraits.trait_names[trait]
			};
		}).sort((a, b) => a.text.localeCompare(b.text));
		setTraitOptions([...options]);
	}, [props.traits]);

	if (!traitOptions) return (<></>);

	return (
		<div style={{ marginTop: '2em' }}>
			<Header as='h4'>Current Combo Chain</Header>
			<p>This table shows the progress of the current combo chain. Update the mystery traits when a node is solved.</p>
			<Form>
				<Table celled selectable striped unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>Given Traits</Table.HeaderCell>
							<Table.HeaderCell>Mystery Traits</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{nodes.map((node, nodeIndex) =>
							<Table.Row key={nodeIndex}>
								<Table.Cell>
									{node.open_traits.map(trait => allTraits.trait_names[trait]).join(' + ')}
								</Table.Cell>
								<Table.Cell>
									<Form.Group inline>
										{node.hidden_traits.map((trait, traitIndex) =>
											<TraitPicker key={`${comboId}-${nodeIndex}-${traitIndex}`}
												nodeIndex={nodeIndex} traitIndex={traitIndex}
												options={traitOptions}
												trait={trait} onTraitChange={handleTraitChange}
											/>
										)}
									</Form.Group>
								</Table.Cell>
							</Table.Row>
						)}
					</Table.Body>
				</Table>
			</Form>
		</div>
	);

	function handleTraitChange(nodeIndex: number, traitIndex: number, newTrait: string): void {
		nodes[nodeIndex].hidden_traits[traitIndex] = newTrait !== '' ? newTrait : '?';
		props.updateNodes(nodes);
	}
};

type TraitPickerProps = {
	nodeIndex: number;
	traitIndex: number;
	options: any[];
	trait: string;
	onTraitChange: (newTrait: string) => void;
};

const TraitPicker = (props: SolverProps) => {
	const [activeTrait, setActiveTrait] = React.useState('?');

	React.useEffect(() => {
		setActiveTrait(props.trait);
	}, [props.trait]);

	return (
		<Form.Field>
			<Dropdown
				placeholder='?'
				clearable
				search
				selection
				options={props.options}
				value={activeTrait}
				onChange={(e, { value }) => handleTraitChange(value)}
				closeOnChange
			/>
		</Form.Field>
	);
	function handleTraitChange(newTrait: string): void {
		setActiveTrait(newTrait);
		props.onTraitChange(props.nodeIndex, props.traitIndex, newTrait);
	}
};

type ComboCrewTableProps = {
	openNodes: any[];
	traitPool: string[];
	allMatchingCrew: any[];
	optimalCombos: any[];
};

const ComboCrewTable = (props) => {
	const allData = React.useContext(AllDataContext);
	const { openNodes, optimalCombos } = props;

	const [data, setData] = React.useState([]);
	const [traitCounts, setTraitCounts] = React.useState({});
	const [usableFilter, setUsableFilter] = React.useState('');
	const [showOptimalsOnly, setShowOptimalsOnly] = React.useState(true);

	React.useEffect(() => {
		const data = props.allMatchingCrew.filter(crew => {
			if (!showOptimalsOnly) return true;
			let isOptimal = false;
			Object.values(crew.node_matches).forEach(node => {
				if (optimalCombos.some(optimal => optimal.nodes.includes(node.index) && optimal.traits.every(trait => node.traits.includes(trait))))
					isOptimal = true;
			});
			return isOptimal;
		});
		setData([...data]);
		const traitCountsByNode = {};
		openNodes.forEach(node => {
			const traitCounts = {};
			props.traitPool.forEach(trait => {
				traitCounts[trait] = data.filter(crew => crew.node_matches[`node-${node.index}`]?.traits.includes(trait)).length;
			});
			traitCountsByNode[`node-${node.index}`] = traitCounts;
		});
		setTraitCounts({...traitCountsByNode});
	}, [props.allMatchingCrew, showOptimalsOnly]);

	const initOptions = {
		column: 'coverage_rarity',
		direction: 'descending'
	};

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew' },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'coverage_rarity', title: 'Coverage', reverse: true }
	];

	openNodes.forEach(node => {
		const renderTitle = (node) => {
			const open = node.open_traits.map(trait => allTraits.trait_names[trait]).join(' + ');
			const hidden = node.hidden_traits.map(trait => trait !== '?' ? allTraits.trait_names[trait] : '?').join(' + ');
			return (
				<React.Fragment>
					{open}
					<br/>+ {hidden}
				</React.Fragment>
			);
		};
		const tableCol = {
			width: 1,
			column: `node_matches.node-${node.index}.traits.length`,
			title: renderTitle(node),
			reverse: true,
			tiebreakers: ['coverage_rarity']
		};
		tableConfig.push(tableCol);
	});

	const usableFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'owned', value: 'owned', text: 'Only show owned crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' }
	];

	return (
		<div style={{ marginTop: '2em' }}>
			<Header as='h4'>Possible Crew</Header>
			<p>Search for crew that satisfy the conditions of the remaining unsolved nodes.</p>
			<div>
				<Form>
					<Form.Group inline>
						<Form.Field
							placeholder='Filter by availability'
							control={Dropdown}
							clearable
							selection
							options={usableFilterOptions}
							value={usableFilter}
							onChange={(e, { value }) => setUsableFilter(value)}
						/>
						<Form.Field
							control={Checkbox}
							label={<label>Only show optimal crew</label>}
							checked={showOptimalsOnly}
							onChange={(e, { checked }) => setShowOptimalsOnly(checked) }
						/>
					</Form.Group>
				</Form>
			</div>
			<SearchableTable
				id={'fleetbossbattles'}
				data={data}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions={true}
				initOptions={initOptions}
			/>
			<div style={{ marginTop: '1em' }}>
				<p><i>Optimal Crew</i> exclude crew whose matching traits are a subset of another matching crew for that node.</p>
				<p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>
				<p><i>Trait Colors</i> are used to help visualize rarity of that trait per node, e.g. a gold trait means its crew (row) is the only possible crew with that trait in that node (column), a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Trait rarity may be affected by your optimal crew preference.</p>
			</div>
		</div>
	);

	function renderTableRow(crew: any, idx: number): JSX.Element {
		return (
			<Table.Row key={idx}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{crew.coverage_rarity}
				</Table.Cell>
				{openNodes.map(node => {
					const nodeMatches = crew.node_matches[`node-${node.index}`];
					if (!nodeMatches) return <Table.Cell key={node.index} />;
					return (
						<CrewTraitMatchesCell key={node.index} crew={crew}
							traitList={nodeMatches.traits} traitCounts={traitCounts[`node-${node.index}`]}
						/>
					);
				})}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		return (
			<div>
				{crew.only_frozen && <Icon name='snowflake' />}
			</div>
		);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if ((usableFilter === 'owned' || usableFilter === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (usableFilter === 'thawed' && crew.only_frozen) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}
};

export default FleetBossBattles;
