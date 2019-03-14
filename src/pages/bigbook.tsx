import React, { Component } from 'react';
import { Container, Header } from 'semantic-ui-react';

import Layout from '../components/layout';
import PageList from '../components/pagelist';

class BigBook extends Component {
	constructor(props: any) {
		super(props);
	}

	render() {
		return (
			<Layout>
				<Container text style={{ marginTop: '7em' }}>
					<Header as='h1'>Big Book</Header>
					<PageList />
				</Container>
			</Layout>
		);
	}
}

export default BigBook;
