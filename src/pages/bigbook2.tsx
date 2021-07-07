import React, { PureComponent } from 'react';
import { Header, Image, Grid, Popup, Rating } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';
import marked from 'marked';
import { isMobile } from 'react-device-detect';

import Layout from '../components/layout';
import CONFIG from '../components/CONFIG';

import CommonCrewData from '../components/commoncrewdata';
import { formatTierLabel } from '../utils/crewutils';

type BigBookPageProps = {
	data: {
		sections: any;
	}
};

type BigBookPageState = {
	groupedByTier: Map<number, any>;
};

const fieldSorter = fields => (a, b) =>
	fields
		.map(o => {
			let dir = 1;
			if (o[0] === '-') {
				dir = -1;
				o = o.substring(1);
			}
			return a[o] > b[o] ? dir : a[o] < b[o] ? -dir : 0;
		})
		.reduce((p, n) => (p ? p : n), 0);

class BigBook extends PureComponent<BigBookPageProps, BigBookPageState> {
	state = {
		groupedByTier: new Map()
	};

	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const allcrew = await response.json();

		let groupedByTier = new Map<number, any>();
		allcrew.forEach(bcrew => {
			if (bcrew.max_rarity > 1) {
				let item = {
					rarity: bcrew.max_rarity,
					name: bcrew.name,
					crew: bcrew,
					bcrew
				};

				const collection = groupedByTier.get(bcrew.bigbook_tier);
				if (!collection) {
					groupedByTier.set(bcrew.bigbook_tier, [item]);
				} else {
					collection.push(item);
				}
			}
		});

		let temp = Array.from(groupedByTier).sort((a, b) => a[0] - b[0]);
		temp.forEach(t => {
			t[1] = t[1].sort(fieldSorter(['-rarity', 'name']));
		});

		groupedByTier = new Map<number, any>(temp);

		this.setState({ groupedByTier });
	}

	renderCrew(entry): JSX.Element {
		let markdownRemark = {
			frontmatter: {
				bigbook_tier: entry.bcrew.bigbook_tier,
				events: entry.bcrew.events,
				in_portal: entry.bcrew.in_portal
			}
		};

		return (
			<Grid.Column key={entry.crew.symbol}>
				<div style={{ textAlign: 'center', fontSize: '0.75em' }}>
					<Popup
						trigger={
							<Image
								src={`${process.env.GATSBY_ASSETS_URL}${entry.crew.imageUrlPortrait}`}
								size='small'
								style={{
									borderColor: CONFIG.RARITIES[entry.crew.max_rarity].color,
									borderWidth: '1px',
									borderRadius: '4px',
									borderStyle: 'solid'
								}}
							/>
						}
						wide='very'
						on='click'>
						<Header>
							<Link to={`/crew/${entry.crew.symbol}/`}>
								{entry.crew.name}{' '}
								<Rating rating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} icon='star' size='large' disabled />
							</Link>
						</Header>
						<CommonCrewData crew={entry.crew} markdownRemark={markdownRemark} />

						<div dangerouslySetInnerHTML={{ __html: marked(entry.bcrew.markdownContent) }} />
					</Popup>
					<Link to={`/crew/${entry.crew.symbol}/`}>{entry.crew.name}</Link>
				</div>
			</Grid.Column>
		);
	}

	render() {
		const { groupedByTier } = this.state;
		const header = this.props.data.sections.edges[0];

		return (
			<Layout title='The Big Book of Behold Advice'>
				<div>
						<Header as='h2' style={{ paddingTop: '1em' }}>
							{header.node.frontmatter.title}
						</Header>
						<div dangerouslySetInnerHTML={{ __html: header.node.html }} />
				</div>
				{[...groupedByTier.keys()].map((tier, idx) => (
					<React.Fragment key={idx}>
						<Header as='h3'>Tier {formatTierLabel(tier, true)}</Header>
						<Grid columns={isMobile ? 4 : 6}>{groupedByTier.get(tier).map(entry => this.renderCrew(entry))}</Grid>
					</React.Fragment>
				))}
			</Layout>
		);
	}
}

export default BigBook;


export const query = graphql`
	query {
		sections: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/pages)/.*\\.md$/"}, frontmatter: {bigbook_section: {ne: null}, title: {eq: "The Big Book of Behold Advice"}}}) {
			totalCount
			edges {
				node {
					id
					html
					frontmatter {
						title
						bigbook_section
					}
				}
			}
		}
	}
`;
