import React from 'react';
import { Link } from 'gatsby';
import { Segment, Header, Grid, Table, Pagination, Dropdown, Checkbox, Icon, Button } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { Constellation, ConstellationMap, Polestar, PolestarCombo, categorizeKeystones } from "../../model/keystone";
import { GlobalContext } from '../../context/globalcontext';
import { findPolestars } from '../../utils/retrieval';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { printISM } from '../retrieval/context';
import { useStateWithStorage } from '../../utils/storage';
import { AvatarView } from '../item_presenters/avatarview';
import { CrewHoverStat } from '../hovering/crewhoverstat';

type PolestarsProps = {
	crew: CrewMember;
};

export const Polestars = (props: PolestarsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { crew } = props;
	const { ITEM_ARCHETYPES } = globalContext.localized;
	const [constellation, setConstellation] = React.useState<ConstellationMap | undefined>(undefined);
	const [optimalPolestars, setOptimalPolestars] = React.useState<PolestarCombo[]>([] as PolestarCombo[]);
	const [showPrices, setShowPrices] = useStateWithStorage('polestars_show_prices', false);
	const flexCol = OptionsPanelFlexColumn;
	const isMobile = typeof window !== 'undefined' && window.innerWidth <= DEFAULT_MOBILE_WIDTH;

	React.useEffect(() => {
		const [crates, keystones] = categorizeKeystones(globalContext.core.keystones);
		const crew_keystone_crate = globalContext.core.keystones.find((k) => k.crew_archetype_id === crew.archetype_id) as Constellation;

		// Rarity and skills aren't in keystone crates, but should be used for optimal crew retrieval
		const raritystone = keystones.filter((keystone) =>
			keystone.filter && keystone.filter.type === 'rarity' && keystone.filter.rarity === crew.max_rarity
		);
		const skillstones = keystones.filter((keystone) =>
			keystone.filter && keystone.filter.type === 'skill' && keystone.filter.skill && crew.base_skills[keystone.filter.skill]
		);

		let constellation: ConstellationMap | undefined = undefined;
		let archdata = crew_keystone_crate ? ITEM_ARCHETYPES[crew_keystone_crate.symbol] : undefined;
		if (crew_keystone_crate && crew_keystone_crate.keystones) {
			constellation = {
				name: archdata?.name || crew_keystone_crate.name,
				flavor: archdata?.flavor || crew_keystone_crate.flavor,
				keystones: (crew_keystone_crate.keystones.map(kId => keystones.find(k => k.id === kId)) ?? [] as Polestar[]) as Polestar[],
				raritystone,
				skillstones
			}
		}

		// Use precalculated unique polestars combos if any, otherwise get best chances
		const optimalPolestars = crew.unique_polestar_combos && crew.unique_polestar_combos.length > 0 ?
			optimizeUniquePolestars(crew.unique_polestar_combos) :
			findOptimalPolestars();

		setConstellation(constellation);
		setOptimalPolestars([...optimalPolestars]);
	}, []);

	if (globalContext.core.keystones.length === 0) return <></>;
	if (!constellation) return <></>;

	return (
		<React.Fragment>
			{renderConstellation()}
			{<OptimalPolestars
				showPrices={showPrices}
				setShowPrices={setShowPrices}
				constellation={constellation}
				optimalPolestars={optimalPolestars}

			/>}
		</React.Fragment>
	);

	function optimizeUniquePolestars(crewPolestarCombos: string[][]): PolestarCombo[] {
		// Find optimal polestars, i.e. smallest combinations with best chance of retrieving this crew
		let optimals = [] as PolestarCombo[];
		for (let i = 0; i < crewPolestarCombos.length; i++) {
			let testpolestars = crewPolestarCombos[i];
			optimals.push({
				'count': 1,
				'alts': [],
				'polestars': testpolestars
			});
		}
		return optimals;
	}

	function findOptimalPolestars(): PolestarCombo[] {
		return findPolestars(crew, globalContext.core.crew);
	}

	function renderConstellation(): JSX.Element {
		if (!constellation) return <></>;
		return (
			<Segment>
				<Header as='h4'>{constellation.name}</Header>
				<div dangerouslySetInnerHTML={{ __html: constellation.flavor }} />
				<div style={{overflowX: 'auto'}}>
					<Grid columns={isMobile ? 3 : 5} centered padded>
						{constellation.keystones.map((kk, idx) => {
							let archdata = ITEM_ARCHETYPES[kk.symbol];
							return (<Grid.Column key={idx} textAlign='center'>
								<div style={{...flexCol, gap: '0.5em', justifyContent: 'space-evenly'}}>
									<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${kk.icon.file.slice(1).replace(/\//g, '_')}`} />
									<Link to={`/?search=trait:${archdata?.name || kk.short_name}`}>
									<span style={{ fontWeight: 'bolder' }}>
										{archdata?.name || kk.short_name}
									</span>
									</Link>
								</div>
							</Grid.Column>)
						})}
					</Grid>
				</div>
			</Segment>
		);
	}
};

type OptimalPolestarsProps = {
	showPrices: boolean;
	setShowPrices: (value: boolean) => void;
	constellation: ConstellationMap;
	optimalPolestars: PolestarCombo[];
};

const OptimalPolestars = (props: OptimalPolestarsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt, ITEM_ARCHETYPES } = globalContext.localized;
	const { market, reloadMarket } = globalContext;
	const { constellation, optimalPolestars, showPrices, setShowPrices } = props;

	const [paginationPage, setPaginationPage] = React.useState(1);
	const [paginationRows, setPaginationRows] = React.useState(10);
	const [expanded, setExpanded] = React.useState<number | undefined>(undefined);

	React.useEffect(() => {
		if (!Object.keys(market)?.length) {
			reloadMarket();
		}
	}, [showPrices]);

	const isMobile = typeof window !== 'undefined' && window.innerWidth <= DEFAULT_MOBILE_WIDTH;

	const pagingOptions = [
		{ key: '0', value: 10, text: '10' },
		{ key: '1', value: 25, text: '25' },
		{ key: '2', value: 50, text: '50' },
		{ key: '3', value: 100, text: '100' }
	];

	const filterTraits = (polestar, trait) => {
		if (polestar.filter.type === 'trait') {
			return polestar.filter.trait === trait;
		}
		if (polestar.filter.type === 'rarity') {
			return `crew_max_rarity_${polestar.filter.rarity}` === trait;
		}
		if (polestar.filter.type === 'skill') {
			return polestar.filter.skill === trait;
		}
	};

	if (optimalPolestars.length === 0) return <></>;

	const crewPolestars = constellation.keystones.concat(constellation.raritystone.concat(constellation.skillstones));

	// Pagination
	let totalPages = Math.ceil(optimalPolestars.length / paginationRows);
	const data = optimalPolestars.slice(paginationRows * (paginationPage - 1), paginationRows * paginationPage);

	return (<>
		<CrewHoverStat targetGroup='polestars' />
		<Segment>
			<Header as='h4'>{t('polestars.optimal')}</Header>

			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap'}}>
				<div>{t('polestars.best_chance_long')}</div>
				<div style={{display: 'flex', alignItems: 'center', gap: '0.5em', marginTop: '0.5em'}}>
					<Checkbox label={t('retrieval.price.all')}
						checked={showPrices}
						onChange={(e, { checked }) => setShowPrices(!!checked)}
					/>
					<Button
						disabled={!showPrices}
						icon='refresh'
						style={{cursor: 'pointer'}}
						onClick={() => reloadMarket()}
					/>
				</div>
			</div>
			<Table celled selectable striped collapsing unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell width={1}>{t('polestars.best_chance_short')}</Table.HeaderCell>
						<Table.HeaderCell width={3} textAlign='center'>{t('polestars.combo')}</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((optimal, idx) => (
						<Table.Row key={idx}>
							<Table.Cell>
								<div style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
									{(1/optimal.count*100).toFixed()}%
								</div>
								{optimal.count > 1 && (
								<div style={{ gridArea: 'description' }}>
									{tfmt('polestars.shared_with_crew', {
										crew: optimal.alts.map((alt) => (
											<Link key={alt.symbol} to={`/crew/${alt.symbol}/`}>
												{alt.name}
											</Link>
										)).reduce((prev, curr) => prev ? <>{prev}, {curr}</> : curr)
									})}
								</div>
								)}
							</Table.Cell>
							<Table.Cell
								onClick={() => {
									if (optimal.count > 1) {
										if (expanded === idx) {
											setExpanded(undefined);
										}
										else {
											setExpanded(idx);
										}
									}
								}}
								style={{ cursor: optimal.count > 1 ? (expanded === idx ? 'zoom-out' : 'zoom-in') : undefined }}
								>
								{renderComboGrid(optimal)}
								{expanded === idx && (<>
									<div style={{...OptionsPanelFlexRow, margin: '1em 0', gap: '1em', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-evenly'}}>
										{optimal.alts.map((alt) => (
											<div style={{
												...OptionsPanelFlexColumn,
												justifyContent: 'flex-start',
												alignItems: 'center',
												gap: '0.5em',
												width: '10em'
												}}>
												<AvatarView
													targetGroup='polestars'
													size={64}
													mode='crew'
													item={alt}
													/>
												<Link key={alt.symbol} to={`/crew/${alt.symbol}/`} style={{ textAlign: 'center'}}>
													{alt.name}
												</Link>
											</div>
										))}
									</div>
								</>)}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={8}>
							<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '1em'}}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
							/>
							<span style={{ paddingLeft: isMobile ? undefined : '2em' }}>
								{t('global.rows_per_page')}:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={paginationRows}
									onChange={(event, { value }) => { setPaginationPage(1); setPaginationRows(value as number); }}
								/>
							</span>
							</div>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</Segment>
	</>);

	function renderComboGrid(polestarCombo: PolestarCombo): JSX.Element {
		const comboColumns = polestarCombo.polestars.map((trait, idx) => {
			const polestar = crewPolestars.find((op) => filterTraits(op, trait));
			// Catch when optimal combos include a polestar that isn't yet in DataCore's keystones list
			let archdata = polestar ? ITEM_ARCHETYPES[polestar.symbol] : undefined;
			const polestarName = archdata?.name || (polestar ? polestar.short_name : trait.slice(0, 1).toUpperCase()+trait.slice(1));
			const polestarFile = polestar ? polestar.icon.file : '/items_keystones_'+trait+'.png';
			return (
				<Grid.Column key={idx} textAlign='center' mobile={8} tablet={5} computer={4}>
					<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestarFile.slice(1).replace(/\//g, '_')}`} />
					<br />{polestarName}
					{showPrices && <div style={{display: 'flex', justifyContent: 'center'}}>{printISM(market[polestar?.id ?? ""]?.low ?? 0)}</div>}
				</Grid.Column>
			);
		});
		return (
			<Grid columns={4} centered padded>
				{comboColumns}
			</Grid>
		);
	}
};
