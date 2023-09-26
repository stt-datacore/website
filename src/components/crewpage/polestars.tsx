import React from 'react';
import { Link } from 'gatsby';
import { Segment, Header, Grid, Table, Pagination, Dropdown } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { Constellation, ConstellationMap, Polestar, PolestarCombo, categorizeKeystones } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';

type PolestarsProps = {
	crew: CrewMember;
};

export const Polestars = (props: PolestarsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { crew } = props;

	const [constellation, setConstellation] = React.useState<ConstellationMap | undefined>(undefined);
	const [optimalPolestars, setOptimalPolestars] = React.useState<PolestarCombo[]>([] as PolestarCombo[]);

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
		if (crew_keystone_crate && crew_keystone_crate.keystones) {
			constellation = {
				name: crew_keystone_crate.name,
				flavor: crew_keystone_crate.flavor,
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
			{<OptimalPolestars constellation={constellation} optimalPolestars={optimalPolestars} />}
		</React.Fragment>
	);

	function optimizeUniquePolestars(crewPolestarCombos: any[]): PolestarCombo[] {
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
		// Generate crewman's list of polestars (traits + rarity + skills)
		let polestars = crew.traits.slice();
		polestars.push('crew_max_rarity_'+crew.max_rarity);
		for (let skill in crew.base_skills) {
			if (crew.base_skills[skill]) polestars.push(skill);
		}
		polestars = polestars.sort((a, b) => a.localeCompare(b));
		// Initialize all valid combinations of polestars with a zero count
		let crewPolestarCombos: PolestarCombo[] = [];
		let f = function(prepoles: string[], traits: string[]) {
			for (let t = 0; t < traits.length; t++) {
				const newpoles = prepoles.slice();
				newpoles.push(traits[t]);
				if (newpoles.length <= 4) {
					crewPolestarCombos.push({
						'count': 0,
						'alts': [],
						'polestars': newpoles
					});
				}
				f(newpoles, traits.slice(t+1));
			}
		}
		f([] as string[], polestars);

		// Find all crew who have any polestars in common
		for (let i = 0; i < globalContext.core.crew.length; i++) {
			if (!globalContext.core.crew[i].in_portal) continue;
			let polesInCommon = [] as string[];
			for (let t = 0; t < crew.traits.length; t++) {
				if (globalContext.core.crew[i].traits.indexOf(crew.traits[t]) >= 0)
					polesInCommon.push(crew.traits[t]);
			}
			// Add 1 to count of every polestar combination in common
			if (polesInCommon.length > 0) {
				// Only consider rarity and skills if at least 1 trait in common
				if (globalContext.core.crew[i].max_rarity == crew.max_rarity)
					polesInCommon.push('crew_max_rarity_'+crew.max_rarity);
				for (let skill in globalContext.core.crew[i].base_skills) {
					if (globalContext.core.crew[i].base_skills[skill] && crew.base_skills[skill])
						polesInCommon.push(skill);
				}
				crewPolestarCombos.forEach(combo => {
					if (polesInCommon.length >= (combo.polestars?.length ?? 0)) {
						if (combo.polestars?.every(polestar => polesInCommon.indexOf(polestar) >= 0)) {
							combo.count++;
							if (globalContext.core.crew[i].archetype_id != crew.archetype_id) {
								if (!combo.alts) combo.alts = [];
								combo.alts.push({
									'symbol': globalContext.core.crew[i].symbol,
									'name': globalContext.core.crew[i].name
								});
							}
						}
					}
				});
			}
		}

		// Find optimal polestars, i.e. smallest combinations with best chance of retrieving this crew
		crewPolestarCombos.sort((a, b) => {
			if (a.count == b.count && a.polestars && b.polestars)
				return a.polestars.length - b.polestars.length;
			return a.count - b.count;
		});

		let iBestCount = crewPolestarCombos[0].count;

		let optimals = [] as PolestarCombo[];
		for (let i = 0; i < crewPolestarCombos.length; i++) {
			let testcombo = crewPolestarCombos[i];

			// We stop looking for optimals if:
			//	test count is worse than current best count
			if (testcombo.count > iBestCount)
				break;

			// Ignore supersets of an already optimal subset
			let bIsSuperset = false;
			for (let j = 0; j < optimals.length; j++) {
				if (testcombo.polestars.length <= optimals[j].polestars.length) continue;
				bIsSuperset = true;
				optimals[j].polestars.forEach(polestar => {
					bIsSuperset = bIsSuperset && testcombo.polestars.indexOf(polestar) >= 0;
				});
				if (bIsSuperset) break;
			}
			if (bIsSuperset) continue;

			optimals.push(crewPolestarCombos[i]);
		}
		return optimals;
	}

	function renderConstellation(): JSX.Element {
		if (!constellation) return <></>;
		return (
			<Segment>
				<Header as='h4'>{constellation.name}</Header>
				<div dangerouslySetInnerHTML={{ __html: constellation.flavor }} />
				<Grid columns={5} centered padded>
					{constellation.keystones.map((kk, idx) => (
					<Grid.Column key={idx} textAlign='center'>
						<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${kk.icon.file.slice(1).replace(/\//g, '_')}`} />
						<br/ >
						<Link to={`/?search=trait:${kk.short_name}`}>
						<span style={{ fontWeight: 'bolder' }}>
							{kk.short_name}
						</span>
						</Link>
					</Grid.Column>
					))}
				</Grid>
			</Segment>
		);
	}
};

type OptimalPolestarsProps = {
	constellation: ConstellationMap;
	optimalPolestars: PolestarCombo[];
};

const OptimalPolestars = (props: OptimalPolestarsProps) => {
	const { constellation, optimalPolestars } = props;

	const [paginationPage, setPaginationPage] = React.useState(1);
	const [paginationRows, setPaginationRows] = React.useState(10);

	const pagingOptions = [
		{ key: '0', value: '10', text: '10' },
		{ key: '1', value: '25', text: '25' },
		{ key: '2', value: '50', text: '50' },
		{ key: '3', value: '100', text: '100' }
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

	return (
		<Segment>
			<Header as='h4'>Optimal Polestars for Crew Retrieval</Header>
			<div>All the polestars that give the best chance of retrieving this crew</div>
			<Table celled selectable striped collapsing unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell width={1}>Best Chance</Table.HeaderCell>
						<Table.HeaderCell width={3} textAlign='center'>Polestar Combination</Table.HeaderCell>
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
								<div style={{ gridArea: 'description' }}>Shared with{' '}
									{optimal.alts.map((alt) => (
										<Link key={alt.symbol} to={`/crew/${alt.symbol}/`}>
											{alt.name}
										</Link>
									)).reduce((prev, curr) => <>{prev}, {curr}</>, <></>)}
								</div>
								)}
							</Table.Cell>
							<Table.Cell>
								{renderComboGrid(optimal)}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={8}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
							/>
							<span style={{ paddingLeft: '2em' }}>
								Rows per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={paginationRows}
									onChange={(event, { value }) => { setPaginationPage(1); setPaginationRows(value as number); }}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
		</Segment>
	);

	function renderComboGrid(polestarCombo: PolestarCombo): JSX.Element {
		const comboColumns = polestarCombo.polestars.map((trait, idx) => {
			const polestar = crewPolestars.find((op) => filterTraits(op, trait));
			// Catch when optimal combos include a polestar that isn't yet in DataCore's keystones list
			const polestarName = polestar ? polestar.short_name : trait.slice(0, 1).toUpperCase()+trait.slice(1);
			const polestarFile = polestar ? polestar.icon.file : '/items_keystones_'+trait+'.png';
			return (
				<Grid.Column key={idx} textAlign='center' mobile={8} tablet={5} computer={4}>
					<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestarFile.slice(1).replace(/\//g, '_')}`} />
					<br />{polestarName}
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
