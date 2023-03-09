import React from 'react';
import { Table, Rating, Label, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import MarkButtons from './markbuttons';

import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import allTraits from '../../../static/structured/translation_en.json';

type CrewTableProps = {
	chainId: string;
	openNodes: any[];
	matchingCrew: any[];
	optimalCombos: any[];
	traitCounts: any[];
	crewFilters: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewTable = (props: CrewTableProps) => {
	const { chainId, openNodes, optimalCombos, traitCounts, crewFilters } = props;

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

	return (
		<SearchableTable
			id={`fbbTool/${chainId}/crewtable_`}
			data={props.matchingCrew}
			config={tableConfig}
			renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
			filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
			showFilterOptions={true}
		/>
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
				{!crewFilters.hideAlphaExceptions && !isCrewAlphaCompliant(crew) && <Label color='orange'>Alpha exception</Label>}
				{!crewFilters.hideNonOptimals && !isCrewOptimal(crew, optimalCombos) && <Label color='grey'>Non-optimal</Label>}
				{crew.only_frozen && <Icon name='snowflake' />}
			</div>
		);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (crewFilters.hideNonOptimals && !isCrewOptimal(crew, optimalCombos)) return false;
		if ((crewFilters.usableFilter === 'owned' || crewFilters.usableFilter === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (crewFilters.usableFilter === 'thawed' && crew.only_frozen) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function isCrewAlphaCompliant(crew: any): boolean {
		return crew.alpha_rule.compliant > 0;
	}

	function isCrewOptimal(crew: any, optimalCombos: any[]): boolean {
		let isOptimal = false;
		Object.values(crew.node_matches).forEach(node => {
			if (optimalCombos.find(optimal =>
					optimal.nodes.includes(node.index) &&
					node.traits.length === optimal.traits.length &&
					optimal.traits.every(trait => node.traits.includes(trait))
				))
				isOptimal = true;
		});
		return isOptimal;
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

export default CrewTable;
