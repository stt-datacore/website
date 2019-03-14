import React, { Component } from 'react';
import { Container, Header } from 'semantic-ui-react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';

type StaticPageProps = {
	data: {
		markdownRemark: {
			html: string;
			frontmatter: {
				title: string;
			};
		};
	};
};

class StaticPage extends Component<StaticPageProps> {
	constructor(props) {
		super(props);
	}

	render() {
		const { markdownRemark } = this.props.data;
		return (
			<Layout>
				<Container text style={{ marginTop: '7em' }}>
					<Header>{markdownRemark.frontmatter.title}</Header>
					<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
				</Container>
			</Layout>
		);
	}
}

export default StaticPage;

export const query = graphql`
	query($slug: String!) {
		markdownRemark(fields: { slug: { eq: $slug } }) {
			html
			frontmatter {
				title
			}
		}
	}
`;
