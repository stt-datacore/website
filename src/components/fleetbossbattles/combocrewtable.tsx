import React from 'react';
import { Header, Message, Form, Dropdown, Checkbox, Table, Rating, Label, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import MarkButtons from './markbuttons';
import { getOptimalCombos, isCrewOptimal, filterAlphaExceptions } from './fbbutils';

import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewTraitMatchesCell } from '../../components/crewtables/commoncells';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import allTraits from '../../../static/structured/translation_en.json';

type ComboCrewTableProps = {
	comboId: string;
	openNodes: any[];
	traitPool: string[];
	allMatchingCrew: any[];
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const ComboCrewTable = (props) => {
	const { comboId, openNodes } = props;

	const [hideAlphaExceptions, setHideAlphaExceptions] = React.useState(false);
	const [hideNonOptimals, setHideNonOptimals] = React.useState(true);
	const [usableFilter, setUsableFilter] = React.useState('');

	const [matchingCrew, setMatchingCrew] = React.useState([]);
	const [optimalCombos, setOptimalCombos] = React.useState([]);
	const [traitCounts, setTraitCounts] = React.useState({});

	React.useEffect(() => {
		const allMatchingCrew = JSON.parse(JSON.stringify(props.allMatchingCrew));
		const matchingCrew = hideAlphaExceptions ? filterAlphaExceptions(allMatchingCrew) : allMatchingCrew;
		setMatchingCrew([...matchingCrew]);

		const optimalCombos = getOptimalCombos(matchingCrew);
		setOptimalCombos([...optimalCombos]);
		const data = matchingCrew.filter(crew => !hideNonOptimals || isCrewOptimal(crew, optimalCombos));
		const traitCountsByNode = {};
		openNodes.forEach(node => {
			const traitCounts = {};
			props.traitPool.forEach(trait => {
				traitCounts[trait] = data.filter(crew => crew.node_matches[`node-${node.index}`]?.traits.includes(trait)).length;
			});
			traitCountsByNode[`node-${node.index}`] = traitCounts;
		});
		setTraitCounts({...traitCountsByNode});
	}, [props.allMatchingCrew, openNodes, hideAlphaExceptions, hideNonOptimals]);

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

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Possible Crew</Header>
			<p>Here are the crew who satisfy the conditions of the remaining unsolved nodes. At least 1 correct solution should be listed for every node. Use the <Icon name='check' /><Icon name='x' /> buttons to mark crew who have been tried.</p>
			<Form>
				<Form.Group grouped>
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
						{(usableFilter === 'owned' || usableFilter === 'thawed') &&
							<span>
								<Icon name='warning sign' color='yellow' /> Correct solutions may not be listed when using this availability setting.
							</span>
						}
					</Form.Group>
					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label='Hide alpha rule exceptions'
							checked={hideAlphaExceptions}
							onChange={(e, data) => setHideAlphaExceptions(data.checked)}
						/>
						<Form.Field
							control={Checkbox}
							label='Hide non-optimal crew'
							checked={hideNonOptimals}
							onChange={(e, data) => setHideNonOptimals(data.checked)}
						/>
					</Form.Group>
				</Form.Group>
			</Form>
			<SearchableTable
				id={`fbbTool/${comboId}/crewtable_`}
				data={matchingCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions={true}
			/>
			<div style={{ marginTop: '1em' }}>
				<p><i>Coverage</i> identifies the number of unsolved nodes that a given crew might be the solution for.</p>
				<p><i>Alpha exceptions</i> are crew who might be ruled out based on their trait names. This unofficial rule has had a high degree of success to date, but may not work in all cases. You should only try alpha exceptions if you've exhausted all other listed options.</p>
				<p><i>Non-optimals</i> are crew whose only matching traits are a subset of traits of another possible crew for that node. You should only try non-optimal crew if you don't own any optimal crew.</p>
				<p><i>Trait colors</i> are used to help visualize the rarity of each trait per node (column), e.g. a gold trait means its crew is the only possible crew with that trait in that node, a purple trait is a trait shared by 2 possible crew in that node, a blue trait is shared by 3 possible crew, etc. Note that trait exceptions are always orange, regardless of rarity.</p>
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
					{crew.nodes_rarity}
				</Table.Cell>
				{openNodes.map(node => {
					return (
						<Table.Cell key={node.index} textAlign='center'>
							{renderTraits(crew, node.index, traitCounts[`node-${node.index}`])}
						</Table.Cell>
					);
				})}
				<Table.Cell textAlign='center'>
					<MarkButtons crew={crew} openNodes={openNodes} solveNode={props.solveNode} markAsTried={props.markAsTried} />
				</Table.Cell>
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		return (
			<div>
				{!hideAlphaExceptions && !isCrewAlphaCompliant(crew) && <Label color='orange'>Alpha exception</Label>}
				{!hideNonOptimals && !isCrewOptimal(crew, optimalCombos) && <Label color='grey'>Non-optimal</Label>}
				{crew.only_frozen && <Icon name='snowflake' />}
			</div>
		);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (hideNonOptimals && !isCrewOptimal(crew, optimalCombos)) return false;
		if ((usableFilter === 'owned' || usableFilter === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (usableFilter === 'thawed' && crew.only_frozen) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function isCrewAlphaCompliant(crew: any): boolean {
		return crew.alpha_rule.compliant > 0;
	}

	function renderTraits(crew: any, index: number, traitCounts: any): JSX.Element {
		const alphaTest = openNodes.find(open => open.index === index).alphaTest;
		const colorize = (trait: string) => {
			// Trait is alpha rule exception
			if (trait.localeCompare(alphaTest) === -1) {
				return {
					background: '#f2711c',
					color: 'white'
				};
			}
			let background = 'grey', color = 'white';
			if (traitCounts[trait] === 1) {
				background = '#fdd26a';
				color = 'black';
			}
			else if (traitCounts[trait] === 2) {
				background = '#aa2deb';
			}
			else if (traitCounts[trait] === 3) {
				background = '#5aaaff';
			}
			else if (traitCounts[trait] === 4) {
				background = '#50aa3c';
			}
			else if (traitCounts[trait] === 5) {
				background = '#9b9b9b';
			}
			return { background, color };
		};

		const nodeMatches = crew.node_matches[`node-${index}`];
		if (!nodeMatches) return (<></>);

		return (
			<React.Fragment>
				{nodeMatches.traits.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
					<Label key={idx} style={colorize(trait)}>
						{allTraits.trait_names[trait]}
					</Label>
				)).reduce((prev, curr) => [prev, ' ', curr], [])}
			</React.Fragment>
		);
	}
};

export default ComboCrewTable;
