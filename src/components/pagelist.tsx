import React, { Component } from 'react';

import { StaticQuery, Link, graphql } from 'gatsby';

class PageList extends Component {
	constructor(props: any) {
		super(props);
	}

	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/crew)/.*\\.md$/"}, frontmatter: {published: {eq: true}}}) {
							totalCount
							edges {
								node {
									id
									frontmatter {
										name
										published
									}
									fields {
										slug
									}
									excerpt
								}
							}
						}
					}
				`}
				render={data => (
					<div>
						<table>
							<thead>
								<tr>
									<th>name</th>
								</tr>
							</thead>
							<tbody>
								{data.allMarkdownRemark.edges.map(({ node }, index) => (
									<tr key={index}>
										<td>
											<Link to={`/crew${node.fields.slug}`}>{node.frontmatter.name}</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			/>
		);
	}
}

export default PageList;
