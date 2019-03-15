import React, { Component } from 'react';
import { Container, Header, Image, Divider, Grid, Rating } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';

import Layout from '../components/layout';

import CommonCrewData from '../components/commoncrewdata';

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
							<CommonCrewData crew={crew} markdownRemark={markdownRemark} />

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

const fieldSorter = (fields) => (a, b) => fields.map(o => {
    let dir = 1;
    if (o[0] === '-') { dir = -1; o=o.substring(1); }
    return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
}).reduce((p, n) => p ? p : n, 0);

class BigBook extends Component<BigBookPageProps> {
	render() {
		let res = [];
		this.props.data.allMarkdownRemark.edges.forEach((element, idx) => {
			let crewEntry = this.props.data.allCrewJson.edges.find(e => e.node.symbol === element.node.fields.slug.replace(/\//g, ''));

			res.push({
				name: crewEntry.node.name,
				tier: element.node.frontmatter.bigbook_tier,
				rarity: crewEntry.node.max_rarity,
				elem: <BigBookCrew key={idx} markdownRemark={element.node} crew={crewEntry.node} />
			});
		});

		res = res.sort(fieldSorter(['-rarity', 'tier', 'name']));

		return (
			<Layout>
				<Container text style={{ paddingTop: '6em', paddingBottom: '3em' }}>
					<Header as='h1'>Big Book</Header>
					{res.map(e => e.elem)}
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
					...RanksFragment
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
