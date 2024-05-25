import React from 'react';

import { DataProvider } from './src/context/datacontext';
import { PlayerProvider } from './src/context/playercontext';
import { GlobalProvider } from './src/context/globalcontext';
import { TranslationProvider } from './src/context/translationcontext';

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
				<GlobalProvider>
					{element}
				</GlobalProvider>
			</PlayerProvider>
		</DataProvider>
	);
};
