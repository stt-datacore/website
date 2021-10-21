import React from 'react';
import { graphql } from 'gatsby';
import { Header, Divider } from 'semantic-ui-react';

import Layout from '../components/layout';

const Announcements = ({ data: { allMarkdownRemark } }) => {
	const announcements = allMarkdownRemark.edges;

	return (
		<Layout title='DataCore Announcements'>
			<Header as='h2'>DataCore Announcements</Header>
			{announcements.map(({ node }) => {
				const datePosted = new Date(node.frontmatter.date);
				return (
					<div key={node.id}>
						<Header>{node.frontmatter.title}</Header>
						<p>{datePosted.toLocaleDateString()}</p>
						<div dangerouslySetInnerHTML={{ __html: node.html }} />
						<Divider />
					</div>
				);
			})}
		</Layout>
	);
};

export default Announcements;

export const pageQuery = graphql`
	query AnnouncementsPageQuery {
	  allMarkdownRemark(
		filter: {fields: {source: {eq: "announcements"}}}
		limit: 20
		sort: {fields: frontmatter___date, order: DESC}
	  ) {
		edges {
		  node {
		    id
			html
			frontmatter {
			  title
			  date
			}
		  }
		}
	  }
	}
`;