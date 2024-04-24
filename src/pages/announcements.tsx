import React from 'react';
import { graphql } from 'gatsby';
import { Header, Divider } from 'semantic-ui-react';
import DataPageLayout from '../components/page/datapagelayout';

const Announcements = ({ data: { allMarkdownRemark } }) => {
	const announcements = allMarkdownRemark.edges;

	return (
		<DataPageLayout pageTitle='DataCore Announcements'>
			<React.Fragment>
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
			</React.Fragment>
		</DataPageLayout>
	);
};

export default Announcements;

export const pageQuery = graphql`
	query AnnouncementsPageQuery {
	  allMarkdownRemark(
		filter: {fields: {source: {eq: "announcements"}}}
		limit: 20
    	sort: {frontmatter: {date: DESC}}
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