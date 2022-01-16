import React, { Component } from 'react';
import { Header, Dropdown, Grid, Rating, Divider, Form, Popup, Label } from 'semantic-ui-react';
import { graphql, Link, StaticQuery } from 'gatsby';
import marked from 'marked';

import Layout from '../components/layout';
import CommonCrewData from '../components/commoncrewdata';

import { getStoredItem } from '../utils/storage';
import { fetchCrewData } from '../utils/crewutils';

type BeholdsPageProps = {
	location: {
		pathname: string;
	}
};

type BeholdsPageState = {
	peopleList: any[];
	currentSelectedItems: any;
	allcrew: any[];
	entries: any[];
	minRarity: any;
	roster: any[];
};

const rarityOptions = [
	{ key: null, value: null, text: 'Any' },
	{ key: '1', value: '1', text: '1' },
	{ key: '2', value: '2', text: '2' },
	{ key: '3', value: '3', text: '3' },
	{ key: '4', value: '4', text: '4' },
	{ key: '5', value: '5', text: '5' }
];

class BeholdsPage extends Component<BeholdsPageProps, BeholdsPageState> {
	state = {
		peopleList: [],
		currentSelectedItems: [],
		allcrew: [],
		entries: [],
		minRarity: null,
		roster: []
	};

	async componentDidMount() {
		const playerData = getStoredItem('tools/playerData', undefined);
		// //let response = await fetch('/structured/crew.json');
		// //const allcrew = await response.json();
		// const allcrew = graphql()
		// let peopleList = [];
		// allcrew.forEach(crew => {
		// 	peopleList.push({
		// 		key: crew.symbol,
		// 		value: crew.symbol,
		// 		image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` },
		// 		text: `${crew.short_name} (${crew.name})`,
		// 		max_rarity: crew.max_rarity
		// 	});
		// });

		this.setState({ }, () => {
			let urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('crew')) {
				this._selectionChanged(urlParams.getAll('crew'));
			}
			// Set default minimum rarity to behold minimum (4) if no crew is passed by URL
			else {
				this.setState({ minRarity: 4 });
			}
		});

		if (playerData) {
			let roster = playerData.player.character.crew;
			roster = roster.concat(playerData.player.character.stored_immortals);
			roster = roster.map(c1 => allcrew.find(c2 => c1.symbol == c2.symbol))
										 .filter(c => c != undefined);
			this.setState({ roster });
		}
	}

	render() {
		return (
			<Layout title='Behold helper / crew comparison'>
				<Header as='h4'>Behold helper / crew comparison</Header>
				<p>Simply search for the crew you want to compare to get side-by-side views for comparison.</p>
				<Form>
					<Form.Group>
					<StaticQuery
						query={graphql`query peopleList {
							allCrewJson(sort: {fields: name}) {
								nodes {
									name
									short_name
									symbol
									imageUrlPortrait
									max_rarity
								}
							}
						}`}
						render={data => (<Dropdown
								clearable
								fluid
								multiple
								search
								selection
								closeOnChange
								options={data.allCrewJson.nodes
														 .filter(crew => crew.max_rarity >= this.state.minRarity)
														 .map(crew => ({
															 key: crew.symbol,
															 value: crew.symbol,
															 image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` },
															 text: `${crew.name}`
														 }))}
								placeholder='Select or search for crew'
								label='Behold crew'
								value={this.state.currentSelectedItems}
								onChange={(e, { value }) => this._selectionChanged(value)}
							/>
						)} />
						<Form.Field
							control={Dropdown}
							placeholder={this.state.minRarity ? `Minimum rarity: ${this.state.minRarity}` : `Minimum rarity`}
							selection
							options={rarityOptions}
							value={this.state.minRarity}
							onChange={(e, { value }) => this.setState({ minRarity: value })}
						/>
					</Form.Group>
				</Form>

				<Divider horizontal hidden />

				<Grid columns={3} stackable centered padded divided>
					{this.state.entries.map((entry, idx) => (
						<Grid.Column key={idx}>
							<Header as='h5'>
								<Link to={`/crew/${entry.crew.symbol}/`}>
									{entry.crew.name}{' '}
									<Rating defaultRating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} icon='star' size='small' disabled />
								</Link>
							</Header>
							<CommonCrewData compact={true} crewDemands={entry.crewDemands} crew={entry.crew} markdownRemark={entry.markdownRemark} roster={this.state.roster}/>
							{entry.markdown && <div dangerouslySetInnerHTML={{ __html: entry.markdown }} />}
						</Grid.Column>
					))}
				</Grid>
			</Layout>
		);
	}

	async _selectionChanged(value: any) {
		let params = new URLSearchParams();
		let entries = [];
		for (let symbol of value) {
			let bcrew = await fetchCrewData(symbol);
			if (!bcrew) {
				console.error(`Crew ${symbol} not found in crew.json!`);
				break;
			}

			// This emulates the Gatsby markdown output until the transition to dynamic loading entirely
			entries.push({
				markdown: marked(bcrew.markdownContent),
				crew: bcrew,
				crewDemands: {
					factionOnlyTotal: bcrew.factionOnlyTotal,
					totalChronCost: bcrew.totalChronCost,
					craftCost: bcrew.craftCost
				},
				markdownRemark: {
					frontmatter: {
						bigbook_tier: bcrew.bigbook_tier,
						events: bcrew.events,
						in_portal: bcrew.in_portal
					}
				}
			});

			params.append('crew', symbol);
		}

		this.setState({ entries, currentSelectedItems: value });

		let newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + params.toString();
		window.history.pushState({ path: newurl }, '', newurl);
	}
}

export default BeholdsPage;
