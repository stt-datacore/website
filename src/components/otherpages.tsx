import React, { PureComponent } from 'react';
import { Dropdown } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';

class OtherPages extends PureComponent {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allMarkdownRemark(filter: {fileAbsolutePath: {regex: "/(/static/pages)/.*\\.md$/"}, frontmatter: {bigbook_section: {eq: null}}}) {
							edges {
							  node {
								frontmatter {
								  title
								  bigbook_section
								}
								fields {
								  slug
								}
							  }
							}
						  }
					}
				`}
				render={data =>
					data.allMarkdownRemark.edges.map(({ node }, index) => (
						<Dropdown.Item as='a' key={index} onClick={() => navigate(node.fields.slug)}>
							{node.frontmatter.title}
						</Dropdown.Item>
					))
				}
			/>
		);
	}
}

export default OtherPages;
