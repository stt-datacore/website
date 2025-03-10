import React from 'react';
import { Table, Rating, Label, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { MarkCrew } from './markbuttons';
import { ListedTraits } from './listedtraits';
import { isNodeOpen, getStyleByRarity } from './fbbutils';

import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';

import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import { BossCrew, Solver, Optimizer, TraitRarities, ViableCombo } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { TinyShipSkill } from '../item_presenters/shipskill';

type CrewTableProps = {
	solver: Solver;
	optimizer: Optimizer;
	solveNode: (nodeIndex: number, traits: string[], bypassConfirmation: boolean) => void;
	markAsTried: (crewSymbol: string) => void;
};

const CrewTable = (props: CrewTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { TRAIT_NAMES } = globalContext.localized;
	const { solver, optimizer } = props;

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: t('base.crew') },
	];

	tableConfig.push({ width: 1, column: 'max_rarity', title: t('base.rarity'), reverse: true, tiebreakers: ['highest_owned_rarity'] });
	if (props.optimizer.prefs.solo.shipAbility === 'show') {
		tableConfig.push({ width: 1, title: t('fbb.columns.ship_ability') });
	}
	tableConfig.push({ width: 1, column: 'nodes_rarity', title: t('fbb.columns.coverage'), reverse: true });

	const openNodes = solver.nodes.filter(node => isNodeOpen(node));
	openNodes.forEach(node => {
		const renderTitle = (node) => {
			const formattedOpen = node.traitsKnown.map((trait, idx) => (
				<span key={idx}>
					{idx > 0 ? <><br />+ </> : <></>}{TRAIT_NAMES[trait]}
				</span>
			)).reduce((prev, curr) => <>{prev} {curr}</>, <></>);
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

	tableConfig.push({ width: 1, title: t('fbb.columns.trial') });

	return (
		<>
		<CrewHoverStat targetGroup='fbb' />

		<SearchableTable
			id={`fbb/${solver.id}/crewtable_`}
			data={optimizer.crew}
			config={tableConfig}
			renderTableRow={(crew, idx) => renderTableRow(crew, idx ?? -1)}
			filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType ?? '')}
			showFilterOptions={true}
		/>
		</>
	);

	function renderTableRow(crew: BossCrew, _idx: number): JSX.Element {
		return (
			<Table.Row key={crew.symbol}>
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
							<CrewTarget targetGroup='fbb' inputItem={crew} >
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
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
				{props.optimizer.prefs.solo.shipAbility === 'show' &&
					<Table.Cell>
						<TinyShipSkill style={{textAlign: "center"}} crew={crew} />
					</Table.Cell>
				}
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
						solveNode={crewSolve} markAsTried={props.markAsTried}
					/>
				</Table.Cell>
			</Table.Row>
		);

		function crewSolve(nodeIndex: number, traits: string[]): void {
			props.solveNode(nodeIndex, traits, true);
		}
	}

	function descriptionLabel(crew: BossCrew): JSX.Element {
		return (
			<div>
				{optimizer.prefs.spotter.onehand === 'flag' && crew.onehand_rule.compliant === 0 && <Label style={{ background: '#ddd', color: '#333' }}>{t('fbb.crew_lists.customize.options.one_hand_exception')}</Label>}
				{optimizer.prefs.spotter.alpha === 'flag' && crew.alpha_rule.compliant === 0 && <Label color='orange'>{t('fbb.crew_lists.customize.options.alpha_exception')}</Label>}
				{optimizer.prefs.spotter.nonoptimal === 'flag' && !isCrewOptimal(crew, optimizer.optimalCombos) && <Label color='grey'>{t('fbb.crew_lists.customize.options.non_optimal')}</Label>}
				{crew.only_frozen && <Icon name='snowflake' />}
				{crew.only_expiring && <Icon name='warning sign' />}
			</div>
		);
	}

	function showThisCrew(crew: BossCrew, filters: [], filterType: string): boolean {
		if (optimizer.prefs.spotter.nonoptimal === 'hide' && !isCrewOptimal(crew, optimizer.optimalCombos)) return false;
		if ((optimizer.prefs.solo.usable === 'owned' || optimizer.prefs.solo.usable === 'thawed') && crew.highest_owned_rarity === 0) return false;
		if (optimizer.prefs.solo.usable === 'thawed' && crew.only_frozen) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function isCrewOptimal(crew: BossCrew, optimalCombos: ViableCombo[]): boolean {
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

	function renderTraits(crew: BossCrew, index: number, traitRarity: TraitRarities): JSX.Element {
		const node = openNodes.find(open => open.index === index);
		if (!node) return (<></>);

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

		const nodeMatches = crew.node_matches[`node-${index}`];
		if (!nodeMatches) return (<></>);

		return (
			<React.Fragment>
				{nodeMatches.traits.sort((a, b) => TRAIT_NAMES[a].localeCompare(TRAIT_NAMES[b])).map((trait, idx) => (
					<Label key={idx} style={colorize(trait)}>
						<ListedTraits traits={[trait]} traitData={solver.traits} />
					</Label>
				)).reduce((prev, curr) => <>{prev} {curr}</>, <></>)}
			</React.Fragment>
		);
	}
};

export default CrewTable;
