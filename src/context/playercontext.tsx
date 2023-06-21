import React from 'react';

const defaultPlayer = {
};

export const PlayerContext = React.createContext(defaultPlayer);

export const PlayerProvider = (props) => {
	const { children } = props;

	const providerValue = {};
	return (
		<PlayerContext.Provider value={providerValue}>
			{children}
		</PlayerContext.Provider>
	);
};