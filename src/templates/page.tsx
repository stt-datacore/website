import React, { PureComponent } from 'react';
import { Header } from 'semantic-ui-react';

import DataPageLayout from '../components/page/datapagelayout';

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

class StaticPage extends PureComponent<StaticPageProps> {
	render() {
		const { markdownRemark } = this.props.data;
		return (
			<DataPageLayout narrowLayout={true}>
				<>
				<Header>{markdownRemark.frontmatter.title}</Header>
				<div dangerouslySetInnerHTML={{ __html: markdownRemark.html }} />
				</>
			</DataPageLayout>
		);
	}
}

export default StaticPage;
