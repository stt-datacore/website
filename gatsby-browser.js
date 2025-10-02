import React from 'react';
import { DataProvider } from './src/context/datacontext';
import { PlayerProvider } from './src/context/playercontext';
import { GlobalProvider } from './src/context/globalcontext';
import { LocalizedProvider } from './src/context/localizedcontext';
import { PromptProvider } from './src/context/promptcontext';

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
						<PromptProvider>
							{element}
						</PromptProvider>
					</GlobalProvider>
				</LocalizedProvider>
			</PlayerProvider>
		</DataProvider>
	);
};
