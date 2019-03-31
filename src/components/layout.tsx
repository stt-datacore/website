import React, { PureComponent } from 'react';

import TopMenu from './topmenu';

class Layout extends PureComponent {
	render() {
		return (
			<div>
				<TopMenu />
				{this.props.children}
			</div>
		);
	}
}

export default Layout;
