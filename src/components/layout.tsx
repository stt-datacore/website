import React, { PureComponent } from 'react';
import { Helmet } from 'react-helmet';
import { withPrefix, StaticQuery, graphql } from 'gatsby';
import TopMenu from './topmenu';

type LayoutProps = {
	title?: string;
	narrowLayout?: boolean;
	children?: React.ReactNode[]
};

type LayoutState = {};

class Layout extends PureComponent<LayoutProps, LayoutState> {
	render() {
		const { title, narrowLayout } = this.props;
		return (
			<React.Fragment>

				<StaticQuery
					query={query}
					render={(data) => (
						<Helmet titleTemplate={data.site.siteMetadata.titleTemplate} defaultTitle={data.site.siteMetadata.defaultTitle}>
							{title && <title>{title}</title>}
							<meta property='og:type' content='website' />
							<meta property='og:title' content={`${title ? `${title} - ` : ''}${data.site.siteMetadata.defaultTitle}`} />
							<meta property='og:site_name' content='DataCore' />
							<meta property='og:image' content={`${data.site.siteMetadata.baseUrl}/media/logo.png`} />
							<meta property='og:description' content={data.site.siteMetadata.defaultDescription} />
							<link id='defaultThemeCSS' rel='stylesheet' type='text/css' href={withPrefix('styles/semantic.slate.css')} />
							<link rel='stylesheet' type='text/css' href={withPrefix('styles/easymde.min.css')} />
							<script src={withPrefix('styles/theming.js')} type='text/javascript' />
							<script src={withPrefix('polyfills.js')} type='text/javascript' />
						</Helmet>
					)}
				/>
				<TopMenu narrowLayout={narrowLayout}>
					{this.props.children}
				</TopMenu>
			</React.Fragment>
		);
	}
}

export default Layout;

export const query = graphql`
	query {
		site {
			siteMetadata {
				defaultTitle: title
				titleTemplate
				defaultDescription: description
				baseUrl
			}
		}
	}
`;
