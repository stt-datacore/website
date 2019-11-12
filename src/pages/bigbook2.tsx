import React, { PureComponent } from 'react';
import { Container, Header, Image, Grid, Popup, Rating } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';

import Layout from '../components/layout';
import CONFIG from '../components/CONFIG';

import CommonCrewData from '../components/commoncrewdata';
import SimpleBarChart from '../components/simplebarchart';

type BigBookCrewProps = {
	markdownRemark: any;
	crew: any;
};

class BigBookCrew extends PureComponent<BigBookCrewProps> {
	render() {
		const { crew, markdownRemark } = this.props;

		return (
			<Grid.Column>
				<div style={{ textAlign: 'center', fontSize: '0.75em' }}>
					<Popup trigger={<Image src={`/media/assets/${crew.imageUrlPortrait}`} size='small' style={{borderColor: CONFIG.RARITIES[crew.max_rarity].color, borderWidth:'1px', borderRadius: '4px', borderStyle: 'solid'}} />} wide='very' on='click' hideOnScroll>
						<Header>
							<Link to={`/crew${markdownRemark.fields.slug}`}>
								{crew.name} <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='large' disabled />
							</Link>
						</Header>
						<CommonCrewData crew={crew} markdownRemark={markdownRemark} />

						<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
					</Popup>
					<Link to={`/crew${markdownRemark.fields.slug}`}>{crew.name}</Link>
				</div>
			</Grid.Column>
		);
	}
}

type BigBookPageProps = {
	data: {
		crewpages: any;
		sections: any;
		allCrewJson: any;
		allSortedSkillSetsJson: any;
	};
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

class BigBook extends PureComponent<BigBookPageProps> {
	render() {
		let res = [];
		this.props.data.crewpages.edges.forEach((element, idx) => {
			let crewEntry = this.props.data.allCrewJson.edges.find(e => e.node.symbol === element.node.fields.slug.replace(/\//g, ''));

			if (crewEntry && crewEntry.node.max_rarity > 3) {
				res.push({
					name: crewEntry.node.name,
					tier: element.node.frontmatter.bigbook_tier,
					rarity: crewEntry.node.max_rarity,
					elem: <BigBookCrew key={idx} markdownRemark={element.node} crew={crewEntry.node} />
				});
			}
		});

		let sections = [];
		this.props.data.sections.edges.forEach((element, idx) => {
			sections.push({
				bigbook_section: element.node.frontmatter.bigbook_section,
				elem: (
					<div key={idx}>
						<Header as='h2' style={{ paddingTop: '1em' }}>
							{element.node.frontmatter.title}
						</Header>
						<div dangerouslySetInnerHTML={{ __html: element.node.html }} />
					</div>
				)
			});
		});

		sections = sections.sort(fieldSorter(['bigbook_section']));

		res = res.sort(fieldSorter(['tier', 'name']));

		let rarity5sections = [];
		let currentTier = [];
		let currentTierNumber = 0;
		res.forEach(e => {
			if (currentTierNumber !== e.tier) {
				if (currentTier.length > 0) {
					rarity5sections.push(
						<React.Fragment>
							<Header as='h3'>Tier {currentTierNumber}</Header>
							<Grid columns={6}>{currentTier}</Grid>
						</React.Fragment>
					);
				}
				currentTierNumber = e.tier;
				currentTier = [e.elem];
			} else {
				currentTier.push(e.elem);
			}
		});

		rarity5sections.push(
			<React.Fragment>
				<Header as='h3'>Tier {currentTierNumber}</Header>
				<Grid columns={6}>{currentTier}</Grid>
			</React.Fragment>
		);

		let chartData = this.props.data.allSortedSkillSetsJson.edges.map(e => ({ name: e.node.name.replace(/\./g, '/'), value: e.node.value }));

		return (
			<Layout>
				<Container text style={{ paddingTop: '5em', paddingBottom: '3em' }}>
					{sections[0].elem}
					{rarity5sections}
					{sections.slice(2).map(e => e.elem)}
					<SimpleBarChart title={'Rarest skill sets 4* and 5*'} data={chartData} />
				</Container>
			</Layout>
		);
	}
}

export default BigBook;

export const query = graphql`
	query {
		crewpages: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/crew)/.*\\.md$/"}, frontmatter: {published: {eq: true}}}) {
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
		sections: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/pages)/.*\\.md$/"}, frontmatter: {bigbook_section: {ne: null}}}) {
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
		allSortedSkillSetsJson(limit: 15) {
			edges {
				node {
					name
					value
				}
			}
		}
		allCrewJson(filter: {max_rarity: {gt: 3}}) {
			edges {
				node {
					name
					symbol
					max_rarity
					imageUrlPortrait
					imageUrlFullBody
					series
					traits_named
					traits_hidden
					collections
					flavor
					...RanksFragment
					cross_fuse_targets {
						symbol
						name
					}
					base_skills {
						security_skill {
							core
							range_min
							range_max
						}
						command_skill {
							core
							range_min
							range_max
						}
						diplomacy_skill {
							core
							range_min
							range_max
						}
						science_skill {
							core
							range_min
							range_max
						}
						medicine_skill {
							core
							range_min
							range_max
						}
						engineering_skill {
							core
							range_min
							range_max
						}
					}
				}
			}
		}
	}
`;
