import React, { PureComponent } from 'react';
import { Container, Header, Divider, Sticky, Rail, Segment } from 'semantic-ui-react';
import { graphql, Link } from 'gatsby';

import { getCoolStats } from '../utils/misc';

type BigBookCrewProps = {
	markdownRemark: any;
	crew: any;
};

class BigBookCrew extends PureComponent<BigBookCrewProps> {
	render() {
		const { crew, markdownRemark } = this.props;

		return (
			<React.Fragment>
				<p>
					<b style={{ color: markdownRemark.frontmatter.in_portal ? 'unset' : 'red' }}>{crew.name}</b> - {getCoolStats(crew, true)}{' | '}
					{crew.collections.length > 0 ? (
						<span>
							{crew.collections
								.map(col => (
									<Link key={col} to={`/collection/${col}/`}>
										{col}
									</Link>
								))
								.reduce((prev, curr) => [prev, ', ', curr])}
								{' | '}
						</span>
					) : (
						<span />
					)}
					{markdownRemark.frontmatter.events} events <Link to={`/crew${markdownRemark.fields.slug}`}>more...</Link>
				</p>

				<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />

				<Divider />
			</React.Fragment>
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

type BigBookMobilSectionProps = {
	section: any[];
	title: string;
};

class BigBookMobilSection extends PureComponent<BigBookMobilSectionProps> {
	state = {
		context: undefined
	};

	render() {
		return (
			<div ref={ref => this.setState({ context: ref })}>
				<Rail internal position='left' attached style={{ top: 'auto', height: 'auto', width: '100%' }}>
					<Sticky context={this.state.context}>
						<Segment inverted>
							<a style={{ cursor: 'pointer' }} onClick={() => this._scrollTop()}>
								{this.props.title}
							</a>
						</Segment>
					</Sticky>
				</Rail>
				<div style={{ paddingTop: '4em' }}>{this.props.section.map(e => e.elem)}</div>
			</div>
		);
	}

	_scrollTop() {
		if (this.state.context) {
			window.scrollTo(0, this.state.context.offsetTop);
		}
	}
}

class BigBookMobile extends PureComponent<BigBookPageProps> {
	state = {
		context: undefined,
		context2: undefined
	};

	render() {
		let res = [];
		this.props.data.crewpages.edges.forEach((element, idx) => {
			let crewEntry = this.props.data.allCrewJson.edges.find(e => e.node.symbol === element.node.fields.slug.replace(/\//g, ''));

			if (crewEntry && crewEntry.node.max_rarity > 3)
			{
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

		res = res.sort(fieldSorter(['-rarity', 'tier', 'name']));

		const groupByTiers = (rarity, title) => {
			let actualres = [];
			let section = [];
			res
				.filter(e => e.rarity === rarity)
				.forEach(element => {
					if (section.length === 0 || section[0].tier !== element.tier) {
						if (section.length > 0) {
							actualres.push(<BigBookMobilSection section={section} title={`${title} - Tier ${section[0].tier}`} />);
						}
						section = [element];
					} else {
						section.push(element);
					}
				});
			actualres.push(<BigBookMobilSection section={section} title={`${title} - Tier ${section[0].tier}`} />);
			return actualres;
		};

		let groups5 = groupByTiers(5, 'Legendary (5 star)');
		let groups4 = groupByTiers(4, 'Super rare (4 star)');

		return (
			<Container text>
				{sections[0].elem}
				{groups5}

				{sections[1].elem}
				{groups4}

				{sections.slice(2).map(e => e.elem)}
			</Container>
		);
	}
}

export default BigBookMobile;

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
