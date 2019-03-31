import React, { Component } from 'react';
import { Header, Grid, Segment } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { Link } from 'gatsby';

type CrewVariantsProps = {
	short_name: string;
};

type CrewVariantsState = {
	variants: any[];
};

class CrewVariants extends Component<CrewVariantsProps, CrewVariantsState> {
	state = {
		variants: []
	};

	componentDidMount() {
		fetch('/structured/crew.json')
			.then(response => response.json())
			.then(crew => this.setState({ variants: crew.filter(c => c.short_name === this.props.short_name) }));
	}

	render() {
		if (!this.props.short_name || this.state.variants.length < 2) {
			return <span />;
		}

		return (
			<Segment>
				<Header as='h4'>Other variants of {this.props.short_name}</Header>
				<Grid columns={4} centered padded>
					{this.state.variants.map(variant => (
						<Grid.Column key={variant.symbol} textAlign='center'>
							<ItemDisplay
								src={`/media/assets/${variant.imageUrlPortrait}`}
								size={128}
								maxRarity={variant.max_rarity}
								rarity={variant.max_rarity}
							/>
							<Link to={`/crew/${variant.symbol}/`}>{variant.name}</Link>
						</Grid.Column>
					))}
				</Grid>
			</Segment>
		);
	}
}

export default CrewVariants;
