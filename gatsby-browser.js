import React from 'react';
import './src/i18n/config';
import { DataProvider } from './src/context/datacontext';
import { PlayerProvider } from './src/context/playercontext';
import { GlobalProvider } from './src/context/globalcontext';
import { LocalizedProvider } from './src/context/localizedcontext';

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
				<LocalizedProvider>
					<GlobalProvider>
						{element}
					</GlobalProvider>
				</LocalizedProvider>
			</PlayerProvider>
		</DataProvider>
	);
};
