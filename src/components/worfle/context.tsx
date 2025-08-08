import React from 'react';

import { CrewMember } from '../../model/crew';

export const PortalCrewContext = React.createContext<CrewMember[]>([]);
