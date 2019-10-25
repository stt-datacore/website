import React, { PureComponent } from 'react';
import TopMenu from './topmenu';

class Layout extends PureComponent {
	render() {
		return (
			<React.StrictMode>
				<div>
					<TopMenu />
					{this.props.children}
				</div>
			</React.StrictMode>
		);
	}
}

export default Layout;
