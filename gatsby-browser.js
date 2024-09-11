import React from 'react';
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
	if (typeof window !== 'undefined') {
		let __kludge = sessionStorage.getItem('__kludge');
		if (!__kludge) {
			sessionStorage.setItem('__kludge', "__kludge")
			window.location = window.location;
		}
	}
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
