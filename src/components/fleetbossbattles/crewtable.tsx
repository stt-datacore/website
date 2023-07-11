import React from 'react';
import { Table, Rating, Label, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { MarkCrew } from './markbuttons';
import { getStyleByRarity } from './fbbutils';

import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import allTraits from '../../../static/structured/translation_en.json';

type CrewTableProps = {
	solver: any;
	optimizer: any;
	solveNode: (nodeIndex: number, traits: string[]) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewTable = (props: CrewTableProps) => {
	const { solver, optimizer } = props;

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew' },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['highest_owned_rarity'] },
		{ width: 1, column: 'nodes_rarity', title: 'Coverage', reverse: true }
	];

	const openNodes = solver.nodes.filter(node => node.open);
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
			id={`fbb/${solver.id}/crewtable_`}
			data={optimizer.crew}
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
							{renderTraits(crew, node.index, optimizer.rarities[`node-${node.index}`].traits)}
						</Table.Cell>
					);
				})}
				<Table.Cell textAlign='center'>
					<MarkCrew crew={crew} trigger='trial'
						solver={solver} optimizer={optimizer}
						solveNode={props.solveNode} markAsTried={props.markAsTried}
					/>
				</Table.Cell>
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		return (
			<div>
				{optimizer.filtered.settings.alpha === 'flag' && !isCrewAlphaCompliant(crew) && <Label color='orange'>Alpha exception</Label>}
				{optimizer.filtered.settings.nonoptimal === 'flag' && !isCrewOptimal(crew, optimizer.optimalCombos) && <Label color='grey'>Non-optimal</Label>}
				{crew.only_frozen && <Icon name='snowflake' />}
			</div>
		);
	}

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (optimizer.filtered.settings.nonoptimal === 'hide' && !isCrewOptimal(crew, optimizer.optimalCombos)) return false;
		if ((optimizer.filtered.settings.usable === 'owned' || optimizer.filtered.settings.usable === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (optimizer.filtered.settings.usable === 'thawed' && crew.only_frozen) return false;
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

	function renderTraits(crew: any, index: number, traitRarity: any): JSX.Element {
		const node = openNodes.find(open => open.index === index);
		const colorize = (trait: string) => {
			// Trait is alpha rule exception
			if (trait.localeCompare(node.alphaTest) === -1) {
				return {
					background: '#f2711c',
					color: 'white'
				};
			}
			return getStyleByRarity(traitRarity[trait]);
		};
		const traitNameInstance = (trait: string) => {
			const instances = solver.traits.filter(t => t.trait === trait);
			if (instances.length === 1) return allTraits.trait_names[trait];
			const needed = instances.length - instances.filter(t => t.consumed).length;
			return `${allTraits.trait_names[trait]} (${needed})`;
		};

		const nodeMatches = crew.node_matches[`node-${index}`];
		if (!nodeMatches) return (<></>);

		return (
			<React.Fragment>
				{nodeMatches.traits.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
					<Label key={idx} style={colorize(trait)}>
						{traitNameInstance(trait)}
					</Label>
				)).reduce((prev, curr) => [prev, ' ', curr], [])}
			</React.Fragment>
		);
	}
};

export default CrewTable;
