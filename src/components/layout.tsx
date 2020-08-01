import React, { PureComponent } from 'react';
import { Helmet } from 'react-helmet';
import TopMenu from './topmenu';

type LayoutProps = {};

type LayoutState = {};

class Layout extends PureComponent<LayoutProps, LayoutState> {
	render() {
		return (
			<React.StrictMode>
				<div>
					<Helmet>
						<title>DataCore</title>
						<link id='themeCSS' rel='stylesheet' href='/styles/semantic.slate.css' />
						<link rel='stylesheet' href='/styles/easymde.min.css' />
						<script src='/styles/theming.js' type='text/javascript' />
					</Helmet>

					<TopMenu />
					{this.props.children}
				</div>
			</React.StrictMode>
		);
	}
}

export default Layout;
