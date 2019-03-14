import React, { Component } from 'react';

import TopMenu from './topmenu';

class Layout extends Component {
	constructor(props: any) {
		super(props);
	}

	render() {
		return <div>
            <TopMenu />
            {this.props.children}
        </div>;
	}
}

export default Layout;
