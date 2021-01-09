import React, { Component } from 'react';
import { Header, Grid, Segment } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { Link } from 'gatsby';

type CrewVariantsProps = {
	traits_hidden: any[]
};

type CrewVariantsState = {
	variants: any[]
};

class CrewVariants extends Component<CrewVariantsProps, CrewVariantsState> {
	state = {
		variants: []
	};

	componentDidMount() {
		// Get variant names from traits_hidden
		let ignore = [
			'tos','tas','tng','ds9','voy','ent','dsc','pic',
			'female','male',
			'artificial_life','nonhuman','organic','species_8472',
			'admiral','captain','commander','lieutenant_commander','lieutenant','ensign','general','nagus','first_officer',
			'ageofsail','bridge_crew','evsuit','gauntlet_jackpot','mirror','niners','original',
			'crew_max_rarity_5','crew_max_rarity_4','crew_max_rarity_3','crew_max_rarity_2','crew_max_rarity_1',
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
				variantTraits.forEach(function(trait) {
					let found = crew.filter(c => c.traits_hidden.indexOf(trait) >= 0);
					// Ignore variant group if crew is the only member of the group
					if (found.length > 1) {
						found.sort(function(a, b) {
							if (a.max_rarity == b.max_rarity)
								return a.name.localeCompare(b.name);
							return a.max_rarity - b.max_rarity;
						});
						// short_name may not always be the best name to use, depending on the first variant
						variants.push({'name': found[0].short_name, 'trait_variants': found});
					}
				});
				self.setState({ variants });
			});
	}

	render() {
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

export default CrewVariants;
