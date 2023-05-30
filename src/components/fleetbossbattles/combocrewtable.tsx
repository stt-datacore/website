import React from 'react';
import { Header, Dropdown, Form, Checkbox, Table, Rating, Icon, Popup } from 'semantic-ui-react';
import { Link } from 'gatsby';

import MarkButtons from './markbuttons';
import { getOptimalCombos, isCrewOptimal } from './fbbutils';

import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewTraitMatchesCell } from '../../components/crewtables/commoncells';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import allTraits from '../../../static/structured/translation_en.json';
import { OpenNode } from '../../model/boss'
import { NodeMatch, Player, PlayerCrew } from '../../model/player';

type ComboCrewTableProps = {
	comboId: string;
	openNodes: OpenNode[];
	traitPool: string[];
	allMatchingCrew: PlayerCrew[];
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const ComboCrewTable = (props: ComboCrewTableProps) => {
	const { comboId, openNodes } = props;

	const [optimalCombos, setOptimalCombos] = React.useState<NodeMatch[]>([]);
	const [traitCounts, setTraitCounts] = React.useState({});
	const [usableFilter, setUsableFilter] = React.useState('');
	const [showOptimalsOnly, setShowOptimalsOnly] = React.useState(true);

	React.useEffect(() => {
		if (showOptimalsOnly) {
			const optimalCombos = getOptimalCombos(props.allMatchingCrew.filter(crew => filterByUsable(crew)));
			setOptimalCombos([...optimalCombos]);
		}
		else {
			setOptimalCombos([]);
		}
	}, [props.allMatchingCrew, usableFilter, showOptimalsOnly]);

	React.useEffect(() => {
		const data = props.allMatchingCrew.filter(crew => filterByOptimal(crew));
		const traitCountsByNode = {};
		openNodes.forEach(node => {
			const traitCounts = {};
			props.traitPool.forEach(trait => {
				traitCounts[trait] = data.filter(crew => crew.node_matches ? crew.node_matches[`node-${node.index}`]?.traits.includes(trait) : false).length;
			});
			traitCountsByNode[`node-${node.index}`] = traitCounts;
		});
		setTraitCounts({...traitCountsByNode});
	}, [optimalCombos]);

	const filterByUsable = (crew) => {
		if (usableFilter === 'portal' && !crew.in_portal) return false;
		if ((usableFilter === 'owned' || usableFilter === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (usableFilter === 'thawed' && crew.only_frozen) return false;
		return true;
	};

	const filterByOptimal = (crew) => {
		if (!showOptimalsOnly) return true;
		return isCrewOptimal(crew, optimalCombos);
	};

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew' },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'nodes_rarity', title: 'Coverage', reverse: true }
	];

	openNodes.forEach(node => {
		const renderTitle = (node) => {
			const formattedOpen = node.traitsKnown.map((trait, idx) => (
				<span key={idx}>
					{idx > 0 ? <><br />+ </> : <></>}{allTraits.trait_names[trait]}
				</span>
			)).reduce((prev, curr) => [prev, curr], []);
			const hidden = Array(node.hiddenLeft).fill('?').join(' + ');
			return (
				<React.Fragment>
					{formattedOpen}
					<br/>+ {hidden}
				</React.Fragment>
			);
		};
		const tableCol = {
			width: 1,
			column: `node_matches.node-${node.index}.traits.length`,
			title: renderTitle(node),
			reverse: true,
			tiebreakers: ['nodes_rarity']
		};
		tableConfig.push(tableCol);
	});

	tableConfig.push({ width: 1, title: 'Trial' });

	const usableFilterOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'portal', value: 'portal', text: 'Only show crew in portal' },
		{ key: 'owned', value: 'owned', text: 'Only show owned crew' },
		{ key: 'thawed', value: 'thawed', text: 'Only show unfrozen crew' }
	];

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Crew</Header>
			<p>Search for crew that satisfy the conditions of the remaining unsolved nodes. Use the buttons in the trial column to mark crew that have been tried.</p>
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
				id={`comboCrewTable/${comboId}`}
				data={props.allMatchingCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx ?? -1)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType as string)}
				showFilterOptions={true}
			/>
			<div style={{ marginTop: '1em' }}>
				<p><i>Optimal Crew</i> are the crew you should try first for efficient use of valor; they exclude crew whose matching traits are a subset of another possible crew for that node.</p>
				<p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>
				<p><i>Trait Colors</i> are used to help visualize the rarity of each trait per node (column), e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Trait rarity may be affected by your crew filters.</p>
			</div>
		</div>
	);

	function renderTableRow(crew: PlayerCrew, idx: number): JSX.Element {
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
					{crew.nodes_rarity}
				</Table.Cell>
				{openNodes.map(node => {
					const nodeMatches = crew.node_matches ? crew.node_matches[`node-${node.index}`] : null;
					if (!nodeMatches) return <Table.Cell key={node.index} />;
					return (
						<CrewTraitMatchesCell key={node.index} crew={crew}
							traitList={nodeMatches.traits} traitCounts={traitCounts[`node-${node.index}`]}
						/>
					);
				})}
				<Table.Cell textAlign='center'>
					<MarkButtons crew={crew} openNodes={openNodes} solveNode={props.solveNode} markAsTried={props.markAsTried} />
				</Table.Cell>
			</Table.Row>
		);
	}

	function descriptionLabel(crew: PlayerCrew): JSX.Element {
		return (
			<div>
				{crew.only_frozen && <Icon name='snowflake' />}
				{!crew.in_portal &&
					<Popup trigger={<Icon name='warning sign' color='yellow' />}
						content={`Non-portal crew may be able to solve some nodes, but they are not the intended solution. Their non-viable traits are hidden automatically`}
					/>
				}
			</div>
		);
	}

	function showThisCrew(crew: PlayerCrew, filters: [], filterType: string): boolean {
		if (!filterByUsable(crew)) return false;
		if (!filterByOptimal(crew)) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}
};

export default ComboCrewTable;
