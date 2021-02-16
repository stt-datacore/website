import React, { Component } from 'react';
import { Header, Grid, Segment, Table } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { Link } from 'gatsby';

type ExtraCrewDetailsProps = {
	crew_archetype_id: number,
	max_rarity: number,
	base_skills: any,
	traits: any[],
	traits_hidden: any[]
};

type ExtraCrewDetailsState = {
	variants: any[],
	keystone: any,
	polestars: any
};

const RARITIES = ['Basic Rarity','Common Rarity','Uncommon Rarity','Rare Rarity','Super Rare Rarity','Legendary Rarity'];
const SKILLS = {
	command_skill: 'Command Skill',
	science_skill: 'Science Skill',
	security_skill: 'Security Skill',
	engineering_skill: 'Engineering Skill',
	diplomacy_skill: 'Diplomacy Skill',
	medicine_skill: 'Medicine Skill'
};

class ExtraCrewDetails extends Component<ExtraCrewDetailsProps, ExtraCrewDetailsState> {
	state = {
		variants: [],
		keystone: undefined,
		polestars: undefined
	};

	componentDidMount() {
		// Prepare polestar counts
		//	Use traits_named instead of traits
		let polestars = this.props.traits_named.slice();
		polestars.push(RARITIES[this.props.max_rarity]);
		for (let skill in this.props.base_skills) {
			if (this.props.base_skills[skill]) polestars.push(SKILLS[skill]);
		}
		let polestarCounts = [];
		let f = function(prepoles, traits) {
			for (let t = 0; t < traits.length; t++) {
				const newpoles = prepoles.slice();
				newpoles.push(traits[t]);
				if (newpoles.length <= 4) {
					polestarCounts.push({
						'polestars': newpoles,
						'count': 0
					});
				}
				f(newpoles, traits.slice(t+1));
			}
		}
		f([], polestars);

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

				if (crew_keystone_crate) {
					self.setState({
						keystone: {
							name: crew_keystone_crate.name, flavor: crew_keystone_crate.flavor,
							keystones: crew_keystone_crate.keystones.map((kid: any) => allkeystones.find((k: any) => k.id === kid))
						}
					});
				}
			});

		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(crew => {
				// Find all crew who have any polestars in common
				for (let i = 0; i < crew.length; i++) {
				  if (!crew[i].in_portal) continue;
					let polesInCommon = [];
					for (let t = 0; t < this.props.traits_named.length; t++) {
						if (crew[i].traits_named.indexOf(this.props.traits_named[t]) >= 0)
							polesInCommon.push(this.props.traits_named[t]);
					}
					// Add 1 to count of every polestar combination in common
					if (polesInCommon.length > 0) {
						// Only consider rarity and skills if at least 1 trait in common
						if (crew[i].max_rarity == this.props.max_rarity)
							polesInCommon.push(RARITIES[this.props.max_rarity]);
						for (let skill in crew[i].base_skills) {
							if (crew[i].base_skills[skill] && this.props.base_skills[skill])
								polesInCommon.push(SKILLS[skill]);
						}
						polestarCounts.forEach(count => {
							if (polesInCommon.length >= count.polestars.length) {
								let bMatching = true;
								count.polestars.forEach(polestar => {
									bMatching = bMatching && polesInCommon.indexOf(polestar) >= 0;
								});
								if (bMatching) count.count++;
							}
						});
					}
				}
				// Find optimal polestars, i.e. combinations with best chance of retrieving this crew
				polestarCounts.sort((a, b) => {
					if (a.count == b.count)
						return a.polestars.length - b.polestars.length;
					return a.count - b.count;
				});
				let optimized = [], iBestCount = 10, iBestTraitCount = 4;
				for (let i = 0; i < polestarCounts.length; i++) {
					let testcount = polestarCounts[i];

					// We stop looking for optimals if testcount is:
					//	1) worse than current best count (lower is better)
					if (testcount.count > iBestCount)
						break;
					//	or 2) trait count is 4 and current best trait count is less than 4
					if (testcount.polestars.length == 4 && iBestTraitCount < 4)
						break;

					if (testcount.count < iBestCount)
						iBestCount = testcount.count;
					if (testcount.polestars.length < iBestTraitCount)
						iBestTraitCount = testcount.polestars.length;

					// Ignore supersets of an already optimal subset
					let bIsSuperset = false;
					for (let j = 0; j < optimized.length; j++) {
						if (testcount.polestars.length <= optimized[j].polestars.length) continue;
						bIsSuperset = true;
						optimized[j].polestars.forEach(polestar => {
							bIsSuperset = bIsSuperset && testcount.polestars.indexOf(polestar) >= 0;
						});
						if (bIsSuperset) break;
					}
					if (bIsSuperset) continue;

					optimized.push({
						'polestars': testcount.polestars,
						'chance': (1/testcount.count*100).toFixed()
					});
				}
				self.setState({ polestars: optimized });

				// Get variants
				let variants = [];
				variantTraits.forEach(function (trait) {
					let found = crew.filter(c => c.traits_hidden.indexOf(trait) >= 0);
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
				self.setState({ variants });
			});
	}

	renderKeystone() {
		if (!this.state.keystone) {
			return <span />;
		}

		const { keystone } = this.state;

		return (
			<Segment>
				<Header as='h4'>{keystone.name}</Header>
				<div dangerouslySetInnerHTML={{ __html: keystone.flavor }} />
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={2}>Name</Table.HeaderCell>
							<Table.HeaderCell width={2}>Flavor</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{keystone.keystones.map((kk, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>

									<div
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon name' 'icon description'`,
											gridGap: '1px'
										}}
									>
										<div style={{ gridArea: 'icon' }}>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${kk.icon.file.substr(1).replace(/\//g, '_')}`} />
										</div>
										<div style={{ gridArea: 'name' }}>
											{kk.name}
										</div>
										<div style={{ gridArea: 'description' }}>
											<span>Trait filter: </span>
											{kk.filter.trait && <Link to={`https://datacore.app/?search=trait:${kk.short_name}`}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
													{kk.short_name}
												</span>
											</Link>}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>{kk.flavor}</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</Segment>
		);
	}

	renderPolestars() {
		if (!this.state.polestars || !this.state.keystone) {
			return <span />;
		}

		const { polestars } = this.state;

		return (
			<Segment>
				<Header as='h4'>Optimal Polestars for Crew Retrieval</Header>
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={1}>Best Chance</Table.HeaderCell>
							<Table.HeaderCell width={3}>Polestar Combination</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{polestars.map(chance => (
							<Table.Row>
								<Table.Cell>
									<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
										{chance.chance}%
									</span>
								</Table.Cell>
								<Table.Cell>
									<Grid centered padded>
									{chance.polestars.map((polestar, idx) => (
										<Grid.Column key={idx} textAlign='center' mobile={8} tablet={5} computer={4}>
											<div>{polestar}</div>
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

	render() {
		return <div>
			{this.renderKeystone()}
			{this.renderPolestars()}
			{this.renderVariants()}
		</div>;
	}
}

export default ExtraCrewDetails;
