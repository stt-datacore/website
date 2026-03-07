import React from 'react';

import { ShuttleAdventure } from '../../model/shuttle';
import { IEventData, IRosterCrew } from '../../components/eventplanner/model';
import { Shuttlers, ISeatAssignment } from './model';

export interface IShuttlersContext {
	helperId: 'shuttle' | 'eventshuttle';
	groupId: string;	// e.g. event symbol
	rosterType: 'myCrew' | 'allCrew';
	rosterCrew: IRosterCrew[];
	eventData: IEventData | undefined;
	activeShuttles: ShuttleAdventure[];
	shuttlers: Shuttlers;
	setShuttlers: (shuttlers: Shuttlers) => void;
	assigned: ISeatAssignment[];
	setAssigned: (assigned: ISeatAssignment[]) => void;
	eventFactions?: number[];
};

export const ShuttlersContext = React.createContext<IShuttlersContext>({} as IShuttlersContext);
