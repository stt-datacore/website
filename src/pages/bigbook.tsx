import React, { Component } from 'react';
import { Container, Header, Image, Divider, Grid, Segment, Rating, Label, Statistic } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';

import Layout from '../components/layout';
import CrewStat from '../components/crewstat';

type BigBookCrewProps = {
	markdownRemark: any;
	crew: any;
};

class BigBookCrew extends Component<BigBookCrewProps> {
	render() {
		const { crew, markdownRemark } = this.props;

		return (
			<React.Fragment>
				<Divider horizontal>
					<Header>
						<Link to={`/crew${markdownRemark.fields.slug}`}>
							{crew.name} <Rating defaultRating={crew.max_rarity} maxRating={5} icon='star' size='large' disabled />
						</Link>
					</Header>
				</Divider>
				<Grid columns={2}>
					<Grid.Row>
						<Grid.Column width={4}>
							{crew.series && <Image src={`/media/series/${crew.series}.png`} size='small' />}
							<Link to={`/crew${markdownRemark.fields.slug}`}>
								<Image src={`/media/assets/${crew.imageUrlFullBody}`} size='small' />
							</Link>
						</Grid.Column>
						<Grid.Column width={12}>
							<Segment>
								<CrewStat skill_name='security_skill' data={crew.base_skills.security_skill} />
								<CrewStat skill_name='command_skill' data={crew.base_skills.command_skill} />
								<CrewStat skill_name='diplomacy_skill' data={crew.base_skills.diplomacy_skill} />
								<CrewStat skill_name='science_skill' data={crew.base_skills.science_skill} />
								<CrewStat skill_name='medicine_skill' data={crew.base_skills.medicine_skill} />
								<CrewStat skill_name='engineering_skill' data={crew.base_skills.engineering_skill} />
							</Segment>

							{crew.flavor && <p>{crew.flavor}</p>}

							<Statistic.Group style={{ paddingBottom: '2em' }}>
								{markdownRemark.frontmatter.events !== undefined && (
									<Statistic>
										<Statistic.Label>Events</Statistic.Label>
										<Statistic.Value>{markdownRemark.frontmatter.events}</Statistic.Value>
									</Statistic>
								)}
								{markdownRemark.frontmatter.bigbook_tier !== undefined && (
									<Statistic>
										<Statistic.Label>Tier</Statistic.Label>
										<Statistic.Value>{markdownRemark.frontmatter.bigbook_tier}</Statistic.Value>
									</Statistic>
								)}
								{markdownRemark.frontmatter.in_portal !== undefined && (
									<Statistic color={markdownRemark.frontmatter.in_portal ? 'green' : 'red'}>
										<Statistic.Label>Portal</Statistic.Label>
										<Statistic.Value>{markdownRemark.frontmatter.in_portal ? 'YES' : 'NO'}</Statistic.Value>
									</Statistic>
								)}
							</Statistic.Group>

							<p>
								<b>Traits: </b>
								{crew.traits_named.join(', ')}
								<span style={{ color: 'lightgray' }}>, {crew.traits_hidden.join(', ')}</span>
							</p>
							{crew.collections.length > 0 && (
								<p>
									<b>Collections: </b>
									{crew.collections
										.map(col => (
											<Link key={col} to={`/collection/${col}/`}>
												{col}
											</Link>
										))
										.reduce((prev, curr) => [prev, ', ', curr])}
								</p>
							)}

							<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
						</Grid.Column>
					</Grid.Row>
				</Grid>
			</React.Fragment>
		);
	}
}

type BigBookPageProps = {
	data: {
		allMarkdownRemark: any;
		allCrewJson: any;
	};
};

class BigBook extends Component<BigBookPageProps> {
	constructor(props) {
		super(props);
	}

	render() {
		let res = [];
		this.props.data.allMarkdownRemark.edges.forEach((element, idx) => {
			let crewEntry = this.props.data.allCrewJson.edges.find(e => e.node.symbol === element.node.fields.slug.replace(/\//g, ''));

			res.push(<BigBookCrew key={idx} markdownRemark={element.node} crew={crewEntry.node} />);
		});

		return (
			<Layout>
				<Container text style={{ paddingTop: '6em', paddingBottom: '3em' }}>
					<Header as='h1'>Big Book</Header>
					{res}
				</Container>
			</Layout>
		);
	}
}

export default BigBook;

export const query = graphql`
	query {
		allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/crew)/.*\\.md$/"}, frontmatter: {published: {eq: true}}}) {
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
		allCrewJson {
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
