import React from 'react';

import { PlayerCrew } from '../../model/player';

export const PortalCrewContext = React.createContext<PlayerCrew[]>([]);
