import React, { PureComponent } from 'react';
import { Message } from 'semantic-ui-react';
import TopMenu from './topmenu';
import { Link } from 'gatsby';

class Layout extends PureComponent {
	render() {
		return (
			<div>
				<TopMenu />
				<Message warning style={{ marginTop: '3.5em' }}>
					<Message.Header>Bandwidth issues</Message.Header>
					<p>
						The site is currently over the bandwidth limit (100Gb) on the free netlify.com plan. I'm looking for alternatives (<Link to={`/about/`}>ping me</Link> if you know
						of any), but it's possible they'll shut it down until next month.
					</p>
				</Message>
				{this.props.children}
			</div>
		);
	}
}

export default Layout;
