import React, { Component } from 'react';
import { Header, Dropdown, Grid, Rating, Divider, Form, Popup, Label, Button } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';
import marked from 'marked';

import Layout from '../components/layout';
import CommonCrewData from '../components/commoncrewdata';

import { getStoredItem } from '../utils/storage';

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
	{ key: 'ro0', value: null, text: 'Any rarity' },
	{ key: 'ro2', value: '2', text: 'Minimum 2*' },
	{ key: 'ro3', value: '3', text: 'Minimum 3*' },
	{ key: 'ro4', value: '4', text: 'Minimum 4*' },
	{ key: 'ro5', value: '5', text: 'Minimum 5*' }
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
		let response = await fetch('/structured/crew.json');
		const allcrew = await response.json();
		let peopleList = [];
		allcrew.forEach(crew => {
			peopleList.push({
				key: crew.symbol,
				value: crew.symbol,
				image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` },
				text: `${crew.short_name} (${crew.name})`,
				max_rarity: crew.max_rarity
			});
		});
		peopleList = peopleList.sort((a, b) => a.text.localeCompare(b.text)),

		this.setState({ allcrew, peopleList }, () => {
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
		if (this.state.allcrew.length === 0) {
			return (
				<Layout title='Behold helper / crew comparison'>
					<div className='ui medium centered text active inline loader'>Loading data...</div>
				</Layout>
			);
		}

		let peopleToShow = [...this.state.peopleList];
		if (this.state.minRarity) {
			peopleToShow = peopleToShow.filter((crew) => crew.max_rarity >= this.state.minRarity);
		}

		return (
			<Layout title='Behold helper / crew comparison'>
				<Header as='h2'>Behold helper / crew comparison</Header>
				<Form>
					<Form.Group>
						<Dropdown
							clearable
							fluid
							multiple
							search
							selection
							closeOnChange
							options={peopleToShow}
							placeholder='Search for crew to compare'
							label='Behold crew'
							value={this.state.currentSelectedItems}
							onChange={(e, { value }) => this._selectionChanged(value)}
						/>
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
				{this.state.currentSelectedItems?.length > 0 && (
					<Button compact icon='add user' color='green' content='Preview all in your roster' onClick={() => { this._addProspects(); }} />
				)}

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

	_selectionChanged(value: any) {
		let params = new URLSearchParams();
		let entries = [];
		for (let symbol of value) {
			let bcrew = this.state.allcrew.find(bc => bc.symbol === symbol);
			if (!bcrew) {
				console.error(`Crew ${symbol} not found in crew.json!`);
				break;
			}

			// This emulates the Gatsby markdown output until the transition to dynamic loading entirely
			entries.push({
				markdown: marked(bcrew.markdownContent),
				crew: this.state.allcrew.find(c => c.symbol === symbol),
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

	_addProspects(): void {
/*
		let linkUrl = '/playertools?tool=crew';
		if (this.state.currentSelectedItems.length == 0) return;
		this.state.currentSelectedItems.forEach(prospect => {
			linkUrl += '&prospect='+prospect;
		});
		navigate(linkUrl);
*/
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: this.state.currentSelectedItems
		};
		navigate(linkUrl, { state: linkState });
	}
}

export default BeholdsPage;
