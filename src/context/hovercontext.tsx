import React from 'react';

import { CrewMember } from '../model/crew';
import { PlayerCrew } from '../model/player';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';

export interface IHover {
	targetGroup: string;
	crew: PlayerCrew | CrewMember | undefined | null;
	useBoundingClient?: boolean;
};

export interface IHoverContextData {
	hover: IHover;
	setHover: (hover: IHover) => void;
};

const defaultHover = {
	targetGroup: '',
	crew: undefined,
	useBoundingClient: false
} as IHover;

const defaultHoverData = {
	hover: defaultHover,
	setHover: (hover: IHover) => { return; },
} as IHoverContextData;

export const HoverContext = React.createContext<IHoverContextData>(defaultHoverData as IHoverContextData);

export const HoverProvider = (props: { children: JSX.Element }) => {
	const { children } = props;

	const [hover, setHover] = React.useState<IHover>(defaultHover as IHover);

	const providerValue = {
		hover, setHover
	} as IHoverContextData;

	return (
		<HoverContext.Provider value={providerValue}>
			{children}
		</HoverContext.Provider>
	);
};

export const PageHovers = () => {
	const { hover } = React.useContext<IHoverContextData>(HoverContext);

	if (hover.targetGroup === '') return <></>;

	return (
		<React.Fragment>
			<CrewHoverStat targetGroup={hover.targetGroup} crew={hover.crew ?? undefined} />
		</React.Fragment>
	);
};
