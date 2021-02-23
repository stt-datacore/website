import React, { Component } from 'react';
import { Header, Grid, Segment, Table } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { Link } from 'gatsby';

type ExtraCrewDetailsProps = {
	crew_archetype_id: number,
	max_rarity: number,
	base_skills: any,
	traits: any[],
	traits_hidden: any[],
	unique_polestar_combos: any[]
};

type ExtraCrewDetailsState = {
	variants: any[],
	constellation: any,
	optimalpolestars: any
};

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
}

class ExtraCrewDetails extends Component<ExtraCrewDetailsProps, ExtraCrewDetailsState> {
	state = {
		variants: [],
		constellation: undefined,
		optimals: undefined
	};

	componentDidMount() {
		// Get variant names from traits_hidden
		let ignore = [
			'tos', 'tas', 'tng', 'ds9', 'voy', 'ent', 'dsc', 'pic',
			'female', 'male',
			'artificial_life', 'nonhuman', 'organic', 'species_8472',
			'admiral', 'captain', 'commander', 'lieutenant_commander', 'lieutenant', 'ensign', 'general', 'nagus', 'first_officer',
			'ageofsail', 'bridge_crew', 'evsuit', 'gauntlet_jackpot', 'mirror', 'niners', 'original',
			'crew_max_rarity_5', 'crew_max_rarity_4', 'crew_max_rarity_3', 'crew_max_rarity_2', 'crew_max_rarity_1',
			'spock_tos' /* 'spock_tos' Spocks also have 'spock' trait so use that and ignore _tos for now */
		];
		let variantTraits = [];
		for (let i = 0; i < this.props.traits_hidden.length; i++) {
			let trait = this.props.traits_hidden[i];
			if (ignore.indexOf(trait) == -1) variantTraits.push(trait);
		}

		let self = this;
		fetch('/structured/keystones.json')
			.then(response => response.json())
			.then(allkeystones => {
				let crew_keystone_crate = allkeystones.find((k: any) => k.crew_archetype_id === this.props.crew_archetype_id);

				// Rarity and skills aren't in keystone crates, but should be used for optimal crew retrieval
				let raritystone = allkeystones.filter((keystone) =>
					keystone.filter && keystone.filter.type === 'rarity' && keystone.filter.rarity === this.props.max_rarity
				);
				let skillstones = allkeystones.filter((keystone) =>
					keystone.filter && keystone.filter.type === 'skill' && this.props.base_skills[keystone.filter.skill]
				);

				if (crew_keystone_crate) {
					self.setState({
						constellation: {
							name: crew_keystone_crate.name, flavor: crew_keystone_crate.flavor,
							keystones: crew_keystone_crate.keystones.map((kid: any) => allkeystones.find((k: any) => k.id === kid)),
							raritystone,
							skillstones
						}
					});
				}
			});


		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(allcrew => {
				// Use precalculated unique polestars combos if any, otherwise get best chances
				let optimalpolestars = this.props.unique_polestar_combos && this.props.unique_polestar_combos.length > 0 ?
					this._optimizeUniquePolestars(this.props.unique_polestar_combos) :
					this._findOptimalPolestars(allcrew);

				// Get variants
				let variants = [];
				variantTraits.forEach(function (trait) {
					let found = allcrew.filter(ac => ac.traits_hidden.indexOf(trait) >= 0);
					// Ignore variant group if crew is the only member of the group
					if (found.length > 1) {
						found.sort(function (a, b) {
							if (a.max_rarity == b.max_rarity)
								return a.name.localeCompare(b.name);
							return a.max_rarity - b.max_rarity;
						});
						// short_name may not always be the best name to use, depending on the first variant
						variants.push({ 'name': found[0].short_name, 'trait_variants': found });
					}
				});

				self.setState({ optimalpolestars, variants });
			});
	}

	_findOptimalPolestars(allcrew: []) {
		// Generate crewman's list of polestars (traits + rarity + skills)
		let polestars = this.props.traits.slice();
		polestars.push('crew_max_rarity_'+this.props.max_rarity);
		for (let skill in this.props.base_skills) {
			if (this.props.base_skills[skill]) polestars.push(skill);
		}
		polestars = polestars.sort((a, b) => a.localeCompare(b));
		// Initialize all valid combinations of polestars with a zero count
		let crewPolestarCombos = [];
		let f = function(prepoles, traits) {
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
		f([], polestars);

		// Find all crew who have any polestars in common
		for (let i = 0; i < allcrew.length; i++) {
			if (!allcrew[i].in_portal) continue;
			let polesInCommon = [];
			for (let t = 0; t < this.props.traits.length; t++) {
				if (allcrew[i].traits.indexOf(this.props.traits[t]) >= 0)
					polesInCommon.push(this.props.traits[t]);
			}
			// Add 1 to count of every polestar combination in common
			if (polesInCommon.length > 0) {
				// Only consider rarity and skills if at least 1 trait in common
				if (allcrew[i].max_rarity == this.props.max_rarity)
					polesInCommon.push('crew_max_rarity_'+this.props.max_rarity);
				for (let skill in allcrew[i].base_skills) {
					if (allcrew[i].base_skills[skill] && this.props.base_skills[skill])
						polesInCommon.push(skill);
				}
				crewPolestarCombos.forEach(combo => {
					if (polesInCommon.length >= combo.polestars.length) {
						if (combo.polestars.every(polestar => polesInCommon.indexOf(polestar) >= 0)) {
							combo.count++;
							if (allcrew[i].archetype_id != this.props.crew_archetype_id) {
								combo.alts.push({
									'symbol': allcrew[i].symbol,
									'name': allcrew[i].name
								});
							}
						}
					}
				});
			}
		}

		// Find optimal polestars, i.e. smallest combinations with best chance of retrieving this crew
		crewPolestarCombos.sort((a, b) => {
			if (a.count == b.count)
				return a.polestars.length - b.polestars.length;
			return a.count - b.count;
		});

		let iBestCount = crewPolestarCombos[0].count;

		let optimals = [], iBestTraitCount = 4;
		for (let i = 0; i < crewPolestarCombos.length; i++) {
			let testcombo = crewPolestarCombos[i];

			// We stop looking for optimals if:
			//	1) test count is worse than current best count
			if (testcombo.count > iBestCount)
				break;
			//	or 2) trait count is 4 and current best trait count is less than 4
			if (testcombo.polestars.length == 4 && iBestTraitCount < 4)
				break;

			if (testcombo.polestars.length < iBestTraitCount)
				iBestTraitCount = testcombo.polestars.length;

			// Ignore supersets of an already optimal subset
			let bIsSuperset = false;
			for (let j = 0; j < optimals.length; j++) {
				if (testcombo.polestars.length <= optimals[j].length) continue;
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

	_optimizeUniquePolestars(crewPolestarCombos: any[]) {
		// Find optimal polestars, i.e. smallest combinations with best chance of retrieving this crew
		let optimals = [], iBestTraitCount = 4;
		for (let i = 0; i < crewPolestarCombos.length; i++) {
			let testpolestars = crewPolestarCombos[i];

			// We stop looking for optimals if trait count is 4 and current best trait count is less than 4
			if (testpolestars.length == 4 && iBestTraitCount < 4)
				break;

			if (testpolestars.length < iBestTraitCount)
				iBestTraitCount = testpolestars.length;

			optimals.push({
				'count': 1,
				'alts': [],
				'polestars': testpolestars
			});
		}
		return optimals;
	}

	render() {
		return <div>
			{this.renderConstellation()}
			{this.renderOptimalPolestars()}
			{this.renderVariants()}
		</div>;
	}

	renderConstellation() {
		if (!this.state.constellation) {
			return <span />;
		}

		const { constellation } = this.state;

		return (
			<Segment>
				<Header as='h4'>{constellation.name}</Header>
				<div dangerouslySetInnerHTML={{ __html: constellation.flavor }} />
				<Grid columns={5} centered padded>
					{constellation.keystones.map((kk, idx) => (
					<Grid.Column key={idx} textAlign='center'>
						<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${kk.icon.file.substr(1).replace(/\//g, '_')}`} />
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

	renderOptimalPolestars() {
		if (!this.state.constellation || !this.state.optimalpolestars) {
			return <span />;
		}

		const { optimalpolestars, constellation } = this.state;

		let crewPolestars = constellation.keystones.concat(constellation.raritystone.concat(constellation.skillstones));
		optimalpolestars.forEach((optimal) => {
			optimal.combos = optimal.polestars.map((trait) =>
				crewPolestars.find((op) => filterTraits(op, trait))
			)
		});

		return (
			<Segment>
				<Header as='h4'>Optimal Polestars for Crew Retrieval</Header>
				<div>The best chance to retrieve this crew using as few polestars as possible</div>
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={1}>Best Chance</Table.HeaderCell>
							<Table.HeaderCell width={3} textAlign='center'>Polestar Combination</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{optimalpolestars.map((optimal) => (
							<Table.Row>
								<Table.Cell>
									<div style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
										{(1/optimal.count*100).toFixed()}%
									</div>
									{optimal.count > 1 && (
									<div style={{ gridArea: 'description' }}>Shared with{' '}
										{optimal.alts.map((alt, idx) => (
											<Link to={`/crew/${alt.symbol}/`}>
												{alt.name}
											</Link>
										)).reduce((prev, curr) => [prev, ', ', curr])}
									</div>
									)}
								</Table.Cell>
								<Table.Cell>
									<Grid columns={4} centered padded>
									{optimal.combos.map((polestar, idx) => (
										<Grid.Column key={idx} textAlign='center' mobile={8} tablet={5} computer={4}>
											<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestar.icon.file.substr(1).replace(/\//g, '_')}`} />
											<br />{polestar.short_name}
										</Grid.Column>
									))}
									</Grid>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</Segment>
		);
	}

	renderVariants() {
		if (this.state.variants.length == 0) {
			return <span />;
		}

		return (
			this.state.variants.map(group => (
				<Segment>
					<Header as='h4'>Variants of {group.name}</Header>
					<Grid centered padded>
						{group.trait_variants.map(variant => (
							<Grid.Column key={variant.symbol} textAlign='center' mobile={8} tablet={5} computer={4}>
								<ItemDisplay
									src={`${process.env.GATSBY_ASSETS_URL}${variant.imageUrlPortrait}`}
									size={128}
									maxRarity={variant.max_rarity}
									rarity={variant.max_rarity}
								/>
								<div><Link to={`/crew/${variant.symbol}/`}>{variant.name}</Link></div>
							</Grid.Column>
						))}
					</Grid>
				</Segment>
			))
		);
	}
}

export default ExtraCrewDetails;
