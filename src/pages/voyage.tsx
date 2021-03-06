import React, { Component } from 'react';
import { Header } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

class VoyagePage extends Component {
	render() {
		return (
			<Layout title='Player tools'>
				<Header as='h4'>Player tools</Header>
				<p>Our player tools have moved to this new address:
					<br />
					<Link to={`/playertools`}>
						<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
							https://datacore.app/playertools
							</span>
					</Link>
				</p>
				<p>Please update your bookmarks!</p>
			</Layout>
		);
	}
}

export default VoyagePage;