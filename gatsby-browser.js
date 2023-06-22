import React from 'react';

import { DataProvider } from './src/context/datacontext';
import { PlayerProvider } from './src/context/playercontext';

export const wrapPageElement = ({ element }) => {
	return (
		<React.Fragment>
			{element}
		</React.Fragment>
	);
};

export const wrapRootElement = ({ element }) => {
	return (
		<DataProvider>
			<PlayerProvider>
				{element}
			</PlayerProvider>
		</DataProvider>
	);
};
