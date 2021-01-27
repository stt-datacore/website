import React, { Component } from 'react';
import { Header, Grid, Segment, Table } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { Link } from 'gatsby';

type ExtraCrewDetailsProps = {
	traits_hidden: any[],
	crew_archetype_id: number
};

type ExtraCrewDetailsState = {
	variants: any[],
	keystone: any
};

class ExtraCrewDetails extends Component<ExtraCrewDetailsProps, ExtraCrewDetailsState> {
	state = {
		variants: [],
		keystone: undefined
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
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(crew => {
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
											{kk.filter.trait && <Link to={`https://datacore.app/?search=trait:${kk.filter.trait}`}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
													{kk.filter.trait}
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
			{this.renderVariants()}
		</div>;
	}
}

export default ExtraCrewDetails;
