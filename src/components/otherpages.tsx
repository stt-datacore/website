import { useStaticQuery, graphql } from 'gatsby';

export type PageEntry = {
	slug: string;
	title: string;
};

export const useOtherPages = (): PageEntry[] => {
	const { allMarkdownRemark } = useStaticQuery(graphql`query {
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
		  }}`);

	return allMarkdownRemark.edges.map(({ node }) => (
		{ slug: node.fields.slug, title: node.frontmatter.title }
	));
}
