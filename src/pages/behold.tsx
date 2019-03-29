import React, { Component } from 'react';
import { Container, Header, Dropdown, Grid, Rating, Divider } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';

import Layout from '../components/layout';
import CommonCrewData from '../components/commoncrewdata';

import { calculateCrewDemands } from '../utils/equipment';

type BeholdsPageProps = {
	data: {
		allCrewJson: any;
		crewpages: any;
	};
};

type BeholdsPageState = {
	peopleList: any[];
	currentSelectedItems: any;
	allcrew: any[];
	entries: any[];
	items: any[];
};

class BeholdsPage extends Component<BeholdsPageProps, BeholdsPageState> {
	constructor(props) {
		super(props);

		this.state = {
			peopleList: [],
			currentSelectedItems: [],
			allcrew: [],
			entries: [],
			items: []
		};

		this.props.data.allCrewJson.edges.forEach(edge => {
			let crew = edge.node;
			this.state.peopleList.push({
				key: crew.symbol,
				value: crew.symbol,
				image: { avatar: true, src: `/media/assets/${crew.imageUrlPortrait}` },
				text: crew.name
			});
		});
	}

	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const allcrew = await response.json();

		response = await fetch('/structured/items.json');
		const items = await response.json();

		this.setState({ allcrew, items }, () => {
			let urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('crew')) {
				this._selectionChanged(urlParams.getAll('crew'));
			}
		});
	}

	render() {
		if (this.state.allcrew.length === 0) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<div className='ui medium centered text active inline loader'>Loading data...</div>
					</Container>
				</Layout>
			);
		}

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as='h4'>Behold helper / crew comparison</Header>
					<p>Simply search for the crew you want to compare to get side-by-side views for comparison.</p>
					<Dropdown
						clearable
						fluid
						multiple
						search
						selection
						options={this.state.peopleList}
						placeholder='Select or search for crew'
						label='Behold crew'
						value={this.state.currentSelectedItems}
						onChange={(e, { value }) => this._selectionChanged(value)}
					/>

					<Divider horizontal hidden />

					<Grid columns={3} centered padded divided>
						{this.state.entries.map((entry, idx) => (
							<Grid.Column key={idx}>
								<Header as='h5'>
									<Link to={`/crew${entry.markdown.node.fields.slug}`}>
										{entry.crew.name}{' '}
										<Rating defaultRating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} icon='star' size='small' disabled />
									</Link>
								</Header>
								<CommonCrewData
									compact={true}
									crewDemands={entry.crewDemands}
									crew={entry.crew}
									markdownRemark={entry.markdown ? entry.markdown.node : undefined}
								/>
								{entry.markdown && <div dangerouslySetInnerHTML={{ __html: entry.markdown.node.html }} />}
							</Grid.Column>
						))}
					</Grid>
				</Container>
			</Layout>
		);
	}

	_selectionChanged(value: any) {
		this.setState({ currentSelectedItems: value });

		let params = new URLSearchParams();
		let entries = [];
		for (let symbol of value) {
			let entry = {
				markdown: this.props.data.crewpages.edges.find(e => e.node.fields.slug === `/${symbol}/`),
				crew: this.state.allcrew.find(c => c.symbol === symbol),
				crewDemands: undefined
			};

			entry.crewDemands = calculateCrewDemands(entry.crew, this.state.items);

			entries.push(entry);

			params.append('crew', symbol);
		}

		this.setState({ entries });

		let newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + params.toString();
		window.history.pushState({ path: newurl }, '', newurl);
	}
}

export default BeholdsPage;

export const query = graphql`
	query {
		allCrewJson {
			edges {
				node {
					name
					symbol
					imageUrlPortrait
				}
			}
        }
        crewpages: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/crew)/.*\\.md$/"}}) {
			totalCount
			edges {
				node {
					id
					html
					frontmatter {
						name
						memory_alpha
						bigbook_tier
						events
						in_portal
						published
					}
					fields {
						slug
					}
				}
			}
		}
	}
`;
