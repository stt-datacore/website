import React from 'react';

import { DataProvider } from './src/context/datacontext';
import { PlayerProvider } from './src/context/playercontext';
import { HoverProvider, PageHovers } from './src/context/hovercontext';

export const wrapPageElement = ({ element }) => {
	return (
		<React.Fragment>
			{element}
			<PageHovers />
		</React.Fragment>
	);
};

export const wrapRootElement = ({ element }) => {
	return (
		<DataProvider>
			<PlayerProvider>
				<HoverProvider>
					{element}
				</HoverProvider>
			</PlayerProvider>
		</DataProvider>
	);
};
