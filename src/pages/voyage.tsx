import React, { Component } from 'react';
import { Container, Header } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

class VoyagePage extends Component {
	render() {
		return (
			<Layout title='Player tools'>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as='h4'>Player tools</Header>
					<p>Our player tools have moved to this new address:
					<br/>
						<Link to={`/playertools`}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
								https://datacore.app/playertools
							</span>
						</Link>
					</p>
					<p>Please update your bookmarks!</p>
				</Container>
			</Layout>
		);
	}
}

export default VoyagePage;