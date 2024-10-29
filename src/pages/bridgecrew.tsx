import React, { Component } from 'react';
import { Header, Dropdown, Grid, Rating, Divider, Form, Segment, Image } from 'semantic-ui-react';
import { Link } from 'gatsby';
import * as marked from 'marked';

import { CrewMember } from '../model/crew';
import DataPageLayout from '../components/page/datapagelayout';

type BridgeCrewPageProps = {
};

type BridgeCrewPageState = {
	peopleList: any[];
	currentSelectedItems: any;
	allcrew: CrewMember[];
	entries: any[];
};

type BridgePeopleListItem = {
	key: string,
	value: string,
	imageUrlFullBody: string,
	image: { avatar: true, src: string },
	text: string,
	max_rarity: number;
}

class BridgeCrewPage extends Component<BridgeCrewPageProps, BridgeCrewPageState> {
	state = {
		peopleList: [],
		currentSelectedItems: [],
		allcrew: [] as CrewMember[],
		entries: [] as { crew?: CrewMember }[],
	};

	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const allcrew = await response.json();

		let peopleList = [] as BridgePeopleListItem[];
		allcrew.forEach(crew => {
			peopleList.push({
				key: crew.symbol,
				value: crew.symbol,
				imageUrlFullBody: crew.imageUrlFullBody,
				image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` },
				text: `${crew.short_name} (${crew.name})`,
				max_rarity: crew.max_rarity
			} as BridgePeopleListItem);
		});
		peopleList = peopleList.sort((a, b) => a.text.localeCompare(b.text)),

		this.setState({ allcrew, peopleList }, () => {
			let urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('crew')) {
				this._selectionChanged(urlParams.getAll('crew'));
			}
		});
	}

	render() {
		if (this.state.allcrew.length === 0) {
			return (
				<DataPageLayout pageTitle='Bridge crew assembly'>
					<div className='ui medium centered text active inline loader'>Loading data...</div>
				</DataPageLayout>
			);
		}

		let peopleToShow = [...this.state.peopleList];

		return (
			<DataPageLayout pageTitle='Bridge crew assembly'>
				<React.Fragment>
				<p>Assemble your bridge crew.</p>
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
							placeholder='Select or search for crew'
							label='Bridge crew'
							value={this.state.currentSelectedItems}
							onChange={(e, { value }) => this._selectionChanged(value)}
						/>
					</Form.Group>
				</Form>

				<Divider horizontal hidden />

				<div style={{ height: '500px', overflow: 'hidden', textAlign: 'center', padding: '25px', backgroundColor: '#203147', border: '2px solid lightblue' }}>
					<Header as='h3'>Bridge Crew</Header>
					{this.state.entries.map((entry, idx) => (
							<img src={`${process.env.GATSBY_ASSETS_URL}${entry.crew?.imageUrlFullBody}`} style={{ height: '725px', margin: '0 -6.5%' }} />
					))}
				</div>
				</React.Fragment>
			</DataPageLayout>
		);
	}

	_selectionChanged(value: any) {
		let params = new URLSearchParams();
		let entries = [] as { crew?: CrewMember }[]
		for (let symbol of value) {
			let bcrew = this.state.allcrew.find(bc => bc.symbol === symbol);
			if (!bcrew) {
				console.error(`Crew ${symbol} not found in crew.json!`);
				break;
			}

			// This emulates the Gatsby markdown output until the transition to dynamic loading entirely
			entries.push({
				crew: this.state.allcrew.find(c => c.symbol === symbol),
			});

			params.append('crew', symbol);
		}

		this.setState({ entries, currentSelectedItems: value });

		let newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + params.toString();
		window.history.pushState({ path: newurl }, '', newurl);
	}
}

export default BridgeCrewPage;
